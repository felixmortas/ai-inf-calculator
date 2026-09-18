import type { ImpactResult } from './impact';

export interface ImpactTotal {
  readonly energyWh: number;
  readonly carbonGco2e: number;
  readonly waterL: number;
}

export type ImpactAggregation =
  | { readonly ok: true; readonly total: ImpactTotal }
  | { readonly ok: false; readonly code: 'empty' | 'invalid-impact' };

function isValidImpact(impact: ImpactResult): boolean {
  return [impact.energyWh, impact.carbonGco2e, impact.waterL]
    .every((value) => Number.isFinite(value) && value >= 0);
}

/** Additionne les valeurs brutes du domaine, sans jamais les formater ni les arrondir. */
export function aggregateImpacts(impacts: readonly ImpactResult[]): ImpactAggregation {
  if (impacts.length === 0) return { ok: false, code: 'empty' };
  if (!impacts.every(isValidImpact)) return { ok: false, code: 'invalid-impact' };
  const total = impacts.reduce<ImpactTotal>((sum, impact) => ({
    energyWh: sum.energyWh + impact.energyWh,
    carbonGco2e: sum.carbonGco2e + impact.carbonGco2e,
    waterL: sum.waterL + impact.waterL,
  }), { energyWh: 0, carbonGco2e: 0, waterL: 0 });
  return [total.energyWh, total.carbonGco2e, total.waterL].every(Number.isFinite)
    ? { ok: true, total: Object.freeze(total) }
    : { ok: false, code: 'invalid-impact' };
}
