import { describe, expect, it } from 'vitest';
import { calculateImpact } from './impact';

const input = { newInputTokens: 10, cachedInputTokens: 20, outputTokens: 5, totalParameters: 100, activatedParameters: 10, inputRatio: .2, cacheRatio: .1, pue: 1.2, carbonIntensity: 100, wue: .5 };

describe('calculateImpact', () => {
  it('retourne les trois impacts finis, sans arrondi', () => {
    const result = calculateImpact(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.impact).toEqual({ energyWh: 0.0012107530757479148, carbonGco2e: 0.00012107530757479148, waterL: 6.053765378739574e-7 });
  });
  it('applique le PUE une seule fois avant le carbone et l’eau', () => {
    const one = calculateImpact({ ...input, pue: 1 });
    const two = calculateImpact({ ...input, pue: 2 });
    expect(one.ok && two.ok && two.impact.energyWh / one.impact.energyWh).toBe(2);
    expect(one.ok && two.ok && two.impact.carbonGco2e / one.impact.carbonGco2e).toBe(2);
    expect(one.ok && two.ok && two.impact.waterL / one.impact.waterL).toBe(2);
  });
  it.each([{ pue: .9 }, { totalParameters: 0 }, { activatedParameters: 101 }, { wue: -1 }, { carbonIntensity: Number.NaN }])('bloque les paramètres hors domaine: %o', (invalid) => {
    expect(calculateImpact({ ...input, ...invalid })).toEqual({ ok: false, code: 'invalid-parameters' });
  });
});
