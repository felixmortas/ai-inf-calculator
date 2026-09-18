---
title: 'Story 3.2 — Identifier les résultats périmés et recalculer le total'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'd38de3be32490bab6fe8523fa28e107c36e25eab'
context:
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Après le calcul d’une conversation, toute modification efface aujourd’hui indistinctement les impacts. La personne ne peut ni savoir quels échanges doivent être recalculés ni régénérer seulement un total fiable.

**Approach:** Conserver les résultats associés à des empreintes canoniques, dériver explicitement leur fraîcheur selon les dépendances de conversation, puis ajouter un recalcul de bilan qui n’agrège que les résultats déjà à jour.

## Boundaries & Constraints

**Always:** Les empreintes `impactFingerprint` et `showerFingerprint` sont pures, canoniques et indépendantes du rendu React; un résultat périmé n’est jamais présenté comme actuel; modifier un texte, un paramètre ou une sélection périme le bloc dépendant et les suivants affectés par historique/artifact; un ajout ou retrait de bloc entièrement vide ne périme rien; le recalcul du total refuse tout bloc renseigné absent, jamais calculé ou périmé et identifie les échanges concernés; aucune action ne déclenche un impact implicitement; les données restent en mémoire locale.

**Never:** Ne pas modifier les formules d’impact, les arrondis d’affichage, l’agrégateur brut, les catalogues ni le comportement explicite « Tout calculer » de la story 3.1; ne pas agréger une partie des échanges ni conserver un ancien bilan sous l’apparence d’un résultat courant.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Édition dépendante | Des impacts de plusieurs échanges existent; un texte ou artifact est modifié | Le bloc changé et les suivants dont l’historique/artifact dépend de lui deviennent périmés; le bilan cesse d’être actuel | Les impacts précédents indépendants restent utilisables |
| Bloc vide | Un bloc blanc est ajouté ou retiré après un calcul | Les empreintes et résultats existants restent à jour | Aucune invalidation ni calcul implicite |
| Recalcul permis | Chaque bloc renseigné a un impact à jour | « Recalculer le total » agrège les valeurs existantes et publie le bilan | Aucun appel de tokenisation ou de calcul d’impact |
| Recalcul refusé | Au moins un bloc renseigné est absent, jamais calculé, bloqué ou périmé | Le bilan est bloqué et liste les échanges concernés | Aucun total partiel ni calcul en arrière-plan |

</frozen-after-approval>

## Code Map

- `src/application/conversationReducer.ts` -- remplacer l’effacement global par la conservation des résultats liés à leur empreinte; exposer des sélecteurs purs de fraîcheur et des identifiants bloquants, contrôler les actions de bilan et maintenir le rejet des réponses asynchrones anciennes.
- `src/application/conversationReducer.test.ts` -- couvrir la chaîne de dépendances, le retrait/ajout vide, les sélections, les empreintes et le refus d’un bilan non intégral.
- `src/domain/conversationHistory.ts` -- réemployer la construction ordonnée de l’historique et de la contribution d’artifact pour constituer les dépendances canoniques; ne pas modifier sa sémantique de reconstruction.
- `src/domain/impactAggregation.ts` -- réemployer l’agrégateur de valeurs brutes tel quel pour le total valide.
- `src/ui/App.tsx` -- conserver `calculateAll` explicite; ajouter un chemin de recalcul qui lit les impacts à jour, valide avant agrégation et ne lance ni Worker ni `calculateImpact`.
- `src/ui/ConversationBlocks.tsx` -- afficher sans couleur seule la péremption de chaque échange, une liste accessible des échanges bloquants et l’action de recalcul du seul total; ne pas rendre d’impact périmé comme courant.
- `src/i18n/fr.ts`, `src/ui/styles.css` -- centraliser les libellés français et styles accessibles de péremption/blocage, y compris petit écran.
- `src/ui/ConversationBlocks.test.tsx` -- tester le parcours utilisateur de péremption et la preuve qu’un recalcul de total ne relance aucun impact.

## Tasks & Acceptance

**Execution:**

- [x] `src/application/conversationReducer.ts` et `conversationReducer.test.ts` -- modéliser les empreintes canoniques et la fraîcheur par bloc, les dépendances à partir de l’historique et les mutations qui ne doivent rien périmer; fournir la validation atomique du recalcul de bilan.
- [x] `src/ui/App.tsx` -- agréger uniquement les `ImpactResult` existants validés par le reducer, associer le risque existant et publier le succès ou les identifiants bloquants sans appeler le calcul individuel.
- [x] `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` et tests UI -- présenter les résultats périmés, le blocage explicite et « Recalculer le total » de manière accessible; vérifier les scénarios édités, supprimés et vides.

**Acceptance Criteria:**

- Given un résultat calculé, when son texte ou une sélection/valeur de calcul change, then le résultat dépendant et les suivants concernés sont marqués périmés sans calcul automatique.
- Given un bloc renseigné supprimé, when la suppression est confirmée, then les résultats ultérieurs dépendants et le total ne sont plus actuels; given un bloc vide ajouté ou supprimé, then les résultats existants restent actuels.
- Given un résultat périmé, when la personne consulte l’échange ou le bilan, then elle comprend quel recalcul est requis sans que la couleur soit le seul signal.
- Given tous les impacts renseignés à jour, when « Recalculer le total » est déclenché, then les trois valeurs brutes sont agrégées depuis ces impacts, sans nouvelle tokenisation ni calcul d’impact.
- Given un impact absent, jamais calculé, bloqué ou périmé, when le recalcul est demandé, then tous les échanges concernés sont signalés et aucun total n’est produit.
- Given la détermination de fraîcheur, when l’état est rendu ou changé, then elle découle de `impactFingerprint` et `showerFingerprint` et non de l’ordre de rendu React.

## Implementation Notes

- Les impacts restent en mémoire avec une empreinte par bloc; les sélecteurs dérivent leur fraîcheur depuis les textes, l’historique, l’artifact, le catalogue et les paramètres résolus.
- `summaryRecalculationRequested` vérifie atomiquement tous les blocs renseignés avant que l’application n’agrège seulement les impacts courants, sans Worker ni calcul individuel.
- `showerFingerprint` établit dès maintenant la frontière canonique du futur comparatif douche de l’epic 4, sans exposer ce parcours prématurément.

## Spec Change Log

## Review Triage Log

- blind-hunter — **medium, patch** — un recalcul sans échange publiait `invalid-results`; le reducer publie désormais explicitement `no-exchanges`.
- blind-hunter — **medium, patch** — une mutation pendant un bilan en attente pouvait conserver `pending` et désactiver les actions; les états transitoires sont maintenant retirés sur mutation.
- blind-hunter — **medium, patch** — un bilan indisponible ancien pouvait lister des blocages déjà corrigés; l’UI ne rend désormais un bilan indisponible que si son empreinte est fraîche.
- blind-hunter — **medium, patch** — une erreur d’impact ancienne restait visible après modification; elle est désormais soumise à la vérification d’empreinte.
- blind-hunter — **false** — `preserveSummary` est un argument interne de `calculate`, employé seulement par la boucle séquentielle `calculateAll`; aucun appelant externe ne peut conserver un bilan incohérent.
- blind-hunter — **false** — le bouton reste activable pour communiquer le message explicite requis; après correctif, une conversation vide reçoit le même message `no-exchanges` que l’action globale.
- blind-hunter — **false** — les impacts sont déterministes à partir des entrées canoniques; `showerFingerprint` inclut l’empreinte du bilan et ses deux paramètres futurs, sans résultat indépendant à y ajouter avant l’epic 4.
- edge-case-hunter — **medium, patch** — un impact en attente devenu obsolète restait désactivant car sa réponse était rejetée; les impacts non résolus sont supprimés lors d’une mutation.
- edge-case-hunter — **medium, patch** — même cause pour le bilan global en attente; les mutations effacent désormais son état `pending`.
- verification-gap — **medium, patch** — le flux réel de recalcul n’était couvert que par un callback simulé; un test App calcule un échange, recalcule le total et vérifie le bilan affiché.
- verification-gap — **medium, patch** — le retrait d’un échange renseigné n’était pas vérifié; un test confirme que les survivants dépendants deviennent bloquants.
- verification-gap — **medium, patch** — une sélection de modèle après résultat résolu n’était pas testée; un test confirme la péremption et le blocage.

## Design Notes

La fraîcheur doit être dérivée au moment de lecture : chaque impact publié reste associé à l’instantané canonique de ses entrées, de l’historique et de l’artifact. Les sélecteurs comparent cette empreinte à l’empreinte reconstruite de chaque bloc courant, ce qui préserve les résultats indépendants tout en invalidant naturellement la chaîne aval.

## Verification

**Commands:**

- `npm test -- --run` -- expected: Vitest couvre reducer, dépendances et parcours UI sans régression.
- `npm run lint` -- expected: TypeScript et ESLint ne signalent aucune erreur.
- `npm run build` -- expected: le build Vite statique réussit et ne requiert aucun accès réseau.
