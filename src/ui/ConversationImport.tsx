import { useRef, useState } from 'react';
import { previewConversationImport, type ConversationPreview } from '../application/import/conversationPreview';
import { importProviders } from '../application/import/registry';
import type { ConversationAction, ConversationState } from '../application/conversationReducer';
import type { ImportProvider } from '../application/import/types';
import { hasConversationBlockContent } from '../domain/conversationContent';
import { fr } from '../i18n/fr';

interface ConversationImportProps {
  readonly state: ConversationState;
  readonly dispatch: (action: ConversationAction) => void;
  readonly providers?: readonly ImportProvider[];
}

export function ConversationImport({ state, dispatch, providers = importProviders }: ConversationImportProps) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ConversationPreview>();
  const [error, setError] = useState<string>();
  const [analysing, setAnalysing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const analysisVersion = useRef(0);
  const provider = providers.find((item) => item.id === providerId);
  const hasExistingContent = state.blocks.some(hasConversationBlockContent);

  async function analyse() {
    if (!provider) return;
    const version = ++analysisVersion.current;
    setError(undefined); setPreview(undefined); setConfirming(false);
    const invalid = provider.validateUrl(url);
    if (invalid?.ok === false) { setError(invalid.error.message); return; }
    setAnalysing(true);
    try {
      const result = await provider.importFromUrl(url);
      if (version !== analysisVersion.current) return;
      setAnalysing(false);
      if (result.ok === false) { setError(result.error.message); return; }
      const nextPreview = previewConversationImport(result.events);
      if (nextPreview.blocks.length === 0) { setError(fr.importNoCandidatesError); return; }
      setPreview(nextPreview);
    } catch {
      if (version !== analysisVersion.current) return;
      setAnalysing(false); setError(fr.importUnexpectedError);
    }
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
      <select id="import-provider" value={providerId} onChange={(event) => { analysisVersion.current += 1; setProviderId(event.currentTarget.value); setPreview(undefined); setError(undefined); setConfirming(false); }}>
        {providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>
    <div className="field">
      <label htmlFor="import-url">{fr.importUrlLabel}</label>
      <input id="import-url" type="url" value={url} onChange={(event) => { analysisVersion.current += 1; setUrl(event.currentTarget.value); setPreview(undefined); setError(undefined); setConfirming(false); }} />
      <p className="help">{fr.importUrlHelp}</p>
    </div>
    <button type="button" onClick={() => void analyse()} disabled={analysing || !provider}>{analysing ? fr.importAnalysingAction : fr.importAnalyseAction}</button>
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
