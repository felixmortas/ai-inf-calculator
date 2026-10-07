import { fr } from '../i18n/fr';

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

export function buildShareText(shareable: ShareableResult): string {
  return [
    fr.shareIntro(shareable.chatbot, shareable.exchangeCount, shareable.showerAccessible),
    fr.shareValues(shareable.carbon, shareable.electricity),
    fr.shareWater(shareable.water),
    fr.shareSource(shareable.pageUrl),
    fr.shareInvitation,
  ].join('\n');
}
