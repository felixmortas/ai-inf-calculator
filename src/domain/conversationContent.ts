/**
 * Frontière commune du contenu d'un bloc : les sources locales comptent au
 * même titre que les quatre champs éditables, sans dépendre du reducer.
 */
export interface ConversationContentBlock {
  readonly message: string;
  readonly sources?: readonly { readonly text: string }[];
  readonly finalResponse: string;
  readonly visibleReasoning: string;
  readonly artifact: string;
}

export function hasConversationBlockContent(block: ConversationContentBlock): boolean {
  return [
    block.message,
    block.finalResponse,
    block.visibleReasoning,
    block.artifact,
    ...(block.sources ?? []).map((source) => source.text),
  ].some((text) => text.trim() !== '');
}
