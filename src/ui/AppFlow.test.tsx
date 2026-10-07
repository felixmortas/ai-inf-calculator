import { act, render, screen } from '@testing-library/react';
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
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 1200, behavior: 'auto' });
    scrollTo.mockRestore();
    if (heightDescriptor) Object.defineProperty(document.documentElement, 'scrollHeight', heightDescriptor);
    if (viewportDescriptor) Object.defineProperty(window, 'innerHeight', viewportDescriptor);
  });

  it('propose un accueil minimal puis place le focus sur chaque étape', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Méthodologie', 'Commencer']);
    expect(screen.getByText(/Estimez en quelques clics/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.getByRole('heading', { name: 'Étape 1/3 : Votre IA' })).toHaveFocus();
    expect(screen.queryByText(/Estimez en quelques clics/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('heading', { name: 'Étape 2/3 : Votre conversation' })).toHaveFocus();
    expect(screen.getByText(/Modèle sélectionné : ChatGPT — gpt-4o-mini/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
    expect(screen.getByText('Modèle estimé :')).toBeVisible();
    expect(screen.getByText('gpt-4o-mini')).toBeVisible();
  });

  it('revient à l’étape 1 sans perdre les textes et ouvre la méthodologie depuis chaque écran', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByRole('textbox', { name: 'Votre message' }), 'Mon texte');
    await user.click(screen.getByRole('button', { name: 'Méthodologie' }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Méthodologie d’estimation' })).toBeVisible();
    expect(screen.getAllByRole('heading', { name: 'Méthodologie d’estimation' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('textbox', { name: 'Votre message' })).toHaveValue('Mon texte');
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('heading', { name: 'Étape 1/3 : Votre IA' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('region', { name: 'Échange 1' })).toHaveTextContent('Mon texte');
    expect(screen.queryByRole('button', { name: '?' })).not.toBeInTheDocument();
  });

  it('propose les références Mistral et permet un autre modèle du chatbot', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.selectOptions(screen.getByLabelText('Chatbot'), 'Mistral AI');
    expect(screen.queryByLabelText('Modèle')).not.toBeInTheDocument();
    expect(screen.getByText('mistral-medium-3.1')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Mode'), 'reasoning');
    await user.click(screen.getByRole('button', { name: 'Modifier le modèle' }));
    await user.selectOptions(screen.getByLabelText('Modèle'), 'mistral-medium-3.1');
    expect(screen.getByLabelText('Modèle')).toHaveValue('mistral-medium-3.1');
  });

  it('laisse corriger directement la référence ChatGPT proposée', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Modifier le modèle' }));
    await user.selectOptions(screen.getByLabelText('Modèle'), 'gpt-4o');
    expect(screen.getByLabelText('Modèle')).toHaveValue('gpt-4o');
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'with-paid-subscription');
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'without-paid-subscription');
    expect(screen.getByLabelText('Modèle')).toHaveValue('gpt-4o-mini');
  });

  it('revient au fil vide après consultation de la référence', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.queryByLabelText('Votre message')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' })).toHaveFocus();
  });

});

describe('fil et estimations', () => {
  async function openThread(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
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

describe('barre d’action et clavier logiciel', () => {
  it('bascule la classe keyboard-open selon la hauteur du viewport et la nettoie au démontage', () => {
    const viewport = Object.assign(new EventTarget(), { height: 800, scale: 1 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const { unmount } = render(<App />);
    const root = document.documentElement;
    expect(root).not.toHaveClass('keyboard-open');
    viewport.height = 300;
    act(() => { viewport.dispatchEvent(new Event('resize')); });
    expect(root).toHaveClass('keyboard-open');
    viewport.height = 800;
    act(() => { viewport.dispatchEvent(new Event('resize')); });
    expect(root).not.toHaveClass('keyboard-open');
    viewport.height = 300;
    act(() => { viewport.dispatchEvent(new Event('resize')); });
    unmount();
    expect(root).not.toHaveClass('keyboard-open');
    Reflect.deleteProperty(window, 'visualViewport');
  });
});
