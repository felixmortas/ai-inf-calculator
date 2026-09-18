import { describe, expect, it } from 'vitest';
import { canSelectModel, resolveChatGptModel, selectableModels } from './modelSelection';
import { hasModel, modelCatalog, resolveDroughtRisk, resolveEnvironmentalFactor, resolveHostingCountry, resolveImpactParameters } from '../data/modelCatalog';

describe('sélection de modèle', () => {
  const models = [
    { provider: 'ChatGPT', id: 'gpt-5.6-luna' },
    { provider: 'Gemini', id: 'gemini-3.5-pro' },
  ] as const;

  it('résout le modèle ChatGPT selon l’abonnement', () => {
    expect(resolveChatGptModel('without-paid-subscription')).toBe('gpt-5.6-luna');
    expect(resolveChatGptModel('with-paid-subscription')).toBe('gpt-5.6-terra');
  });

  it('ne retourne et n’accepte que les modèles du fournisseur', () => {
    expect(selectableModels(models, 'Gemini')).toEqual([{ provider: 'Gemini', id: 'gemini-3.5-pro' }]);
    expect(canSelectModel(models, 'Gemini', 'gpt-5.6-luna')).toBe(false);
  });

  it('charge les modèles de référence ChatGPT depuis le catalogue local', () => {
    expect(hasModel(modelCatalog, 'ChatGPT', 'gpt-5.6-luna')).toBe(true);
    expect(hasModel(modelCatalog, 'ChatGPT', 'gpt-5.6-terra')).toBe(true);
  });

  it('résout les paramètres d’impact locaux du modèle et de son pays d’hébergement', () => {
    expect(resolveImpactParameters('ChatGPT', 'gpt-5.6-luna')).toMatchObject({
      totalParameters: 100, activatedParameters: 10, systemPromptCacheTokens: 1500,
      pue: 1.15, wue: .15, carbonIntensity: 384.403,
    });
  });

  it('fusionne les surcharges sans muter le catalogue, dérive la douche et refuse les constantes hors domaine', () => {
    const before = structuredClone(modelCatalog.models);
    const resolved = resolveImpactParameters('ChatGPT', 'gpt-5.6-luna', 'US', { inputRatio: .4, constants: { batchSize: 32 }, shower: { inletTemperatureC: 15, outletTemperatureC: 35 } });
    expect(resolved).toMatchObject({ inputRatio: .4, systemPromptCacheTokens: 1500, constants: { batchSize: 32 }, shower: { energyKwhPerLitre: .0232 } });
    expect(modelCatalog.models).toEqual(before);
    expect(resolveImpactParameters('ChatGPT', 'gpt-5.6-luna', 'US', { constants: { energyAlpha: 0 } })).toBeUndefined();
    expect(resolveImpactParameters('ChatGPT', 'gpt-5.6-luna', 'US', { constants: { energyBeta: .01 } })).toBeUndefined();
  });

  it('expose le pays d’hébergement et distingue un risque absent', () => {
    expect(resolveHostingCountry('ChatGPT')).toBe('US');
    expect(resolveDroughtRisk('US')).toEqual({ status: 'available', level: 'Medium (0.4-0.6)', source: 'country' });
    expect(resolveHostingCountry('Mistral AI')).toBe('CH');
    expect(resolveDroughtRisk('CH')).toEqual({ status: 'available', level: 'Medium - High (0.6-0.8)', source: 'country' });
    expect(resolveDroughtRisk('pays absent')).toEqual({ status: 'unavailable' });
  });

  it('utilise Monde pour le risque de sécheresse lorsque le pays est absent', () => {
    const risks = 'Area,drought_risk_level\nWorld,Low';
    expect(resolveDroughtRisk('FR', risks)).toEqual({ status: 'available', level: 'Low', source: 'world' });
  });

  it('résout sans mutation la valeur pays, le repli Monde, zéro et l’absence complète', () => {
    const rows = Object.freeze([{ country: 'France', value: 0 }, { country: 'World', value: 12 }]);
    expect(resolveEnvironmentalFactor('FR', rows)).toEqual({ status: 'country', value: 0 });
    expect(resolveEnvironmentalFactor('US', rows)).toEqual({ status: 'world', value: 12 });
    expect(resolveEnvironmentalFactor('US', [])).toEqual({ status: 'unavailable' });
    expect(rows).toEqual([{ country: 'France', value: 0 }, { country: 'World', value: 12 }]);
  });
});
