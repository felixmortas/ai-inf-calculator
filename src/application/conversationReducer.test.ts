import { describe, expect, it } from 'vitest';
import { conversationReducer, initialConversationState } from './conversationReducer';

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
});
