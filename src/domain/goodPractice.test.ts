import { describe, expect, it } from 'vitest';
import { goodPracticeIds, goodPracticesBlogUrl, pickGoodPractice } from './goodPractice';

describe('pickGoodPractice', () => {
  it('choisit selon le tirage injecté, bornes comprises', () => {
    expect(pickGoodPractice(() => 0)).toBe(goodPracticeIds[0]);
    expect(pickGoodPractice(() => 0.999999)).toBe(goodPracticeIds[goodPracticeIds.length - 1]);
    expect(pickGoodPractice(() => 0.5)).toBe(goodPracticeIds[2]);
  });
  it('reste dans le catalogue pour un tirage hors bornes ou invalide', () => {
    for (const value of [-1, 1, 7, Number.NaN]) expect(goodPracticeIds).toContain(pickGoodPractice(() => value));
  });
  it('expose une URL externe unique', () => {
    expect(goodPracticesBlogUrl).toBe('https://example.org/bonnes-pratiques-ia');
  });
});
