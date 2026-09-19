---
title: 'Story 4.4 — Découvrir des bonnes pratiques de sobriété'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e7efd9ae9cbcdf0d78a5c2156e9135534802eff6'
context:
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Après avoir calculé un impact, la visiteuse ne dispose pas encore de repères pratiques pour limiter l’impact de ses prochains usages. Les conseils ne doivent pas dépendre de sa conversation ni s’immiscer dans les calculs.

**Approach:** Afficher, après les résultats actuellement consultables, une section pédagogique française, statique et structurée. Ses contenus seront centralisés dans le catalogue de messages afin de pouvoir être traduits ou enrichis ultérieurement.

## Boundaries & Constraints

**Always:** Rendre les conseils seulement lorsqu’au moins un impact individuel ou bilan est courant et affichable ; employer une section titrée et une liste HTML lisible au clavier et sur mobile, sans interaction ni survol. Couvrir : privilégier un petit modèle adapté, éviter de demander du raisonnement détaillé lorsque ce n’est pas nécessaire, réduire les textes envoyés et générés, recommencer une conversation quand son contexte n’est plus utile, et modifier un message existant plutôt que d’en envoyer un nouveau lorsque cela convient. Expliquer ces notions en français non technique, sans assimiler l’absence de raisonnement collé à une désactivation du raisonnement du chatbot et sans annoncer de gain chiffré ou garanti.

**Never:** Ne pas personnaliser les conseils à partir des blocs, tokens, paramètres ou résultats ; ne pas ajouter de calcul, persistance, action reducer, appel réseau ni modifier les empreintes, la fraîcheur des résultats, les catalogues ou règles métier. Un résultat périmé reste signalé par son état textuel existant et sa valeur ne redevient pas visible.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Résultat courant | Un impact individuel ou le bilan est actuel | Une section de conseils suit la zone de résultats et contient les cinq thèmes requis | Aucun état applicatif ajouté |
| Aucun résultat affichable | Nouvelle conversation, résultat bloqué ou seulement périmé | Les conseils ne sont pas rendus | Les messages de péremption existants restent visibles, sans valeur obsolète |
| Lecture assistée ou mobile | Navigation sans pointeur ou écran étroit | Titre associé à la section et liste sémantique, sans dépendance au survol | Le focus visible et le responsive existants restent applicables |

</frozen-after-approval>

## Code Map

- `src/i18n/fr.ts` -- catalogue typé unique des messages utilisateur ; y ajouter le titre et la collection immuable des cinq conseils, sans texte pédagogique dans les composants.
- `src/ui/ConversationBlocks.tsx` -- possède les résultats individuels et bilan, ainsi que `isImpactCurrent` et `isSummaryCurrent` ; dériver l’existence d’un résultat courant et insérer la section après tous les rendus de résultat, sans toucher à la logique de fraîcheur.
- `src/ui/styles.css` -- contient les cartes, le focus visible et la règle mobile à 30 rem ; ajouter le style sobre de la section/listing si nécessaire, sans comportement survol.
- `src/ui/ConversationBlocks.test.tsx` -- tests intégrés de calcul, rendu des impacts et péremption ; couvrir le contenu complet, la structure sémantique, l’ordre après les résultats et l’absence lorsque tout résultat est périmé ou absent.
- `src/application/conversationReducer.ts`, `src/domain/*`, `src/ui/App.tsx` -- ne pas modifier : cette story est une présentation statique indépendante de l’état métier et des calculs.

## Tasks & Acceptance

**Execution:**

- [x] `src/i18n/fr.ts` -- ajouter les messages français statiques de la rubrique et ses cinq conseils accessibles -- séparer le contenu traduisible des règles métier.
- [x] `src/ui/ConversationBlocks.tsx`, `src/ui/styles.css` -- rendre après les résultats courants une section sémantique de conseils, lisible sans survol sur petit écran -- préserver les états et valeurs périmés existants.
- [x] `src/ui/ConversationBlocks.test.tsx`, `src/ui/styles.test.ts` si un sélecteur est ajouté -- vérifier le rendu conditionnel, les cinq formulations et la structure accessible -- empêcher une régression de péremption ou de responsive.

**Acceptance Criteria:**

- Given des résultats de calcul actuels consultables, when je parcours leur zone, then une liste de bonnes pratiques suit les résultats et reste utilisable au clavier comme sur mobile.
- Given la liste est affichée, when je la lis, then elle aborde un petit modèle, la demande de raisonnement, les textes entrants et sortants, une nouvelle conversation et l’édition pertinente d’un message avec un vocabulaire compréhensible.
- Given ces conseils, when deux conversations différentes ont des résultats, then leur contenu est identique, issu du catalogue français et indépendant des données de conversation.
- Given un résultat périmé, when il est rendu, then son état est signalé textuellement, sa valeur n’est pas présentée comme actuelle et il ne suffit pas à faire apparaître les conseils.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- false — `fr.goodPractices` est seulement lu par `ConversationBlocks` et aucune entrée utilisateur ou mutation applicative ne peut l’altérer ; `as const` garantit l’API typée. Aucun résultat divergent à l’exécution n’est démontré.
- low, patch — Le test compare la liste à `fr.goodPractices`, donc il ne prouve pas indépendamment les cinq thèmes pédagogiques requis. Ajouter les formulations attendues rendra cette exigence visible à la régression.
- low, patch — Le test d’ordre ne couvre qu’un impact individuel. Le rendu place effectivement la section après la boucle de tous les blocs et après le bilan, mais un scénario de plusieurs résultats et bilan rendra cette propriété explicitement vérifiée.
- low, patch — La péremption de l’impact individuel est couverte, mais pas le cas distinct d’un bilan seul devenu périmé. Ajouter ce scénario vérifie que le statut textuel du bilan reste présent et que les conseils disparaissent.
- low, patch — Vérification-gap confirme que le chemin bilan périmé sans impact courant n’est pas exercé ; le reducer permet cet état et la condition de rendu doit continuer à l’exclure. Le test est ajouté avec le statut périmé attendu.

## Design Notes

La condition d’affichage s’appuie exclusivement sur les prédicats de fraîcheur déjà appliqués aux résultats : elle évite de transformer un ancien impact en prétexte pour afficher une zone qui prétendrait suivre un résultat actuel. La liste demeure dans `ConversationBlocks` afin que son ordre DOM soit après les panneaux de bilan et d’impacts, sans propager un état dérivé à `App`.

## Verification

**Commands:**

- `npm test -- --run` -- expected: tests UI, domaine et reducer verts, avec les conseils présents après un résultat courant et absents sans résultat actuel.
- `npm run lint` -- expected: TypeScript et ESLint sans erreur.
- `npm run build` -- expected: build Vite statique réussit.
