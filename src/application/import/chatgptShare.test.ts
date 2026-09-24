import { describe, expect, it, vi } from 'vitest';
import {
  CHATGPT_SHARE_LIMITS,
  extractChatGptShareEvents,
  chatGptShareProvider,
  importChatGptShare,
  importResolvedChatGptShare,
  validateChatGptShareUrl,
} from './chatgptShare';
import {
  CHATGPT_SHARE_LIMITS as pureChatGptShareLimits,
  validateChatGptShareUrl as pureValidateChatGptShareUrl,
} from './chatgptShareUrl';
import type { RemoteGateway } from './remoteGateway';
import { importProviderById, importProviders } from './registry';

const shareUrl = 'https://chatgpt.com/share/123e4567-e89b-12d3-a456-426614174000';
const page = (value: unknown) => `<script type="application/json">${JSON.stringify(value)}</script>`;

describe('registre d’import', () => {
  it('publie Mistral seul tout en conservant l’adaptateur historique isolé', () => {
    expect(importProviders.map(({ id }) => id)).toEqual(['mistral']);
    expect(importProviderById('claude')).toBeUndefined();
  });
});

describe('URL de partage ChatGPT', () => {
  it('conserve les exports publics du validateur et des limites', () => {
    expect(validateChatGptShareUrl).toBe(pureValidateChatGptShareUrl);
    expect(CHATGPT_SHARE_LIMITS).toBe(pureChatGptShareLimits);
  });

  it.each([
    'http://chatgpt.com/share/abc', 'https://chatgpt.com:443/share/abc', 'https://user@chatgpt.com/share/abc',
    'https://chatgpt.com/share/abc?x=1', 'https://chatgpt.com/share/abc#x', 'https://chatgpt.com/share/',
    'https://chatgpt.com/share/abc/', 'https://evil.test/share/abc', `https://chatgpt.com/share/${'a'.repeat(2_049)}`,
  ])('refuse %s sans requête', async (url) => {
    const gateway: RemoteGateway = { fetchHtml: vi.fn() };
    expect(validateChatGptShareUrl(url)).toBeUndefined();
    expect((await importChatGptShare(url, undefined, gateway)).ok).toBe(false);
    expect(gateway.fetchHtml).not.toHaveBeenCalled();
  });
});

describe('adaptateur ChatGPT avec passerelle injectée', () => {
  it('transmet seulement le HTML borné au parseur local', async () => {
    const gateway: RemoteGateway = {
      fetchHtml: vi.fn().mockResolvedValue({ ok: true, html: page({ author: { role: 'user' }, content: { parts: ['bonjour'] } }) }),
    };
    const resolved = Object.freeze({ providerId: 'chatgpt' as const, canonicalUrl: shareUrl, limits: chatGptShareProvider.limits!, policyVersion: chatGptShareProvider.policyVersion! });
    const consent = undefined;
    const result = await importResolvedChatGptShare(resolved, consent, gateway);
    expect(gateway.fetchHtml).toHaveBeenCalledWith(resolved, consent);
    expect(result).toMatchObject({ ok: true, events: [{ role: 'user', text: 'bonjour' }] });
  });

  it('garde les erreurs de la passerelle atomiques sans lancer le parseur', async () => {
    const gateway: RemoteGateway = {
      fetchHtml: vi.fn().mockResolvedValue({ ok: false, error: { code: 'consent-required', message: 'Consentement requis.' } }),
    };
    await expect(importChatGptShare(shareUrl, undefined, gateway)).resolves.toMatchObject({
      ok: false, events: [], error: { code: 'consent-required' },
    });
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
