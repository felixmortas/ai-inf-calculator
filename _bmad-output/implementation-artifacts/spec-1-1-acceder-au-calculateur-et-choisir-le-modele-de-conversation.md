---
title: 'Story 1.1 — Accéder au calculateur et choisir le modèle de conversation'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '963299a1e969c2146d05c9b4b30a32f080b9e9f5'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le dépôt ne contient encore aucune application publiable. Une visiteuse ne peut donc ni accéder au calculateur, ni fixer un chatbot et le modèle qui s’appliqueront à sa conversation.

**Approach:** Créer le sous-projet React/Vite statique servi sous `/calculator/`, avec un état de session exclusivement en mémoire. Exposer une configuration française et accessible : ChatGPT résout son modèle depuis le statut d’abonnement, tandis que les autres fournisseurs ne présentent que leurs modèles catalogués.

**Décision :** Le catalogue initial est exclusivement issu de `data/clean/models_params.csv`. Il contient ChatGPT, Gemini et Claude ; les lignes ChatGPT `gpt-5.6-luna` et `gpt-5.6-terra` restent les seules cibles de la convention d’abonnement.

## Boundaries & Constraints

**Always:** Utiliser une base Vite `/calculator/`; garder le domaine pur et les catalogues locaux immuables; laisser chatbot, modèle et zone de conversation visibles; associer chaque contrôle à un libellé français et conserver un focus clavier visible; ne stocker aucune sélection ou saisie hors de l’état React en mémoire.

**Never:** Ajouter compte, authentification, API, analytics, stockage navigateur durable, contenu de session dans l’URL, calcul d’impact, paramètres avancés, tokenisation ou gestion complète des blocs (story 1.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ChatGPT sans abonnement | Fournisseur ChatGPT et option « sans abonnement payant » | Modèle affiché et résolu : `gpt-5.6-luna` | N/A |
| ChatGPT avec abonnement | Fournisseur ChatGPT et option « avec abonnement payant » | Modèle affiché et résolu : `gpt-5.6-terra` | N/A |
| Autre fournisseur | Fournisseur différent de ChatGPT | Aucun contrôle d’abonnement; sélecteur limité à ses modèles du catalogue | Un fournisseur sans modèle valide ne peut pas devenir sélectionné |
| Nouvelle ouverture | Rechargement ou nouvelle session | Valeurs initiales du reducer, sans restauration antérieure | N/A |
| Petit écran ou clavier | Largeur réduite, Tab/Entrée/Espace | Contrôles et zone de conversation utilisables, focus apparent | Ne pas dépendre du survol ou de la couleur seule |

</frozen-after-approval>

## Code Map

- `data/clean/models_params.csv` -- source de catalogue locale à importer et valider; contient Gemini, Claude et les deux modèles de référence ChatGPT avec leurs paramètres.
- `_bmad-output/implementation-artifacts/epic-1-context.md` -- contraintes compilées de l’epic : architecture en couches, session éphémère et conventions ChatGPT.
- `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` -- nouveaux fichiers de fondation du sous-projet Vite; ne pas modifier un site hôte absent.
- `src/domain/modelSelection.ts` et ses tests -- résolution pure de la convention ChatGPT et filtrage de catalogue, sans React ni navigateur.
- `src/data/modelCatalog.ts` -- catalogue local typé, immuable et validé au démarrage/build.
- `src/application/conversationReducer.ts` -- état de session et actions de changement de fournisseur, abonnement et modèle; aucune persistance.
- `src/i18n/fr.ts` -- messages et libellés français séparés des règles métier.
- `src/ui/App.tsx`, `src/ui/ConversationConfiguration.tsx`, `src/ui/styles.css` -- rendu principal responsive, accessible et sans calcul; la zone de conversation reste un emplacement clairement visible pour la story 1.2.

## Tasks & Acceptance

**Execution:**

- [x] `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` -- initialiser Vite, React, TypeScript, Vitest et le build statique avec `base: '/calculator/'` -- rendre le sous-projet portable et publiable.
- [x] `src/data/modelCatalog.ts`, `src/domain/modelSelection.ts`, `src/domain/modelSelection.test.ts` -- importer et valider `data/clean/models_params.csv`, puis définir les règles pures de résolution ChatGPT et de filtrage fournisseur -- empêcher un modèle absent ou d’un autre fournisseur d’être sélectionné.
- [x] `src/application/conversationReducer.ts`, `src/application/conversationReducer.test.ts` -- modéliser les sélections de session et leurs transitions sans stockage persistant -- garantir que le modèle résolu est commun à la conversation.
- [x] `src/i18n/fr.ts`, `src/ui/App.tsx`, `src/ui/ConversationConfiguration.tsx`, `src/ui/styles.css`, `src/main.tsx` -- construire le parcours français, ses libellés, son focus, son adaptation mobile et l’emplacement de conversation -- permettre la configuration sans paramètres avancés ni survol.
- [x] `src/ui/ConversationConfiguration.test.tsx` -- tester les scénarios utilisateur ChatGPT, fournisseur alternatif, clavier et réinitialisation après nouveau montage -- couvrir la matrice d’entrées/sorties du parcours.

**Acceptance Criteria:**

- Given le build de production, when les assets sont servis par GitHub Pages, then la page se charge sous `/calculator/` sans route d’authentification ni modification du site hôte.
- Given ChatGPT sélectionné, when la visiteuse modifie son abonnement, then l’option correspondante et le modèle résolu (`gpt-5.6-luna` ou `gpt-5.6-terra`) restent visibles et sont stockés dans l’état de conversation.
- Given un fournisseur alternatif, when elle ouvre le choix de modèle, then l’abonnement ChatGPT est absent et chaque option appartient au fournisseur choisi.
- Given l’interface principale, when elle est consultée au clavier ou sur écran étroit, then les contrôles et l’emplacement de conversation sont visibles, libellés et utilisables avec un focus discernable.
- Given une fermeture suivie d’une réouverture, when l’application est remontée, then elle repart de ses valeurs initiales sans lire ni écrire de stockage durable.

## Implementation Notes

- Mise en place du sous-projet Vite/React avec base `/calculator/`, build statique et dépendances verrouillées.
- Le catalogue CSV est importé au build, validé (colonnes, lignes, doublons et références ChatGPT), puis consommé par le domaine et le reducer de session.
- Les tests couvrent les deux abonnements ChatGPT, le filtrage d’un fournisseur alternatif, le nouveau montage et les règles CSS de focus/responsive.

## Spec Change Log

## Review Triage Log

- patch — `conversationReducer.ts` acceptait à l’exécution une valeur d’abonnement hors union, ce qui pouvait produire un modèle indéfini; garde ajoutée contre la table de référence.
- false — l’absence de workflow GitHub Pages ne casse pas cette story : le dépôt ne contient aucun site hôte ni pipeline à intégrer, et le build Vite produit bien des chemins `/calculator/` pour l’artefact hôte prévu.
- patch — même défaut d’abonnement non validé relevé par la revue aveugle; la validation du reducer et son test empêchent désormais la divergence.
- false — les colonnes de calcul supplémentaires ne sont pas consommées par la sélection de la story 1.1; les exiger ici bloquerait sans bénéfice le catalogue de sélection local.
- false — les fournisseurs et identifiants actuels ne contiennent ni virgule ni citation; le parseur simple ne produit donc pas de mauvaise sélection pour les données effectivement admises.
- false — le parseur vérifie les deux champs nécessaires à la sélection et les lignes sans fournisseur/modèle; la largeur des colonnes de calcul relève du futur contrat de calcul.
- false — la provenance des paramètres environnementaux n’est ni affichée ni calculée dans cette story; aucune conséquence présente sur le parcours de configuration.
- false — le pays d’hébergement est une donnée de calcul et de paramètres avancés de l’epic 4, non une dépendance de la sélection de modèle.
- low — les tests de catalogues malformés supplémentaires amélioreraient la robustesse future mais le catalogue réel est validé au build pour les invariants de sélection et les chemins d’erreur internes ne sont pas atteignables par l’UI; correction rejetée.
- patch — les dépendances déclarées en `latest` pouvaient dériver entre installations; versions résolues épinglées et outils déplacés en dépendances de développement.
- patch — l’absence de politique Node rendait la compatibilité de build implicite; `engines.node` exprime désormais la version minimale des dépendances installées.
- patch — aucun test UI ne vérifiait le changement vers un modèle alternatif valide; le test sélectionne maintenant `gemini-3.6-flash` et observe la valeur rendue.
- patch — l’absence de persistance était testée par remontage mais non observée lors d’une interaction; le test vérifie les écritures Storage et History absentes.
- patch — la base de publication n’était vérifiée que par le build manuel; un test importe la configuration Vite et impose `/calculator/`.
- low — un navigateur réel fournirait une assurance visuelle plus forte du focus et du responsive, mais les contrôles clavier sont testés et la feuille impose une outline visible et une media query; correction rejetée faute d’infrastructure navigateur dans ce projet naissant.

## Design Notes

Le modèle visible est une valeur dérivée : l’abonnement est la seule entrée de convention pour ChatGPT, ce qui évite une combinaison incohérente abonnement/modèle. Pour les autres fournisseurs, le reducer n’accepte qu’un identifiant retourné par le catalogue filtré.

## Verification

**Commands:**

- `npm test -- --run` -- expected: les tests domaine, reducer et composant réussissent.
- `npm run build` -- expected: Vite génère un build statique dont les chemins respectent `/calculator/`.
- `npm run lint` -- expected: TypeScript et règles de qualité ne signalent aucune erreur.
