import { detectUserCountry, modelCatalog, modelsForProvider, resolveHostingCountry, isHostingCountry, isUserCountry, resolveUserCarbonIntensity, type EnvironmentalFactorSource, type ImpactParameterOverrides } from '../data/modelCatalog';
import type { ShowerEquivalence } from '../domain/showerEquivalence';
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
import type { ImpactTotal } from '../domain/impactAggregation';
import { resolveImpactParameters, type DroughtRisk } from '../data/modelCatalog';
import { prepareConversationHistory } from '../domain/conversationHistory';

export interface ConversationState {
  readonly provider: string;
  readonly subscription: ChatGptSubscription;
  readonly modelId: string;
  readonly hostingCountry: string;
  readonly userCountry: string;
  readonly parameterOverrides: ImpactParameterOverrides;
  /** Saisie avancée invalide, non appliquée : bloque les calculs sans perdre la dernière vue valide. */
  readonly parameterValidationInvalid: boolean;
  readonly blocks: readonly ConversationBlock[];
  readonly tokenizations: Readonly<Record<string, BlockTokenizationState>>;
  readonly impacts: Readonly<Record<string, BlockImpactState>>;
  readonly showerEquivalences: Readonly<Record<string, ShowerEquivalenceState>>;
  readonly summaryShowerEquivalence?: ShowerEquivalenceState;
  readonly summary?: ConversationSummaryState;
}

export interface ConversationBlock {
  readonly blockId: string;
  readonly message: string;
  readonly sources?: readonly LocalSource[];
  readonly finalResponse: string;
  readonly visibleReasoning: string;
  readonly artifact: string;
}

/** Texte local éphémère : jamais le File/Blob ni une persistance de navigateur. */
export interface LocalSource {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly text: string;
}

export const localSourceMaxBytes = 5 * 1024 * 1024;
const localSourceExtensions = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'log', 'py', 'js', 'ts', 'html', 'xml', 'yaml', 'yml']);

export function isAcceptedLocalSource(source: Pick<LocalSource, 'name' | 'type' | 'size' | 'text'>): boolean {
  const extension = source.name.split('.').pop()?.toLowerCase();
  const supported = source.type.startsWith('text/') || source.type === 'application/json'
    || (!!extension && localSourceExtensions.has(extension));
  return supported
    && Number.isSafeInteger(source.size)
    && source.size > 0
    && source.size <= localSourceMaxBytes
    && source.text.length > 0
    && !source.text.includes('\0')
    && !/[\uD800-\uDFFF]/u.test(source.text);
}

export type ConversationBlockField = Exclude<keyof ConversationBlock, 'blockId' | 'sources'>;

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
  | { readonly status: 'result'; readonly fingerprint: string; readonly impact: ImpactResult; readonly factorSources?: Readonly<Record<string, EnvironmentalFactorSource>> }
  | { readonly status: 'error'; readonly fingerprint: string; readonly code: 'invalid-data' | 'empty-block' };

export type ConversationSummaryState =
  | { readonly status: 'pending'; readonly fingerprint: string }
  | { readonly status: 'result'; readonly fingerprint: string; readonly total: ImpactTotal; readonly droughtRisk: DroughtRisk; readonly factorSources?: Readonly<Record<string, EnvironmentalFactorSource>> }
  | { readonly status: 'unavailable'; readonly fingerprint: string; readonly code: 'no-exchanges' | 'invalid-results'; readonly blockingBlockIds?: readonly string[] };
export interface ShowerEquivalenceState { readonly fingerprint: string; readonly equivalence: ShowerEquivalence; }

export type ConversationAction =
  | { readonly type: 'providerSelected'; readonly provider: string }
  | { readonly type: 'subscriptionSelected'; readonly subscription: ChatGptSubscription }
  | { readonly type: 'modelSelected'; readonly modelId: string }
  | { readonly type: 'hostingCountrySelected'; readonly country: string }
  | { readonly type: 'userCountrySelected'; readonly country: string }
  | { readonly type: 'parametersApplied'; readonly overrides: ImpactParameterOverrides }
  | { readonly type: 'parametersValidationFailed' }
  | { readonly type: 'parametersRestored' }
  | { readonly type: 'blockAdded'; readonly blockId: string }
  | { readonly type: 'blocksReplaced'; readonly blocks: readonly ConversationBlock[] }
  | { readonly type: 'blockUpdated'; readonly blockId: string; readonly field: ConversationBlockField; readonly value: string }
  | { readonly type: 'sourceAdded'; readonly blockId: string; readonly source: LocalSource }
  | { readonly type: 'sourceRemoved'; readonly blockId: string; readonly sourceId: string }
  | { readonly type: 'blockRemoved'; readonly blockId: string }
  | { readonly type: 'tokenizationRequested'; readonly blockId: string; readonly requestId: string; readonly encoding: TokenizationEncoding; readonly fingerprint: string }
  | { readonly type: 'tokenizationResponded'; readonly response: TokenizationResponse }
  | { readonly type: 'impactRequested'; readonly blockId: string; readonly fingerprint: string; readonly preserveSummary?: boolean }
  | { readonly type: 'impactResolved'; readonly blockId: string; readonly fingerprint: string; readonly impact: ImpactResult; readonly factorSources?: Readonly<Record<string, EnvironmentalFactorSource>> }
  | { readonly type: 'impactBlocked'; readonly blockId: string; readonly fingerprint: string; readonly code: 'invalid-data' | 'empty-block'; readonly async?: true }
  | { readonly type: 'summaryRequested'; readonly fingerprint: string }
  | { readonly type: 'summaryRecalculationRequested'; readonly fingerprint: string }
  | { readonly type: 'summaryResolved'; readonly fingerprint: string; readonly total: ImpactTotal; readonly droughtRisk: DroughtRisk; readonly factorSources?: Readonly<Record<string, EnvironmentalFactorSource>> }
  | { readonly type: 'summaryUnavailable'; readonly fingerprint: string; readonly code: 'no-exchanges' | 'invalid-results'; readonly blockingBlockIds?: readonly string[] }
  | { readonly type: 'showerEquivalenceResolved'; readonly blockId?: string; readonly fingerprint: string; readonly equivalence: ShowerEquivalence };

const initialSubscription: ChatGptSubscription = 'without-paid-subscription';

export const initialConversationState: ConversationState = Object.freeze({
  provider: chatGptProvider,
  subscription: initialSubscription,
  modelId: resolveChatGptModel(initialSubscription),
  hostingCountry: resolveHostingCountry(chatGptProvider)!,
  userCountry: detectUserCountry(),
  blocks: [],
  tokenizations: {},
  impacts: {},
  showerEquivalences: {},
  parameterOverrides: {},
  parameterValidationInvalid: false,
});

const conversationBlockFields: readonly ConversationBlockField[] = [
  'message', 'finalResponse', 'visibleReasoning', 'artifact',
];

export function isIgnoredConversationBlock(block: ConversationBlock): boolean {
  return conversationBlockFields.every((field) => block[field].trim() === '')
    && (block.sources ?? []).every((source) => source.text.trim() === '');
}

function createConversationBlock(blockId: string): ConversationBlock {
  return { blockId, message: '', sources: [], finalResponse: '', visibleReasoning: '', artifact: '' };
}

function firstModelId(provider: string): string | undefined {
  return modelsForProvider(modelCatalog, provider)[0]?.id;
}

function tokenizationTexts(block: ConversationBlock): TokenizationTexts {
  const { message, finalResponse, visibleReasoning, artifact } = block;
  return { message, sources: (block.sources ?? []).map((source) => source.text), finalResponse, visibleReasoning, artifact };
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

function discardTransientCalculations(state: ConversationState): ConversationState {
  const impacts = Object.fromEntries(Object.entries(state.impacts).filter(([, impact]) => impact.status === 'result'));
  const hasTransientImpact = Object.keys(impacts).length !== Object.keys(state.impacts).length;
  return hasTransientImpact || state.summary?.status === 'pending'
    ? { ...state, impacts, summary: state.summary?.status === 'pending' ? undefined : state.summary }
    : state;
}

function invalidateCalculationsAndTokenizations(state: ConversationState): ConversationState {
  return discardTransientCalculations(invalidateAllTokenizations(state));
}

/** A canonical snapshot of exactly the inputs consumed by one impact calculation. */
export function impactFingerprint(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'parameterOverrides'>, blockId?: string): string {
  if (!blockId) {
    return summaryFingerprint(state);
  }
  const parameters = resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, state.parameterOverrides);
  const block = state.blocks.find((entry) => entry.blockId === blockId);
  if (!parameters || !block) return JSON.stringify(['impact-v2', 'unavailable', blockId]);
  const history = prepareConversationHistory(state.blocks, blockId, parameters.systemPromptCacheTokens);
  const { shower: _shower, ...impactParameters } = parameters;
  return JSON.stringify([
    'impact-v2', 'impact-algorithm-v1', modelCatalog, blockId,
    block.message, (block.sources ?? []).map((source) => source.text), block.finalResponse, block.visibleReasoning, block.artifact, history, impactParameters,
  ]);
}

/** Empty blocks deliberately do not participate, so adding/removing one preserves freshness. */
export function summaryFingerprint(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'parameterOverrides'>): string {
  return JSON.stringify(['summary-v2', state.blocks
    .filter((block) => !isIgnoredConversationBlock(block))
    .map((block) => [block.blockId, impactFingerprint(state, block.blockId)])]);
}

/**
 * The shower comparison is not rendered before epic 4, but its canonical
 * dependency boundary is available now for the later session parameters.
 */
export function showerFingerprint(
  state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'parameterOverrides' | 'userCountry'>,
  carbonGco2e?: number,
): string {
  const resolved = resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, state.parameterOverrides);
  const factor = resolveUserCarbonIntensity(state.userCountry);
  return JSON.stringify(['shower-v2', carbonGco2e ?? null, state.userCountry, factor, resolved?.shower ?? null]);
}

export function isShowerEquivalenceCurrent(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'parameterOverrides' | 'userCountry' | 'showerEquivalences' | 'impacts' | 'blocks' | 'parameterValidationInvalid'>, blockId: string): boolean {
  const impact = currentImpact(state as ConversationState, blockId);
  const value = state.showerEquivalences[blockId];
  return !!impact && value?.fingerprint === showerFingerprint(state, impact.carbonGco2e);
}

export function isSummaryShowerEquivalenceCurrent(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'parameterOverrides' | 'userCountry' | 'summaryShowerEquivalence' | 'summary'>): boolean {
  return state.summary?.status === 'result' && state.summaryShowerEquivalence?.fingerprint === showerFingerprint(state, state.summary.total.carbonGco2e);
}

export function isImpactCurrent(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'impacts' | 'parameterOverrides' | 'parameterValidationInvalid'>, blockId: string): boolean {
  const impact = state.impacts[blockId];
  return !state.parameterValidationInvalid && impact?.status === 'result' && impact.fingerprint === impactFingerprint(state, blockId);
}

export function isImpactFresh(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'impacts' | 'parameterOverrides' | 'parameterValidationInvalid'>, blockId: string): boolean {
  const impact = state.impacts[blockId];
  return !state.parameterValidationInvalid && impact !== undefined && impact.fingerprint === impactFingerprint(state, blockId);
}

export function currentImpact(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'impacts' | 'parameterOverrides' | 'parameterValidationInvalid'>, blockId: string): ImpactResult | undefined {
  const impact = state.impacts[blockId];
  return isImpactCurrent(state, blockId) && impact?.status === 'result' ? impact.impact : undefined;
}

export function summaryBlockingBlockIds(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'impacts' | 'parameterOverrides' | 'parameterValidationInvalid'>): readonly string[] {
  return state.blocks.filter((block) => !isIgnoredConversationBlock(block) && !isImpactCurrent(state, block.blockId))
    .map((block) => block.blockId);
}

export function isSummaryCurrent(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'summary' | 'parameterOverrides' | 'parameterValidationInvalid'>): boolean {
  return !state.parameterValidationInvalid && state.summary?.status === 'result' && state.summary.fingerprint === summaryFingerprint(state);
}

export function isSummaryFresh(state: Pick<ConversationState, 'provider' | 'modelId' | 'hostingCountry' | 'blocks' | 'summary' | 'parameterOverrides' | 'parameterValidationInvalid'>): boolean {
  return !state.parameterValidationInvalid && state.summary !== undefined && state.summary.fingerprint === summaryFingerprint(state);
}

export function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  if (state.parameterValidationInvalid && ['tokenizationRequested', 'tokenizationResponded', 'impactRequested', 'impactResolved', 'impactBlocked', 'summaryRequested', 'summaryRecalculationRequested', 'summaryResolved', 'summaryUnavailable'].includes(action.type)) return state;
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
        hostingCountry: resolveHostingCountry(action.provider)!,
        parameterValidationInvalid: false,
      });
    }
    case 'subscriptionSelected':
      if (state.provider !== chatGptProvider) return state;
      if (!(action.subscription in chatGptSubscriptionModels)) return state;
      return invalidateCalculationsAndTokenizations({
        ...state, subscription: action.subscription, modelId: resolveChatGptModel(action.subscription), parameterValidationInvalid: false,
        hostingCountry: resolveHostingCountry(state.provider)!,
      });
    case 'modelSelected':
      if (state.provider === chatGptProvider) return state;
      if (!canSelectModel(modelCatalog.models, state.provider, action.modelId)) return state;
      return invalidateCalculationsAndTokenizations({ ...state, modelId: action.modelId, hostingCountry: resolveHostingCountry(state.provider)!, parameterValidationInvalid: false });
    case 'hostingCountrySelected':
      if (!isHostingCountry(action.country) || action.country === state.hostingCountry) return state;
      return discardTransientCalculations({ ...state, hostingCountry: action.country });
    case 'userCountrySelected':
      return !isUserCountry(action.country) || action.country === state.userCountry ? state : { ...state, userCountry: action.country };
    case 'parametersApplied': {
      if (!resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, action.overrides)) return state;
      const overrides = Object.freeze({ ...action.overrides, ...(action.overrides.constants ? { constants: Object.freeze({ ...action.overrides.constants }) } : {}), ...(action.overrides.shower ? { shower: Object.freeze({ ...action.overrides.shower }) } : {}) });
      return discardTransientCalculations({ ...state, parameterOverrides: overrides, parameterValidationInvalid: false });
    }
    case 'parametersValidationFailed':
      return state.parameterValidationInvalid ? state : { ...state, parameterValidationInvalid: true };
    case 'parametersRestored':
      return Object.keys(state.parameterOverrides).length === 0 && !state.parameterValidationInvalid
        ? state
        : discardTransientCalculations({ ...state, parameterOverrides: {}, parameterValidationInvalid: false });
    case 'blockAdded':
      if (state.blocks.some((block) => block.blockId === action.blockId)) return state;
      return discardTransientCalculations({ ...state, blocks: [...state.blocks, createConversationBlock(action.blockId)] });
    case 'blocksReplaced': {
      const ids = action.blocks.map((block) => block.blockId);
      if (ids.some((id) => id.trim() === '') || new Set(ids).size !== ids.length) return state;
      const blocks = action.blocks.map((block) => ({
        blockId: block.blockId, message: block.message, finalResponse: block.finalResponse,
        sources: [], visibleReasoning: block.visibleReasoning, artifact: block.artifact,
      }));
      return { ...state, blocks, tokenizations: {}, impacts: {}, showerEquivalences: {}, summaryShowerEquivalence: undefined, summary: undefined };
    }
    case 'blockUpdated': {
      if (!conversationBlockFields.includes(action.field)) return state;
      const index = state.blocks.findIndex((block) => block.blockId === action.blockId);
      if (index === -1) return state;
      const blocks = state.blocks.map((block) => (
        block.blockId === action.blockId ? { ...block, [action.field]: action.value } : block
      ));
      return discardTransientCalculations({ ...state, blocks, tokenizations: withoutTokenization(state.tokenizations, action.blockId) });
    }
    case 'sourceAdded': {
      const index = state.blocks.findIndex((block) => block.blockId === action.blockId);
      if (index === -1 || !action.source.id || !action.source.name || !isAcceptedLocalSource(action.source)
        || (state.blocks[index].sources ?? []).some((source) => source.id === action.source.id)) return state;
      const blocks = state.blocks.map((block) => block.blockId === action.blockId ? { ...block, sources: [...(block.sources ?? []), action.source] } : block);
      return discardTransientCalculations({ ...state, blocks, tokenizations: withoutTokenization(state.tokenizations, action.blockId) });
    }
    case 'sourceRemoved': {
      const block = state.blocks.find((entry) => entry.blockId === action.blockId);
      if (!block || !(block.sources ?? []).some((source) => source.id === action.sourceId)) return state;
      const blocks = state.blocks.map((entry) => entry.blockId === action.blockId
        ? { ...entry, sources: (entry.sources ?? []).filter((source) => source.id !== action.sourceId) } : entry);
      return discardTransientCalculations({ ...state, blocks, tokenizations: withoutTokenization(state.tokenizations, action.blockId) });
    }
    case 'blockRemoved': {
      const blocks = state.blocks.filter((block) => block.blockId !== action.blockId);
      return blocks.length === state.blocks.length
        ? state
        : discardTransientCalculations({ ...state, blocks, tokenizations: withoutTokenization(state.tokenizations, action.blockId) });
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
          : fallbackTokenization(tokenizationTexts(block), resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, state.parameterOverrides)?.wordsPerToken)
        : fallbackTokenization(tokenizationTexts(block), resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, state.parameterOverrides)?.wordsPerToken);
      return { ...state, tokenizations: { ...state.tokenizations, [blockId]: { result } } };
    }
    case 'impactRequested': {
      const block = state.blocks.find(({ blockId }) => blockId === action.blockId);
      if (!block || isIgnoredConversationBlock(block) || impactFingerprint(state, action.blockId) !== action.fingerprint) return state;
      return {
        ...state,
        summary: action.preserveSummary ? state.summary : undefined,
        impacts: { ...state.impacts, [action.blockId]: { status: 'pending', fingerprint: action.fingerprint } },
      };
    }
    case 'impactResolved': {
      const current = state.impacts[action.blockId];
      if (current?.status !== 'pending' || current.fingerprint !== action.fingerprint || impactFingerprint(state, action.blockId) !== action.fingerprint) return state;
      return { ...state, impacts: { ...state.impacts, [action.blockId]: { status: 'result', fingerprint: action.fingerprint, impact: action.impact, factorSources: action.factorSources } } };
    }
    case 'impactBlocked': {
      const block = state.blocks.find(({ blockId }) => blockId === action.blockId);
      const current = state.impacts[action.blockId];
      if (!block || impactFingerprint(state, action.blockId) !== action.fingerprint
        || (action.async === true && (current?.status !== 'pending' || current.fingerprint !== action.fingerprint))) return state;
      return { ...state, impacts: { ...state.impacts, [action.blockId]: { status: 'error', fingerprint: action.fingerprint, code: action.code } } };
    }
    case 'summaryRequested':
      return summaryFingerprint(state) === action.fingerprint
        ? { ...state, summary: { status: 'pending', fingerprint: action.fingerprint } }
        : state;
    case 'summaryRecalculationRequested': {
      if (summaryFingerprint(state) !== action.fingerprint) return state;
      if (!state.blocks.some((block) => !isIgnoredConversationBlock(block))) {
        return { ...state, summary: { status: 'unavailable', fingerprint: action.fingerprint, code: 'no-exchanges' } };
      }
      const blockingBlockIds = summaryBlockingBlockIds(state);
      return blockingBlockIds.length === 0
        ? { ...state, summary: { status: 'pending', fingerprint: action.fingerprint } }
        : { ...state, summary: { status: 'unavailable', fingerprint: action.fingerprint, code: 'invalid-results', blockingBlockIds } };
    }
    case 'summaryResolved':
      return state.summary?.status === 'pending'
        && state.summary.fingerprint === action.fingerprint
        && summaryFingerprint(state) === action.fingerprint
        ? { ...state, summary: { status: 'result', fingerprint: action.fingerprint, total: action.total, droughtRisk: action.droughtRisk, factorSources: action.factorSources } }
        : state;
    case 'summaryUnavailable':
      return state.summary?.status === 'pending'
        && state.summary.fingerprint === action.fingerprint
        && summaryFingerprint(state) === action.fingerprint
        ? { ...state, summary: { status: 'unavailable', fingerprint: action.fingerprint, code: action.code, blockingBlockIds: action.blockingBlockIds } }
        : state;
    case 'showerEquivalenceResolved': {
      if (action.blockId) {
        const impact = currentImpact(state, action.blockId);
        return impact && showerFingerprint(state, impact.carbonGco2e) === action.fingerprint
          ? { ...state, showerEquivalences: { ...state.showerEquivalences, [action.blockId]: { fingerprint: action.fingerprint, equivalence: action.equivalence } } }
          : state;
      }
      return state.summary?.status === 'result' && showerFingerprint(state, state.summary.total.carbonGco2e) === action.fingerprint
        ? { ...state, summaryShowerEquivalence: { fingerprint: action.fingerprint, equivalence: action.equivalence } }
        : state;
    }
  }
}
