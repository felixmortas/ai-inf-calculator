import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fr, type Messages } from './fr';
import { browserLanguages, defaultLanguage, detectLanguage, languages as registry, type LanguageEntry } from './languages';

export interface I18nValue {
  readonly language: string;
  readonly messages: Messages;
  /** Locale `Intl` de la langue courante. */
  readonly locale: string;
  readonly languages: readonly LanguageEntry[];
  readonly setLanguage: (code: string) => void;
}

const fallbackValue: I18nValue = { language: defaultLanguage, messages: fr, locale: 'fr-FR', languages: registry, setLanguage: () => undefined };
const I18nContext = createContext<I18nValue>(fallbackValue);

/** Langue en mémoire de session uniquement : rien n’est stocké. */
export function I18nProvider({ children, languages = registry, navigatorLanguages }: {
  readonly children: ReactNode;
  readonly languages?: readonly LanguageEntry[];
  readonly navigatorLanguages?: readonly string[];
}) {
  const [code, setCode] = useState(() => detectLanguage(navigatorLanguages ?? browserLanguages(), languages));
  const entry = languages.find((candidate) => candidate.code === code) ?? languages.find((candidate) => candidate.code === defaultLanguage) ?? languages[0];
  useEffect(() => {
    document.documentElement.lang = entry.code;
    document.title = entry.messages.pageTitle;
  }, [entry]);
  const value = useMemo<I18nValue>(() => ({
    language: entry.code,
    messages: entry.messages,
    locale: entry.intlLocale,
    languages,
    setLanguage: (next) => { if (languages.some((candidate) => candidate.code === next)) setCode(next); },
  }), [entry, languages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
