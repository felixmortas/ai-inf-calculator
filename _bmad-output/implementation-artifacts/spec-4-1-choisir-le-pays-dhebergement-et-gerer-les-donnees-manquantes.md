---
title: 'Story 4.1 — Choisir le pays d’hébergement et gérer les données manquantes'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'f3684cc428d96785b33ea55e077cbd036c63bbc8'
context:
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le calcul utilise aujourd’hui implicitement le pays du fournisseur et ne peut ni le rendre visible ni le modifier. Les facteurs absents sont indifférenciés, ce qui empêche de signaler un repli fiable ou un résultat bloqué.

**Approach:** Ajouter un pays d’hébergement de session dans les paramètres avancés, puis résoudre de façon pure, traçable et non mutante les facteurs environnementaux pour ce pays, avec repli « Monde » du même facteur et blocage explicite si les données sont insuffisantes.

## Boundaries & Constraints

**Always:** Conserver la session en mémoire, les catalogues bruts immuables et le domaine synchrone. Le pays par défaut provient du fournisseur/modèle sélectionné; un changement invalide les impacts et total dépendants seulement par leurs empreintes, sans relancer de calcul. Les nombres finis à zéro restent valides. Le pays d’hébergement reste indépendant du futur pays utilisateur/douche.

**Never:** Ne pas modifier les formules, la tokenisation, l’historique, les fichiers CSV de référence ni la logique de douche (stories 4.2–4.3). Ne pas inventer de facteur, masquer un manque ni convertir automatiquement une donnée absente en zéro.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Pays par défaut ou choisi | Fournisseur/modèle valide; puis pays ISO/catalogué valide choisi | Le pays est visible dans « Paramètres avancés » et alimente PUE, WUE, carbone et risque de tous les calculs | Un pays non admis laisse l’état intact |
| Donnée pays absente | Facteur environnemental demandé absent pour le pays, valeur « Monde » finie présente | Utiliser uniquement le facteur « Monde » homologue et exposer le statut de repli au résultat concerné | Aucune mutation du catalogue ni du pays choisi |
| Zéro ou absence complète | Facteur pays égal à `0`; ou absence de facteur pays et Monde/donnée modèle indispensable | `0` est résolu; dans le second cas, résultat dépendant indisponible | Afficher un message français explicite, sans valeur calculée |
| Changement de pays | Bloc(s) et/ou total déjà calculés; sélection différente | Les anciens résultats deviennent périmés et non actuels sans calcul automatique | Les résultats persistants restent traçables jusqu’au recalcul |

</frozen-after-approval>

## Code Map

- `src/data/modelCatalog.ts` -- Catalogue et résolveurs actuels; introduire une résolution normalisée, injectée/testable, retournant valeur et provenance pays/Monde/indisponible, puis adapter paramètres et risque.
- `src/application/conversationReducer.ts` -- État de session, actions et empreintes; stocker le pays d’hébergement valide, le réinitialiser avec le fournisseur/modèle et l’inclure dans les empreintes d’impact/total, sans l’ajouter à l’empreinte douche.
- `src/ui/ConversationConfiguration.tsx` -- Emplacement du panneau de configuration; rendre le contrôle de pays dans un `details` de paramètres avancés accessible au clavier.
- `src/ui/App.tsx` -- Passe le pays de session aux résolveurs lors des calculs unitaires, groupés et de total; conserve le blocage lorsque les paramètres sont indisponibles.
- `src/ui/ConversationBlocks.tsx` et `src/i18n/fr.ts` -- Rendre le repli « Monde » et l’indisponibilité explicites via les messages français typés, sans signaler par la couleur seule.
- `src/domain/modelSelection.test.ts`, `src/application/conversationReducer.test.ts`, `src/ui/ConversationConfiguration.test.tsx`, `src/ui/ConversationBlocks.test.tsx` -- Modèles de tests catalogue, péremption dérivée, contrôle accessible et rendu des états.

## Tasks & Acceptance

**Execution:**

- [x] `src/data/modelCatalog.ts` et tests catalogue -- Définir le contrat de résolution de pays/facteur normalisé et sa provenance; gérer pays, Monde, zéro et indisponibilité sans muter les données.
- [x] `src/application/conversationReducer.ts` et tests -- Ajouter la sélection de pays validée et le défaut fournisseur; intégrer ce paramètre aux empreintes d’impact/total, tout en maintenant la frontière de l’empreinte douche.
- [x] `src/ui/ConversationConfiguration.tsx`, `src/ui/App.tsx`, `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts` et tests UI -- Exposer les paramètres avancés, appliquer le pays aux trois parcours de calcul et restituer les repli/blocages accessibles.

**Acceptance Criteria:**

- Given un chatbot et modèle sélectionnés, when les paramètres avancés sont ouverts, then leur pays d’hébergement de référence est affiché et devient la référence active.
- Given un pays d’hébergement valide différent, when il est appliqué, then tous les calculs d’impact et le risque de sécheresse l’utilisent, et tous les résultats dépendants deviennent périmés sans calcul automatique.
- Given un repli Monde ou une indisponibilité de donnée indispensable, when le résultat est rendu, then son origine ou son blocage est annoncé clairement en français et de manière accessible.

## Implementation Notes

- Les pays de session utilisent les codes ISO `BR`, `CH`, `FR`, `IN` et `US`; le résolveur normalise les libellés historiques des catalogues sans les modifier.
- Les sources des facteurs et du risque de sécheresse sont conservées avec les résultats afin d’afficher le repli « Monde ». Les absences bloquent le calcul existant via l’erreur de donnée indispensable.
- Vérifié avec `npm test -- --run` (76 tests), `npm run lint` et `npm run build`.

## Spec Change Log

## Review Triage Log

- false — Le repli « Monde » ne peut pas être exercé avec les CSV livrés, mais l’absence simultanée de la valeur pays et Monde bloque explicitement le calcul, comportement imposé par l’intention; aucun catalogue ne doit être inventé.
- false — Le message de repli est attaché au résultat concerné et satisfait le contrat; l’intention ne demande pas de détailler quel paramètre a utilisé Monde.
- false — Le risque de sécheresse est une donnée environnementale résolue et la mention générique reste exacte; aucun résultat ne confond le risque et les impacts calculés.
- false — Les deux causes d’indisponibilité aboutissent volontairement au même blocage explicite; l’intention n’exige pas de diagnostiquer l’origine catalogue de l’absence.
- false — Lors de « Tout calculer », le bloc touché reçoit `impactBlocked` et affiche l’alerte de donnée indispensable; le bilan indisponible ne masque donc pas la cause à la personne.
- false — `resolveEnvironmentalFactor` reçoit des lignes déjà filtrées par `factorRows` selon les domaines PUE/WUE/carbone; aucun appel applicatif ne peut injecter une valeur négative ou un PUE inférieur à 1.
- false — Les cinq options ont chacune une normalisation ISO explicite et les catalogues livrés contiennent leurs données nécessaires; aucune mise à jour catalogue défaillante n’est présente dans ce diff.
- medium, patch — La sélection du pays n’était pas vérifiée sur un calcul applicatif. Ajout du test UI qui compare l’impact France/États-Unis et vérifie le risque français après recalcul du total; il passe dans la suite complète.
- medium, patch — La même lacune de vérification concernait les appels de calcul exposés par l’application. Le test ajouté exécute le calcul unitaire puis « Recalculer le total » après sélection de `FR`, ce qui protège les appels qui transmettent `hostingCountry`.

## Design Notes

Les CSV actuels emploient des libellés de pays alors que l’architecture cible ISO alpha-2. La normalisation appartient au résolveur de domaine; les catalogues existants restent inchangés. Le contrat doit distinguer l’absence de donnée, le repli Monde et une valeur nulle afin que l’UI ne déduise jamais la provenance elle-même.

## Verification

**Commands:**

- `npm test -- --run` -- expected: tous les tests de domaine, reducer et UI passent.
- `npm run lint` -- expected: TypeScript/ESLint sans erreur.
- `npm run build` -- expected: build Vite statique réussit.
