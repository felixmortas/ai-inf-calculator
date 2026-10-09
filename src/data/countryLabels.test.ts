import { describe, expect, it } from 'vitest';
import { hostingCountryOptions, isHostingCountry, userCountryOptions } from './modelCatalog';

describe('libellés de pays', () => {
  it('affiche les noms français en fr-FR, Monde en dernier', () => {
    const labels = new Map(userCountryOptions('fr-FR', 'Monde').map((option) => [option.code, option.label]));
    expect(labels.get('FR')).toBe('France');
    expect(labels.get('US')).toBe('États-Unis');
    expect(labels.get('WORLD')).toBe('Monde');
    expect(userCountryOptions('fr-FR', 'Monde').at(-1)?.code).toBe('WORLD');
    expect(hostingCountryOptions('fr-FR', 'Monde').find((option) => option.code === 'CH')?.label).toBe('Suisse');
  });

  it('propose tous les pays du catalogue, triés par libellé, comme pays d’hébergement', () => {
    const options = hostingCountryOptions('fr-FR', 'Monde');
    const codes = options.map((option) => option.code);
    expect(codes).toEqual(expect.arrayContaining(['DE', 'CN', 'FR', 'US']));
    expect(codes.at(-1)).toBe('WORLD');
    expect(codes.length).toBe(userCountryOptions('fr-FR', 'Monde').length);
    const labels = options.slice(0, -1).map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'fr-FR')));
    expect(isHostingCountry('DE')).toBe(true);
    expect(isHostingCountry('ZZ')).toBe(false);
    expect(isHostingCountry('WORLD')).toBe(true);
  });
});
