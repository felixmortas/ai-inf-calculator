import { describe, expect, it } from 'vitest';
import { claudeShareProvider, extractClaudeShareEvents, validateClaudeShareUrl } from './claudeShare';
import { extractGeminiShareEvents, geminiShareProvider, GEMINI_REDIRECT_POLICY, validateGeminiShareUrl } from './geminiShare';
import { extractMistralShareEvents, mistralShareProvider, validateMistralShareUrl } from './mistralShare';
import claudeFixture from './fixtures/claude-share-minimal.html?raw';
import mistralFixture from './fixtures/mistral-share-minimal.html?raw';
import geminiFixture from './fixtures/gemini-share-minimal.html?raw';

const html = (attribute: string, state: unknown) => `<script ${attribute}>${JSON.stringify(state)}</script>`;

describe('adaptateurs locaux Claude, Mistral et Gemini', () => {
  it.each([
    ['Claude', validateClaudeShareUrl, 'https://claude.ai/share/123e4567-e89b-12d3-a456-426614174000'],
    ['Mistral', validateMistralShareUrl, 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000'],
    ['Gemini', validateGeminiShareUrl, 'https://share.gemini.google/Ab12Cd34Ef56'],
  ])('%s canonicalise une URL exacte et refuse ses variantes', (_name, validate, url) => {
    expect(validate(url)).toBe(url);
    for (const invalid of [url.replace('https:', 'http:'), `${url}?x=1`, `${url}#x`, `${url}/`, url.replace('https://', 'https://user@'), url.replace('https://', 'https://example.com/'), url.replace(/^https:\/\/([^/]+)/, 'https://$1:444'), `https://claude.ai/share/${'x'.repeat(2_049)}`]) expect(validate(invalid)).toBeUndefined();
  });

  it.each([
    ['Claude', extractClaudeShareEvents, claudeFixture],
    ['Mistral', extractMistralShareEvents, mistralFixture],
    ['Gemini', extractGeminiShareEvents, geminiFixture],
  ])('%s préserve deux rôles et signale le contenu inaccessible sans le lire', (_name, extract, fixture) => {
    const result = extract(fixture);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events.map(({ role, text, order }) => [role, text, order])).toEqual([
      ['user', 'Bonjour', 1], ['assistant', 'Salut', 2], ['inaccessible-content', '', 3],
    ]);
  });

  it.each([
    ['Claude', extractClaudeShareEvents, claudeFixture],
    ['Mistral', extractMistralShareEvents, mistralFixture],
    ['Gemini', extractGeminiShareEvents, geminiFixture],
  ])('%s refuse atomiquement les limites de taille et d’événements', (_name, extract, fixture) => {
    expect(extract(fixture, { maxBytes: 10_000, maxEvents: 1 })).toMatchObject({ ok: false, events: [], error: { code: 'too-many-events' } });
    expect(extract(fixture, { maxBytes: 1, maxEvents: 10 })).toMatchObject({ ok: false, events: [], error: { code: 'response-too-large' } });
    expect(extract(fixture, { maxBytes: Number.NaN, maxEvents: Number.POSITIVE_INFINITY })).toMatchObject({ ok: false, events: [], error: { code: 'configuration' } });
  });

  it('normalise model en assistant pour Gemini et déclare sa politique de redirection', () => {
    const result = extractGeminiShareEvents(geminiFixture);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events.map((event) => event.role)).toEqual(['user', 'assistant', 'inaccessible-content']);
    expect(GEMINI_REDIRECT_POLICY).toEqual({ maxRedirects: 1, allowedOrigins: ['https://share.gemini.google', 'https://gemini.google.com'] });
  });

  it('refuse les identifiants hors contrat avant toute attestation', () => {
    expect(validateClaudeShareUrl('https://claude.ai/share/123e4567-e89b-12d3-a456-42661417400g')).toBeUndefined();
    expect(validateMistralShareUrl('https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-42661417400')).toBeUndefined();
    expect(validateGeminiShareUrl('https://share.gemini.google/Ab12Cd34Ef5')).toBeUndefined();
    expect(validateGeminiShareUrl('https://share.gemini.google/Ab12Cd34Ef56-')).toBeUndefined();
  });

  it.each([
    ['Claude', extractClaudeShareEvents], ['Mistral', extractMistralShareEvents], ['Gemini', extractGeminiShareEvents],
  ])('%s refuse une structure inconnue sans événement', (_name, extract) => {
    expect(extract('<html>aucun état public</html>')).toMatchObject({ ok: false, events: [], error: { code: 'format-unknown' } });
  });

  it('ne partage pas les heuristiques HTML entre adaptateurs', () => {
    expect(claudeShareProvider.extract!(html('data-mistral-share', { messages: [] }))).toMatchObject({ ok: false, error: { code: 'format-unknown' } });
  });

  it('ignore un attribut ressemblant et poursuit après un état malformé', () => {
    const source = '<script data-notdata-claude-share>{"turns":[{"role":"user","content":"à ignorer"}]}</script>'
      + '<script data-claude-share>invalide</script>' + claudeFixture;
    const result = extractClaudeShareEvents(source);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.events[0]).toMatchObject({ role: 'user', text: 'Bonjour' });
  });

  it.each([
    ['Claude', claudeShareProvider, 'https://claude.ai/share/123e4567-e89b-12d3-a456-426614174000'],
    ['Mistral', mistralShareProvider, 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000'],
    ['Gemini', geminiShareProvider, 'https://share.gemini.google/Ab12Cd34Ef56'],
  ])('%s ne déclenche aucune récupération distante dans ce socle local', async (_name, provider, url) => {
    await expect(provider.importFromUrl(url)).resolves.toMatchObject({ ok: false, events: [], error: { code: 'policy' } });
  });
});
