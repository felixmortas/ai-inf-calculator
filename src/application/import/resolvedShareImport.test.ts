import { describe, expect, it, vi } from 'vitest';
import { claudeShareProvider } from './claudeShare';
import { geminiShareProvider } from './geminiShare';
import { mistralShareProvider } from './mistralShare';
import { createRemoteGateway, createRemoteGatewayConsent } from './remoteGateway';
import { isResolvedShare, providerForResolvedShare, resolveShare } from './registry';
import { importResolvedProviderShare } from './resolvedShareImport';

const configured = { apiKey: () => 'test-key' };
const cases = [
  [claudeShareProvider, 'https://claude.ai/share/opaque', '<script data-claude-share type="application/json">{"turns":[{"role":"user","content":"Bonjour"},{"role":"assistant","content":"Réponse"}]}</script>'],
  [mistralShareProvider, 'https://chat.mistral.ai/chat/opaque', '<script data-mistral-share type="application/json">{"messages":[{"role":"user","content":"Bonjour"},{"role":"assistant","content":"Réponse"}]}</script>'],
  [geminiShareProvider, 'https://share.gemini.google/opaque', '<script data-gemini-share type="application/json">{"turns":[{"role":"user","content":"Bonjour"},{"role":"model","content":"Réponse"}]}</script>'],
] as const;

describe('import de partage résolu', () => {
  it.each(cases)('extrait localement %s après une récupération attestée', async (provider, url, html) => {
    const resolved = resolveShare(url)!;
    const consent = createRemoteGatewayConsent(resolved, isResolvedShare, providerForResolvedShare)!;
    const gateway = { fetchHtml: vi.fn().mockResolvedValue({ ok: true as const, html }) };
    const result = await importResolvedProviderShare(resolved, consent, provider, gateway);
    expect(result).toMatchObject({ ok: true, providerId: provider.id, events: [{ role: 'user', text: 'Bonjour' }, { role: 'assistant', text: 'Réponse' }] });
  });

  it('refuse un fournisseur différent sans fetch, et un consentement déjà consommé', async () => {
    const resolved = resolveShare('https://claude.ai/share/opaque')!;
    const fetcher = vi.fn().mockResolvedValue(new Response('<script data-claude-share type="application/json">{"turns":[]}</script>'));
    const gateway = createRemoteGateway(fetcher, configured);
    const mismatch = await importResolvedProviderShare(resolved, undefined, mistralShareProvider, gateway);
    expect(mismatch).toMatchObject({ ok: false, error: { code: 'invalid-url' } });
    expect(fetcher).not.toHaveBeenCalled();

    const consent = createRemoteGatewayConsent(resolved, isResolvedShare, providerForResolvedShare)!;
    await importResolvedProviderShare(resolved, consent, claudeShareProvider, gateway);
    const repeated = await importResolvedProviderShare(resolved, consent, claudeShareProvider, gateway);
    expect(repeated).toMatchObject({ ok: false, error: { code: 'consent-required' } });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
