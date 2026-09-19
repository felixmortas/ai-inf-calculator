import type { ShowerParameters } from '../data/modelCatalog';

export type ShowerEquivalence =
  | { readonly status: 'available'; readonly seconds: number; readonly factorSource: 'country' | 'world' }
  | { readonly status: 'unavailable' };

/** Calcule seulement une durée carbone : aucune comparaison de volume d’eau. */
export function calculateShowerEquivalence(
  carbonGco2e: number,
  factorGco2ePerKwh: number | undefined,
  shower: ShowerParameters,
  factorSource: 'country' | 'world' = 'country',
): ShowerEquivalence {
  const perMinute = shower.flowLitresPerMinute * shower.energyKwhPerLitre * (factorGco2ePerKwh ?? Number.NaN);
  if (![carbonGco2e, perMinute].every(Number.isFinite) || carbonGco2e < 0 || perMinute <= 0) return Object.freeze({ status: 'unavailable' });
  const seconds = 60 * carbonGco2e / perMinute;
  return Number.isFinite(seconds) ? Object.freeze({ status: 'available', seconds, factorSource }) : Object.freeze({ status: 'unavailable' });
}
