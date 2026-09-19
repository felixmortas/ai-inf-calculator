import { fallbackTokenCount, tokenizationEncoding, tokenizationFingerprint, type TokenizationEncoding, type TokenizationTexts } from '../domain/tokenization';
import type { ConversationAction } from './conversationReducer';
import { isTokenizationResponse, type TokenizationRequest, type TokenizationResponse } from '../workers/tokenizationProtocol';

export type TokenizationDispatch = (action: ConversationAction) => void;

export interface ImpactTexts {
  readonly newInput: string;
  readonly cachedInput: readonly string[];
  readonly output: readonly string[];
}

/** Browser-only adapter: it only relays the typed Worker protocol to the reducer. */
export class TokenizationClient {
  private readonly worker: Worker;
  private readonly outgoing = new Map<string, TokenizationRequest>();
  private readonly impactOutgoing = new Map<string, { readonly callback: (count: number) => void; readonly text: string; readonly wordsPerToken: number }>();

  constructor(private readonly dispatch: TokenizationDispatch) {
    this.worker = new Worker(new URL('../workers/tokenization.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      if (isTokenizationResponse(event.data)) {
        const impact = this.impactOutgoing.get(event.data.requestId);
        if (impact) {
          this.impactOutgoing.delete(event.data.requestId);
          impact.callback(event.data.type === 'tokenized' ? event.data.counts.message : fallbackTokenCount(impact.text, impact.wordsPerToken));
          return;
        }
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
    this.impactOutgoing.clear();
  }

  /** Compte séparément chaque catégorie dérivée avec le même Worker et le même fallback. */
  requestImpact(texts: ImpactTexts, onComplete: (counts: { newInput: number; cachedInput: number; output: number }) => void, wordsPerToken = .75): void {
    const entries = [
      ['newInput', texts.newInput],
      ...texts.cachedInput.map((text) => ['cachedInput', text] as const),
      ...texts.output.map((text) => ['output', text] as const),
    ] as const;
    if (entries.length === 0) { onComplete({ newInput: 0, cachedInput: 0, output: 0 }); return; }
    const counts = { newInput: 0, cachedInput: 0, output: 0 };
    let remaining = entries.length;
    for (const [category, text] of entries) {
      const requestId = crypto.randomUUID();
      const requestTexts: TokenizationTexts = { message: text, sources: [], finalResponse: '', visibleReasoning: '', artifact: '' };
      const request: TokenizationRequest = { type: 'tokenize', requestId, encoding: tokenizationEncoding, fingerprint: tokenizationFingerprint(tokenizationEncoding, requestTexts), texts: requestTexts };
      this.impactOutgoing.set(requestId, { text, wordsPerToken, callback: (count) => {
        counts[category] += count;
        remaining -= 1;
        if (remaining === 0) onComplete(counts);
      } });
      this.worker.postMessage(request);
    }
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
    for (const impact of this.impactOutgoing.values()) impact.callback(fallbackTokenCount(impact.text, impact.wordsPerToken));
    this.impactOutgoing.clear();
  }
}
