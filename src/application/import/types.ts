/** Représentation minimale, indépendante des futurs blocs de conversation. */
export interface ImportEvent {
  readonly id?: string;
  readonly role: string;
  readonly text: string;
  /** Position publique déterministe, après déduplication. */
  readonly order: number;
  readonly createdAt?: number;
}

export type ImportErrorCode =
  | 'invalid-url'
  | 'network'
  | 'timeout'
  | 'http'
  | 'response-too-large'
  | 'format-unknown'
  | 'too-many-events';

export interface ImportError {
  readonly code: ImportErrorCode;
  readonly message: string;
  readonly status?: number;
}

export type ImportResult =
  | { readonly ok: true; readonly providerId: string; readonly events: readonly ImportEvent[] }
  | { readonly ok: false; readonly providerId: string; readonly events: readonly []; readonly error: ImportError };

export interface ImportProvider {
  readonly id: string;
  readonly label: string;
  validateUrl(value: string): ImportResult | undefined;
  importFromUrl(value: string): Promise<ImportResult>;
}
