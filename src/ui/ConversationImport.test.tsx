import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { initialConversationState, conversationReducer } from '../application/conversationReducer';
import type { ImportProvider } from '../application/import/types';
import * as remoteGateway from '../application/import/remoteGateway';
import { ConversationImport } from './ConversationImport';

const shareUrl = 'https://chatgpt.com/share/abc';

function providerWith(result: unknown = { ok: true, providerId: 'test', events: [
  { role: 'user', text: 'Bonjour', order: 1 }, { role: 'assistant', text: 'Réponse', order: 2 },
] }): ImportProvider {
  return { id: 'test', label: 'ChatGPT', validateUrl: () => undefined, importFromUrl: vi.fn().mockResolvedValue(result) };
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
    expect(screen.getByRole('link', { name: 'Documentation de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/');
    expect(screen.getByRole('link', { name: 'Politique de confidentialité de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/privacy-policy');
    expect(screen.getByRole('link', { name: 'Conditions de corsproxy.io' })).toHaveAttribute('href', 'https://corsproxy.io/terms-of-service');
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
    const provider = providerWith();
    const dispatch = vi.fn();
    render(<ConversationImport state={initialConversationState} dispatch={dispatch} providers={[provider]} />);
    await openConsent(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(provider.importFromUrl).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await user.click(screen.getByRole('link', { name: 'Importer manuellement' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(provider.importFromUrl).not.toHaveBeenCalled();
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
    expect(provider.importFromUrl).toHaveBeenCalledTimes(1);
    expect(provider.importFromUrl).toHaveBeenCalledWith(shareUrl, expect.any(Object));
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmer le remplacement' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocksReplaced' }));
    expect(state.blocks[0].message).toBe('Bonjour');
  });

  it('transmet exactement la capacité créée pour le consentement courant', async () => {
    const user = userEvent.setup();
    const capability = Object.freeze({ url: shareUrl });
    const createConsent = vi.spyOn(remoteGateway, 'createRemoteGatewayConsent').mockReturnValue(capability);
    const provider = providerWith();
    try {
      render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
      await consent(user);
      expect(createConsent).toHaveBeenCalledWith(shareUrl);
      expect(provider.importFromUrl).toHaveBeenCalledWith(shareUrl, capability);
    } finally {
      createConsent.mockRestore();
    }
  });

  it('ne lance qu’un import lors de deux activations immédiates du consentement', async () => {
    const user = userEvent.setup();
    let resolveImport: (value: unknown) => void = () => undefined;
    const provider: ImportProvider = {
      id: 'test', label: 'ChatGPT', validateUrl: () => undefined,
      importFromUrl: vi.fn().mockReturnValue(new Promise((resolve) => { resolveImport = resolve; })),
    };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    await openConsent(user);
    const continueButton = screen.getByRole('button', { name: 'Continuer avec corsproxy.io' });
    fireEvent.click(continueButton);
    fireEvent.click(continueButton);
    expect(provider.importFromUrl).toHaveBeenCalledTimes(1);
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
    let resolveImport: (value: unknown) => void = () => undefined;
    const provider: ImportProvider = { id: 'test', label: 'ChatGPT', validateUrl: () => undefined, importFromUrl: vi.fn().mockReturnValue(new Promise((resolve) => { resolveImport = resolve; })) };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[provider]} />);
    await consent(user);
    await user.type(screen.getByLabelText('Lien de partage'), 'x');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    resolveImport({ ok: true, providerId: 'test', events: [{ role: 'user', text: 'ignoré', order: 1 }] });
    await Promise.resolve();
    expect(screen.queryByRole('heading', { name: 'Prévisualisation de l’import' })).not.toBeInTheDocument();
    expect(provider.importFromUrl).toHaveBeenCalledTimes(1);
  });

  it('invalide également le consentement si le fournisseur change', async () => {
    const user = userEvent.setup();
    const first = providerWith();
    const second = { ...providerWith(), id: 'other', label: 'Autre' };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[first, second]} />);
    await openConsent(user);
    await user.selectOptions(screen.getByLabelText('Fournisseur de partage'), 'other');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(first.importFromUrl).not.toHaveBeenCalled();
    expect(second.importFromUrl).not.toHaveBeenCalled();
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
