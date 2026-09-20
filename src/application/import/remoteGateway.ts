import { CHATGPT_SHARE_LIMITS, validateChatGptShareUrl } from './chatgptShareUrl';
import type { ImportError, ImportErrorCode, ResolvedShare } from './types';

export const CORSPROXY_ORIGIN = 'https://corsproxy.io/' as const;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Preuve ponctuelle, créée par le parcours de consentement pour une URL donnée. */
export interface RemoteGatewayConsent {
  readonly __opaqueConsent: never;
}

export type RemoteGatewayResult =
  | { readonly ok: true; readonly html: string }
  | { readonly ok: false; readonly error: ImportError };

export interface RemoteGateway {
  fetchHtml(url: string, consent?: RemoteGatewayConsent): Promise<RemoteGatewayResult>;
}

interface RemoteGatewayConfiguration {
  readonly apiKey: () => string | undefined;
}

const unusedConsents = new WeakSet<object>();

function error(code: ImportErrorCode, message: string, status?: number): RemoteGatewayResult {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze(status === undefined ? { code, message } : { code, message, status }),
  });
}

/** Abandonne best-effort un corps que la passerelle ne doit jamais exposer. */
function discardResponseBody(response: Response): void {
  try { void response.body?.cancel('response-not-accepted').catch(() => { /* L’erreur métier reste prioritaire. */ }); } catch { /* L’erreur métier reste prioritaire. */ }
}

/**
 * Capacité ponctuelle : l'identité (et non une copie des champs) du partage
 * attesté, sa politique et l'origine proxy courante doivent toutes coïncider.
 */
export function createRemoteGatewayConsent(
  resolved: ResolvedShare,
  isResolvedShare: (value: unknown) => value is ResolvedShare,
  proxyOrigin: string = CORSPROXY_ORIGIN,
): RemoteGatewayConsent | undefined {
  if (!isResolvedShare(resolved) || resolved.policyVersion === '' || proxyOrigin !== CORSPROXY_ORIGIN) return undefined;
  const consent = Object.freeze({ resolved, policyVersion: resolved.policyVersion, proxyOrigin }) as unknown as RemoteGatewayConsent;
  unusedConsents.add(consent);
  return consent;
}

function corsProxyApiKey(): string | undefined {
  const value = import.meta.env.VITE_CORSPROXY_API_KEY;
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

async function readBounded(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    try { await response.body?.cancel('response-too-large'); } catch { /* La taille reste le motif d'échec. */ }
    throw new RangeError('too-large');
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new RangeError('too-large');
    return new TextDecoder().decode(bytes);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel('response-too-large'); } catch { /* La taille reste le motif d'échec. */ }
        throw new RangeError('too-large');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Seule frontière réseau de l'import distant. La clé de build ne sort que dans
 * le paramètre CorsProxy encodé, jamais dans les erreurs ou les logs.
 */
export function createRemoteGateway(
  fetcher: FetchLike = fetch,
  configuration: RemoteGatewayConfiguration = { apiKey: corsProxyApiKey },
): RemoteGateway {
  return Object.freeze({
    async fetchHtml(url: string, consent?: RemoteGatewayConsent): Promise<RemoteGatewayResult> {
      if (!validateChatGptShareUrl(url)) {
        return error('invalid-url', 'Utilisez exactement https://chatgpt.com/share/<id>.');
      }
      const capability = consent as unknown as { resolved?: ResolvedShare; policyVersion?: string; proxyOrigin?: string } | undefined;
      if (!consent || !capability || !capability.resolved || capability.resolved.canonicalUrl !== url
        || capability.resolved.policyVersion !== capability.policyVersion || capability.proxyOrigin !== CORSPROXY_ORIGIN
        || !unusedConsents.has(consent)) {
        return error('consent-required', 'Votre consentement ponctuel est requis pour cette URL.');
      }
      unusedConsents.delete(consent);
      const apiKey = configuration.apiKey();
      if (!apiKey) {
        return error('configuration', 'La passerelle d’import distant n’est pas configurée.');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CHATGPT_SHARE_LIMITS.timeoutMs);
      try {
        const response = await fetcher(`${CORSPROXY_ORIGIN}?url=${encodeURIComponent(url)}&key=${encodeURIComponent(apiKey)}`, {
          method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
          referrerPolicy: 'no-referrer', signal: controller.signal,
        });
        if (response.status === 401) {
          discardResponseBody(response);
          return error('configuration', 'La passerelle refuse sa configuration.', response.status);
        }
        if (response.status === 403) {
          discardResponseBody(response);
          return error('policy', 'La politique de la passerelle refuse cette requête.', response.status);
        }
        if (!response.ok) {
          discardResponseBody(response);
          return error('http', `La passerelle répond HTTP ${response.status}.`, response.status);
        }
        try {
          return Object.freeze({ ok: true as const, html: await readBounded(response, CHATGPT_SHARE_LIMITS.maxBytes) });
        } catch (cause) {
          if (controller.signal.aborted) return error('timeout', 'La lecture a dépassé le délai autorisé.');
          return cause instanceof RangeError
            ? error('response-too-large', 'La réponse dépasse la taille autorisée.')
            : error('network', 'La réponse de la passerelle ne peut pas être lue.');
        }
      } catch {
        return error(controller.signal.aborted ? 'timeout' : 'network', controller.signal.aborted
          ? 'La lecture a dépassé le délai autorisé.'
          : 'Accès refusé par le réseau ou la passerelle.');
      } finally {
        clearTimeout(timer);
      }
    },
  });
}

export const remoteGateway = createRemoteGateway();
