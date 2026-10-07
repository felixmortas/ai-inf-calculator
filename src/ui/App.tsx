import { useEffect, useReducer, useRef, useState } from 'react';
import {
  conversationReducer, impactFingerprint, initialConversationState, isIgnoredConversationBlock,
  equivalenceFingerprint, summaryFingerprint, type ConversationState,
  isImpactCurrent, isShowerEquivalenceCurrent, isSummaryCurrent, isSummaryShowerEquivalenceCurrent, isSummaryLedEquivalenceCurrent, ledFingerprint, type ConversationAction,
} from '../application/conversationReducer';
import { TokenizationClient } from '../application/tokenizationClient';
import { calculateImpact } from '../domain/impact';
import { prepareConversationHistory } from '../domain/conversationHistory';
import { fallbackTokenCount } from '../domain/tokenization';
import { resolveImpactParameters, resolveUserCarbonIntensity } from '../data/modelCatalog';
import { calculateShowerEquivalence } from '../domain/showerEquivalence';
import { calculateLedEquivalence } from '../domain/ledEquivalence';
import { aggregateImpacts } from '../domain/impactAggregation';
import type { ImpactResult } from '../domain/impact';
import { fr } from '../i18n/fr';
import { ConversationConfiguration, type ConfigurationHandle } from './ConversationConfiguration';
import { ConversationBlocks } from './ConversationBlocks';
import { CalculationBar } from './CalculationBar';
import { Methodology } from './Methodology';
import './styles.css';

function Icon({ children }: { readonly children: string }) { return <span aria-hidden="true" className="icon-glyph">{children}</span>; }

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
  const summaryPending = state.summary?.status === 'pending';
  const [step, setStep] = useState<'home' | 'selection' | 'thread' | 'methodology'>('home');
  const stepBeforeMethodology = useRef<'home' | 'selection' | 'thread'>('home');
  const visibleStep = step === 'methodology' ? stepBeforeMethodology.current : step;
  const [selectionOrigin, setSelectionOrigin] = useState<'home' | 'thread'>('home');
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const methodologyTitle = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<'summary' | 'reference' | null>(null);
  const calculationStatus = useRef<HTMLDivElement>(null);
  const calculationReturnFocus = useRef<HTMLElement | null>(null);
  const calculationWasPending = useRef(false);
  const [openAdvancedOnSelection, setOpenAdvancedOnSelection] = useState(false);
  const [recalculationNotice, setRecalculationNotice] = useState('');
  const configuration = useRef<ConfigurationHandle>(null);
  const [parametersValid, setParametersValid] = useState(true);
  const client = useRef<TokenizationClient | undefined>(undefined);

  useEffect(() => {
    if (summaryPending) {
      calculationWasPending.current = true;
      calculationStatus.current?.focus();
      return;
    }
    if (calculationWasPending.current) {
      calculationWasPending.current = false;
      const resultTitle = state.summary?.status === 'result' ? document.getElementById('result-title') : null;
      if (resultTitle) resultTitle.focus();
      else if (calculationReturnFocus.current?.isConnected) calculationReturnFocus.current.focus();
      calculationReturnFocus.current = null;
    }
  }, [summaryPending]);

  useEffect(() => {
    if (!summaryPending) return;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [summaryPending]);

  useEffect(() => {
    if (step === 'thread' && returnFocus.current) {
      const target = returnFocus.current === 'summary' ? document.querySelector<HTMLButtonElement>('.result-section button') : null;
      (target ?? document.querySelector<HTMLButtonElement>('.thread-reference button'))?.focus();
      returnFocus.current = null;
    } else (step === 'methodology' ? methodologyTitle.current : stepTitle.current)?.focus();
    if (step === 'thread' && document.documentElement.scrollHeight > window.innerHeight) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
    }
  }, [step]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const update = () => document.documentElement.classList.toggle('keyboard-open', viewport.scale <= 1 && viewport.height < window.innerHeight * 0.75);
    update();
    viewport.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => { viewport.removeEventListener('resize', update); window.removeEventListener('resize', update); document.documentElement.classList.remove('keyboard-open'); };
  }, []);

  useEffect(() => {
    if (recalculationNotice && state.blocks.every((block) => isIgnoredConversationBlock(block) || isImpactCurrent(state, block.blockId))
      && isSummaryCurrent(state) && isSummaryShowerEquivalenceCurrent(state) && isSummaryLedEquivalenceCurrent(state)) {
      setRecalculationNotice('');
    }
  }, [state, recalculationNotice]);

  function openSelection(origin: 'home' | 'thread', trigger?: HTMLButtonElement) {
    const fromSummary = !!trigger?.closest('.result-section');
    returnFocus.current = trigger ? (fromSummary ? 'summary' : 'reference') : null;
    setOpenAdvancedOnSelection(fromSummary || !!trigger?.classList.contains('edit-stale-parameters'));
    setSelectionOrigin(origin);
    setStep('selection');
  }

  function blocksDispatch(action: ConversationAction) {
    if (['blockUpdated', 'sourceAdded', 'sourceRemoved', 'blockRemoved'].includes(action.type)) {
      const next = conversationReducer(state, action);
      const staleCards = next.blocks.filter((block) => next.impacts[block.blockId]?.status === 'result' && !isImpactCurrent(next, block.blockId)).length;
      const staleCount = staleCards || Number(next.summary?.status === 'result' && !isSummaryCurrent(next));
      if (staleCount) setRecalculationNotice(fr.recalculationNotice(staleCount));
    }
    dispatch(action);
  }

  function configurationDispatch(action: ConversationAction) {
    if (['parametersApplied', 'parametersRestored', 'hostingCountrySelected', 'userCountrySelected', 'providerSelected', 'modelSelected', 'subscriptionSelected', 'mistralModeSelected'].includes(action.type)) {
      const next = conversationReducer(state, action);
      const staleCount = next.blocks.filter((block) => next.impacts[block.blockId]?.status === 'result' && !isImpactCurrent(next, block.blockId)).length
        + next.blocks.filter((block) => next.showerEquivalences[block.blockId] && !isShowerEquivalenceCurrent(next, block.blockId)).length
        + Number(next.summary?.status === 'result' && !isSummaryCurrent(next))
        + Number(!!next.summaryShowerEquivalence && !isSummaryShowerEquivalenceCurrent(next))
        + Number(!!next.summaryLedEquivalence && !isSummaryLedEquivalenceCurrent(next));
      if (staleCount) setRecalculationNotice(fr.recalculationNotice(staleCount));
    }
    dispatch(action);
  }

  function continueToThread() {
    const collected = configuration.current?.collect();
    if (collected && !collected.ok) return;
    if (collected?.overrides) configurationDispatch({ type: 'parametersApplied', overrides: collected.overrides });
    setStep('thread');
  }

  function openMethodology() {
    if (step !== 'methodology') stepBeforeMethodology.current = step;
    setStep('methodology');
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
          const equivalenceFingerprintValue = equivalenceFingerprint(snapshot, result.impact.carbonGco2e);
          dispatch({ type: 'showerEquivalenceResolved', blockId, fingerprint: equivalenceFingerprintValue, equivalence: calculateShowerEquivalence(result.impact.carbonGco2e, showerFactor.status === 'unavailable' ? undefined : showerFactor.value, parameters.shower, showerFactor.status === 'world' ? 'world' : 'country') });
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
    const activeElement = document.activeElement;
    calculationReturnFocus.current = activeElement instanceof HTMLElement ? activeElement : null;
    const snapshot = state;
    const blocks = snapshot.blocks.filter((block) => !isIgnoredConversationBlock(block));
    if (blocks.length === 0 || snapshot.parameterValidationInvalid || snapshot.summary?.status === 'pending') return;
    const fingerprint = summaryFingerprint(snapshot);
    dispatch({ type: 'summaryRequested', fingerprint });
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
    dispatch({
      type: 'summaryResolved', fingerprint, total: aggregation.total,
      factorSources: parameters?.factorSources,
    });
    const showerFactor = resolveUserCarbonIntensity(snapshot.userCountry);
    dispatch({ type: 'showerEquivalenceResolved', fingerprint: equivalenceFingerprint(snapshot, aggregation.total.carbonGco2e), equivalence: calculateShowerEquivalence(aggregation.total.carbonGco2e, showerFactor.status === 'unavailable' ? undefined : showerFactor.value, parameters!.shower, showerFactor.status === 'world' ? 'world' : 'country') });
    dispatch({ type: 'ledEquivalenceResolved', fingerprint: ledFingerprint(snapshot, aggregation.total.energyWh), equivalence: calculateLedEquivalence(aggregation.total.energyWh, parameters!.shower.ledPowerW) });
  }

  return (
    <>
    <main className="app-shell" inert={summaryPending} aria-busy={summaryPending}>
      {step === 'methodology'
        ? <Methodology titleRef={methodologyTitle} onReturn={() => setStep(stepBeforeMethodology.current)} />
        : <header className="app-header">
          <div className="app-header-copy">
            <h1>{fr.title}</h1>
            {step === 'home' ? <p>{fr.introduction}</p> : null}
          </div>
        </header>}
      {visibleStep === 'home' ? <section hidden={step === 'methodology'} className="start-paths">
        <button type="button" className="primary-action" onClick={() => { setSelectionOrigin('home'); setStep('selection'); }}>{fr.startAction}</button>
        <button className="link-button methodology-help" type="button" onClick={openMethodology}>{fr.methodologyAction}</button>
      </section> : null}
      {visibleStep === 'selection' ? <section hidden={step === 'methodology'} aria-labelledby="step-title">
        <button className="back-button" type="button" onClick={() => setStep(selectionOrigin)}><Icon>←</Icon> {fr.backAction}</button>
        <h2 id="step-title" ref={stepTitle} tabIndex={-1}>{fr.selectionTitle}</h2>
        <p className="step-justification">{fr.selectionJustification}</p>
        <ConversationConfiguration state={state} dispatch={configurationDispatch} initialAdvancedOpen={openAdvancedOnSelection} ref={configuration} onValidityChange={setParametersValid} />
        <div className="sticky-actions">
          {parametersValid ? null : <p id="continue-blocked" className="continue-blocked" role="alert"><span aria-hidden="true">⚠ </span>{fr.continueBlockedExplanation}</p>}
          <button type="button" className="primary-action" aria-disabled={parametersValid ? undefined : true} aria-describedby={parametersValid ? undefined : 'continue-blocked'} onClick={continueToThread}>{fr.continueThreadAction}</button>
        </div>
      </section> : null}
      {visibleStep === 'thread' ? <section hidden={step === 'methodology'} aria-labelledby="step-title">
        <button className="back-button" type="button" onClick={() => { setSelectionOrigin('home'); setStep('selection'); }}><Icon>←</Icon> {fr.backAction}</button>
        <h2 id="step-title" ref={stepTitle} tabIndex={-1}>{fr.threadTitle}</h2>
        <p className="step-justification">{fr.threadJustification}</p>
        {recalculationNotice ? <p role="status" className="impact-stale">{recalculationNotice}</p> : null}
        <ConversationBlocks state={state} dispatch={blocksDispatch} onEditParameters={(trigger) => openSelection('thread', trigger)} />
        <div className="thread-reference"><p>{fr.currentReference(state.provider, state.modelId)}</p><button type="button" onClick={(event) => openSelection('thread', event.currentTarget)}>{fr.editReferenceAction}</button></div>
        <CalculationBar state={state} onCalculate={() => void calculateAll()} />
      </section> : null}
    </main>
    {summaryPending ? <div className="calculation-overlay">
      <div ref={calculationStatus} className="calculation-progress" role="status" aria-live="polite" tabIndex={-1}>
        <span className="calculation-spinner" aria-hidden="true" />
        <p>{fr.calculatingOverlayStatus}</p>
      </div>
    </div> : null}
    </>
  );
}
