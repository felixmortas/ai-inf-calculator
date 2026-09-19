import type { ImportEvent } from './types';

export interface ImportPreviewBlock {
  readonly message: string;
  readonly visibleReasoning: string;
  readonly finalResponse: string;
  readonly artifact: string;
  readonly inaccessible: readonly ('artifact' | 'source-file')[];
}

export type ImportPreviewWarningCode = 'unattributed-event' | 'incomplete-user' | 'artifact-detected' | 'source-file-detected';

export interface ImportPreviewWarning {
  readonly code: ImportPreviewWarningCode;
  readonly eventOrder: number;
  readonly message: string;
}

export interface ConversationPreview {
  readonly blocks: readonly ImportPreviewBlock[];
  readonly warnings: readonly ImportPreviewWarning[];
}

const artifactPattern = /sandbox:\/mnt\/data\/[^\s)\]]+/i;
const filecitePattern = /filecite[^]+/u;

function isTrace(event: ImportEvent, traceMode: boolean): boolean {
  if (event.role === 'tool') return true;
  if (event.role !== 'assistant') return false;
  return /^Réfléchi pendant\b/i.test(event.text)
    || (/\/mnt\/data\//i.test(event.text) && !/sandbox:\/mnt\/data\//i.test(event.text))
    || /(?:bash|sh)\s+-lc\s+.*SKILL\.md|SKILL\.md/i.test(event.text)
    || (traceMode && /```|\b(?:const|let|var|function|import|export)\b/.test(event.text));
}

/** Regroupe uniquement les événements normalisés, sans connaître leur fournisseur. */
export function previewConversationImport(events: readonly ImportEvent[]): ConversationPreview {
  const blocks: ImportPreviewBlock[] = [];
  const warnings: ImportPreviewWarning[] = [];
  let current: { message: string; traces: string[]; finalResponse?: string; finalResponseEvent?: ImportEvent; traceMode: boolean; userOrder: number } | undefined;

  const warn = (code: ImportPreviewWarningCode, event: ImportEvent, message: string) => warnings.push({ code, eventOrder: event.order, message });
  const finish = (event: ImportEvent | undefined) => {
    if (!current) return;
    if (!current.finalResponse) warn('incomplete-user', event ?? { role: 'user', text: current.message, order: current.userOrder }, 'Le message utilisateur n’a pas de réponse finale publique.');
    const finalResponse = current.finalResponse ?? '';
    const inaccessible: ('artifact' | 'source-file')[] = [];
    const responseEvent = current.finalResponseEvent ?? event ?? { role: 'assistant', text: '', order: current.userOrder };
    if (artifactPattern.test(finalResponse)) {
      inaccessible.push('artifact');
      warn('artifact-detected', responseEvent, 'Artifact détecté : collez son contenu dans le champ Artifact optionnel pour le compter.');
    }
    if (filecitePattern.test(finalResponse)) {
      inaccessible.push('source-file');
      warn('source-file-detected', responseEvent, 'Fichier source détecté : uploadez-le pour inclure son contenu dans les tokens d’entrée.');
    }
    blocks.push({ message: current.message, visibleReasoning: current.traces.join('\n\n'), finalResponse, artifact: '', inaccessible });
    current = undefined;
  };

  const orderedEvents = events.map((event, index) => ({ event, index })).sort((left, right) => left.event.order - right.event.order || left.index - right.index);
  for (const { event } of orderedEvents) {
    if (event.role === 'user' && event.text.trim() !== '') {
      finish(event);
      current = { message: event.text, traces: [], traceMode: false, userOrder: event.order };
      continue;
    }
    if (!current) {
      warn('unattributed-event', event, 'Événement public non attribué : aucun message utilisateur ouvert.');
      continue;
    }
    if (current.finalResponse) {
      warn('unattributed-event', event, 'Événement public non attribué après la réponse finale.');
      continue;
    }
    if (isTrace(event, current.traceMode)) {
      current.traces.push(event.text);
      current.traceMode ||= /SKILL\.md/i.test(event.text);
      continue;
    }
    if (event.role === 'assistant') {
      current.finalResponse = event.text;
      current.finalResponseEvent = event;
      continue;
    }
    warn('unattributed-event', event, 'Événement public non attribué.');
  }
  finish(undefined);
  return { blocks, warnings };
}
