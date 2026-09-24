import { chatGptShareProvider } from './chatgptShare';
import { claudeShareProvider } from './claudeShare';
import { geminiShareProvider } from './geminiShare';
import { mistralShareProvider } from './mistralShare';
import type { ImportProvider, ImportProviderId, ResolvedShare } from './types';
import { attestResolvedShare, registeredProviderForResolvedShare } from './shareAttestation';

/** Catalogue fermé pour les futurs parcours de consentement et passerelle. */
export const allImportProviders: readonly ImportProvider[] = Object.freeze([
  chatGptShareProvider, claudeShareProvider, mistralShareProvider, geminiShareProvider,
]);

/** Seul Mistral est publié ; les autres adaptateurs restent disponibles isolément. */
export const importProviders: readonly ImportProvider[] = Object.freeze([mistralShareProvider]);
export const activeImportProviders = importProviders;

/** Résout localement, canonicalise et atteste la seule capacité consommable ensuite. */
export function resolveShare(value: string): ResolvedShare | undefined {
  for (const provider of importProviders) {
    const canonicalUrl = provider.canonicalizeUrl?.(value);
    if (!canonicalUrl) continue;
    const resolved = Object.freeze({ providerId: provider.id as ImportProviderId, canonicalUrl, limits: provider.limits!, policyVersion: provider.policyVersion! });
    attestResolvedShare(resolved, provider);
    return resolved;
  }
  return undefined;
}

/** Rejette les clones et les objets sérialisés : seule l'identité attestée compte. */
export function isResolvedShare(value: unknown): value is ResolvedShare {
  return registeredProviderForResolvedShare(value) !== undefined;
}

export function providerForResolvedShare(value: unknown): ImportProvider | undefined {
  return registeredProviderForResolvedShare(value);
}

export function importProviderById(id: string): ImportProvider | undefined {
  return importProviders.find((provider) => provider.id === id);
}
