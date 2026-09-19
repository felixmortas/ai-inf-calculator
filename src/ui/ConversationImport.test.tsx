import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { initialConversationState, conversationReducer } from '../application/conversationReducer';
import type { ImportProvider } from '../application/import/types';
import { ConversationImport } from './ConversationImport';

const provider: ImportProvider = {
  id: 'test', label: 'ChatGPT', validateUrl: () => undefined,
  importFromUrl: vi.fn().mockResolvedValue({ ok: true, providerId: 'test', events: [
    { role: 'user', text: 'Bonjour', order: 1 }, { role: 'assistant', text: 'Réponse', order: 2 },
  ] }),
};

describe('ConversationImport', () => {
  it('prévisualise sans muter, demande confirmation pour une session non vide puis remplace', async () => {
    const user = userEvent.setup();
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'old' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'old', field: 'message', value: 'à garder' });
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    const { rerender } = render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);
    await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/abc');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('heading', { name: 'Prévisualisation de l’import' })).toBeVisible();
    expect(state.blocks[0].message).toBe('à garder');
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(state.blocks[0].message).toBe('à garder');
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer le remplacement' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'blocksReplaced' }));
    expect(state.blocks[0].message).toBe('Bonjour');
    rerender(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);
  });

  it('demande confirmation et préserve les sources seules après annulation', async () => {
    const user = userEvent.setup();
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'old' });
    state = conversationReducer(state, { type: 'sourceAdded', blockId: 'old', source: { id: 'source-1', name: 'note.txt', type: 'text/plain', size: 5, text: 'notes' } });
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);
    await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/abc');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await screen.findByRole('heading', { name: 'Prévisualisation de l’import' });

    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' })).toBeVisible();
    expect(state.blocks[0].sources).toEqual([{ id: 'source-1', name: 'note.txt', type: 'text/plain', size: 5, text: 'notes' }]);
    expect(dispatch).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
  });

  it('conserve l’état en cas d’échec et montre une erreur actionnable', async () => {
    const user = userEvent.setup();
    const rejected: ImportProvider = { ...provider, importFromUrl: vi.fn().mockResolvedValue({ ok: false, providerId: 'test', events: [], error: { code: 'network', message: 'Accès refusé par le réseau ou CORS.' } }) };
    const dispatch = vi.fn();
    render(<ConversationImport state={initialConversationState} dispatch={dispatch} providers={[rejected]} />);
    await user.type(screen.getByLabelText('Lien de partage'), 'x');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Accès refusé par le réseau ou CORS.');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('refuse une prévisualisation sans échange et gère un rejet sans muter la session', async () => {
    const user = userEvent.setup();
    const empty: ImportProvider = { ...provider, importFromUrl: vi.fn().mockResolvedValue({ ok: true, providerId: 'test', events: [{ role: 'assistant', text: 'sans utilisateur', order: 1 }] }) };
    const dispatch = vi.fn();
    render(<ConversationImport state={initialConversationState} dispatch={dispatch} providers={[empty]} />);
    await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/abc');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Aucun échange public importable');
    expect(screen.queryByRole('button', { name: 'Remplacer les échanges par l’import' })).not.toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('ignore un résultat devenu obsolète et affiche une erreur en cas de rejet', async () => {
    const user = userEvent.setup();
    let rejectImport: (reason?: unknown) => void = () => undefined;
    const pending: ImportProvider = { ...provider, importFromUrl: vi.fn().mockReturnValue(new Promise((_, reject) => { rejectImport = reject; })) };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[pending]} />);
    const url = screen.getByLabelText('Lien de partage');
    await user.type(url, 'https://chatgpt.com/share/abc');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await user.type(url, 'x');
    rejectImport(new Error('réseau'));
    await Promise.resolve();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Prévisualisation de l’import' })).not.toBeInTheDocument();
  });

  it('remplace directement une session vide sans lancer de calcul', async () => {
    const user = userEvent.setup();
    let state = initialConversationState;
    const dispatch = vi.fn((action) => { state = conversationReducer(state, action); });
    render(<ConversationImport state={state} dispatch={dispatch} providers={[provider]} />);
    await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/abc');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    await screen.findByRole('heading', { name: 'Prévisualisation de l’import' });
    await user.click(screen.getByRole('button', { name: 'Remplacer les échanges par l’import' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(state.blocks).toHaveLength(1);
    expect(state.impacts).toEqual({});
    expect(state.summary).toBeUndefined();
  });

  it('annonce les contenus inaccessibles sans en déduire ou télécharger le contenu', async () => {
    const user = userEvent.setup();
    const inaccessible: ImportProvider = {
      ...provider,
      importFromUrl: vi.fn().mockResolvedValue({ ok: true, providerId: 'test', events: [
        { role: 'user', text: 'Bonjour', order: 1 },
        { role: 'assistant', text: '[artifact](sandbox:/mnt/data/export.csv) fileciteturn0file0L1-L2', order: 2 },
      ] }),
    };
    render(<ConversationImport state={initialConversationState} dispatch={vi.fn()} providers={[inaccessible]} />);
    await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/abc');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect((await screen.findAllByText('Artifact détecté : collez son contenu dans le champ Artifact optionnel pour le compter.')).some((element) => element.getAttribute('role') === 'status')).toBe(true);
    expect(screen.getAllByText('Fichier source détecté : uploadez-le pour inclure son contenu dans les tokens d’entrée.').some((element) => element.getAttribute('role') === 'status')).toBe(true);
    expect(inaccessible.importFromUrl).toHaveBeenCalledTimes(1);
  });
});
