import type { ImportProvider, ResolvedShare } from './types';

const providersByResolvedShare = new WeakMap<object, ImportProvider>();

/** État privé du registre fermé, partagé sans créer de cycle avec la passerelle. */
export function attestResolvedShare(resolved: ResolvedShare, provider: ImportProvider): void {
  providersByResolvedShare.set(resolved, provider);
}

export function registeredProviderForResolvedShare(value: unknown): ImportProvider | undefined {
  return typeof value === 'object' && value !== null ? providersByResolvedShare.get(value) : undefined;
}
