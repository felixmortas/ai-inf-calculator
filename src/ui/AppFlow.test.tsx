import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('parcours de départ', () => {
  it('fait défiler jusqu’au bas quand le fil dépasse la fenêtre', async () => {
    const heightDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, 'scrollHeight');
    const viewportDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'auto' });
    scrollTo.mockRestore();
    if (heightDescriptor) Object.defineProperty(document.documentElement, 'scrollHeight', heightDescriptor);
    if (viewportDescriptor) Object.defineProperty(window, 'innerHeight', viewportDescriptor);
  });

  it('propose les deux voies dans l’ordre et place le focus sur chaque étape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const actions = screen.getAllByRole('button');
    expect(actions.map((action) => action.getAttribute('aria-label'))).toEqual(['Importer un lien Mistral', 'Saisir un échange']);
    expect(screen.getByRole('heading', { name: 'Choisissez votre méthode de calcul :' })).toHaveFocus();
    await user.click(actions[1]);
    expect(screen.getByRole('heading', { name: 'Sélectionnez votre chatbot' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(screen.getByRole('heading', { name: 'Copiez/collez les messages de votre conversation' })).toHaveFocus();
    expect(screen.getByText(/Modèle sélectionné : ChatGPT — gpt-4o-mini/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
    expect(screen.getByLabelText('Modèle')).toHaveValue('gpt-4o-mini');
  });

  it('propose les références Mistral et permet un autre modèle du chatbot', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.selectOptions(screen.getByLabelText('Chatbot'), 'Mistral AI');
    expect(screen.getByLabelText('Modèle')).toHaveValue('mistral-medium-3.1');
    await user.selectOptions(screen.getByLabelText('Mode'), 'reasoning');
    expect(screen.getByLabelText('Modèle')).toHaveValue('mistral-medium-3.1');
    await user.selectOptions(screen.getByLabelText('Modèle'), 'mistral-medium-3.1');
    expect(screen.getByLabelText('Modèle')).toHaveValue('mistral-medium-3.1');
  });

  it('laisse corriger directement la référence ChatGPT proposée', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.selectOptions(screen.getByLabelText('Modèle'), 'gpt-4o');
    expect(screen.getByLabelText('Modèle')).toHaveValue('gpt-4o');
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'with-paid-subscription');
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'without-paid-subscription');
    expect(screen.getByLabelText('Modèle')).toHaveValue('gpt-4o-mini');
  });

  it('revient au fil vide après consultation de la référence', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));
    expect(screen.queryByLabelText('Votre message')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
    await user.click(screen.getByRole('button', { name: 'Retour au fil' }));
    expect(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' })).toHaveFocus();
  });

  it('refuse localement une URL non Mistral et conserve la voie manuelle', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Importer un lien Mistral' }));
    expect(screen.getByRole('heading', { name: 'Importer une conversation depuis Mistral AI', level: 2 })).toHaveFocus();
    await user.type(screen.getByLabelText('Collez le lien de partage'), 'https://chatgpt.com/share/123e4567-e89b-12d3-a456-426614174000');
    await user.click(screen.getByRole('button', { name: 'Importer la conversation' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Seuls les liens publics Mistral');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Importer manuellement' }));
    expect(screen.getByRole('heading', { name: 'Sélectionnez votre chatbot' })).toHaveFocus();
  });

  it('fait vérifier la référence avant le fil après un import Mistral', async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(new Response('<!doctype html><html><body><script data-mistral-share>{"messages":[{"role":"user","content":"Question importée"},{"role":"assistant","content":"Réponse importée"}]}</script></body></html>', { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetcher);
    try {
      render(<App />);
      await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
      await user.selectOptions(screen.getByLabelText('Chatbot'), 'Mistral AI');
      await user.selectOptions(screen.getByLabelText('Mode'), 'reasoning');
      await user.click(screen.getByRole('button', { name: 'Valider' }));
      await user.click(screen.getByRole('button', { name: 'Retour à l’accueil' }));
      await user.click(screen.getByRole('button', { name: 'Importer un lien Mistral' }));
      await user.type(screen.getByLabelText('Collez le lien de partage'), 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000');
      await user.click(screen.getByRole('button', { name: 'Importer la conversation' }));
      await user.click((await screen.findAllByRole('button', { name: 'Remplacer les échanges par l’import' }))[0]);
      expect(screen.getByRole('heading', { name: 'Sélectionnez votre chatbot' })).toHaveFocus();
      expect(screen.getByLabelText('Chatbot')).toHaveValue('Mistral AI');
      expect(screen.getByLabelText('Mode')).toHaveValue('');
      expect(screen.getByLabelText('Modèle')).toHaveValue('');
      expect(screen.queryByRole('option', { name: 'mistral-medium-3.1' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('Chatbot')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Calculer l’impact de cet échange uniquement' })).not.toBeInTheDocument();
      await user.selectOptions(screen.getByLabelText('Mode'), 'reasoning');
      expect(screen.getByLabelText('Chatbot')).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Valider' })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: 'Valider' }));
      expect(screen.getByRole('heading', { name: 'Copiez/collez les messages de votre conversation' })).toHaveFocus();
      expect(screen.getByText(/Modèle sélectionné : Mistral AI — mistral-medium-3.1/)).toBeVisible();
      await user.click(screen.getByRole('button', { name: 'Déplier l’échange 1' }));
      expect(screen.getByDisplayValue('Question importée')).toBeVisible();
      expect(fetcher).toHaveBeenCalledOnce();
    } finally { vi.unstubAllGlobals(); }
  });

  it('isole le fond et le bouton Retour pendant la confirmation de remplacement', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><script data-mistral-share>{"messages":[{"role":"user","content":"Question"},{"role":"assistant","content":"Réponse"}]}</script></html>', { headers: { 'content-type': 'text/html' } })));
    try {
      render(<App />);
      await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
      await user.click(screen.getByRole('button', { name: 'Valider' }));
      await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
      await user.type(screen.getByRole('textbox', { name: 'Votre message' }), 'Texte local');
      await user.click(screen.getByRole('button', { name: 'Retour à l’accueil' }));
      await user.click(screen.getByRole('button', { name: 'Importer un lien Mistral' }));
      const background = document.querySelector('.app-shell');
      const back = screen.getByRole('button', { name: 'Retour à l’accueil' });
      await user.type(screen.getByLabelText('Collez le lien de partage'), 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000');
      await user.click(screen.getByRole('button', { name: 'Importer la conversation' }));
      await screen.findByRole('heading', { name: 'Prévisualisation de l’import' });
      await user.click(screen.getAllByRole('button', { name: 'Remplacer les échanges par l’import' })[0]);
      expect(screen.getByRole('alertdialog')).toBeVisible();
      expect(background).toHaveProperty('inert', true);
      expect(back.closest('.app-shell')).toHaveProperty('inert', true);
      await user.keyboard('{Escape}');
      expect(background).toHaveProperty('inert', false);
      expect(back.closest('.app-shell')).toHaveProperty('inert', false);
    } finally { vi.unstubAllGlobals(); }
  });

  it('libère le choix de mode importé en repartant par la saisie manuelle', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><script data-mistral-share>{"messages":[{"role":"user","content":"Question"},{"role":"assistant","content":"Réponse"}]}</script></html>', { headers: { 'content-type': 'text/html' } })));
    try {
      render(<App />);
      await user.click(screen.getByRole('button', { name: 'Importer un lien Mistral' }));
      await user.type(screen.getByLabelText('Collez le lien de partage'), 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000');
      await user.click(screen.getByRole('button', { name: 'Importer la conversation' }));
      await user.click((await screen.findAllByRole('button', { name: 'Remplacer les échanges par l’import' }))[0]);
      expect(screen.getByRole('button', { name: 'Valider' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Retour à l’import' }));
      await user.click(screen.getByRole('button', { name: 'Retour à l’accueil' }));
      await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
      expect(screen.getByRole('button', { name: 'Valider' })).toBeEnabled();
      expect(screen.getByLabelText('Mode')).toHaveValue('fast');
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('fil et estimations', () => {
  async function openThread(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
    await user.click(screen.getByRole('button', { name: 'Valider' }));
  }

  it('calcule seulement l’échange demandé et laisse le bilan à son action explicite', async () => {
    const user = userEvent.setup();
    await openThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByRole('textbox', { name: 'Votre message' }), 'Première question');
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByRole('textbox', { name: 'Réponse du chatbot' }), 'Seconde réponse');
    expect(screen.getByRole('region', { name: 'Échange 1' })).toHaveTextContent('Première question');
    expect(screen.getByRole('button', { name: 'Déplier l’échange 1' })).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Calculer l’impact de cet échange uniquement' }));
    expect(await screen.findByLabelText('Impact pour cet échange')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Échange 1' })).toHaveTextContent('Impact à calculer');
    expect(screen.queryByRole('heading', { name: 'Bilan environnemental de la conversation' })).not.toBeInTheDocument();
  });

  it('annonce la péremption en chaîne après édition sans remplacer les textes ni recalculer', async () => {
    const user = userEvent.setup();
    await openThread(user);
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByRole('textbox', { name: 'Votre message' }), 'Question initiale');
    await user.click(screen.getByRole('button', { name: 'Calculer l’impact de cet échange uniquement' }));
    await screen.findByLabelText('Impact pour cet échange');
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByRole('textbox', { name: 'Votre message' }), 'Suite');
    await user.click(screen.getByRole('button', { name: 'Calculer l’impact de cet échange uniquement' }));
    expect(document.querySelectorAll('.compact-impact')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Calculer l’impact de toute la conversation' }));
    await screen.findByRole('heading', { name: 'Bilan environnemental de la conversation' });
    const exchanges = document.querySelectorAll('.conversation-blocks .conversation-block');
    const lastExchange = exchanges[exchanges.length - 1];
    const actions = document.querySelector('.conversation-actions-after-thread')!;
    const summary = document.querySelector('.summary-panel')!;
    const reference = document.querySelector('.thread-reference')!;
    expect(lastExchange.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actions.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(summary.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Déplier l’échange 1' }));
    await user.type(screen.getAllByRole('textbox', { name: 'Votre message' })[0], ' modifiée');
    expect(screen.getByRole('region', { name: 'Échange 1' })).toHaveTextContent('Question initiale modifiée');
    expect(screen.getByRole('region', { name: 'Échange 2' })).toHaveTextContent('Suite');
    expect(screen.getAllByText(/Ce résultat est périmé/)).toHaveLength(2);
    expect(screen.getByText(/Le bilan précédent est périmé/)).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Bilan environnemental de la conversation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replier l’échange 1' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Recalculer cet échange' })).toHaveLength(2);
  });
});
