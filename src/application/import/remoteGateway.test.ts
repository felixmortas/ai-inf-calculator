import { describe, expect, it, vi } from 'vitest';
import { CHATGPT_SHARE_LIMITS } from './chatgptShareUrl';
import { CORSPROXY_ORIGIN, createRemoteGateway, createRemoteGatewayConsent } from './remoteGateway';
import { isResolvedShare, providerForResolvedShare, resolveShare } from './registry';

const shareUrl = 'https://chatgpt.com/share/abc-123';
const resolved = resolveShare(shareUrl)!;
const consent = () => createRemoteGatewayConsent(resolved, isResolvedShare, providerForResolvedShare);
const configured = { apiKey: () => 'test value / encoded' };
const response = (body: string, status = 200, headers: HeadersInit = {}) => new Response(body, { status, headers });

describe('passerelle distante bornée', () => {
  it('n’envoie qu’une requête figée dont la seule destination est la capacité attestée', async () => {
    const fetcher = vi.fn().mockResolvedValue(response('<html>public</html>'));
    await expect(createRemoteGateway(fetcher, configured).fetchHtml(resolved, consent())).resolves.toEqual({ ok: true, html: '<html>public</html>' });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe(`${CORSPROXY_ORIGIN}?url=${encodeURIComponent(shareUrl)}&key=${encodeURIComponent('test value / encoded')}`);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' });
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('headers');
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('body');
  });

  it('refuse valeurs forgées, clonées, périmées ou sans consentement avant fetch', async () => {
    const fetcher = vi.fn();
    const forged = Object.freeze({ ...resolved });
    const clone = JSON.parse(JSON.stringify(resolved));
    expect(createRemoteGatewayConsent(forged, isResolvedShare, providerForResolvedShare)).toBeUndefined();
    expect(createRemoteGatewayConsent(clone, isResolvedShare, providerForResolvedShare)).toBeUndefined();
    await expect(createRemoteGateway(fetcher, configured).fetchHtml(resolved)).resolves.toMatchObject({ ok: false, error: { code: 'consent-required' } });
    await expect(createRemoteGateway(fetcher, configured).fetchHtml(forged, consent())).resolves.toMatchObject({ ok: false, error: { code: 'consent-required' } });
    const oneUse = consent()!;
    const gateway = createRemoteGateway(fetcher, configured);
    await gateway.fetchHtml(resolved, oneUse).catch(() => undefined);
    await expect(gateway.fetchHtml(resolved, oneUse)).resolves.toMatchObject({ ok: false, error: { code: 'consent-required' } });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('ignore les prédicats permissifs fournis par l’appelant', () => {
    const forged = Object.freeze({ ...resolved });
    expect(createRemoteGatewayConsent(forged, (_value): _value is typeof resolved => true, () => ({ id: 'chatgpt', label: 'ChatGPT', limits: resolved.limits, policyVersion: resolved.policyVersion, redirectPolicy: { maxRedirects: 0, allowedOrigins: ['https://chatgpt.com'] }, validateUrl: () => undefined, importFromUrl: async () => ({ ok: true as const, providerId: 'chatgpt', events: [] }) }))).toBeUndefined();
  });

  it('ne part pas sans configuration et distingue réseau, HTTP, délai et taille', async () => {
    const missing = vi.fn();
    await expect(createRemoteGateway(missing, { apiKey: () => undefined }).fetchHtml(resolved, consent())).resolves.toMatchObject({ ok: false, error: { code: 'configuration' } });
    expect(missing).not.toHaveBeenCalled();
    await expect(createRemoteGateway(vi.fn().mockRejectedValue(new TypeError('offline')), configured).fetchHtml(resolved, consent())).resolves.toMatchObject({ ok: false, error: { code: 'network' } });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(response('', 502)), configured).fetchHtml(resolved, consent())).resolves.toMatchObject({ ok: false, error: { code: 'http', status: 502 } });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(response('x', 200, { 'content-length': String(CHATGPT_SHARE_LIMITS.maxBytes + 1) })), configured).fetchHtml(resolved, consent())).resolves.toMatchObject({ ok: false, error: { code: 'response-too-large' } });
  });

  it('annule atomiquement le corps refusé ou trop grand', async () => {
    const canceled = vi.fn();
    const body = new Response(new ReadableStream<Uint8Array>({ cancel: canceled }), { status: 403 });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(body), configured).fetchHtml(resolved, consent())).resolves.toMatchObject({ ok: false, error: { code: 'policy' } });
    expect(canceled).toHaveBeenCalledOnce();
    const oversized = new Response(new ReadableStream<Uint8Array>({ cancel: canceled }), { headers: { 'content-length': String(CHATGPT_SHARE_LIMITS.maxBytes + 1) } });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(oversized), configured).fetchHtml(resolved, consent())).resolves.toMatchObject({ ok: false, error: { code: 'response-too-large' } });
    expect(canceled).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, 'configuration', 'La passerelle refuse sa configuration.'],
    [403, 'policy', 'La politique de la passerelle refuse cette requête.'],
  ] as const)('retourne l’erreur atomique %i sans attendre l’annulation du corps', async (status, code, message) => {
    const rejectedCancel = vi.fn().mockRejectedValue(new Error('cleanup failed'));
    const rejected = new Response(new ReadableStream<Uint8Array>({ cancel: rejectedCancel }), { status });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(rejected), configured).fetchHtml(resolved, consent()))
      .resolves.toEqual({ ok: false, error: { code, message, status } });
    expect(rejectedCancel).toHaveBeenCalledOnce();

    const pendingCancel = vi.fn(() => new Promise<void>(() => {}));
    const pending = new Response(new ReadableStream<Uint8Array>({ cancel: pendingCancel }), { status });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(pending), configured).fetchHtml(resolved, consent()))
      .resolves.toEqual({ ok: false, error: { code, message, status } });
    expect(pendingCancel).toHaveBeenCalledOnce();
  });

  it('retourne un délai atomique si fetch ou la lecture du corps reste bloqué', async () => {
    vi.useFakeTimers();
    try {
      const stalledFetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }));
      const pendingFetch = createRemoteGateway(stalledFetch, configured).fetchHtml(resolved, consent());
      await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
      await expect(pendingFetch).resolves.toMatchObject({ ok: false, error: { code: 'timeout' } });

      const stalledBody = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => Promise.resolve(new Response(new ReadableStream<Uint8Array>({
        start(controller) { init?.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError'))); },
      }))));
      const pendingBody = createRemoteGateway(stalledBody, configured).fetchHtml(resolved, consent());
      await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
      await expect(pendingBody).resolves.toMatchObject({ ok: false, error: { code: 'timeout' } });
    } finally { vi.useRealTimers(); }
  });

  it('borne aussi un fetch et un corps qui ignorent AbortSignal', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(() => new Promise<Response>(() => {}));
      const pendingFetch = createRemoteGateway(fetcher, configured).fetchHtml(resolved, consent());
      await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
      await expect(pendingFetch).resolves.toMatchObject({ ok: false, error: { code: 'timeout' } });

      const uncooperativeBody = vi.fn(() => Promise.resolve(new Response(new ReadableStream<Uint8Array>({ start() { /* Ne réagit pas au signal. */ } }))));
      const pendingBody = createRemoteGateway(uncooperativeBody, configured).fetchHtml(resolved, consent());
      await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
      await expect(pendingBody).resolves.toMatchObject({ ok: false, error: { code: 'timeout' } });
    } finally { vi.useRealTimers(); }
  });

  it('annule un flux sans content-length dès que ses chunks franchissent la borne', async () => {
    const canceled = vi.fn();
    let extraSent = false;
    const body = new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(CHATGPT_SHARE_LIMITS.maxBytes)); },
      pull(controller) { if (!extraSent) { extraSent = true; controller.enqueue(new Uint8Array([1])); } },
      cancel: canceled,
    }));
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(body), configured).fetchHtml(resolved, consent()))
      .resolves.toMatchObject({ ok: false, error: { code: 'response-too-large' } });
    expect(canceled).toHaveBeenCalledOnce();
  });

  it('refuse toute politique de redirection qui ne peut être attestée par le proxy', async () => {
    const gemini = resolveShare('https://share.gemini.google/opaque')!;
    const geminiConsent = createRemoteGatewayConsent(gemini, isResolvedShare, providerForResolvedShare)!;
    const fetcher = vi.fn().mockResolvedValue(response('<html>public</html>'));
    await expect(createRemoteGateway(fetcher, configured).fetchHtml(gemini, geminiConsent)).resolves.toMatchObject({ ok: false, error: { code: 'redirect-disallowed' } });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
