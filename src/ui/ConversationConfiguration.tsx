import type { ChangeEvent } from 'react';
import { hostingCountryOptions, modelCatalog, modelsForProvider } from '../data/modelCatalog';
import { chatGptProvider, type ChatGptSubscription } from '../domain/modelSelection';
import type { ConversationAction, ConversationState } from '../application/conversationReducer';
import { fr } from '../i18n/fr';

interface ConversationConfigurationProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
}

export function ConversationConfiguration({ state, dispatch }: ConversationConfigurationProps) {
  const providerModels = modelsForProvider(modelCatalog, state.provider);

  function selectProvider(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'providerSelected', provider: event.currentTarget.value });
  }

  function selectSubscription(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'subscriptionSelected', subscription: event.currentTarget.value as ChatGptSubscription });
  }

  function selectModel(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'modelSelected', modelId: event.currentTarget.value });
  }

  function selectHostingCountry(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'hostingCountrySelected', country: event.currentTarget.value });
  }

  return (
    <section aria-labelledby="configuration-title" className="configuration">
      <h2 id="configuration-title">{fr.configurationTitle}</h2>
      <div className="field">
        <label htmlFor="provider">{fr.providerLabel}</label>
        <p id="provider-help" className="help">{fr.providerHelp}</p>
        <select id="provider" aria-describedby="provider-help" value={state.provider} onChange={selectProvider}>
          {modelCatalog.providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
        </select>
      </div>

      {state.provider === chatGptProvider ? (
        <div className="field">
          <label htmlFor="subscription">{fr.subscriptionLabel}</label>
          <select id="subscription" value={state.subscription} onChange={selectSubscription}>
            <option value="without-paid-subscription">{fr.subscriptionFree}</option>
            <option value="with-paid-subscription">{fr.subscriptionPaid}</option>
          </select>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="model">{fr.modelLabel}</label>
        {state.provider === chatGptProvider ? (
          <output id="model" aria-live="polite" className="resolved-model">{state.modelId}</output>
        ) : (
          <select id="model" value={state.modelId} onChange={selectModel}>
            {providerModels.map((model) => <option key={model.id} value={model.id}>{model.id}</option>)}
          </select>
        )}
      </div>
      <details className="advanced-settings">
        <summary>{fr.advancedSettingsTitle}</summary>
        <div className="field">
          <label htmlFor="hosting-country">{fr.hostingCountryLabel}</label>
          <p id="hosting-country-help" className="help">{fr.hostingCountryHelp}</p>
          <select id="hosting-country" aria-describedby="hosting-country-help" value={state.hostingCountry} onChange={selectHostingCountry}>
            {hostingCountryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} ({country.code})</option>)}
          </select>
        </div>
      </details>
    </section>
  );
}
