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
  it('accepte des constantes injectées et refuse les diviseurs nuls', () => {
    expect(calculateImpact({ ...input, constants: { batchSize: 32, gpuInstalledPerServer: 8, serverPowerWithoutGpuW: 1200, gpuMemoryGb: 80, quantizationBits: 16, memoryOverhead: 1.2, energyAlpha: 1.17e-6, energyBeta: -.01, energyGamma: 1e-5, latencyAlpha: 1e-5, latencyBeta: 1e-5, latencyGamma: 1e-5 } }).ok).toBe(true);
    expect(calculateImpact({ ...input, constants: { batchSize: 0, gpuInstalledPerServer: 8, serverPowerWithoutGpuW: 1200, gpuMemoryGb: 80, quantizationBits: 16, memoryOverhead: 1.2, energyAlpha: 0, energyBeta: 0, energyGamma: 0, latencyAlpha: 0, latencyBeta: 0, latencyGamma: 0 } })).toEqual({ ok: false, code: 'invalid-parameters' });
  });
});
