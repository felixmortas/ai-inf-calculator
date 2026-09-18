import modelsParamsCsv from '../../data/clean/models_params.csv?raw';
import pueCsv from '../../data/clean/pue.csv?raw';
import wueCsv from '../../data/clean/wue.csv?raw';
import providerCountryCsv from '../../data/clean/provider_country.csv?raw';
import carbonCsv from '../../data/clean/carbon_emissions_intensity_2025.csv?raw';

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

function finiteLookup(source: string, key: string, value: string, expected: number, requiresMetadata = true): number | undefined {
  const row = parseRows(source).find((entry) => entry.Area === key);
  if (!row || (requiresMetadata && (!row.source || !row.version || !row.date))) return undefined;
  const parsed = Number(row[value]);
  return Number.isFinite(parsed) && parsed >= expected ? parsed : undefined;
}

export interface ResolvedImpactParameters extends CatalogModel {
  readonly pue: number;
  readonly wue: number;
  readonly carbonIntensity: number;
}

/** Résout exclusivement des données locales ; undefined signifie un blocage explicite. */
export function resolveImpactParameters(provider: string, modelId: string): ResolvedImpactParameters | undefined {
  const model = modelCatalog.models.find((entry) => entry.provider === provider && entry.id === modelId);
  const country = parseRows(providerCountryCsv).find((entry) => entry.provider === provider)?.country;
  if (!model || !country) return undefined;
  const pue = finiteLookup(pueCsv, country, 'pue', 1);
  const wue = finiteLookup(wueCsv, country, 'wue', 0);
  // Ce catalogue existant documente sa provenance et sa date dans son fichier compagnon `.md`.
  const carbonIntensity = finiteLookup(carbonCsv, country, 'Emissions intensity (gCO2e/kWh)', 0, false);
  return pue === undefined || wue === undefined || carbonIntensity === undefined
    ? undefined : Object.freeze({ ...model, pue, wue, carbonIntensity });
}
