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

  it('rend la barre d’action collante statique à fort zoom, en hauteur réduite ou clavier ouvert', () => {
    expect(styleSource).toContain('.sticky-actions { position: sticky;');
    expect(styleSource).toContain('scroll-padding-bottom');
    expect(styleSource).toContain('@media (max-height: 30rem)');
    expect(styleSource).toContain('.keyboard-open .sticky-actions');
  });

  it('espace le Mode avancé et les paramètres du Mode expert comme les autres paramètres', () => {
    expect(styleSource).toContain('.advanced-settings { margin-top: 1rem; }');
    expect(styleSource).toContain('.parameter-form .expert-settings .field { margin-top: .7rem; }');
  });

  it('garde le bouton Modifier du modèle sur une seule ligne', () => {
    expect(styleSource).toContain('.thread-reference button { flex-shrink: 0; white-space: nowrap; }');
    expect(styleSource).not.toContain('.thread-reference button { max-width: 100%; white-space: normal; }');
  });

  it('applique les jetons de la DA Canopée épurée', () => {
    for (const token of ['--accent: #0b7a5e', '--brand: #10a37f', '--tint: #e6f6f1', '--muted: #f4f4f4', '--card: 0 4px 12px rgba(0,0,0,.05)', '--outline: #8a8a8a', '--focus: #184bb2', 'Inter']) {
      expect(styleSource).toContain(token);
    }
    expect(styleSource).toContain('border-radius: 999px');
    expect(styleSource).toContain('border-left: 4px solid var(--accent)');
  });
});
