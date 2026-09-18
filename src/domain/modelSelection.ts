export type ChatGptSubscription = 'without-paid-subscription' | 'with-paid-subscription';

export interface ModelOption {
  readonly provider: string;
  readonly id: string;
}

export const chatGptProvider = 'ChatGPT';
export const chatGptSubscriptionModels: Readonly<Record<ChatGptSubscription, string>> = Object.freeze({
  'without-paid-subscription': 'gpt-5.6-luna',
  'with-paid-subscription': 'gpt-5.6-terra',
});

export function resolveChatGptModel(subscription: ChatGptSubscription): string {
  return chatGptSubscriptionModels[subscription];
}

export function selectableModels(models: readonly ModelOption[], provider: string): readonly ModelOption[] {
  return models.filter((model) => model.provider === provider);
}

export function canSelectModel(
  models: readonly ModelOption[],
  provider: string,
  modelId: string,
): boolean {
  return selectableModels(models, provider).some((model) => model.id === modelId);
}
