---
title: 'Story 4.2 — Personnaliser et restaurer les paramètres de calcul'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'dceb7422a293e851e37c9d331cf973a6b8b8a6f0'
context:
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
  - '_bmad-output/specs/spec-ai-env-impact-calculator/calculation-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les hypothèses actuellement figées ne permettent pas d’explorer l’effet d’un modèle, de l’infrastructure ou d’une référence de douche, et une modification ne doit ni altérer les catalogues publiés ni effacer la conversation.

**Approach:** Fournir des surcharges avancées, locales à la session et validées, puis résoudre une vue de calcul pure à partir des références et de ces surcharges. Les empreintes existantes détermineront la péremption sélective sans déclencher de calcul.

## Boundaries & Constraints

**Always:** Afficher les paramètres modèle, ratios de tokens, constantes énergie/latence/matériel/batch, PUE/WUE/carbone, coefficient mots-tokens et référence douche avec leurs unités. Les `systemPromptCacheTokens` restent exclusivement lus du catalogue, invisibles et impossibles à surcharger. Les catalogues importés demeurent immuables et les surcharges ne vivent que dans le reducer de session. Une surcharge d’impact doit intégrer l’empreinte d’impact et du bilan; une surcharge douche ne doit intégrer que l’empreinte douche. Les températures, débit et énergie/litre de douche restent cohérents via la formule prescrite, avec masse d’eau déduite du volume.

**Never:** Ne pas persister dans Storage, URL ou catalogue; ne pas lancer un calcul à la saisie, à l’application ou à la restauration; ne pas modifier les textes, blocs, chatbot ou modèle lors du rétablissement; ne pas rendre editable le prompt système ni introduire l’équivalence douche UI de la story 4.3.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Surcharge d’impact valide | Résultats de blocs et bilan existants; valeur finie dans son domaine | Vue résolue appliquée à tous les futurs calculs; résultats conservés mais périmés | Aucun calcul automatique |
| Surcharge douche valide | Débit/températures ou énergie/litre modifiés | Énergie/litre dérivée; seuls les futurs résultats douche sont périmés | Ne pas périmer énergie, eau ou carbone |
| Valeur invalide | NaN, infini, hors domaine, diviseur ≤ 0, PUE < 1 ou actifs > totaux | Champ signalé, application refusée et calcul dépendant bloqué | État valide précédent conservé |
| Restauration | Une ou plusieurs surcharges actives | Références du chatbot/modèle courants rétablies; conversation intacte | Ne périmer que les résultats dont la valeur a changé |

</frozen-after-approval>

## Code Map

- `src/data/modelCatalog.ts` -- Étendre `ResolvedImpactParameters`/`resolveImpactParameters` par une vue de session valide, sans mutation des CSV; conserver `systemPromptCacheTokens` catalogue.
- `src/domain/impact.ts` et `src/domain/tokenization.ts` -- Rendre les constantes de formule et le coefficient de fallback injectables dans les entrées pures, avec validation de domaine et résultats non arrondis.
- `src/application/conversationReducer.ts` -- Propriétaire des surcharges, actions d’application/restauration et empreintes `impactFingerprint`, `summaryFingerprint`, `showerFingerprint`; réutiliser `discardTransientCalculations` pour préserver les résultats traçables.
- `src/ui/App.tsx` -- Résoudre la vue de session et la transmettre à chaque calcul unitaire, groupé et de bilan.
- `src/ui/ConversationConfiguration.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` -- Champs accessibles dans les paramètres avancés, unités, erreur reliée au champ et bouton de restauration français.
- `src/domain/impact.test.ts`, `src/domain/tokenization.test.ts`, `src/domain/modelSelection.test.ts`, `src/application/conversationReducer.test.ts`, `src/ui/ConversationConfiguration.test.tsx`, `src/ui/ConversationBlocks.test.tsx` -- Couvrir validation, immutabilité, péremption sélective, reset et rendu accessible.

## Tasks & Acceptance

**Execution:**

- [x] `src/data/modelCatalog.ts`, `src/domain/impact.ts`, `src/domain/tokenization.ts` et tests domaine -- Définir les références/surcharges typées, la résolution pure et toutes les contraintes numériques de la formule.
- [x] `src/application/conversationReducer.ts` et tests -- Stocker uniquement les surcharges valides en session, rétablir les références courantes, et faire dériver les empreintes d’impact et douche de leurs dépendances exactes.
- [x] `src/ui/App.tsx`, `src/ui/ConversationConfiguration.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` et tests UI -- Exposer les réglages nommés et unitaires, leur validation et la restauration, puis utiliser la vue résolue dans tous les chemins de calcul.

**Acceptance Criteria:**

- Given les paramètres avancés ouverts, when je les consulte, then tous les réglages demandés sauf le prompt système sont éditables avec nom et unité.
- Given une valeur d’impact valide appliquée, when je consulte les résultats existants, then ils sont périmés sans recalcul et les futurs blocs comme le total utilisent la même vue de session.
- Given une modification de douche seule, when elle est appliquée, then les empreintes d’impact et résultats énergie/eau/carbone restent actuels tandis que la frontière douche change.
- Given des surcharges actives, when je rétablis les défauts, then les références du chatbot/modèle courants sont restaurées sans toucher à la conversation et seules les dépendances modifiées deviennent périmées.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- false — Le rétablissement remonte bien les valeurs de référence : le composant local `Parameter` est recréé à chaque rendu et remonte ses champs, ce que couvre le test de restauration PUE.
- medium, patch — Une chaîne vide est convertie en zéro par `Number`, ce qui peut accepter silencieusement une saisie absente pour les domaines où zéro est admis; la conversion doit distinguer vide et zéro.
- medium, patch — Le reducer accepte encore des requêtes de calcul forgées après une validation échouée; la garde doit exister au propriétaire de l’état, pas seulement dans les boutons.
- false — Rendre les résultats précédents non actuels pendant une erreur de validation est le blocage explicite demandé; les dernières surcharges valides restent inchangées.
- medium, patch — La sélection d’un chatbot, abonnement ou modèle laisse un drapeau de validation invalide actif, ce qui bloque un nouveau contexte; ces mutations doivent le réinitialiser.
- medium, patch — `calculateImpact`, API de domaine publique, accepte des constantes non positives que la vue résolue refuse; ses validations doivent refléter le contrat numérique.
- medium, patch — La vue résolue gèle seulement son enveloppe et laisse `constants`/`shower` modifiables; geler aussi ces objets préserve l’immutabilité promise.
- false — Les tokenisations conservées ne sont pas consommées par les calculs d’impact, qui demandent les comptes dans `App.calculate`; leur empreinte ne dépend donc pas du coefficient mots/token.
- medium, patch — Aucun test applicatif ne prouve qu’une constante avancée modifie un impact calculé; ajouter ce flux protège la transmission à `calculateImpact`.
- medium, patch — Aucun test ne couvre le fallback Worker avec un coefficient mots/token non défaut; ajouter cette assertion protège le chemin de repli.
- medium, patch — L’alerte est testée mais pas l’association du champ invalide; vérifier `aria-invalid` et `aria-describedby` garantit l’accessibilité attendue.
- false — Une validation échouée élimine les calculs transitoires via `discardTransientCalculations`; les actions de résolution ultérieures exigent un état `pending` et sont ignorées.
- carried medium, patch — La validation directe des constantes incomplète est le même défaut que la ligne de validation de domaine ci-dessus; appliquer une seule correction et conserver sa couverture.

## Design Notes

La validation doit appartenir au domaine/réducer; l’UI ne convertit que la saisie textuelle en intention d’action. La persistance des résultats existants, combinée aux empreintes canoniques, signale la péremption sans mutation destructive ni recalcul implicite.

## Verification

**Commands:**

- `npm test -- --run` -- expected: tous les tests domaine, reducer et UI passent.
- `npm run lint` -- expected: TypeScript/ESLint sans erreur.
- `npm run build` -- expected: build Vite statique réussit.
