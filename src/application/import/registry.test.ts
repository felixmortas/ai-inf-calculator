import { describe, expect, it } from 'vitest';
import { activeImportProviders, allImportProviders, isResolvedShare, providerForResolvedShare, resolveShare } from './registry';

describe('registre fermé des partages', () => {
  it('résout et atteste les quatre URL publiques sans accès réseau', () => {
    const shares = [
      'https://chatgpt.com/share/abc-123',
      'https://claude.ai/share/opaque_id',
      'https://chat.mistral.ai/chat/opaque_id',
      'https://share.gemini.google/opaque_id',
    ].map(resolveShare);
    expect(shares.every(isResolvedShare)).toBe(true);
    expect(shares.every((share) => Object.isFrozen(share))).toBe(true);
    expect(shares.map((share) => share && providerForResolvedShare(share)?.id)).toEqual(['chatgpt', 'claude', 'mistral', 'gemini']);
    expect(allImportProviders.map(({ id }) => id)).toEqual(['chatgpt', 'claude', 'mistral', 'gemini']);
    expect(activeImportProviders.map(({ id }) => id)).toEqual(['chatgpt']);
  });

  it('refuse un clone ou une capacité forgée', () => {
    const resolved = resolveShare('https://claude.ai/share/opaque_id');
    expect(resolved).toBeDefined();
    expect(isResolvedShare({ ...resolved! })).toBe(false);
    expect(isResolvedShare({ providerId: 'claude', canonicalUrl: 'https://claude.ai/share/opaque_id' })).toBe(false);
    expect(providerForResolvedShare({ ...resolved! })).toBeUndefined();
  });
});
