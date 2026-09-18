import { describe, expect, it } from 'vitest';
import { canSelectModel, resolveChatGptModel, selectableModels } from './modelSelection';
import { hasModel, modelCatalog } from '../data/modelCatalog';

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
});
