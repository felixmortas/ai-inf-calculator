import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  isIgnoredConversationBlock,
  isImpactCurrent,
  isImpactFresh,
  isSummaryCurrent,
  isSummaryShowerEquivalenceCurrent,
  isSummaryFresh,
  isAcceptedLocalSource,
  localSourceMaxBytes,
  type ConversationAction,
  type ConversationBlockField,
  type ConversationState,
} from '../application/conversationReducer';
import { fr } from '../i18n/fr';

export { localSourceMaxBytes } from '../application/conversationReducer';

export function acceptsLocalSource(file: Pick<File, 'name' | 'type' | 'size'>): boolean {
  return isAcceptedLocalSource({ name: file.name, type: file.type, size: file.size, text: 'validation' });
}

export async function readLocalSource(file: File): Promise<{ readonly name: string; readonly type: string; readonly size: number; readonly text: string }> {
  if (file.size > localSourceMaxBytes) throw new Error('too-large');
  if (file.size === 0) throw new Error('empty');
  if (!acceptsLocalSource(file)) throw new Error('unsupported');
  const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  if (text.length === 0) throw new Error('empty');
  if (text.includes('\0')) throw new Error('binary');
  return { name: file.name, type: file.type, size: file.size, text };
}

interface ConversationBlocksProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
  readonly onCalculate: (blockId: string) => void;
  readonly onCalculateAll: () => void;
  readonly onRecalculateSummary?: () => void;
}

const fields: readonly { readonly name: ConversationBlockField; readonly label: string }[] = [
  { name: 'message', label: fr.messageLabel },
  { name: 'finalResponse', label: fr.finalResponseLabel },
];
const optionalFields: readonly { readonly name: ConversationBlockField; readonly label: string }[] = [
  { name: 'visibleReasoning', label: fr.visibleReasoningLabel },
  { name: 'artifact', label: fr.artifactLabel },
];

type QuantityKind = 'carbon' | 'water';
const quantityUnits = {
  carbon: [
    { scale: 1e-6, symbol: 'µgCO₂e', name: 'microgrammes de dioxyde de carbone équivalent' },
    { scale: 1e-3, symbol: 'mgCO₂e', name: 'milligrammes de dioxyde de carbone équivalent' },
    { scale: 1, symbol: 'gCO₂e', name: 'grammes de dioxyde de carbone équivalent' },
    { scale: 1e3, symbol: 'kgCO₂e', name: 'kilogrammes de dioxyde de carbone équivalent' },
    { scale: 1e6, symbol: 'tCO₂e', name: 'tonnes de dioxyde de carbone équivalent' },
  ],
  water: [
    { scale: 1e-6, symbol: 'µL', name: 'microlitres d’eau' },
    { scale: 1e-3, symbol: 'mL', name: 'millilitres d’eau' },
    { scale: 1, symbol: 'L', name: 'litres d’eau' },
    { scale: 1e3, symbol: 'kL', name: 'kilolitres d’eau' },
    { scale: 1e6, symbol: 'ML', name: 'mégalitres d’eau' },
  ],
} as const;

export function formatExchangeQuantity(value: number, kind: QuantityKind): { display: string; accessible: string } {
  const units = quantityUnits[kind];
  if (value === 0) return { display: `0 ${units[2].symbol}`, accessible: `0 ${units[2].name}` };
  const magnitude = Math.abs(value);
  let unitIndex = 0;
  for (let index = 1; index < units.length; index++) {
    if (magnitude >= units[index].scale) unitIndex = index;
  }
  while (unitIndex < units.length - 1 && magnitude / units[unitIndex].scale >= 1000) unitIndex++;
  let amount = magnitude / units[unitIndex].scale;
  if (amount < 0.001) return { display: `< 0,001 ${units[unitIndex].symbol}`, accessible: `moins de 0,001 ${units[unitIndex].name}` };
  let rounded = Number(amount.toPrecision(3));
  if (rounded >= 1000 && unitIndex < units.length - 1) {
    unitIndex++;
    amount = magnitude / units[unitIndex].scale;
    rounded = Number(amount.toPrecision(3));
  }
  const number = new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 3, useGrouping: true }).format(rounded * Math.sign(value));
  return { display: `${number} ${units[unitIndex].symbol}`, accessible: `${number} ${units[unitIndex].name}` };
}

export function formatImpact(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 }).format(value);
}

export function ConversationBlocks({ state, dispatch, onCalculate, onCalculateAll, onRecalculateSummary = () => undefined }: ConversationBlocksProps) {
  const nextBlockNumber = useRef(1);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const toggleButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const questionRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingFocus = useRef<{ kind: 'question' | 'toggle' | 'add'; blockId?: string } | null>(null);
  const pendingCancelFocus = useRef<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const sourceImports = useRef(new Map<string, Promise<void>>());
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});
  const currentSummary = state.summary?.status === 'result' && isSummaryCurrent(state) ? state.summary : undefined;
  const currentSummaryShower = isSummaryShowerEquivalenceCurrent(state) ? state.summaryShowerEquivalence : undefined;
  const hasCurrentImpact = state.blocks.some((block) => isImpactCurrent(state, block.blockId));

  const Shower = ({ value, stale }: { value: typeof state.summaryShowerEquivalence; stale: boolean }) => value ? (
    <div className="shower-equivalence" role="status">
      {value.equivalence.status === 'available' ? <p>{fr.showerEquivalence(formatImpact(value.equivalence.seconds))}</p> : <p>{fr.showerUnavailable}</p>}
      {value.equivalence.status === 'available' && value.equivalence.factorSource === 'world' ? <p className="impact-note">{fr.showerWorldFallback}</p> : null}
    </div>
  ) : stale ? <p role="status" className="impact-stale">{fr.staleShower}</p> : null;

  useEffect(() => {
    if (!pendingFocus.current) return;
    const { kind, blockId } = pendingFocus.current;
    const target = kind === 'add' ? addButtonRef.current : kind === 'question'
      ? questionRefs.current.get(blockId ?? '') : toggleButtonRefs.current.get(blockId ?? '');
    target?.focus();
    pendingFocus.current = null;
  }, [state.blocks]);

  useEffect(() => {
    if (confirmRemoveId !== null || pendingCancelFocus.current === null) return;
    removeButtonRefs.current.get(pendingCancelFocus.current)?.focus();
    pendingCancelFocus.current = null;
  }, [confirmRemoveId]);

  useEffect(() => {
    const importedHighest = state.blocks.reduce((highest, block) => {
      const match = /^block-(\d+)$/.exec(block.blockId);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    nextBlockNumber.current = Math.max(nextBlockNumber.current, importedHighest + 1);
  }, [state.blocks]);

  function addBlock() {
    const blockId = `block-${nextBlockNumber.current++}`;
    pendingFocus.current = { kind: 'question', blockId };
    setExpandedBlocks(new Set());
    setConfirmRemoveId(null);
    dispatch({ type: 'blockAdded', blockId });
  }

  function updateBlock(blockId: string, field: ConversationBlockField, event: ChangeEvent<HTMLTextAreaElement>) {
    dispatch({ type: 'blockUpdated', blockId, field, value: event.currentTarget.value });
  }

  function removeBlock(blockId: string) {
    const index = state.blocks.findIndex((block) => block.blockId === blockId);
    const remaining = state.blocks.filter((block) => block.blockId !== blockId);
    const neighbor = remaining[Math.min(index, remaining.length - 1)];
    pendingFocus.current = neighbor && neighbor !== remaining[remaining.length - 1]
      ? { kind: 'toggle', blockId: neighbor.blockId } : { kind: 'add' };
    setConfirmRemoveId(null);
    dispatch({ type: 'blockRemoved', blockId });
  }

  function requestRemove(blockId: string) {
    const block = state.blocks.find((item) => item.blockId === blockId);
    if (!block) return;
    if ([block.message, block.finalResponse, block.visibleReasoning, block.artifact].some((value) => value.trim()) || block.sources?.length) {
      setConfirmRemoveId(blockId);
    } else removeBlock(blockId);
  }

  function cancelRemove(blockId: string) {
    pendingCancelFocus.current = blockId;
    setConfirmRemoveId(null);
  }

  function addSources(blockId: string, event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.currentTarget.files ?? [])];
    event.currentTarget.value = '';
    const previous = sourceImports.current.get(blockId) ?? Promise.resolve();
    const batch = previous.then(async () => {
      const rejected: string[] = [];
      for (const file of files) {
        try {
          const source = await readLocalSource(file);
          dispatch({ type: 'sourceAdded', blockId, source: { id: crypto.randomUUID(), ...source } });
        } catch {
          rejected.push(file.name);
        }
      }
      setSourceStatus((current) => ({ ...current, [blockId]: rejected.length ? fr.sourceRejected(rejected.join(', ')) : '' }));
    });
    sourceImports.current.set(blockId, batch);
    void batch.finally(() => {
      if (sourceImports.current.get(blockId) === batch) sourceImports.current.delete(blockId);
    });
  }

  return (
    <section aria-labelledby="conversation-title" className="conversation-blocks">
      <div className="conversation-blocks-header">
        <h2 id="conversation-title">{fr.conversationLabel}</h2>
        <div className="conversation-actions">
          <button ref={addButtonRef} type="button" onClick={addBlock}>{fr.addBlockAction}</button>
          <button type="button" onClick={onCalculateAll} disabled={state.summary?.status === 'pending' || state.parameterValidationInvalid}>
            {state.summary?.status === 'pending' ? fr.calculatingAllAction : fr.calculateAllAction}
          </button>
          <button type="button" onClick={onRecalculateSummary} disabled={state.summary?.status === 'pending' || state.parameterValidationInvalid}>
            {fr.recalculateSummaryAction}
          </button>
        </div>
      </div>
      {state.summary?.status === 'unavailable' && isSummaryFresh(state) ? <div role="status" className="summary-message">
        <p>{state.summary.code === 'no-exchanges' ? fr.noExchangesForSummary : fr.summaryUnavailable}</p>
        {state.summary.blockingBlockIds?.length ? <ul>{state.summary.blockingBlockIds.map((blockId) => {
          const number = state.blocks.findIndex((block) => block.blockId === blockId) + 1;
          return <li key={blockId}>{fr.summaryBlockingBlock(number)}</li>;
        })}</ul> : null}
      </div> : null}
      {state.summary && !isSummaryFresh(state) ? <p role="status" className="summary-message">{fr.staleSummaryStatus}</p> : null}
      {currentSummary ? <section className="summary-panel" aria-labelledby="summary-title" role="status">
        <h3 id="summary-title">{fr.summaryTitle}</h3>
        <p>{fr.energyLabel}: {formatImpact(currentSummary.total.energyWh)} Wh</p>
        <p>{fr.carbonLabel}: {formatImpact(currentSummary.total.carbonGco2e)} gCO2e</p>
        <p>{fr.waterLabel}: {formatImpact(currentSummary.total.waterL)} L</p>
        <Shower value={currentSummaryShower} stale={!!state.summaryShowerEquivalence && !currentSummaryShower} />
        <p>{fr.droughtRiskLabel}: {currentSummary.droughtRisk.status === 'available'
          ? currentSummary.droughtRisk.level : fr.droughtRiskUnavailable}</p>
        {Object.values(currentSummary.factorSources ?? {}).includes('world') ? <p role="status" className="impact-note">{fr.worldFallbackNotice}</p> : null}
        <p className="impact-note">{fr.summaryLimits}</p>
      </section> : null}
      {state.blocks.map((block, index) => {
        const ignored = isIgnoredConversationBlock(block);
        const impactState = state.impacts[block.blockId];
        const impactIsCurrent = isImpactCurrent(state, block.blockId);
        const impactIsStale = !ignored && impactState?.status === 'result' && !impactIsCurrent;
        const isLatest = index === state.blocks.length - 1;
        const expanded = isLatest || expandedBlocks.has(block.blockId);
        const editorId = `conversation-${block.blockId}-editor`;
        const question = block.message.trim();
        const response = block.finalResponse.trim();
        const importArtifact = /sandbox:\/mnt\/data\/[^\s)\]]+/i.test(block.finalResponse);
        const importSource = /filecite[^]+/u.test(block.finalResponse);
        const status = ignored ? fr.ignoredBlockStatus : impactIsStale ? fr.staleImpactStatus
          : impactState?.status === 'pending' && isImpactFresh(state, block.blockId) ? fr.pendingEstimate
          : impactState?.status === 'error' && isImpactFresh(state, block.blockId) ? fr.failedEstimate
          : impactIsCurrent ? fr.currentEstimate : fr.awaitingEstimate;
        return (
          <section key={block.blockId} className={`conversation-block${expanded ? ' is-expanded' : ''}`} aria-label={fr.blockTitle(index + 1)}>
            <div className="conversation-block-heading">
              <h3>{fr.blockTitle(index + 1)}</h3>
              {!isLatest ? <button
                ref={(element) => {
                  if (element) toggleButtonRefs.current.set(block.blockId, element);
                  else toggleButtonRefs.current.delete(block.blockId);
                }}
                type="button"
                aria-expanded={expanded}
                aria-controls={editorId}
                onClick={() => {
                  if (confirmRemoveId === block.blockId) setConfirmRemoveId(null);
                  setExpandedBlocks((current) => {
                  const next = new Set(current);
                  if (next.has(block.blockId)) next.delete(block.blockId);
                  else next.add(block.blockId);
                  return next;
                  });
                }}
              >{expanded ? fr.collapseBlock(index + 1) : fr.expandBlock(index + 1)}</button> : null}
            </div>
            {!expanded ? <div className="conversation-preview">
              <p><strong>{fr.questionPreview} :</strong> {question || fr.noPreview}</p>
              <p><strong>{fr.responsePreview} :</strong> {response || fr.noPreview}</p>
            </div> : null}
            <p className={`exchange-status${impactIsStale ? ' impact-stale' : ''}`} role="status">{status}</p>
            {importArtifact ? <p role="status" className="import-notice">{fr.importArtifactDetected}</p> : null}
            {importSource ? <p role="status" className="import-notice">{fr.importSourceFileDetected}</p> : null}
            {sourceStatus[block.blockId] ? <p role="status" className="source-rejected">{sourceStatus[block.blockId]}</p> : null}
            {impactIsCurrent && impactState?.status === 'result' ? <div role="status" className="impact-result">
              <p className="impact-result-title">{fr.estimatedImpact}</p>
              {(['carbon', 'water'] as const).map((kind) => {
                const quantity = formatExchangeQuantity(kind === 'carbon' ? impactState.impact.carbonGco2e : impactState.impact.waterL, kind);
                return <p key={kind}>{kind === 'carbon' ? fr.carbonLabel : fr.waterLabel} : <span aria-hidden="true">{quantity.display}</span><span className="visually-hidden">{quantity.accessible}</span></p>;
              })}
              <p className="impact-note">{fr.adaptiveUnitHelp}</p>
              {Object.values(impactState.factorSources ?? {}).includes('world') ? <p className="impact-note">{fr.worldFallbackNotice}</p> : null}
              <p className="impact-note">{fr.impactLimits}</p>
            </div> : null}
            {impactState?.status === 'error' && isImpactFresh(state, block.blockId) ? <p role="alert" className="impact-error">{impactState.code === 'empty-block' ? fr.emptyBlockError : fr.invalidDataError}</p> : null}
            <div id={editorId} hidden={!expanded} className="block-editor">
              {fields.map(({ name, label }) => {
                const id = `conversation-${block.blockId}-${name}`;
                return <div className="field" key={name}>
                  <label htmlFor={id}>{label}</label>
                  <textarea id={id} ref={name === 'message' ? (element) => {
                    if (element) questionRefs.current.set(block.blockId, element);
                    else questionRefs.current.delete(block.blockId);
                  } : undefined} value={block[name]} onChange={(event) => updateBlock(block.blockId, name, event)} />
                </div>;
              })}
              <details className="optional-contents">
                <summary>{fr.optionalContents}</summary>
                {optionalFields.map(({ name, label }) => {
                  const id = `conversation-${block.blockId}-${name}`;
                  return <div className="field" key={name}>
                    <label htmlFor={id}>{label}</label>
                    <textarea id={id} value={block[name]} onChange={(event) => updateBlock(block.blockId, name, event)} />
                  </div>;
                })}
                <div className="field local-sources">
                  <label htmlFor={`conversation-${block.blockId}-sources`}>{fr.sourcesLabel}</label>
                  <input id={`conversation-${block.blockId}-sources`} type="file" multiple accept=".txt,.md,.markdown,.json,.csv,.log,.py,.js,.ts,.html,.xml,.yaml,.yml,text/*,application/json" onChange={(event) => addSources(block.blockId, event)} />
                  <p className="field-help">{fr.sourcesHelp}</p>
                  {(block.sources ?? []).length ? <ul className="source-list">{(block.sources ?? []).map((source) => <li key={source.id}>
                    <span>{fr.sourceCounted(source.name, source.size)}</span>
                    <button type="button" onClick={() => dispatch({ type: 'sourceRemoved', blockId: block.blockId, sourceId: source.id })}>{fr.removeSourceAction(source.name)}</button>
                  </li>)}</ul> : null}
                </div>
              </details>
              <div className="block-actions">
                <button type="button" onClick={() => onCalculate(block.blockId)} disabled={ignored || state.parameterValidationInvalid || (impactState?.status === 'pending' && isImpactFresh(state, block.blockId)) || state.summary?.status === 'pending'}>
                  {impactState?.status === 'pending' ? fr.calculatingAction : impactIsStale ? fr.recalculateAction : fr.calculateAction}
                </button>
                <button ref={(element) => {
                  if (element) removeButtonRefs.current.set(block.blockId, element);
                  else removeButtonRefs.current.delete(block.blockId);
                }} type="button" onClick={() => requestRemove(block.blockId)}>{fr.removeBlockAction(index + 1)}</button>
              </div>
              {ignored ? <p className="field-help">{fr.emptyBlockError}</p> : null}
              {confirmRemoveId === block.blockId ? <div className="remove-confirmation" role="group" aria-label={fr.confirmRemove(index + 1)}>
                <p>{fr.confirmRemove(index + 1)}</p>
                <button type="button" onClick={() => cancelRemove(block.blockId)}>{fr.cancelRemoveAction}</button>
                <button type="button" onClick={() => removeBlock(block.blockId)}>{fr.confirmRemoveAction}</button>
              </div> : null}
            </div>
          </section>
        );
      })}
      {currentSummary || hasCurrentImpact ? <section className="good-practices" aria-labelledby="good-practices-title">
        <h3 id="good-practices-title">{fr.goodPracticesTitle}</h3>
        <ul>
          {fr.goodPractices.map((practice) => <li key={practice}>{practice}</li>)}
        </ul>
      </section> : null}
    </section>
  );
}
