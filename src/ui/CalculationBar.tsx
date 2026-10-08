import { isIgnoredConversationBlock, isImpactFresh, isSummaryFresh, type ConversationState } from '../application/conversationReducer';
import { useI18n } from '../i18n/I18nProvider';

interface CalculationBarProps {
  readonly state: ConversationState;
  readonly onCalculate: () => void;
}

/** Barre collante de l’étape 2/3 : l’unique action de calcul, son état et son erreur. */
export function CalculationBar({ state, onCalculate }: CalculationBarProps) {
  const { messages } = useI18n();
  const pending = state.summary?.status === 'pending';
  const hasContent = state.blocks.some((block) => !isIgnoredConversationBlock(block));
  const blockedExplanation = state.parameterValidationInvalid ? messages.calculateBlockedInvalid : '';
  const unavailable = Boolean(blockedExplanation) || !hasContent;
  const failed = !pending && (
    (state.summary?.status === 'unavailable' && state.summary.code === 'invalid-results' && isSummaryFresh(state))
    || state.blocks.some((block) => state.impacts[block.blockId]?.status === 'error' && isImpactFresh(state, block.blockId)));
  return (
    <div className="sticky-actions calculation-bar">
      {blockedExplanation ? <p id="calculate-blocked" className="continue-blocked">{blockedExplanation}</p> : null}
      {failed ? <p role="alert" className="impact-error calculation-error"><span aria-hidden="true">⚠ </span>{messages.calculationErrorAlert}</p> : null}
      <p role="status" className="calculation-status">{pending ? messages.calculatingAction : ''}</p>
      <button
        type="button"
        className="primary-action"
        aria-disabled={unavailable || pending ? true : undefined}
        aria-describedby={blockedExplanation ? 'calculate-blocked' : undefined}
        onClick={() => { if (!unavailable && !pending) onCalculate(); }}
      >{pending ? messages.calculatingAction : messages.calculateAction}</button>
    </div>
  );
}
