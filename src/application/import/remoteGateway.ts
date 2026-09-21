import type { ImportError, ImportErrorCode, ImportLimits, ImportProvider, ResolvedShare } from './types';
import { registeredProviderForResolvedShare } from './shareAttestation';

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
  /** La passerelle ne reçoit jamais une URL libre : seulement la capacité du registre. */
  fetchHtml(resolved: ResolvedShare, consent?: RemoteGatewayConsent): Promise<RemoteGatewayResult>;
}

interface RemoteGatewayConfiguration {
  readonly apiKey: () => string | undefined;
}

interface ConsentRecord {
  readonly resolved: ResolvedShare;
  readonly limits: ImportLimits;
  readonly policyVersion: string;
  readonly redirectPolicy: NonNullable<ImportProvider['redirectPolicy']>;
}

const unusedConsents = new WeakMap<object, ConsentRecord>();

const GLOBAL_LIMITS: ImportLimits = Object.freeze({
  maxUrlLength: 2_048, timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxEvents: 1_000, maxRedirects: 1,
});

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
  _isResolvedShare?: (value: unknown) => value is ResolvedShare,
  _providerForResolvedShare?: (value: unknown) => ImportProvider | undefined,
  proxyOrigin: string = CORSPROXY_ORIGIN,
): RemoteGatewayConsent | undefined {
  const provider = registeredProviderForResolvedShare(resolved);
  const limits = provider?.limits;
  const redirectPolicy = provider?.redirectPolicy;
  if (!provider || !limits || !redirectPolicy || resolved.policyVersion !== provider.policyVersion
    || proxyOrigin !== CORSPROXY_ORIGIN || !hasBoundedLimits(limits, redirectPolicy)) return undefined;
  const consent = Object.freeze({}) as unknown as RemoteGatewayConsent;
  unusedConsents.set(consent, Object.freeze({ resolved, limits, policyVersion: provider.policyVersion!, redirectPolicy }));
  return consent;
}

function hasBoundedLimits(limits: ImportLimits, redirectPolicy: NonNullable<ImportProvider['redirectPolicy']>): boolean {
  return Number.isInteger(limits.maxUrlLength) && limits.maxUrlLength > 0 && limits.maxUrlLength <= GLOBAL_LIMITS.maxUrlLength
    && Number.isInteger(limits.timeoutMs) && limits.timeoutMs > 0 && limits.timeoutMs <= GLOBAL_LIMITS.timeoutMs
    && Number.isInteger(limits.maxBytes) && limits.maxBytes > 0 && limits.maxBytes <= GLOBAL_LIMITS.maxBytes
    && Number.isInteger(limits.maxEvents) && limits.maxEvents > 0 && limits.maxEvents <= GLOBAL_LIMITS.maxEvents
    && Number.isInteger(limits.maxRedirects) && limits.maxRedirects >= 0 && limits.maxRedirects <= GLOBAL_LIMITS.maxRedirects
    && limits.maxRedirects === redirectPolicy.maxRedirects && redirectPolicy.allowedOrigins.length > 0;
}

function corsProxyApiKey(): string | undefined {
  const value = import.meta.env.VITE_CORSPROXY_API_KEY;
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

async function readBounded(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    discardResponseBody(response);
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
        try { void reader.cancel('response-too-large').catch(() => { /* La taille reste le motif d'échec. */ }); } catch { /* La taille reste le motif d'échec. */ }
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
    async fetchHtml(resolved: ResolvedShare, consent?: RemoteGatewayConsent): Promise<RemoteGatewayResult> {
      const record = consent && unusedConsents.get(consent);
      if (!record || record.resolved !== resolved || !hasBoundedLimits(record.limits, record.redirectPolicy)
        || resolved.canonicalUrl.length > record.limits.maxUrlLength) {
        return error('consent-required', 'Votre consentement ponctuel est requis pour cette URL.');
      }
      unusedConsents.delete(consent!);
      if (record.limits.maxRedirects > 0) {
        return error('redirect-disallowed', 'La passerelle actuelle ne peut pas attester les redirections autorisées.');
      }
      const apiKey = configuration.apiKey();
      if (!apiKey) {
        return error('configuration', 'La passerelle d’import distant n’est pas configurée.');
      }

      const controller = new AbortController();
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new DOMException('aborted', 'AbortError'));
        }, record.limits.timeoutMs);
      });
      try {
        // `outboundCanonicalUrl` est l'unique destination issue d'une capacité locale attestée.
        const outboundCanonicalUrl = record.resolved.canonicalUrl;
        const proxyRequestUrl = `${CORSPROXY_ORIGIN}?url=${encodeURIComponent(outboundCanonicalUrl)}&key=${encodeURIComponent(apiKey)}`;
        const response = await Promise.race([fetcher(proxyRequestUrl, {
          method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
          referrerPolicy: 'no-referrer', signal: controller.signal,
        }), timeout]);
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
          return Object.freeze({ ok: true as const, html: await Promise.race([readBounded(response, record.limits.maxBytes), timeout]) });
        } catch (cause) {
          if (timedOut) return error('timeout', 'La lecture a dépassé le délai autorisé.');
          return cause instanceof RangeError
            ? error('response-too-large', 'La réponse dépasse la taille autorisée.')
            : error('network', 'La réponse de la passerelle ne peut pas être lue.');
        }
      } catch {
        return error(timedOut ? 'timeout' : 'network', timedOut
          ? 'La lecture a dépassé le délai autorisé.'
          : 'Accès refusé par le réseau ou la passerelle.');
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    },
  });
}

// La liaison reste tardive afin que le navigateur (et les tests) fournisse
// l'implémentation fetch courante sans élargir la surface de la passerelle.
export const remoteGateway = createRemoteGateway((input, init) => fetch(input, init));
