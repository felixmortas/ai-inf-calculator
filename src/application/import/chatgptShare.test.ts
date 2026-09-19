import { describe, expect, it, vi } from 'vitest';
import { CHATGPT_SHARE_LIMITS, extractChatGptShareEvents, importChatGptShare, validateChatGptShareUrl } from './chatgptShare';
import { importProviderById, importProviders } from './registry';

const shareUrl = 'https://chatgpt.com/share/abc-123';
const page = (value: unknown) => `<script type="application/json">${JSON.stringify(value)}</script>`;
const response = (body: string, status = 200, headers: HeadersInit = {}) => new Response(body, { status, headers });

describe('registre d’import V1', () => {
  it('n’expose que ChatGPT et refuse un autre fournisseur', () => {
    expect(importProviders.map(({ id }) => id)).toEqual(['chatgpt']);
    expect(importProviderById('claude')).toBeUndefined();
  });
});

describe('URL de partage ChatGPT', () => {
  it.each([
    'http://chatgpt.com/share/abc', 'https://chatgpt.com:443/share/abc', 'https://user@chatgpt.com/share/abc',
    'https://chatgpt.com/share/abc?x=1', 'https://chatgpt.com/share/abc#x', 'https://chatgpt.com/share/',
    'https://chatgpt.com/share/abc/', 'https://evil.test/share/abc',
  ])('refuse %s sans requête', async (url) => {
    const fetcher = vi.fn();
    expect(validateChatGptShareUrl(url)).toBeUndefined();
    expect((await importChatGptShare(url, fetcher)).ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('lecture bornée et atomique', () => {
  it('distingue réseau, HTTP, CORS/échec et taille sans événements partiels', async () => {
    const network = await importChatGptShare(shareUrl, vi.fn().mockRejectedValue(new TypeError('CORS')));
    const http = await importChatGptShare(shareUrl, vi.fn().mockResolvedValue(response('', 404)));
    const oversized = await importChatGptShare(shareUrl, vi.fn().mockResolvedValue(response('x', 200, { 'content-length': String(CHATGPT_SHARE_LIMITS.maxBytes + 1) })));
    for (const result of [network, http, oversized]) {
      expect(result).toMatchObject({ ok: false, events: [] });
    }
    expect(network.ok ? undefined : network.error.code).toBe('network');
    expect(http.ok ? undefined : http.error.code).toBe('http');
    expect(oversized.ok ? undefined : oversized.error.code).toBe('response-too-large');
  });

  it('ne fait qu’une seule lecture avec des options sans cookies ni redirection', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(page({ author: { role: 'user' }, content: { parts: ['bonjour'] } })));
    await importChatGptShare(shareUrl, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store' });
  });

  it('annule un flux chunked dès que sa taille dépasse la borne', async () => {
    const canceled = vi.fn();
    let secondChunkSent = false;
    const body = new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(CHATGPT_SHARE_LIMITS.maxBytes)); },
      pull(controller) {
        if (!secondChunkSent) { secondChunkSent = true; controller.enqueue(new Uint8Array([1])); }
      },
      cancel: canceled,
    }));
    await expect(importChatGptShare(shareUrl, vi.fn().mockResolvedValue(body))).resolves.toMatchObject({
      ok: false, events: [], error: { code: 'response-too-large' },
    });
    expect(canceled).toHaveBeenCalledOnce();
  });

  it('renvoie un délai atomique lorsque la lecture dépasse la borne', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const pending = importChatGptShare(shareUrl, fetcher);
    await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
    await expect(pending).resolves.toMatchObject({ ok: false, events: [], error: { code: 'timeout' } });
    vi.useRealTimers();
  });

  it('conserve le code délai si le flux du corps est interrompu par le délai', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => Promise.resolve(new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
      },
    }))));
    const pending = importChatGptShare(shareUrl, fetcher);
    await vi.advanceTimersByTimeAsync(CHATGPT_SHARE_LIMITS.timeoutMs);
    await expect(pending).resolves.toMatchObject({ ok: false, events: [], error: { code: 'timeout' } });
    vi.useRealTimers();
  });
});

describe('structures publiques', () => {
  it('préserve le texte brut, l’ordre temporel, les rôles inconnus et déduplique seulement les IDs', () => {
    const result = extractChatGptShareEvents(page({ mapping: [
      { message: { id: 'b', author: { role: 'assistant' }, create_time: 20, content: { parts: ['<b>brut</b>'] } } },
      { message: { id: 'a', author: { role: 'mystery' }, create_time: 10, content: { parts: ['inconnu'] } } },
      { message: { id: 'b', author: { role: 'assistant' }, create_time: 21, content: { parts: ['doublon'] } } },
      { author: { role: 'tool' }, content: { parts: ['même texte'] } },
      { author: { role: 'tool' }, content: { parts: ['même texte'] } },
    ] }));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events.map(({ role, text }) => [role, text])).toEqual([
      ['assistant', '<b>brut</b>'], ['mystery', 'inconnu'], ['tool', 'même texte'], ['tool', 'même texte'],
    ]);
  });

  it('ne duplique pas un même nœud imbriqué sans identifiant', () => {
    const result = extractChatGptShareEvents(page({ mapping: { one: { message: { author: { role: 'user' }, content: { parts: ['unique'] } } } } }));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events).toHaveLength(1);
  });

  it('décode le flux React Router indexé', () => {
    const stream = [{ _1: 2 }, 'message', { _3: 4, _7: 8 }, 'author', { _5: 6 }, 'role', 'assistant', 'content', { _9: 10 }, 'parts', [11], 'visible'];
    const result = extractChatGptShareEvents(`<script>window.streamController.enqueue(${JSON.stringify(JSON.stringify(stream))});</script>`);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events[0]).toMatchObject({ role: 'assistant', text: 'visible' });
  });

  it('décode un état JSON sérialisé dans JSON.parse sans exécuter le script', () => {
    const state = { author: { role: 'user' }, content: { parts: ['JSON public'] } };
    const result = extractChatGptShareEvents(`<script>window.__next = JSON.parse(${JSON.stringify(JSON.stringify(state))})</script>`);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events[0]).toMatchObject({ role: 'user', text: 'JSON public' });
  });

  it('préserve l’ordre documentaire mixte lorsqu’une date manque', () => {
    const result = extractChatGptShareEvents(page({ messages: [
      { author: { role: 'user' }, create_time: 20, content: { parts: ['premier'] } },
      { author: { role: 'assistant' }, content: { parts: ['sans date'] } },
      { author: { role: 'user' }, create_time: 10, content: { parts: ['dernier'] } },
    ] }));
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events.map(({ text }) => text)).toEqual(['premier', 'sans date', 'dernier']);
  });

  it('refuse atomiquement un format inconnu ou une limite de messages', () => {
    const unknown = extractChatGptShareEvents('<html>sans état</html>');
    const limited = extractChatGptShareEvents(page({ messages: [
      { author: { role: 'user' }, content: { parts: ['un'] } }, { author: { role: 'assistant' }, content: { parts: ['deux'] } },
    ] }), 1);
    expect(unknown).toMatchObject({ ok: false, events: [], error: { code: 'format-unknown' } });
    expect(limited).toMatchObject({ ok: false, events: [], error: { code: 'too-many-events' } });
  });
});
