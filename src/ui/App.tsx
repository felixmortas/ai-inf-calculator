import { useEffect, useReducer, useRef, useState } from 'react';
import {
  conversationReducer, currentImpact, impactFingerprint, initialConversationState, isIgnoredConversationBlock,
  showerFingerprint, summaryBlockingBlockIds, summaryFingerprint, type ConversationState,
} from '../application/conversationReducer';
import { TokenizationClient } from '../application/tokenizationClient';
import { calculateImpact } from '../domain/impact';
import { prepareConversationHistory } from '../domain/conversationHistory';
import { fallbackTokenCount } from '../domain/tokenization';
import { resolveDroughtRisk, resolveImpactParameters, resolveUserCarbonIntensity, type DroughtRisk } from '../data/modelCatalog';
import { calculateShowerEquivalence } from '../domain/showerEquivalence';
import { aggregateImpacts } from '../domain/impactAggregation';
import type { ImpactResult } from '../domain/impact';
import { fr } from '../i18n/fr';
import { ConversationConfiguration } from './ConversationConfiguration';
import { ConversationBlocks } from './ConversationBlocks';
import { ConversationImport } from './ConversationImport';
import './styles.css';

export function impactTexts(
  block: { readonly message: string; readonly sources?: readonly { readonly text: string }[]; readonly finalResponse: string; readonly visibleReasoning: string },
  history: ReturnType<typeof prepareConversationHistory>,
) {
  return {
    newInput: [block.message, ...(block.sources ?? []).map((source) => source.text)].join('\n'),
    cachedInput: [...history.priorMessages, ...history.priorSources, ...history.priorVisibleReasoning, ...history.priorFinalResponses, history.artifactReference],
    output: [block.finalResponse, block.visibleReasoning, history.artifactContribution],
  };
}

export function App() {
  const [state, dispatch] = useReducer(conversationReducer, initialConversationState);
  const [step, setStep] = useState<'home' | 'import' | 'selection' | 'thread'>('home');
  const [selectionOrigin, setSelectionOrigin] = useState<'home' | 'import' | 'thread'>('home');
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const client = useRef<TokenizationClient | undefined>(undefined);

  useEffect(() => { stepTitle.current?.focus(); }, [step]);

  function openSelection(origin: 'home' | 'import' | 'thread') {
    setSelectionOrigin(origin);
    setStep('selection');
  }

  useEffect(() => {
    if (typeof Worker === 'undefined') return undefined;
    client.current = new TokenizationClient(dispatch);
    return () => { client.current?.dispose(); client.current = undefined; };
  }, []);

  function calculate(blockId: string, snapshot: ConversationState = state, fingerprint = impactFingerprint(snapshot, blockId), preserveSummary = false): Promise<ImpactResult | undefined> {
    const parameters = resolveImpactParameters(snapshot.provider, snapshot.modelId, snapshot.hostingCountry, snapshot.parameterOverrides);
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
        carbonIntensity: parameters.carbonIntensity, wue: parameters.wue, constants: parameters.constants,
      });
        if (result.ok) {
          dispatch({ type: 'impactResolved', blockId, fingerprint, impact: result.impact, factorSources: parameters.factorSources });
          const showerFactor = resolveUserCarbonIntensity(snapshot.userCountry);
          const showerFingerprintValue = showerFingerprint(snapshot, result.impact.carbonGco2e);
          dispatch({ type: 'showerEquivalenceResolved', blockId, fingerprint: showerFingerprintValue, equivalence: calculateShowerEquivalence(result.impact.carbonGco2e, showerFactor.status === 'unavailable' ? undefined : showerFactor.value, parameters.shower, showerFactor.status === 'world' ? 'world' : 'country') });
          resolve(result.impact);
        } else {
          dispatch({ type: 'impactBlocked', blockId, fingerprint, code: 'invalid-data', async: true });
          resolve(undefined);
        }
      };
      const texts = impactTexts(block, history);
      if (client.current) client.current.requestImpact(texts, complete, parameters.wordsPerToken);
      else complete({
          newInput: fallbackTokenCount(texts.newInput, parameters.wordsPerToken),
          cachedInput: texts.cachedInput.reduce((total, text) => total + fallbackTokenCount(text, parameters.wordsPerToken), 0),
          output: texts.output.reduce((total, text) => total + fallbackTokenCount(text, parameters.wordsPerToken), 0),
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
    const parameters = resolveImpactParameters(snapshot.provider, snapshot.modelId, snapshot.hostingCountry, snapshot.parameterOverrides);
    const droughtRisk: DroughtRisk = parameters ? resolveDroughtRisk(parameters.hostingCountry) : { status: 'unavailable' };
    dispatch({
      type: 'summaryResolved', fingerprint, total: aggregation.total,
      droughtRisk,
      factorSources: parameters ? {
        ...parameters.factorSources,
        ...(droughtRisk.status === 'available' ? { droughtRisk: droughtRisk.source } : {}),
      } : undefined,
    });
    const showerFactor = resolveUserCarbonIntensity(snapshot.userCountry);
    dispatch({ type: 'showerEquivalenceResolved', fingerprint: showerFingerprint(snapshot, aggregation.total.carbonGco2e), equivalence: calculateShowerEquivalence(aggregation.total.carbonGco2e, showerFactor.status === 'unavailable' ? undefined : showerFactor.value, parameters!.shower, showerFactor.status === 'world' ? 'world' : 'country') });
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
    const parameters = resolveImpactParameters(snapshot.provider, snapshot.modelId, snapshot.hostingCountry, snapshot.parameterOverrides);
    const droughtRisk: DroughtRisk = parameters ? resolveDroughtRisk(parameters.hostingCountry) : { status: 'unavailable' };
    dispatch({
      type: 'summaryResolved', fingerprint, total: aggregation.total,
      droughtRisk,
      factorSources: parameters ? {
        ...parameters.factorSources,
        ...(droughtRisk.status === 'available' ? { droughtRisk: droughtRisk.source } : {}),
      } : undefined,
    });
    const showerFactor = resolveUserCarbonIntensity(snapshot.userCountry);
    dispatch({ type: 'showerEquivalenceResolved', fingerprint: showerFingerprint(snapshot, aggregation.total.carbonGco2e), equivalence: calculateShowerEquivalence(aggregation.total.carbonGco2e, showerFactor.status === 'unavailable' ? undefined : showerFactor.value, parameters!.shower, showerFactor.status === 'world' ? 'world' : 'country') });
  }

  return (
    <main className="app-shell">
      <header>
        <h1>{fr.title}</h1>
        <p>{fr.introduction}</p>
      </header>
      {step === 'home' ? <section className="start-paths" aria-labelledby="step-title">
        <h2 id="step-title" ref={stepTitle} tabIndex={-1}>{fr.homeTitle}</h2>
        <div className="start-choice"><h3>{fr.importPathTitle}</h3><p>{fr.importPathHelp}</p><button type="button" onClick={() => setStep('import')}>{fr.importPathAction}</button></div>
        <div className="start-choice"><h3>{fr.manualPathTitle}</h3><p>{fr.manualPathHelp}</p><button type="button" onClick={() => openSelection('home')}>{fr.manualPathAction}</button></div>
      </section> : null}
      {step === 'import' ? <section aria-labelledby="step-title">
        <h2 id="step-title" ref={stepTitle} tabIndex={-1}>{fr.importPathTitle}</h2>
        <button type="button" onClick={() => setStep('home')}>{fr.backHomeAction}</button>
        <ConversationImport state={state} dispatch={dispatch} onImported={() => {
          dispatch({ type: 'providerSelected', provider: 'Mistral AI' });
          dispatch({ type: 'mistralModeSelected', mode: 'fast' });
          dispatch({ type: 'modelSelected', modelId: 'mistral-small' });
          openSelection('import');
        }} onManual={() => openSelection('import')} />
      </section> : null}
      {step === 'selection' ? <section aria-labelledby="step-title">
        <h2 id="step-title" ref={stepTitle} tabIndex={-1}>{fr.selectionTitle}</h2>
        <button type="button" onClick={() => setStep(selectionOrigin)}>{selectionOrigin === 'thread' ? fr.backThreadAction : selectionOrigin === 'import' ? fr.backImportAction : fr.backHomeAction}</button>
        <ConversationConfiguration state={state} dispatch={dispatch} />
        <button type="button" onClick={() => setStep('thread')}>{fr.continueThreadAction}</button>
      </section> : null}
      {step === 'thread' ? <section aria-labelledby="step-title">
        <h2 id="step-title" ref={stepTitle} tabIndex={-1}>{fr.threadTitle}</h2>
        <div className="thread-reference"><p>{fr.currentReference(state.provider, state.modelId)}</p><button type="button" onClick={() => openSelection('thread')}>{fr.editReferenceAction}</button></div>
        <button type="button" onClick={() => setStep('home')}>{fr.backHomeAction}</button>
        <ConversationBlocks state={state} dispatch={dispatch} onCalculate={calculate} onCalculateAll={calculateAll} onRecalculateSummary={recalculateSummary} />
      </section> : null}
    </main>
  );
}
