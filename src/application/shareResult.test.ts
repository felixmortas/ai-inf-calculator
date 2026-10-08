import { describe, expect, it, vi } from 'vitest';
import { fr } from '../i18n/fr';
import { buildShareTextFromState, shareResult, shouldAlertOnCopy, toShareableResult } from './shareResult';
import { initialConversationState, summaryFingerprint, equivalenceFingerprint, type ConversationState } from './conversationReducer';

function stateWithSecrets(): ConversationState {
  const base = initialConversationState;
  const blocks = [
    { blockId: 'a', message: 'SECRET-MSG', finalResponse: 'SECRET-REP', visibleReasoning: 'SECRET-RAI', artifact: 'SECRET-ART', sources: [{ id: 's', name: 'secret-fichier.txt', type: 'text/plain', size: 1, text: 'SECRET-SRC' }] },
    { blockId: 'b', message: '', finalResponse: '', visibleReasoning: '', artifact: '', sources: [] },
  ];
  const withBlocks = { ...base, blocks } as ConversationState;
  const total = { carbonGco2e: 1.5, waterL: 0.002, energyWh: 3 } as never;
  const fingerprint = summaryFingerprint(withBlocks);
  const summary = { status: 'result', fingerprint, total } as never;
  const withSummary = { ...withBlocks, summary } as ConversationState;
  return { ...withSummary, summaryShowerEquivalence: { fingerprint: equivalenceFingerprint(withSummary, 1.5), equivalence: { status: 'available', seconds: 12, factorSource: 'country' } } } as ConversationState;
}

describe('shouldAlertOnCopy', () => {
  it('alerte sur PC et iOS, pas sur Android', () => {
    expect(shouldAlertOnCopy('Mozilla/5.0 (Windows NT 10.0)')).toBe(true);
    expect(shouldAlertOnCopy('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe(true);
    expect(shouldAlertOnCopy('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
  });
});

describe('toShareableResult', () => {
  it('ne laisse ressortir aucun contenu de conversation ni paramètre', () => {
    const state = stateWithSecrets();
    const text = buildShareTextFromState(state, { origin: 'https://x.test', pathname: '/app/' }, fr, 'fr-FR')!;
    expect(text).not.toMatch(/SECRET|secret-fichier/);
    expect(text).not.toContain('?');
    expect(text).not.toContain('#');
    expect(text).toContain('https://x.test/app/');
    expect(toShareableResult(state, { origin: 'o', pathname: '/p' }, fr, 'fr-FR')?.exchangeCount).toBe(1);
    expect(Object.keys(toShareableResult(state, { origin: 'o', pathname: '/p' }, fr, 'fr-FR')!).sort())
      .toEqual(['carbon', 'chatbot', 'electricity', 'exchangeCount', 'pageUrl', 'showerAccessible', 'water']);
  });
  it('retourne undefined sans résultat', () => {
    expect(toShareableResult(initialConversationState, { origin: 'o', pathname: '/' }, fr, 'fr-FR')).toBeUndefined();
  });
});

describe('shareResult', () => {
  it('utilise le partage système', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareResult('t', { share, writeText })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 't' });
    expect(writeText).not.toHaveBeenCalled();
  });
  it('ignore l’annulation', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    const writeText = vi.fn();
    expect(await shareResult('t', { share, writeText })).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });
  it('replie sur la copie après une autre erreur ou sans partage', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareResult('t', { share: vi.fn().mockRejectedValue(new Error('x')), writeText })).toBe('copied');
    expect(await shareResult('t', { writeText })).toBe('copied');
  });
  it('échoue proprement sans presse-papiers ou s’il refuse', async () => {
    expect(await shareResult('t', {})).toBe('failed');
    expect(await shareResult('t', { writeText: vi.fn().mockRejectedValue(new Error('no')) })).toBe('failed');
  });
});
