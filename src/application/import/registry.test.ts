import { describe, expect, it } from 'vitest';
import { activeImportProviders, allImportProviders, isResolvedShare, providerForResolvedShare, resolveShare } from './registry';

describe('registre fermé des partages', () => {
  it('résout et atteste Mistral seul sans accès réseau', () => {
    const shares = [
      'https://chatgpt.com/share/123e4567-e89b-12d3-a456-426614174000',
      'https://claude.ai/share/123e4567-e89b-12d3-a456-426614174000',
      'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000',
      'https://share.gemini.google/Ab12Cd34Ef56',
    ].map(resolveShare);
    expect(shares.map(isResolvedShare)).toEqual([false, false, true, false]);
    expect(Object.isFrozen(shares[2])).toBe(true);
    expect(shares.map((share) => share && providerForResolvedShare(share)?.id)).toEqual([undefined, undefined, 'mistral', undefined]);
    expect(allImportProviders.map(({ id }) => id)).toEqual(['chatgpt', 'claude', 'mistral', 'gemini']);
    expect(activeImportProviders.map(({ id }) => id)).toEqual(['mistral']);
  });

  it('refuse un clone ou une capacité forgée', () => {
    const resolved = resolveShare('https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000');
    expect(resolved).toBeDefined();
    expect(isResolvedShare({ ...resolved! })).toBe(false);
    expect(isResolvedShare({ providerId: 'mistral', canonicalUrl: 'https://chat.mistral.ai/chat/123e4567-e89b-12d3-a456-426614174000' })).toBe(false);
    expect(providerForResolvedShare({ ...resolved! })).toBeUndefined();
  });
});
