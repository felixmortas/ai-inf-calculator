import { useState, type ChangeEvent, type FormEvent } from 'react';
import { hostingCountryOptions, userCountryOptions, modelCatalog, modelsForProvider, resolveImpactParameters, type ImpactParameterOverrides } from '../data/modelCatalog';
import { chatGptProvider, mistralProvider, type ChatGptSubscription, type MistralMode } from '../domain/modelSelection';
import type { ConversationAction, ConversationState } from '../application/conversationReducer';
import { fr } from '../i18n/fr';

interface ConversationConfigurationProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
}

export function ConversationConfiguration({ state, dispatch }: ConversationConfigurationProps) {
  const providerModels = modelsForProvider(modelCatalog, state.provider);
  const [invalidFields, setInvalidFields] = useState<readonly string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const resolved = resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, state.parameterOverrides);
  const Parameter = ({ name, label, unit, value }: { name: string; label: string; unit: string; value: number }) => {
    const id = `parameter-${name}`; const invalid = invalidFields.includes(name);
    return <div className="field parameter"><label htmlFor={id}>{label} ({unit})</label><input id={id} name={name} type="number" step="any" defaultValue={value} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'parameter-error' : undefined} /></div>;
  };

  function selectProvider(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'providerSelected', provider: event.currentTarget.value });
  }

  function selectSubscription(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'subscriptionSelected', subscription: event.currentTarget.value as ChatGptSubscription });
  }
  function selectMistralMode(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'mistralModeSelected', mode: event.currentTarget.value as MistralMode });
  }

  function selectModel(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'modelSelected', modelId: event.currentTarget.value });
  }

  function selectHostingCountry(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'hostingCountrySelected', country: event.currentTarget.value });
  }
  function selectUserCountry(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'userCountrySelected', country: event.currentTarget.value });
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const number = (name: string) => {
      const raw = data.get(name);
      return typeof raw === 'string' && raw.trim() === '' ? Number.NaN : Number(raw);
    };
    const candidate: ImpactParameterOverrides = {
      totalParameters: number('totalParameters'), activatedParameters: number('activatedParameters'), inputRatio: number('inputRatio'), cacheRatio: number('cacheRatio'), pue: number('pue'), wue: number('wue'), carbonIntensity: number('carbonIntensity'), wordsPerToken: number('wordsPerToken'),
      constants: Object.fromEntries(constantFields.map(([key]) => [key, number(key)])),
      shower: { flowLitresPerMinute: number('flowLitresPerMinute'), inletTemperatureC: number('inletTemperatureC'), outletTemperatureC: number('outletTemperatureC') },
    };
    const invalid = invalidParameterFields(candidate);
    if (invalid.length > 0 || !resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, candidate)) { setInvalidFields(invalid.length ? invalid : parameterNames); dispatch({ type: 'parametersValidationFailed' }); return; }
    const reference = resolveImpactParameters(state.provider, state.modelId, state.hostingCountry)!;
    setInvalidFields([]); dispatch({ type: 'parametersApplied', overrides: differences(candidate, reference) });
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

      {state.provider === mistralProvider ? <div className="field">
        <label htmlFor="mistral-mode">{fr.mistralModeLabel}</label>
        <select id="mistral-mode" value={state.mistralMode} onChange={selectMistralMode}>
          <option value="fast">{fr.mistralFast}</option>
          <option value="reasoning">{fr.mistralReasoning}</option>
        </select>
      </div> : null}

      <div className="field">
        <label htmlFor="model">{fr.modelLabel}</label>
        <p id="model-help" className="help">{fr.modelReferenceHelp}</p>
        <select id="model" aria-describedby="model-help" value={state.modelId} onChange={selectModel}>
          {providerModels.map((model) => <option key={model.id} value={model.id}>{model.id}</option>)}
        </select>
      </div>
      <details className="advanced-settings" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
        <summary>{fr.advancedSettingsTitle}</summary>
        <div className="field">
          <label htmlFor="hosting-country">{fr.hostingCountryLabel}</label>
          <p id="hosting-country-help" className="help">{fr.hostingCountryHelp}</p>
          <select id="hosting-country" aria-describedby="hosting-country-help" value={state.hostingCountry} onChange={selectHostingCountry}>
            {hostingCountryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} ({country.code})</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="user-country">{fr.userCountryLabel}</label>
          <p id="user-country-help" className="help">{fr.userCountryHelp}</p>
          <select id="user-country" aria-describedby="user-country-help" value={state.userCountry} onChange={selectUserCountry}>
            {userCountryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} ({country.code})</option>)}
          </select>
        </div>
        {advancedOpen && resolved ? <form key={`${state.provider}:${state.modelId}:${state.hostingCountry}:${JSON.stringify(state.parameterOverrides)}`} className="parameter-form" onSubmit={apply} noValidate>
          <p className="help">Les valeurs sont temporaires et ne déclenchent aucun calcul.</p>
          <Parameter name="totalParameters" label="Paramètres totaux" unit="milliards" value={resolved.totalParameters} />
          <Parameter name="activatedParameters" label="Paramètres actifs" unit="milliards" value={resolved.activatedParameters} />
          <Parameter name="inputRatio" label="Ratio tokens entrants" unit="ratio" value={resolved.inputRatio} />
          <Parameter name="cacheRatio" label="Ratio tokens en cache" unit="ratio" value={resolved.cacheRatio} />
          <Parameter name="wordsPerToken" label="Coefficient mots par token" unit="mots/token" value={resolved.wordsPerToken} />
          <Parameter name="pue" label="PUE" unit="ratio" value={resolved.pue} />
          <Parameter name="wue" label="WUE" unit="L/kWh" value={resolved.wue} />
          <Parameter name="carbonIntensity" label="Intensité carbone" unit="gCO2e/kWh" value={resolved.carbonIntensity} />
          {constantFields.map(([name, label, unit]) => <Parameter key={name} name={name} label={label} unit={unit} value={resolved.constants[name]} />)}
          <Parameter name="flowLitresPerMinute" label="Débit de douche" unit="L/min" value={resolved.shower.flowLitresPerMinute} />
          <Parameter name="inletTemperatureC" label="Température d’eau froide" unit="°C" value={resolved.shower.inletTemperatureC} />
          <Parameter name="outletTemperatureC" label="Température de douche" unit="°C" value={resolved.shower.outletTemperatureC} />
          <output className="help">Énergie par litre dérivée : {resolved.shower.energyKwhPerLitre} kWh/L</output>
          {invalidFields.length > 0 ? <p id="parameter-error" role="alert">{fr.invalidParameters}</p> : null}
          <div className="conversation-actions"><button type="submit">{fr.applyParametersAction}</button><button type="button" onClick={() => { setInvalidFields([]); dispatch({ type: 'parametersRestored' }); }}>{fr.restoreParametersAction}</button></div>
        </form> : null}
      </details>
    </section>
  );
}

const constantFields = [
  ['batchSize', 'Taille de batch', 'tokens'], ['gpuInstalledPerServer', 'GPU installés par serveur', 'GPU'], ['serverPowerWithoutGpuW', 'Puissance serveur hors GPU', 'W'], ['gpuMemoryGb', 'Mémoire GPU', 'Go'], ['quantizationBits', 'Quantification', 'bits'], ['memoryOverhead', 'Surcoût mémoire', 'ratio'], ['energyAlpha', 'Constante énergie alpha', 'Wh/token'], ['energyBeta', 'Constante énergie beta', 'ratio'], ['energyGamma', 'Constante énergie gamma', 'Wh/token'], ['latencyAlpha', 'Constante latence alpha', 's/token'], ['latencyBeta', 'Constante latence beta', 's/token'], ['latencyGamma', 'Constante latence gamma', 's'],
] as const;

const parameterNames = ['totalParameters', 'activatedParameters', 'inputRatio', 'cacheRatio', 'wordsPerToken', 'pue', 'wue', 'carbonIntensity', ...constantFields.map(([name]) => name), 'flowLitresPerMinute', 'inletTemperatureC', 'outletTemperatureC'];
function invalidParameterFields(value: ImpactParameterOverrides): string[] {
  const constants = value.constants!;
  const invalid = parameterNames.filter((name) => !Number.isFinite((name in constants ? constants[name as keyof typeof constants] : name in value.shower! ? value.shower![name as keyof typeof value.shower] : value[name as keyof ImpactParameterOverrides]) as number));
  if (value.pue! < 1) invalid.push('pue'); if (value.totalParameters! <= 0) invalid.push('totalParameters'); if (value.activatedParameters! <= 0 || value.activatedParameters! > value.totalParameters!) invalid.push('activatedParameters'); if (value.wordsPerToken! <= 0) invalid.push('wordsPerToken'); if (value.shower!.flowLitresPerMinute! <= 0) invalid.push('flowLitresPerMinute'); if (value.shower!.outletTemperatureC! <= value.shower!.inletTemperatureC!) invalid.push('outletTemperatureC');
  for (const name of ['batchSize', 'gpuInstalledPerServer', 'serverPowerWithoutGpuW', 'gpuMemoryGb', 'quantizationBits', 'memoryOverhead', 'energyAlpha', 'energyGamma', 'latencyAlpha', 'latencyBeta', 'latencyGamma'] as const) if (constants[name]! <= 0) invalid.push(name);
  if (constants.energyBeta! > 0) invalid.push('energyBeta'); return [...new Set(invalid)];
}
function differences(candidate: ImpactParameterOverrides, reference: NonNullable<ReturnType<typeof resolveImpactParameters>>): ImpactParameterOverrides {
  const scalarNames = ['totalParameters', 'activatedParameters', 'inputRatio', 'cacheRatio', 'pue', 'wue', 'carbonIntensity', 'wordsPerToken'] as const;
  const scalar = Object.fromEntries(scalarNames.flatMap((key) => candidate[key] === reference[key] ? [] : [[key, candidate[key]]]));
  const constants = Object.fromEntries(constantFields.flatMap(([key]) => candidate.constants![key] === reference.constants[key] ? [] : [[key, candidate.constants![key]]]));
  const shower = Object.fromEntries((['flowLitresPerMinute', 'inletTemperatureC', 'outletTemperatureC'] as const).flatMap((key) => candidate.shower![key] === reference.shower[key] ? [] : [[key, candidate.shower![key]]]));
  return { ...scalar, ...(Object.keys(constants).length ? { constants } : {}), ...(Object.keys(shower).length ? { shower } : {}) };
}
