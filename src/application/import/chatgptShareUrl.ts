/** Invariants purs partagés par l’adaptateur local et la frontière réseau. */
export const CHATGPT_SHARE_LIMITS = Object.freeze({
  timeoutMs: 10_000,
  maxBytes: 2 * 1024 * 1024,
  maxEvents: 1_000,
});

/** Accepte uniquement la forme canonique, sans normalisation silencieuse. */
export function validateChatGptShareUrl(value: string): string | undefined {
  try {
    // URL normalise le port HTTPS explicite en chaîne vide : contrôler aussi la
    // forme saisie évite donc d’accepter silencieusement un port interdit.
    if (value.length > 2_048 || !/^https:\/\/chatgpt\.com\/share\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) return undefined;
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'chatgpt.com'
      && url.port === ''
      && url.username === ''
      && url.password === ''
      && url.search === ''
      && url.hash === ''
      && /^\/share\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(url.pathname)
      ? value
      : undefined;
  } catch { return undefined; }
}
