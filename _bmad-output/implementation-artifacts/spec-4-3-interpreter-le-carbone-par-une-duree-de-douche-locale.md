---
title: 'Story 4.3 — Interpréter le carbone par une durée de douche locale'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a8946563d561ce2b5555b2f10bfaa55ededb19d2'
context:
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
  - '_bmad-output/specs/spec-ai-env-impact-calculator/calculation-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les impacts affichent un carbone en grammes, sans repère concret ; les paramètres de douche déjà présents ne sont reliés à aucun résultat. Le pays d’hébergement ne peut pas servir de substitut au pays de la personne.

**Approach:** Proposer puis laisser corriger localement un pays utilisateur, calculer une durée de douche électrique à partir du seul carbone courant et de ce pays, et afficher l’estimation auprès des résultats de bloc et du bilan.

## Boundaries & Constraints

**Always:** Détecter sans réseau le pays dans l’ordre table IANA→ISO, région de `navigator.language`, puis `WORLD`; indiquer qu’il est indicatif et le distinguer explicitement du pays d’hébergement. Employer exclusivement l’intensité carbone du pays utilisateur et les paramètres de douche résolus : `secondes = 60 × carbone_g / (débit_L/min × énergie_kWh/L × facteur_g/kWh)`. Réutiliser le repli `WORLD` du même facteur et le signaler près de l’équivalence. Conserver les valeurs non arrondies et afficher la durée comme une estimation, sans comparer le volume d’eau.

**Never:** Ne pas effectuer d’appel réseau, de persistance ou de géolocalisation ; ne pas modifier les catalogues importés, impacts énergie/eau/carbone, risque de sécheresse, ni les empreintes d’impact ou de bilan lorsqu’un pays utilisateur ou un réglage douche change. Ne pas afficher une durée infinie ou numérique quand les émissions par minute sont nulles.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pays local reconnu | Fuseau IANA ou locale avec pays connu | Pays utilisateur proposé, indicatif et sélectionnable | Repli locale puis `WORLD` si absent |
| Équivalence valide | Impact ou total courant, facteur et douche positifs | Durée en secondes calculée et affichée avec le carbone | Aucun recalcul d’impact |
| Facteur national absent | Pays utilisateur sans intensité locale, référence `WORLD` disponible | Durée calculée sur `WORLD` et avis de repli local | Le pays sélectionné reste inchangé |
| Émissions/minute nulles | Facteur carbone ou énergie par minute égal à zéro | Équivalence « non calculable » | Ni division par zéro ni `Infinity` |
| Modification douche/pays | Résultat de bloc ou bilan déjà présent | Seule son équivalence est périmée et masquée jusqu’à actualisation | Énergie, eau, carbone et risque restent courants |

</frozen-after-approval>

## Code Map

- `data/clean/carbon_emissions_intensity_2025.csv`, `data/clean/carbon_emissions_intensity_2025.md` -- compléter la référence locale `World` issue d’Ember et documenter sa valeur/provenance ; la liste actuelle ne contient pas ce repli.
- `src/data/modelCatalog.ts` -- étendre la normalisation et les options pays pour le pays utilisateur ; réutiliser `resolveEnvironmentalFactor` et les lignes `carbonIntensity`, sans confondre les options d’hébergement.
- `src/domain/showerEquivalence.ts` (nouveau) et ses tests -- concentrer le calcul pur, typé et fini de durée, avec le statut `available`/`unavailable` et la provenance du facteur.
- `src/application/conversationReducer.ts` et tests -- ajouter le pays utilisateur éphémère, ses actions et états d’équivalence bloc/bilan ; faire de `showerFingerprint` la frontière exacte du carbone cible, pays, facteur et douche sans toucher à `impactFingerprint` ni `summaryFingerprint`.
- `src/ui/App.tsx` -- résoudre l’équivalence après un impact et lors de tout calcul/recalcul de bilan ; le recalcul total doit réemployer les impacts courants existants.
- `src/ui/ConversationConfiguration.tsx`, `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` -- sélectionner/corriger le pays indicatif dans les paramètres avancés et rendre une durée, un repli, un état périmé ou non calculable accessibles.
- `src/ui/ConversationConfiguration.test.tsx`, `src/ui/ConversationBlocks.test.tsx`, `src/domain/modelSelection.test.ts` -- couvrir détection/correction, rendu bloc+bilan, repli Monde, zéro et péremption sélective.

## Tasks & Acceptance

**Execution:**

- [x] `data/clean/carbon_emissions_intensity_2025.csv`, sa documentation et `src/data/modelCatalog.ts` -- rendre disponible et traçable le facteur carbone du pays utilisateur avec un repli Monde et des options ISO corrigibles.
- [x] `src/domain/showerEquivalence.ts`, `src/application/conversationReducer.ts` et leurs tests -- calculer une équivalence finie et traçable, stocker son état de session et garantir sa fraîcheur indépendante des impacts.
- [x] `src/ui/App.tsx`, composants UI, messages, styles et tests -- exposer le pays, les équivalences de bloc/bilan et leur actualisation sans déclencher de calcul individuel superflu.

**Acceptance Criteria:**

- Given une nouvelle session, when le pays utilisateur est déterminé, then la table IANA locale, puis la locale navigateur, puis Monde le proposent sans donnée externe et l’interface le décrit comme indicatif et corrigeable.
- Given un carbone de bloc ou de bilan courant, when son équivalence est rendue, then elle dépend uniquement du facteur carbone utilisateur et des paramètres douche, est étiquetée estimation de durée, et ne compare jamais l’eau.
- Given un facteur absent, when le repli Monde existe, then l’équivalence est conservée, son repli est annoncé et le pays utilisateur reste visible ; given des émissions/minute nulles, then elle est non calculable sans valeur infinie.
- Given que seul le pays utilisateur ou la douche change, when je consulte les résultats, then énergie, eau, carbone et risque restent actuels, tandis que l’équivalence est périmée ; when je déclenche « Recalculer le total », then elle est renouvelée depuis le carbone existant sans recalcul des blocs.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- false — La table IANA est volontairement une heuristique locale : pour une zone sans entrée, le repli vers la région de la locale puis Monde est précisément l’ordre prescrit ; la correction manuelle reste disponible.
- false — Les actions `impactResolved` et `showerEquivalenceResolved` sont envoyées sans interruption dans la même exécution JavaScript ; une interaction utilisateur ne peut pas s’intercaler et le reducer refuse de toute façon les empreintes périmées.
- false — Le même enchaînement synchrone protège `summaryResolved` et son équivalence ; le recalcul explicite repart ensuite de l’état courant.
- false — Les facteurs carbone négatifs sont rejetés comme données numériques invalides par le contrat existant des catalogues ; le repli Monde est donc le comportement explicite, sans propager une durée négative.
- medium, patch — La branche de compatibilité de `showerFingerprint` promettait un état sans `blocks` mais appelait `summaryFingerprint`; elle est supprimée et tous les tests emploient l’empreinte v2 réelle.
- medium, patch — La valeur Monde 2024 mélangeait les périodes sans provenance reproductible ; la documentation cite maintenant le rapport Ember, l’année et son URL stable.
- low, patch — Le chemin applicatif du repli Monde pour le bilan n’était pas couvert ; un test UI calcule désormais bloc et bilan avec le pays `ID` puis vérifie les deux avis de repli.
- false — Le test d’une zone IANA non mappée ne démontre pas un défaut : ce cas exerce le repli local documenté, non une promesse de couverture exhaustive des fuseaux.
- medium, patch — La péremption après surcharge douche n’était testée que par l’ancienne empreinte ; un test v2 vérifie maintenant que l’impact reste courant tandis que l’équivalence devient périmée.
- medium, patch — Le facteur pays local n’était pas prouvé dans la résolution ; le test de catalogue vérifie maintenant la valeur française et sa provenance `country`.

## Design Notes

La référence Monde est ajoutée au catalogue de la même famille Ember (473 gCO2/kWh, bilan mondial 2024) afin de satisfaire le contrat de repli local sans requête à l’exécution. La détection reste une heuristique : elle ne prétend pas localiser la personne et le contrôle utilisateur fait autorité.

## Verification

**Commands:**

- `npm test -- --run` -- expected: tests domaine, reducer et UI verts, dont les scénarios de pays, repli, zéro et recalcul de bilan.
- `npm run lint` -- expected: TypeScript et ESLint sans erreur.
- `npm run build` -- expected: build Vite statique réussit.
