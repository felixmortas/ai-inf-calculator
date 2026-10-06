import { describe, expect, it } from 'vitest';
import { canSelectModel, resolveChatGptModel, resolveMistralModel, selectableModels } from './modelSelection';
import { detectUserCountry, hasModel, modelCatalog, resolveEnvironmentalFactor, resolveHostingCountry, resolveImpactParameters, resolveUserCarbonIntensity } from '../data/modelCatalog';

describe('sélection de modèle', () => {
  const models = [
    { provider: 'ChatGPT', id: 'gpt-4o-mini' },
    { provider: 'Gemini', id: 'gemini-2.5-pro' },
  ] as const;

  it('résout le modèle ChatGPT selon l’abonnement', () => {
    expect(resolveChatGptModel('without-paid-subscription')).toBe('gpt-4o-mini');
    expect(resolveChatGptModel('with-paid-subscription')).toBe('gpt-4o');
  });

  it('résout les deux modes Mistral avec pays et facteurs complets', () => {
    expect(resolveMistralModel('fast')).toBe('mistral-medium-3.1');
    expect(resolveMistralModel('reasoning')).toBe('mistral-medium-3.1');
    for (const id of ['mistral-medium-3.1', 'mistral-medium-3.1']) {
      expect(resolveImpactParameters('Mistral AI', id)).toMatchObject({ provider: 'Mistral AI', id, hostingCountry: 'CH' });
    }
  });

  it('ne retourne et n’accepte que les modèles du fournisseur', () => {
    expect(selectableModels(models, 'Gemini')).toEqual([{ provider: 'Gemini', id: 'gemini-2.5-pro' }]);
    expect(canSelectModel(models, 'Gemini', 'gpt-4o-mini')).toBe(false);
  });

  it('charge les modèles de référence ChatGPT depuis le catalogue local', () => {
    expect(hasModel(modelCatalog, 'ChatGPT', 'gpt-4o-mini')).toBe(true);
    expect(hasModel(modelCatalog, 'ChatGPT', 'gpt-4o')).toBe(true);
  });

  it('détecte le pays utilisateur localement puis replie sur Monde', () => {
    expect(detectUserCountry('Europe/Paris', 'en-US')).toBe('FR');
    expect(detectUserCountry('Europe/Berlin', 'fr-FR')).toBe('DE');
    expect(detectUserCountry(undefined, 'fr-FR')).toBe('FR');
    expect(detectUserCountry('Unknown/Zone', 'fr')).toBe('WORLD');
    expect(resolveUserCarbonIntensity('FR')).toEqual({ status: 'country', value: 41.44 });
    expect(resolveUserCarbonIntensity('ID')).toMatchObject({ status: 'world', value: 473 });
    expect(resolveUserCarbonIntensity('ZZ')).toMatchObject({ status: 'world', value: 473 });
  });

  it('résout les paramètres d’impact locaux du modèle et de son pays d’hébergement', () => {
    expect(resolveImpactParameters('ChatGPT', 'gpt-4o-mini')).toMatchObject({
      totalParameters: 92, activatedParameters: 12.325116, systemPromptCacheTokens: 1469,
      pue: 1.14, wue: .1, carbonIntensity: 384.403,
    });
  });

  it('fusionne les surcharges sans muter le catalogue, dérive la douche et refuse les constantes hors domaine', () => {
    const before = structuredClone(modelCatalog.models);
    const resolved = resolveImpactParameters('ChatGPT', 'gpt-4o-mini', 'US', { inputRatio: .4, constants: { batchSize: 32 }, shower: { inletTemperatureC: 15, outletTemperatureC: 35 } });
    expect(resolved).toMatchObject({ inputRatio: .4, systemPromptCacheTokens: 1469, constants: { batchSize: 32 }, shower: { energyKwhPerLitre: .0232 } });
    expect(modelCatalog.models).toEqual(before);
    expect(resolveImpactParameters('ChatGPT', 'gpt-4o-mini', 'US', { constants: { energyAlpha: 0 } })).toBeUndefined();
    expect(resolveImpactParameters('ChatGPT', 'gpt-4o-mini', 'US', { constants: { energyBeta: .01 } })).toBeUndefined();
  });

  it('expose le pays d’hébergement', () => {
    expect(resolveHostingCountry('ChatGPT')).toBe('US');
    expect(resolveHostingCountry('Mistral AI')).toBe('CH');
  });

  it('résout sans mutation la valeur pays, le repli Monde, zéro et l’absence complète', () => {
    const rows = Object.freeze([{ country: 'France', value: 0 }, { country: 'World', value: 12 }]);
    expect(resolveEnvironmentalFactor('FR', rows)).toEqual({ status: 'country', value: 0 });
    expect(resolveEnvironmentalFactor('US', rows)).toEqual({ status: 'world', value: 12 });
    expect(resolveEnvironmentalFactor('US', [])).toEqual({ status: 'unavailable' });
    expect(rows).toEqual([{ country: 'France', value: 0 }, { country: 'World', value: 12 }]);
  });
});
