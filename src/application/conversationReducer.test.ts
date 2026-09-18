import { describe, expect, it } from 'vitest';
import {
  conversationReducer,
  initialConversationState,
  isIgnoredConversationBlock,
  type ConversationBlock,
} from './conversationReducer';
import { tokenizationEncoding, tokenizationFingerprint } from '../domain/tokenization';

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

  it('accepte seulement la réponse de tokenisation encore en attente pour le bloc courant', () => {
    const populated = conversationReducer(
      conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' }),
      { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' },
    );
    const requested = conversationReducer(populated, {
      type: 'tokenizationRequested', blockId: 'one', requestId: 'current', encoding: tokenizationEncoding,
      fingerprint: tokenizationFingerprint(tokenizationEncoding, {
        message: 'Bonjour', finalResponse: '', visibleReasoning: '', artifact: '',
      }),
    });
    const fingerprint = requested.tokenizations.one.pending?.fingerprint;
    expect(fingerprint).toBe(tokenizationFingerprint(tokenizationEncoding, {
      message: 'Bonjour', finalResponse: '', visibleReasoning: '', artifact: '',
    }));
    const received = conversationReducer(requested, {
      type: 'tokenizationResponded',
      response: {
        type: 'tokenized', requestId: 'current', encoding: tokenizationEncoding, fingerprint: fingerprint!,
        counts: { message: 1, finalResponse: 0, visibleReasoning: 0, artifact: 0 },
      },
    });
    expect(received.tokenizations.one).toEqual({
      result: { source: 'tiktoken', counts: { message: 1, finalResponse: 0, visibleReasoning: 0, artifact: 0 } },
    });
  });

  it('ignore une réponse ancienne après une modification, suppression ou nouvelle demande', () => {
    const one = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    const requested = conversationReducer(one, {
      type: 'tokenizationRequested', blockId: 'one', requestId: 'old', encoding: tokenizationEncoding,
      fingerprint: tokenizationFingerprint(tokenizationEncoding, {
        message: '', finalResponse: '', visibleReasoning: '', artifact: '',
      }),
    });
    const oldFingerprint = requested.tokenizations.one.pending!.fingerprint;
    const oldResponse = {
      type: 'tokenizationResponded' as const,
      response: {
        type: 'tokenized' as const, requestId: 'old', encoding: tokenizationEncoding, fingerprint: oldFingerprint,
        counts: { message: 0, finalResponse: 0, visibleReasoning: 0, artifact: 0 },
      },
    };
    const modified = conversationReducer(requested, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'nouveau' });
    expect(conversationReducer(modified, oldResponse)).toBe(modified);
    const renewed = conversationReducer(modified, {
      type: 'tokenizationRequested', blockId: 'one', requestId: 'new', encoding: tokenizationEncoding,
      fingerprint: tokenizationFingerprint(tokenizationEncoding, {
        message: 'nouveau', finalResponse: '', visibleReasoning: '', artifact: '',
      }),
    });
    expect(conversationReducer(renewed, oldResponse)).toBe(renewed);
    const removed = conversationReducer(renewed, { type: 'blockRemoved', blockId: 'one' });
    expect(conversationReducer(removed, oldResponse)).toBe(removed);
  });

  it('applique le fallback pur sur une erreur Worker actuelle', () => {
    const populated = conversationReducer(
      conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' }),
      { type: 'blockUpdated', blockId: 'one', field: 'artifact', value: 'été 7' },
    );
    const requested = conversationReducer(populated, {
      type: 'tokenizationRequested', blockId: 'one', requestId: 'failure', encoding: tokenizationEncoding,
      fingerprint: tokenizationFingerprint(tokenizationEncoding, {
        message: '', finalResponse: '', visibleReasoning: '', artifact: 'été 7',
      }),
    });
    const received = conversationReducer(requested, {
      type: 'tokenizationResponded',
      response: {
        type: 'tokenizationFailed', requestId: 'failure', encoding: tokenizationEncoding,
        fingerprint: requested.tokenizations.one.pending!.fingerprint, error: { code: 'tokenizer-unavailable' },
      },
    });
    expect(received.tokenizations.one.result).toEqual({
      source: 'fallback', counts: { message: 0, finalResponse: 0, visibleReasoning: 0, artifact: 2 / 0.75 },
    });
  });

  it('n’enregistre pas un compte non nul pour un champ vide', () => {
    const requested = conversationReducer(
      conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' }),
      {
        type: 'tokenizationRequested', blockId: 'one', requestId: 'empty', encoding: tokenizationEncoding,
        fingerprint: tokenizationFingerprint(tokenizationEncoding, {
          message: '', finalResponse: '', visibleReasoning: '', artifact: '',
        }),
      },
    );
    const received = conversationReducer(requested, {
      type: 'tokenizationResponded',
      response: {
        type: 'tokenized', requestId: 'empty', encoding: tokenizationEncoding,
        fingerprint: requested.tokenizations.one.pending!.fingerprint,
        counts: { message: 1, finalResponse: 0, visibleReasoning: 0, artifact: 0 },
      },
    });
    expect(received.tokenizations.one.result?.source).toBe('fallback');
  });

  it('invalide une demande en attente lorsque le modèle change', () => {
    const withBlock = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    const requested = conversationReducer(withBlock, {
      type: 'tokenizationRequested', blockId: 'one', requestId: 'model-bound', encoding: tokenizationEncoding,
      fingerprint: tokenizationFingerprint(tokenizationEncoding, {
        message: '', finalResponse: '', visibleReasoning: '', artifact: '',
      }),
    });
    const response = {
      type: 'tokenizationResponded' as const,
      response: {
        type: 'tokenized' as const, requestId: 'model-bound', encoding: tokenizationEncoding,
        fingerprint: requested.tokenizations.one.pending!.fingerprint,
        counts: { message: 0, finalResponse: 0, visibleReasoning: 0, artifact: 0 },
      },
    };
    const changedModel = conversationReducer(requested, {
      type: 'subscriptionSelected', subscription: 'with-paid-subscription',
    });
    expect(changedModel.tokenizations).toEqual({});
    expect(conversationReducer(changedModel, response)).toBe(changedModel);
  });
});
