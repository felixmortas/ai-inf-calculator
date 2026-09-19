import { describe, expect, it } from 'vitest';
import { artifactWordDiff, prepareConversationHistory, type ConversationHistoryBlock } from './conversationHistory';

const block = (overrides: Partial<ConversationHistoryBlock> = {}): ConversationHistoryBlock => ({ blockId: 'block', message: '', finalResponse: '', visibleReasoning: '', artifact: '', ...overrides });

describe('conversation history domain', () => {
  it('prépare le premier artifact complet et le prompt unique', () => {
    expect(prepareConversationHistory([block({ artifact: 'version !' })], 0, 4)).toMatchObject({ artifactReference: '', artifactContribution: 'version !', systemPromptCacheTokens: 4 });
  });
  it('reconstruit les textes bruts antérieurs et ignore les blocs vides', () => {
    const result = prepareConversationHistory([block({ message: ' m ', visibleReasoning: '', finalResponse: '' }), block(), block({ blockId: 'target', message: 'courant' })], 'target', 1);
    expect(result.priorMessages).toEqual([' m ']);
    expect(result.priorVisibleReasoning).toEqual(['']);
    expect(result.priorFinalResponses).toEqual(['']);
  });
  it('conserve les sources antérieures dans leur ordre sans les confondre avec les messages', () => {
    const result = prepareConversationHistory([
      block({ sources: [{ text: 'premier fichier' }, { text: 'second fichier' }] }),
      block({ blockId: 'target', message: 'courant' }),
    ], 'target', 0);
    expect(result.priorMessages).toEqual(['']);
    expect(result.priorSources).toEqual(['premier fichier', 'second fichier']);
  });
  it('conserve seulement la dernière référence et traite les versions', () => {
    const blocks = [block({ artifact: 'alpha beta' }), block({ artifact: '' }), block({ blockId: 'changed', artifact: 'alpha nouveau beta' }), block({ blockId: 'same', artifact: 'alpha beta' })];
    expect(prepareConversationHistory(blocks, 'changed', 0)).toMatchObject({ artifactReference: 'alpha beta', artifactContribution: 'nouveau' });
    expect(prepareConversationHistory(blocks, 'same', 0)).toMatchObject({ artifactReference: 'alpha nouveau beta', artifactContribution: '' });
  });
  it('ne compte ni suppression, ni blancs, et rapproche les occurrences linéairement', () => {
    expect(artifactWordDiff('a a b', 'a b a c')).toBe('c');
    expect(artifactWordDiff('alpha beta', 'alpha')).toBe('');
    expect(artifactWordDiff('', '   ')).toBe('');
  });
  it('ignore entièrement une cible vide et valide le volume cache', () => {
    expect(prepareConversationHistory([block()], 0, 2).systemPromptCacheTokens).toBe(0);
    expect(() => prepareConversationHistory([block({ message: 'x' })], 0, 1.5)).toThrow(RangeError);
  });
});
