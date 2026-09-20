import { remoteGateway, type RemoteGateway, type RemoteGatewayConsent } from './remoteGateway';
import { CHATGPT_SHARE_LIMITS, validateChatGptShareUrl } from './chatgptShareUrl';
import { hasValidExtractionLimits } from './providerSupport';
import type { ImportError, ImportEvent, ImportLimits, ImportProvider, ImportResult, RedirectPolicy } from './types';

export { CHATGPT_SHARE_LIMITS, validateChatGptShareUrl } from './chatgptShareUrl';

type UnknownRecord = Record<string, unknown>;

function frozenError(code: ImportError['code'], message: string, status?: number): ImportResult {
  const error = Object.freeze(status === undefined ? { code, message } : { code, message, status });
  return Object.freeze({ ok: false as const, providerId: 'chatgpt', events: Object.freeze([]) as readonly [], error });
}

function frozenSuccess(events: readonly ImportEvent[]): ImportResult {
  return Object.freeze({ ok: true as const, providerId: 'chatgpt', events: Object.freeze([...events]) });
}

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as UnknownRecord : undefined;
}

function textFromContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textFromContent).filter((text) => text.trim() !== '').join('\n');
  const item = record(value);
  if (!item) return '';
  for (const key of ['text', 'content', 'parts', 'value']) {
    if (key in item) {
      const text = textFromContent(item[key]);
      if (text.trim() !== '') return text;
    }
  }
  return '';
}

interface Candidate { readonly id?: string; readonly role: string; readonly text: string; readonly createdAt?: number; readonly index: number; }

function candidateFrom(value: UnknownRecord, index: number): Candidate | undefined {
  const nested = record(value.message);
  const message = nested ?? value;
  const author = record(message.author);
  const role = author?.role ?? message.role;
  const content = message.content ?? message.parts;
  if (typeof role !== 'string' || content === undefined) return undefined;
  const text = textFromContent(content);
  if (text.trim() === '') return undefined;
  const rawId = message.id ?? value.id;
  const rawTime = message.create_time ?? value.create_time;
  const numericTime = typeof rawTime === 'number' ? rawTime : typeof rawTime === 'string' && rawTime.trim() !== '' ? Number(rawTime) : Number.NaN;
  return { id: typeof rawId === 'string' && rawId !== '' ? rawId : undefined, role, text, createdAt: Number.isFinite(numericTime) ? numericTime : undefined, index };
}

/** Renvoie true dès que la borne est franchie, sans parcourir le reste de l'état. */
function walk(value: unknown, candidates: Candidate[], maxEvents: number): boolean {
  const item = record(value);
  if (item) {
    const candidate = candidateFrom(item, candidates.length);
    if (candidate) {
      candidates.push(candidate);
      if (candidates.length > maxEvents) return true;
    }
    // Un nœud `mapping` porte son message dans `message`; le revisiter créerait
    // un second événement sans identifiant pour une seule donnée publique.
    for (const [key, child] of Object.entries(item)) {
      if (!(candidate && key === 'message') && walk(child, candidates, maxEvents)) return true;
    }
  } else if (Array.isArray(value)) {
    for (const child of value) if (walk(child, candidates, maxEvents)) return true;
  }
  return false;
}

function resolveIndexedStream(values: readonly unknown[]): unknown {
  const resolving = new Set<number>();
  const cache = new Map<number, unknown>();
  const resolveIndex = (index: number): unknown => {
    if (index < 0 || index >= values.length || resolving.has(index)) return undefined;
    if (cache.has(index)) return cache.get(index);
    resolving.add(index); const result = resolve(values[index]); resolving.delete(index); cache.set(index, result); return result;
  };
  const resolve = (value: unknown): unknown => {
    if (typeof value === 'number' && Number.isInteger(value)) return resolveIndex(value);
    if (Array.isArray(value)) return value.map(resolve);
    const item = record(value); if (!item) return value;
    const result: UnknownRecord = {};
    for (const [key, child] of Object.entries(item)) {
      const decoded = /^_\d+$/.test(key) ? resolveIndex(Number(key.slice(1))) : key;
      if (typeof decoded === 'string') result[decoded] = resolve(child);
    }
    return result;
  };
  return resolveIndex(0);
}

function parsePublicStates(source: string): unknown[] {
  const states: unknown[] = [];
  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (let match; (match = scripts.exec(source)) !== null;) {
    if (/json|__next/i.test(match[1])) {
      try { states.push(JSON.parse(match[2].trim())); } catch { /* structure non reconnue */ }
    }
    // Les pages Next peuvent sérialiser l'état dans un appel JSON.parse. Il est
    // décodé comme donnée, jamais évalué comme script.
    const jsonParse = /JSON\.parse\(\s*("(?:[^"\\]|\\[\s\S])*")\s*\)/g;
    for (let parsed; (parsed = jsonParse.exec(match[2])) !== null;) {
      try { states.push(JSON.parse(JSON.parse(parsed[1]) as string)); } catch { /* structure non reconnue */ }
    }
  }
  const marker = 'streamController.enqueue(';
  let position = 0;
  while ((position = source.indexOf(marker, position)) !== -1) {
    try {
      const [encoded, end] = decodeJsonAt(source, position + marker.length);
      if (typeof encoded === 'string') {
        const table = JSON.parse(encoded);
        if (Array.isArray(table)) states.push(resolveIndexedStream(table));
      }
      position = end;
    } catch { position += marker.length; }
  }
  return states;
}

function decodeJsonAt(source: string, start: number): [unknown, number] {
  const decoder = JSON as JSON & { parse(text: string): unknown };
  // JSON.parse has no offset API; find a valid JSON prefix conservatively with a string scanner.
  if (source[start] !== '"') throw new SyntaxError('chaîne React Router absente');
  let escaped = false;
  for (let end = start + 1; end < source.length; end += 1) {
    const char = source[end];
    if (!escaped && char === '"') return [decoder.parse(source.slice(start, end + 1)), end + 1];
    escaped = !escaped && char === '\\';
    if (char !== '\\') escaped = false;
  }
  throw new SyntaxError('chaîne React Router incomplète');
}

export function extractChatGptShareEvents(source: string, maxEvents: number = CHATGPT_SHARE_LIMITS.maxEvents): ImportResult {
  const candidates: Candidate[] = [];
  for (const state of parsePublicStates(source)) {
    if (walk(state, candidates, maxEvents)) return frozenError('too-many-events', `La page contient plus de ${maxEvents} messages.`);
  }
  if (candidates.length === 0) return frozenError('format-unknown', 'Aucune structure conversationnelle publique reconnue.');
  const seenIds = new Set<string>();
  const unique = candidates.filter((candidate) => !candidate.id || !seenIds.has(candidate.id) && (seenIds.add(candidate.id), true));
  // Une date absente ne donne pas le droit de déplacer un message public : le
  // tri chronologique n'est fiable que si toutes les données sont datées.
  const ordered = unique.every((candidate) => candidate.createdAt !== undefined)
    ? [...unique].sort((left, right) => left.createdAt! - right.createdAt! || left.index - right.index)
    : unique;
  return frozenSuccess(ordered.map((event, order) => Object.freeze({
    ...(event.id ? { id: event.id } : {}), role: event.role, text: event.text, order: order + 1,
    ...(event.createdAt === undefined ? {} : { createdAt: event.createdAt }),
  })));
}

export async function importChatGptShare(value: string, consent?: RemoteGatewayConsent, gateway: RemoteGateway = remoteGateway): Promise<ImportResult> {
  if (!validateChatGptShareUrl(value)) return frozenError('invalid-url', 'Utilisez exactement https://chatgpt.com/share/<id>.');
  const fetched = await gateway.fetchHtml(value, consent);
  if (!fetched.ok) return frozenError(fetched.error.code, fetched.error.message, fetched.error.status);
  return extractChatGptShareEvents(fetched.html);
}

export const chatGptShareProvider: ImportProvider = Object.freeze({
  id: 'chatgpt', label: 'ChatGPT',
  limits: Object.freeze({ maxUrlLength: 2_048, ...CHATGPT_SHARE_LIMITS, maxRedirects: 0 }) as ImportLimits,
  policyVersion: 'chatgpt-v1',
  redirectPolicy: Object.freeze({ maxRedirects: 0, allowedOrigins: Object.freeze(['https://chatgpt.com']) }) as RedirectPolicy,
  canonicalizeUrl: validateChatGptShareUrl,
  extract(html: string, limits?: Pick<ImportLimits, 'maxEvents' | 'maxBytes'>) {
    if (limits && !hasValidExtractionLimits(limits)) return frozenError('configuration', 'Les limites d’extraction sont invalides.');
    if (limits && new TextEncoder().encode(html).byteLength > limits.maxBytes) return frozenError('response-too-large', 'La réponse dépasse la taille autorisée.');
    return extractChatGptShareEvents(html, limits?.maxEvents);
  },
  validateUrl(value: string) { return validateChatGptShareUrl(value) ? undefined : frozenError('invalid-url', 'Utilisez exactement https://chatgpt.com/share/<id>.'); },
  importFromUrl(value: string, consent?: unknown) { return importChatGptShare(value, consent as RemoteGatewayConsent | undefined); },
});
