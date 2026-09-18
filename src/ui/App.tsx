import { useEffect, useReducer, useRef } from 'react';
import {
  conversationReducer, currentImpact, impactFingerprint, initialConversationState, isIgnoredConversationBlock,
  summaryBlockingBlockIds, summaryFingerprint, type ConversationState,
} from '../application/conversationReducer';
import { TokenizationClient } from '../application/tokenizationClient';
import { calculateImpact } from '../domain/impact';
import { prepareConversationHistory } from '../domain/conversationHistory';
import { fallbackTokenCount } from '../domain/tokenization';
import { resolveDroughtRisk, resolveImpactParameters } from '../data/modelCatalog';
import { aggregateImpacts } from '../domain/impactAggregation';
import type { ImpactResult } from '../domain/impact';
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

  function calculate(blockId: string, snapshot: ConversationState = state, fingerprint = impactFingerprint(snapshot, blockId), preserveSummary = false): Promise<ImpactResult | undefined> {
    const parameters = resolveImpactParameters(snapshot.provider, snapshot.modelId);
    const history = parameters && prepareConversationHistory(snapshot.blocks, blockId, parameters.systemPromptCacheTokens);
    const block = snapshot.blocks.find((entry) => entry.blockId === blockId);
    if (!parameters || !history || !block) {
      dispatch({ type: 'impactBlocked', blockId, fingerprint, code: 'invalid-data' });
      return Promise.resolve(undefined);
    }
    dispatch({ type: 'impactRequested', blockId, fingerprint, preserveSummary });
    return new Promise((resolve) => {
      const complete = (counts: { newInput: number; cachedInput: number; output: number }) => {
      const result = calculateImpact({
        newInputTokens: counts.newInput,
        cachedInputTokens: counts.cachedInput + history.systemPromptCacheTokens,
        outputTokens: counts.output,
        totalParameters: parameters.totalParameters, activatedParameters: parameters.activatedParameters,
        inputRatio: parameters.inputRatio, cacheRatio: parameters.cacheRatio, pue: parameters.pue,
        carbonIntensity: parameters.carbonIntensity, wue: parameters.wue,
      });
        if (result.ok) {
          dispatch({ type: 'impactResolved', blockId, fingerprint, impact: result.impact });
          resolve(result.impact);
        } else {
          dispatch({ type: 'impactBlocked', blockId, fingerprint, code: 'invalid-data' });
          resolve(undefined);
        }
      };
      const texts = impactTexts(block, history);
      if (client.current) client.current.requestImpact(texts, complete);
      else complete({
          newInput: fallbackTokenCount(texts.newInput),
          cachedInput: texts.cachedInput.reduce((total, text) => total + fallbackTokenCount(text), 0),
          output: texts.output.reduce((total, text) => total + fallbackTokenCount(text), 0),
        });
    });
  }

  async function calculateAll() {
    const snapshot = state;
    const fingerprint = summaryFingerprint(snapshot);
    const blocks = snapshot.blocks.filter((block) => !isIgnoredConversationBlock(block));
    dispatch({ type: 'summaryRequested', fingerprint });
    if (blocks.length === 0) {
      dispatch({ type: 'summaryUnavailable', fingerprint, code: 'no-exchanges' });
      return;
    }
    const impacts: ImpactResult[] = [];
    for (const block of blocks) {
      const impact = await calculate(block.blockId, snapshot, impactFingerprint(snapshot, block.blockId), true);
      if (!impact) {
        dispatch({ type: 'summaryUnavailable', fingerprint, code: 'invalid-results' });
        return;
      }
      impacts.push(impact);
    }
    const aggregation = aggregateImpacts(impacts);
    if (!aggregation.ok) {
      dispatch({ type: 'summaryUnavailable', fingerprint, code: 'invalid-results' });
      return;
    }
    const parameters = resolveImpactParameters(snapshot.provider, snapshot.modelId);
    dispatch({
      type: 'summaryResolved', fingerprint, total: aggregation.total,
      droughtRisk: parameters ? resolveDroughtRisk(parameters.hostingCountry) : { status: 'unavailable' },
    });
  }

  function recalculateSummary() {
    const snapshot = state;
    const fingerprint = summaryFingerprint(snapshot);
    const blockingBlockIds = summaryBlockingBlockIds(snapshot);
    dispatch({ type: 'summaryRecalculationRequested', fingerprint });
    if (blockingBlockIds.length > 0) return;
    const impacts = snapshot.blocks
      .filter((block) => !isIgnoredConversationBlock(block))
      .map((block) => currentImpact(snapshot, block.blockId))
      .filter((impact): impact is ImpactResult => impact !== undefined);
    const aggregation = aggregateImpacts(impacts);
    if (!aggregation.ok) {
      dispatch({ type: 'summaryUnavailable', fingerprint, code: 'invalid-results' });
      return;
    }
    const parameters = resolveImpactParameters(snapshot.provider, snapshot.modelId);
    dispatch({
      type: 'summaryResolved', fingerprint, total: aggregation.total,
      droughtRisk: parameters ? resolveDroughtRisk(parameters.hostingCountry) : { status: 'unavailable' },
    });
  }

  return (
    <main className="app-shell">
      <header>
        <h1>{fr.title}</h1>
        <p>{fr.introduction}</p>
      </header>
      <ConversationConfiguration state={state} dispatch={dispatch} />
      <ConversationBlocks state={state} dispatch={dispatch} onCalculate={calculate} onCalculateAll={calculateAll} onRecalculateSummary={recalculateSummary} />
    </main>
  );
}
