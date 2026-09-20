import { useEffect, useRef, useState } from 'react';
import { previewConversationImport, type ConversationPreview } from '../application/import/conversationPreview';
import { importProviders } from '../application/import/registry';
import { createRemoteGatewayConsent } from '../application/import/remoteGateway';
import type { ConversationAction, ConversationState } from '../application/conversationReducer';
import type { ImportProvider } from '../application/import/types';
import { hasConversationBlockContent } from '../domain/conversationContent';
import { fr } from '../i18n/fr';

interface ConversationImportProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
  readonly providers?: readonly ImportProvider[];
}

interface PendingConsent {
  readonly url: string;
  readonly providerId: string;
  readonly version: number;
  readonly capability: unknown;
}

export function ConversationImport({ state, dispatch, providers = importProviders }: ConversationImportProps) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ConversationPreview>();
  const [error, setError] = useState<string>();
  const [analysing, setAnalysing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent>();
  const analysisVersion = useRef(0);
  const importStarted = useRef(false);
  const analyseButtonRef = useRef<HTMLButtonElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const provider = providers.find((item) => item.id === providerId);
  const hasExistingContent = state.blocks.some(hasConversationBlockContent);

  useEffect(() => {
    if (pendingConsent) continueButtonRef.current?.focus();
  }, [pendingConsent]);

  function invalidateAnalysis() {
    analysisVersion.current += 1;
    importStarted.current = false;
    setAnalysing(false);
    setPendingConsent(undefined);
    setPreview(undefined);
    setError(undefined);
    setConfirming(false);
  }

  function closeConsent() {
    importStarted.current = false;
    setPendingConsent(undefined);
    analyseButtonRef.current?.focus();
  }

  function analyse() {
    if (!provider) return;
    const version = ++analysisVersion.current;
    importStarted.current = false;
    setError(undefined); setPreview(undefined); setConfirming(false); setPendingConsent(undefined);
    const invalid = provider.validateUrl(url);
    if (invalid?.ok === false) { setError(invalid.error.message); return; }
    const capability = createRemoteGatewayConsent(url);
    if (!capability) { setError(fr.importUnexpectedError); return; }
    setPendingConsent({ url, providerId: provider.id, version, capability });
  }

  async function continueImport() {
    const consent = pendingConsent;
    if (!consent || !provider || importStarted.current
      || consent.url !== url || consent.providerId !== provider.id || consent.version !== analysisVersion.current) return;
    importStarted.current = true;
    setPendingConsent(undefined);
    setAnalysing(true);
    try {
      const result = await provider.importFromUrl(consent.url, consent.capability);
      if (consent.version !== analysisVersion.current) return;
      setAnalysing(false);
      if (result.ok === false) { setError(result.error.message); return; }
      const nextPreview = previewConversationImport(result.events);
      if (nextPreview.blocks.length === 0) { setError(fr.importNoCandidatesError); return; }
      setPreview(nextPreview);
    } catch {
      if (consent.version !== analysisVersion.current) return;
      setAnalysing(false); setError(fr.importUnexpectedError);
    } finally {
      if (consent.version === analysisVersion.current) importStarted.current = false;
    }
  }

  function trapConsentFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); closeConsent(); return; }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function replace() {
    if (!preview || preview.blocks.length === 0) return;
    if (hasExistingContent && !confirming) { setConfirming(true); return; }
    const used = new Set<string>();
    const blocks = preview.blocks.map((block, index) => {
      let number = index + 1;
      let blockId = `block-${number}`;
      while (used.has(blockId)) blockId = `block-${++number}`;
      used.add(blockId);
      return { blockId, message: block.message, visibleReasoning: block.visibleReasoning, finalResponse: block.finalResponse, artifact: block.artifact };
    });
    dispatch({ type: 'blocksReplaced', blocks });
    setPreview(undefined); setConfirming(false); setError(undefined);
  }

  return <section className="conversation-import" aria-labelledby="conversation-import-title">
    <h2 id="conversation-import-title">{fr.importTitle}</h2>
    <div className="field">
      <label htmlFor="import-provider">{fr.importProviderLabel}</label>
      <select id="import-provider" value={providerId} onChange={(event) => { invalidateAnalysis(); setProviderId(event.currentTarget.value); }}>
        {providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>
    <div className="field">
      <label htmlFor="import-url">{fr.importUrlLabel}</label>
      <input id="import-url" type="url" value={url} onChange={(event) => { invalidateAnalysis(); setUrl(event.currentTarget.value); }} />
      <p className="help">{fr.importUrlHelp}</p>
    </div>
    <button ref={analyseButtonRef} type="button" onClick={analyse} disabled={analysing || !provider}>{analysing ? fr.importAnalysingAction : fr.importAnalyseAction}</button>
    {pendingConsent ? <div className="import-consent-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="import-consent-title" className="import-consent" onKeyDown={trapConsentFocus}>
        <h3 id="import-consent-title">{fr.importConsentTitle}</h3>
        <p>{fr.importConsentPurpose}</p>
        <p><strong>{fr.importConsentUrlLabel}</strong>: <span className="import-consent-url">{pendingConsent.url}</span></p>
        <p>{fr.importConsentMetadata}</p>
        <p>{fr.importConsentLocalData}</p>
        <p className="import-consent-links">
          <a href={fr.corsProxyDocumentationUrl} target="_blank" rel="noreferrer">{fr.corsProxyDocumentationLabel}</a>{' · '}
          <a href={fr.corsProxyPrivacyUrl} target="_blank" rel="noreferrer">{fr.corsProxyPrivacyLabel}</a>{' · '}
          <a href={fr.corsProxyTermsUrl} target="_blank" rel="noreferrer">{fr.corsProxyTermsLabel}</a>
        </p>
        <div className="import-consent-actions">
          <button ref={continueButtonRef} type="button" onClick={() => void continueImport()}>{fr.importConsentContinueAction}</button>
          <button type="button" onClick={closeConsent}>{fr.importCancelAction}</button>
          <a href="#conversation-title" onClick={closeConsent}>{fr.importManualAction}</a>
        </div>
      </div>
    </div> : null}
    {error ? <p role="alert" className="import-error">{error}</p> : null}
    {preview ? <div className="import-preview" aria-live="polite">
      <h3>{fr.importPreviewTitle}</h3>
      {preview.blocks.map((block, index) => <article key={index} className="import-preview-block">
        <h4>{fr.blockTitle(index + 1)}</h4>
        <p><strong>{fr.messageLabel}</strong>: {block.message}</p>
        {block.visibleReasoning ? <p><strong>{fr.visibleReasoningLabel}</strong>: {block.visibleReasoning}</p> : null}
        {block.finalResponse ? <p><strong>{fr.finalResponseLabel}</strong>: {block.finalResponse}</p> : null}
        {block.inaccessible.map((kind) => <p key={kind} role="status">{kind === 'artifact' ? fr.importArtifactDetected : fr.importSourceFileDetected}</p>)}
      </article>)}
      {preview.warnings.length ? <div className="import-warnings" role="status"><h4>{fr.importWarningsTitle}</h4><ul>{preview.warnings.map((warning, index) => <li key={`${warning.code}-${warning.eventOrder}-${index}`}>{warning.message}</li>)}</ul></div> : null}
      {confirming ? <div role="alertdialog" aria-modal="true" aria-labelledby="import-confirm-title" className="import-confirmation">
        <p id="import-confirm-title">{fr.importConfirmText}</p>
        <button type="button" onClick={replace}>{fr.importConfirmAction}</button>
        <button type="button" onClick={() => setConfirming(false)}>{fr.importCancelAction}</button>
      </div> : <button type="button" onClick={replace}>{fr.importReplaceAction}</button>}
    </div> : null}
  </section>;
}
