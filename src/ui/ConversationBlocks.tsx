import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
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
import { formatQuantity } from './quantityFormatter';
import { hostingCountryOptions, userCountryOptions } from '../data/modelCatalog';

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
  readonly onEditParameters?: (trigger: HTMLButtonElement) => void;
}

const fields: readonly { readonly name: ConversationBlockField; readonly label: string }[] = [
  { name: 'message', label: fr.messageLabel },
  { name: 'finalResponse', label: fr.finalResponseLabel },
];
const optionalFields: readonly { readonly name: ConversationBlockField; readonly label: string }[] = [
  { name: 'visibleReasoning', label: fr.visibleReasoningLabel },
  { name: 'artifact', label: fr.artifactLabel },
];

export const formatExchangeQuantity = formatQuantity;

export function ConversationBlocks({ state, dispatch, onCalculate, onCalculateAll, onRecalculateSummary = () => undefined, onEditParameters }: ConversationBlocksProps) {
  const nextBlockNumber = useRef(1);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const toggleButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const questionRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingFocus = useRef<{ kind: 'question' | 'toggle' | 'add'; blockId?: string } | null>(null);
  const pendingCancelFocus = useRef<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<ReadonlySet<string>>(() => new Set());
  const currentReplacementRevision = useRef(state.blocksReplacementRevision);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const sourceImports = useRef(new Map<string, Promise<void>>());
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});
  const currentSummary = state.summary?.status === 'result' && isSummaryCurrent(state) ? state.summary : undefined;
  const currentSummaryShower = isSummaryShowerEquivalenceCurrent(state) ? state.summaryShowerEquivalence : undefined;

  const Shower = ({ value, stale }: { value: typeof state.summaryShowerEquivalence; stale: boolean }) => value ? (
    <div className="shower-equivalence" role="status">
      {value.equivalence.status === 'available' ? <p><span aria-hidden="true">{fr.showerEquivalence(formatQuantity(value.equivalence.seconds, 'duration').display)}</span><span className="visually-hidden">{fr.showerEquivalence(formatQuantity(value.equivalence.seconds, 'duration').accessible)}</span></p> : <p>{fr.showerUnavailable}</p>}
      {value.equivalence.status === 'available' && value.equivalence.factorSource === 'world' ? <p className="impact-note">{fr.showerWorldFallback}</p> : null}
    </div>
  ) : stale ? <p role="status" className="impact-stale">{fr.staleShower}</p> : null;

  useLayoutEffect(() => {
    currentReplacementRevision.current = state.blocksReplacementRevision;
    sourceImports.current.clear();
    setExpandedBlocks(new Set());
    setConfirmRemoveId(null);
    setSourceStatus({});
  }, [state.blocksReplacementRevision]);

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
    setExpandedBlocks(new Set([blockId]));
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
    setExpandedBlocks((current) => new Set([...current].filter((id) => id !== blockId)));
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
    const replacementRevision = currentReplacementRevision.current;
    const previous = sourceImports.current.get(blockId) ?? Promise.resolve();
    const batch = previous.then(async () => {
      const rejected: string[] = [];
      for (const file of files) {
        if (currentReplacementRevision.current !== replacementRevision) return;
        try {
          const source = await readLocalSource(file);
          if (currentReplacementRevision.current !== replacementRevision) return;
          dispatch({ type: 'sourceAdded', blockId, source: { id: crypto.randomUUID(), ...source } });
        } catch {
          if (currentReplacementRevision.current !== replacementRevision) return;
          rejected.push(file.name);
        }
      }
      if (currentReplacementRevision.current !== replacementRevision) return;
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
      </div>
      {state.blocks.map((block, index) => {
        const ignored = isIgnoredConversationBlock(block);
        const impactState = state.impacts[block.blockId];
        const impactIsCurrent = isImpactCurrent(state, block.blockId);
        const impactIsStale = !ignored && impactState?.status === 'result' && !impactIsCurrent;
        const expanded = expandedBlocks.has(block.blockId);
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
          <section id={`conversation-${block.blockId}`} key={block.blockId} className={`conversation-block${expanded ? ' is-expanded' : ''}`} aria-label={fr.blockTitle(index + 1)} tabIndex={-1}>
            <div className="conversation-block-heading">
              <button ref={(element) => {
                if (element) removeButtonRefs.current.set(block.blockId, element);
                else removeButtonRefs.current.delete(block.blockId);
              }} className="icon-button remove-block" type="button" aria-label={fr.removeBlockAction(index + 1)} onClick={() => removeBlock(block.blockId)}><span aria-hidden="true">×</span></button>
              <h3>{fr.blockTitle(index + 1)}</h3>
              <button
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
              ><span aria-hidden="true" className="chevron">⌄</span><span className="visually-hidden">{expanded ? fr.collapseBlock(index + 1) : fr.expandBlock(index + 1)}</span></button>
            </div>
            {impactIsCurrent && impactState?.status === 'result' ? <div className="compact-impact" aria-label={fr.estimatedImpact}>
              {(['carbon', 'water'] as const).map((kind) => {
                const quantity = formatQuantity(kind === 'carbon' ? impactState.impact.carbonGco2e : impactState.impact.waterL, kind);
                return <span key={kind} aria-label={`${kind === 'carbon' ? fr.carbonLabel : fr.waterLabel} : ${quantity.accessible}`}>{kind === 'carbon' ? '🪨' : '💧'} {quantity.display}</span>;
              })}
            </div> : null}
            {!expanded ? <div className="conversation-preview">
              <p><strong>{fr.questionPreview} :</strong> {question || fr.noPreview}</p>
              <p><strong>{fr.responsePreview} :</strong> {response || fr.noPreview}</p>
            </div> : null}
            <p className={`exchange-status${impactIsStale ? ' impact-stale' : ''}`} role="status">{status}</p>
            {importArtifact ? <p role="status" className="import-notice">{fr.importArtifactDetected}</p> : null}
            {importSource ? <p role="status" className="import-notice">{fr.importSourceFileDetected}</p> : null}
            {sourceStatus[block.blockId] ? <p role="status" className="source-rejected">{sourceStatus[block.blockId]}</p> : null}
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
      <div className="conversation-actions conversation-actions-after-thread">
        <button ref={addButtonRef} className="icon-button" type="button" aria-label={fr.addBlockAction} onClick={addBlock}><span aria-hidden="true">+</span></button>
        <button type="button" onClick={onCalculateAll} disabled={state.summary?.status === 'pending' || state.parameterValidationInvalid}>
          {state.summary?.status === 'pending' ? fr.calculatingAllAction : fr.calculateAllAction}
        </button>
      </div>
      {state.summary?.status === 'unavailable' && isSummaryFresh(state) ? <div role="status" className="summary-message">
        <p>{state.summary.code === 'no-exchanges' ? fr.noExchangesForSummary : fr.summaryUnavailable}</p>
        {state.summary.blockingBlockIds?.length ? <ul>{state.summary.blockingBlockIds.map((blockId) => {
          const number = state.blocks.findIndex((block) => block.blockId === blockId) + 1;
          return <li key={blockId}><a href={`#conversation-${blockId}`} onClick={() => { setExpandedBlocks((current) => new Set([...current, blockId])); document.getElementById(`conversation-${blockId}`)?.focus(); }}>{fr.summaryBlockingBlock(number)}</a></li>;
        })}</ul> : null}
      </div> : null}
      {state.summary && !isSummaryFresh(state) ? <p role="status" className="summary-message">{fr.staleSummaryStatus}</p> : null}
      {currentSummary ? <section className="summary-panel" aria-labelledby="summary-title">
        <h3 id="summary-title">{fr.summaryTitle}</h3><p role="status" className="visually-hidden">{fr.summaryCurrentStatus}</p>
        {([['energy', fr.energyLabel, currentSummary.total.energyWh], ['carbon', fr.carbonLabel, currentSummary.total.carbonGco2e], ['water', fr.waterLabel, currentSummary.total.waterL]] as const).map(([kind, label, value]) => { const quantity = formatQuantity(value, kind); return <p key={kind}>{label}: <span aria-hidden="true">{quantity.display}</span><span className="visually-hidden">{quantity.accessible}</span></p>; })}
        <p className="impact-note">{fr.userCountryLabel} : {userCountryOptions.find((country) => country.code === state.userCountry)?.label ?? state.userCountry}</p>
        <Shower value={currentSummaryShower} stale={!!state.summaryShowerEquivalence && !currentSummaryShower} />
        <p>{fr.droughtRiskLabel}: {currentSummary.droughtRisk.status === 'available' ? currentSummary.droughtRisk.level : fr.droughtRiskUnavailable} ({hostingCountryOptions.find((country) => country.code === state.hostingCountry)?.label ?? state.hostingCountry})</p>
        {Object.values(currentSummary.factorSources ?? {}).includes('world') ? <p role="status" className="impact-note">{fr.worldFallbackNotice}</p> : null}
        <p className="impact-note">{fr.summaryLimits}</p><p className="impact-note">{fr.adaptiveUnitHelp}</p>
        <section className="good-practices" aria-labelledby="good-practices-title"><h4 id="good-practices-title">{fr.goodPracticesTitle}</h4><ul>{fr.goodPractices.map((practice) => <li key={practice}>{practice}</li>)}</ul></section>
      </section> : null}
    </section>
  );
}
