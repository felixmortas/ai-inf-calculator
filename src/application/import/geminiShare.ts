import type { ImportLimits, ImportProvider, ImportResult, NormalizedImportEvent, RedirectPolicy } from './types';
import { asRecord, boundedText, errorResult, hasNonText, hasValidExtractionLimits, jsonScript, successResult } from './providerSupport';
import { importResolvedProviderShare } from './resolvedShareImport';
import type { RemoteGatewayConsent } from './remoteGateway';
import type { ResolvedShare } from './types';

export const GEMINI_SHARE_LIMITS: ImportLimits = Object.freeze({ maxUrlLength: 2_048, timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxEvents: 1_000, maxRedirects: 1 });
/** La redirection éventuelle est suivie par le Worker, hors du navigateur. */
export const GEMINI_REDIRECT_POLICY: RedirectPolicy = Object.freeze({ maxRedirects: 1, allowedOrigins: Object.freeze(['https://share.gemini.google', 'https://gemini.google.com']) });
export function validateGeminiShareUrl(value: string): string | undefined {
  if (value.length > GEMINI_SHARE_LIMITS.maxUrlLength || !/^https:\/\/share\.gemini\.google\/[A-Za-z0-9]{12}$/.test(value)) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'share.gemini.google' && !url.port && !url.username && !url.password && !url.search && !url.hash ? value : undefined; } catch { return undefined; }
}
export function extractGeminiShareEvents(html: string, limits: Pick<ImportLimits, 'maxEvents' | 'maxBytes'> = GEMINI_SHARE_LIMITS): ImportResult {
  if (!hasValidExtractionLimits(limits)) return errorResult('gemini', 'configuration', 'Les limites d’extraction sont invalides.');
  if (new TextEncoder().encode(html).byteLength > limits.maxBytes) return errorResult('gemini', 'response-too-large', 'La réponse dépasse la taille autorisée.');
  const state = asRecord(jsonScript(html, 'data-gemini-share')); const turns = Array.isArray(state?.turns) ? state.turns : undefined;
  if (!turns) return errorResult('gemini', 'format-unknown', 'La structure publique Gemini est inconnue.');
  const events: NormalizedImportEvent[] = [];
  for (const turn of turns) { const item = asRecord(turn); const rawRole = item?.role; const role = rawRole === 'model' ? 'assistant' : rawRole; if (role !== 'user' && role !== 'assistant') continue; const text = boundedText(item?.content ?? item?.text); if (text) events.push(Object.freeze({ ...(typeof item?.id === 'string' ? { id: item.id } : {}), role, text, order: events.length + 1 })); if (hasNonText(item)) events.push(Object.freeze({ type: 'inaccessible-content' as const, role: 'inaccessible-content', text: '', contentType: 'non-text' as const, label: 'Contenu Gemini non textuel', order: events.length + 1 })); if (events.length > limits.maxEvents) return errorResult('gemini', 'too-many-events', `La page contient plus de ${limits.maxEvents} événements.`); }
  return events.some((event) => event.role === 'user' || event.role === 'assistant') ? successResult('gemini', events) : errorResult('gemini', 'format-unknown', 'Aucun tour textuel public Gemini reconnu.');
}
export const geminiShareProvider: ImportProvider = Object.freeze({ id: 'gemini', label: 'Gemini', limits: GEMINI_SHARE_LIMITS, policyVersion: 'gemini-v1', redirectPolicy: GEMINI_REDIRECT_POLICY, canonicalizeUrl: validateGeminiShareUrl, extract: extractGeminiShareEvents, validateUrl: (value: string) => validateGeminiShareUrl(value) ? undefined : errorResult('gemini', 'invalid-url', 'URL de partage Gemini invalide.'), importFromUrl: async () => errorResult('gemini', 'policy', 'La récupération distante Gemini exige une capacité attestée.'), importResolvedShare: (resolved: ResolvedShare, consent?: unknown) => importResolvedProviderShare(resolved, consent as RemoteGatewayConsent | undefined, geminiShareProvider) });
