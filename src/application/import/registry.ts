import { chatGptShareProvider } from './chatgptShare';
import type { ImportProvider } from './types';

/** Le catalogue V1 est figé : les autres fournisseurs ne sont pas sélectionnables. */
export const importProviders: readonly ImportProvider[] = Object.freeze([chatGptShareProvider]);

export function importProviderById(id: string): ImportProvider | undefined {
  return importProviders.find((provider) => provider.id === id);
}
