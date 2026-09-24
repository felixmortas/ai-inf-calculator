import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const styleSource = readFileSync('src/ui/styles.css', 'utf8');

describe('styles d’accessibilité et responsive', () => {
  it('prévoit un focus visible et une mise en page pour petit écran', () => {
    expect(styleSource).toContain(':focus-visible');
    expect(styleSource).toContain('@media (max-width: 30rem)');
    expect(styleSource).toContain('.good-practices');
    expect(styleSource).toContain('prefers-reduced-motion');
  });

  it('fait tourner les chevrons des menus et des échanges selon leur état', () => {
    expect(styleSource).toContain('.advanced-settings[open] > summary .chevron');
    expect(styleSource).toContain('.conversation-block.is-expanded .conversation-block-heading .chevron');
    expect(styleSource).toContain('.optional-contents[open] > summary::after');
    expect(styleSource).toContain('transform: rotate(180deg)');
  });

  it('garde les actions d’échange sur leur ligne aux petits écrans', () => {
    expect(styleSource).toContain('.conversation-block-heading { align-items: center; flex-direction: row;');
    expect(styleSource).toContain('.conversation-actions-after-thread { align-items: center; flex-direction: row;');
  });
});
