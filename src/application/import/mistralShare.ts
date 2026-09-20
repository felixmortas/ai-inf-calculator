import type { ImportLimits, ImportProvider, ImportResult, NormalizedImportEvent, RedirectPolicy } from './types';
import { asRecord, boundedText, errorResult, hasNonText, hasValidExtractionLimits, jsonScript, successResult } from './providerSupport';

export const MISTRAL_SHARE_LIMITS: ImportLimits = Object.freeze({ maxUrlLength: 2_048, timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxEvents: 1_000, maxRedirects: 0 });
export const MISTRAL_REDIRECT_POLICY: RedirectPolicy = Object.freeze({ maxRedirects: 0, allowedOrigins: Object.freeze(['https://chat.mistral.ai']) });
export function validateMistralShareUrl(value: string): string | undefined {
  if (value.length > MISTRAL_SHARE_LIMITS.maxUrlLength || !/^https:\/\/chat\.mistral\.ai\/chat\/[^/?#]+$/.test(value)) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'chat.mistral.ai' && !url.port && !url.username && !url.password && !url.search && !url.hash ? value : undefined; } catch { return undefined; }
}
export function extractMistralShareEvents(html: string, limits: Pick<ImportLimits, 'maxEvents' | 'maxBytes'> = MISTRAL_SHARE_LIMITS): ImportResult {
  if (!hasValidExtractionLimits(limits)) return errorResult('mistral', 'configuration', 'Les limites d’extraction sont invalides.');
  if (new TextEncoder().encode(html).byteLength > limits.maxBytes) return errorResult('mistral', 'response-too-large', 'La réponse dépasse la taille autorisée.');
  const state = asRecord(jsonScript(html, 'data-mistral-share')); const messages = Array.isArray(state?.messages) ? state.messages : undefined;
  if (!messages) return errorResult('mistral', 'format-unknown', 'La structure publique Mistral est inconnue.');
  const events: NormalizedImportEvent[] = [];
  for (const message of messages) { const item = asRecord(message); const role = item?.role; if (role !== 'user' && role !== 'assistant') continue; const text = boundedText(item?.content ?? item?.text); if (text) events.push(Object.freeze({ ...(typeof item?.id === 'string' ? { id: item.id } : {}), role, text, order: events.length + 1 })); if (hasNonText(item)) events.push(Object.freeze({ type: 'inaccessible-content' as const, role: 'inaccessible-content', text: '', contentType: 'attachment' as const, label: 'Contenu Mistral non textuel', order: events.length + 1 })); if (events.length > limits.maxEvents) return errorResult('mistral', 'too-many-events', `La page contient plus de ${limits.maxEvents} événements.`); }
  return events.some((event) => event.role === 'user' || event.role === 'assistant') ? successResult('mistral', events) : errorResult('mistral', 'format-unknown', 'Aucun message textuel public Mistral reconnu.');
}
export const mistralShareProvider: ImportProvider = Object.freeze({ id: 'mistral', label: 'Mistral', limits: MISTRAL_SHARE_LIMITS, policyVersion: 'mistral-v1', redirectPolicy: MISTRAL_REDIRECT_POLICY, canonicalizeUrl: validateMistralShareUrl, extract: extractMistralShareEvents, validateUrl: (value: string) => validateMistralShareUrl(value) ? undefined : errorResult('mistral', 'invalid-url', 'URL de partage Mistral invalide.'), importFromUrl: async () => errorResult('mistral', 'policy', 'La récupération distante Mistral n’est pas encore activée.') });
