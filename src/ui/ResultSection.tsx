import { useEffect, useRef, useState } from 'react';
import {
  isSummaryCurrent,
  isSummaryLedEquivalenceCurrent,
  isSummaryShowerEquivalenceCurrent,
  type ConversationState,
} from '../application/conversationReducer';
import { browserShareEnvironment, buildShareTextFromState, shareResult, shouldAlertOnCopy } from '../application/shareResult';
import { goodPracticesBlogUrl, pickGoodPractice, type GoodPracticeId } from '../domain/goodPractice';
import { countryLabel as localizedCountry, resolveImpactParameters } from '../data/modelCatalog';
import { useI18n } from '../i18n/I18nProvider';
import type { Messages } from '../i18n/fr';
import { Icon } from './Icons';
import { formatQuantity, type QuantityKind } from './quantityFormatter';

interface ResultSectionProps {
  readonly state: ConversationState;
  /** Tirage injectable de la bonne pratique (par défaut `Math.random`). */
  readonly random?: () => number;
}

function Quantity({ value, kind, messages, locale }: { readonly value: number; readonly kind: QuantityKind; readonly messages: Messages; readonly locale: string }) {
  const quantity = formatQuantity(value, kind, messages, locale);
  return <><span aria-hidden="true">{quantity.display}</span><span className="visually-hidden">{quantity.accessible}</span></>;
}

/** Section « Résultat » sous la conversation : absente avant le premier calcul réussi, « à recalculer » ensuite si périmée. */
export function ResultSection({ state, random }: ResultSectionProps) {
  const { messages, locale } = useI18n();
  const practice = useRef<{ readonly key: string; readonly id: GoodPracticeId } | null>(null);
  const summary = state.summary?.status === 'result' ? state.summary : undefined;
  const current = !!summary && isSummaryCurrent(state);
  const showerCurrent = current && isSummaryShowerEquivalenceCurrent(state);
  const canShare = showerCurrent && state.summaryShowerEquivalence !== undefined;
  const [shareFeedback, setShareFeedback] = useState<{ readonly kind: 'failed'; readonly text: string } | null>(null);
  const manualText = useRef<HTMLTextAreaElement>(null);
  const sharing = useRef(false);
  const canShareNow = useRef(canShare);
  canShareNow.current = canShare;
  useEffect(() => { if (!canShare) setShareFeedback(null); }, [canShare]);
  useEffect(() => { if (shareFeedback?.kind === 'failed') { manualText.current?.focus(); manualText.current?.select(); } }, [shareFeedback]);
  if (!summary) return null;
  const onShare = async () => {
    const text = buildShareTextFromState(state, { origin: window.location.origin, pathname: window.location.pathname }, messages, locale);
    if (!text || sharing.current) return;
    sharing.current = true;
    setShareFeedback(null);
    const outcome = await shareResult(text, browserShareEnvironment()).finally(() => { sharing.current = false; });
    if (!canShareNow.current) return;
    if (outcome === 'copied') {
      if (shouldAlertOnCopy(navigator.userAgent)) window.alert(messages.shareCopiedAlert);
    }
    else if (outcome === 'failed') setShareFeedback({ kind: 'failed', text });
  };
  if (current) {
    const key = summary.fingerprint;
    if (practice.current?.key !== key) practice.current = { key, id: pickGoodPractice(random) };
  }
  const total = summary.total;
  const shower = isSummaryShowerEquivalenceCurrent(state) ? state.summaryShowerEquivalence?.equivalence : undefined;
  const led = isSummaryLedEquivalenceCurrent(state) ? state.summaryLedEquivalence?.equivalence : undefined;
  const ledPower = resolveImpactParameters(state.provider, state.modelId, state.hostingCountry, state.parameterOverrides)?.shower.ledPowerW;
  const countryLabel = localizedCountry(state.userCountry, locale, messages.worldCountry);
  const worldCountry = shower?.status === 'available' && shower.factorSource === 'world';

  return (
    <section className="result-section" aria-labelledby="result-title">
      <h3 id="result-title" tabIndex={-1}>{messages.resultTitle}</h3>
      {!current ? <p className="impact-stale"><span aria-hidden="true">↻ </span>{messages.resultStale}</p> : <>
        <div className="result-hero">
          {shower?.status === 'available' ? <>
            <p className="metric-hero">
              <span className="disc" aria-hidden="true"><Icon name="shower" /></span>
              <span aria-hidden="true">{messages.resultShower(formatQuantity(shower.seconds, 'duration', messages, locale).display)}</span>
              <span className="visually-hidden">{messages.resultShower(formatQuantity(shower.seconds, 'duration', messages, locale).accessible)}</span>
            </p>
            <p className="impact-note">{worldCountry ? messages.resultCountryWorld(countryLabel) : messages.resultCountry(countryLabel)}</p>
          </> : shower ? <p>{messages.resultShowerUnavailable}</p> : <p className="impact-stale"><span aria-hidden="true">↻ </span>{messages.resultShowerStale}</p>}
        </div>
        <ul className="metrics">
          <li className="metric metric-carbon"><span className="disc" aria-hidden="true"><Icon name="leaf" /></span><span className="metric-label">{messages.resultCarbon}</span> <span className="metric-value"><Quantity messages={messages} locale={locale} value={total.carbonGco2e} kind="carbon" /></span></li>
          <li className="metric metric-water"><span className="disc" aria-hidden="true"><Icon name="drop" /></span><span className="metric-label">{messages.resultWater}</span> <span className="metric-value"><Quantity messages={messages} locale={locale} value={total.waterL} kind="water" /></span></li>
          <li className="metric metric-power"><span className="disc" aria-hidden="true"><Icon name="bolt" /></span><span className="metric-label">{messages.resultElectricity}</span> <span className="metric-value"><Quantity messages={messages} locale={locale} value={total.energyWh} kind="energy" /></span></li>
          <li className="metric metric-led">
            <span className="disc" aria-hidden="true"><Icon name="bulb" /></span>
            <span className="metric-label">{messages.resultLed(ledPower === undefined ? '' : messages.resultLedPower(new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 }).format(ledPower)))}</span>{' '}
            <span className="metric-value">{!led
              ? <span className="impact-stale"><span aria-hidden="true">↻ </span>{messages.staleEstimate}</span>
              : led.status === 'available' ? <Quantity messages={messages} locale={locale} value={led.seconds} kind="duration" /> : <span>{messages.resultLedUnavailable}</span>}</span>
          </li>
        </ul>
        <p className="result-interpretation">{messages.resultInterpretation}</p>
        <p className="impact-note">{messages.resultScope}</p>
        <p className="impact-note">{messages.resultUncertainty}</p>
        {Object.values(summary.factorSources ?? {}).includes('world') ? <p className="impact-note">{messages.resultHostingWorld}</p> : null}
        <section className="good-practices" aria-labelledby="good-practice-title">
          <h4 id="good-practice-title">{messages.goodPracticeTitle}</h4>
          <p>{messages.goodPractices[practice.current!.id]}</p>
        </section>
        <a className="link-button result-link" href={goodPracticesBlogUrl} target="_blank" rel="noopener noreferrer">
          {messages.goodPracticesAction}{' '}<span className="visually-hidden">{messages.goodPracticesNewTab}</span>
        </a>
        {canShare ? <div className="share-block">
          <button type="button" className="share-button" onClick={() => { void onShare(); }}>
            <Icon name="share" /> {messages.shareAction}
          </button>
          {shareFeedback?.kind === 'failed' ? <div className="share-feedback">
            <p role="alert">{messages.shareFailed}</p>
            <label htmlFor="share-manual-text">{messages.shareManualInstruction}</label>
            <textarea id="share-manual-text" ref={manualText} readOnly rows={6} value={shareFeedback.text} />
          </div> : null}
        </div> : null}
      </>}
    </section>
  );
}
