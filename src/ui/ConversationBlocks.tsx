import { useEffect, useRef, type ChangeEvent } from 'react';
import {
  isIgnoredConversationBlock,
  type ConversationAction,
  type ConversationBlockField,
  type ConversationState,
} from '../application/conversationReducer';
import { fr } from '../i18n/fr';

interface ConversationBlocksProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
  readonly onCalculate: (blockId: string) => void;
  readonly onCalculateAll: () => void;
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

export function ConversationBlocks({ state, dispatch, onCalculate, onCalculateAll }: ConversationBlocksProps) {
  const nextBlockNumber = useRef(1);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusBlockId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (pendingFocusBlockId.current === undefined) return;
    const target = pendingFocusBlockId.current === null
      ? addButtonRef.current
      : removeButtonRefs.current.get(pendingFocusBlockId.current);
    target?.focus();
    pendingFocusBlockId.current = undefined;
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

  return (
    <section aria-labelledby="conversation-title" className="conversation-blocks">
      <div className="conversation-blocks-header">
        <h2 id="conversation-title">{fr.conversationLabel}</h2>
        <div className="conversation-actions">
          <button ref={addButtonRef} type="button" onClick={addBlock}>{fr.addBlockAction}</button>
          <button type="button" onClick={onCalculateAll} disabled={state.summary?.status === 'pending'}>
            {state.summary?.status === 'pending' ? fr.calculatingAllAction : fr.calculateAllAction}
          </button>
        </div>
      </div>
      {state.summary?.status === 'unavailable' ? <p role="status" className="summary-message">
        {state.summary.code === 'no-exchanges' ? fr.noExchangesForSummary : fr.summaryUnavailable}
      </p> : null}
      {state.summary?.status === 'result' ? <section className="summary-panel" aria-labelledby="summary-title" role="status">
        <h3 id="summary-title">{fr.summaryTitle}</h3>
        <p>{fr.energyLabel}: {formatImpact(state.summary.total.energyWh)} Wh</p>
        <p>{fr.carbonLabel}: {formatImpact(state.summary.total.carbonGco2e)} gCO2e</p>
        <p>{fr.waterLabel}: {formatImpact(state.summary.total.waterL)} L</p>
        <p>{fr.droughtRiskLabel}: {state.summary.droughtRisk.status === 'available'
          ? state.summary.droughtRisk.level : fr.droughtRiskUnavailable}</p>
        <p className="impact-note">{fr.summaryLimits}</p>
      </section> : null}
      {state.blocks.map((block, index) => {
        const ignored = isIgnoredConversationBlock(block);
        const impactState = state.impacts[block.blockId];
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
              <button type="button" onClick={() => onCalculate(block.blockId)} disabled={impactState?.status === 'pending' || state.summary?.status === 'pending'}>
                {impactState?.status === 'pending' ? fr.calculatingAction : fr.calculateAction}
              </button>
              {impactState?.status === 'result' ? <div role="status" className="impact-result">
                <p>{fr.energyLabel}: {formatImpact(impactState.impact.energyWh)} Wh</p>
                <p>{fr.carbonLabel}: {formatImpact(impactState.impact.carbonGco2e)} gCO2e</p>
                <p>{fr.waterLabel}: {formatImpact(impactState.impact.waterL)} L</p>
                <p className="impact-note">{fr.impactLimits}</p>
              </div> : null}
              {impactState?.status === 'error' ? <p role="alert" className="impact-error">{impactState.code === 'empty-block' ? fr.emptyBlockError : fr.invalidDataError}</p> : null}
            </div> : null}
          </fieldset>
        );
      })}
    </section>
  );
}
