---
title: '6.1 — Choisir son parcours et son modèle de référence'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '713e182b3e191d458544802753b5ac0adffb74a1'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La page actuelle expose configuration, import et conversation d’un seul coup. ChatGPT impose son modèle, Mistral n’a pas de choix rapide/réflexion et les liens d’autres fournisseurs restent importables.

**Approach:** Présenter deux voies dès l’accueil, import Mistral en premier et saisie manuelle en second. Proposer une référence modifiable pour le chatbot choisi, sans perdre les textes ni réutiliser des résultats devenus périmés.

## Boundaries & Constraints

**Always:** Conserver l’état de conversation en mémoire, les calculs sur action explicite, les empreintes de fraîcheur et les formules existantes. Refuser les URL non Mistral avant consentement et réseau à l’interface et à la passerelle. Vérifier que les références Mistral résolvent pays et facteurs environnementaux.

**Never:** Déduire le mode Mistral du texte, transmettre les textes locaux, ouvrir l’import publié aux autres fournisseurs, modifier les anciennes stories ou déclencher un calcul au changement d’étape ou de modèle.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Comportement attendu | Erreur |
|---|---|---|---|
| Accueil | Nouvelle session | Import Mistral puis saisie manuelle, deux actions clavier | — |
| Référence | ChatGPT gratuit/payant ; Mistral rapide/réflexion | Luna/terra ; small/large proposés, puis tout modèle valide du fournisseur sélectionnable | Modèle étranger refusé |
| Retour | Textes et résultats déjà présents | Textes conservés ; résultats dépendants périmés après changement ; aucun calcul automatique | — |
| URL interdite | URL ChatGPT, Claude, Gemini ou autre, y compris résolution injectée | Refus local avant dialogue et requête ; voie manuelle accessible | Message français explicite |

</frozen-after-approval>

## Code Map

- `src/ui/App.tsx` — rend les trois surfaces simultanément ; introduire les étapes accueil/choix/fil avec focus sur le titre, sans recréer le reducer.
- `src/ui/ConversationConfiguration.tsx` — réutiliser sélecteurs fournisseur et modèle ; ChatGPT affiche actuellement un modèle non modifiable ; ajouter mode Mistral et référence expliquée.
- `src/application/conversationReducer.ts` — `providerSelected`, `subscriptionSelected`, `modelSelected` et `invalidateCalculationsAndTokenizations` préservent les blocs ; autoriser un modèle ChatGPT valide, ajouter le mode Mistral et conserver l’invalidation.
- `src/domain/modelSelection.ts` — centraliser la correspondance abonnement/mode → modèle de référence.
- `src/data/modelCatalog.ts`, `data/clean/models_params.csv`, `data/clean/provider_country.csv` — les clés Mistral divergent (`MistralAI` / `Mistral AI`) ; normaliser puis valider les deux modèles et leur résolution complète au chargement.
- `src/application/import/registry.ts`, `remoteGateway.ts`, `src/ui/ConversationImport.tsx` — publier Mistral seul et refuser aussi une attestation ou résolution non Mistral forgée ; préserver les adaptateurs historiques isolés.
- `src/i18n/fr.ts`, `src/ui/styles.css` — textes des deux voies et des références, habillage et focus Canopée claire selon `DESIGN.md` et `EXPERIENCE.md`.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/modelSelection.ts`, `src/data/modelCatalog.ts`, catalogues CSV — centraliser les références, normaliser la clé Mistral et assurer pays/facteurs résolus.
- [x] `src/application/conversationReducer.ts` — gérer le mode Mistral et tout modèle valide, préserver textes et invalider les résultats dépendants sans calcul.
- [x] `src/ui/App.tsx`, `src/ui/ConversationConfiguration.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` — créer accueil à deux voies, navigation et sélection directe des modèles avec focus clavier.
- [x] `src/application/import/registry.ts`, `remoteGateway.ts`, `src/ui/ConversationImport.tsx` — borner l’import publié à Mistral aux trois frontières.
- [x] Tests domaine, reducer, import, UI — couvrir les lignes de la matrice, la résolution des deux références Mistral et la conservation/péremption des textes/résultats.

**Acceptance Criteria:**
- Given un changement de chatbot, abonnement, mode ou modèle avec un calcul actuel, when la sélection change, then la session garde les textes, les impacts dépendants deviennent périmés et aucune tokenisation ni estimation ne démarre.
- Given la navigation entre accueil, sélection et fil, when la personne passe d’une étape à l’autre au clavier, then le titre de l’étape reçoit le focus et le modèle reste consultable et modifiable depuis le fil.
- Given une URL non Mistral soumise directement à la passerelle, when le client tente d’obtenir un consentement ou de récupérer le HTML, then la passerelle refuse sans requête distante.

## Implementation Notes

- Le CSV `provider_country.csv` avait été corrigé par l’utilisateur avant l’implémentation ; la lecture normalise désormais sa clé `MistralAI` vers le libellé de session `Mistral AI`.
- Les adaptateurs historiques restent isolés ; le registre publié, l’interface et la passerelle acceptent seulement Mistral. Les tests historiques ont été adaptés au nouveau parcours.
- Audit de la matrice : `AppFlow.test.tsx` couvre l’accueil et les références ; `conversationReducer.test.ts` couvre conservation et péremption ; `ConversationImport.test.tsx` et `mistralBoundary.test.ts` couvrent refus local, résolution injectée et passerelle sans réseau.
- Vérification après revue : 208 tests sur 208, `npm run lint` et `npm run build` réussis. L’import Mistral passe par la sélection ; le retour suit l’étape d’origine, les choix de référence préservent le pays d’hébergement et les valeurs héritées sont refusées.

## Spec Change Log

## Review Triage Log

- `blind-hunter` — `.github/workflows/deploy.yml:41-44`, actifs sous le préfixe : `maybe-false` ; le résultat dépend du domaine et du chemin Pages réellement configurés, absents du dépôt. Le workflow précède 6.1 ; vérifier l’URL publiée.
- `blind-hunter` — `.github/workflows/deploy.yml:41-44`, site racine : `maybe-false` ; le site racine peut être publié par un autre dépôt, sans preuve ici qu’il soit écrasé. Le workflow précède 6.1 ; vérifier la configuration Pages.
- `blind-hunter` — `src/ui/App.tsx:165`, mode après import : `medium` ; l’import mène directement au fil où le calcul reste possible avec le mode rapide par défaut. Faire passer par la sélection avant le fil.
- `blind-hunter` — `src/ui/App.tsx:165`, modèle Mistral antérieur : `medium` ; `providerSelected` est sans effet si Mistral est déjà actif et le nouveau partage arrive sans étape de vérification. La même transition vers la sélection permet de vérifier ce choix.
- `blind-hunter` — `src/application/conversationReducer.ts:289-301`, pays d’hébergement : `medium` ; le changement d’abonnement ou de modèle rétablit le pays catalogué et efface le pays choisi. Préserver ce champ pour ces deux actions.
- `blind-hunter` — `src/application/conversationReducer.ts:194-206`, empreinte incluant mode et abonnement : `false` ; le bloc approuvé exige explicitement la péremption après ces changements, même si le modèle demeure identique. Le test du reducer vérifie déjà le cas ChatGPT.
- `blind-hunter` — `src/ui/ConversationImport.tsx:42-44`, focus du consentement : `medium` ; le premier focus va bien à « Continuer ». Ce dialogue préexiste à 6.1 et relève du parcours de consentement 6.3.
- `blind-hunter` — `src/ui/ConversationImport.tsx:158-172`, fond non inerte : `medium` ; aucun attribut inerte n’isole le fond du dialogue. Cette interaction préexiste à 6.1 et relève de 6.3.
- `blind-hunter` — `src/ui/ConversationImport.tsx:184-188`, focus du remplacement : `medium` ; le dialogue ne déplace ni ne retient le focus et ne gère pas Échap. Il préexiste à 6.1 et relève de 6.3.
- `blind-hunter` — `src/ui/ConversationImport.tsx:174-183`, annonce du contenu importé : `medium` ; `aria-live` contient bien tous les textes de la prévisualisation. Ce comportement préexiste à 6.1 et relève de 6.3.
- `edge-case-hunter` — `src/ui/App.tsx:165`, import sans mode fiable : `medium` ; le passage direct au fil permet un calcul avant vérification. La transition vers la sélection corrige le parcours de 6.1 ; l’obligation de choix explicite propre à l’import reste dans 6.3.
- `edge-case-hunter` — `src/ui/App.tsx:169`, retour depuis un fil vide : `low` ; le bouton mène à l’accueil car `blocks.length` vaut zéro. Mémoriser l’étape d’origine.
- `edge-case-hunter` — `src/application/conversationReducer.ts:293`, valeur héritée du prototype : `low` ; `in` accepte `constructor` et peut produire un `modelId` invalide. Vérifier la propriété propre.
- `verification-gap` — `src/application/conversationReducer.test.ts:25`, péremption Mistral : `medium` ; les choix successifs du test partent d’un impact déjà périmé après le premier. Ajouter un cas où le mode change alors qu’un résultat est actuel et que le modèle reste identique.

## Verification

**Commands:**
- `npm test -- --run` — tests existants et nouveaux verts.
- `npm run lint` — lint vert.
- `npm run build` — application publiée compilable.
