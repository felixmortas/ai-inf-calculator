import type { ResolvedShare } from './types';

const key = Symbol.for('ai-env-impact-calculator.resolved-share-attestations');
const globalAttestations = globalThis as typeof globalThis & { [key]?: WeakSet<object> };

/** Vérification publique seulement ; le registre reste le seul à attester. */
export function isAttestedResolvedShare(value: unknown): value is ResolvedShare {
  return typeof value === 'object' && value !== null && globalAttestations[key]?.has(value) === true;
}
