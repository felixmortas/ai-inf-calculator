export const chatGptSubscriptions = Object.freeze([
  { id: 'without-paid-subscription', modelId: 'gpt-4o-mini', label: 'subscriptionFree', isDefault: true },
  { id: 'with-paid-subscription', modelId: 'gpt-4o', label: 'subscriptionPaid' },
] as const);

export type ChatGptSubscription = typeof chatGptSubscriptions[number]['id'];
export type MistralMode = 'fast' | 'reasoning';

export interface ModelOption {
  readonly provider: string;
  readonly id: string;
}

export const chatGptProvider = 'ChatGPT';
export const mistralProvider = 'Mistral AI';
export const defaultChatGptSubscription = chatGptSubscriptions.find((subscription) => 'isDefault' in subscription && subscription.isDefault)!.id;
export const chatGptSubscriptionModels: Readonly<Record<ChatGptSubscription, string>> = Object.freeze(
  Object.fromEntries(chatGptSubscriptions.map(({ id, modelId }) => [id, modelId])) as Record<ChatGptSubscription, string>,
);

export function isChatGptSubscription(value: string): value is ChatGptSubscription {
  return chatGptSubscriptions.some(({ id }) => id === value);
}

export function resolveChatGptModel(subscription: ChatGptSubscription): string {
  return chatGptSubscriptionModels[subscription];
}

export const mistralModeModels: Readonly<Record<MistralMode, string>> = Object.freeze({
  fast: 'mistral-medium-3.1',
  reasoning: 'mistral-medium-3.1',
});

export function resolveMistralModel(mode: MistralMode): string {
  return mistralModeModels[mode];
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
