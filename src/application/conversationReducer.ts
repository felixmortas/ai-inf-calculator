import { modelCatalog, modelsForProvider } from '../data/modelCatalog';
import {
  canSelectModel,
  chatGptProvider,
  chatGptSubscriptionModels,
  resolveChatGptModel,
  type ChatGptSubscription,
} from '../domain/modelSelection';
import {
  fallbackTokenization,
  respectsEmptyTokenizationTexts,
  tokenizationFingerprint,
  type BlockTokenizationResult,
  type TokenizationEncoding,
  type TokenizationTexts,
} from '../domain/tokenization';
import type { TokenizationResponse } from '../workers/tokenizationProtocol';
import type { ImpactResult } from '../domain/impact';

export interface ConversationState {
  readonly provider: string;
  readonly subscription: ChatGptSubscription;
  readonly modelId: string;
  readonly blocks: readonly ConversationBlock[];
  readonly tokenizations: Readonly<Record<string, BlockTokenizationState>>;
  readonly impacts: Readonly<Record<string, BlockImpactState>>;
}

export interface ConversationBlock {
  readonly blockId: string;
  readonly message: string;
  readonly finalResponse: string;
  readonly visibleReasoning: string;
  readonly artifact: string;
}

export type ConversationBlockField = Exclude<keyof ConversationBlock, 'blockId'>;

export interface BlockTokenizationState {
  readonly pending?: {
    readonly requestId: string;
    readonly encoding: TokenizationEncoding;
    readonly fingerprint: string;
  };
  readonly result?: BlockTokenizationResult;
}

export type BlockImpactState =
  | { readonly status: 'pending'; readonly fingerprint: string }
  | { readonly status: 'result'; readonly fingerprint: string; readonly impact: ImpactResult }
  | { readonly status: 'error'; readonly fingerprint: string; readonly code: 'invalid-data' | 'empty-block' };

export type ConversationAction =
  | { readonly type: 'providerSelected'; readonly provider: string }
  | { readonly type: 'subscriptionSelected'; readonly subscription: ChatGptSubscription }
  | { readonly type: 'modelSelected'; readonly modelId: string }
  | { readonly type: 'blockAdded'; readonly blockId: string }
  | { readonly type: 'blockUpdated'; readonly blockId: string; readonly field: ConversationBlockField; readonly value: string }
  | { readonly type: 'blockRemoved'; readonly blockId: string }
  | { readonly type: 'tokenizationRequested'; readonly blockId: string; readonly requestId: string; readonly encoding: TokenizationEncoding; readonly fingerprint: string }
  | { readonly type: 'tokenizationResponded'; readonly response: TokenizationResponse }
  | { readonly type: 'impactRequested'; readonly blockId: string; readonly fingerprint: string }
  | { readonly type: 'impactResolved'; readonly blockId: string; readonly fingerprint: string; readonly impact: ImpactResult }
  | { readonly type: 'impactBlocked'; readonly blockId: string; readonly fingerprint: string; readonly code: 'invalid-data' | 'empty-block' };

const initialSubscription: ChatGptSubscription = 'without-paid-subscription';

export const initialConversationState: ConversationState = Object.freeze({
  provider: chatGptProvider,
  subscription: initialSubscription,
  modelId: resolveChatGptModel(initialSubscription),
  blocks: [],
  tokenizations: {},
  impacts: {},
});

const conversationBlockFields: readonly ConversationBlockField[] = [
  'message', 'finalResponse', 'visibleReasoning', 'artifact',
];

export function isIgnoredConversationBlock(block: ConversationBlock): boolean {
  return conversationBlockFields.every((field) => block[field].trim() === '');
}

function createConversationBlock(blockId: string): ConversationBlock {
  return { blockId, message: '', finalResponse: '', visibleReasoning: '', artifact: '' };
}

function firstModelId(provider: string): string | undefined {
  return modelsForProvider(modelCatalog, provider)[0]?.id;
}

function tokenizationTexts(block: ConversationBlock): TokenizationTexts {
  const { message, finalResponse, visibleReasoning, artifact } = block;
  return { message, finalResponse, visibleReasoning, artifact };
}

function withoutTokenization(
  tokenizations: Readonly<Record<string, BlockTokenizationState>>,
  blockId: string,
): Readonly<Record<string, BlockTokenizationState>> {
  if (!(blockId in tokenizations)) return tokenizations;
  const { [blockId]: _removed, ...remaining } = tokenizations;
  return remaining;
}

function invalidateAllTokenizations(state: ConversationState): ConversationState {
  return Object.keys(state.tokenizations).length === 0 ? state : { ...state, tokenizations: {} };
}

function invalidateAllCalculations(state: ConversationState): ConversationState {
  return Object.keys(state.impacts).length === 0 ? state : { ...state, impacts: {} };
}

function invalidateCalculationsAndTokenizations(state: ConversationState): ConversationState {
  return invalidateAllCalculations(invalidateAllTokenizations(state));
}

export function impactFingerprint(state: Pick<ConversationState, 'provider' | 'modelId' | 'blocks'>): string {
  return JSON.stringify(['impact-v1', state.provider, state.modelId, state.blocks]);
}

export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'providerSelected': {
      const modelId = firstModelId(action.provider);
      if (!modelId) return state;
      return invalidateCalculationsAndTokenizations({
        ...state,
        provider: action.provider,
        modelId: action.provider === chatGptProvider
          ? resolveChatGptModel(state.subscription)
          : modelId,
      });
    }
    case 'subscriptionSelected':
      if (state.provider !== chatGptProvider) return state;
      if (!(action.subscription in chatGptSubscriptionModels)) return state;
      return invalidateCalculationsAndTokenizations({
        ...state, subscription: action.subscription, modelId: resolveChatGptModel(action.subscription),
      });
    case 'modelSelected':
      if (state.provider === chatGptProvider) return state;
      if (!canSelectModel(modelCatalog.models, state.provider, action.modelId)) return state;
      return invalidateCalculationsAndTokenizations({ ...state, modelId: action.modelId });
    case 'blockAdded':
      if (state.blocks.some((block) => block.blockId === action.blockId)) return state;
      return invalidateAllCalculations({ ...state, blocks: [...state.blocks, createConversationBlock(action.blockId)] });
    case 'blockUpdated': {
      if (!conversationBlockFields.includes(action.field)) return state;
      const index = state.blocks.findIndex((block) => block.blockId === action.blockId);
      if (index === -1) return state;
      const blocks = state.blocks.map((block) => (
        block.blockId === action.blockId ? { ...block, [action.field]: action.value } : block
      ));
      return invalidateAllCalculations({ ...state, blocks, tokenizations: withoutTokenization(state.tokenizations, action.blockId) });
    }
    case 'blockRemoved': {
      const blocks = state.blocks.filter((block) => block.blockId !== action.blockId);
      return blocks.length === state.blocks.length
        ? state
        : invalidateAllCalculations({ ...state, blocks, tokenizations: withoutTokenization(state.tokenizations, action.blockId) });
    }
    case 'tokenizationRequested': {
      const block = state.blocks.find(({ blockId }) => blockId === action.blockId);
      if (!block) return state;
      const fingerprint = tokenizationFingerprint(action.encoding, tokenizationTexts(block));
      if (fingerprint !== action.fingerprint) return state;
      return {
        ...state,
        tokenizations: {
          ...state.tokenizations,
          [action.blockId]: { pending: { requestId: action.requestId, encoding: action.encoding, fingerprint } },
        },
      };
    }
    case 'tokenizationResponded': {
      const blockId = Object.keys(state.tokenizations).find((id) => {
        const pending = state.tokenizations[id].pending;
        return pending?.requestId === action.response.requestId
          && pending.encoding === action.response.encoding
          && pending.fingerprint === action.response.fingerprint;
      });
      if (!blockId) return state;
      const block = state.blocks.find(({ blockId: id }) => id === blockId);
      if (!block) return state;
      const currentFingerprint = tokenizationFingerprint(action.response.encoding, tokenizationTexts(block));
      if (currentFingerprint !== action.response.fingerprint) return state;
      const result: BlockTokenizationResult = action.response.type === 'tokenized'
        ? respectsEmptyTokenizationTexts(action.response.counts, tokenizationTexts(block))
          ? { source: 'tiktoken', counts: action.response.counts }
          : fallbackTokenization(tokenizationTexts(block))
        : fallbackTokenization(tokenizationTexts(block));
      return { ...state, tokenizations: { ...state.tokenizations, [blockId]: { result } } };
    }
    case 'impactRequested': {
      const block = state.blocks.find(({ blockId }) => blockId === action.blockId);
      if (!block || isIgnoredConversationBlock(block) || impactFingerprint(state) !== action.fingerprint) return state;
      return { ...state, impacts: { ...state.impacts, [action.blockId]: { status: 'pending', fingerprint: action.fingerprint } } };
    }
    case 'impactResolved': {
      const current = state.impacts[action.blockId];
      if (current?.status !== 'pending' || current.fingerprint !== action.fingerprint || impactFingerprint(state) !== action.fingerprint) return state;
      return { ...state, impacts: { ...state.impacts, [action.blockId]: { status: 'result', fingerprint: action.fingerprint, impact: action.impact } } };
    }
    case 'impactBlocked': {
      const block = state.blocks.find(({ blockId }) => blockId === action.blockId);
      if (!block || impactFingerprint(state) !== action.fingerprint) return state;
      return { ...state, impacts: { ...state.impacts, [action.blockId]: { status: 'error', fingerprint: action.fingerprint, code: action.code } } };
    }
  }
}
