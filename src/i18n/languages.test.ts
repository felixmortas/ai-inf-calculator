import { describe, expect, it } from 'vitest';
import { fr } from './fr';
import { detectLanguage, languages, type LanguageEntry } from './languages';

const yy: LanguageEntry = { code: 'yy', label: 'Yyyy', intlLocale: 'yy-ZZ', messages: { ...fr, startAction: 'Start-yy' } };
const registry = [languages[0], yy];

/** Liste ordonnée des chemins de clés, pour comparer la structure de deux fichiers de langue. */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [`${prefix}[${value.length}]`, ...value.flatMap((item, index) => keyPaths(item, `${prefix}[${index}]`))];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => keyPaths(item, `${prefix}.${key}`));
  return [prefix];
}

describe('detectLanguage', () => {
  it('retient la première langue du navigateur présente au registre', () => {
    expect(detectLanguage(['xx-YY', 'yy-ZZ', 'fr-FR'], registry)).toBe('yy');
  });
  it('ignore la région et la casse', () => {
    expect(detectLanguage(['YY_zz'], registry)).toBe('yy');
    expect(detectLanguage(['fr-CA'], registry)).toBe('fr');
  });
  it('se replie sur le français', () => {
    expect(detectLanguage(['xx-YY', 'zz'], registry)).toBe('fr');
    expect(detectLanguage([], registry)).toBe('fr');
  });
});

describe('registre des langues', () => {
  it.each(languages.map((entry) => [entry.code, entry] as const))('%s a les mêmes clés que fr', (_code, entry) => {
    expect(keyPaths(entry.messages)).toEqual(keyPaths(fr));
    expect(entry.label).toBeTruthy();
    expect(() => new Intl.NumberFormat(entry.intlLocale)).not.toThrow();
  });
  it('a des codes uniques', () => {
    expect(new Set(languages.map((entry) => entry.code)).size).toBe(languages.length);
  });
});
