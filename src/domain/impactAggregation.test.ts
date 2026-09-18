import { describe, expect, it } from 'vitest';
import { aggregateImpacts } from './impactAggregation';

describe('aggregateImpacts', () => {
  it('additionne les valeurs brutes sans arrondi', () => {
    expect(aggregateImpacts([
      { energyWh: 0.1, carbonGco2e: 0.2, waterL: 0.3 },
      { energyWh: 0.02, carbonGco2e: 0.04, waterL: 0.06 },
    ])).toEqual({ ok: true, total: { energyWh: 0.12000000000000001, carbonGco2e: 0.24000000000000002, waterL: 0.36 } });
  });

  it('distingue une liste vide d’un impact invalide', () => {
    expect(aggregateImpacts([])).toEqual({ ok: false, code: 'empty' });
    expect(aggregateImpacts([{ energyWh: Number.NaN, carbonGco2e: 0, waterL: 0 }])).toEqual({ ok: false, code: 'invalid-impact' });
  });
});
