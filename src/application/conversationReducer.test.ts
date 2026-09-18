import { describe, expect, it } from 'vitest';
import {
  conversationReducer,
  impactFingerprint,
  initialConversationState,
  isImpactCurrent,
  isIgnoredConversationBlock,
  showerFingerprint,
  isSummaryCurrent,
  summaryFingerprint,
  summaryBlockingBlockIds,
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

  it('ne résout que le calcul explicitement demandé et l’invalide après une édition', () => {
    const withBlocks = ['one', 'two'].reduce(
      (state, blockId) => conversationReducer(state, { type: 'blockAdded', blockId }),
      initialConversationState,
    );
    const populated = conversationReducer(withBlocks, { type: 'blockUpdated', blockId: 'two', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(populated, 'two');
    const requested = conversationReducer(populated, { type: 'impactRequested', blockId: 'two', fingerprint });
    expect(requested.impacts).toEqual({ two: { status: 'pending', fingerprint } });
    const resolved = conversationReducer(requested, {
      type: 'impactResolved', blockId: 'two', fingerprint,
      impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 },
    });
    expect(resolved.impacts.two?.status).toBe('result');
    const edited = conversationReducer(resolved, { type: 'blockUpdated', blockId: 'two', field: 'message', value: 'Bonsoir' });
    expect(edited.impacts.two?.status).toBe('result');
    expect(isImpactCurrent(edited, 'two')).toBe(false);
  });

  it('ignore une résolution d’impact périmée après modification, suppression ou changement de modèle', () => {
    const populated = conversationReducer(
      conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' }),
      { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' },
    );
    const fingerprint = impactFingerprint(populated, 'one');
    const pending = conversationReducer(populated, { type: 'impactRequested', blockId: 'one', fingerprint });
    const completion = { type: 'impactResolved' as const, blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } };
    const edited = conversationReducer(pending, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonsoir' });
    expect(conversationReducer(edited, completion)).toBe(edited);
    const removed = conversationReducer(pending, { type: 'blockRemoved', blockId: 'one' });
    expect(conversationReducer(removed, completion)).toBe(removed);
    const changedModel = conversationReducer(pending, { type: 'subscriptionSelected', subscription: 'with-paid-subscription' });
    expect(conversationReducer(changedModel, completion)).toBe(changedModel);
  });

  it('publie le bilan seulement pour son empreinte courante et l’efface à la modification', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = summaryFingerprint(state);
    state = conversationReducer(state, { type: 'summaryRequested', fingerprint });
    state = conversationReducer(state, {
      type: 'summaryResolved', fingerprint, total: { energyWh: 1.25, carbonGco2e: 2.5, waterL: 3.75 },
      droughtRisk: { status: 'available', level: 'Medium (0.4-0.6)' },
    });
    expect(state.summary?.status).toBe('result');
    const changed = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonsoir' });
    expect(changed.summary?.status).toBe('result');
    expect(isSummaryCurrent(changed)).toBe(false);
    expect(conversationReducer(changed, {
      type: 'summaryResolved', fingerprint, total: { energyWh: 1, carbonGco2e: 1, waterL: 1 },
      droughtRisk: { status: 'unavailable' },
    })).toBe(changed);
  });

  it('préserve les résultats indépendants et périme la chaîne dépendante', () => {
    let state = ['one', 'two', 'three'].reduce((current, blockId) => (
      conversationReducer(current, { type: 'blockAdded', blockId })
    ), initialConversationState);
    for (const [blockId, value] of [['one', 'a'], ['two', 'b'], ['three', 'c']] as const) {
      state = conversationReducer(state, { type: 'blockUpdated', blockId, field: 'message', value });
      const fingerprint = impactFingerprint(state, blockId);
      state = conversationReducer(state, { type: 'impactRequested', blockId, fingerprint });
      state = conversationReducer(state, { type: 'impactResolved', blockId, fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    }
    const edited = conversationReducer(state, { type: 'blockUpdated', blockId: 'two', field: 'message', value: 'modifié' });
    expect(isImpactCurrent(edited, 'one')).toBe(true);
    expect(isImpactCurrent(edited, 'two')).toBe(false);
    expect(isImpactCurrent(edited, 'three')).toBe(false);
    expect(summaryBlockingBlockIds(edited)).toEqual(['two', 'three']);
  });

  it('ne périme pas les résultats en ajoutant ou supprimant un bloc vide', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    const added = conversationReducer(state, { type: 'blockAdded', blockId: 'empty' });
    const removed = conversationReducer(added, { type: 'blockRemoved', blockId: 'empty' });
    expect(isImpactCurrent(added, 'one')).toBe(true);
    expect(isImpactCurrent(removed, 'one')).toBe(true);
  });

  it('refuse atomiquement le recalcul du bilan et identifie chaque échange bloquant', () => {
    let state = ['one', 'two'].reduce((current, blockId) => conversationReducer(current, { type: 'blockAdded', blockId }), initialConversationState);
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'un' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'two', field: 'message', value: 'deux' });
    const fingerprint = summaryFingerprint(state);
    const refused = conversationReducer(state, { type: 'summaryRecalculationRequested', fingerprint });
    expect(refused.summary).toMatchObject({ status: 'unavailable', code: 'invalid-results', blockingBlockIds: ['one', 'two'] });
  });

  it('autorise un recalcul de bilan seulement lorsque chaque impact renseigné est courant', () => {
    let state = ['one', 'two'].reduce((current, blockId) => conversationReducer(current, { type: 'blockAdded', blockId }), initialConversationState);
    for (const [blockId, value] of [['one', 'un'], ['two', 'deux']] as const) {
      state = conversationReducer(state, { type: 'blockUpdated', blockId, field: 'message', value });
      const fingerprint = impactFingerprint(state, blockId);
      state = conversationReducer(state, { type: 'impactRequested', blockId, fingerprint });
      state = conversationReducer(state, { type: 'impactResolved', blockId, fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    }
    const fingerprint = summaryFingerprint(state);
    const requested = conversationReducer(state, { type: 'summaryRecalculationRequested', fingerprint });
    expect(requested.summary).toEqual({ status: 'pending', fingerprint });
    const resolved = conversationReducer(requested, {
      type: 'summaryResolved', fingerprint, total: { energyWh: 2, carbonGco2e: 4, waterL: 6 },
      droughtRisk: { status: 'unavailable' },
    });
    expect(resolved.summary).toMatchObject({ status: 'result', total: { energyWh: 2, carbonGco2e: 4, waterL: 6 } });
  });

  it('périme les échanges dépendants après la suppression d’un échange renseigné', () => {
    let state = ['one', 'two'].reduce((current, blockId) => conversationReducer(current, { type: 'blockAdded', blockId }), initialConversationState);
    for (const [blockId, value] of [['one', 'un'], ['two', 'deux']] as const) {
      state = conversationReducer(state, { type: 'blockUpdated', blockId, field: 'message', value });
      const fingerprint = impactFingerprint(state, blockId);
      state = conversationReducer(state, { type: 'impactRequested', blockId, fingerprint });
      state = conversationReducer(state, { type: 'impactResolved', blockId, fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    }
    const removed = conversationReducer(state, { type: 'blockRemoved', blockId: 'one' });
    expect(isImpactCurrent(removed, 'two')).toBe(false);
    expect(summaryBlockingBlockIds(removed)).toEqual(['two']);
  });

  it('périme un résultat résolu après le changement de modèle', () => {
    let state = conversationReducer(initialConversationState, { type: 'blockAdded', blockId: 'one' });
    state = conversationReducer(state, { type: 'blockUpdated', blockId: 'one', field: 'message', value: 'Bonjour' });
    const fingerprint = impactFingerprint(state, 'one');
    state = conversationReducer(state, { type: 'impactRequested', blockId: 'one', fingerprint });
    state = conversationReducer(state, { type: 'impactResolved', blockId: 'one', fingerprint, impact: { energyWh: 1, carbonGco2e: 2, waterL: 3 } });
    const changed = conversationReducer(state, { type: 'subscriptionSelected', subscription: 'with-paid-subscription' });
    expect(isImpactCurrent(changed, 'one')).toBe(false);
    expect(summaryBlockingBlockIds(changed)).toEqual(['one']);
  });

  it('signale l’absence d’échange lors du recalcul de bilan', () => {
    const fingerprint = summaryFingerprint(initialConversationState);
    const state = conversationReducer(initialConversationState, { type: 'summaryRecalculationRequested', fingerprint });
    expect(state.summary).toEqual({ status: 'unavailable', fingerprint, code: 'no-exchanges' });
  });

  it('dérive une empreinte de douche canonique des résultats et paramètres qui la déterminent', () => {
    const base = showerFingerprint(initialConversationState, 'France', 60);
    expect(showerFingerprint(initialConversationState, 'France', 60)).toBe(base);
    expect(showerFingerprint(initialConversationState, 'France', 61)).not.toBe(base);
    expect(showerFingerprint(initialConversationState, 'Belgique', 60)).not.toBe(base);
  });
});
