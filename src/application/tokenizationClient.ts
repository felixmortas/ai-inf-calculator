import { tokenizationEncoding, tokenizationFingerprint, type TokenizationEncoding, type TokenizationTexts } from '../domain/tokenization';
import type { ConversationAction } from './conversationReducer';
import { isTokenizationResponse, type TokenizationRequest, type TokenizationResponse } from '../workers/tokenizationProtocol';

export type TokenizationDispatch = (action: ConversationAction) => void;

/** Browser-only adapter: it only relays the typed Worker protocol to the reducer. */
export class TokenizationClient {
  private readonly worker: Worker;
  private readonly outgoing = new Map<string, TokenizationRequest>();

  constructor(private readonly dispatch: TokenizationDispatch) {
    this.worker = new Worker(new URL('../workers/tokenization.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      if (isTokenizationResponse(event.data)) {
        this.outgoing.delete(event.data.requestId);
        this.dispatch({ type: 'tokenizationResponded', response: event.data });
      }
    };
    this.worker.onerror = () => this.failOutgoing();
    this.worker.onmessageerror = () => this.failOutgoing();
  }

  request(blockId: string, texts: TokenizationTexts, encoding: TokenizationEncoding = tokenizationEncoding): void {
    const requestId = crypto.randomUUID();
    const fingerprint = tokenizationFingerprint(encoding, texts);
    const request: TokenizationRequest = { type: 'tokenize', requestId, encoding, fingerprint, texts };
    this.outgoing.set(requestId, request);
    this.dispatchRequested(blockId, request);
    this.worker.postMessage(request);
  }

  dispose(): void {
    this.worker.terminate();
    this.outgoing.clear();
  }

  private dispatchRequested(blockId: string, request: TokenizationRequest): void {
    this.dispatch({
      type: 'tokenizationRequested', blockId, requestId: request.requestId,
      encoding: request.encoding, fingerprint: request.fingerprint,
    });
  }

  private failOutgoing(): void {
    for (const request of this.outgoing.values()) {
      const response: TokenizationResponse = {
        type: 'tokenizationFailed', requestId: request.requestId, encoding: request.encoding,
        fingerprint: request.fingerprint, error: { code: 'tokenizer-unavailable' },
      };
      this.dispatch({ type: 'tokenizationResponded', response });
    }
    this.outgoing.clear();
  }
}
