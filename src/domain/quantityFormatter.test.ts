import { describe, expect, it } from 'vitest';
import { fr } from '../i18n/fr';
import { formatQuantity } from './quantityFormatter';

describe('quantités de présentation', () => {
  it('garde zéro dans les unités de base et nomme les unités', () => {
    expect(formatQuantity(0, 'carbon', fr, 'fr-FR')).toEqual({ display: '0 gCO₂e', accessible: '0 grammes de dioxyde de carbone équivalent' });
    expect(formatQuantity(0, 'water', fr, 'fr-FR').display).toBe('0 L');
    expect(formatQuantity(0, 'energy', fr, 'fr-FR').display).toBe('0 Wh');
    expect(formatQuantity(0, 'duration', fr, 'fr-FR').display).toBe('0 s');
  });

  it('bascule aux seuils après arrondi avec trois chiffres et virgule', () => {
    expect(formatQuantity(999.9, 'carbon', fr, 'fr-FR').display).toBe('1 kgCO₂e');
    expect(formatQuantity(0.0012, 'water', fr, 'fr-FR').display).toBe('1,2 mL');
    expect(formatQuantity(1000, 'energy', fr, 'fr-FR')).toEqual({ display: '1 kWh', accessible: '1 kilowattheure' });
    expect(formatQuantity(60, 'duration', fr, 'fr-FR').display).toBe('1 min');
    expect(formatQuantity(59.999, 'duration', fr, 'fr-FR')).toEqual({ display: '1 min', accessible: '1 minute' });
  });

  it('signale les valeurs sous le minimum et groupe les grandes valeurs sans exposant', () => {
    expect(formatQuantity(1e-11, 'carbon', fr, 'fr-FR').display).toBe('< 0,001 µgCO₂e');
    const huge = formatQuantity(1e25, 'energy', fr, 'fr-FR');
    expect(huge.display).toContain('valeur très élevée');
    expect(huge.display).not.toMatch(/[eE][+-]?\d/);
  });
});

describe('durées (ampoule LED, douche)', () => {
  it('affiche zéro en secondes', () => {
    expect(formatQuantity(0, 'duration', fr, 'fr-FR')).toEqual({ display: '0 s', accessible: '0 secondes' });
  });
  it('affiche « moins de » sous le seuil de 0,001 ms', () => {
    expect(formatQuantity(1e-7, 'duration', fr, 'fr-FR')).toEqual({ display: '< 0,001 ms', accessible: 'moins de 0,001 millisecondes' });
  });
  it('bascule d’une unité à la suivante au seuil', () => {
    expect(formatQuantity(59, 'duration', fr, 'fr-FR').display).toBe('59 s');
    expect(formatQuantity(60, 'duration', fr, 'fr-FR').display).toBe('1 min');
    expect(formatQuantity(3600, 'duration', fr, 'fr-FR').display).toBe('1 h');
    expect(formatQuantity(86400, 'duration', fr, 'fr-FR').display).toBe('1 j');
    expect(formatQuantity(59.99, 'duration', fr, 'fr-FR').display).toBe('1 min');
  });
  it('signale une valeur très élevée en jours au-delà de 999 j', () => {
    const big = formatQuantity(86400 * 1500, 'duration', fr, 'fr-FR');
    expect(big.display.replace(/\s/gu, ' ')).toBe('1 500 j (valeur très élevée)');
    expect(big.accessible.replace(/\s/gu, ' ')).toBe('1 500 jours (valeur très élevée)');
  });
});
