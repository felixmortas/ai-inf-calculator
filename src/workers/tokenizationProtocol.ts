import { hasValidTokenizationCounts, type TokenizationCounts, type TokenizationEncoding, type TokenizationTexts } from '../domain/tokenization';

export interface TokenizationRequest {
  readonly type: 'tokenize';
  readonly requestId: string;
  readonly encoding: TokenizationEncoding;
  readonly fingerprint: string;
  readonly texts: TokenizationTexts;
}

export interface TokenizationSuccess {
  readonly type: 'tokenized';
  readonly requestId: string;
  readonly encoding: TokenizationEncoding;
  readonly fingerprint: string;
  readonly counts: TokenizationCounts;
}

export interface TokenizationFailure {
  readonly type: 'tokenizationFailed';
  readonly requestId: string;
  readonly encoding: TokenizationEncoding;
  readonly fingerprint: string;
  readonly error: {
    readonly code: 'tokenizer-unavailable';
  };
}

export type TokenizationResponse = TokenizationSuccess | TokenizationFailure;

export function isTokenizationResponse(value: unknown): value is TokenizationResponse {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<TokenizationResponse>;
  const hasCorrelation = typeof message.requestId === 'string'
    && message.encoding === 'o200k_base'
    && typeof message.fingerprint === 'string';
  if (!hasCorrelation) return false;
  return message.type === 'tokenized'
    ? hasValidTokenizationCounts(message.counts)
    : message.type === 'tokenizationFailed' && message.error?.code === 'tokenizer-unavailable';
}
