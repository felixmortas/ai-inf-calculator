import modelsParamsCsv from '../../data/clean/models.csv?raw';
import pueCsv from '../../data/clean/pue.csv?raw';
import wueCsv from '../../data/clean/wue.csv?raw';
import providerCountryCsv from '../../data/clean/provider_country.csv?raw';
import carbonCsv from '../../data/clean/carbon_emissions_intensity_2025.csv?raw';
import { defaultImpactConstants, type ImpactConstants } from '../domain/impact';
import { chatGptProvider, chatGptSubscriptionModels, mistralModeModels, mistralProvider } from '../domain/modelSelection';

export interface ShowerParameters { readonly flowLitresPerMinute: number; readonly inletTemperatureC: number; readonly outletTemperatureC: number; readonly ledPowerW: number; readonly energyKwhPerLitre: number; }
export const defaultShowerParameters: Readonly<ShowerParameters> = Object.freeze({ flowLitresPerMinute: 15, inletTemperatureC: 18, outletTemperatureC: 38, ledPowerW: 5, energyKwhPerLitre: 0.00116 * 20 });
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
    const provider = values[indexes[0]] === 'MistralAI' ? mistralProvider : values[indexes[0]];
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

for (const [provider, ids] of [[chatGptProvider, Object.values(chatGptSubscriptionModels)], [mistralProvider, Object.values(mistralModeModels)]] as const) {
  for (const modelId of ids) if (!models.some((model) => model.provider === provider && model.id === modelId)) {
    throw new Error(`Le catalogue ${provider} ne contient pas le modèle de référence ${modelId}.`);
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
export interface UserCountryOption extends HostingCountryOption {}

/** Pays d’hébergement proposés ; les libellés sont calculés à l’affichage. */
const countryOptions: readonly string[] = Object.freeze(['BR', 'CH', 'FR', 'IN', 'US']);

/** Codes ISO des pays effectivement présents dans le catalogue carbone local. */
const countryNames: Readonly<Record<string, string>> = Object.freeze({
  AL: 'Albania', AR: 'Argentina', AM: 'Armenia', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan',
  BD: 'Bangladesh', BY: 'Belarus', BE: 'Belgium', BO: 'Bolivia', BA: 'Bosnia Herzegovina', BR: 'Brazil',
  BG: 'Bulgaria', KH: 'Cambodia', CA: 'Canada', CL: 'Chile', CN: 'China', CO: 'Colombia', CR: 'Costa Rica',
  HR: 'Croatia', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', EE: 'Estonia', ET: 'Ethiopia', FI: 'Finland', FR: 'France', GE: 'Georgia',
  DE: 'Germany', GR: 'Greece', HU: 'Hungary', IS: 'Iceland', IN: 'India', ID: 'Indonesia', IR: 'Iran', IE: 'Ireland',
  IL: 'Israel', IT: 'Italy', JP: 'Japan', KZ: 'Kazakhstan', KE: 'Kenya', XK: 'Kosovo', KW: 'Kuwait',
  KG: 'Kyrgyzstan', LV: 'Latvia', LT: 'Lithuania', LU: 'Luxembourg', MY: 'Malaysia', MT: 'Malta', MX: 'Mexico',
  MD: 'Moldova', MN: 'Mongolia', ME: 'Montenegro', MA: 'Morocco', NL: 'Netherlands', NZ: 'New Zealand',
  NG: 'Nigeria', MK: 'North Macedonia', NO: 'Norway', OM: 'Oman', PK: 'Pakistan', PY: 'Paraguay', PE: 'Peru',
  PL: 'Poland', PT: 'Portugal', PR: 'Puerto Rico', QA: 'Qatar', RO: 'Romania', RU: 'Russia', RS: 'Serbia',
  SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia', ZA: 'South Africa', KR: 'South Korea', ES: 'Spain',
  LK: 'Sri Lanka', SE: 'Sweden', CH: 'Switzerland', TW: 'Taiwan (China)', TJ: 'Tajikistan', TH: 'Thailand',
  PH: 'The Philippines', TN: 'Tunisia', TR: 'Türkiye', GB: 'United Kingdom', US: 'United States', UY: 'Uruguay',
  UZ: 'Uzbekistan', VN: 'Viet Nam', WORLD: 'World',
});

const countryCodesByName: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries([
  ...Object.entries(countryNames).map(([code, name]) => [name.toLowerCase(), code]),
  ['monde', 'WORLD'], ['world', 'WORLD'], ['brésil', 'BR'], ['suisse', 'CH'], ['états-unis', 'US'], ['inde', 'IN'], ['france', 'FR'],
]));

const displayNames = new Map<string, Intl.DisplayNames | null>();

/** Nom du pays dans la langue `locale` (Intl.DisplayNames), sinon nom anglais du catalogue. */
export function countryLabel(code: string, locale: string, worldLabel: string): string {
  if (code === 'WORLD') return worldLabel;
  if (!displayNames.has(locale)) {
    try { displayNames.set(locale, new Intl.DisplayNames([locale], { type: 'region' })); } catch { displayNames.set(locale, null); }
  }
  try { return displayNames.get(locale)?.of(code) ?? countryNames[code] ?? code; } catch { return countryNames[code] ?? code; }
}

export function hostingCountryOptions(locale: string, worldLabel: string): readonly HostingCountryOption[] {
  return countryOptions.map((code) => Object.freeze({ code, label: countryLabel(code, locale, worldLabel) }));
}
/** Pays proposés uniquement pour l’équivalence douche, indépendamment de l’hébergement. */
export function userCountryOptions(locale: string, worldLabel: string): readonly UserCountryOption[] {
  return Object.freeze([
    ...Object.keys(countryNames).filter((code) => code !== 'WORLD').map((code) => Object.freeze({ code, label: countryLabel(code, locale, worldLabel) }))
      .sort((a, b) => a.label.localeCompare(b.label, locale)),
    Object.freeze({ code: 'WORLD', label: worldLabel }),
  ]);
}

/** Normalise les libellés historiques des catalogues vers les codes ISO de session. */
export function normalizeCountry(country: string): string | undefined {
  const value = country.trim();
  const uppercase = value.toUpperCase();
  return countryNames[uppercase] ? uppercase : countryCodesByName[value.toLowerCase()];
}

export function isHostingCountry(country: string): boolean {
  return countryOptions.includes(country);
}
export function isUserCountry(country: string): boolean {
  return Object.hasOwn(countryNames, country);
}

/** Heuristique locale, sans réseau, géolocalisation ni fuseau horaire : la région de la langue du navigateur, sinon Monde. Le contrôle utilisateur prévaut. */
export function detectUserCountry(language?: string): string {
  const locale = language ?? (typeof navigator === 'undefined' ? undefined : navigator.language);
  const region = locale?.match(/[-_]([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  return region && isUserCountry(region) ? region : 'WORLD';
}

export function resolveUserCarbonIntensity(country: string): ResolvedEnvironmentalFactor {
  const resolved = resolveEnvironmentalFactor(country, environmentalFactorRows.carbonIntensity);
  if (resolved.status !== 'unavailable') return resolved;
  const world = environmentalFactorRows.carbonIntensity.find((row) => normalizeCountry(row.country) === 'WORLD')?.value;
  return world === undefined ? resolved : Object.freeze({ status: 'world', value: world });
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

/** Pays d'hébergement localement catalogué pour le fournisseur sélectionné. */
export function resolveHostingCountry(provider: string): string | undefined {
  const country = parseRows(providerCountryCsv).find((entry) => (entry.provider === 'MistralAI' ? mistralProvider : entry.provider) === provider)?.country;
  return country ? normalizeCountry(country) : undefined;
}

/** Résout exclusivement des données locales ; undefined signifie un blocage explicite. */
function factorRows(source: string, key: string, expected: number): readonly EnvironmentalFactorRow[] {
  return Object.freeze(parseRows(source).flatMap((row) => {
    const value = Number(row[key]);
    return Number.isFinite(value) && value >= expected ? [Object.freeze({ country: row.Area, value })] : [];
  }));
}

const environmentalFactorRows: Readonly<Record<EnvironmentalFactor, readonly EnvironmentalFactorRow[]>> = Object.freeze({
  pue: factorRows(pueCsv, 'pue', 1),
  wue: factorRows(wueCsv, 'wue', 0),
  carbonIntensity: factorRows(carbonCsv, 'Emissions intensity (gCO2e/kWh)', 0),
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
  const values = [resolved.totalParameters, resolved.activatedParameters, resolved.inputRatio, resolved.cacheRatio, resolved.pue, resolved.wue, resolved.carbonIntensity, resolved.wordsPerToken, shower.flowLitresPerMinute, shower.inletTemperatureC, shower.outletTemperatureC, shower.ledPowerW];
  const positiveConstants = [constants.batchSize, constants.gpuInstalledPerServer, constants.serverPowerWithoutGpuW, constants.gpuMemoryGb, constants.quantizationBits, constants.memoryOverhead, constants.energyAlpha, constants.energyGamma, constants.latencyAlpha, constants.latencyBeta, constants.latencyGamma];
  if (!values.every((value) => Number.isFinite(value) && value >= 0) || !Object.values(constants).every(Number.isFinite) || !positiveConstants.every((value) => value > 0) || constants.energyBeta > 0 || resolved.totalParameters <= 0 || resolved.activatedParameters <= 0 || resolved.activatedParameters > resolved.totalParameters || resolved.pue < 1 || resolved.wordsPerToken <= 0 || shower.flowLitresPerMinute <= 0 || shower.ledPowerW <= 0 || shower.outletTemperatureC <= shower.inletTemperatureC) return undefined;
  return Object.freeze(resolved);
}

for (const modelId of Object.values(mistralModeModels)) {
  if (!resolveImpactParameters(mistralProvider, modelId)) {
    throw new Error(`Le modèle de référence Mistral ${modelId} ne résout pas son pays et ses facteurs environnementaux.`);
  }
}
