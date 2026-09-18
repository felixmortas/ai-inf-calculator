import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const styleSource = readFileSync('src/ui/styles.css', 'utf8');

describe('styles d’accessibilité et responsive', () => {
  it('prévoit un focus visible et une mise en page pour petit écran', () => {
    expect(styleSource).toContain(':focus-visible');
    expect(styleSource).toContain('@media (max-width: 30rem)');
  });
});
