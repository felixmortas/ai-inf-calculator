import { describe, expect, it } from 'vitest';
import { formatQuantity } from './quantityFormatter';

describe('quantités de présentation', () => {
  it('garde zéro dans les unités de base et nomme les unités', () => {
    expect(formatQuantity(0, 'carbon')).toEqual({ display: '0 gCO₂e', accessible: '0 grammes de dioxyde de carbone équivalent' });
    expect(formatQuantity(0, 'water').display).toBe('0 L');
    expect(formatQuantity(0, 'energy').display).toBe('0 Wh');
    expect(formatQuantity(0, 'duration').display).toBe('0 s');
  });

  it('bascule aux seuils après arrondi avec trois chiffres et virgule', () => {
    expect(formatQuantity(999.9, 'carbon').display).toBe('1 kgCO₂e');
    expect(formatQuantity(0.0012, 'water').display).toBe('1,2 mL');
    expect(formatQuantity(1000, 'energy')).toEqual({ display: '1 kWh', accessible: '1 kilowattheure' });
    expect(formatQuantity(60, 'duration').display).toBe('1 min');
    expect(formatQuantity(59.999, 'duration')).toEqual({ display: '1 min', accessible: '1 minute' });
  });

  it('signale les valeurs sous le minimum et groupe les grandes valeurs sans exposant', () => {
    expect(formatQuantity(1e-11, 'carbon').display).toBe('< 0,001 µgCO₂e');
    const huge = formatQuantity(1e25, 'energy');
    expect(huge.display).toContain('valeur très élevée');
    expect(huge.display).not.toMatch(/[eE][+-]?\d/);
  });
});

describe('durées (ampoule LED, douche)', () => {
  it('affiche zéro en secondes', () => {
    expect(formatQuantity(0, 'duration')).toEqual({ display: '0 s', accessible: '0 secondes' });
  });
  it('affiche « moins de » sous le seuil de 0,001 ms', () => {
    expect(formatQuantity(1e-7, 'duration')).toEqual({ display: '< 0,001 ms', accessible: 'moins de 0,001 millisecondes' });
  });
  it('bascule d’une unité à la suivante au seuil', () => {
    expect(formatQuantity(59, 'duration').display).toBe('59 s');
    expect(formatQuantity(60, 'duration').display).toBe('1 min');
    expect(formatQuantity(3600, 'duration').display).toBe('1 h');
    expect(formatQuantity(86400, 'duration').display).toBe('1 j');
    expect(formatQuantity(59.99, 'duration').display).toBe('1 min');
  });
  it('signale une valeur très élevée en jours au-delà de 999 j', () => {
    const big = formatQuantity(86400 * 1500, 'duration');
    expect(big.display.replace(/\s/gu, ' ')).toBe('1 500 j (valeur très élevée)');
    expect(big.accessible.replace(/\s/gu, ' ')).toBe('1 500 jours (valeur très élevée)');
  });
});
