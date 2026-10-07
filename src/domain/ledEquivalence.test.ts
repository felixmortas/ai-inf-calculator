import { describe, expect, it } from 'vitest';
import { calculateLedEquivalence } from './ledEquivalence';

describe('calculateLedEquivalence', () => {
  it('convertit des Wh en secondes d’ampoule : 3600·E/P', () => {
    expect(calculateLedEquivalence(1, 5)).toEqual({ status: 'available', seconds: 720 });
    expect(calculateLedEquivalence(0.5, 10)).toEqual({ status: 'available', seconds: 180 });
  });
  it('accepte une énergie nulle', () => {
    expect(calculateLedEquivalence(0, 5)).toEqual({ status: 'available', seconds: 0 });
  });
  it('est non calculable pour une puissance nulle, négative ou non finie, sans durée infinie', () => {
    for (const power of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(calculateLedEquivalence(1, power)).toEqual({ status: 'unavailable' });
  });
  it('est non calculable pour une énergie négative ou non finie', () => {
    for (const energy of [-1, Number.NaN, Number.POSITIVE_INFINITY]) expect(calculateLedEquivalence(energy, 5)).toEqual({ status: 'unavailable' });
  });
  it('est non calculable en cas de dépassement', () => {
    expect(calculateLedEquivalence(Number.MAX_VALUE, 1e-300)).toEqual({ status: 'unavailable' });
  });
});
