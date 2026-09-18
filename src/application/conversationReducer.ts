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
}

export type ConversationAction =
  | { readonly type: 'providerSelected'; readonly provider: string }
  | { readonly type: 'subscriptionSelected'; readonly subscription: ChatGptSubscription }
  | { readonly type: 'modelSelected'; readonly modelId: string };

const initialSubscription: ChatGptSubscription = 'without-paid-subscription';

export const initialConversationState: ConversationState = Object.freeze({
  provider: chatGptProvider,
  subscription: initialSubscription,
  modelId: resolveChatGptModel(initialSubscription),
});

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
  }
}
