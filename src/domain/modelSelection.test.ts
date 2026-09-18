import { describe, expect, it } from 'vitest';
import { canSelectModel, resolveChatGptModel, selectableModels } from './modelSelection';
import { hasModel, modelCatalog, resolveDroughtRisk, resolveHostingCountry, resolveImpactParameters } from '../data/modelCatalog';

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

  it('expose le pays d’hébergement et distingue un risque absent', () => {
    expect(resolveHostingCountry('ChatGPT')).toBe('United States');
    expect(resolveDroughtRisk('United States')).toEqual({ status: 'available', level: 'Medium (0.4-0.6)' });
    expect(resolveHostingCountry('Mistral AI')).toBe('Switzerland');
    expect(resolveDroughtRisk('Switzerland')).toEqual({ status: 'available', level: 'Medium - High (0.6-0.8)' });
    expect(resolveDroughtRisk('pays absent')).toEqual({ status: 'unavailable' });
  });
});
