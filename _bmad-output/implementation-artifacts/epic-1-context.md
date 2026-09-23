# Epic 1 Context: Configurer et saisir une conversation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Rendre le calculateur publiquement accessible et permettre à une personne de définir une conversation cohérente — chatbot, modèle et échanges — avant tout calcul. Cette base doit garantir que le modèle s’applique à toute la conversation, que les textes restent privés et éphémères, et que la saisie demeure claire et utilisable sur ordinateur comme sur mobile.

## Stories

- Story 1.1: Accéder au calculateur et choisir le modèle de conversation
- Story 1.2: Composer une conversation en blocs

## Requirements & Constraints

- Publier un sous-projet accessible à `/ai-inf-calculator/` sur GitHub Pages, sans compte, connexion ni écran d’authentification, sans écraser le site racine.
- Afficher dans le parcours principal le chatbot sélectionné, le modèle applicable à toute la conversation et la conversation elle-même. Les autres réglages restent dans les paramètres avancés.
- Pour ChatGPT, proposer le choix « sans abonnement payant » ou « avec abonnement payant » et résoudre respectivement le modèle de référence `gpt-5.6-luna` ou `gpt-5.6-terra` pour tous les blocs.
- Pour un autre fournisseur, ne pas afficher le choix d’abonnement ChatGPT et n’autoriser que les modèles appartenant à ce fournisseur dans le catalogue local. Aucun modèle absent du catalogue ne peut être proposé.
- Permettre d’ajouter, modifier et supprimer des blocs. Chaque bloc porte des champs séparés pour le message, la réponse finale, le raisonnement visible et un artifact facultatif. La réorganisation des blocs est hors périmètre.
- Une modification ne déclenche jamais un calcul automatiquement. La suppression retire les données et son futur résultat de la conversation ; les résultats dépendants et le total doivent pouvoir être invalidés sans être recalculés implicitement.
- Un bloc dont les quatre champs sont vides ou composés seulement d’espaces est ignoré : il ne contribue ni aux textes, ni à l’historique, ni au prompt système, ni à un impact. Si aucun bloc n’est renseigné, les futures actions de calcul doivent inviter à saisir un échange plutôt que produire un impact nul.
- Conserver textes, sélections et résultats uniquement pendant la session en mémoire. Ne jamais les placer dans une URL, un journal, des analytics, des cookies ou un stockage navigateur durable ; une réouverture commence vierge.
- Livrer l’interface française avec libellés explicites, erreurs associées aux champs, focus visible et opérations réalisables au clavier, sans couleur seule ni survol. La saisie et les actions doivent rester utilisables sur petit écran.

## Technical Decisions

- Le calculateur est un projet Vite portable dans `ai-inf-calculator/`, avec une base `/ai-inf-calculator/` et une sortie statique intégrée par le dépôt hôte à son artefact GitHub Pages.
- Respecter les couches `ui`, `application`, `domain`, `data`, `i18n` et `workers`. L’UI React affiche et transmet des intentions ; l’application orchestre ; le domaine reste pur, synchrone et déterministe, sans dépendance React, navigateur, Worker, `Intl` ou catalogue concret.
- Un unique reducer React est propriétaire de l’état de session : textes, sélections et futures surcharges. Les actions du reducer sont les seules mutations et aucune mutation ne calcule sans intention utilisateur explicite.
- Les modèles et leurs données de référence sont des catalogues locaux immuables, versionnés et validés avant build. Les paramètres résolus sont déterminés par une fonction de domaine ; les réglages de session ne mutent jamais les catalogues. Le prompt système, lorsqu’il sera utilisé pour le calcul, provient exclusivement du catalogue et n’est pas surchargeable.
- Utiliser des identifiants stables `blockId`, du `camelCase` et des erreurs attendues sous forme d’union discriminée avec `code` et contexte non sensible. Garder les messages visibles dans des catalogues i18n typés ; distribuer `fr-FR` au lancement et formater avec `Intl`.
- Concevoir dès la saisie pour la fraîcheur future : le domaine dérive des empreintes canoniques `impactFingerprint` et `showerFingerprint`; les résultats et totaux ne peuvent utiliser que des dépendances actuelles.

## UX & Interaction Patterns

- Le parcours courant expose la configuration de conversation et les échanges sans devoir ouvrir de réglages avancés.
- Les contrôles doivent expliquer clairement les choix de fournisseur, d’abonnement lorsque pertinent, de modèle et les quatre types de texte d’un échange. Les actions d’ajout et de suppression restent explicites et accessibles sans survol.
- Les règles métier et données restent indépendantes des textes français afin de permettre une traduction future sans modifier les calculs ou les catalogues.

## Cross-Story Dependencies

- Story 1.1 fournit la sélection de fournisseur et de modèle commune à tous les blocs que Story 1.2 permet de composer.
- Story 1.2 fournit l’état ordonné des blocs, l’identification des blocs ignorés et les invalidations nécessaires aux calculs, à l’historique, aux artifacts et aux totaux des epics 2 et 3.
- La sélection de modèle est la source des données cataloguées utilisées ultérieurement pour le prompt système, la tokenisation et les paramètres environnementaux ; les paramètres avancés et pays sont traités dans l’epic 4.
