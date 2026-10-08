import { screen, waitFor } from '@testing-library/react';
import { renderWithI18n as render } from '../test/renderWithI18n';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

async function startSelection(user: ReturnType<typeof userEvent.setup>) {
  const view = render(<App />);
  await user.click(screen.getByRole('button', { name: 'Commencer' }));
  return view;
}

describe('configuration de conversation', () => {
  it('affiche et résout le modèle estimé selon l’abonnement, la liste toujours visible', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    expect(screen.getByLabelText('Modèle estimé')).toHaveValue('gpt-4o-mini');
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'with-paid-subscription');
    expect(screen.getByLabelText('Modèle estimé')).toHaveValue('gpt-4o');
  });

  it('masque l’abonnement et limite les modèles pour un autre fournisseur', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.selectOptions(screen.getByLabelText('Chatbot'), 'Gemini');
    expect(screen.queryByLabelText('Abonnement')).not.toBeInTheDocument();
    const model = screen.getByLabelText('Modèle estimé');
    expect(model).toHaveValue('gemini-2.5-pro');
    expect(screen.queryByRole('option', { name: 'gpt-4o-mini' })).not.toBeInTheDocument();
    await user.selectOptions(model, 'gemini-2.5-flash');
    expect(model).toHaveValue('gemini-2.5-flash');
  });

  it('reste opérable au clavier avec un focus visible natif', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    screen.getByLabelText('Chatbot').focus();
    expect(screen.getByLabelText('Chatbot')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Chatbot')).toHaveFocus();
  });

  it('replie le Mode avancé sous le modèle et ne montre le Mode expert qu’à l’intérieur', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    const summary = screen.getByText('Mode avancé');
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(summary.querySelector('.chevron')).toBeInTheDocument();
    const expert = screen.getByText('Mode expert').closest('details')!;
    expect(details.contains(expert)).toBe(true);
    expect(expert).not.toHaveAttribute('open');
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(expert).not.toHaveAttribute('open');
    await user.click(screen.getByText('Mode expert'));
    const country = screen.getByLabelText('Où est hébergée l’IA (pays des serveurs)');
    expect(country).toHaveValue('US');
    await user.selectOptions(country, 'FR');
    expect(country).toHaveValue('FR');
    expect(screen.queryByRole('button', { name: 'Appliquer les paramètres' })).not.toBeInTheDocument();
  });

  it('présente le pays estimé (langue du navigateur) et le laisse corriger, distinct de l’hébergement', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    const country = screen.getByLabelText('Pays estimé : où vous vous trouvez');
    expect(country).toHaveValue('US');
    await user.selectOptions(country, 'ID');
    expect(country).toHaveValue('ID');
    expect(screen.getByLabelText('Où est hébergée l’IA (pays des serveurs)')).toHaveValue('US');
  });

  it('repart des valeurs initiales après un nouveau montage', async () => {
    const user = userEvent.setup();
    const first = await startSelection(user);
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'with-paid-subscription');
    first.unmount();
    await startSelection(user);
    expect(screen.getByText('gpt-4o-mini')).toBeVisible();
  });

  it('ne persiste pas les sélections dans le navigateur', async () => {
    const user = userEvent.setup();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const pushState = vi.spyOn(History.prototype, 'pushState');
    const replaceState = vi.spyOn(History.prototype, 'replaceState');
    await startSelection(user);

    await user.selectOptions(screen.getByLabelText('Abonnement'), 'with-paid-subscription');

    expect(storageWrite).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('expose les surcharges avec unités, bloque Continuer sur une valeur invalide et rétablit les références', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Mode avancé'));
    expect(screen.getByLabelText('Débit de votre douche (L/min)')).toHaveValue(15);
    expect(screen.getByLabelText('Puissance de l’ampoule LED de comparaison (W)')).toHaveValue(5);
    const pue = screen.getByLabelText('PUE (sans unité)');
    expect(screen.getByText('Mode expert').closest('details')).not.toHaveAttribute('open');
    await user.clear(pue);
    await user.type(pue, '0.9');
    const next = screen.getByRole('button', { name: 'Continuer' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).toHaveAccessibleDescription(/valeur du Mode avancé ou du Mode expert est invalide/);
    expect(pue).toHaveAttribute('aria-invalid', 'true');
    expect(pue.getAttribute('aria-describedby')).toContain('parameter-error-pue');
    await user.click(next);
    expect(screen.getByRole('heading', { name: 'Étape 1/3 : Votre IA' })).toBeVisible();
    expect(screen.getByText('Mode expert').closest('details')).toHaveAttribute('open');
    await waitFor(() => expect(pue).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    expect(screen.getByLabelText('PUE (sans unité)')).toHaveValue(1.14);
    expect(screen.getByRole('button', { name: 'Continuer' })).not.toHaveAttribute('aria-disabled');
  });

  it('ouvre le Mode avancé et le Mode expert et focalise la première erreur depuis des sections repliées', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    const pue = screen.getByLabelText('PUE (sans unité)');
    await user.clear(pue);
    await user.type(pue, '0.9');
    await user.click(screen.getByText('Mode expert'));
    await user.click(screen.getByText('Mode avancé'));
    expect(screen.getByText('Mode avancé').closest('details')).not.toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByText('Mode avancé').closest('details')).toHaveAttribute('open');
    expect(screen.getByText('Mode expert').closest('details')).toHaveAttribute('open');
    expect(pue).toHaveFocus();
  });

  it('refuse une valeur vide, même pour un paramètre dont zéro est autorisé', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    await user.clear(screen.getByLabelText('WUE (L/kWh)'));
    expect(screen.getByLabelText('WUE (L/kWh)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Continuer' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('refuse une puissance LED nulle', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Mode avancé'));
    const led = screen.getByLabelText('Puissance de l’ampoule LED de comparaison (W)');
    await user.clear(led);
    await user.type(led, '0');
    expect(led).toHaveAttribute('aria-invalid', 'true');
  });

  it('applique les valeurs valides par Continuer, sans calcul, et une seule annonce « à recalculer »', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Calculer' }));
    await screen.findByRole('heading', { name: 'Résultat' });
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByText('Mode avancé'));
    const flow = screen.getByLabelText('Débit de votre douche (L/min)');
    await user.clear(flow);
    await user.type(flow, '9');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('heading', { name: 'Étape 2/3 : Votre conversation' })).toBeVisible();
    expect(screen.getAllByText(/résultats? dépendants? (est|sont) à recalculer/)).toHaveLength(1);
    expect(screen.getByLabelText('Collez ici votre message')).toHaveValue('Bonjour');
  });

  it('applique une puissance LED modifiée par Continuer', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Mode avancé'));
    const led = screen.getByLabelText(/Puissance de l’ampoule LED/);
    await user.clear(led);
    await user.type(led, '9');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('heading', { name: 'Étape 2/3 : Votre conversation' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByText('Mode avancé'));
    expect(screen.getByLabelText(/Puissance de l’ampoule LED/)).toHaveValue(9);
  });

  it('conserve les textes, le chatbot et le modèle en rétablissant les valeurs par défaut', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.selectOptions(screen.getByLabelText('Abonnement'), 'with-paid-subscription');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Texte conservé');
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    const pue = screen.getByLabelText('PUE (sans unité)');
    await user.clear(pue);
    await user.type(pue, '1.3');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    expect(screen.getByLabelText('PUE (sans unité)')).toHaveValue(1.3);
    await user.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    expect(screen.getByLabelText('PUE (sans unité)')).toHaveValue(1.14);
    expect(screen.getByText('gpt-4o')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByLabelText('Collez ici votre message')).toHaveValue('Texte conservé');
  });

  it('signale le repli Monde près du champ sans changer le pays', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Mode avancé'));
    await user.selectOptions(screen.getByLabelText('Pays estimé : où vous vous trouvez'), 'ID');
    expect(screen.getByText(/Aucune donnée pour ce pays :/)).toBeInTheDocument();
    expect(screen.getByLabelText('Pays estimé : où vous vous trouvez')).toHaveValue('ID');
  });

  it('bloque les calculs tant qu’une saisie avancée invalide n’est pas corrigée', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByLabelText('Collez ici votre message'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByText('Mode avancé'));
    await user.click(screen.getByText('Mode expert'));
    await user.clear(screen.getByLabelText('PUE (sans unité)'));
    await user.type(screen.getByLabelText('PUE (sans unité)'), '0.9');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('heading', { name: 'Étape 1/3 : Votre IA' })).toBeVisible();
    expect(screen.getByLabelText('PUE (sans unité)')).toHaveAttribute('aria-invalid', 'true');
  });
});
