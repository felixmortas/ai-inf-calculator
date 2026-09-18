import { useEffect, useReducer, useRef } from 'react';
import { conversationReducer, impactFingerprint, initialConversationState } from '../application/conversationReducer';
import { TokenizationClient } from '../application/tokenizationClient';
import { calculateImpact } from '../domain/impact';
import { prepareConversationHistory } from '../domain/conversationHistory';
import { fallbackTokenCount } from '../domain/tokenization';
import { resolveImpactParameters } from '../data/modelCatalog';
import { fr } from '../i18n/fr';
import { ConversationConfiguration } from './ConversationConfiguration';
import { ConversationBlocks } from './ConversationBlocks';
import './styles.css';

export function impactTexts(
  block: { readonly message: string; readonly finalResponse: string; readonly visibleReasoning: string },
  history: ReturnType<typeof prepareConversationHistory>,
) {
  return {
    newInput: block.message,
    cachedInput: [...history.priorMessages, ...history.priorVisibleReasoning, ...history.priorFinalResponses, history.artifactReference],
    output: [block.finalResponse, block.visibleReasoning, history.artifactContribution],
  };
}

export function App() {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const client = useRef<TokenizationClient | undefined>(undefined);

  useEffect(() => {
    if (typeof Worker === 'undefined') return undefined;
    client.current = new TokenizationClient(dispatch);
    return () => { client.current?.dispose(); client.current = undefined; };
  }, []);

  function calculate(blockId: string) {
    const fingerprint = impactFingerprint(state);
    const parameters = resolveImpactParameters(state.provider, state.modelId);
    const history = parameters && prepareConversationHistory(state.blocks, blockId, parameters.systemPromptCacheTokens);
    const block = state.blocks.find((entry) => entry.blockId === blockId);
    if (!parameters || !history || !block) {
      dispatch({ type: 'impactBlocked', blockId, fingerprint, code: 'invalid-data' });
      return;
    }
    dispatch({ type: 'impactRequested', blockId, fingerprint });
    const complete = (counts: { newInput: number; cachedInput: number; output: number }) => {
      const result = calculateImpact({
        newInputTokens: counts.newInput,
        cachedInputTokens: counts.cachedInput + history.systemPromptCacheTokens,
        outputTokens: counts.output,
        totalParameters: parameters.totalParameters, activatedParameters: parameters.activatedParameters,
        inputRatio: parameters.inputRatio, cacheRatio: parameters.cacheRatio, pue: parameters.pue,
        carbonIntensity: parameters.carbonIntensity, wue: parameters.wue,
      });
      if (result.ok) dispatch({ type: 'impactResolved', blockId, fingerprint, impact: result.impact });
      else dispatch({ type: 'impactBlocked', blockId, fingerprint, code: 'invalid-data' });
    };
    const texts = impactTexts(block, history);
    if (client.current) {
      client.current.requestImpact(texts, complete);
    } else {
      complete({
        newInput: fallbackTokenCount(texts.newInput),
        cachedInput: texts.cachedInput.reduce((total, text) => total + fallbackTokenCount(text), 0),
        output: texts.output.reduce((total, text) => total + fallbackTokenCount(text), 0),
      });
    }
  }

  return (
    <main className="app-shell">
      <header>
        <h1>{fr.title}</h1>
        <p>{fr.introduction}</p>
      </header>
      <ConversationConfiguration state={state} dispatch={dispatch} />
      <ConversationBlocks state={state} dispatch={dispatch} onCalculate={calculate} />
    </main>
  );
}
