import type { ImportLimits, ImportProvider, ImportResult, NormalizedImportEvent, RedirectPolicy } from './types';
import { asRecord, boundedText, errorResult, hasNonText, hasValidExtractionLimits, jsonScript, successResult } from './providerSupport';
import { importResolvedProviderShare } from './resolvedShareImport';
import type { RemoteGatewayConsent } from './remoteGateway';
import type { ResolvedShare } from './types';

export const CLAUDE_SHARE_LIMITS: ImportLimits = Object.freeze({ maxUrlLength: 2_048, timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxEvents: 1_000, maxRedirects: 0 });
export const CLAUDE_REDIRECT_POLICY: RedirectPolicy = Object.freeze({ maxRedirects: 0, allowedOrigins: Object.freeze(['https://claude.ai']) });

export function validateClaudeShareUrl(value: string): string | undefined {
  if (value.length > CLAUDE_SHARE_LIMITS.maxUrlLength || !/^https:\/\/claude\.ai\/share\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'claude.ai' && !url.port && !url.username && !url.password && !url.search && !url.hash ? value : undefined; } catch { return undefined; }
}

export function extractClaudeShareEvents(html: string, limits: Pick<ImportLimits, 'maxEvents' | 'maxBytes'> = CLAUDE_SHARE_LIMITS): ImportResult {
  if (!hasValidExtractionLimits(limits)) return errorResult('claude', 'configuration', 'Les limites d’extraction sont invalides.');
  if (new TextEncoder().encode(html).byteLength > limits.maxBytes) return errorResult('claude', 'response-too-large', 'La réponse dépasse la taille autorisée.');
  const state = asRecord(jsonScript(html, 'data-claude-share'));
  const turns = Array.isArray(state?.turns) ? state.turns : undefined;
  if (!turns) return errorResult('claude', 'format-unknown', 'La page Claude reçue ne contient pas les échanges. Utilisez l’import manuel pour cette conversation.');
  const events: NormalizedImportEvent[] = [];
  for (const turn of turns) {
    const item = asRecord(turn); const role = item?.role;
    if (role !== 'user' && role !== 'assistant') continue;
    const text = boundedText(item?.content ?? item?.text);
    if (text) events.push(Object.freeze({ ...(typeof item?.id === 'string' ? { id: item.id } : {}), role, text, order: events.length + 1 }));
    if (hasNonText(item)) events.push(Object.freeze({ type: 'inaccessible-content' as const, role: 'inaccessible-content', text: '', contentType: 'attachment' as const, label: 'Contenu Claude non textuel', order: events.length + 1 }));
    if (events.length > limits.maxEvents) return errorResult('claude', 'too-many-events', `La page contient plus de ${limits.maxEvents} événements.`);
  }
  return events.some((event) => event.role === 'user' || event.role === 'assistant') ? successResult('claude', events) : errorResult('claude', 'format-unknown', 'Aucun tour textuel public Claude reconnu.');
}

export const claudeShareProvider: ImportProvider = Object.freeze({ id: 'claude', label: 'Claude', limits: CLAUDE_SHARE_LIMITS, policyVersion: 'claude-v1', redirectPolicy: CLAUDE_REDIRECT_POLICY, canonicalizeUrl: validateClaudeShareUrl, extract: extractClaudeShareEvents, validateUrl: (value: string) => validateClaudeShareUrl(value) ? undefined : errorResult('claude', 'invalid-url', 'URL de partage Claude invalide.'), importFromUrl: async () => errorResult('claude', 'policy', 'La récupération distante Claude exige une capacité attestée.'), importResolvedShare: (resolved: ResolvedShare, consent?: unknown) => importResolvedProviderShare(resolved, consent as RemoteGatewayConsent | undefined, claudeShareProvider) });
