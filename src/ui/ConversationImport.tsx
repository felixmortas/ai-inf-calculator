import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { previewConversationImport, type ConversationPreview } from '../application/import/conversationPreview';
import { importProviders, isResolvedShare, providerForResolvedShare, resolveShare } from '../application/import/registry';
import { createRemoteGatewayConsent, workerImportEndpoint } from '../application/import/remoteGateway';
import type { ConversationAction, ConversationState } from '../application/conversationReducer';
import type { ImportProvider, ResolvedShare } from '../application/import/types';
import { hasConversationBlockContent } from '../domain/conversationContent';
import { fr } from '../i18n/fr';

interface ConversationImportProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
  readonly onImported?: () => void;
  readonly onManual?: () => void;
  readonly providers?: readonly ImportProvider[];
  /** Injection de test ; le parcours publié emploie uniquement le registre fermé. */
  readonly resolve?: (value: string) => ResolvedShare | undefined;
}

interface PendingConsent {
  readonly resolved: ResolvedShare;
  readonly version: number;
  readonly capability: unknown;
  readonly endpoint: string;
}

export function ConversationImport({ state, dispatch, onImported, onManual, providers = importProviders, resolve = resolveShare }: ConversationImportProps) {
  const [detectedProvider, setDetectedProvider] = useState<string>();
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
  const cancelConsentRef = useRef<HTMLButtonElement>(null);
  const cancelReplaceRef = useRef<HTMLButtonElement>(null);
  const replacementTriggerRef = useRef<HTMLButtonElement | null>(null);
  const returnToReplaceTriggerRef = useRef(false);
  const previewTitleRef = useRef<HTMLHeadingElement>(null);
  const loadingRef = useRef<HTMLParagraphElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const focusReturnRef = useRef<React.RefObject<HTMLButtonElement | null> | null>(null);
  const provider = detectedProvider ? providers.find((item) => item.id === detectedProvider) ?? (providers.length === 1 ? providers[0] : undefined) : undefined;
  const hasExistingContent = state.blocks.some(hasConversationBlockContent);

  useEffect(() => {
    if (!pendingConsent && !confirming) {
      if (returnToReplaceTriggerRef.current && replacementTriggerRef.current) {
        replacementTriggerRef.current.focus();
        replacementTriggerRef.current = null;
        returnToReplaceTriggerRef.current = false;
        return;
      }
      focusReturnRef.current?.current?.focus();
      focusReturnRef.current = null;
      return;
    }
    const background = document.querySelector<HTMLElement>('.app-shell') ?? sectionRef.current;
    if (background) background.inert = true;
    (pendingConsent ? cancelConsentRef : cancelReplaceRef).current?.focus();
    return () => { if (background) background.inert = false; };
  }, [pendingConsent, confirming]);

  useEffect(() => () => { analysisVersion.current += 1; }, []);

  useEffect(() => {
    if (preview) previewTitleRef.current?.focus();
  }, [preview]);

  useEffect(() => {
    if (analysing) loadingRef.current?.focus();
    else if (error) errorRef.current?.focus();
  }, [analysing, error]);

  function restoreFocus(ref: React.RefObject<HTMLButtonElement | null>) {
    focusReturnRef.current = ref;
  }

  function invalidateAnalysis() {
    analysisVersion.current += 1;
    importStarted.current = false;
    setAnalysing(false);
    setPendingConsent(undefined);
    setPreview(undefined);
    setError(undefined);
    setConfirming(false);
  }

  useEffect(() => {
    const wasOpen = pendingConsent !== undefined || confirming;
    invalidateAnalysis();
    setDetectedProvider(undefined);
    if (wasOpen) restoreFocus(analyseButtonRef);
  }, [providers, resolve]);

  function closeConsent() {
    importStarted.current = false;
    setPendingConsent(undefined);
    restoreFocus(analyseButtonRef);
  }

  function analyse() {
    const version = ++analysisVersion.current;
    importStarted.current = false;
    setError(undefined); setPreview(undefined); setConfirming(false); setPendingConsent(undefined);
    const resolved = resolve(url);
    if (!resolved || resolved.providerId !== 'mistral' || !isResolvedShare(resolved)) { setDetectedProvider(undefined); setError(fr.importMistralOnlyError); return; }
    const resolvedProvider = providers.find((item) => item.id === 'mistral');
    if (!resolvedProvider) { setDetectedProvider(undefined); setError(fr.importMistralOnlyError); return; }
    setDetectedProvider(resolved.providerId);
    const endpoint = workerImportEndpoint();
    const capability = createRemoteGatewayConsent(resolved, isResolvedShare, providerForResolvedShare, endpoint);
    if (!capability) { setError(fr.importUnexpectedError); return; }
    setPendingConsent({ resolved, version, capability, endpoint: endpoint! });
  }

  async function continueImport() {
    const consent = pendingConsent;
    if (!consent || !provider || importStarted.current
      || consent.resolved.canonicalUrl !== url || consent.endpoint !== workerImportEndpoint()
      || consent.resolved.providerId !== 'mistral' || provider.id !== 'mistral'
      || consent.version !== analysisVersion.current) return;
    importStarted.current = true;
    setPendingConsent(undefined);
    setAnalysing(true);
    try {
      const result = provider.importResolvedShare
        ? await provider.importResolvedShare(consent.resolved, consent.capability)
        : { ok: false as const, providerId: provider.id, events: [] as const, error: { code: 'configuration' as const, message: 'L’import distant exige un adaptateur de partage attesté.' } };
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

  function trapDialogFocus(event: React.KeyboardEvent<HTMLDivElement>, close: () => void) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
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

  function beginReplacement(event: React.MouseEvent<HTMLButtonElement>) {
    if (hasExistingContent && !confirming) replacementTriggerRef.current = event.currentTarget;
    replace();
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
    onImported?.();
    setPreview(undefined); setConfirming(false); setError(undefined);
  }

  function closeConfirmation() {
    returnToReplaceTriggerRef.current = true;
    setConfirming(false);
  }

  return <section ref={sectionRef} className="conversation-import" aria-labelledby="conversation-import-title">
    <h2 id="conversation-import-title">{fr.importTitle}</h2>
    {detectedProvider ? <p role="status"><strong>{fr.importProviderLabel}</strong> : {provider?.label}</p> : null}
    <div className="field">
      <label htmlFor="import-url">{fr.importUrlLabel}</label>
      <input id="import-url" type="url" value={url} onChange={(event) => { invalidateAnalysis(); setDetectedProvider(undefined); setUrl(event.currentTarget.value); }} />
      <p className="help">{fr.importUrlHelp}</p>
    </div>
    <aside className="import-help" aria-labelledby="import-help-title">
      <h3 id="import-help-title">{fr.importHelpTitle}</h3>
      <p>{fr.importHelpIntroduction}</p>
      <ul>{fr.importHelpProviders.map((item) => <li key={item.name}><strong>{item.name}</strong> — {item.format}</li>)}</ul>
      <p>{fr.importHelpLimits}</p>
      <p>{fr.importHelpThirdParty}</p>
      <p>{fr.importHelpUncertainty}</p>
      <p>{fr.importHelpLocalData}</p>
    </aside>
    <button ref={analyseButtonRef} type="button" onClick={analyse} disabled={analysing}>{analysing ? fr.importAnalysingAction : fr.importAnalyseAction}</button>
    {preview ? <hr className="import-separator" /> : null}
    {pendingConsent ? createPortal(<div className="import-consent-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="import-consent-title" className="import-consent" onKeyDown={(event) => trapDialogFocus(event, closeConsent)}>
        <h3 id="import-consent-title">{fr.importConsentTitle}</h3>
        <p>{fr.importConsentPurpose(provider?.label ?? pendingConsent.resolved.providerId)}</p>
        <p><strong>{fr.importConsentWorkerLabel}</strong>: <span className="import-consent-url">{pendingConsent.endpoint}</span></p>
        <p><strong>{fr.importConsentUrlLabel}</strong>: <span className="import-consent-url">{pendingConsent.resolved.canonicalUrl}</span></p>
        <p>{fr.importConsentMetadata}</p>
        <p>{fr.importConsentLocalData}</p>
        <div className="import-consent-actions">
          <button ref={continueButtonRef} type="button" onClick={() => void continueImport()}>{fr.importConsentContinueAction}</button>
          <button ref={cancelConsentRef} type="button" onClick={closeConsent}>{fr.importCancelAction}</button>
          <button type="button" onClick={() => { closeConsent(); onManual?.(); }}>{fr.importManualAction}</button>
        </div>
      </div>
    </div>, document.body) : null}
    {analysing ? <p ref={loadingRef} role="status" tabIndex={-1}>{fr.importAnalysingAction}</p> : null}
    {error ? <div className="import-error"><p ref={errorRef} role="alert" tabIndex={-1}>{error}</p><button type="button" onClick={onManual}>{fr.importManualAction}</button></div> : null}
    {preview ? <div className="import-preview">
      <p role="status">{fr.importPreviewCount(preview.blocks.length, preview.warnings.length)}</p>
      <button type="button" onClick={beginReplacement}>{fr.importReplaceAction}</button>
      <h3 ref={previewTitleRef} tabIndex={-1}>{fr.importPreviewTitle}</h3>
      {preview.blocks.map((block, index) => <article key={index} className="import-preview-block">
        <h4>{fr.blockTitle(index + 1)}</h4>
        <p><strong>{fr.messageLabel}</strong>: {block.message}</p>
        {block.visibleReasoning ? <p><strong>{fr.visibleReasoningLabel}</strong>: {block.visibleReasoning}</p> : null}
        {block.finalResponse ? <p><strong>{fr.finalResponseLabel}</strong>: {block.finalResponse}</p> : null}
        {block.inaccessible.map((kind) => <p key={kind}>{kind === 'artifact' ? fr.importArtifactDetected : fr.importSourceFileDetected}</p>)}
      </article>)}
      {preview.warnings.length ? <div className="import-warnings"><h4>{fr.importWarningsTitle}</h4><ul>{preview.warnings.map((warning, index) => <li key={`${warning.code}-${warning.eventOrder}-${index}`}>{warning.message}</li>)}</ul></div> : null}
      {confirming ? createPortal(<div className="import-consent-backdrop"><div role="alertdialog" aria-modal="true" aria-labelledby="import-confirm-title" className="import-consent import-confirmation" onKeyDown={(event) => trapDialogFocus(event, closeConfirmation)}>
        <p id="import-confirm-title">{fr.importConfirmText}</p>
        <button ref={cancelReplaceRef} type="button" onClick={closeConfirmation}>{fr.importKeepConversationAction}</button>
        <button type="button" onClick={replace}>{fr.importConfirmAction}</button>
      </div></div>, document.body) : <button type="button" onClick={beginReplacement}>{fr.importReplaceAction}</button>}
    </div> : null}
  </section>;
}
