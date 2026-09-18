import { Tiktoken } from 'js-tiktoken/lite';
import o200kBase from 'js-tiktoken/ranks/o200k_base';
import {
  isEmptyTokenizationText,
  tokenizationFingerprint,
  tokenizationTextFields,
  type TokenizationCounts,
} from '../domain/tokenization';
import type { TokenizationRequest, TokenizationResponse } from './tokenizationProtocol';

function countWithTiktoken(text: string): number {
  if (isEmptyTokenizationText(text)) return 0;
  const encoder = new Tiktoken(o200kBase) as Tiktoken & { free?: () => void };
  try {
    return encoder.encode(text).length;
  } finally {
    // La version Lite actuelle est JavaScript pur ; cette libération reste compatible
    // avec une version qui exposerait une allocation native.
    encoder.free?.();
  }
}

export function processTokenizationRequest(
  request: TokenizationRequest,
  count: (text: string) => number = countWithTiktoken,
): TokenizationResponse {
  const fingerprint = tokenizationFingerprint(request.encoding, request.texts);
  try {
    const counts = Object.fromEntries(
      tokenizationTextFields.map((field) => [
        field,
        isEmptyTokenizationText(request.texts[field]) ? 0 : count(request.texts[field]),
      ]),
    ) as TokenizationCounts;
    return {
      type: 'tokenized', requestId: request.requestId, encoding: request.encoding,
      fingerprint, counts,
    };
  } catch {
    return {
      type: 'tokenizationFailed', requestId: request.requestId, encoding: request.encoding,
      fingerprint, error: { code: 'tokenizer-unavailable' },
    };
  }
}

self.onmessage = (event: MessageEvent<TokenizationRequest>) => {
  self.postMessage(processTokenizationRequest(event.data));
};
