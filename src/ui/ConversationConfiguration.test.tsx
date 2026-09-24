import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

async function startSelection(user: ReturnType<typeof userEvent.setup>) {
  const view = render(<App />);
  await user.click(screen.getByRole('button', { name: 'Saisir un échange' }));
  return view;
}

describe('configuration de conversation', () => {
  it('affiche et résout le modèle ChatGPT selon l’abonnement', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    expect(screen.getByText('gpt-5.6-luna')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'with-paid-subscription');
    expect(screen.getByText('gpt-5.6-terra')).toBeVisible();
  });

  it('masque l’abonnement et limite les modèles pour un autre fournisseur', async () => {
    const user = userEvent.setup();
    await startSelection(user);
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
    await startSelection(user);
    screen.getByLabelText('Chatbot').focus();
    expect(screen.getByLabelText('Chatbot')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText('Chatbot')).toHaveFocus();
  });

  it('permet de choisir au clavier le pays d’hébergement dans les paramètres avancés', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    const summary = screen.getByText('Paramètres avancés');
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(summary.querySelector('.chevron')).toBeInTheDocument();
    await user.click(summary);
    expect(details).toHaveAttribute('open');
    expect(details.querySelector('summary')).toHaveAttribute('aria-expanded', 'true');
    const country = screen.getByLabelText('Pays d’hébergement');
    expect(country).toHaveValue('US');
    await user.selectOptions(country, 'FR');
    expect(country).toHaveValue('FR');
  });

  it('propose un pays utilisateur indicatif et corrigeable, distinct de l’hébergement', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Paramètres avancés'));
    const country = screen.getByLabelText('Pays de la personne');
    expect(screen.getByText(/Proposition indicative/)).toBeVisible();
    await user.selectOptions(country, 'ID');
    expect(country).toHaveValue('ID');
    expect(screen.getByLabelText('Pays d’hébergement')).toHaveValue('US');
  });

  it('repart des valeurs initiales après un nouveau montage', async () => {
    const user = userEvent.setup();
    const first = await startSelection(user);
    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'with-paid-subscription');
    first.unmount();
    await startSelection(user);
    expect(screen.getByText('gpt-5.6-luna')).toBeVisible();
  });

  it('ne persiste pas les sélections dans le navigateur', async () => {
    const user = userEvent.setup();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const pushState = vi.spyOn(History.prototype, 'pushState');
    const replaceState = vi.spyOn(History.prototype, 'replaceState');
    await startSelection(user);

    await user.selectOptions(screen.getByLabelText('Abonnement ChatGPT'), 'with-paid-subscription');

    expect(storageWrite).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('expose les surcharges avec unités, refuse une valeur invalide et restaure les références', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Paramètres avancés'));
    expect(screen.getByLabelText('Paramètres totaux (milliards)')).toHaveValue(100);
    expect(screen.getByLabelText('Débit de douche (L/min)')).toHaveValue(15);
    await user.clear(screen.getByLabelText('PUE (ratio)'));
    await user.type(screen.getByLabelText('PUE (ratio)'), '0.9');
    await user.click(screen.getByRole('button', { name: 'Appliquer les paramètres' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valeur est invalide');
    expect(screen.getByLabelText('PUE (ratio)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('PUE (ratio)')).toHaveAttribute('aria-describedby', 'parameter-error parameter-error-pue');
    await waitFor(() => expect(screen.getByLabelText('PUE (ratio)')).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    expect(screen.getByLabelText('PUE (ratio)')).toHaveValue(1.15);
  });

  it('refuse une valeur vide, même pour un paramètre dont zéro est autorisé', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByText('Paramètres avancés'));
    await user.clear(screen.getByLabelText('WUE (L/kWh)'));
    await user.click(screen.getByRole('button', { name: 'Appliquer les paramètres' }));
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('WUE (L/kWh)')).toHaveAttribute('aria-invalid', 'true');
  });

  it('bloque les calculs tant qu’une saisie avancée invalide n’est pas corrigée', async () => {
    const user = userEvent.setup();
    await startSelection(user);
    await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter un échange' }));
    await user.type(screen.getByLabelText('Question de la personne'), 'Bonjour');
    await user.click(screen.getByRole('button', { name: 'Modifier le chatbot ou le modèle' }));
    await user.click(screen.getByText('Paramètres avancés'));
    await user.clear(screen.getByLabelText('PUE (ratio)'));
    await user.type(screen.getByLabelText('PUE (ratio)'), '0.9');
    await user.click(screen.getByRole('button', { name: 'Appliquer les paramètres' }));

    expect(screen.getByRole('alert')).toHaveTextContent('valeur est invalide');
    await user.click(screen.getByRole('button', { name: 'Continuer vers le fil' }));
    expect(screen.getByRole('button', { name: 'Calculer cet échange' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Calculer toute la conversation' })).toBeDisabled();
  });
});
