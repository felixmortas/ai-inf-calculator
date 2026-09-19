import { hasConversationBlockContent } from './conversationContent';

export interface ConversationHistoryBlock {
  readonly blockId: string;
  readonly message: string;
  readonly sources?: readonly { readonly text: string }[];
  readonly finalResponse: string;
  readonly visibleReasoning: string;
  readonly artifact: string;
}

export interface PreparedConversationHistory {
  readonly priorMessages: readonly string[];
  readonly priorSources: readonly string[];
  readonly priorVisibleReasoning: readonly string[];
  readonly priorFinalResponses: readonly string[];
  readonly artifactReference: string;
  readonly artifactContribution: string;
  readonly systemPromptCacheTokens: number;
}

const emptyPreparation: PreparedConversationHistory = Object.freeze({
  priorMessages: Object.freeze([]), priorSources: Object.freeze([]), priorVisibleReasoning: Object.freeze([]), priorFinalResponses: Object.freeze([]),
  artifactReference: '', artifactContribution: '', systemPromptCacheTokens: 0,
});

function isIgnoredBlock(block: ConversationHistoryBlock): boolean {
  return !hasConversationBlockContent(block);
}

function words(text: string): readonly string[] {
  return text.match(/\S+/gu) ?? [];
}

/** Diff déterministe par occurrences, en temps et mémoire linéaires. */
export function artifactWordDiff(previousArtifact: string, currentArtifact: string): string {
  if (currentArtifact.trim() === '' || currentArtifact === previousArtifact) return '';
  if (previousArtifact.trim() === '') return currentArtifact;
  const available = new Map<string, number>();
  for (const word of words(previousArtifact)) available.set(word, (available.get(word) ?? 0) + 1);
  return words(currentArtifact).filter((word) => {
    const count = available.get(word) ?? 0;
    if (count === 0) return true;
    available.set(word, count - 1);
    return false;
  }).join(' ');
}

export function prepareConversationHistory(
  blocks: readonly ConversationHistoryBlock[], target: number | string, systemPromptCacheTokens: number,
): PreparedConversationHistory {
  if (!Number.isSafeInteger(systemPromptCacheTokens) || systemPromptCacheTokens < 0) throw new RangeError('Volume de cache invalide.');
  const index = typeof target === 'number' ? target : blocks.findIndex((block) => block.blockId === target);
  if (!Number.isInteger(index) || index < 0 || index >= blocks.length) throw new RangeError('Bloc ciblé introuvable.');
  if (isIgnoredBlock(blocks[index])) return emptyPreparation;
  const priorMessages: string[] = [];
  const priorSources: string[] = [];
  const priorVisibleReasoning: string[] = [];
  const priorFinalResponses: string[] = [];
  let artifactReference = '';
  for (const block of blocks.slice(0, index)) {
    if (isIgnoredBlock(block)) continue;
    priorMessages.push(block.message);
    priorSources.push(...(block.sources ?? []).map((source) => source.text));
    priorVisibleReasoning.push(block.visibleReasoning);
    priorFinalResponses.push(block.finalResponse);
    if (block.artifact.trim() !== '') artifactReference = block.artifact;
  }
  return Object.freeze({
    priorMessages: Object.freeze(priorMessages), priorSources: Object.freeze(priorSources), priorVisibleReasoning: Object.freeze(priorVisibleReasoning),
    priorFinalResponses: Object.freeze(priorFinalResponses), artifactReference,
    artifactContribution: artifactWordDiff(artifactReference, blocks[index].artifact), systemPromptCacheTokens,
  });
}
