import modelsParamsCsv from '../../data/clean/models_params.csv?raw';
import pueCsv from '../../data/clean/pue.csv?raw';
import wueCsv from '../../data/clean/wue.csv?raw';
import providerCountryCsv from '../../data/clean/provider_country.csv?raw';
import carbonCsv from '../../data/clean/carbon_emissions_intensity_2025.csv?raw';
import droughtRiskCsv from '../../data/clean/country_drought_risk.csv?raw';
import { defaultImpactConstants, type ImpactConstants } from '../domain/impact';

export interface ShowerParameters { readonly flowLitresPerMinute: number; readonly inletTemperatureC: number; readonly outletTemperatureC: number; readonly energyKwhPerLitre: number; }
export const defaultShowerParameters: Readonly<ShowerParameters> = Object.freeze({ flowLitresPerMinute: 15, inletTemperatureC: 18, outletTemperatureC: 38, energyKwhPerLitre: 0.00116 * 20 });
export interface ImpactParameterOverrides extends Partial<Omit<ResolvedImpactParameters, 'systemPromptCacheTokens' | 'factorSources' | 'hostingCountry' | 'provider' | 'id' | 'consolidationDate' | 'constants' | 'wordsPerToken' | 'shower'>> { readonly constants?: Partial<ImpactConstants>; readonly wordsPerToken?: number; readonly shower?: Partial<Omit<ShowerParameters, 'energyKwhPerLitre'>>; }

export interface CatalogModel {
  readonly provider: string;
  readonly id: string;
  readonly totalParameters: number;
  readonly activatedParameters: number;
  readonly systemPromptCacheTokens: number;
  readonly inputRatio: number;
  readonly cacheRatio: number;
  readonly consolidationDate: string;
}

export interface ModelCatalog {
  readonly models: readonly CatalogModel[];
  readonly providers: readonly string[];
}

const requiredColumns = ['provider', 'model_name', 'nb_params', 'nb_params_activated', 'system_prompt_token_count', 'input_ratio', 'cache_ratio', 'consolidation_date'] as const;

function parseCsv(source: string): readonly CatalogModel[] {
  const [headerLine, ...rows] = source.trim().split(/\r?\n/);
  if (!headerLine) throw new Error('Le catalogue de modèles est vide.');

  const header = headerLine.split(',').map((column) => column.trim());
  const indexes = requiredColumns.map((column) => header.indexOf(column));
  if (indexes.some((index) => index < 0)) {
    throw new Error('Le catalogue de modèles ne contient pas les colonnes requises.');
  }

  const models = rows.map((row, rowIndex) => {
    const values = row.split(',').map((value) => value.trim());
    const provider = values[indexes[0]];
    const id = values[indexes[1]];
    if (!provider || !id) {
      throw new Error(`Ligne ${rowIndex + 2} invalide dans le catalogue de modèles.`);
    }
    const numbers = indexes.slice(2, 7).map((index) => Number(values[index]));
    if (numbers.some((value) => !Number.isFinite(value) || value < 0) || !Number.isSafeInteger(numbers[2]) || numbers[0] === 0 || numbers[1] === 0 || numbers[1] > numbers[0]) {
      throw new Error(`Ligne ${rowIndex + 2} invalide dans le catalogue de modèles.`);
    }
    return Object.freeze({ provider, id, totalParameters: numbers[0], activatedParameters: numbers[1], systemPromptCacheTokens: numbers[2], inputRatio: numbers[3], cacheRatio: numbers[4], consolidationDate: values[indexes[7]] });
  });

  if (models.length === 0) throw new Error('Le catalogue de modèles ne contient aucun modèle.');
  if (new Set(models.map((model) => `${model.provider}:${model.id}`)).size !== models.length) {
    throw new Error('Le catalogue de modèles contient des doublons.');
  }
  return Object.freeze(models);
}

const models = parseCsv(modelsParamsCsv);
const providers = Object.freeze([...new Set(models.map((model) => model.provider))]);

for (const modelId of ['gpt-5.6-luna', 'gpt-5.6-terra']) {
  if (!models.some((model) => model.provider === 'ChatGPT' && model.id === modelId)) {
    throw new Error(`Le catalogue ChatGPT ne contient pas le modèle de référence ${modelId}.`);
  }
}

export const modelCatalog: ModelCatalog = Object.freeze({ models, providers });

export function modelsForProvider(catalog: ModelCatalog, provider: string): readonly CatalogModel[] {
  return Object.freeze(catalog.models.filter((model) => model.provider === provider));
}

export function hasModel(catalog: ModelCatalog, provider: string, modelId: string): boolean {
  return catalog.models.some((model) => model.provider === provider && model.id === modelId);
}

function parseRows(source: string): readonly Readonly<Record<string, string>>[] {
  const [header, ...rows] = source.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
  const columns = header.split(',').map((value) => value.trim());
  return Object.freeze(rows.map((row) => Object.freeze(Object.fromEntries(row.split(',').map((value, index) => [columns[index], value.trim()])))));
}

export interface ResolvedImpactParameters extends CatalogModel {
  readonly hostingCountry: string;
  readonly pue: number;
  readonly wue: number;
  readonly carbonIntensity: number;
  readonly factorSources: Readonly<Record<EnvironmentalFactor, EnvironmentalFactorSource>>;
  readonly constants: Readonly<ImpactConstants>;
  readonly wordsPerToken: number;
  readonly shower: Readonly<ShowerParameters>;
}

export type EnvironmentalFactor = 'pue' | 'wue' | 'carbonIntensity';
export type EnvironmentalFactorSource = 'country' | 'world';

export type ResolvedEnvironmentalFactor =
  | { readonly status: 'country' | 'world'; readonly value: number }
  | { readonly status: 'unavailable' };

export interface EnvironmentalFactorRow {
  readonly country: string;
  readonly value: number;
}

export interface HostingCountryOption {
  readonly code: string;
  readonly label: string;
}

const countryOptions = Object.freeze([
  Object.freeze({ code: 'BR', label: 'Brésil' }),
  Object.freeze({ code: 'CH', label: 'Suisse' }),
  Object.freeze({ code: 'FR', label: 'France' }),
  Object.freeze({ code: 'IN', label: 'Inde' }),
  Object.freeze({ code: 'US', label: 'États-Unis' }),
]);

const countryNames: Readonly<Record<string, string>> = Object.freeze({
  BR: 'Brazil', CH: 'Switzerland', FR: 'France', IN: 'India', US: 'United States', WORLD: 'World',
});

const countryCodesByName: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries([
  ...Object.entries(countryNames).map(([code, name]) => [name.toLowerCase(), code]),
  ['monde', 'WORLD'], ['world', 'WORLD'], ['brésil', 'BR'], ['suisse', 'CH'], ['états-unis', 'US'], ['inde', 'IN'], ['france', 'FR'],
]));

export const hostingCountryOptions: readonly HostingCountryOption[] = countryOptions;

/** Normalise les libellés historiques des catalogues vers les codes ISO de session. */
export function normalizeCountry(country: string): string | undefined {
  const value = country.trim();
  const uppercase = value.toUpperCase();
  return countryNames[uppercase] ? uppercase : countryCodesByName[value.toLowerCase()];
}

export function isHostingCountry(country: string): boolean {
  return countryOptions.some((option) => option.code === country);
}

/** Résolution pure et injectable : une valeur nulle est une donnée valide. */
export function resolveEnvironmentalFactor(
  country: string,
  rows: readonly EnvironmentalFactorRow[],
): ResolvedEnvironmentalFactor {
  const requested = normalizeCountry(country);
  if (!requested) return Object.freeze({ status: 'unavailable' });
  const valueFor = (code: string) => rows.find((row) => normalizeCountry(row.country) === code && Number.isFinite(row.value))?.value;
  const localValue = valueFor(requested);
  if (localValue !== undefined) return Object.freeze({ status: 'country', value: localValue });
  const worldValue = valueFor('WORLD');
  return worldValue === undefined
    ? Object.freeze({ status: 'unavailable' })
    : Object.freeze({ status: 'world', value: worldValue });
}

export type DroughtRisk =
  | { readonly status: 'available'; readonly level: string; readonly source: EnvironmentalFactorSource }
  | { readonly status: 'unavailable' };

/** Pays d'hébergement localement catalogué pour le fournisseur sélectionné. */
export function resolveHostingCountry(provider: string): string | undefined {
  const country = parseRows(providerCountryCsv).find((entry) => entry.provider === provider)?.country;
  return country ? normalizeCountry(country) : undefined;
}

/** Le niveau reste catégoriel : « No Data » ne devient jamais un niveau inventé. */
export function resolveDroughtRisk(country: string, source = droughtRiskCsv): DroughtRisk {
  const normalized = normalizeCountry(country);
  if (!normalized) return Object.freeze({ status: 'unavailable' });
  const levelFor = (code: string) => parseRows(source).find((entry) => normalizeCountry(entry.Area) === code)?.drought_risk_level;
  const countryLevel = levelFor(normalized);
  if (countryLevel && countryLevel !== 'No Data') {
    return Object.freeze({ status: 'available', level: countryLevel, source: 'country' });
  }
  const worldLevel = levelFor('WORLD');
  return worldLevel && worldLevel !== 'No Data'
    ? Object.freeze({ status: 'available', level: worldLevel, source: 'world' })
    : Object.freeze({ status: 'unavailable' });
}

/** Résout exclusivement des données locales ; undefined signifie un blocage explicite. */
function factorRows(source: string, key: string, expected: number, requiresMetadata = true): readonly EnvironmentalFactorRow[] {
  return Object.freeze(parseRows(source).flatMap((row) => {
    if (requiresMetadata && (!row.source || !row.version || !row.date)) return [];
    const value = Number(row[key]);
    return Number.isFinite(value) && value >= expected ? [Object.freeze({ country: row.Area, value })] : [];
  }));
}

const environmentalFactorRows: Readonly<Record<EnvironmentalFactor, readonly EnvironmentalFactorRow[]>> = Object.freeze({
  pue: factorRows(pueCsv, 'pue', 1),
  wue: factorRows(wueCsv, 'wue', 0),
  carbonIntensity: factorRows(carbonCsv, 'Emissions intensity (gCO2e/kWh)', 0, false),
});

/** Résout les paramètres sans jamais modifier les catalogues importés. */
export function resolveImpactParameters(provider: string, modelId: string, hostingCountry = resolveHostingCountry(provider), overrides: ImpactParameterOverrides = {}): ResolvedImpactParameters | undefined {
  const model = modelCatalog.models.find((entry) => entry.provider === provider && entry.id === modelId);
  if (!model || !hostingCountry || !isHostingCountry(hostingCountry)) return undefined;
  const pue = resolveEnvironmentalFactor(hostingCountry, environmentalFactorRows.pue);
  const wue = resolveEnvironmentalFactor(hostingCountry, environmentalFactorRows.wue);
  const carbonIntensity = resolveEnvironmentalFactor(hostingCountry, environmentalFactorRows.carbonIntensity);
  if (pue.status === 'unavailable' || wue.status === 'unavailable' || carbonIntensity.status === 'unavailable') return undefined;
  const constants = Object.freeze({ ...defaultImpactConstants, ...overrides.constants });
  const showerBase = { ...defaultShowerParameters, ...overrides.shower };
  const shower = Object.freeze({ ...showerBase, energyKwhPerLitre: 0.00116 * (showerBase.outletTemperatureC - showerBase.inletTemperatureC) });
  const resolved = { ...model, hostingCountry, pue: overrides.pue ?? pue.value, wue: overrides.wue ?? wue.value, carbonIntensity: overrides.carbonIntensity ?? carbonIntensity.value,
    totalParameters: overrides.totalParameters ?? model.totalParameters, activatedParameters: overrides.activatedParameters ?? model.activatedParameters,
    inputRatio: overrides.inputRatio ?? model.inputRatio, cacheRatio: overrides.cacheRatio ?? model.cacheRatio,
    constants, wordsPerToken: overrides.wordsPerToken ?? .75, shower,
    factorSources: Object.freeze({ pue: pue.status, wue: wue.status, carbonIntensity: carbonIntensity.status }),
  };
  const values = [resolved.totalParameters, resolved.activatedParameters, resolved.inputRatio, resolved.cacheRatio, resolved.pue, resolved.wue, resolved.carbonIntensity, resolved.wordsPerToken, shower.flowLitresPerMinute, shower.inletTemperatureC, shower.outletTemperatureC];
  const positiveConstants = [constants.batchSize, constants.gpuInstalledPerServer, constants.serverPowerWithoutGpuW, constants.gpuMemoryGb, constants.quantizationBits, constants.memoryOverhead, constants.energyAlpha, constants.energyGamma, constants.latencyAlpha, constants.latencyBeta, constants.latencyGamma];
  if (!values.every((value) => Number.isFinite(value) && value >= 0) || !Object.values(constants).every(Number.isFinite) || !positiveConstants.every((value) => value > 0) || constants.energyBeta > 0 || resolved.totalParameters <= 0 || resolved.activatedParameters <= 0 || resolved.activatedParameters > resolved.totalParameters || resolved.pue < 1 || resolved.wordsPerToken <= 0 || shower.flowLitresPerMinute <= 0 || shower.outletTemperatureC <= shower.inletTemperatureC) return undefined;
  return Object.freeze(resolved);
}
