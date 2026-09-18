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
}

const fields: readonly { readonly name: ConversationBlockField; readonly label: string }[] = [
  { name: 'message', label: fr.messageLabel },
  { name: 'finalResponse', label: fr.finalResponseLabel },
  { name: 'visibleReasoning', label: fr.visibleReasoningLabel },
  { name: 'artifact', label: fr.artifactLabel },
];

export function ConversationBlocks({ state, dispatch }: ConversationBlocksProps) {
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
        <button ref={addButtonRef} type="button" onClick={addBlock}>{fr.addBlockAction}</button>
      </div>
      {state.blocks.map((block, index) => {
        const ignored = isIgnoredConversationBlock(block);
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
          </fieldset>
        );
      })}
    </section>
  );
}
