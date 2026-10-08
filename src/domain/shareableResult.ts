import type { Messages } from '../i18n/fr';

/** Projection fermée : aucune donnée de conversation, aucun paramètre de session. */
export interface ShareableResult {
  readonly chatbot: string;
  readonly exchangeCount: number;
  /** Durée de douche en clair ; absente si l’équivalence n’est pas calculable. */
  readonly showerAccessible?: string;
  readonly carbon: string;
  readonly water: string;
  readonly electricity: string;
  /** `origin + pathname`, sans requête ni fragment. */
  readonly pageUrl: string;
}

export function buildShareText(shareable: ShareableResult, messages: Messages): string {
  return [
    messages.shareIntro(shareable.chatbot, shareable.exchangeCount, shareable.showerAccessible),
    messages.shareValues(shareable.carbon, shareable.electricity),
    messages.shareWater(shareable.water),
    messages.shareSource(shareable.pageUrl),
    messages.shareInvitation,
  ].join('\n');
}
