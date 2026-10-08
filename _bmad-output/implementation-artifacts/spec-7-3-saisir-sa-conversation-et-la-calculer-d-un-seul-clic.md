---
title: '7.3 Saisir sa conversation et la calculer d’un seul clic'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '2384659269189f0bfbeb3e61463d6c1b5b02836e'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’étape 2/3 propose trois calculs (par échange, tout, total), des libellés techniques (« Réponse du chatbot », « Fichiers uploadés »), des boutons à icône seule et un « Calculer » noyé sous les cartes ; la personne ne sait pas quel bouton choisir.

**Approach:** Un seul « Calculer » dans la barre collante calcule tous les échanges renseignés. Libellés grand public, cartes repliables à état textuel, suppression par dialogue modal, retrait du calcul par échange et du recalcul du total (interface, reducer, application).

## Boundaries & Constraints

**Always:** Textes via `fr.ts`. Libellé visible sur toute action (jamais d’icône seule), cibles ≥ 44 × 44 px, aucun statut par la seule couleur. Une modification (texte, source, suppression, paramètre, modèle, chatbot) ne lance jamais de calcul : les cartes dépendantes passent à « à recalculer », leurs valeurs sont retirées, une annonce concise suit. Champs vides sans avertissement. Rien n’est stocké ni envoyé.

**Ask First:** Toute modification des formules, du moteur de calcul, de la tokenisation, de l’historique ou des empreintes (`impactFingerprint`, `summaryFingerprint`).

**Never:** Implémenter 7.4 (section résultat, durée LED, nouveau panneau), 7.5, ni refondre l’étape 1. Conserver un bouton de calcul par échange ou « Recalculer le total ». Nouveau stockage ou appel réseau.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Calcul unique | 2 échanges renseignés + 1 vide, « Calculer » | Les 2 calculés, le vide ignoré, cartes et total mis à jour ensemble ; UI inerte et statut annoncé près de l’action pendant le calcul | N/A |
| Rien à calculer | Tous blocs vides | « Calculer » `aria-disabled` + explication ; aucun résultat | Clic : focus conservé |
| Paramètre invalide | Mode avancé/expert invalide | « Calculer » `aria-disabled` + explication | N/A |
| Modification | Texte d’un échange calculé modifié | Carte « à recalculer » (pictogramme + texte), valeurs retirées, annonce, aucun calcul | N/A |
| Carte repliée | Échange à jour | En-tête : n°, aperçu, « ✓ », carbone et eau ; bouton « Déplier la question / réponse N » (`aria-expanded`, `aria-controls`) sans action de calcul | N/A |
| Ajout | « Ajouter une question / réponse » | Échange précédent replié, focus sur « Collez ici votre message » de la nouvelle carte | N/A |
| Suppression | Échange non vide | Dialogue modal (fond inerte, focus restitué) ; après confirmation, focus sur la carte voisine ou « Ajouter… » | Échange vide : suppression directe |
| Erreur de calcul | Donnée invalide | Message près de l’action, textes conservés, focus non déplacé | `role="alert"` |

</frozen-after-approval>

## Code Map

- `src/ui/ConversationBlocks.tsx` -- cartes, boutons `onCalculate`/`onCalculateAll`/`onRecalculateSummary`, `requestRemove` mort (l. 119), `confirmRemoveId` inline, panneau bilan (conservé tel quel pour 7.4), `×` et `+` à icône seule.
- `src/ui/App.tsx` -- `calculate` (par bloc, devient interne), `calculateAll` (l. 172, réutilisable), `recalculateSummary` (à supprimer), `calculationStatus`/overlay (verrou existant), `.sticky-actions` (étape 1 seulement) ; `recalculationNotice` et `configurationDispatch` : étendre l’annonce aux modifications de texte.
- `src/application/conversationReducer.ts` -- retirer `summaryRecalculationRequested` et `summaryBlockingBlockIds` si sans usage ; `impactRequested`/`impactResolved` servent à `calculateAll` ; `keepChangedResultsStale` (l. 144) gère déjà « périmé ».
- `src/i18n/fr.ts` -- libellés l. 71-119 : remplacer `messageLabel`, `finalResponseLabel`, `visibleReasoningLabel`, `artifactLabel`, `sourcesLabel`, `optionalContents`, `addBlockAction`, `expandBlock`/`collapseBlock`, `removeBlockAction` ; supprimer `calculateAction`, `recalculateAction`, `recalculateSummaryAction`, `staleSummaryStatus` obsolètes.
- `src/ui/styles.css` -- `.sticky-actions` (l. 28-39, déjà statique à fort zoom/clavier), `.block-actions`, `.conversation-actions`, dialogue modal.
- `src/ui/ConversationBlocks.test.tsx` (l. 131, 189, 206, 415, 455), `AppFlow.test.tsx`, `conversationReducer.test.ts` -- à adapter.

## Tasks & Acceptance

**Execution:**
- [x] `src/i18n/fr.ts` -- libellés exigés (« Collez ici votre message », « Collez ici la réponse de l’IA », « Réflexion affichée par l’IA (optionnel) », « Contenu du fichier créé par l’IA (optionnel) », « Fichiers que vous avez joints », « Ajouter une question / réponse », « Déplier / Replier la question / réponse N », « Calculer », explications d’indisponibilité, annonces) ; corriger les coquilles ; retirer les clés mortes -- UX-DR22
- [x] `src/ui/ConversationBlocks.tsx` -- carte repliée (n°, aperçu, état « ✓ »/« à recalculer »/« à calculer » en texte, carbone et eau si à jour), commande Déplier/Replier, suppression de `onCalculate` et du bouton par échange, « × » libellé, ajout qui replie le précédent, dialogue modal de suppression (`inert` sur le fond, focus restitué), champs sans avertissement -- UX-DR23
- [x] `src/ui/App.tsx` -- barre collante de l’étape 2/3 avec « Calculer » unique (`aria-disabled` + explication si aucun échange renseigné ou paramètre invalide), statut `role="status"` près de l’action, erreur près de l’action sans déplacer le focus, suppression de `recalculateSummary`, annonce de péremption pour toute modification -- UX-DR24, UX-DR26
- [x] `src/application/conversationReducer.ts` -- retirer l’action de recalcul du total et le code devenu mort ; moteur et empreintes inchangés
- [x] `src/ui/styles.css` -- barre collante réutilisée, dialogue modal, état « à recalculer » non porté par la couleur seule
- [x] Tests -- chaque ligne de la matrice ; absence de « Calculer cet échange uniquement » et « Recalculer le total » ; annonce unique ; focus après ajout/suppression ; calcul des seuls blocs renseignés

**Acceptance Criteria:**
- Given l’étape 2/3, when elle s’affiche, then les libellés et actions visibles sont ceux de la story et « Calculer » est l’unique action de calcul, toujours visible.
- Given au moins un échange renseigné, when « Calculer » est activé, then tous les échanges renseignés, cartes et total sont mis à jour ensemble, l’interface étant verrouillée pendant le calcul.
- Given des résultats existants, when une modification intervient, then les cartes dépendantes passent à « à recalculer », sans calcul ni valeur périmée affichée.

## Spec Change Log

## Design Notes

L’état de la carte reste dérivé (`isImpactCurrent`) ; aucun nouvel état dans le reducer. Le panneau bilan existant n’est pas retouché : 7.4 le remplace par la section résultat. Le verrou existant (`inert` + overlay `summaryPending`) est conservé ; seul s’ajoute un statut près de l’action.

## Verification

**Commands:**
- `npm test -- --run` -- expected: tous les tests passent
- `npx tsc -b --noEmit` -- expected: aucune erreur
- `npm run build` -- expected: build réussi

**Manual checks (if no CLI):**
- Étape 2/3 au clavier et à 320 px : ajout, repli, suppression modale, « Calculer » visible non masqué par la barre.

## Suggested Review Order

**Un seul « Calculer »**

- Barre collante : bouton unique, `aria-disabled` + explication, statut et alerte près de l’action.
  [`CalculationBar.tsx:10`](../../src/ui/CalculationBar.tsx#L10)

- Libellés grand public et textes d’indisponibilité/annonces centralisés.
  [`fr.ts:71`](../../src/i18n/fr.ts#L71)

**Cartes, repli et suppression**

- Commande Déplier/Replier avec `aria-expanded`/`aria-controls`, état en texte.
  [`ConversationBlocks.tsx:220`](../../src/ui/ConversationBlocks.tsx#L220)

- Dialogue modal de suppression, fond inerte, piège de focus.
  [`ConversationBlocks.tsx:275`](../../src/ui/ConversationBlocks.tsx#L275)
  [`ConversationBlocks.tsx:141`](../../src/ui/ConversationBlocks.tsx#L141)

**Styles**

- État désactivé visible sans couleur seule ; dialogue modal.
  [`styles.css:32`](../../src/ui/styles.css#L32)
  [`styles.css:184`](../../src/ui/styles.css#L184)

**Tests**

- Échec de calcul de bout en bout et branche d’erreur par échange.
  [`CalculationFailure.test.tsx:14`](../../src/ui/CalculationFailure.test.tsx#L14)
