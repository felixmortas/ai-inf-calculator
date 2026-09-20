/** Représentation minimale, indépendante des futurs blocs de conversation. */
export type ImportProviderId = 'chatgpt' | 'claude' | 'mistral' | 'gemini';

export interface ImportEvent {
  readonly id?: string;
  readonly role: string;
  readonly text: string;
  /** Position publique déterministe, après déduplication. */
  readonly order: number;
  readonly createdAt?: number;
  readonly type?: 'message' | 'inaccessible-content' | 'unattributed-event';
  readonly contentType?: 'attachment' | 'artifact' | 'citation' | 'non-text';
  readonly label?: string;
  readonly reason?: string;
}

export interface InaccessibleContentEvent {
  readonly type: 'inaccessible-content';
  readonly contentType: 'attachment' | 'artifact' | 'citation' | 'non-text';
  readonly label: string;
  readonly blockId?: string;
  readonly order: number;
}

export interface UnattributedEvent {
  readonly type: 'unattributed-event';
  readonly reason: string;
  readonly order: number;
}

export type NormalizedImportEvent = ImportEvent;

export interface ImportLimits {
  readonly maxUrlLength: number;
  readonly timeoutMs: number;
  readonly maxBytes: number;
  readonly maxEvents: number;
  readonly maxRedirects: number;
}

export interface RedirectPolicy {
  readonly maxRedirects: number;
  readonly allowedOrigins: readonly string[];
}

export type ImportErrorCode =
  | 'invalid-url'
  | 'consent-required'
  | 'configuration'
  | 'policy'
  | 'network'
  | 'timeout'
  | 'http'
  | 'response-too-large'
  | 'format-unknown'
  | 'too-many-events'
  | 'redirect-disallowed';

export interface ImportError {
  readonly code: ImportErrorCode;
  readonly message: string;
  readonly status?: number;
}

export type ImportResult =
  | { readonly ok: true; readonly providerId: string; readonly events: readonly NormalizedImportEvent[] }
  | { readonly ok: false; readonly providerId: string; readonly events: readonly []; readonly error: ImportError };

export interface ImportProvider {
  readonly id: string;
  readonly label: string;
  readonly limits?: ImportLimits;
  readonly policyVersion?: string;
  readonly redirectPolicy?: RedirectPolicy;
  canonicalizeUrl?(value: string): string | undefined;
  extract?(html: string, limits?: Pick<ImportLimits, 'maxEvents' | 'maxBytes'>): ImportResult;
  /** Compatibilité temporaire du parcours UI ChatGPT-only. */
  validateUrl(value: string): ImportResult | undefined;
  importFromUrl(value: string, consent?: unknown): Promise<ImportResult>;
}

/**
 * Capacité locale. Sa validité ne dépend pas de sa forme : seul le registre
 * peut l'attester dans le processus courant.
 */
export interface ResolvedShare {
  readonly providerId: ImportProviderId;
  readonly canonicalUrl: string;
  readonly limits: ImportLimits;
  readonly policyVersion: string;
}
