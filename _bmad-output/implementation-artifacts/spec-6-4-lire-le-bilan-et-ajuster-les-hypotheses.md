---
title: '6.4 — Lire le bilan et ajuster les hypothèses'
type: 'feature'
created: '2026-09-24'
status: 'done'
baseline_commit: '1394874c5bd86e5722f6f4b831a2c965cb73c6ae'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le bilan garde des unités fixes, montre ses conseils trop tôt et ne relie pas les échanges bloquants à leurs cartes. Les paramètres avancés ne sont accessibles qu’à la sélection et n’annoncent pas clairement la péremption.

**Approach:** Achever le bilan et rendre les hypothèses modifiables depuis le fil et le bilan. Réutiliser calculs et fraîcheur, partager le formatage et guider vers les résultats à recalculer.

## Boundaries & Constraints

**Always:** « Calculer toute la conversation » traite les échanges renseignés sur action explicite. « Recalculer le total » réutilise seulement les résultats actuels ; un résultat absent ou périmé rend le total incomplet. Appliquer ou restaurer des paramètres conserve textes, chatbot et modèle, annonce une fois la péremption et ne calcule rien. Distinguer les deux pays ; une modification limitée à la douche ne périme que l’équivalence. Garder valeurs internes non arrondies et formules. Expliquer près des valeurs incertitude, usage hors Scope 3, repli Monde et indisponibilité ; sécheresse qualitative, douche équivalente en carbone.

**Never:** Montrer les conseils avant un bilan actuel ; calculer implicitement ; présenter un ancien total comme actuel ; confondre les pays.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Comportement attendu | Erreur |
|---|---|---|---|
| Bilan complet | Calcul global explicite | Six catégories avec limites proches | Indisponibilité expliquée |
| Total incomplet | Résultat absent ou périmé | Aucun calcul d’échange ; liens vers les cartes | Ancien total masqué |
| Hypothèses | Appliquer ou restaurer | Session conservée ; une annonce des résultats à refaire | Erreur liée à chaque champ invalide |
| Douche seule | Pays personnel ou douche modifié | Seule l’équivalence périme | Actualisation explicite |
| Unités | Zéro, seuils, extrêmes | Trois chiffres, virgule, unité et nom accessible | Aucune notation scientifique au maximum |

</frozen-after-approval>

## Code Map

- `src/ui/App.tsx` — `calculateAll` et `recalculateSummary` existent ; préserver leur séparation. `ConversationConfiguration` n’est montée qu’en sélection : ouvrir ses paramètres depuis fil/bilan.
- `src/application/conversationReducer.ts` — `summaryBlockingBlockIds`, empreintes et prédicats de fraîcheur existent ; ne corriger que les écarts prouvés, préserver le rejet des réponses obsolètes.
- `src/ui/ConversationBlocks.tsx` — bilan et cartes utilisent `formatImpact` à quatre chiffres et unités fixes ; conseils visibles dès un seul impact, échanges bloquants sans liens.
- `src/ui/quantityFormatter.ts` — nouveau formateur de présentation partagé par cartes et bilan ; les résultats internes restent non arrondis.
- `src/ui/ConversationConfiguration.tsx` — pays distincts, validation, application, restauration ; l’erreur commune doit aussi être liée à chaque champ invalide.
- `src/i18n/fr.ts`, `src/ui/styles.css` — libellés, unités, explications, focus et reflow ; suivre `EXPERIENCE.md:108,116-127` et `DESIGN.md`.
- `src/ui/*test.tsx`, `src/ui/styles.test.ts` — parcours, péremption, unités et transitions.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/ConversationBlocks.tsx`, `src/ui/App.tsx` — bilan actuel, « total incomplet » et liens vers cartes ; conseils après bilan valide ; accès aux paramètres et retour de focus depuis fil/bilan.
- [x] `src/ui/ConversationConfiguration.tsx`, `src/application/conversationReducer.ts` — appliquer/restaurer depuis fil/bilan, erreurs par champ, annonce unique de péremption ; corriger la fraîcheur seulement si nécessaire.
- [x] `src/ui/quantityFormatter.ts`, `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts` — formateur partagé des quatre quantités suivant `EXPERIENCE.md:116-118` ; limites et aide près des résultats.
- [x] `src/ui/styles.css` — reflow à 320 px et zoom 200 %/400 %, cibles 44 × 44 px, focus visible, états textuels et mouvement réduit.
- [x] `src/ui/quantityFormatter.test.ts`, `src/ui/ConversationBlocks.test.tsx`, `src/ui/ConversationConfiguration.test.tsx`, `src/ui/AppFlow.test.tsx`, `src/ui/styles.test.ts` — couvrir matrice, parcours manuel/importé, clavier et annonces.

**Acceptance Criteria:**
- Given une conversation renseignée, when elle lance le calcul global, then le bilan actuel présente les six catégories, conseils et limites.
- Given un résultat absent ou périmé, when elle recalcule le total, then aucun échange n’est recalculé et chaque carte bloquante est accessible sans ancien total actuel.
- Given des paramètres appliqués ou restaurés, when elle revient au bilan, then session et choix sont conservés, une seule annonce signale les résultats dépendants à recalculer.

## Implementation Notes

- Le bilan ne présente les six catégories et les conseils que lorsque son total est actuel. Les cartes bloquantes sont reliées à leur échange et reçoivent le focus.
- Le formateur commun adapte carbone, eau, énergie et durée à trois chiffres significatifs ; les valeurs de calcul restent intactes.
- L’accès aux hypothèses depuis le bilan ouvre les paramètres avancés. Appliquer ou restaurer conserve la conversation et empêche qu’un ancien résultat redevienne actuel après un retour aux valeurs initiales.
- Les tests automatisés couvrent les lignes de la matrice, y compris le parcours importé. Contrôles visuels manuels à 320 px et aux zooms 200 % et 400 % encore à réaliser.

## Spec Change Log

## Review Triage Log

| Constat | Verdict et preuve | Route |
|---|---|---|
| Blind — choix de référence puis retour ranime un impact | medium — les actions de sélection gardaient l’empreinte initiale du résultat ; le retour pouvait la faire correspondre. | patch : marquer le résultat périmé au changement. |
| Blind — modification puis annulation du texte ranime un impact | medium — `blockUpdated` conservait l’impact et son empreinte initiale ; le retour du texte rétablissait la fraîcheur. | patch : marquer l’impact périmé dès la modification. |
| Blind — durée arrondie à 60 s | low — le seuil d’avancement générique était 1 000, malgré le seuil réel de 60 s. | patch : utiliser le rapport des seuils d’unités. |
| Blind — pays implicites dans le bilan | medium — le risque et la douche étaient affichés sans les pays choisis, donc les deux références restaient ambiguës. | patch : afficher les pays près des résultats. |
| Blind — annonce partielle après deux modifications | medium — l’ancien calcul soustrayait les résultats actuels avant/après la dernière action et omettait ceux déjà périmés. | patch : compter les résultats encore périmés. |
| Blind — sélection du modèle sans annonce | medium — `configurationDispatch` excluait les actions de choix du chatbot et du modèle. | patch : inclure ces actions. |
| Blind — bilan entier en zone dynamique | medium — `role="status"` englobait les conseils et le bouton, provoquant une annonce trop longue. | patch : limiter la zone dynamique à un état court. |
| Blind — bouton d’hypothèses absent quand le bilan périme | medium — le bouton était seulement enfant du bilan actuel, qui disparaît après changement d’impact. | patch : fournir l’accès dans l’état incomplet. |
| Blind — noms d’unités au pluriel après 1 | low — le formateur rendait systématiquement le nom pluriel, y compris « 1 kilowattheures ». | patch : accorder le nom avec la quantité affichée. |
| Edge — franchissement des seuils de durée | low — même défaut de seuil que le constat Blind, confirmé pour minute, heure et jour. | patch : correction commune du formateur. |
| Vérification — retour aux défauts sans assertion de fraîcheur d’échange | medium — les tests vérifiaient le bilan mais pas l’impact après restauration ; une régression pouvait ranimer l’échange. | patch : assertion dans le test du réducteur. |
| Vérification — focus du champ invalide non vérifié | medium — l’interaction testée contrôlait ARIA sans vérifier le déplacement de focus. | patch : assertion de focus asynchrone. |

## Verification

Revue : 12 constats classés, corrections intégrées, aucun report. Vérification finale du 24 septembre 2026 : 224 tests réussis sur 25 fichiers ; `npm run lint`, `npm run build` et `git diff --check` réussis.

**Commands:**
- `npm test -- --run` — scénarios et régressions verts.
- `npm run lint` — types valides.
- `npm run build` — application compilable.
- `git diff --check` — aucun défaut d’espacement.

**Manual checks:**
- Parcours au clavier sur accueil, import, fil et bilan ; reflow à 320 px, zoom 200 % et 400 %, annonces de transition et préférence de mouvement réduit.
