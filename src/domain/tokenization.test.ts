import { describe, expect, it } from 'vitest';
import {
  fallbackTokenCount,
  fallbackTokenization,
  isEmptyTokenizationText,
  tokenizationEncoding,
  tokenizationFingerprint,
} from './tokenization';

describe('tokenization domain', () => {
  const texts = { message: 'Bonjour', finalResponse: '', visibleReasoning: '', artifact: '' };

  it('garde une empreinte stable, versionnée et dépendante de l’encodage et du texte', () => {
    expect(tokenizationFingerprint(tokenizationEncoding, texts)).toBe(tokenizationFingerprint(tokenizationEncoding, texts));
    expect(tokenizationFingerprint(tokenizationEncoding, texts)).not.toBe(
      tokenizationFingerprint(tokenizationEncoding, { ...texts, message: 'Bonsoir' }),
    );
  });

  it('compte exactement zéro pour une chaîne vide', () => {
    expect(isEmptyTokenizationText('')).toBe(true);
    expect(fallbackTokenCount('')).toBe(0);
    expect(fallbackTokenization({ message: '', finalResponse: '', visibleReasoning: '', artifact: '' }).counts).toEqual({
      message: 0, finalResponse: 0, visibleReasoning: 0, artifact: 0,
    });
  });

  it('segmente les lettres Unicode et les nombres, puis applique mots / 0,75', () => {
    expect(fallbackTokenCount('été, 42… co-op !')).toBe(4 / 0.75);
    expect(fallbackTokenCount('   ')).toBe(0);
  });
});
