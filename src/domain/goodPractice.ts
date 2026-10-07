/** URL provisoire de l’article de blog des bonnes pratiques (pas encore rédigé) : à remplacer ici uniquement. */
export const goodPracticesBlogUrl = 'https://example.org/bonnes-pratiques-ia';

/** Identifiants du catalogue ; les textes vivent dans `fr.goodPractices`. Aucun gain chiffré. */
export const goodPracticeIds = ['smallModel', 'noDetailedReasoning', 'shortTexts', 'newConversation', 'editMessage'] as const;
export type GoodPracticeId = typeof goodPracticeIds[number];

/** Tire une bonne pratique ; `random` est injectable (valeur dans [0, 1[). */
export function pickGoodPractice(random: () => number = Math.random): GoodPracticeId {
  const value = random();
  const safe = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
  return goodPracticeIds[Math.floor(safe * goodPracticeIds.length)];
}
