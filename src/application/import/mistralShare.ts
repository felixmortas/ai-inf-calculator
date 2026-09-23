import type { ImportLimits, ImportProvider, ImportResult, NormalizedImportEvent, RedirectPolicy } from './types';
import { asRecord, boundedText, errorResult, hasNonText, hasValidExtractionLimits, jsonScript, successResult } from './providerSupport';
import { importResolvedProviderShare } from './resolvedShareImport';
import type { RemoteGatewayConsent } from './remoteGateway';
import type { ResolvedShare } from './types';

export const MISTRAL_SHARE_LIMITS: ImportLimits = Object.freeze({ maxUrlLength: 2_048, timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxEvents: 1_000, maxRedirects: 0 });
export const MISTRAL_REDIRECT_POLICY: RedirectPolicy = Object.freeze({ maxRedirects: 0, allowedOrigins: Object.freeze(['https://chat.mistral.ai']) });
export function validateMistralShareUrl(value: string): string | undefined {
  if (value.length > MISTRAL_SHARE_LIMITS.maxUrlLength || !/^https:\/\/chat\.mistral\.ai\/chat\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) return undefined;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'chat.mistral.ai' && !url.port && !url.username && !url.password && !url.search && !url.hash ? value : undefined; } catch { return undefined; }
}

/** Extrait le texte affiché sans les boutons de copie ni les éléments décoratifs. */
function renderedText(root: Element): string {
  const chunks: string[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      chunks.push(node.textContent ?? '');
      return;
    }
    if (!(node instanceof Element) || node.matches('button,svg,style,script,[aria-hidden="true"]')) return;
    if (node.matches('[data-testid="code-block"]')) {
      const code = node.querySelector('pre');
      if (code) chunks.push(`\n${code.textContent ?? ''}\n`);
      return;
    }
    if (node.matches('br,hr')) { chunks.push('\n'); return; }
    const block = node.matches('p,h1,h2,h3,h4,h5,h6,li,pre,blockquote');
    if (block) chunks.push('\n');
    for (const child of node.childNodes) visit(child);
    if (block) chunks.push('\n');
  };
  visit(root);
  return chunks.join('').replace(/[\t ]*\n[\t ]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function renderedMessages(html: string): NormalizedImportEvent[] {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const messages = document.querySelectorAll('[data-testid="conversation-layout"] [data-message-author-role]');
  const events: NormalizedImportEvent[] = [];
  for (const message of messages) {
    const role = message.getAttribute('data-message-author-role');
    if (role !== 'user' && role !== 'assistant') continue;
    const content = role === 'user'
      ? message.querySelector('.select-text .whitespace-pre-wrap')
      : message.querySelector('[data-message-part-type="answer"] .markdown-container-style');
    const text = content && renderedText(content);
    if (text) events.push(Object.freeze({
      ...(message.getAttribute('data-message-id') ? { id: message.getAttribute('data-message-id')! } : {}),
      role, text, order: events.length + 1,
    }));
  }
  return events;
}

export function extractMistralShareEvents(html: string, limits: Pick<ImportLimits, 'maxEvents' | 'maxBytes'> = MISTRAL_SHARE_LIMITS): ImportResult {
  if (!hasValidExtractionLimits(limits)) return errorResult('mistral', 'configuration', 'Les limites d’extraction sont invalides.');
  if (new TextEncoder().encode(html).byteLength > limits.maxBytes) return errorResult('mistral', 'response-too-large', 'La réponse dépasse la taille autorisée.');
  const state = asRecord(jsonScript(html, 'data-mistral-share')); const messages = Array.isArray(state?.messages) ? state.messages : undefined;
  if (!messages) {
    const events = renderedMessages(html);
    if (events.length > limits.maxEvents) return errorResult('mistral', 'too-many-events', `La page contient plus de ${limits.maxEvents} événements.`);
    return events.some((event) => event.role === 'user' || event.role === 'assistant')
      ? successResult('mistral', events)
      : errorResult('mistral', 'format-unknown', 'La structure publique Mistral est inconnue.');
  }
  const events: NormalizedImportEvent[] = [];
  for (const message of messages) { const item = asRecord(message); const role = item?.role; if (role !== 'user' && role !== 'assistant') continue; const text = boundedText(item?.content ?? item?.text); if (text) events.push(Object.freeze({ ...(typeof item?.id === 'string' ? { id: item.id } : {}), role, text, order: events.length + 1 })); if (hasNonText(item)) events.push(Object.freeze({ type: 'inaccessible-content' as const, role: 'inaccessible-content', text: '', contentType: 'attachment' as const, label: 'Contenu Mistral non textuel', order: events.length + 1 })); if (events.length > limits.maxEvents) return errorResult('mistral', 'too-many-events', `La page contient plus de ${limits.maxEvents} événements.`); }
  return events.some((event) => event.role === 'user' || event.role === 'assistant') ? successResult('mistral', events) : errorResult('mistral', 'format-unknown', 'Aucun message textuel public Mistral reconnu.');
}
export const mistralShareProvider: ImportProvider = Object.freeze({ id: 'mistral', label: 'Mistral', limits: MISTRAL_SHARE_LIMITS, policyVersion: 'mistral-v1', redirectPolicy: MISTRAL_REDIRECT_POLICY, canonicalizeUrl: validateMistralShareUrl, extract: extractMistralShareEvents, validateUrl: (value: string) => validateMistralShareUrl(value) ? undefined : errorResult('mistral', 'invalid-url', 'URL de partage Mistral invalide.'), importFromUrl: async () => errorResult('mistral', 'policy', 'La récupération distante Mistral exige une capacité attestée.'), importResolvedShare: (resolved: ResolvedShare, consent?: unknown) => importResolvedProviderShare(resolved, consent as RemoteGatewayConsent | undefined, mistralShareProvider) });
