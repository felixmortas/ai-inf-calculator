# Epic 6 Context: Aligner le calculateur sur l’expérience Canopée claire

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Faire du calculateur un parcours clair pour reconstituer une conversation déjà tenue : choisir la saisie manuelle ou l’import d’un partage Mistral, vérifier le modèle de référence, suivre les échanges et lire des estimations compréhensibles par échange puis au bilan. Les décisions UX approuvées le 23 septembre 2026 définissent le parcours publié lorsque les critères historiques des epics 1 à 5 divergent. Les textes et calculs restent locaux, sauf la récupération consentie du seul lien public Mistral.

## Stories

- Story 6.1: Choisir son parcours et son modèle de référence
- Story 6.2: Suivre les échanges et leurs estimations
- Story 6.3: Importer un partage Mistral avec consentement
- Story 6.4: Lire le bilan et ajuster les hypothèses

## Requirements & Constraints

- L’accueil propose deux voies visibles, import Mistral puis saisie manuelle. Les autres chatbots restent disponibles pour la saisie. Le modèle proposé est une estimation que la personne peut remplacer par tout modèle valide du catalogue du chatbot choisi, y compris ChatGPT. ChatGPT propose `gpt-5.6-luna` sans abonnement payant et `gpt-5.6-terra` avec abonnement ; Mistral propose `mistral-small` en mode « rapide » et `mistral-large` en mode « réflexion ». Si le mode d’un import est inconnu, le demander sans l’inférer du texte.
- Les échanges sont ordonnés et restent modifiables. Un calcul démarre seulement sur action explicite. Un échange ayant au moins un texte utile est calculable ; les échanges vides ne comptent pas. Les cartes d’échange montrent le carbone et l’eau estimés ; le bilan valide présente aussi l’électricité, le risque de sécheresse qualitatif, l’équivalence carbone en durée de douche et des recommandations. Garder les valeurs internes non arrondies et les formules existantes.
- Un changement de texte, chatbot, modèle ou hypothèse conserve la session et rend périmés les résultats dépendants, sans calcul automatique. Un changement limité aux paramètres de douche ne périme que l’équivalence. « Tout calculer » traite explicitement les échanges renseignés ; « Recalculer le total » réutilise uniquement leurs résultats actuels et indique ceux qui manquent ou sont périmés. Aucun ancien total ne paraît actuel.
- La politique publiée accepte uniquement les liens publics Mistral. Refuser tout autre lien localement, avant consentement et avant réseau, à l’interface et à la passerelle. Chaque requête exige un consentement ponctuel lié à l’URL canonique et à l’endpoint Worker actif. Le corps du `POST` contient seulement `shareUrl` ; aucun texte ou paramètre de session ne sort. Prévisualiser avant ajout ; une conversation contenant déjà du texte exige une confirmation distincte de remplacement. Les erreurs et refus préservent la session.
- Les résultats affichés portent une unité adaptée et au plus trois chiffres significatifs, avec virgule française et nom accessible complet des unités abrégées. Expliquer l’incertitude, le périmètre d’usage hors Scope 3, les replis « Monde » et les données indisponibles près des valeurs concernées. Les totaux utilisent les valeurs internes non arrondies.

## Technical Decisions

- Application monopage React, avec état de session unique dans un reducer. `ui` affiche et émet des intentions ; `application` orchestre calculs, fraîcheur, catalogue et import ; `domain` garde les règles déterministes et indépendantes du navigateur. Aucun stockage durable ni journalisation distante des textes.
- Les empreintes déterministes décident de la fraîcheur des impacts et de l’équivalence douche. Les réponses asynchrones tardives ne peuvent actualiser un état dont l’empreinte a changé. Les catalogues locaux sont versionnés et validés avant publication. Centraliser les correspondances des modèles de référence, normaliser les clés fournisseur entre modèles et pays d’hébergement, et vérifier que chaque modèle de référence résout pays et facteurs. Les surcharges restent en mémoire et ne modifient pas les catalogues.
- Le registre d’import reste fermé. Les adaptateurs historiques peuvent subsister, mais la politique publique n’atteste qu’un partage Mistral. Appliquer cette restriction lors de la résolution et à la frontière de la passerelle. Seule la passerelle lance la requête vers un endpoint Worker allowlisté, après consentement valide ; elle refuse les références forgées et les changements d’URL ou de configuration. Le HTML reçu est borné, non exécuté et extrait localement ; un échec n’ajoute aucun échange.
- Les messages visibles sont issus du catalogue français typé. Le formatage et le choix des métriques relèvent de la présentation ; le domaine conserve Wh, gCO₂e et L non arrondis. La page doit rester publiable statiquement sur GitHub Pages, sans serveur de calcul.

## UX & Interaction Patterns

- `DESIGN.md` et `EXPERIENCE.md` priment sur les maquettes en cas d’écart. L’identité Canopée claire est calme, avec une seule invitation initiale ; le fil montre la conversation passée sans faire croire que le calculateur répond. Accueil, choix manuel, fil et bilan progressent dans la même page ; revenir en arrière conserve les textes. Le chatbot et le modèle restent consultables et modifiables depuis le fil.
- Les échanges antérieurs se replient en cartes compactes ; l’éditeur courant reste ouvert. Les actions de calcul sont nommées et distinctes. Les états périmés, erreurs, facteurs de repli et contrôles indisponibles ont une explication textuelle. Après transition, placer le focus sur le nouveau titre ; après ajout, sur la nouvelle question ; après suppression, sur une carte voisine ou l’action d’ajout.
- Consentement et remplacement utilisent deux dialogues distincts, jamais superposés : fond inerte, focus initial sur l’action qui conserve la conversation, focus contenu dans le dialogue, fermeture par Échap et restitution du focus. Après prévisualisation, annoncer seulement les nombres d’échanges et d’avertissements, puis placer le focus sur son titre. Contrôles d’au moins 44 × 44 px, focus visible, états non fondés sur la couleur seule, reflow à 320 px et aux zooms 200 % et 400 %, sans commande réservée au survol ; respecter `prefers-reduced-motion`.

## Cross-Story Dependencies

- Établir et valider les références de modèle et les données Mistral dès 6.1 ; leur choix sert ensuite au fil, à l’import et au bilan.
- La restriction Mistral doit être effective à la frontière publique avant d’exposer l’entrée d’import ; 6.3 complète ensuite le consentement, la prévisualisation et le remplacement.
- Les résultats et états de fraîcheur du fil alimentent le bilan ; les règles d’unité et d’accessibilité s’appliquent à toutes les surfaces au fil des stories, puis sont vérifiées transversalement en 6.4.
