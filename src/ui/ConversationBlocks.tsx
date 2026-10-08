import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  isIgnoredConversationBlock,
  isImpactCurrent,
  isImpactFresh,
  isAcceptedLocalSource,
  localSourceMaxBytes,
  type ConversationAction,
  type ConversationBlockField,
  type ConversationState,
} from '../application/conversationReducer';
import type { Messages } from '../i18n/fr';
import { useI18n } from '../i18n/I18nProvider';
import { formatQuantity } from './quantityFormatter';
import { ResultSection } from './ResultSection';

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
  readonly onEditParameters?: (trigger: HTMLButtonElement) => void;
  readonly random?: () => number;
}

const fields = [
  { name: 'message', label: 'messageLabel' },
  { name: 'finalResponse', label: 'finalResponseLabel' },
] as const satisfies readonly { readonly name: ConversationBlockField; readonly label: keyof Messages }[];
const optionalFields = [
  { name: 'visibleReasoning', label: 'visibleReasoningLabel' },
  { name: 'artifact', label: 'artifactLabel' },
] as const satisfies readonly { readonly name: ConversationBlockField; readonly label: keyof Messages }[];

export const formatExchangeQuantity = formatQuantity;

export function ConversationBlocks({ state, dispatch, onEditParameters, random }: ConversationBlocksProps) {
  const { messages, locale } = useI18n();
  // Kept available for restoring the parameter action later.
  void onEditParameters;
  const nextBlockNumber = useRef(1);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const questionRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ kind: 'question' | 'card' | 'add'; blockId?: string } | null>(null);
  const pendingCancelFocus = useRef<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const sourceImports = useRef(new Map<string, Promise<void>>());
  const [sourceStatus, setSourceStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!pendingFocus.current) return;
    const { kind, blockId } = pendingFocus.current;
    const target = kind === 'add' ? addButtonRef.current : kind === 'question'
      ? questionRefs.current.get(blockId ?? '') : document.getElementById(`conversation-${blockId}`);
    target?.focus();
    pendingFocus.current = null;
  }, [state.blocks]);

  useEffect(() => {
    if (confirmRemoveId !== null) {
      cancelButtonRef.current?.focus();
      const shell = document.querySelector('.app-shell');
      shell?.setAttribute('inert', '');
      return () => { shell?.removeAttribute('inert'); };
    }
    if (pendingCancelFocus.current === null) return;
    removeButtonRefs.current.get(pendingCancelFocus.current)?.focus();
    pendingCancelFocus.current = null;
  }, [confirmRemoveId]);

  useEffect(() => {
    const highestBlockNumber = state.blocks.reduce((highest, block) => {
      const match = /^block-(\d+)$/.exec(block.blockId);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    nextBlockNumber.current = Math.max(nextBlockNumber.current, highestBlockNumber + 1);
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
    pendingFocus.current = neighbor ? { kind: 'card', blockId: neighbor.blockId } : { kind: 'add' };
    setExpandedBlocks((current) => new Set([...current].filter((id) => id !== blockId)));
    setConfirmRemoveId(null);
    dispatch({ type: 'blockRemoved', blockId });
  }

  function requestRemove(blockId: string) {
    const block = state.blocks.find((item) => item.blockId === blockId);
    if (!block) return;
    if (!isIgnoredConversationBlock(block) || [block.message, block.finalResponse, block.visibleReasoning, block.artifact].some((value) => value.trim()) || block.sources?.length) {
      setConfirmRemoveId(blockId);
    } else removeBlock(blockId);
  }

  function cancelRemove(blockId: string) {
    pendingCancelFocus.current = blockId;
    setConfirmRemoveId(null);
  }

  function trapDialogKeys(event: KeyboardEvent<HTMLDivElement>, blockId: string) {
    if (event.key === 'Escape') { event.preventDefault(); cancelRemove(blockId); return; }
    if (event.key !== 'Tab') return;
    const first = cancelButtonRef.current;
    const last = confirmButtonRef.current;
    if (!first || !last) return;
    if (!event.currentTarget.contains(document.activeElement)) { event.preventDefault(); first.focus(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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
      setSourceStatus((current) => ({ ...current, [blockId]: rejected.join(', ') }));
    });
    sourceImports.current.set(blockId, batch);
    void batch.finally(() => {
      if (sourceImports.current.get(blockId) === batch) sourceImports.current.delete(blockId);
    });
  }

  const removing = state.blocks.findIndex((block) => block.blockId === confirmRemoveId);

  return (
    <section aria-labelledby="conversation-title" className="conversation-blocks">
      <div className="conversation-blocks-header">
        <h2 id="conversation-title">{messages.conversationLabel}</h2>
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
        const artifactReference = /sandbox:\/mnt\/data\/[^\s)\]]+/i.test(block.finalResponse);
        const sourceFileReference = /filecite[^]+/u.test(block.finalResponse);
        const [statusIcon, status] = ignored ? ['', ''] as const
          : impactIsStale ? ['↻', messages.staleEstimate] as const
          : impactState?.status === 'pending' && isImpactFresh(state, block.blockId) ? ['…', messages.pendingEstimate] as const
          : impactState?.status === 'error' && isImpactFresh(state, block.blockId) ? ['✕', messages.failedEstimate] as const
          : impactIsCurrent ? ['✓', messages.currentEstimate] as const : ['', ''] as const;
        const impactRow = (status || impactIsCurrent) ? (<div className="impact-row">
              {impactIsCurrent && impactState?.status === 'result' ? <div className="compact-impact" aria-label={messages.estimatedImpact}>
                {(['carbon', 'water'] as const).map((kind) => {
                  const quantity = formatQuantity(kind === 'carbon' ? impactState.impact.carbonGco2e : impactState.impact.waterL, kind, messages, locale);
                  return <span key={kind} aria-label={`${kind === 'carbon' ? messages.carbonLabel : messages.waterLabel} : ${quantity.accessible}`}>{kind === 'carbon' ? '🪨' : '💧'} {quantity.display}</span>;
                })}
              </div> : null}
              {status ? <p className={`exchange-status${impactIsStale ? ' impact-stale' : ''}`}>{statusIcon ? <span aria-hidden="true">{statusIcon} </span> : null}{status}</p> : null}
            </div>) : null;
        return (
          <section id={`conversation-${block.blockId}`} key={block.blockId} className={`conversation-block${expanded ? ' is-expanded' : ''}`} aria-label={messages.blockLabel(index + 1)} tabIndex={-1}>
            <div className="conversation-block-heading">
              <h3>{messages.blockTitle(index + 1)}</h3>
              <button ref={(element) => {
                if (element) removeButtonRefs.current.set(block.blockId, element);
                else removeButtonRefs.current.delete(block.blockId);
              }} className="remove-block" type="button" aria-label={messages.removeBlockAction(index + 1)} onClick={() => requestRemove(block.blockId)}><span aria-hidden="true">🗑️</span></button>
            </div>
            {!expanded ? <div className="conversation-preview">
              <p><strong>{messages.questionPreview} :</strong> {question || messages.noPreview}</p>
              <p><strong>{messages.responsePreview} :</strong> {response || messages.noPreview}</p>
            </div> : null}
            {artifactReference ? <p className="content-notice">{messages.artifactReferenceDetected}</p> : null}
            {sourceFileReference ? <p className="content-notice">{messages.sourceFileReferenceDetected}</p> : null}
            {sourceStatus[block.blockId] ? <p role="status" className="source-rejected">{messages.sourceRejected(sourceStatus[block.blockId])}</p> : null}
            <div className="block-actions">
              <button
                type="button"
                className="toggle-block"
                aria-expanded={expanded}
                aria-controls={editorId}
                aria-label={expanded ? messages.collapseBlock(index + 1) : messages.expandBlock(index + 1)}
                onClick={() => {
                  setExpandedBlocks((current) => {
                    const next = new Set(current);
                    if (next.has(block.blockId)) next.delete(block.blockId);
                    else next.add(block.blockId);
                    return next;
                  });
                }}
              ><span aria-hidden="true" className="chevron">⌄</span> {expanded ? messages.collapseAction : messages.expandAction}</button>
            </div>
            {!expanded ? impactRow : null}
            <div id={editorId} hidden={!expanded} className="block-editor">
              {fields.map(({ name, label }) => {
                const id = `conversation-${block.blockId}-${name}`;
                return <div className="field" key={name}>
                  <label htmlFor={id}>{messages[label]}</label>
                  <textarea id={id} ref={name === 'message' ? (element) => {
                    if (element) questionRefs.current.set(block.blockId, element);
                    else questionRefs.current.delete(block.blockId);
                  } : undefined} value={block[name]} onChange={(event) => updateBlock(block.blockId, name, event)} />
                </div>;
              })}
              <details className="optional-contents">
                <summary>{messages.optionalContents}</summary>
                {optionalFields.map(({ name, label }) => {
                  const id = `conversation-${block.blockId}-${name}`;
                  return <div className="field" key={name}>
                    <label htmlFor={id}>{messages[label]}</label>
                    <textarea id={id} value={block[name]} onChange={(event) => updateBlock(block.blockId, name, event)} />
                  </div>;
                })}
                <div className="field local-sources">
                  <label htmlFor={`conversation-${block.blockId}-sources`}>{messages.sourcesLabel}</label>
                  <input id={`conversation-${block.blockId}-sources`} type="file" multiple accept=".txt,.md,.markdown,.json,.csv,.log,.py,.js,.ts,.html,.xml,.yaml,.yml,text/*,application/json" onChange={(event) => addSources(block.blockId, event)} />
                  <p className="field-help">{messages.sourcesHelp}</p>
                  {(block.sources ?? []).length ? <ul className="source-list">{(block.sources ?? []).map((source) => <li key={source.id}>
                    <span>{messages.sourceCounted(source.name, source.size)}</span>
                    <button type="button" onClick={() => dispatch({ type: 'sourceRemoved', blockId: block.blockId, sourceId: source.id })}>{messages.removeSourceAction(source.name)}</button>
                  </li>)}</ul> : null}
                </div>
              </details>
            </div>
            {expanded ? impactRow : null}
          </section>
        );
      })}
      <div className="conversation-actions conversation-actions-after-thread">
        <button ref={addButtonRef} type="button" onClick={addBlock}>{messages.addBlockAction}</button>
      </div>
      {confirmRemoveId !== null && removing >= 0 ? createPortal(
        <div className="modal-backdrop">
          <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="remove-dialog-title" onKeyDown={(event) => trapDialogKeys(event, confirmRemoveId)}>
            <p id="remove-dialog-title">{messages.confirmRemove(removing + 1)}</p>
            <div className="modal-actions">
              <button ref={cancelButtonRef} type="button" onClick={() => cancelRemove(confirmRemoveId)}>{messages.cancelRemoveAction}</button>
              <button ref={confirmButtonRef} type="button" className="danger-action" onClick={() => removeBlock(confirmRemoveId)}>{messages.confirmRemoveAction}</button>
            </div>
          </div>
        </div>, document.body) : null}
      <ResultSection state={state} random={random} />
    </section>
  );
}
