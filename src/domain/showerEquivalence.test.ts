import { describe, expect, it } from 'vitest';
import { defaultShowerParameters } from '../data/modelCatalog';
import { calculateShowerEquivalence } from './showerEquivalence';

describe('calculateShowerEquivalence', () => {
  it('conserve une durée non arrondie calculée à partir du seul carbone', () => {
    const result = calculateShowerEquivalence(100, 500, defaultShowerParameters);
    expect(result).toEqual({ status: 'available', seconds: 60 * 100 / (15 * 0.0232 * 500), factorSource: 'country' });
  });

  it('signale le repli Monde sans modifier la durée', () => {
    expect(calculateShowerEquivalence(10, 473, defaultShowerParameters, 'world')).toMatchObject({ status: 'available', factorSource: 'world' });
  });

  it('ne produit jamais Infinity lorsque les émissions par minute sont nulles', () => {
    expect(calculateShowerEquivalence(10, 0, defaultShowerParameters)).toEqual({ status: 'unavailable' });
    expect(calculateShowerEquivalence(10, 473, { ...defaultShowerParameters, flowLitresPerMinute: 0 })).toEqual({ status: 'unavailable' });
  });
});
