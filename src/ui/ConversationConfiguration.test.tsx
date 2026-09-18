import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('configuration de conversation', () => {
  it('affiche et résout le modèle ChatGPT selon l’abonnement', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('gpt-5.6-luna')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'with-paid-subscription');
    expect(screen.getByText('gpt-5.6-terra')).toBeVisible();
  });

  it('masque l’abonnement et limite les modèles pour un autre fournisseur', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Chatbot'), 'Gemini');
    expect(screen.queryByLabelText('Abonnement ChatGPT')).not.toBeInTheDocument();
    const model = screen.getByLabelText('Modèle applicable à la conversation');
    expect(model).toHaveValue('gemini-3.5-pro');
    expect(screen.queryByRole('option', { name: 'gpt-5.6-luna' })).not.toBeInTheDocument();
    await user.selectOptions(model, 'gemini-3.6-flash');
    expect(model).toHaveValue('gemini-3.6-flash');
  });

  it('reste opérable au clavier avec un focus visible natif', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.tab();
    expect(screen.getByLabelText('Chatbot')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Chatbot')).toHaveFocus();
  });

  it('repart des valeurs initiales après un nouveau montage', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'with-paid-subscription');
    first.unmount();
    render(<App />);
    expect(screen.getByText('gpt-5.6-luna')).toBeVisible();
  });

  it('ne persiste pas les sélections dans le navigateur', async () => {
    const user = userEvent.setup();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const pushState = vi.spyOn(History.prototype, 'pushState');
    const replaceState = vi.spyOn(History.prototype, 'replaceState');
    render(<App />);

    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'with-paid-subscription');

    expect(storageWrite).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
