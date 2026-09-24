export type QuantityKind = 'carbon' | 'water' | 'energy' | 'duration';

const units = {
  carbon: [
    [1e-6, 'µgCO₂e', 'microgrammes de dioxyde de carbone équivalent'],
    [1e-3, 'mgCO₂e', 'milligrammes de dioxyde de carbone équivalent'],
    [1, 'gCO₂e', 'grammes de dioxyde de carbone équivalent'],
    [1e3, 'kgCO₂e', 'kilogrammes de dioxyde de carbone équivalent'],
    [1e6, 'tCO₂e', 'tonnes de dioxyde de carbone équivalent'],
  ],
  water: [
    [1e-6, 'µL', 'microlitres d’eau'], [1e-3, 'mL', 'millilitres d’eau'],
    [1, 'L', 'litres d’eau'], [1e3, 'kL', 'kilolitres d’eau'], [1e6, 'ML', 'mégalitres d’eau'],
  ],
  energy: [
    [1e-3, 'mWh', 'milliwattheures'], [1, 'Wh', 'wattheures'],
    [1e3, 'kWh', 'kilowattheures'], [1e6, 'MWh', 'mégawattheures'], [1e9, 'GWh', 'gigawattheures'],
  ],
  duration: [
    [1e-3, 'ms', 'millisecondes'], [1, 's', 'secondes'],
    [60, 'min', 'minutes'], [3600, 'h', 'heures'], [86400, 'j', 'jours'],
  ],
} as const;

export function formatQuantity(value: number, kind: QuantityKind): { display: string; accessible: string } {
  const series = units[kind];
  const baseIndex = kind === 'energy' || kind === 'duration' ? 1 : 2;
  if (value === 0) return { display: `0 ${series[baseIndex][1]}`, accessible: `0 ${series[baseIndex][2]}` };
  const magnitude = Math.abs(value);
  let index = 0;
  for (let candidate = 1; candidate < series.length; candidate++) {
    if (magnitude >= series[candidate][0]) index = candidate;
  }
  if (magnitude / series[0][0] < 0.001) {
    return { display: `< 0,001 ${series[0][1]}`, accessible: `moins de 0,001 ${series[0][2]}` };
  }
  while (index < series.length - 1 && Number((magnitude / series[index][0]).toPrecision(3)) >= series[index + 1][0] / series[index][0]) index++;
  const amount = Number((value / series[index][0]).toPrecision(3));
  const number = new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 3, maximumFractionDigits: 20, useGrouping: true, notation: 'standard' }).format(amount);
  const large = index === series.length - 1 && Math.abs(amount) >= 1000 ? ' (valeur très élevée)' : '';
  const unitName = Math.abs(amount) === 1 ? series[index][2].replace(/^(\S+)s(\b)/u, '$1$2') : series[index][2];
  return { display: `${number} ${series[index][1]}${large}`, accessible: `${number} ${unitName}${large}` };
}
