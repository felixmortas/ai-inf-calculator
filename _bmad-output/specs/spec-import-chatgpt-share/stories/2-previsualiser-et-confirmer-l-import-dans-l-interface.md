---
title: 'Prévisualiser et confirmer l’import : V1 et extension multi-fournisseur'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8681e1e540f30891e5bd5b6b430883958abc274e'
context:
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** L’adaptateur ChatGPT V1 sait lire des événements publics mais l’application ne permet pas encore de les examiner, de voir les limites du contenu partagé, ni de les convertir en échanges ordinaires sans risquer d’écraser une session existante.

**Approche :** Ajouter avant les blocs un parcours commun d’import : sélection du seul fournisseur disponible, analyse de lien, prévisualisation fidèle, avertissements de contenu inaccessible et remplacement explicitement confirmé. Les blocs obtenus restent éditables et aucun calcul n’est lancé par l’import.

## Boundaries & Constraints

**Always :** Consommer le registre et le contrat d’événements normalisés, sans branche ChatGPT dans les blocs. Regrouper un `user` non vide en `Message`; garder les traces tool redacted, commandes de skill/code, « Réfléchi pendant … » et `/mnt/data/...` dans `Raisonnement visible`; placer la première réponse assistant non-trace dans `Réponse finale`. Joindre les traces par `\n\n` dans leur ordre. Montrer un avertissement pour les événements non attribués, un bloc utilisateur incomplet, un artifact `sandbox:/mnt/data/...` et une citation `filecite`, sans lecture, téléchargement, exécution, texte déduit ni comptage. Échec, annulation et validation refusée conservent exactement la session. Le remplacement est atomique, génère des identifiants de blocs non collisionnels et ne lance ni tokenisation ni calcul.

**Never :** Ne pas contourner CORS, effectuer de seconde requête, stocker les données, suivre de lien ni rendre le contenu distant. Ne pas implémenter l’upload, la lecture locale, les tokens de fichier ou leur fraîcheur (story 3), ni modifier les règles de tokenisation, historique, impact ou calcul.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Analyse valide | URL ChatGPT et événements normalisés | Prévisualisation des blocs candidats, traces et avertissements avant toute mutation | Les blocs en session restent intacts jusqu’à confirmation |
| Session non vide | Prévisualisation prête et au moins un bloc non vide | Une confirmation explicite précède le remplacement atomique | Annuler ferme la confirmation et ne change rien |
| Conversion ordonnée | `user`, traces puis assistant terminal | Un bloc éditable contient message, traces jointes et réponse finale | Événement avant user ou après clôture devient non attribué; user sans réponse est signalé |
| Contenu inaccessible | Artifact sandbox ou filecite | Statut accessible invitant au collage ou upload manuel, sans contenu supposé | Aucune lecture ni contribution à Artifact/tokens |
| Échec d’analyse | URL, réseau/CORS/HTTP ou format refusé | Une erreur actionnable est affichée | Prévisualisation remplacée/invalidée, session préexistante inchangée |

</frozen-after-approval>

## Amendement multi-fournisseur

La livraison V1 documentée ci-dessous demeure l’historique ChatGPT. L’extension consomme un `ResolvedShare` déjà résolu par le registre, affiche le fournisseur détecté et garde une seule prévisualisation commune. Elle ne choisit aucun parseur ni règle par condition UI : les événements normalisés des quatre adaptateurs sont regroupés, avertis et confirmés de façon identique.

Les résultats asynchrones sont rejetés s’ils ne correspondent plus au même `ResolvedShare` et à son consentement courant. Une erreur de fournisseur, de redirection, de limite ou de format conserve les blocs et expose une alternative manuelle ; elle ne rend indisponible ni les autres adaptateurs ni les calculs.

**Critères d’acceptation d’extension :**

- Given une URL résolue pour ChatGPT, Claude, Mistral ou Gemini, when son import réussit, then la prévisualisation et la confirmation produisent les mêmes blocs éditables sans branchement fournisseur dans les blocs, tokens ou calculs.
- Given une réponse périmée, un `ResolvedShare` différent ou un consentement consommé/invalide, when un résultat arrive, then l’interface l’ignore et la session reste intacte.

## Code Map

- `src/application/import/types.ts` et `registry.ts` -- contrat générique et unique registre V1; les réutiliser pour sélectionner/appeler le fournisseur, sans condition ChatGPT dans la conversion.
- `src/application/import/chatgptShare.ts` -- frontière existante de validation, fetch et extraction; ne pas modifier ses limites ni lui ajouter de regroupement UI.
- `src/application/import/conversationPreview.ts` -- nouveau module pur de regroupement des événements, candidats, contenus inaccessibles et avertissements; isoler CAP-2/CAP-3 de React et du reducer.
- `src/application/conversationReducer.ts` -- ajouter une action atomique de remplacement des blocs, qui élimine les états de calcul/tokenisation incompatibles; préserver les autres actions et empreintes.
- `src/ui/App.tsx` -- détient le reducer et insérera le parcours d’import entre configuration et `ConversationBlocks`; ne pas appeler de calcul depuis ce flux.
- `src/ui/ConversationImport.tsx` -- nouveau composant accessible de saisie, analyse asynchrone, prévisualisation, confirmation et messages d’erreur/avertissement.
- `src/ui/ConversationBlocks.tsx` -- conserver les quatre champs ordinaires et synchroniser sa génération locale d’identifiants après un remplacement.
- `src/ui/styles.css`, `src/i18n/fr.ts` -- messages français et styles responsifs accessibles du parcours.
- `src/application/import/conversationPreview.test.ts`, `src/application/conversationReducer.test.ts`, `src/ui/ConversationImport.test.tsx` -- verrouiller conversion, atomicité et interaction; garder `chatgptShare.test.ts` centré sur l’adaptateur.
- `docs/importer-un-partage-chatgpt.md` -- nouvelle aide courte sur URL acceptée, confirmation, limites CORS et collage/upload manuel.

## Tasks & Acceptance

**Execution :**
- [x] `src/application/import/conversationPreview.ts` et test associé -- transformer les événements normalisés en prévisualisation commune de blocs, avertissements et statuts artifact/filecite -- préserver l’ordre et les limites sans dépendance React/fournisseur.
- [x] `src/application/conversationReducer.ts` et test associé -- introduire le remplacement atomique de blocs prêts à éditer et purger les états dérivés incompatibles -- empêcher un calcul ou une réponse ancienne de survivre à l’import.
- [x] `src/ui/ConversationImport.tsx`, `src/ui/App.tsx`, `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` et tests UI -- intégrer le parcours avant les blocs, confirmation conditionnelle, annonces accessibles et IDs sûrs -- rendre visible l’état réel sans mutation anticipée.
- [x] `docs/importer-un-partage-chatgpt.md` -- documenter le lien strict, le remplacement confirmé, les limites CORS et collage/upload manuel -- expliciter les limites sans promettre d’accès distant.

**Acceptance Criteria :**
- Given le registre V1, when une personne ouvre l’import, then seul ChatGPT est proposé et son analyse utilise l’adaptateur enregistré.
- Given une prévisualisation contenant les traces et la réponse terminale du scénario contractuel, when elle est convertie, then les quatre champs de blocs exposent le texte public exact, éditable, et les événements non attribués restent avertis.
- Given une session avec ou sans blocs existants, when la personne confirme le remplacement, then les blocs sont remplacés en une seule action, les résultats antérieurs sont invalidés et aucun calcul ne démarre; when elle annule, then l’état est inchangé.
- Given un artifact sandbox ou une citation filecite détectés, when la prévisualisation et les blocs sont affichés, then leur statut est annoncé sans téléchargement ni contenu inventé.
- Given une erreur du fournisseur ou une prévisualisation abandonnée, when l’interface la traite, then les blocs, calculs et configuration de session préexistants restent intacts.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- false — Blind hunter : un bloc de code autonome serait requis dans le raisonnement. Le contrat ne classe le code comme trace que lorsqu’il suit la commande de skill ; ce chemin est couvert par `traceMode`.
- medium — Blind hunter : `previewConversationImport` dépendait de l’ordre du tableau plutôt que de `ImportEvent.order`; un adaptateur normalisé dont la collection est réordonnée pouvait mal grouper les messages. Corriger localement par un tri déterministe.
- false — Blind hunter : artifact/filecite dans une trace seraient à signaler. Le contrat borne explicitement la détection d’artifact à la réponse finale, et les citations testées sont des réponses finales.
- low — Blind hunter : `eventOrder` des avertissements de contenu inaccessible pouvait désigner l’événement de clôture ou `0`; ce métadatum est public et doit rester fidèle. Conserver l’événement de réponse finale lors de la conversion.
- medium — Blind hunter : une prévisualisation sans bloc candidat pouvait proposer un remplacement destructeur. Désactiver cette action et expliquer qu’aucun échange n’est importable.
- medium — Blind hunter : un rejet inattendu de `importFromUrl` laissait l’analyse bloquée sans erreur. Traiter le rejet comme une erreur d’analyse actionnable.
- medium — Blind hunter : une réponse d’analyse périmée pouvait écraser le formulaire après un changement de lien/fournisseur. Ignorer les résultats qui ne correspondent plus à la requête courante.
- medium — Blind hunter : un `impactBlocked` asynchrone antérieur pouvait se rattacher à un bloc importé de même ID/empreinte. Faire distinguer les blocages immédiats des retours de calcul en attente.
- medium — Edge-case hunter : confirme le risque de réponse d’analyse périmée; même cause et correction que la ligne Blind hunter correspondante.
- false — Edge-case hunter : confirme la détection manquante dans les traces. Le contrat ne demande cette détection que dans la réponse finale; aucune perte de comportement contractuel.
- medium — Edge-case hunter : confirme le risque de `impactBlocked` antérieur; même cause et correction que la ligne Blind hunter correspondante.
- medium — Verification gap : le chemin `App` avec le registre réel n’était pas exercé. Ajouter un test d’intégration qui passe par le provider ChatGPT enregistré.
- medium — Verification gap : l’ajout manuel après un import ne vérifiait pas l’avancement d’identifiant. Ajouter l’assertion de second bloc après remplacement.
- medium — Verification gap : les avis artifact/filecite des blocs confirmés n’étaient pas testés. Ajouter une assertion dans le flux intégré après confirmation.

## Design Notes

Le regroupement est une frontière applicative pure : l’UI reçoit une prévisualisation déjà structurée et ne classe ni n’interprète les messages publics. Cela permet aux futurs adaptateurs de conserver le même parcours, tout en laissant les blocs issus de l’import identiques à ceux saisis manuellement.

## Verification

**Commands:**
- `npm test -- --run src/application/import/conversationPreview.test.ts src/application/conversationReducer.test.ts src/ui/ConversationImport.test.tsx` -- expected: conversion, atomicité, confirmation, échecs et statuts accessibles passent.
- `npm run lint` -- expected: TypeScript ne rapporte aucune erreur.
- `npm run build` -- expected: la compilation Vite aboutit.
