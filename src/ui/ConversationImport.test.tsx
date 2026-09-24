import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { initialConversationState, conversationReducer } from '../application/conversationReducer';
import { mistralShareProvider } from '../application/import/mistralShare';
import { importResolvedProviderShare } from '../application/import/resolvedShareImport';
import { isResolvedShare, providerForResolvedShare, resolveShare } from '../application/import/registry';
import { PRODUCTION_IMPORT_ENDPOINT, createRemoteGateway, createRemoteGatewayConsent, type RemoteGatewayConsent } from '../application/import/remoteGateway';
import type { ImportProvider, ResolvedShare } from '../application/import/types';
import * as remoteGateway from '../application/import/remoteGateway';
import { ConversationImport } from './ConversationImport';

const shareUrl = 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000';

function providerWith(result: unknown = { ok: true, providerId: 'mistral', events: [
  { role: 'user', text: 'Bonjour', order: 1 }, { role: 'assistant', text: 'Réponse', order: 2 },
] }): ImportProvider {
  return { id: 'mistral', label: 'Mistral', validateUrl: () => undefined, importFromUrl: vi.fn(), importResolvedShare: vi.fn().mockResolvedValue(result) };
}

function providerThroughGateway(fetcher: Parameters<typeof createRemoteGateway>[0], configured = true): ImportProvider {
  const gateway = createRemoteGateway(fetcher, { endpoint: () => configured ? PRODUCTION_IMPORT_ENDPOINT : undefined });
  return {
    id: 'mistral', label: 'Mistral', validateUrl: mistralShareProvider.validateUrl,
    importFromUrl: async () => ({ ok: false as const, providerId: 'mistral', events: [] as const, error: { code: 'consent-required' as const, message: 'Capacité attestée requise.' } }),
    importResolvedShare: (resolved, consent) => importResolvedProviderShare(resolved, consent as RemoteGatewayConsent | undefined, mistralShareProvider, gateway),
  };
}

async function openConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Lien de partage'), shareUrl);
  await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
  return screen.findByRole('dialog', { name: 'Autoriser la récupération de ce partage ?' });
}

async function consent(user: ReturnType<typeof userEvent.setup>) {
  await openConsent(user);
  await user.click(screen.getByRole('button', { name: 'Continuer avec le Worker' }));
}

describe('ConversationImport', () => {
  it('affiche le même endpoint preview que celui utilisé par la requête', async () => {
    const preview = 'https://branch-42-ai-inf-calculator-proxy.felix-mortas.workers.dev/v1/import-html';
    vi.stubEnv('VITE_IMPORT_HTML_WORKER_URL', preview);
    const fetcher = vi.fn().mockResolvedValue(new Response('<html><body>page</body></html>', { headers: { 'content-type': 'text/html' } }));
    const gateway = createRemoteGateway(fetcher, { endpoint: () => preview });
    const provider: ImportProvider = {
      ...mistralShareProvider,
      importResolvedShare: (share, consent) => importResolvedProviderShare(share, consent as RemoteGatewayConsent, mistralShareProvider, gateway),
    };
    try {
      const user = userEvent.setup();
      render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
      const dialog = await openConsent(user);
      expect(dialog).toHaveTextContent(preview);
      await user.click(screen.getByRole('button', { name: 'Continuer avec le Worker' }));
      await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
      expect(fetcher.mock.calls[0][0]).toBe(preview);
    } finally { vi.unstubAllEnvs(); }
  });

  it('documente la frontière tierce, les formats admis et le parcours manuel', () => {
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} />);
    const help = screen.getByRole('complementary', { name: 'À savoir avant un import distant' });
    expect(help).toHaveTextContent('https://chat.mistral.ai/chat/<UUID>');
    expect(help).not.toHaveTextContent('chatgpt.com');
    expect(help).toHaveTextContent('Worker d’import HTML');
    expect(help).toHaveTextContent('redirections éventuelles');
    expect(help).toHaveTextContent('recopier ou coller vos échanges manuellement');
  });

  it('refuse une résolution injectée non Mistral avant consentement ou import', async () => {
    const user = userEvent.setup();
    const provider = providerWith();
    const resolve = vi.fn(() => ({ providerId: 'chatgpt', canonicalUrl: 'https://chatgpt.com/share/123e4567-e89b-12d3-a456-426614174000' }) as ResolvedShare);
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} resolve={resolve} />);
    await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/123e4567-e89b-12d3-a456-426614174000');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(resolve).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Seuls les liens publics Mistral');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(provider.importResolvedShare).not.toHaveBeenCalled();
  });

  it('invalide le consentement lors d’un changement vers un fournisseur refusé', async () => {
    const user = userEvent.setup();
    const mistral = providerWith();
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[mistral]} />);
    const input = screen.getByLabelText('Lien de partage');
    await user.type(input, shareUrl);
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('page publique Mistral');
    await user.clear(input);
    await user.type(input, 'https://claude.ai/share/123e4567-e89b-12d3-a456-426614174000');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mistral.importResolvedShare).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Seuls les liens publics Mistral');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mistral.importResolvedShare).not.toHaveBeenCalled();
  });

  it.each([
    ['Mistral', 'mistral', 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000'],
  ] as const)('couvre consentement, refus, changement, erreur et succès pour %s sans mutation prématurée', async (_label, id, url) => {
    const user = userEvent.setup();
    const importResolvedShare = vi.fn()
      .mockResolvedValueOnce({ ok: false, providerId: id, events: [], error: { code: 'network', message: 'Passerelle indisponible.' } })
      .mockResolvedValueOnce({ ok: true, providerId: id, events: [
        { role: 'user', text: 'Bonjour public', order: 1 }, { role: 'assistant', text: 'Réponse publique', order: 2 },
      ] });
    const provider: ImportProvider = { id, label: _label, validateUrl: () => undefined, importFromUrl: vi.fn(), importResolvedShare };
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'local' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'local', field: 'message', value: 'à préserver' });
    const dispatch = vi.fn();
    render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);

    const input = screen.getByLabelText('Lien de partage');
    await user.type(input, url);
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await user.click(await screen.findByRole('button', { name: 'Annuler' }));
    expect(importResolvedShare).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await screen.findByRole('dialog');
    await user.type(input, 'x');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(importResolvedShare).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, url);
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await user.click(await screen.findByRole('button', { name: 'Continuer avec le Worker' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Passerelle indisponible.');
    expect(importResolvedShare).toHaveBeenCalledWith(expect.objectContaining({ canonicalUrl: url, providerId: id }), expect.any(Object));
    expect(dispatch).not.toHaveBeenCalled();
    expect(state.blocks[0].message).toBe('à préserver');

    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await user.click(await screen.findByRole('button', { name: 'Continuer avec le Worker' }));
    expect(await screen.findByRole('heading', { name: 'Prévisualisation de l’import' })).toBeVisible();
    expect(screen.getByText('Question de la personne').parentElement).toHaveTextContent('Bonjour public');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    ['Mistral', 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000'],
  ])('détecte %s et demande le consentement avant toute récupération', async (label, url) => {
    const user = userEvent.setup();
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} />);
    await user.type(screen.getByLabelText('Lien de partage'), url);
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(`page publique ${label}`);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it('invalide le consentement ouvert si le registre ou le résolveur change', async () => {
    const user = userEvent.setup();
    const first = providerWith();
    const second = { ...providerWith() };
    const { rerender } = render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[first]} />);
    await openConsent(user);
    rerender(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[second]} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyser le lien' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    rerender(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[second]} resolve={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyser le lien' })).toHaveFocus();
    expect(first.importFromUrl).not.toHaveBeenCalled();
    expect(second.importFromUrl).not.toHaveBeenCalled();
  });

  it('rend le focus au déclencheur si le registre change pendant la confirmation', async () => {
    const user = userEvent.setup();
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'local' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'local', field: 'message', value: 'texte local' });
    const first = providerWith();
    const { rerender } = render(<ConversationImport state={state} dispatch={vi.fn()} providers={[first]} />);
    await consent(user);
    await user.click(await screen.findByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    rerender(<ConversationImport state={state} dispatch={vi.fn()} providers={[{ ...first }]} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyser le lien' })).toHaveFocus();
  });

  it('ouvre le consentement avant tout import, informe en français et restaure le focus après annulation', async () => {
    const user = userEvent.setup();
    const provider = providerWith();
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    const dialog = await openConsent(user);
    expect(provider.importFromUrl).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
    expect(document.querySelector('.conversation-import')).toHaveProperty('inert', true);
    expect(dialog).toHaveTextContent('Le Worker d’import HTML récupérera la page publique');
    expect(dialog).toHaveTextContent(PRODUCTION_IMPORT_ENDPOINT);
    expect(dialog).toHaveTextContent(shareUrl);
    expect(dialog).toHaveTextContent('adresse IP et votre agent utilisateur');
    expect(dialog).toHaveTextContent('blocs locaux, ni vos fichiers, ni vos résultats, ni vos paramètres');
    const manualLink = screen.getByRole('button', { name: 'Importer manuellement' });
    manualLink.focus();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.tab({ shift: true });
    expect(manualLink).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('.conversation-import')).toHaveProperty('inert', false);
    expect(screen.getByRole('button', { name: 'Analyser le lien' })).toHaveFocus();
    expect(provider.importFromUrl).not.toHaveBeenCalled();
  });

  it('ferme avec Escape ou le parcours manuel sans requête ni mutation', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    const provider = providerThroughGateway(fetcher as Parameters<typeof createRemoteGateway>[0]);
    const dispatch = vi.fn();
    render(<ConversationImport state={initialConversationState} dispatch={dispatch} providers={[provider]} />);
    await openConsent(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await user.click(screen.getByRole('button', { name: 'Importer manuellement' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('importe une seule fois seulement après consentement et garde la confirmation de remplacement séparée', async () => {
    const user = userEvent.setup();
    const provider = providerWith();
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'old' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'old', field: 'message', value: 'à garder' });
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);
    await consent(user);
    expect(await screen.findByRole('heading', { name: 'Prévisualisation de l’import' })).toBeVisible();
    expect(provider.importResolvedShare).toHaveBeenCalledTimes(1);
    expect(provider.importResolvedShare).toHaveBeenCalledWith(expect.objectContaining({ canonicalUrl: shareUrl }), expect.any(Object));
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Conserver ma conversation' })).toHaveFocus();
    expect(document.querySelector('.conversation-import')).toHaveProperty('inert', true);
    expect(dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmer le remplacement' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocksReplaced' }));
    expect(state.blocks[0].message).toBe('Bonjour');
  });

  it('annonce le décompte, cible le titre puis ferme la confirmation au clavier sans perdre le fil', async () => {
    const user = userEvent.setup();
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'old' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'old', field: 'message', value: 'texte local' });
    const dispatch = vi.fn();
    render(<ConversationImport state={state} dispatch={dispatch} providers={[providerWith()]} />);
    await consent(user);
    const title = await screen.findByRole('heading', { name: 'Prévisualisation de l’import' });
    expect(title).toHaveFocus();
    expect(screen.getByText('1 échange extrait, 0 avertissements.')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Bonjour', { exact: false })).not.toHaveAttribute('role', 'status');
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.getByRole('button', { name: 'Conserver ma conversation' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Confirmer le remplacement' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Conserver ma conversation' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' })).toHaveFocus();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('relie le dialogue à la passerelle injectée puis à l’extraction locale, sans transmettre la session', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(`<html><script data-mistral-share>${JSON.stringify({ messages: [
      { role: 'user', content: 'Bonjour public' },
      { role: 'assistant', content: 'Réponse publique' },
    ] })}</script></html>`, { headers: { 'content-type': 'text/html' } }));
    const provider = providerThroughGateway(fetcher as Parameters<typeof createRemoteGateway>[0]);
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'local' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'local', field: 'message', value: 'secret local' });
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);

    await openConsent(user);
    expect(fetcher).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuer avec le Worker' }));

    expect(await screen.findByRole('heading', { name: 'Prévisualisation de l’import' })).toBeVisible();
    expect(screen.getByText(/Bonjour public/)).toBeVisible();
    expect(fetcher).toHaveBeenCalledOnce();
    const [requestUrl, init] = fetcher.mock.calls[0];
    expect(requestUrl).toBe(PRODUCTION_IMPORT_ENDPOINT);
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ shareUrl }), headers: { 'Content-Type': 'application/json' }, credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' });
    expect(JSON.stringify({ requestUrl, init })).not.toContain('secret local');
    expect(dispatch).not.toHaveBeenCalled();
    expect(state.blocks[0].message).toBe('secret local');
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(state.blocks[0].message).toBe('secret local');
    await user.click(screen.getByRole('button', { name: 'Confirmer le remplacement' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocksReplaced' }));
    expect(state.blocks[0].message).toBe('Bonjour public');
  });

  it('transmet exactement la capacité créée pour le consentement courant', async () => {
    const user = userEvent.setup();
    const capability = createRemoteGatewayConsent(resolveShare(shareUrl)!, isResolvedShare, providerForResolvedShare)!;
    const createConsent = vi.spyOn(remoteGateway, 'createRemoteGatewayConsent').mockReturnValue(capability);
    const provider = providerWith();
    try {
      render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
      await consent(user);
      expect(createConsent).toHaveBeenCalledWith(expect.objectContaining({ canonicalUrl: shareUrl, providerId: 'mistral', policyVersion: 'mistral-v1' }), isResolvedShare, providerForResolvedShare, PRODUCTION_IMPORT_ENDPOINT);
      expect(provider.importResolvedShare).toHaveBeenCalledWith(expect.objectContaining({ canonicalUrl: shareUrl }), capability);
    } finally {
      createConsent.mockRestore();
    }
  });

  it('ne lance qu’un import lors de deux activations immédiates du consentement', async () => {
    const user = userEvent.setup();
    let resolveImport: (value: unknown) => void = () => undefined;
    const provider: ImportProvider = {
      id: 'mistral', label: 'Mistral', validateUrl: () => undefined,
      importFromUrl: vi.fn(),
      importResolvedShare: vi.fn().mockReturnValue(new Promise((resolve) => { resolveImport = resolve; })),
    };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    await openConsent(user);
    const continueButton = screen.getByRole('button', { name: 'Continuer avec le Worker' });
    fireEvent.click(continueButton);
    fireEvent.click(continueButton);
    expect(provider.importResolvedShare).toHaveBeenCalledTimes(1);
    resolveImport({ ok: true, providerId: 'mistral', events: [] });
  });

  it('demande toujours confirmation lorsque la session ne contient que des fichiers source', async () => {
    const user = userEvent.setup();
    const provider = providerWith();
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'old' });
    state = conversationReducer(state, { type: 'sourceAdded', blockId: 'old', source: { id: 'source-1', name: 'note.txt', type: 'text/plain', size: 5, text: 'notes' } });
    const dispatch = vi.fn();
    render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);
    await consent(user);
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    await user.click(screen.getByRole('button', { name: 'Conserver ma conversation' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(state.blocks[0].sources).toEqual([{ id: 'source-1', name: 'note.txt', type: 'text/plain', size: 5, text: 'notes' }]);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('remplace directement une session vide après la prévisualisation consentie', async () => {
    const user = userEvent.setup();
    const provider = providerWith();
    const dispatch = vi.fn();
    render(<ConversationImport state={initialConversationState} dispatch={dispatch} providers={[provider]} />);
    await consent(user);
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocksReplaced' }));
  });

  it('invalide le consentement et ignore une réponse devenue obsolète après modification de l’URL', async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: Response) => void = () => undefined;
    const fetcher = vi.fn().mockReturnValue(new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const provider = providerThroughGateway(fetcher as Parameters<typeof createRemoteGateway>[0]);
    const originalImport = provider.importResolvedShare!;
    let resolveImportSettled: () => void = () => undefined;
    const importSettled = new Promise<void>((resolve) => { resolveImportSettled = resolve; });
    const settledProvider: ImportProvider = {
      ...provider,
      importResolvedShare: async (resolved, consent) => {
        try { return await originalImport(resolved, consent); } finally { resolveImportSettled(); }
      },
    };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[settledProvider]} />);
    await consent(user);
    await user.type(screen.getByLabelText('Lien de partage'), 'x');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    resolveFetch(new Response(`<html><script data-mistral-share>${JSON.stringify({ messages: [
      { role: 'user', content: 'ignoré' },
      { role: 'assistant', content: 'ignoré aussi' },
    ] })}</script></html>`, { headers: { 'content-type': 'text/html' } }));
    await importSettled;
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Prévisualisation de l’import' })).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Prévisualisation de l’import' })).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('invalide également le consentement lorsqu’un autre fournisseur est détecté', async () => {
    const user = userEvent.setup();
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} />);
    await openConsent(user);
    await user.clear(screen.getByLabelText('Lien de partage'));
    await user.type(screen.getByLabelText('Lien de partage'), 'https://claude.ai/share/123e4567-e89b-12d3-a456-426614174000');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Seuls les liens publics Mistral');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('conserve la session et affiche les erreurs de l’import après consentement', async () => {
    const user = userEvent.setup();
    const provider = providerWith({ ok: false, providerId: 'test', events: [], error: { code: 'network', message: 'Accès refusé par le réseau ou CORS.' } });
    const dispatch = vi.fn();
    render(<ConversationImport state={initialConversationState} dispatch={dispatch} providers={[provider]} />);
    await consent(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé par le réseau ou CORS.');
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('place le focus sur le statut pendant une récupération en cours', async () => {
    const user = userEvent.setup();
    let finish!: (result: unknown) => void;
    const pending = new Promise((resolve) => { finish = resolve; });
    const provider: ImportProvider = { ...providerWith(), importResolvedShare: vi.fn().mockReturnValue(pending) };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    await consent(user);
    expect(screen.getAllByText('Analyse en cours…').find((element) => element.tagName === 'P')).toHaveFocus();
    finish({ ok: false, providerId: 'mistral', events: [], error: { code: 'network', message: 'Erreur réseau.' } });
    expect(await screen.findByRole('alert')).toHaveFocus();
  });

  it('conserve la session si la passerelle réelle injectée est indisponible', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'));
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'local' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'local', field: 'message', value: 'à conserver' });
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    render(<ConversationImport state={state} dispatch={dispatch} providers={[providerThroughGateway(fetcher as Parameters<typeof createRemoteGateway>[0])]} />);

    await consent(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé par le réseau ou la passerelle.');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(dispatch).not.toHaveBeenCalled();
    expect(state.blocks[0].message).toBe('à conserver');
    expect(screen.getByRole('button', { name: 'Importer manuellement' })).toBeVisible();
  });

  it('conserve le parcours manuel et la session si la passerelle n’est pas configurée', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'local' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'local', field: 'message', value: 'à conserver' });
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    render(<ConversationImport state={state} dispatch={dispatch} providers={[providerThroughGateway(fetcher as Parameters<typeof createRemoteGateway>[0], false)]} />);

    await consent(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('La passerelle d’import distant n’est pas configurée.');
    expect(fetcher).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(state.blocks[0].message).toBe('à conserver');
    expect(screen.getByRole('button', { name: 'Importer manuellement' })).toBeVisible();
  });

  it('refuse une prévisualisation sans échange après consentement', async () => {
    const user = userEvent.setup();
    const provider = providerWith({ ok: true, providerId: 'test', events: [{ role: 'assistant', text: 'sans utilisateur', order: 1 }] });
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    await consent(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun échange public importable');
    expect(screen.queryByRole('button', { name: 'Remplacer les échanges par l’import' })).not.toBeInTheDocument();
  });

  it('annonce les contenus inaccessibles sans les télécharger', async () => {
    const user = userEvent.setup();
    const provider = providerWith({ ok: true, providerId: 'test', events: [
      { role: 'user', text: 'Bonjour', order: 1 },
      { role: 'assistant', text: '[artifact](sandbox:/mnt/data/export.csv) fileciteturn0file0L1-L2', order: 2 },
    ] });
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    await consent(user);
    expect((await screen.findAllByText('Artifact détecté : collez son contenu dans le champ Artifact optionnel pour le compter.')).every((element) => element.getAttribute('role') !== 'status')).toBe(true);
    expect(screen.getAllByText('Fichier source détecté : uploadez-le pour inclure son contenu dans les tokens d’entrée.').every((element) => element.getAttribute('role') !== 'status')).toBe(true);
  });
});
