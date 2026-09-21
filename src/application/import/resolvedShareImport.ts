import { remoteGateway, type RemoteGateway, type RemoteGatewayConsent } from './remoteGateway';
import type { ImportProvider, ImportResult, ResolvedShare } from './types';

function failure(providerId: string, code: 'configuration' | 'invalid-url', message: string): ImportResult {
  return Object.freeze({ ok: false as const, providerId, events: Object.freeze([]) as readonly [], error: Object.freeze({ code, message }) });
}

/** Enchaîne exclusivement une capacité attestée, la passerelle et l'extracteur local associé. */
export async function importResolvedProviderShare(
  resolved: ResolvedShare,
  consent: RemoteGatewayConsent | undefined,
  provider: ImportProvider,
  gateway: RemoteGateway = remoteGateway,
): Promise<ImportResult> {
  if (resolved.providerId !== provider.id) return failure(provider.id, 'invalid-url', 'Ce partage ne correspond pas au fournisseur sélectionné.');
  if (!provider.extract || !provider.limits) return failure(provider.id, 'configuration', 'L’extracteur local du fournisseur est indisponible.');
  const fetched = await gateway.fetchHtml(resolved, consent);
  if (!fetched.ok) return Object.freeze({ ok: false as const, providerId: provider.id, events: Object.freeze([]) as readonly [], error: fetched.error });
  return provider.extract(fetched.html, provider.limits);
}
