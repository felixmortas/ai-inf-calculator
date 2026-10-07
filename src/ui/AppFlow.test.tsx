import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
    expect(screen.getByLabelText('Modèle estimé')).toHaveValue('gpt-4o-mini');
  });

  it('revient à l’étape 1 sans perdre les textes et ouvre la méthodologie depuis chaque écran', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByRole('textbox', { name: 'Collez ici votre message' }), 'Mon texte');
    await user.click(screen.getByRole('button', { name: 'Méthodologie' }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Méthodologie d’estimation' })).toBeVisible();
    expect(screen.getAllByRole('heading', { name: 'Méthodologie d’estimation' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('textbox', { name: 'Collez ici votre message' })).toHaveValue('Mon texte');
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('heading', { name: 'Étape 1/3 : Votre IA' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('Mon texte');
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
    await user.selectOptions(screen.getByLabelText('Modèle estimé'), 'mistral-medium-3.1');
    expect(screen.getByLabelText('Modèle estimé')).toHaveValue('mistral-medium-3.1');
  });

  it('laisse corriger directement la référence ChatGPT proposée', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.selectOptions(screen.getByLabelText('Modèle estimé'), 'gpt-4o');
    expect(screen.getByLabelText('Modèle estimé')).toHaveValue('gpt-4o');
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'with-paid-subscription');
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'without-paid-subscription');
    expect(screen.getByLabelText('Modèle estimé')).toHaveValue('gpt-4o-mini');
  });

  it('revient au fil vide après consultation de la référence', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.queryByLabelText('Collez ici votre message')).not.toBeInTheDocument();
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

  it('calcule les seuls échanges renseignés en un clic depuis la barre collante', async () => {
    const user = userEvent.setup();
    await openThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByRole('textbox', { name: 'Collez ici votre message' }), 'Première question');
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByRole('textbox', { name: 'Collez ici la réponse de l’IA' }), 'Seconde réponse');
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('Première question');
    expect(screen.getByRole('button', { name: 'Déplier la question / réponse 1' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Calculer' }).closest('.sticky-actions')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    expect(await screen.findByRole('heading', { name: 'Résultat' })).toBeVisible();
    expect(document.querySelectorAll('.compact-impact')).toHaveLength(2);
    const ledRow = screen.getByText(/Ampoule LED allumée/).closest('li');
    expect(ledRow).not.toBeNull();
    expect(ledRow).not.toHaveTextContent(/À recalculer|non calculable/);
    expect(ledRow).toHaveTextContent(/\d/);
    expect(screen.getByRole('region', { name: 'Question / réponse 3' })).not.toHaveTextContent(/Vide|À calculer/);
    expect(screen.queryByRole('button', { name: /Calculer cet échange|Recalculer/ })).not.toBeInTheDocument();
  });

  it('annonce la péremption après édition sans remplacer les textes ni recalculer', async () => {
    const user = userEvent.setup();
    await openThread(user);
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByRole('textbox', { name: 'Collez ici votre message' }), 'Question initiale');
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByRole('textbox', { name: 'Collez ici votre message' }), 'Suite');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByRole('heading', { name: 'Résultat' });
    expect(document.querySelectorAll('.compact-impact')).toHaveLength(2);
    const exchanges = document.querySelectorAll('.conversation-blocks .conversation-block');
    const lastExchange = exchanges[exchanges.length - 1];
    const actions = document.querySelector('.conversation-actions-after-thread')!;
    const summary = document.querySelector('.result-section')!;
    const reference = document.querySelector('.thread-reference')!;
    expect(lastExchange.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actions.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(summary.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Déplier la question / réponse 1' }));
    await user.type(screen.getAllByRole('textbox', { name: 'Collez ici votre message' })[0], ' modifiée');
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('Question initiale modifiée');
    expect(screen.getByRole('region', { name: 'Question / réponse 2' })).toHaveTextContent('Suite');
    expect(document.querySelectorAll('.exchange-status.impact-stale')).toHaveLength(2);
    expect(screen.getAllByText(/à recalculer\./)).toHaveLength(1);
    expect(screen.getByText(/2 résultats dépendants sont à recalculer/)).toHaveAttribute('role', 'status');
    expect(screen.getByRole('heading', { name: 'Résultat' })).toBeVisible();
    expect(screen.getByText(/Le résultat est à recalculer/)).toBeVisible();
    expect(document.querySelector('.metric-hero')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.compact-impact')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Replier la question / réponse 1' })).toBeVisible();
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

describe('partage du résultat', () => {
  async function calculate(user: ReturnType<typeof userEvent.setup>) {
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.queryByRole('button', { name: 'Partager' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByRole('textbox', { name: 'Collez ici votre message' }), 'SECRET-MSG');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByRole('heading', { name: 'Résultat' });
    await screen.findByRole('button', { name: 'Partager' });
  }
  const navShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  const navClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  afterEach(() => {
    for (const [key, descriptor] of [['share', navShare], ['clipboard', navClipboard]] as const) {
      if (descriptor) Object.defineProperty(navigator, key, descriptor); else delete (navigator as unknown as Record<string, unknown>)[key];
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  function setNav(share: unknown, writeText: unknown) {
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined });
  }

  it('place Partager après le lien, partage sans contenu, sans réseau ni stockage', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const share = vi.fn().mockResolvedValue(undefined);
    await calculate(user);
    setNav(share, undefined);
    expect(share).not.toHaveBeenCalled();
    const button = screen.getByRole('button', { name: 'Partager' });
    const link = document.querySelector('.result-link')!;
    expect(link.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelectorAll('.share-button')).toHaveLength(1);
    await user.click(button);
    expect(share).toHaveBeenCalledTimes(1);
    const text = share.mock.calls[0][0].text as string;
    expect(text).toContain('Ma conversation avec ChatGPT (1 échange)');
    expect(text).toContain('Toi aussi, estime l’impact environnemental');
    expect(text).not.toContain('SECRET');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    vi.unstubAllGlobals();
  });

  it('copie en repli, alerte le navigateur, puis retire le bouton quand le résultat est périmé', async () => {
    const user = userEvent.setup();
    await calculate(user);
    const writeText = vi.fn().mockResolvedValue(undefined);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    setNav(undefined, writeText);
    await user.click(screen.getByRole('button', { name: 'Partager' }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith('Résultat copié dans le presse-papiers.');
    expect(screen.queryByText('Résultat copié.')).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Collez ici votre message' }), ' plus');
    expect(screen.queryByRole('button', { name: 'Partager' })).not.toBeInTheDocument();
    expect(screen.queryByText('Résultat copié.')).not.toBeInTheDocument();
  });

  it('ignore l’annulation et propose la copie manuelle si tout échoue', async () => {
    const user = userEvent.setup();
    await calculate(user);
    setNav(vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')), undefined);
    await user.click(screen.getByRole('button', { name: 'Partager' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Résultat copié.')).not.toBeInTheDocument();
    setNav(undefined, undefined);
    await user.click(screen.getByRole('button', { name: 'Partager' }));
    expect(await screen.findByRole('alert')).toBeVisible();
    const area = screen.getByRole('textbox', { name: 'Copiez ce texte à la main.' });
    expect(area).toHaveAttribute('readonly');
    expect((area as HTMLTextAreaElement).value).not.toContain('SECRET');
    expect(area).toHaveFocus();
  });

  it('rend Partager atteignable au clavier, dans la seule section Résultat', async () => {
    const user = userEvent.setup();
    await calculate(user);
    const button = screen.getByRole('button', { name: 'Partager' });
    expect(button.closest('.result-section')).not.toBeNull();
    expect(screen.getAllByRole('button', { name: /Partager/ })).toHaveLength(1);
    const link = document.querySelector<HTMLElement>('.result-link')!;
    link.focus();
    await user.tab();
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName('Partager');
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
