---
title: '7.4 Lire un résultat clair sous la conversation'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '5ffe65e7a4fe500a3b0dcf02ecf03e7c3edbb5d4'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Après « Calculer », l’ancien panneau « Bilan environnemental » (jargon, douche en simple ligne, liste de cinq conseils, aucune comparaison LED) ne donne pas d’ordre de grandeur parlant, et `ledPowerW` n’a aucun consommateur.

**Approach:** Remplacer ce panneau par une section « Résultat » sous la conversation (sans nouvel écran, absente avant le premier calcul réussi) : douche en grand, carbone/eau/électricité, durée d’ampoule LED, phrase fixe, périmètre, une bonne pratique tirée au sort et un bouton vers l’article de blog des bonnes pratiques. Résultat périmé : « à recalculer », valeurs retirées.

## Boundaries & Constraints

**Always:** Textes via `fr.ts`. Formules inchangées (méthodologie §8.2 déjà à jour) ; durée LED = `E_total` non arrondie / `ledPowerW` (5 W par défaut), en `formatQuantity` (ms → j) avec nom accessible complet. Seul le carbone dépend du pays de la personne ; l’eau n’est jamais comparée. Phrase d’interprétation fixe : « Une conversation pèse peu, mais ça s’additionne : 100 conversations comme celle-ci ont un impact plus conséquent. » (« 100 » présenté comme convention d’illustration, jamais choisie ni qualifiée selon la valeur, aucun gain promis). Périmètre : « Ne compte que l’électricité des serveurs, pas la fabrication du matériel ni l’entraînement de l’IA », sans lien ni bouton « En savoir plus », et mention visible « estimation fondée sur des hypothèses, pas sur une mesure ». Bonne pratique tirée par une fonction injectable, stable pour un même résultat (pas de nouveau tirage au re-rendu), sans gain chiffré. Bouton-lien « Voir les bonnes pratiques » vers l’article de blog (pas encore rédigé) : URL provisoire dans une constante unique, facile à remplacer ; lien externe qui ne renvoie jamais à la méthodologie de la page, ouvert dans un nouvel onglet (`target="_blank"`, `rel="noopener noreferrer"`, mention « s’ouvre dans un nouvel onglet » dans le nom accessible). URL provisoire : `https://example.org/bonnes-pratiques-ia`. Rien n’est stocké ni envoyé. Aucun statut par la couleur seule ; reflow 320 px, zoom 200 %/400 %, ordre de lecture = ordre visuel, aucune métrique tronquée.

**Ask First:** Modifier formules, moteur, tokenisation ou `impactFingerprint`/`summaryFingerprint`.

**Never:** Implémenter 7.5 (bouton « Partager », texte de partage). Réintroduire un calcul par échange ou une liste de cinq conseils. Ajouter un bouton ou lien « En savoir plus » dans le résultat. Nouveau stockage, appel réseau, géolocalisation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Avant calcul | Aucun « Calculer » réussi | Aucune section résultat | N/A |
| Premier succès | « Calculer » abouti | Section sous la conversation ; son titre « Résultat » reçoit le focus ; douche en `metric-hero`, puis carbone, eau, électricité, LED | N/A |
| LED invalide | `ledPowerW` ≤ 0 | « Comparaison non calculable » près de la LED ; reste du résultat intact ; pas de division par zéro | Pas de durée infinie |
| Puissance LED modifiée | Seul `ledPowerW` change | Seule la ligne LED passe « à recalculer » ; impacts et douche restent à jour | N/A |
| Résultat périmé | Texte, modèle, pays d’hébergement ou paramètre change | Section « à recalculer » (texte + pictogramme), anciennes valeurs retirées, aucun total présenté comme actuel | N/A |
| Pays non déduit | `resolveUserCarbonIntensity` → `world` | Repli « Monde » présenté comme estimation corrigeable près de la douche | N/A |
| Tirage | Re-rendu sans nouveau calcul | Même bonne pratique ; nouveau calcul → nouveau tirage | N/A |
| Bonnes pratiques | Clic sur « Voir les bonnes pratiques » | Ouverture de l’URL provisoire dans un nouvel onglet ; la page et la conversation restent intactes | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/ConversationBlocks.tsx` -- panneau `summary-panel` (l. 284-292) et composant `Shower` (l. 70) à remplacer ; `isSummaryCurrent`, `isSummaryShowerEquivalenceCurrent` déjà importés.
- `src/ui/App.tsx` -- `calculateAll` (l. 195-225) émet `summaryResolved` puis `showerEquivalenceResolved` : y ajouter l’équivalence LED ; `returnFocus`/`.summary-panel button` (l. 82) à réviser ; 
- `src/domain/showerEquivalence.ts` -- modèle de la fonction pure ; ajouter `src/domain/ledEquivalence.ts` (électricité Wh → secondes = 3600·E/P ; `unavailable` si P ≤ 0 ou non fini).
- `src/application/conversationReducer.ts` -- `showerFingerprint` (l. 236, à renommer `equivalenceFingerprint` avec ses usages dans `App.tsx` et les tests), `keepChangedResultsStale` (l. 190-205) : inclure `ledPowerW` dans une empreinte d’équivalence qui ne périme jamais les impacts ; état `summaryLedEquivalence` par analogie avec `summaryShowerEquivalence`.
- `src/ui/quantityFormatter.ts` -- `formatQuantity(…, 'duration')` suffit (ms→j) ; compléter les tests (zéro, sous-seuil, bascule, > 999 j).
- `src/domain/goodPractice.ts` (nouveau) -- liste cataloguée + `pickGoodPractice(random)` injectable ; tirage mémorisé par empreinte du résultat.
- `src/i18n/fr.ts` -- remplace `summaryTitle`, `summaryLimits`, `goodPractices*`, `staleShower` ; ajoute clés résultat, LED, phrase, périmètre, incertitude, lien, « à recalculer ».
- `src/ui/CalculationBar.tsx`, `src/ui/styles.css` -- statut « Calcul en cours… » dans `.app-shell` inerte donc non annoncé (deferred 7.3) : correction facultative, seulement si elle est simple (zone `role="status"` hors du conteneur inerte), sinon laissée en différé ; classes `result-hero`, `metric-hero`, `metric`.
- Tests : `ConversationBlocks.test.tsx`, `AppFlow.test.tsx`, `conversationReducer.test.ts`, nouveaux tests des fonctions pures.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/ledEquivalence.ts` + test -- durée LED pure, puissance nulle/négative → non calculable -- AD-5, FR-25
- [x] `src/domain/goodPractice.ts` + test -- catalogue de bonnes pratiques sans gain chiffré, tirage injectable, constante de l’URL du blog -- FR-6
- [x] `src/application/conversationReducer.ts` -- renommer `showerFingerprint` en `equivalenceFingerprint` (couvre aussi `ledPowerW`) ; état et empreinte de l’équivalence LED/douche (jamais d’impact périmé) ; péremption retire les valeurs -- FR-12, UX-DR26
- [x] `src/ui/App.tsx` -- calcul LED dans `calculateAll`, focus sur le titre du premier résultat, statut de calcul annoncé si l’effort reste faible -- UX-DR24
- [x] `src/ui/ConversationBlocks.tsx` (ou `ResultSection.tsx` extrait) -- section résultat selon la matrice -- UX-DR25, UX-DR26, UX-DR27
- [x] `src/i18n/fr.ts`, `src/ui/styles.css` -- textes et styles ; retirer clés mortes -- UX-DR30
- [x] Tests -- chaque ligne de la matrice ; formateur (zéro, sous-seuil, bascule, dépassement) ; absence d’ancien panneau ; ordre de lecture

**Acceptance Criteria:**
- Given un résultat à jour, when il s’affiche, then l’ordre est douche (hero), carbone, eau, électricité, LED, phrase, périmètre/incertitude, bonne pratique, bouton « Voir les bonnes pratiques », avec unités complètes en noms accessibles.
- Given un changement d’entrée ou de paramètre, when la section est affichée, then elle indique « à recalculer » sans aucune ancienne valeur ni total ancien.
- Given la section résultat, when elle est parcourue au clavier à 320 px et 400 %, then rien n’est tronqué et le focus n’est jamais masqué par la barre collante.

## Spec Change Log

## Design Notes

Les totaux partent des valeurs non arrondies ; l’arrondi (3 chiffres significatifs, virgule française) n’intervient qu’à l’affichage. L’empreinte d’équivalence dépend du carbone, du pays de la personne, de la douche et de `ledPowerW` ; les impacts restent régis par `impactFingerprint`.

## Verification

**Commands:**
- `npm test -- --run` -- expected: tous les tests passent
- `npx tsc -b --noEmit` -- expected: aucune erreur
- `npm run build` -- expected: build réussi

**Manual checks (if no CLI):**
- Calculer une conversation, modifier la puissance LED puis un texte ; vérifier focus, annonces et lecture à 320 px / zoom 400 %.

## Suggested Review Order

**Calcul de l’équivalence LED et état de péremption**

- Durée LED pure ; puissance ≤ 0 ou non finie → non calculable.
  [`ledEquivalence.ts:6`](../../src/domain/ledEquivalence.ts#L6)

- Empreinte d’équivalence sans `ledPowerW` ; empreinte LED séparée pour ne périmer que la ligne LED.
  [`conversationReducer.ts:244`](../../src/application/conversationReducer.ts#L244)

- Péremption sélective : impacts et douche intacts quand seule la puissance LED change.
  [`conversationReducer.ts:203`](../../src/application/conversationReducer.ts#L203)

**Section Résultat**

- Section extraite : ordre douche, métriques, LED, phrase, périmètre, pratique, lien.
  [`ResultSection.tsx:25`](../../src/ui/ResultSection.tsx#L25)

- Tirage de bonne pratique injectable et URL provisoire en constante unique.
  [`goodPractice.ts:9`](../../src/domain/goodPractice.ts#L9)

**Orchestration et focus**

- Calcul LED après `summaryResolved` ; focus sur le titre « Résultat ».
  [`App.tsx:229`](../../src/ui/App.tsx#L229)

**Textes et styles**

- Clés résultat, phrase fixe, périmètre ; clés mortes retirées.
  [`fr.ts:110`](../../src/i18n/fr.ts#L110)

- Styles `result-section` et `metric-hero`.
  [`styles.css:205`](../../src/ui/styles.css#L205)

**Tests**

- Parcours complet : la ligne LED est renseignée après « Calculer ».
  [`AppFlow.test.tsx:112`](../../src/ui/AppFlow.test.tsx#L112)
