export const tokenizationEncoding = 'o200k_base' as const;

export type TokenizationEncoding = typeof tokenizationEncoding;

export interface TokenizationTexts {
  readonly message: string;
  readonly finalResponse: string;
  readonly visibleReasoning: string;
  readonly artifact: string;
}

export type TokenizationCounts = Readonly<Record<keyof TokenizationTexts, number>>;

export type TokenizationSource = 'tiktoken' | 'fallback';

export interface BlockTokenizationResult {
  readonly source: TokenizationSource;
  readonly counts: TokenizationCounts;
}

export const tokenizationTextFields: readonly (keyof TokenizationTexts)[] = [
  'message', 'finalResponse', 'visibleReasoning', 'artifact',
];

export function isEmptyTokenizationText(text: string): boolean {
  return text.length === 0;
}

/** Empreinte canonique, transitoire et exacte, conservée uniquement en mémoire. */
export function tokenizationFingerprint(encoding: TokenizationEncoding, texts: TokenizationTexts): string {
  return JSON.stringify([
    'tokenization-v1',
    encoding,
    ...tokenizationTextFields.map((field) => [field, texts[field]]),
  ]);
}

export function hasValidTokenizationCounts(counts: unknown): counts is TokenizationCounts {
  if (!counts || typeof counts !== 'object') return false;
  return tokenizationTextFields.every((field) => {
    const value = (counts as Record<string, unknown>)[field];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  });
}

export function respectsEmptyTokenizationTexts(counts: TokenizationCounts, texts: TokenizationTexts): boolean {
  return tokenizationTextFields.every((field) => !isEmptyTokenizationText(texts[field]) || counts[field] === 0);
}

export function fallbackTokenCount(text: string, wordsPerToken = 0.75): number {
  if (!Number.isFinite(wordsPerToken) || wordsPerToken <= 0) return Number.NaN;
  if (isEmptyTokenizationText(text)) return 0;
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.length / wordsPerToken;
}

export function fallbackTokenization(texts: TokenizationTexts, wordsPerToken = 0.75): BlockTokenizationResult {
  return {
    source: 'fallback',
    counts: Object.fromEntries(
      tokenizationTextFields.map((field) => [field, fallbackTokenCount(texts[field], wordsPerToken)]),
    ) as TokenizationCounts,
  };
}
