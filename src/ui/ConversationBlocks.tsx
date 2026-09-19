import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  isIgnoredConversationBlock,
  isImpactCurrent,
  isImpactFresh,
  isShowerEquivalenceCurrent,
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
  { name: 'visibleReasoning', label: fr.visibleReasoningLabel },
  { name: 'artifact', label: fr.artifactLabel },
];

export function formatImpact(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 }).format(value);
}

export function ConversationBlocks({ state, dispatch, onCalculate, onCalculateAll, onRecalculateSummary = () => undefined }: ConversationBlocksProps) {
  const nextBlockNumber = useRef(1);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusBlockId = useRef<string | null | undefined>(undefined);
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
    if (pendingFocusBlockId.current === undefined) return;
    const target = pendingFocusBlockId.current === null
      ? addButtonRef.current
      : removeButtonRefs.current.get(pendingFocusBlockId.current);
    target?.focus();
    pendingFocusBlockId.current = undefined;
  }, [state.blocks]);

  useEffect(() => {
    const importedHighest = state.blocks.reduce((highest, block) => {
      const match = /^block-(\d+)$/.exec(block.blockId);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    nextBlockNumber.current = Math.max(nextBlockNumber.current, importedHighest + 1);
  }, [state.blocks]);

  function addBlock() {
    dispatch({ type: 'blockAdded', blockId: `block-${nextBlockNumber.current++}` });
  }

  function updateBlock(blockId: string, field: ConversationBlockField, event: ChangeEvent<HTMLTextAreaElement>) {
    dispatch({ type: 'blockUpdated', blockId, field, value: event.currentTarget.value });
  }

  function removeBlock(blockId: string) {
    const index = state.blocks.findIndex((block) => block.blockId === blockId);
    const nextFocusBlock = state.blocks[index + 1] ?? state.blocks[index - 1];
    pendingFocusBlockId.current = nextFocusBlock?.blockId ?? null;
    dispatch({ type: 'blockRemoved', blockId });
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
        const shower = state.showerEquivalences[block.blockId];
        const showerCurrent = isShowerEquivalenceCurrent(state, block.blockId);
        return (
          <fieldset key={block.blockId} className="conversation-block">
            <legend>{fr.blockTitle(index + 1)}</legend>
            <div className="conversation-block-heading">
              <button
                ref={(element) => {
                  if (element) removeButtonRefs.current.set(block.blockId, element);
                  else removeButtonRefs.current.delete(block.blockId);
                }}
                type="button"
                onClick={() => removeBlock(block.blockId)}
              >
                {fr.removeBlockAction(index + 1)}
              </button>
            </div>
            {ignored ? <p className="ignored-status" role="status">{fr.ignoredBlockStatus}</p> : null}
            {/sandbox:\/mnt\/data\/[^\s)\]]+/i.test(block.finalResponse) ? <p role="status" className="import-notice">{fr.importArtifactDetected}</p> : null}
            {/filecite[^]+/u.test(block.finalResponse) ? <p role="status" className="import-notice">{fr.importSourceFileDetected}</p> : null}
            <div className="field local-sources">
              <label htmlFor={`conversation-${block.blockId}-sources`}>{fr.sourcesLabel}</label>
              <input id={`conversation-${block.blockId}-sources`} type="file" multiple accept=".txt,.md,.markdown,.json,.csv,.log,.py,.js,.ts,.html,.xml,.yaml,.yml,text/*,application/json" onChange={(event) => addSources(block.blockId, event)} />
              <p className="field-help">{fr.sourcesHelp}</p>
              {sourceStatus[block.blockId] ? <p role="status" className="source-rejected">{sourceStatus[block.blockId]}</p> : null}
              {(block.sources ?? []).length ? <ul className="source-list">{(block.sources ?? []).map((source) => <li key={source.id}>
                <span>{fr.sourceCounted(source.name, source.size)}</span>
                <button type="button" onClick={() => dispatch({ type: 'sourceRemoved', blockId: block.blockId, sourceId: source.id })}>{fr.removeSourceAction(source.name)}</button>
              </li>)}</ul> : null}
            </div>
            {fields.map(({ name, label }) => {
              const id = `conversation-${block.blockId}-${name}`;
              return (
                <div className="field" key={name}>
                  <label htmlFor={id}>{label}</label>
                  <textarea id={id} value={block[name]} onChange={(event) => updateBlock(block.blockId, name, event)} />
                </div>
              );
            })}
            {!ignored ? <div className="impact-panel">
              <button type="button" onClick={() => onCalculate(block.blockId)} disabled={state.parameterValidationInvalid || (impactState?.status === 'pending' && isImpactFresh(state, block.blockId)) || state.summary?.status === 'pending'}>
                {impactState?.status === 'pending' ? fr.calculatingAction : fr.calculateAction}
              </button>
              {impactIsStale ? <p role="status" className="impact-stale">{fr.staleImpactStatus}</p> : null}
              {impactIsCurrent && impactState?.status === 'result' ? <div role="status" className="impact-result">
                <p>{fr.energyLabel}: {formatImpact(impactState.impact.energyWh)} Wh</p>
                <p>{fr.carbonLabel}: {formatImpact(impactState.impact.carbonGco2e)} gCO2e</p>
                <p>{fr.waterLabel}: {formatImpact(impactState.impact.waterL)} L</p>
                <Shower value={showerCurrent ? shower : undefined} stale={!!shower && !showerCurrent} />
                {Object.values(impactState.factorSources ?? {}).includes('world') ? <p className="impact-note">{fr.worldFallbackNotice}</p> : null}
                <p className="impact-note">{fr.impactLimits}</p>
              </div> : null}
              {impactState?.status === 'error' && isImpactFresh(state, block.blockId) ? <p role="alert" className="impact-error">{impactState.code === 'empty-block' ? fr.emptyBlockError : fr.invalidDataError}</p> : null}
            </div> : null}
          </fieldset>
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
