import type { Messages } from '../i18n/fr';

export type QuantityKind = 'carbon' | 'water' | 'energy' | 'duration';

/** Facteurs d’échelle (par rapport à l’unité de base) ; les noms d’unités viennent des messages. */
const scales = {
  carbon: [1e-6, 1e-3, 1, 1e3, 1e6],
  water: [1e-6, 1e-3, 1, 1e3, 1e6],
  energy: [1e-3, 1, 1e3, 1e6, 1e9],
  duration: [1e-3, 1, 60, 3600, 86400],
} as const;

export function formatQuantity(value: number, kind: QuantityKind, messages: Messages, locale: string): { display: string; accessible: string } {
  const scale = scales[kind];
  const names = messages.units[kind];
  const baseIndex = kind === 'energy' || kind === 'duration' ? 1 : 2;
  if (value === 0) return { display: `0 ${names[baseIndex].symbol}`, accessible: `0 ${names[baseIndex].other}` };
  const magnitude = Math.abs(value);
  let index = 0;
  for (let candidate = 1; candidate < scale.length; candidate++) {
    if (magnitude >= scale[candidate]) index = candidate;
  }
  if (magnitude / scale[0] < 0.001) {
    const threshold = new Intl.NumberFormat(locale).format(0.001);
    return { display: messages.belowThreshold(threshold, names[0].symbol), accessible: messages.belowThresholdAccessible(threshold, names[0].other) };
  }
  while (index < scale.length - 1 && Number((magnitude / scale[index]).toPrecision(3)) >= scale[index + 1] / scale[index]) index++;
  const amount = Number((value / scale[index]).toPrecision(3));
  const number = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3, maximumFractionDigits: 20, useGrouping: true, notation: 'standard' }).format(amount);
  const large = index === scale.length - 1 && Math.abs(amount) >= 1000 ? ` ${messages.veryHigh}` : '';
  const unitName = Math.abs(amount) === 1 ? names[index].one : names[index].other;
  return { display: `${number} ${names[index].symbol}${large}`, accessible: `${number} ${unitName}${large}` };
}
