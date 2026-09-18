import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenizationClient } from './tokenizationClient';

class WorkerStub {
  static instance: WorkerStub | undefined;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly messages: unknown[] = [];
  constructor() { WorkerStub.instance = this; }
  postMessage(message: unknown) { this.messages.push(message); }
  terminate() { return undefined; }
}

describe('TokenizationClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('utilise le coefficient personnalisé quand le Worker échoue', () => {
    vi.stubGlobal('Worker', WorkerStub);
    vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValueOnce('one').mockReturnValueOnce('two') });
    const complete = vi.fn();
    const client = new TokenizationClient(vi.fn());
    client.requestImpact({ newInput: 'un deux', cachedInput: [], output: ['trois quatre'] }, complete, .5);
    WorkerStub.instance!.onerror!();
    expect(complete).toHaveBeenCalledWith({ newInput: 4, cachedInput: 0, output: 4 });
  });
});
