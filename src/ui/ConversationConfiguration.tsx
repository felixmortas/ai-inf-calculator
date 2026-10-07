import { useImperativeHandle, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type Ref } from 'react';
import { flushSync } from 'react-dom';
import { hostingCountryOptions, userCountryOptions, modelCatalog, modelsForProvider, resolveImpactParameters, resolveUserCarbonIntensity, type ImpactParameterOverrides } from '../data/modelCatalog';
import { chatGptProvider, chatGptSubscriptions, mistralProvider, resolveMistralModel, type ChatGptSubscription, type MistralMode } from '../domain/modelSelection';
import type { ConversationAction, ConversationState } from '../application/conversationReducer';
import { fr } from '../i18n/fr';

/** Résultat de la collecte des champs numériques à l’activation de « Continuer ». */
export type ConfigurationCollection = { readonly ok: false } | { readonly ok: true; readonly overrides?: ImpactParameterOverrides };
export interface ConfigurationHandle { collect(): ConfigurationCollection; }

interface ConversationConfigurationProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
  readonly requireMistralMode?: boolean;
  readonly onMistralModeChosen?: () => void;
  readonly initialAdvancedOpen?: boolean;
  readonly onValidityChange?: (valid: boolean) => void;
  readonly ref?: Ref<ConfigurationHandle>;
}

type ParameterName = keyof typeof fr.parameterFields;

function Parameter({ name, value, version, invalid }: { name: ParameterName; value: number; version: number; invalid: boolean }) {
  const { label, unit, help } = fr.parameterFields[name];
  const id = `parameter-${name}`;
  const describedBy = [`${id}-help`, invalid ? `parameter-error-${name}` : undefined].filter(Boolean).join(' ');
  return <div className="field parameter"><label htmlFor={id}>{label} ({unit})</label><p id={`${id}-help`} className="help">{help}</p><input key={`${name}:${value}:${version}`} id={id} name={name} type="number" step="any" inputMode="decimal" defaultValue={value} aria-invalid={invalid || undefined} aria-describedby={describedBy} />{invalid ? <p id={`parameter-error-${name}`} className="parameter-field-error"><span aria-hidden="true">⚠ </span>{fr.invalidParameterField(label)}</p> : null}</div>;
}

function readCandidate(form: HTMLFormElement): ImpactParameterOverrides {
  const data = new FormData(form);
  const number = (name: string) => {
    const raw = data.get(name);
    return typeof raw !== 'string' || raw.trim() === '' ? Number.NaN : Number(raw);
  };
  return {
    totalParameters: number('totalParameters'), activatedParameters: number('activatedParameters'), inputRatio: number('inputRatio'), cacheRatio: number('cacheRatio'), pue: number('pue'), wue: number('wue'), carbonIntensity: number('carbonIntensity'), wordsPerToken: number('wordsPerToken'),
    constants: Object.fromEntries(constantFields.map((key) => [key, number(key)])),
    shower: { flowLitresPerMinute: number('flowLitresPerMinute'), inletTemperatureC: number('inletTemperatureC'), outletTemperatureC: number('outletTemperatureC'), ledPowerW: number('ledPowerW') },
  };
}

export function ConversationConfiguration({ state, dispatch, requireMistralMode = false, onMistralModeChosen, initialAdvancedOpen = false, onValidityChange, ref }: ConversationConfigurationProps) {
  const providerModels = modelsForProvider(modelCatalog, state.provider);
  const [invalidFields, setInvalidFields] = useState<readonly string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(initialAdvancedOpen);
  const [expertOpen, setExpertOpen] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const validityCallback = useRef(onValidityChange);
  validityCallback.current = onValidityChange;
  const resolved = resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, state.parameterOverrides);
  const reference = resolveImpactParameters(state.provider, state.modelId, state.hostingCountry);
  const formKey = `${state.provider}:${state.modelId}:${state.hostingCountry}:${JSON.stringify(state.parameterOverrides)}:${resetVersion}`;
  const userFactor = resolveUserCarbonIntensity(state.userCountry);
  const hostingFallsBackToWorld = !!reference && Object.values(reference.factorSources).includes('world');

  /** Validation en direct : calcule les champs invalides du brouillon courant. */
  function validate(): readonly string[] {
    const form = formRef.current;
    if (!form || !reference) return [];
    const candidate = readCandidate(form);
    const invalid = invalidParameterFields(candidate);
    const fields = invalid.length > 0 || resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, candidate) ? invalid : parameterNames;
    setInvalidFields((previous) => previous.length === fields.length && previous.every((name, index) => name === fields[index]) ? previous : fields);
    return fields;
  }

  useEffect(() => { validate(); }, [formKey]);
  useEffect(() => { validityCallback.current?.(invalidFields.length === 0); }, [invalidFields]);
  useEffect(() => () => validityCallback.current?.(true), []);

  useImperativeHandle(ref, () => ({
    collect(): ConfigurationCollection {
      const form = formRef.current;
      if (!form || !reference) return { ok: true };
      const fields = validate();
      if (fields.length > 0) {
        const first = [...advancedFieldNames, ...parameterNames].find((name) => fields.includes(name))!;
        flushSync(() => { setAdvancedOpen(true); if (!advancedFieldNames.includes(first)) setExpertOpen(true); });
        document.getElementById(`parameter-${first}`)?.focus();
        return { ok: false };
      }
      const overrides = differences(readCandidate(form), reference);
      return JSON.stringify(overrides) === JSON.stringify(state.parameterOverrides) ? { ok: true } : { ok: true, overrides };
    },
  }));

  function selectProvider(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'providerSelected', provider: event.currentTarget.value });
  }

  function selectSubscription(event: ChangeEvent<HTMLSelectElement>) {
    dispatch({ type: 'subscriptionSelected', subscription: event.currentTarget.value as ChatGptSubscription });
  }
  function selectMistralMode(event: ChangeEvent<HTMLSelectElement>) {
    const mode = event.currentTarget.value as MistralMode;
    dispatch({ type: 'mistralModeSelected', mode });
    if (requireMistralMode) dispatch({ type: 'modelSelected', modelId: resolveMistralModel(mode) });
    onMistralModeChosen?.();
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
  function restore() {
    setResetVersion((version) => version + 1);
    dispatch({ type: 'parametersRestored' });
  }
  function ignoreSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); }
  const has = (name: string) => invalidFields.includes(name);

  return (
    <section aria-labelledby="configuration-title" className="configuration">
      <h2 id="configuration-title">{fr.configurationTitle}</h2>
      <div className="field">
        <label htmlFor="provider">{fr.providerLabel}</label>
        <p id="provider-help" className="help">{fr.providerHelp}</p>
        <select id="provider" aria-describedby="provider-help" value={state.provider} onChange={selectProvider} disabled={requireMistralMode}>
          {modelCatalog.providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
        </select>
      </div>

      {state.provider === chatGptProvider ? (
        <div className="field">
          <label htmlFor="subscription">{fr.subscriptionLabel}</label>
          <select id="subscription" value={state.subscription} onChange={selectSubscription}>
            {chatGptSubscriptions.map(({ id, label }) => <option key={id} value={id}>{fr[label]}</option>)}
          </select>
        </div>
      ) : null}

      {state.provider === mistralProvider ? <div className="field">
        <label htmlFor="mistral-mode">{fr.mistralModeLabel}</label>
        <select id="mistral-mode" value={requireMistralMode ? '' : state.mistralMode} onChange={selectMistralMode} required>
          {requireMistralMode ? <option value="" disabled>{fr.mistralModeChoice}</option> : null}
          <option value="fast">{fr.mistralFast}</option>
          <option value="reasoning">{fr.mistralReasoning}</option>
        </select>
      </div> : null}

      <div className="field">
        <label htmlFor="model">{fr.modelLabel}</label>
        <p id="model-help" className="help">{fr.modelReferenceHelp}</p>
        <select id="model" aria-describedby="model-help" value={requireMistralMode ? '' : state.modelId} onChange={selectModel} disabled={requireMistralMode && state.provider === mistralProvider}>
          {requireMistralMode ? <option value="">{fr.mistralModeChoice}</option> : providerModels.map((model) => <option key={model.id} value={model.id}>{model.id}</option>)}
        </select>
      </div>

      <details className="advanced-settings" open={advancedOpen} onToggle={(event) => { if (event.target === event.currentTarget) setAdvancedOpen(event.currentTarget.open); }}>
        <summary aria-expanded={advancedOpen} aria-controls="advanced-settings-content">{fr.advancedSettingsTitle}<span aria-hidden="true" className="chevron">⌄</span></summary>
        <div id="advanced-settings-content">
          <p className="help">{fr.advancedSettingsIntro}</p>
          <div className="field">
            <label htmlFor="user-country">{fr.userCountryLabel}</label>
            <p id="user-country-help" className="help">{fr.userCountryHelp}</p>
            <select id="user-country" aria-describedby="user-country-help" value={state.userCountry} onChange={selectUserCountry}>
              {userCountryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} ({country.code})</option>)}
            </select>
          </div>
          {userFactor.status === 'world' ? <p className="help" role="note">{fr.userCountryWorldFallback}</p> : null}
          {resolved ? <form ref={formRef} className="parameter-form" onInput={validate} onSubmit={ignoreSubmit} noValidate>
            {showerFields.map((name) => <Parameter key={name} name={name} value={resolved.shower[name]} version={resetVersion} invalid={has(name)} />)}
            <details className="advanced-settings expert-settings" open={expertOpen} onToggle={(event) => { if (event.target === event.currentTarget) setExpertOpen(event.currentTarget.open); }}>
              <summary aria-expanded={expertOpen} aria-controls="expert-settings-content">{fr.expertSettingsTitle}<span aria-hidden="true" className="chevron">⌄</span></summary>
              <div id="expert-settings-content">
                <p className="help">{fr.expertSettingsIntro}</p>
                <div className="field">
                  <label htmlFor="hosting-country">{fr.hostingCountryLabel}</label>
                  <p id="hosting-country-help" className="help">{fr.hostingCountryHelp}</p>
                  <select id="hosting-country" aria-describedby={hostingFallsBackToWorld ? 'hosting-country-help hosting-country-fallback' : 'hosting-country-help'} value={state.hostingCountry} onChange={selectHostingCountry}>
                    {hostingCountryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} ({country.code})</option>)}
                  </select>
                  {hostingFallsBackToWorld ? <p id="hosting-country-fallback" className="help" role="note">{fr.hostingWorldFallback}</p> : null}
                </div>
                {[...expertScalarFields, ...constantFields].map((name) => <Parameter key={name} name={name} value={name in resolved.constants ? resolved.constants[name as typeof constantFields[number]] : resolved[name as typeof expertScalarFields[number]]} version={resetVersion} invalid={has(name)} />)}
              </div>
            </details>
            <button type="button" className="link-button restore-link" onClick={restore}>{fr.restoreParametersAction}</button>
          </form> : null}
        </div>
      </details>
    </section>
  );
}

const constantFields = ['batchSize', 'gpuInstalledPerServer', 'serverPowerWithoutGpuW', 'gpuMemoryGb', 'quantizationBits', 'memoryOverhead'] as const;
const showerFields = ['flowLitresPerMinute', 'inletTemperatureC', 'outletTemperatureC', 'ledPowerW'] as const;
const expertScalarFields = ['totalParameters', 'activatedParameters', 'inputRatio', 'cacheRatio', 'wordsPerToken', 'pue', 'wue', 'carbonIntensity'] as const;
/** Ordre d’affichage : Mode avancé puis Mode expert (sert à trouver la première erreur). */
const advancedFieldNames: readonly string[] = showerFields;
const parameterNames: readonly string[] = [...showerFields, ...expertScalarFields, ...constantFields];
function invalidParameterFields(value: ImpactParameterOverrides): string[] {
  const constants = value.constants!;
  const invalid: string[] = parameterNames.filter((name) => !Number.isFinite((name in constants ? constants[name as keyof typeof constants] : name in value.shower! ? value.shower![name as keyof typeof value.shower] : value[name as keyof ImpactParameterOverrides]) as number));
  if (value.pue! < 1) invalid.push('pue'); if (value.totalParameters! <= 0) invalid.push('totalParameters'); if (value.activatedParameters! <= 0 || value.activatedParameters! > value.totalParameters!) invalid.push('activatedParameters'); if (value.wordsPerToken! <= 0) invalid.push('wordsPerToken'); if (value.shower!.flowLitresPerMinute! <= 0) invalid.push('flowLitresPerMinute'); if (value.shower!.ledPowerW! <= 0) invalid.push('ledPowerW'); if (value.shower!.outletTemperatureC! <= value.shower!.inletTemperatureC!) invalid.push('outletTemperatureC');
  for (const name of ['batchSize', 'gpuInstalledPerServer', 'serverPowerWithoutGpuW', 'gpuMemoryGb', 'quantizationBits', 'memoryOverhead', 'energyAlpha', 'energyGamma', 'latencyAlpha', 'latencyBeta', 'latencyGamma'] as const) if (constants[name]! <= 0) invalid.push(name);
  if (constants.energyBeta! > 0) invalid.push('energyBeta'); return [...new Set(invalid)];
}
function differences(candidate: ImpactParameterOverrides, reference: NonNullable<ReturnType<typeof resolveImpactParameters>>): ImpactParameterOverrides {
  const scalarNames = ['totalParameters', 'activatedParameters', 'inputRatio', 'cacheRatio', 'pue', 'wue', 'carbonIntensity', 'wordsPerToken'] as const;
  const scalar = Object.fromEntries(scalarNames.flatMap((key) => candidate[key] === reference[key] ? [] : [[key, candidate[key]]]));
  const constants = Object.fromEntries(constantFields.flatMap((key) => candidate.constants![key] === reference.constants[key] ? [] : [[key, candidate.constants![key]]]));
  const shower = Object.fromEntries(showerFields.flatMap((key) => candidate.shower![key] === reference.shower[key] ? [] : [[key, candidate.shower![key]]]));
  return { ...scalar, ...(Object.keys(constants).length ? { constants } : {}), ...(Object.keys(shower).length ? { shower } : {}) };
}
