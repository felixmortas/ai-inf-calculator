import { formatQuantity } from '../ui/quantityFormatter';
import { buildShareText, type ShareableResult } from '../domain/shareableResult';
import { isIgnoredConversationBlock, isSummaryShowerEquivalenceCurrent, type ConversationState } from './conversationReducer';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareEnvironment {
  readonly share?: (data: { text: string }) => Promise<void>;
  readonly writeText?: (text: string) => Promise<void>;
}

/** Construit la projection fermée ; retourne `undefined` sans résultat valide. */
export function toShareableResult(
  state: ConversationState,
  location: { readonly origin: string; readonly pathname: string },
): ShareableResult | undefined {
  if (state.summary?.status !== 'result') return undefined;
  const total = state.summary.total;
  const equivalence = isSummaryShowerEquivalenceCurrent(state) ? state.summaryShowerEquivalence?.equivalence : undefined;
  return {
    chatbot: state.provider,
    exchangeCount: state.blocks.filter((block) => !isIgnoredConversationBlock(block)).length,
    showerAccessible: equivalence?.status === 'available' ? formatQuantity(equivalence.seconds, 'duration').accessible : undefined,
    carbon: formatQuantity(total.carbonGco2e, 'carbon').accessible,
    water: formatQuantity(total.waterL, 'water').accessible,
    electricity: formatQuantity(total.energyWh, 'energy').accessible,
    pageUrl: location.origin === 'null' ? location.pathname : `${location.origin}${location.pathname}`,
  };
}

/** Texte à partager, calculé au clic depuis l’état courant. */
export function buildShareTextFromState(state: ConversationState, location: { readonly origin: string; readonly pathname: string }): string | undefined {
  const shareable = toShareableResult(state, location);
  return shareable ? buildShareText(shareable) : undefined;
}

export function browserShareEnvironment(): ShareEnvironment {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return {
    share: nav && typeof nav.share === 'function' ? (data) => nav.share(data) : undefined,
    writeText: nav?.clipboard && typeof nav.clipboard.writeText === 'function' ? (text) => nav.clipboard.writeText(text) : undefined,
  };
}

async function copy(text: string, env: ShareEnvironment): Promise<ShareOutcome> {
  if (!env.writeText) return 'failed';
  try {
    await env.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function shareResult(text: string, env: ShareEnvironment): Promise<ShareOutcome> {
  if (env.share) {
    try {
      await env.share({ text });
      return 'shared';
    } catch (error) {
      if ((error as { name?: unknown } | null)?.name === 'AbortError') return 'cancelled';
    }
  }
  return copy(text, env);
}

/** Android 13+ confirme déjà la copie par un toast système ; ailleurs (PC, iOS), on alerte dans le navigateur. */
export function shouldAlertOnCopy(userAgent: string): boolean {
  return !/Android/i.test(userAgent);
}
