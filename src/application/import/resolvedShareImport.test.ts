import { describe, expect, it, vi } from 'vitest';
import { claudeShareProvider } from './claudeShare';
import { geminiShareProvider } from './geminiShare';
import { mistralShareProvider } from './mistralShare';
import { createRemoteGateway, createRemoteGatewayConsent } from './remoteGateway';
import { isResolvedShare, providerForResolvedShare, resolveShare } from './registry';
import { importResolvedProviderShare } from './resolvedShareImport';

const configured = { endpoint: () => 'https://ai-inf-calculator-proxy.felix-mortas.workers.dev/v1/import-html' };
const cases = [
  [claudeShareProvider, 'https://claude.ai/share/123e4567-e89b-12d3-a456-426614174000', '<script data-claude-share type="application/json">{"turns":[{"role":"user","content":"Bonjour"},{"role":"assistant","content":"Réponse"}]}</script>'],
  [mistralShareProvider, 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000', '<script data-mistral-share type="application/json">{"messages":[{"role":"user","content":"Bonjour"},{"role":"assistant","content":"Réponse"}]}</script>'],
  [geminiShareProvider, 'https://share.gemini.google/Ab12Cd34Ef56', '<script data-gemini-share type="application/json">{"turns":[{"role":"user","content":"Bonjour"},{"role":"model","content":"Réponse"}]}</script>'],
] as const;

describe('import de partage résolu', () => {
  it.each(cases)('extrait localement %s avec une passerelle isolée', async (provider, url, html) => {
    const resolved = { providerId: provider.id as 'claude' | 'mistral' | 'gemini', canonicalUrl: url, limits: provider.limits!, policyVersion: provider.policyVersion! };
    const consent = undefined;
    const gateway = { fetchHtml: vi.fn().mockResolvedValue({ ok: true as const, html }) };
    const result = await importResolvedProviderShare(resolved, consent, provider, gateway);
    expect(result).toMatchObject({ ok: true, providerId: provider.id, events: [{ role: 'user', text: 'Bonjour' }, { role: 'assistant', text: 'Réponse' }] });
  });

  it('refuse un fournisseur différent sans fetch, et un consentement déjà consommé', async () => {
    const resolved = resolveShare('https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000')!;
    const fetcher = vi.fn().mockResolvedValue(new Response('<html><script data-mistral-share type="application/json">{"messages":[]}</script></html>'));
    const gateway = createRemoteGateway(fetcher, configured);
    const mismatch = await importResolvedProviderShare(resolved, undefined, claudeShareProvider, gateway);
    expect(mismatch).toMatchObject({ ok: false, error: { code: 'invalid-url' } });
    expect(fetcher).not.toHaveBeenCalled();

    const consent = createRemoteGatewayConsent(resolved, isResolvedShare, providerForResolvedShare)!;
    await importResolvedProviderShare(resolved, consent, mistralShareProvider, gateway);
    const repeated = await importResolvedProviderShare(resolved, consent, mistralShareProvider, gateway);
    expect(repeated).toMatchObject({ ok: false, error: { code: 'consent-required' } });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
