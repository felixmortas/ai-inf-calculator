import { fr, type Messages } from './fr';

export interface LanguageEntry {
  /** Code court (`fr`, `en`…), aussi utilisé pour `<html lang>` et `docs/methodology/<code>.md`. */
  readonly code: string;
  /** Autonyme : nom de la langue dans cette langue. */
  readonly label: string;
  /** Locale BCP 47 pour `Intl` (nombres, noms de pays). */
  readonly intlLocale: string;
  readonly messages: Messages;
}

export const defaultLanguage = 'fr';

/** Registre unique : ajouter une langue = créer `<code>.ts` et ajouter une ligne ici. */
export const languages: readonly LanguageEntry[] = [
  { code: 'fr', label: 'Français', intlLocale: 'fr-FR', messages: fr },
];

/** Première langue du navigateur présente au registre (région ignorée), sinon le français. */
export function detectLanguage(navigatorLanguages: readonly string[], registry: readonly LanguageEntry[] = languages): string {
  for (const tag of navigatorLanguages) {
    const normalized = tag.toLowerCase().replace(/_/g, '-');
    const primary = normalized.split('-')[0];
    const match = registry.find((entry) => entry.code.toLowerCase() === normalized) ?? registry.find((entry) => entry.code.toLowerCase() === primary);
    if (match) return match.code;
  }
  return defaultLanguage;
}

export function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
}
