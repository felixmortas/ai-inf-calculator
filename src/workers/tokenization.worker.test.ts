import { describe, expect, it } from 'vitest';
import { tokenizationEncoding, tokenizationFingerprint } from '../domain/tokenization';
import { processTokenizationRequest } from './tokenization.worker';

describe('tokenization worker', () => {
  const texts = { message: 'hello world', finalResponse: '', visibleReasoning: '', artifact: '' };
  const request = {
    type: 'tokenize' as const,
    requestId: 'request-1',
    encoding: tokenizationEncoding,
    fingerprint: tokenizationFingerprint(tokenizationEncoding, texts),
    texts,
  };

  it('utilise o200k_base localement et dérive les données de corrélation', () => {
    const requestWithForgedFingerprint = { ...request, fingerprint: 'empreinte-falsifiée' };
    const response = processTokenizationRequest(requestWithForgedFingerprint);
    expect(response).toMatchObject({
      type: 'tokenized', requestId: request.requestId, encoding: tokenizationEncoding,
      fingerprint: tokenizationFingerprint(tokenizationEncoding, texts),
      counts: { message: 2, finalResponse: 0, visibleReasoning: 0, artifact: 0 },
    });
  });

  it('force les textes vides à zéro sans appeler le compteur injecté', () => {
    const response = processTokenizationRequest(request, () => 99);
    expect(response).toMatchObject({
      type: 'tokenized', counts: { message: 99, finalResponse: 0, visibleReasoning: 0, artifact: 0 },
    });
  });

  it('retourne une erreur structurée si la tokenisation échoue', () => {
    const response = processTokenizationRequest(request, () => { throw new Error('indisponible'); });
    expect(response).toMatchObject({
      type: 'tokenizationFailed', requestId: request.requestId, encoding: tokenizationEncoding,
      fingerprint: request.fingerprint, error: { code: 'tokenizer-unavailable' },
    });
  });
});
