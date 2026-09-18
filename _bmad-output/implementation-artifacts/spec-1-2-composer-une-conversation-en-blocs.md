---
title: 'Story 1.2 — Composer une conversation en blocs'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '4d110d7e025cbac34451aad84db89e34148550a0'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La configuration de la story 1.1 affiche encore un emplacement vide : la visiteuse ne peut pas saisir les échanges dont elle souhaite ensuite estimer l’impact.

**Approach:** Remplacer cet emplacement par une liste de blocs de conversation, gérée uniquement par le reducer de session. Chaque bloc pourra être ajouté, renseigné, modifié ou supprimé, et signalera clairement lorsqu’il est vide et sera ignoré par les futurs calculs.

## Boundaries & Constraints

**Always:** Conserver les blocs ordonnés avec un `blockId` stable et quatre textes distincts : message, réponse finale, raisonnement visible et artifact optionnel. Garder les données exclusivement en mémoire React, sans URL, journal, analytics ni stockage navigateur. Dériver le statut ignoré en vérifiant avec `trim()` que les quatre champs sont vides, sans altérer le texte saisi. Utiliser des `textarea`, des libellés français associés, des boutons explicites et le focus visible existant ; le parcours doit rester utilisable au clavier et en écran étroit. Toute édition ou suppression ne doit lancer aucun calcul.

**Never:** Ajouter un calcul, un total, une tokenisation, un historique, une persistance, une réorganisation de blocs ou des paramètres avancés. Ne pas exposer ou ajouter un prompt système ; aucun résultat n’existe encore à invalider dans l’état de cette story.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ajout d’échange | Conversation sans bloc, puis action d’ajout | Un bloc avec identifiant stable et quatre champs textuels libellés est rendu | N/A |
| Édition | Texte saisi dans un champ d’un bloc | La valeur reste affichée pendant le montage courant ; aucun calcul n’est invoqué | Une action visant un identifiant ou champ inconnu laisse l’état inchangé |
| Bloc ignoré | Les quatre champs sont vides ou ne contiennent que des espaces | Le bloc affiche son statut ignoré ; son contenu est conservé tel quel | N/A |
| Suppression | Plusieurs blocs, dont un renseigné | Le bloc ciblé et ses données disparaissent, l’ordre des autres est préservé | La suppression d’un identifiant inconnu laisse l’état inchangé |
| Nouvelle session | Démontage puis remontage de l’application | Aucun bloc ni texte antérieur n’est restauré | N/A |

</frozen-after-approval>

## Code Map

- `src/application/conversationReducer.ts` -- reducer pur propriétaire de l’état de session ; étendre `ConversationState` et l’union d’actions pour créer, modifier et retirer les blocs sans rompre les règles fournisseur/modèle.
- `src/application/conversationReducer.test.ts` -- compléter les garanties d’immuabilité, d’ordre, d’identifiants et de blocs ignorés ; préserver les cas de sélection de modèle existants.
- `src/ui/App.tsx` -- remplace l’emplacement statique de conversation par le composant de composition, relié au même `state` et `dispatch`.
- `src/ui/ConversationConfiguration.tsx` -- consommateur du contrat reducer existant ; ne pas modifier son parcours de configuration hors ajustements de typage nécessaires.
- `src/ui/ConversationBlocks.tsx` -- nouveau composant de rendu et d’interaction des blocs, avec IDs HTML uniques et actions accessibles.
- `src/ui/ConversationBlocks.test.tsx` -- tests RTL des opérations d’ajout, saisie, suppression, statut ignoré et accessibilité des libellés.
- `src/i18n/fr.ts` -- source unique des nouveaux textes français visibles, sans chaîne métier dans les composants.
- `src/ui/styles.css` -- styles des champs multiligne et actions, responsive et compatibles avec le focus visible global.

## Tasks & Acceptance

**Execution:**

- [x] `src/application/conversationReducer.ts`, `src/application/conversationReducer.test.ts` -- ajouter le modèle de bloc, le prédicat pur de bloc ignoré et les actions immuables d’ajout, mise à jour et suppression -- préparer l’état ordonné réutilisable par les epics de calcul.
- [x] `src/i18n/fr.ts`, `src/ui/ConversationBlocks.tsx`, `src/ui/ConversationBlocks.test.tsx` -- introduire l’interface française accessible de composition et ses tests d’interaction -- permettre la saisie sans survol ni persistance.
- [x] `src/ui/App.tsx`, `src/ui/styles.css` -- intégrer la composition dans le parcours principal et adapter les styles mobile -- remplacer le placeholder tout en conservant configuration et conversation visibles.

**Acceptance Criteria:**

- Given une conversation ouverte, when la visiteuse ajoute un bloc, then les champs Message, Réponse finale, Raisonnement visible et Artifact optionnel sont tous distinctement libellés et accessibles.
- Given un bloc renseigné, when elle modifie un champ ou le supprime, then le changement est immédiatement reflété uniquement dans la session courante, sans calcul automatique, et un bloc supprimé ne reste plus dans l’état.
- Given un bloc dont les quatre champs sont blancs après `trim()`, when il est rendu, then il est explicitement identifié comme ignoré pour les calculs futurs sans modifier les espaces saisis.
- Given un écran étroit ou une navigation clavier, when la visiteuse ajoute, renseigne ou supprime un bloc, then toutes les actions sont disponibles avec un libellé associé et un focus visible.
- Given un nouveau montage de l’application, when la visiteuse revient au calculateur, then aucun bloc ni texte de la session précédente n’est restauré et aucune écriture Storage ou History n’a été faite.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- low — le compteur peut théoriquement dépasser l’entier sûr JavaScript et réutiliser un identifiant, mais cela exige plus de 9 quadrillions d’ajouts dans une session ; rejeté car hors usage quotidien et une garde ajouterait un état d’échec sans valeur pratique.
- false — un remontage de `ConversationBlocks` ne peut pas conserver l’état de son reducer dans l’application actuelle : le reducer est détenu par `App`, qui est démonté avec son unique enfant ; un nouvel `App` repart vierge.
- medium — après suppression du bouton actuellement focalisé, le navigateur ne garantit aucun focus utile ; corriger directement le retour de focus vers une action encore présente.
- medium — les libellés identiques de plusieurs échanges ne portent pas le contexte de leur échange lors de la navigation de formulaires par lecteur d’écran ; grouper chaque bloc avec une légende programmatique.
- false — les `blockId` interpolés dans les IDs DOM sont produits uniquement par l’UI sous la forme sûre `block-<entier>` ; le reducer n’est pas exposé à une entrée utilisateur qui atteindrait ce rendu.
- low — le test de non-persistance ne surveille pas `removeItem` ni `clear`, qui sont aussi des mutations Storage ; étendre les espions est une correction de couverture directe.
- low — le test de non-persistance des blocs ne surveille pas `replaceState` ; étendre l’assertion History est une correction de couverture directe.
- medium — l’UI n’exerce pas deux blocs ajoutés successivement, donc la génération d’ID et les callbacks mappés peuvent diverger du reducer testé isolément ; ajouter une interaction multi-blocs qui édite et supprime le bloc ciblé.
- medium — carried: la lacune de vérification indépendante confirme que deux actions d’ajout UI, l’édition isolée et la suppression ciblée ne sont pas couvertes ; même cause et même correctif que la ligne précédente.
## Design Notes

Le booléen « ignoré » reste dérivé plutôt que mémorisé : il ne peut donc pas devenir incohérent après une édition. Le reducer reçoit un `blockId` généré par la couche UI au moment de l’ajout, ce qui conserve le domaine déterministe et évite d’utiliser l’index de la liste comme identité.

## Verification

**Commands:**

- `npm test -- --run` -- expected: les tests reducer et interface couvrent les blocs comme la sélection existante.
- `npm run lint` -- expected: TypeScript valide les contrats d’état, d’actions et de composants.
- `npm run build` -- expected: Vite produit toujours le build statique avec la base `/calculator/`.
