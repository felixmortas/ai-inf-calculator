import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { initialConversationState, conversationReducer } from '../application/conversationReducer';
import { chatGptShareProvider, importResolvedChatGptShare } from '../application/import/chatgptShare';
import { isResolvedShare, providerForResolvedShare, resolveShare } from '../application/import/registry';
import { CORSPROXY_ORIGIN, createRemoteGateway, createRemoteGatewayConsent, type RemoteGatewayConsent } from '../application/import/remoteGateway';
import type { ImportProvider } from '../application/import/types';
import * as remoteGateway from '../application/import/remoteGateway';
import { ConversationImport } from './ConversationImport';

const shareUrl = 'https://chatgpt.com/share/abc';

function providerWith(result: unknown = { ok: true, providerId: 'test', events: [
  { role: 'user', text: 'Bonjour', order: 1 }, { role: 'assistant', text: 'Réponse', order: 2 },
] }): ImportProvider {
  return { id: 'test', label: 'ChatGPT', validateUrl: () => undefined, importFromUrl: vi.fn(), importResolvedShare: vi.fn().mockResolvedValue(result) };
}

function providerThroughGateway(fetcher: Parameters<typeof createRemoteGateway>[0], configured = true): ImportProvider {
  const gateway = createRemoteGateway(fetcher, { apiKey: () => configured ? 'test key' : undefined });
  return {
    id: 'chatgpt', label: 'ChatGPT', validateUrl: chatGptShareProvider.validateUrl,
    importFromUrl: async () => ({ ok: false as const, providerId: 'chatgpt', events: [] as const, error: { code: 'consent-required' as const, message: 'Capacité attestée requise.' } }),
    importResolvedShare: (resolved, consent) => importResolvedChatGptShare(resolved, consent as RemoteGatewayConsent | undefined, gateway),
  };
}

async function openConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Lien de partage'), shareUrl);
  await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
  return screen.findByRole('dialog', { name: 'Autoriser la récupération de ce partage ?' });
}

async function consent(user: ReturnType<typeof userEvent.setup>) {
  await openConsent(user);
  await user.click(screen.getByRole('button', { name: 'Continuer avec corsproxy.io' }));
}

describe('ConversationImport', () => {
  it('documente la frontière tierce, les formats admis et le parcours manuel', () => {
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} />);
    const help = screen.getByRole('complementary', { name: 'À savoir avant un import distant' });
    expect(help).toHaveTextContent('https://chatgpt.com/share/<id>');
    expect(help).toHaveTextContent('https://claude.ai/share/<id>');
    expect(help).toHaveTextContent('https://chat.mistral.ai/chat/<id>');
    expect(help).toHaveTextContent('https://share.gemini.google/<id>');
    expect(help).toHaveTextContent('consentement explicite et ponctuel');
    expect(help).toHaveTextContent('Les redirections ne sont pas admises.');
    expect(within(help).getByText('Claude', { exact: true }).parentElement).toHaveTextContent('Format admis : https://claude.ai/share/<id>. Aucune redirection n’est admise.');
    expect(within(help).getByText('Mistral', { exact: true }).parentElement).toHaveTextContent('Format admis : https://chat.mistral.ai/chat/<id>. Aucune redirection n’est admise.');
    expect(within(help).getByText('Gemini', { exact: true }).parentElement).toHaveTextContent('L’import distant Gemini est actuellement indisponible, y compris sans redirection, car la passerelle ne peut pas attester sa politique ; importez manuellement.');
    expect(help).toHaveTextContent('clé API de configuration de la passerelle');
    expect(help).toHaveTextContent('Cette clé de configuration n’est pas une donnée locale de votre session');
    expect(help).toHaveTextContent('Une dérive de format ou une limite propre à un fournisseur');
    expect(help).toHaveTextContent('Une panne ou une indisponibilité de corsproxy.io concerne au contraire l’import distant de tous les fournisseurs');
    expect(help).toHaveTextContent('adresse IP, votre agent utilisateur, l’heure et le volume');
    expect(help).toHaveTextContent('ne permettent pas au calculateur de garantir');
    expect(help).toHaveTextContent('recopier ou coller vos échanges manuellement');
    expect(within(help).getAllByRole('link', { name: /corsproxy\.io/ })).toHaveLength(3);
    expect(within(help).getByRole('link', { name: 'Documentation de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/');
    expect(within(help).getByRole('link', { name: 'Politique de confidentialité de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/privacy-policy');
    expect(within(help).getByRole('link', { name: 'Conditions de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/terms-of-service');
  });

  it('invalide le consentement lors d’un changement vers un fournisseur valide distinct', async () => {
    const user = userEvent.setup();
    const chatgpt = { ...providerWith(), id: 'chatgpt', label: 'ChatGPT' };
    const claude = { ...providerWith(), id: 'claude', label: 'Claude' };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[chatgpt, claude]} />);
    const input = screen.getByLabelText('Lien de partage');
    await user.type(input, 'https://chatgpt.com/share/abc-123');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('page publique ChatGPT');
    await user.clear(input);
    await user.type(input, 'https://claude.ai/share/opaque_id');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chatgpt.importResolvedShare).not.toHaveBeenCalled();
    expect(claude.importResolvedShare).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('page publique Claude');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(chatgpt.importResolvedShare).not.toHaveBeenCalled();
    expect(claude.importResolvedShare).not.toHaveBeenCalled();
  });

  it.each([
    ['ChatGPT', 'chatgpt', 'https://chatgpt.com/share/abc-123'],
    ['Claude', 'claude', 'https://claude.ai/share/opaque_id'],
    ['Mistral', 'mistral', 'https://chat.mistral.ai/chat/opaque_id'],
    ['Gemini', 'gemini', 'https://share.gemini.google/opaque_id'],
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
    await user.click(await screen.findByRole('button', { name: 'Continuer avec corsproxy.io' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Passerelle indisponible.');
    expect(importResolvedShare).toHaveBeenCalledWith(expect.objectContaining({ canonicalUrl: url, providerId: id }), expect.any(Object));
    expect(dispatch).not.toHaveBeenCalled();
    expect(state.blocks[0].message).toBe('à préserver');

    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await user.click(await screen.findByRole('button', { name: 'Continuer avec corsproxy.io' }));
    expect(await screen.findByRole('heading', { name: 'Prévisualisation de l’import' })).toBeVisible();
    expect(screen.getByText('Message').parentElement).toHaveTextContent('Bonjour public');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each([
    ['ChatGPT', 'https://chatgpt.com/share/abc-123'],
    ['Claude', 'https://claude.ai/share/opaque_id'],
    ['Mistral', 'https://chat.mistral.ai/chat/opaque_id'],
    ['Gemini', 'https://share.gemini.google/opaque_id'],
  ])('détecte %s et demande le consentement avant toute récupération', async (label, url) => {
    const user = userEvent.setup();
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} />);
    await user.type(screen.getByLabelText('Lien de partage'), url);
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(`page publique ${label}`);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });

  it.each([
    ['Claude', 'https://claude.ai/share/opaque_id', 'passerelle d’import distant n’est pas configurée'],
    ['Mistral', 'https://chat.mistral.ai/chat/opaque_id', 'passerelle d’import distant n’est pas configurée'],
    ['Gemini', 'https://share.gemini.google/opaque_id', 'ne peut pas attester les redirections autorisées'],
  ])('remet la capacité à %s, qui refuse sans requête ni mutation tant que la passerelle n’est pas disponible', async (_label, url, expectedError) => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const fetcher = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetcher;
    try {
      render(<ConversationImport state={initialConversationState} dispatch={dispatch} />);
      await user.type(screen.getByLabelText('Lien de partage'), url);
      await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
      await user.click(await screen.findByRole('button', { name: 'Continuer avec corsproxy.io' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(expectedError);
      expect(fetcher).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('invalide le consentement ouvert si le registre ou le résolveur change', async () => {
    const user = userEvent.setup();
    const first = providerWith();
    const second = { ...providerWith(), id: 'chatgpt' };
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

  it('ouvre le consentement avant tout import, informe en français et restaure le focus après annulation', async () => {
    const user = userEvent.setup();
    const provider = providerWith();
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    const dialog = await openConsent(user);
    expect(provider.importFromUrl).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Continuer avec corsproxy.io' })).toHaveFocus();
    expect(dialog).toHaveTextContent('corsproxy.io récupérera la page publique');
    expect(dialog).toHaveTextContent(shareUrl);
    expect(dialog).toHaveTextContent('adresse IP et votre agent utilisateur');
    expect(dialog).toHaveTextContent('blocs locaux, ni vos fichiers, ni vos résultats, ni vos paramètres');
    for (const link of screen.getAllByRole('link').filter((item) => item.getAttribute('target') === '_blank')) expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(within(dialog).getByRole('link', { name: 'Documentation de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/');
    expect(within(dialog).getByRole('link', { name: 'Politique de confidentialité de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/privacy-policy');
    expect(within(dialog).getByRole('link', { name: 'Conditions de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/terms-of-service');
    const manualLink = screen.getByRole('link', { name: 'Importer manuellement' });
    manualLink.focus();
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.tab({ shift: true });
    expect(manualLink).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('link', { name: 'Importer manuellement' }));
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
    expect(dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmer le remplacement' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocksReplaced' }));
    expect(state.blocks[0].message).toBe('Bonjour');
  });

  it('relie le dialogue à la passerelle injectée puis à l’extraction locale, sans transmettre la session', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response(`<script type="application/json">${JSON.stringify({ messages: [
      { author: { role: 'user' }, content: { parts: ['Bonjour public'] } },
      { author: { role: 'assistant' }, content: { parts: ['Réponse publique'] } },
    ] })}</script>`));
    const provider = providerThroughGateway(fetcher as Parameters<typeof createRemoteGateway>[0]);
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'local' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'local', field: 'message', value: 'secret local' });
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);

    await openConsent(user);
    expect(fetcher).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuer avec corsproxy.io' }));

    expect(await screen.findByRole('heading', { name: 'Prévisualisation de l’import' })).toBeVisible();
    expect(screen.getByText(/Bonjour public/)).toBeVisible();
    expect(fetcher).toHaveBeenCalledOnce();
    const [requestUrl, init] = fetcher.mock.calls[0];
    expect(requestUrl).toBe(`${CORSPROXY_ORIGIN}?url=${encodeURIComponent(shareUrl)}&key=test%20key`);
    expect(init).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' });
    expect(init).not.toHaveProperty('body');
    expect(init).not.toHaveProperty('headers');
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
      expect(createConsent).toHaveBeenCalledWith(expect.objectContaining({ canonicalUrl: shareUrl, providerId: 'chatgpt', policyVersion: 'chatgpt-v1' }), isResolvedShare, providerForResolvedShare);
      expect(provider.importResolvedShare).toHaveBeenCalledWith(expect.objectContaining({ canonicalUrl: shareUrl }), capability);
    } finally {
      createConsent.mockRestore();
    }
  });

  it('ne lance qu’un import lors de deux activations immédiates du consentement', async () => {
    const user = userEvent.setup();
    let resolveImport: (value: unknown) => void = () => undefined;
    const provider: ImportProvider = {
      id: 'test', label: 'ChatGPT', validateUrl: () => undefined,
      importFromUrl: vi.fn(),
      importResolvedShare: vi.fn().mockReturnValue(new Promise((resolve) => { resolveImport = resolve; })),
    };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    await openConsent(user);
    const continueButton = screen.getByRole('button', { name: 'Continuer avec corsproxy.io' });
    fireEvent.click(continueButton);
    fireEvent.click(continueButton);
    expect(provider.importResolvedShare).toHaveBeenCalledTimes(1);
    resolveImport({ ok: true, providerId: 'test', events: [] });
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
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
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
    resolveFetch(new Response(`<script type="application/json">${JSON.stringify({ messages: [
      { author: { role: 'user' }, content: { parts: ['ignoré'] } },
      { author: { role: 'assistant' }, content: { parts: ['ignoré aussi'] } },
    ] })}</script>`));
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
    await user.type(screen.getByLabelText('Lien de partage'), 'https://claude.ai/share/opaque_id');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('page publique Claude');
  });

  it('conserve la session et affiche les erreurs de l’import après consentement', async () => {
    const user = userEvent.setup();
    const provider = providerWith({ ok: false, providerId: 'test', events: [], error: { code: 'network', message: 'Accès refusé par le réseau ou CORS.' } });
    const dispatch = vi.fn();
    render(<ConversationImport state={initialConversationState} dispatch={dispatch} providers={[provider]} />);
    await consent(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé par le réseau ou CORS.');
    expect(dispatch).not.toHaveBeenCalled();
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
    expect(screen.getByRole('link', { name: 'Importer manuellement' })).toHaveAttribute('href', '#conversation-title');
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
    expect(screen.getByRole('link', { name: 'Importer manuellement' })).toHaveAttribute('href', '#conversation-title');
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
    expect((await screen.findAllByText('Artifact détecté : collez son contenu dans le champ Artifact optionnel pour le compter.')).some((element) => element.getAttribute('role') === 'status')).toBe(true);
    expect(screen.getAllByText('Fichier source détecté : uploadez-le pour inclure son contenu dans les tokens d’entrée.').some((element) => element.getAttribute('role') === 'status')).toBe(true);
  });
});
