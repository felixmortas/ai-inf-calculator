import modelsParamsCsv from '../../data/clean/models_params.csv?raw';

export interface CatalogModel {
  readonly provider: string;
  readonly id: string;
}

export interface ModelCatalog {
  readonly models: readonly CatalogModel[];
  readonly providers: readonly string[];
}

const requiredColumns = ['provider', 'model_name'] as const;

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
    return Object.freeze({ provider, id });
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
