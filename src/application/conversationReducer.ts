import { modelCatalog, modelsForProvider } from '../data/modelCatalog';
import {
  canSelectModel,
  chatGptProvider,
  chatGptSubscriptionModels,
  resolveChatGptModel,
  type ChatGptSubscription,
} from '../domain/modelSelection';

export interface ConversationState {
  readonly provider: string;
  readonly subscription: ChatGptSubscription;
  readonly modelId: string;
  readonly blocks: readonly ConversationBlock[];
}

export interface ConversationBlock {
  readonly blockId: string;
  readonly message: string;
  readonly finalResponse: string;
  readonly visibleReasoning: string;
  readonly artifact: string;
}

export type ConversationBlockField = Exclude<keyof ConversationBlock, 'blockId'>;

export type ConversationAction =
  | { readonly type: 'providerSelected'; readonly provider: string }
  | { readonly type: 'subscriptionSelected'; readonly subscription: ChatGptSubscription }
  | { readonly type: 'modelSelected'; readonly modelId: string }
  | { readonly type: 'blockAdded'; readonly blockId: string }
  | { readonly type: 'blockUpdated'; readonly blockId: string; readonly field: ConversationBlockField; readonly value: string }
  | { readonly type: 'blockRemoved'; readonly blockId: string };

const initialSubscription: ChatGptSubscription = 'without-paid-subscription';

export const initialConversationState: ConversationState = Object.freeze({
  provider: chatGptProvider,
  subscription: initialSubscription,
  modelId: resolveChatGptModel(initialSubscription),
  blocks: [],
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

export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'providerSelected': {
      const modelId = firstModelId(action.provider);
      if (!modelId) return state;
      return {
        ...state,
        provider: action.provider,
        modelId: action.provider === chatGptProvider
          ? resolveChatGptModel(state.subscription)
          : modelId,
      };
    }
    case 'subscriptionSelected':
      if (state.provider !== chatGptProvider) return state;
      if (!(action.subscription in chatGptSubscriptionModels)) return state;
      return { ...state, subscription: action.subscription, modelId: resolveChatGptModel(action.subscription) };
    case 'modelSelected':
      if (state.provider === chatGptProvider) return state;
      if (!canSelectModel(modelCatalog.models, state.provider, action.modelId)) return state;
      return { ...state, modelId: action.modelId };
    case 'blockAdded':
      if (state.blocks.some((block) => block.blockId === action.blockId)) return state;
      return { ...state, blocks: [...state.blocks, createConversationBlock(action.blockId)] };
    case 'blockUpdated': {
      if (!conversationBlockFields.includes(action.field)) return state;
      const index = state.blocks.findIndex((block) => block.blockId === action.blockId);
      if (index === -1) return state;
      const blocks = state.blocks.map((block) => (
        block.blockId === action.blockId ? { ...block, [action.field]: action.value } : block
      ));
      return { ...state, blocks };
    }
    case 'blockRemoved': {
      const blocks = state.blocks.filter((block) => block.blockId !== action.blockId);
      return blocks.length === state.blocks.length ? state : { ...state, blocks };
    }
  }
}
