import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('composition de la conversation', () => {
  it('ajoute un bloc avec quatre champs libellés accessibles', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    expect(screen.getByLabelText('Message')).toBeVisible();
    expect(screen.getByLabelText('Réponse finale')).toBeVisible();
    expect(screen.getByLabelText('Raisonnement visible')).toBeVisible();
    expect(screen.getByLabelText('Artifact optionnel')).toBeVisible();
  });

  it('signale un bloc vide comme ignoré et conserve le texte renseigné durant la session', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    expect(screen.getByText('Ce bloc sera ignoré pour les calculs futurs.')).toBeVisible();
    await user.type(screen.getByLabelText('Message'), ' Bonjour ');
    expect(screen.queryByText('Ce bloc sera ignoré pour les calculs futurs.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toHaveValue(' Bonjour ');
  });

  it('isole deux blocs, génère des identifiants distincts et déplace le focus après une suppression ciblée', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    const messages = screen.getAllByLabelText('Message');
    expect(messages[0].id).not.toBe(messages[1].id);
    await user.type(messages[0], 'à supprimer');
    await user.type(messages[1], 'à conserver');
    const removeFirst = screen.getByRole('button', { name: 'Supprimer l’échange 1' });
    removeFirst.focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByLabelText('Message')).toHaveLength(1);
    expect(screen.getByLabelText('Message')).toHaveValue('à conserver');
    expect(screen.getByRole('button', { name: 'Supprimer l’échange 1' })).toHaveFocus();
  });

  it('reste utilisable au clavier et ne persiste pas les blocs au nouveau montage', async () => {
    const user = userEvent.setup();
    const storageSet = vi.spyOn(Storage.prototype, 'setItem');
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem');
    const storageClear = vi.spyOn(Storage.prototype, 'clear');
    const historyPush = vi.spyOn(History.prototype, 'pushState');
    const historyReplace = vi.spyOn(History.prototype, 'replaceState');
    const first = render(<App />);
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Ajouter un échange' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.type(screen.getByLabelText('Message'), 'éphémère');
    expect(storageSet).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
    expect(storageClear).not.toHaveBeenCalled();
    expect(historyPush).not.toHaveBeenCalled();
    expect(historyReplace).not.toHaveBeenCalled();
    first.unmount();
    render(<App />);
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });
});
