import { chatGptShareProvider } from './chatgptShare';
import { claudeShareProvider } from './claudeShare';
import { geminiShareProvider } from './geminiShare';
import { mistralShareProvider } from './mistralShare';
import type { ImportProvider, ImportProviderId, ResolvedShare } from './types';

/** Catalogue fermé pour les futurs parcours de consentement et passerelle. */
export const allImportProviders: readonly ImportProvider[] = Object.freeze([
  chatGptShareProvider, claudeShareProvider, mistralShareProvider, geminiShareProvider,
]);

/** Le parcours de consentement résout localement les quatre adaptateurs publiés. */
export const importProviders: readonly ImportProvider[] = allImportProviders;
export const activeImportProviders = importProviders;

const attestations = new WeakSet<object>();

/** Résout localement, canonicalise et atteste la seule capacité consommable ensuite. */
export function resolveShare(value: string): ResolvedShare | undefined {
  for (const provider of allImportProviders) {
    const canonicalUrl = provider.canonicalizeUrl?.(value);
    if (!canonicalUrl) continue;
    const resolved = Object.freeze({ providerId: provider.id as ImportProviderId, canonicalUrl, limits: provider.limits!, policyVersion: provider.policyVersion! });
    attestations.add(resolved);
    return resolved;
  }
  return undefined;
}

/** Rejette les clones et les objets sérialisés : seule l'identité attestée compte. */
export function isResolvedShare(value: unknown): value is ResolvedShare {
  return typeof value === 'object' && value !== null && attestations.has(value);
}

export function providerForResolvedShare(value: unknown): ImportProvider | undefined {
  return isResolvedShare(value) ? allImportProviders.find((provider) => provider.id === value.providerId) : undefined;
}

export function importProviderById(id: string): ImportProvider | undefined {
  return importProviders.find((provider) => provider.id === id);
}
