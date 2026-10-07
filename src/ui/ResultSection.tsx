import { useEffect, useRef, useState } from 'react';
import {
  isSummaryCurrent,
  isSummaryLedEquivalenceCurrent,
  isSummaryShowerEquivalenceCurrent,
  type ConversationState,
} from '../application/conversationReducer';
import { browserShareEnvironment, buildShareTextFromState, shareResult, shouldAlertOnCopy } from '../application/shareResult';
import { goodPracticesBlogUrl, pickGoodPractice, type GoodPracticeId } from '../domain/goodPractice';
import { resolveImpactParameters, userCountryOptions } from '../data/modelCatalog';
import { fr } from '../i18n/fr';
import { formatQuantity, type QuantityKind } from './quantityFormatter';

interface ResultSectionProps {
  readonly state: ConversationState;
  /** Tirage injectable de la bonne pratique (par défaut `Math.random`). */
  readonly random?: () => number;
}

function Quantity({ value, kind }: { readonly value: number; readonly kind: QuantityKind }) {
  const quantity = formatQuantity(value, kind);
  return <><span aria-hidden="true">{quantity.display}</span><span className="visually-hidden">{quantity.accessible}</span></>;
}

/** Section « Résultat » sous la conversation : absente avant le premier calcul réussi, « à recalculer » ensuite si périmée. */
export function ResultSection({ state, random }: ResultSectionProps) {
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
    const text = buildShareTextFromState(state, { origin: window.location.origin, pathname: window.location.pathname });
    if (!text || sharing.current) return;
    sharing.current = true;
    setShareFeedback(null);
    const outcome = await shareResult(text, browserShareEnvironment()).finally(() => { sharing.current = false; });
    if (!canShareNow.current) return;
    if (outcome === 'copied') {
      if (shouldAlertOnCopy(navigator.userAgent)) window.alert(fr.shareCopiedAlert);
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
  const countryLabel = userCountryOptions.find((country) => country.code === state.userCountry)?.label ?? state.userCountry;
  const worldCountry = shower?.status === 'available' && shower.factorSource === 'world';

  return (
    <section className="result-section" aria-labelledby="result-title">
      <h3 id="result-title" tabIndex={-1}>{fr.resultTitle}</h3>
      {!current ? <p className="impact-stale"><span aria-hidden="true">↻ </span>{fr.resultStale}</p> : <>
        <div className="result-hero">
          {shower?.status === 'available' ? <>
            <p className="metric-hero">
              <span aria-hidden="true">🚿 </span>
              <span aria-hidden="true">{fr.resultShower(formatQuantity(shower.seconds, 'duration').display)}</span>
              <span className="visually-hidden">{fr.resultShower(formatQuantity(shower.seconds, 'duration').accessible)}</span>
            </p>
            <p className="impact-note">{worldCountry ? fr.resultCountryWorld(countryLabel) : fr.resultCountry(countryLabel)}</p>
          </> : shower ? <p>{fr.resultShowerUnavailable}</p> : <p className="impact-stale"><span aria-hidden="true">↻ </span>{fr.resultShowerStale}</p>}
        </div>
        <ul className="metrics">
          <li className="metric"><span className="metric-label">{fr.resultCarbon}</span> <span className="metric-value"><Quantity value={total.carbonGco2e} kind="carbon" /></span></li>
          <li className="metric"><span className="metric-label">{fr.resultWater}</span> <span className="metric-value"><Quantity value={total.waterL} kind="water" /></span></li>
          <li className="metric"><span className="metric-label">{fr.resultElectricity}</span> <span className="metric-value"><Quantity value={total.energyWh} kind="energy" /></span></li>
          <li className="metric">
            <span className="metric-label">{fr.resultLed(ledPower === undefined ? '' : fr.resultLedPower(ledPower))}</span>{' '}
            <span className="metric-value">{!led
              ? <span className="impact-stale"><span aria-hidden="true">↻ </span>{fr.staleEstimate}</span>
              : led.status === 'available' ? <Quantity value={led.seconds} kind="duration" /> : <span>{fr.resultLedUnavailable}</span>}</span>
          </li>
        </ul>
        <p className="result-interpretation">{fr.resultInterpretation}</p>
        <p className="impact-note">{fr.resultScope}</p>
        <p className="impact-note">{fr.resultUncertainty}</p>
        {Object.values(summary.factorSources ?? {}).includes('world') ? <p className="impact-note">{fr.resultHostingWorld}</p> : null}
        <section className="good-practices" aria-labelledby="good-practice-title">
          <h4 id="good-practice-title">{fr.goodPracticeTitle}</h4>
          <p>{fr.goodPractices[practice.current!.id]}</p>
        </section>
        <a className="link-button result-link" href={goodPracticesBlogUrl} target="_blank" rel="noopener noreferrer">
          {fr.goodPracticesAction}{' '}<span className="visually-hidden">{fr.goodPracticesNewTab}</span>
        </a>
        {canShare ? <div className="share-block">
          <button type="button" className="share-button" onClick={() => { void onShare(); }}>
            <span aria-hidden="true">↗</span> {fr.shareAction}
          </button>
          {shareFeedback?.kind === 'failed' ? <div className="share-feedback">
            <p role="alert">{fr.shareFailed}</p>
            <label htmlFor="share-manual-text">{fr.shareManualInstruction}</label>
            <textarea id="share-manual-text" ref={manualText} readOnly rows={6} value={shareFeedback.text} />
          </div> : null}
        </div> : null}
      </>}
    </section>
  );
}
