import { describe, expect, it, vi } from 'vitest';
import { allImportProviders, importProviders, resolveShare } from './registry';
import { createRemoteGateway, createRemoteGatewayConsent, PRODUCTION_IMPORT_ENDPOINT } from './remoteGateway';
import type { ResolvedShare } from './types';

const mistralUrl = 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000';
const foreignUrl = 'https://chatgpt.com/share/123e4567-e89b-12d3-a456-426614174000';

describe('frontière publiée Mistral', () => {
  it('résout uniquement Mistral et conserve les anciens adaptateurs isolés', () => {
    expect(importProviders.map((provider) => provider.id)).toEqual(['mistral']);
    expect(allImportProviders.map((provider) => provider.id)).toEqual(['chatgpt', 'claude', 'mistral', 'gemini']);
    expect(resolveShare(mistralUrl)?.providerId).toBe('mistral');
    expect(resolveShare(foreignUrl)).toBeUndefined();
  });

  it('refuse une résolution et une attestation non Mistral sans réseau', async () => {
    const foreign = Object.freeze({ providerId: 'chatgpt', canonicalUrl: foreignUrl, limits: allImportProviders[0].limits!, policyVersion: allImportProviders[0].policyVersion! }) as ResolvedShare;
    const fetcher = vi.fn();
    expect(createRemoteGatewayConsent(foreign)).toBeUndefined();
    const gateway = createRemoteGateway(fetcher, { endpoint: () => PRODUCTION_IMPORT_ENDPOINT });
    await expect(gateway.fetchHtml(foreign, {} as never)).resolves.toMatchObject({ ok: false, error: { code: 'consent-required' } });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
