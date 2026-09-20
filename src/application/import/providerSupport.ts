import type { ImportError, ImportErrorCode, ImportProviderId, ImportResult, NormalizedImportEvent } from './types';

export type JsonRecord = Record<string, unknown>;

export function errorResult(providerId: ImportProviderId, code: ImportErrorCode, message: string): ImportResult {
  const error: ImportError = Object.freeze({ code, message });
  return Object.freeze({ ok: false as const, providerId, events: Object.freeze([]) as readonly [], error });
}

export function successResult(providerId: ImportProviderId, events: readonly NormalizedImportEvent[]): ImportResult {
  return Object.freeze({ ok: true as const, providerId, events: Object.freeze([...events]) });
}

export function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonRecord : undefined;
}

/** Lit uniquement le JSON déjà inclus dans une page, sans jamais l'exécuter. */
export function jsonScript(html: string, attribute: string): unknown | undefined {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`<script\\b[^>]*\\s${escapedAttribute}(?=\\s|=|>)[^>]*>([\\s\\S]*?)<\\/script\\s*>`, 'gi');
  for (let match; (match = expression.exec(html)) !== null;) {
    try { return JSON.parse(match[1].trim()); } catch { /* Essayer l'état public suivant. */ }
  }
  return undefined;
}

export function boundedText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(boundedText).filter(Boolean).join('\n');
  const item = asRecord(value);
  if (!item) return '';
  for (const key of ['text', 'content', 'parts', 'value']) {
    if (key in item) {
      const result = boundedText(item[key]);
      if (result) return result;
    }
  }
  return '';
}

export function hasNonText(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasNonText);
  const item = asRecord(value);
  return Boolean(item && (item.attachment || item.attachments || item.artifact || item.citation || item.image || item.document
    || Object.values(item).some(hasNonText)));
}

export function hasValidExtractionLimits(limits: Pick<import('./types').ImportLimits, 'maxEvents' | 'maxBytes'>): boolean {
  return Number.isSafeInteger(limits.maxBytes) && limits.maxBytes > 0
    && Number.isSafeInteger(limits.maxEvents) && limits.maxEvents > 0;
}
