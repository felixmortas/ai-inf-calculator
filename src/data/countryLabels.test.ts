import { describe, expect, it } from 'vitest';
import { hostingCountryOptions, userCountryOptions } from './modelCatalog';

describe('libellés de pays', () => {
  it('affiche les noms français en fr-FR, Monde en dernier', () => {
    const labels = new Map(userCountryOptions('fr-FR', 'Monde').map((option) => [option.code, option.label]));
    expect(labels.get('FR')).toBe('France');
    expect(labels.get('US')).toBe('États-Unis');
    expect(labels.get('WORLD')).toBe('Monde');
    expect(userCountryOptions('fr-FR', 'Monde').at(-1)?.code).toBe('WORLD');
    expect(hostingCountryOptions('fr-FR', 'Monde').find((option) => option.code === 'CH')?.label).toBe('Suisse');
  });
});
