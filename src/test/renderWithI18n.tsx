import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { I18nProvider } from '../i18n/I18nProvider';

const testNavigatorLanguages = ['fr-FR'];

function FrenchI18nProvider({ children }: { readonly children: ReactNode }) {
  return <I18nProvider navigatorLanguages={testNavigatorLanguages}>{children}</I18nProvider>;
}

/** `render` de Testing Library, avec le provider de langue fixé sur le français, quelle que soit la langue du navigateur de test. */
export function renderWithI18n(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: FrenchI18nProvider, ...options });
}
