export type LedEquivalence =
  | { readonly status: 'available'; readonly seconds: number }
  | { readonly status: 'unavailable' };

/** Durée pendant laquelle une ampoule LED de `ledPowerW` consomme `energyWh` (Wh) : 3600·E/P secondes. */
export function calculateLedEquivalence(energyWh: number, ledPowerW: number): LedEquivalence {
  if (!Number.isFinite(energyWh) || energyWh < 0 || !Number.isFinite(ledPowerW) || ledPowerW <= 0) return Object.freeze({ status: 'unavailable' });
  const seconds = 3600 * energyWh / ledPowerW;
  return Number.isFinite(seconds) ? Object.freeze({ status: 'available', seconds }) : Object.freeze({ status: 'unavailable' });
}
