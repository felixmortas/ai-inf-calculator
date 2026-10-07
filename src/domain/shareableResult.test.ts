import { describe, expect, it } from 'vitest';
import { buildShareText, type ShareableResult } from './shareableResult';

const base: ShareableResult = {
  chatbot: 'ChatGPT', exchangeCount: 2, showerAccessible: '3 secondes',
  carbon: '1 gramme de dioxyde de carbone équivalent', electricity: '3 wattheures', water: '2 millilitres d’eau', pageUrl: 'https://x.test/app/',
};

describe('buildShareText', () => {
  it('produit le texte dans l’ordre prévu', () => {
    expect(buildShareText(base).split('\n')).toEqual([
      'Ma conversation avec ChatGPT (2 échanges) a eu un impact environnemental équivalent à environ 3 secondes de douche chaude 🚿.',
      'Cela représente : 1 gramme de dioxyde de carbone équivalent 🪨 et 3 wattheures d’électricité ⚡.',
      'Pour le refroidissement des data centers, environ 2 millilitres d’eau ont été consommés 💦.',
      'Il s’agit d’une estimation que j’ai réalisée sur https://x.test/app/',
      'Toi aussi, estime l’impact environnemental de ta conversation avec l’IA et partageons des bonnes pratiques pour le réduire ! ☘️🤝💥',
    ]);
  });
  it('omet l’équivalence douche quand elle est indisponible', () => {
    const text = buildShareText({ ...base, showerAccessible: undefined, exchangeCount: 1 });
    expect(text).not.toMatch(/douche/);
    expect(text).toContain('(1 échange) a eu un impact environnemental.');
    expect(text).toContain('Cela représente');
  });
});
