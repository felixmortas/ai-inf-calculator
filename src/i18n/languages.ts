import { fr, type Messages } from './fr';
import { en } from './en';
import { es } from './es';
import { it } from './it';
import { pt } from './pt';
import { de } from './de';
import { nl } from './nl';
import { ko } from './ko';
import { zh } from './zh';
import { ja } from './ja';
import { ar } from './ar';

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
  { code: 'en', label: 'English', intlLocale: 'en-US', messages: en },
  { code: 'es', label: 'Español', intlLocale: 'es-ES', messages: es },
  { code: 'de', label: 'Deutsch', intlLocale: 'de-DE', messages: de },
  { code: 'it', label: 'Italiano', intlLocale: 'it-IT', messages: it },
  { code: 'nl', label: 'Nederlands', intlLocale: 'nl-NL', messages: nl },
  { code: 'pt', label: 'Português', intlLocale: 'pt-PT', messages: pt },
  { code: 'ko', label: '한국어', intlLocale: 'ko-KR', messages: ko },
  { code: 'zh', label: '简体中文', intlLocale: 'zh-CN', messages: zh },
  { code: 'ja', label: '日本語', intlLocale: 'ja-JP', messages: ja },
  { code: 'ar', label: 'العربية', intlLocale: 'ar-SA', messages: ar },
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
