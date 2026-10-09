---
title: 'Supprimer le filtre provisoire des pays d’hébergement'
type: 'bugfix'
created: '2026-10-09'
status: 'done'
baseline_commit: 'a4797c3a71d83ddd1a71c7d51272103c0418c5e9'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `countryOptions` (`src/data/modelCatalog.ts`) est une liste provisoire de 5 pays qui sert à la fois de liste du sélecteur d’hébergement et de garde de `isHostingCountry`. Un fournisseur hébergé hors de cette liste (ex. DeepSeek en Chine avant l’ajout de `CN`) fait renvoyer `undefined` à `resolveImpactParameters`, ce qui masque tout le formulaire avancé/expert. Le catalogue carbone couvrant désormais tous les pays, le filtre n’a plus lieu d’être.

**Approach:** Tout pays du catalogue (`countryNames`) est un pays d’hébergement valide ; le sélecteur les liste triés par libellé localisé. Le `!` non vérifié sur `resolveHostingCountry` ne doit plus pouvoir masquer silencieusement le formulaire.

## Boundaries & Constraints

**Always:** `isHostingCountry` accepte les codes ISO du catalogue carbone (`countryNames`). Les facteurs PUE/WUE/carbone gardent le repli `WORLD` existant (`resolveEnvironmentalFactor`) et sa note d’interface.

**Never:** Ne pas modifier les CSV de données, les formules d’impact ni `userCountryOptions`. Ne pas dupliquer la liste des pays.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fournisseur hors ancienne liste | provider DeepSeek, hébergement `CN` | `resolveImpactParameters` défini, formulaire douche + expert affiché | N/A |
| Pays catalogue quelconque | action `hostingCountrySelected` `DE` | état mis à jour, résultats marqués périmés | N/A |
| Pays inconnu | `hostingCountrySelected` `ZZ` | état inchangé | refus silencieux existant |
| Sélecteur | locale `fr-FR` | tous les pays du catalogue, triés par libellé | N/A |

</frozen-after-approval>

## Code Map

- `src/data/modelCatalog.ts:117` -- `countryOptions` (filtre à supprimer) ; `:154` `hostingCountryOptions` ; `:173` `isHostingCountry` ; `:120` `countryNames` (source de vérité) ; `:158` `userCountryOptions` (tri à réutiliser).
- `src/application/conversationReducer.ts:138,308,329` -- `resolveHostingCountry(...)!` et garde `isHostingCountry`.
- `src/ui/ConversationConfiguration.tsx:~183` -- sélecteur d’hébergement ; `{resolved ? <form> : null}` masque le formulaire.
- `src/data/countryLabels.test.ts`, `src/domain/modelSelection.test.ts`, `src/ui/ConversationConfiguration.test.tsx` -- tests à étendre.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/modelCatalog.ts` -- supprimer `countryOptions` ; `isHostingCountry` = code de `countryNames` ; `hostingCountryOptions` = codes de `countryNames`, triés par libellé localisé (factoriser avec `userCountryOptions`) -- source unique
- [x] `src/application/conversationReducer.ts` -- remplacer les `!` par une résolution explicite (repli sûr ou garde) quand le pays du fournisseur est absent -- éviter un masquage silencieux
- [x] `src/data/countryLabels.test.ts`, `src/domain/modelSelection.test.ts`, `src/application/conversationReducer.test.ts` -- couvrir la matrice (DE accepté, ZZ refusés, liste complète triée, DeepSeek résolu)
- [x] `src/ui/ConversationConfiguration.test.tsx` -- DeepSeek sélectionné : champs douche et section expert présents

**Acceptance Criteria:**
- Given DeepSeek sélectionné, when on ouvre les paramètres avancés, then les champs de la douche et le mode expert sont visibles.
- Given le sélecteur d’hébergement, when on le déplie, then il propose tous les pays du catalogue carbone.
- Given `npm test` et `npm run build`, when exécutés, then ils réussissent.

## Verification

**Commands:**
- `npm test -- --run` -- expected: tous les tests passent
- `npm run build` -- expected: compilation TypeScript et build réussis

## Suggested Review Order

**Source unique des pays d’hébergement**

- `countryOptions` supprimé ; `isHostingCountry` s’appuie sur `countryNames` (hors `WORLD`).
  [`modelCatalog.ts:173`](../../src/data/modelCatalog.ts#L173)

- Tri localisé factorisé entre sélecteurs d’hébergement et de pays utilisateur.
  [`modelCatalog.ts:151`](../../src/data/modelCatalog.ts#L151)

**Plus de masquage silencieux**

- Le `!` initial devient une erreur explicite au chargement.
  [`conversationReducer.ts:131`](../../src/application/conversationReducer.ts#L131)

- Un fournisseur sans pays d’hébergement laisse l’état inchangé.
  [`conversationReducer.ts:302`](../../src/application/conversationReducer.ts#L302)

**Tests**

- Liste complète triée, DE accepté, ZZ et WORLD refusés.
  [`countryLabels.test.ts:14`](../../src/data/countryLabels.test.ts#L14)

- DeepSeek affiche douche et mode expert.
  [`ConversationConfiguration.test.tsx:34`](../../src/ui/ConversationConfiguration.test.tsx#L34)
