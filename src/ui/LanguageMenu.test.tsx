import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { fr } from '../i18n/fr';
import { I18nProvider } from '../i18n/I18nProvider';
import { languages, type LanguageEntry } from '../i18n/languages';
import { formatQuantity } from './quantityFormatter';
import { App } from './App';

const yy: LanguageEntry = {
  code: 'yy', label: 'Yyyy', intlLocale: 'en-US',
  messages: { ...fr, startAction: 'Start-yy', methodologyAction: 'Method-yy', methodologyTitle: 'Method title yy', threadTitle: 'Step 2-yy', pageTitle: 'Title yy', worldCountry: 'World-yy' },
};
const frenchOnly = languages.filter((entry) => entry.code === 'fr');
const registry = [...frenchOnly, yy];

function renderApp(navigatorLanguages: readonly string[] = ['fr-FR']) {
  return render(<I18nProvider languages={registry} navigatorLanguages={navigatorLanguages}><App /></I18nProvider>);
}
const languageButton = () => screen.getByRole('button', { name: /^Langue/ });

afterEach(() => { document.documentElement.lang = 'fr'; });

describe('langue initiale', () => {
  it('utilise la première langue du navigateur supportée', () => {
    renderApp(['xx-YY', 'yy-ZZ']);
    expect(screen.getByRole('button', { name: 'Start-yy' })).toBeVisible();
    expect(document.documentElement.lang).toBe('yy');
    expect(document.title).toBe('Title yy');
  });

  it('se replie sur le français', () => {
    renderApp(['xx-YY']);
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeVisible();
    expect(document.documentElement.lang).toBe('fr');
  });
});

describe('menu de langue', () => {
  it('affiche la langue courante, sans changer l’ordre des deux boutons existants', () => {
    renderApp();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Commencer', 'Méthodologie', '🌐 Français']);
    expect(languageButton()).toHaveAttribute('aria-haspopup', 'menu');
    expect(languageButton()).toHaveAttribute('aria-expanded', 'false');
    expect(languageButton()).toHaveAccessibleName('Langue : Français');
  });

  it('s’ouvre au clavier, navigue aux flèches et choisit une langue en rendant le focus au bouton', async () => {
    const user = userEvent.setup();
    renderApp();
    languageButton().focus();
    await user.keyboard('{Enter}');
    expect(languageButton()).toHaveAttribute('aria-expanded', 'true');
    const items = screen.getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent)).toEqual(['Français', 'Yyyy']);
    expect(items[0]).toHaveAttribute('aria-checked', 'true');
    expect(items[1]).toHaveAttribute('aria-checked', 'false');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(items[0]).toHaveFocus();
    await user.keyboard('{ArrowUp}{Enter}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(languageButton()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Start-yy' })).toBeVisible();
    expect(languageButton()).toHaveAccessibleName('Langue : Yyyy');
    expect(document.documentElement.lang).toBe('yy');
  });

  it('s’ouvre avec Espace et à la souris', async () => {
    const user = userEvent.setup();
    renderApp();
    languageButton().focus();
    await user.keyboard(' ');
    expect(screen.getByRole('menu')).toBeVisible();
    await user.keyboard('{Escape}');
    await user.click(languageButton());
    expect(screen.getByRole('menu')).toBeVisible();
    await user.click(screen.getByRole('menuitemradio', { name: 'Yyyy' }));
    expect(screen.getByRole('button', { name: 'Start-yy' })).toBeVisible();
  });

  it('Échap ferme sans changer de langue et rend le focus au bouton', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(languageButton());
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(languageButton()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeVisible();
    expect(document.documentElement.lang).toBe('fr');
  });

  it('un clic extérieur ferme le menu sans changer de langue', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(languageButton());
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeVisible();
  });

  it('fonctionne avec une seule langue au registre', async () => {
    const user = userEvent.setup();
    render(<I18nProvider languages={frenchOnly} navigatorLanguages={['en']}><App /></I18nProvider>);
    await user.click(languageButton());
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(1);
  });

  it('n’apparaît que sur l’accueil', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.queryByRole('button', { name: /^Langue/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.queryByRole('button', { name: /^Langue/ })).not.toBeInTheDocument();
  });

  it('conserve les saisies et traduit les étapes suivantes', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Commencer' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    await user.click(screen.getByRole('button', { name: '+ Ajouter une question / réponse' }));
    await user.type(screen.getByRole('textbox', { name: 'Collez ici votre message' }), 'Mon texte');
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    await user.click(screen.getByRole('button', { name: 'Retour' }));
    await user.click(languageButton());
    await user.click(screen.getByRole('menuitemradio', { name: 'Yyyy' }));
    await user.click(screen.getByRole('button', { name: 'Start-yy' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByRole('heading', { name: 'Step 2-yy' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Question / réponse 1' })).toHaveTextContent('Mon texte');
  });

  it('affiche la méthodologie française quand la langue n’en a pas', async () => {
    const user = userEvent.setup();
    renderApp(['yy']);
    await user.click(screen.getByRole('button', { name: 'Method-yy' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Method title yy' })).toBeVisible();
    expect(document.querySelector('.methodology-content')?.textContent?.length).toBeGreaterThan(500);
  });

  it('formate les pays et les nombres selon la locale de la langue', async () => {
    const user = userEvent.setup();
    renderApp(['yy']);
    await user.click(screen.getByRole('button', { name: 'Start-yy' }));
    await user.click(screen.getByText(fr.advancedSettingsTitle));
    const select = screen.getByLabelText(fr.userCountryLabel);
    expect(within(select).getByRole('option', { name: 'United States (US)' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'World-yy (WORLD)' })).toBeInTheDocument();
    expect(formatQuantity(0.0012, 'water', yy.messages, yy.intlLocale).display).toBe('1.2 mL');
    expect(formatQuantity(0.0012, 'water', fr, 'fr-FR').display).toBe('1,2 mL');
  });
});
