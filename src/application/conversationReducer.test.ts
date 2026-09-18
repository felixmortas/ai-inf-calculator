import { describe, expect, it } from 'vitest';
import {
  conversationReducer,
  initialConversationState,
  isIgnoredConversationBlock,
  type ConversationBlock,
} from './conversationReducer';

describe('conversationReducer', () => {
  it('garde un modèle ChatGPT résolu dans la conversation', () => {
    const state = conversationReducer(initialConversationState, {
      type: 'subscriptionSelected', subscription: 'with-paid-subscription',
    });
    expect(state.modelId).toBe('gpt-5.6-terra');
  });

  it('choisit le premier modèle valide lors du changement de fournisseur', () => {
    const state = conversationReducer(initialConversationState, { type: 'providerSelected', provider: 'Gemini' });
    expect(state).toMatchObject({ provider: 'Gemini', modelId: 'gemini-3.5-pro' });
  });

  it('refuse un modèle externe au fournisseur sélectionné', () => {
    const gemini = conversationReducer(initialConversationState, { type: 'providerSelected', provider: 'Gemini' });
    expect(conversationReducer(gemini, { type: 'modelSelected', modelId: 'claude-sonnet-5' })).toBe(gemini);
  });

  it('refuse un abonnement ChatGPT non répertorié à l’exécution', () => {
    const invalidAction = { type: 'subscriptionSelected', subscription: 'inconnu' } as unknown as Parameters<typeof conversationReducer>[1];
    expect(conversationReducer(initialConversationState, invalidAction)).toBe(initialConversationState);
  });

  it('ajoute des blocs ordonnés aux identifiants stables sans muter l’état précédent', () => {
    const first = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'block-1' });
    const second = conversationReducer(first, { type: 'blockAdded', blockId: 'block-2' });
    expect(first.blocks).toHaveLength(1);
    expect(second.blocks.map((block) => block.blockId)).toEqual(['block-1', 'block-2']);
    expect(conversationReducer(second, { type: 'blockAdded', blockId: 'block-1' })).toBe(second);
  });

  it('met à jour seulement le champ et le bloc ciblés', () => {
    const withBlocks = conversationReducer(
      conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' }),
      { type: 'blockAdded', blockId: 'two' },
    );
    const updated = conversationReducer(withBlocks, {
      type: 'blockUpdated', blockId: 'one', field: 'message', value: ' Bonjour ',
    });
    expect(updated.blocks[0]).toMatchObject({ blockId: 'one', message: ' Bonjour ' });
    expect(updated.blocks[1]).toBe(withBlocks.blocks[1]);
    expect(conversationReducer(updated, {
      type: 'blockUpdated', blockId: 'unknown', field: 'message', value: 'ignoré',
    })).toBe(updated);
    const invalidFieldAction = {
      type: 'blockUpdated', blockId: 'one', field: 'unknown', value: 'ignoré',
    } as unknown as Parameters<typeof conversationReducer>[1];
    expect(conversationReducer(updated, invalidFieldAction)).toBe(updated);
  });

  it('supprime un bloc en préservant l’ordre des autres et ignore un identifiant inconnu', () => {
    const withBlocks = ['one', 'two', 'three'].reduce(
      (state, blockId) => conversationReducer(state, { type: 'blockAdded', blockId }),
      initialConversationState,
    );
    const removed = conversationReducer(withBlocks, { type: 'blockRemoved', blockId: 'two' });
    expect(removed.blocks.map((block) => block.blockId)).toEqual(['one', 'three']);
    expect(conversationReducer(removed, { type: 'blockRemoved', blockId: 'unknown' })).toBe(removed);
  });

  it('dérive le statut ignoré sans modifier les espaces saisis', () => {
    const blank: ConversationBlock = {
      blockId: 'blank', message: ' ', finalResponse: '\n', visibleReasoning: '\t', artifact: '',
    };
    expect(isIgnoredConversationBlock(blank)).toBe(true);
    expect(blank.message).toBe(' ');
    expect(isIgnoredConversationBlock({ ...blank, artifact: 'fichier.csv' })).toBe(false);
  });
});
