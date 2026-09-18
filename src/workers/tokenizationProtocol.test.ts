import { describe, expect, it } from 'vitest';
import { isTokenizationResponse } from './tokenizationProtocol';

describe('tokenization protocol', () => {
  const correlation = { requestId: 'request-1', encoding: 'o200k_base', fingerprint: 'fingerprint' } as const;

  it('refuse les réponses de succès aux comptes incomplets ou invalides', () => {
    expect(isTokenizationResponse({ type: 'tokenized', ...correlation, counts: {
      message: 1, finalResponse: 0, visibleReasoning: 0,
    } })).toBe(false);
    expect(isTokenizationResponse({ type: 'tokenized', ...correlation, counts: {
      message: Number.NaN, finalResponse: 0, visibleReasoning: 0, artifact: 0,
    } })).toBe(false);
  });

  it('accepte une erreur structurée connue', () => {
    expect(isTokenizationResponse({
      type: 'tokenizationFailed', ...correlation, error: { code: 'tokenizer-unavailable' },
    })).toBe(true);
  });
});
