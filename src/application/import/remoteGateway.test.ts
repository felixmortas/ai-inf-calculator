import { describe, expect, it, vi } from 'vitest';
import { importChatGptShare } from './chatgptShare';
import { CHATGPT_SHARE_LIMITS } from './chatgptShareUrl';
import {
  CORSPROXY_ORIGIN,
  createRemoteGateway,
  createRemoteGatewayConsent,
} from './remoteGateway';

const shareUrl = 'https://chatgpt.com/share/abc-123';
const response = (body: string, status = 200, headers: HeadersInit = {}) => new Response(body, { status, headers });

const testApiKey = 'test value / encoded';
const configured = { apiKey: () => testApiKey };
const unconfigured = { apiKey: () => undefined };
const refusedErrors = [
  [401, { code: 'configuration', message: 'La passerelle refuse sa configuration.', status: 401 }],
  [403, { code: 'policy', message: 'La politique de la passerelle refuse cette requête.', status: 403 }],
  [502, { code: 'http', message: 'La passerelle répond HTTP 502.', status: 502 }],
] as const;

describe('passerelle distante bornée', () => {
  it('envoie un unique GET vers l’origine CorsProxy immuable avec URL et clé encodées', async () => {
    const fetcher = vi.fn().mockResolvedValue(response('<html>public</html>'));
    const result = await createRemoteGateway(fetcher, configured).fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    expect(result).toEqual({ ok: true, html: '<html>public</html>' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(`${CORSPROXY_ORIGIN}?url=${encodeURIComponent(shareUrl)}&key=${encodeURIComponent(testApiKey)}`);
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
    });
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('headers');
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('body');
  });

  it.each([
    ['sans consentement', undefined],
    ['consentement lié à une autre URL', createRemoteGatewayConsent('https://chatgpt.com/share/other')],
  ])('ne lance aucun trafic %s', async (_caseName, consent) => {
    const fetcher = vi.fn();
    await expect(createRemoteGateway(fetcher, configured).fetchHtml(shareUrl, consent)).resolves.toMatchObject({
      ok: false, error: { code: 'consent-required' },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('consomme le consentement au premier emploi et ne lance pas de second trafic', async () => {
    const fetcher = vi.fn().mockResolvedValue(response('<html>public</html>'));
    const consent = createRemoteGatewayConsent(shareUrl);
    const gateway = createRemoteGateway(fetcher, configured);
    await expect(gateway.fetchHtml(shareUrl, consent)).resolves.toMatchObject({ ok: true });
    await expect(gateway.fetchHtml(shareUrl, consent)).resolves.toMatchObject({
      ok: false, error: { code: 'consent-required' },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refuse URL invalide et configuration absente sans trafic', async () => {
    const invalidFetcher = vi.fn();
    await expect(createRemoteGateway(invalidFetcher, configured).fetchHtml('https://evil.test/share/a', undefined)).resolves.toMatchObject({
      ok: false, error: { code: 'invalid-url' },
    });
    expect(invalidFetcher).not.toHaveBeenCalled();

    const missingConfigFetcher = vi.fn();
    await expect(createRemoteGateway(missingConfigFetcher, unconfigured).fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl))).resolves.toMatchObject({
      ok: false, error: { code: 'configuration' },
    });
    expect(missingConfigFetcher).not.toHaveBeenCalled();
  });

  it('retourne des erreurs atomiques de réseau, configuration, politique, HTTP et taille', async () => {
    const network = await createRemoteGateway(vi.fn().mockRejectedValue(new TypeError('offline')), configured)
      .fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    const configuration = await createRemoteGateway(vi.fn().mockResolvedValue(response('<html>refusé</html>', 401)), configured)
      .fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    const policy = await createRemoteGateway(vi.fn().mockResolvedValue(response('<html>refusé</html>', 403)), configured)
      .fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    const http = await createRemoteGateway(vi.fn().mockResolvedValue(response('', 502)), configured)
      .fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    const large = await createRemoteGateway(vi.fn().mockResolvedValue(response('x', 200, {
      'content-length': String(CHATGPT_SHARE_LIMITS.maxBytes + 1),
    })), configured).fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    for (const result of [network, configuration, policy, http, large]) expect(result).toMatchObject({ ok: false });
    expect(network.ok ? undefined : network.error.code).toBe('network');
    expect(configuration.ok ? undefined : configuration.error).toEqual({
      code: 'configuration', message: 'La passerelle refuse sa configuration.', status: 401,
    });
    expect(configuration).not.toHaveProperty('html');
    expect(policy.ok ? undefined : policy.error).toEqual({
      code: 'policy', message: 'La politique de la passerelle refuse cette requête.', status: 403,
    });
    expect(policy).not.toHaveProperty('html');
    expect(http.ok ? undefined : http.error.code).toBe('http');
    expect(large.ok ? undefined : large.error.code).toBe('response-too-large');
  });

  it.each(refusedErrors)('annule une seule fois le corps HTTP %i refusé sans livrer de HTML', async (status, expectedError) => {
    const canceled = vi.fn();
    const refused = new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('<html>refusé</html>')); },
      cancel: canceled,
    }), { status });
    const result = await createRemoteGateway(vi.fn().mockResolvedValue(refused), configured)
      .fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    expect(canceled).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: false, error: expectedError });
    expect(result).not.toHaveProperty('html');
  });

  it.each(refusedErrors)('préserve l’erreur HTTP %i si l’annulation du corps échoue', async (status, expectedError) => {
    const canceled = vi.fn().mockRejectedValue(new Error('cleanup failed'));
    const refused = new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('<html>refusé</html>')); },
      cancel: canceled,
    }), { status });
    const result = await createRemoteGateway(vi.fn().mockResolvedValue(refused), configured)
      .fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    expect(canceled).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: false, error: expectedError });
    expect(result).not.toHaveProperty('html');
  });

  it('retourne sans attendre une annulation de corps refusé qui reste en attente', async () => {
    const canceled = vi.fn(() => new Promise<void>(() => {}));
    const refused = new Response(new ReadableStream<Uint8Array>({ cancel: canceled }), { status: 502 });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(refused), configured)
      .fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl)))
      .resolves.toEqual({ ok: false, error: refusedErrors[2][1] });
    expect(canceled).toHaveBeenCalledOnce();
  });

  it.each(refusedErrors)('ne livre aucun événement lorsque CorsProxy retourne HTTP %i', async (status, expectedError) => {
    const gateway = createRemoteGateway(vi.fn().mockResolvedValue(response('<html>refusé</html>', status)), configured);
    await expect(importChatGptShare(shareUrl, createRemoteGatewayConsent(shareUrl), gateway)).resolves.toMatchObject({
      ok: false, events: [], error: expectedError,
    });
  });

  it('annule un flux dès que sa taille dépasse la borne', async () => {
    const canceled = vi.fn();
    let sentExtraChunk = false;
    const body = new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(CHATGPT_SHARE_LIMITS.maxBytes)); },
      pull(controller) {
        if (!sentExtraChunk) { sentExtraChunk = true; controller.enqueue(new Uint8Array([1])); }
      },
      cancel: canceled,
    }));
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(body), configured).fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl)))
      .resolves.toMatchObject({ ok: false, error: { code: 'response-too-large' } });
    expect(canceled).toHaveBeenCalledOnce();
  });

  it('annule le corps déclaré trop grand même avant sa lecture', async () => {
    const canceled = vi.fn();
    const body = new ReadableStream<Uint8Array>({ cancel: canceled });
    const oversized = new Response(body, { headers: { 'content-length': String(CHATGPT_SHARE_LIMITS.maxBytes + 1) } });
    await expect(createRemoteGateway(vi.fn().mockResolvedValue(oversized), configured).fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl)))
      .resolves.toMatchObject({ ok: false, error: { code: 'response-too-large' } });
    expect(canceled).toHaveBeenCalledOnce();
  });

  it('retourne un délai atomique quand la requête est interrompue', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const pending = createRemoteGateway(fetcher, configured).fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'timeout' } });
    vi.useRealTimers();
  });

  it('retourne un délai atomique quand le signal interrompt la lecture du flux', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => Promise.resolve(new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
      },
    }))));
    const pending = createRemoteGateway(fetcher, configured).fetchHtml(shareUrl, createRemoteGatewayConsent(shareUrl));
    await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'timeout' } });
    vi.useRealTimers();
  });
});
