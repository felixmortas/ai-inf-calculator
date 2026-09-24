import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('parcours de départ', () => {
  it('propose les deux voies dans l’ordre et place le focus sur chaque étape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const actions = screen.getAllByRole('button');
    expect(actions.map((action) => action.textContent)).toEqual(['Importer un lien Mistral', 'Saisir un échange']);
    expect(screen.getByRole('heading', { name: 'Comment souhaitez-vous commencer ?' })).toHaveFocus();
    await user.click(actions[1]);
    expect(screen.getByRole('heading', { name: 'Choisir le chatbot et le modèle' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
    expect(screen.getByRole('heading', { name: 'Fil de conversation' })).toHaveFocus();
    expect(screen.getByText(/Référence actuelle : ChatGPT — gpt-5.6-luna/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
    expect(screen.getByLabelText('Modèle applicable à la conversation')).toHaveValue('gpt-5.6-luna');
  });

  it('propose les références Mistral et permet un autre modèle du chatbot', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.selectOptions(screen.getByLabelText('Chatbot'), 'Mistral AI');
    expect(screen.getByLabelText('Modèle applicable à la conversation')).toHaveValue('mistral-small');
    await user.selectOptions(screen.getByLabelText('Mode Mistral'), 'reasoning');
    expect(screen.getByLabelText('Modèle applicable à la conversation')).toHaveValue('mistral-large');
    await user.selectOptions(screen.getByLabelText('Modèle applicable à la conversation'), 'mistral-small');
    expect(screen.getByLabelText('Modèle applicable à la conversation')).toHaveValue('mistral-small');
  });

  it('laisse corriger directement la référence ChatGPT proposée', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.selectOptions(screen.getByLabelText('Modèle applicable à la conversation'), 'gpt-5.6-terra');
    expect(screen.getByLabelText('Modèle applicable à la conversation')).toHaveValue('gpt-5.6-terra');
    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'with-paid-subscription');
    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'without-paid-subscription');
    expect(screen.getByLabelText('Modèle applicable à la conversation')).toHaveValue('gpt-5.6-luna');
  });

  it('revient au fil vide après consultation de la référence', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
    await user.click(screen.getByRole('button', { name: 'Retour au fil' }));
    expect(screen.getByRole('heading', { name: 'Fil de conversation' })).toHaveFocus();
  });

  it('refuse localement une URL non Mistral et conserve la voie manuelle', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Importer un lien Mistral' }));
    expect(screen.getByRole('heading', { name: 'Importer un partage Mistral', level: 2 })).toHaveFocus();
    await user.type(screen.getByLabelText('Lien de partage'), 'https://chatgpt.com/share/123e4567-e89b-12d3-a456-426614174000');
    await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Seuls les liens publics Mistral');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Importer manuellement' }));
    expect(screen.getByRole('heading', { name: 'Choisir le chatbot et le modèle' })).toHaveFocus();
  });

  it('fait vérifier la référence avant le fil après un import Mistral', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response('<!doctype html><html><body><script data-mistral-share>{"messages":[{"role":"user","content":"Question importée"},{"role":"assistant","content":"Réponse importée"}]}</script></body></html>', { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    try {
      render(<App />);
      await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
      await user.selectOptions(screen.getByLabelText('Chatbot'), 'Mistral AI');
      await user.selectOptions(screen.getByLabelText('Mode Mistral'), 'reasoning');
      await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
      await user.click(screen.getByRole('button', { name: 'Retour à l’accueil' }));
      await user.click(screen.getByRole('button', { name: 'Importer un lien Mistral' }));
      await user.type(screen.getByLabelText('Lien de partage'), 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000');
      await user.click(screen.getByRole('button', { name: 'Analyser le lien' }));
      await user.click(await screen.findByRole('button', { name: 'Continuer avec le Worker' }));
      await user.click(await screen.findByRole('button', { name: 'Remplacer les échanges par l’import' }));
      expect(screen.getByRole('heading', { name: 'Choisir le chatbot et le modèle' })).toHaveFocus();
      expect(screen.getByLabelText('Chatbot')).toHaveValue('Mistral AI');
      expect(screen.getByLabelText('Mode Mistral')).toHaveValue('fast');
      expect(screen.getByLabelText('Modèle applicable à la conversation')).toHaveValue('mistral-small');
      expect(screen.queryByRole('button', { name: 'Calculer' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
      expect(screen.getByRole('heading', { name: 'Fil de conversation' })).toHaveFocus();
      expect(screen.getByText(/Référence actuelle : Mistral AI — mistral-small/)).toBeVisible();
      expect(screen.getByDisplayValue('Question importée')).toBeVisible();
      expect(fetcher).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });
});
