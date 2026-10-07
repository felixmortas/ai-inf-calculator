# Epic 7 Context: Parcours grand public simplifié

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettre à une personne non technique d’atteindre un résultat lisible en trois étapes (Votre IA, Votre conversation, Résultat) sans ouvrir le Mode avancé. Un seul « Calculer » affiche la douche en grand, des comparaisons du quotidien (ampoule LED) et une bonne pratique ; le résultat se partage sans révéler la conversation. L’epic remplace le parcours de l’epic 6 sans changer les formules.

## Stories

- Story 7.1: Commencer simplement et se repérer dans le parcours
- Story 7.2: Choisir son IA et régler ses hypothèses sans se perdre
- Story 7.3: Saisir sa conversation et la calculer d’un seul clic
- Story 7.4: Lire un résultat clair sous la conversation
- Story 7.5: Partager son résultat sans partager sa conversation

## Requirements & Constraints

- Langage grand public : aucun jargon dans le parcours principal, libellé visible sur toute action (jamais d’icône seule), états initiaux non présentés comme des avertissements, exemples dans les champs vides. Les coquilles de `fr.ts` sont corrigées.
- Une seule action principale par étape (« Continuer », « Calculer »), toujours visible. Le résultat est une section sous la conversation, sans nouvel écran, absente avant le premier calcul.
- « Calculer » calcule tous les blocs renseignés ; plus de calcul par bloc ni de recalcul du total. Une modification ne lance jamais de calcul ; un résultat périmé est retiré ou marqué « à recalculer ».
- Paramètres de session sur deux niveaux repliés : Mode avancé (pays de la personne, douche, ampoule LED) contenant le Mode expert (pays d’hébergement, facteurs, PUE, WUE…) ; pas de bouton « Appliquer ».
- Confidentialité : tout reste dans le navigateur, aucun stockage durable, analytics ni appel réseau ; le partage n’expose jamais de contenu de conversation.
- Accessibilité : clavier, focus visible jamais masqué par la barre collante, reflow 320 px, zooms 200 %/400 %, cibles 44 × 44 px, `prefers-reduced-motion`, aucun statut par la seule couleur.

## Technical Decisions

- Reducer React unique ; l’UI affiche et envoie des intentions, l’application orchestre, le domaine reste pur. Textes via clés i18n `fr.ts`.
- Pays de la personne déduit de la région de la langue du navigateur, sinon Monde (ni géolocalisation ni fuseau).
- Durée LED = électricité non arrondie / puissance (5 W par défaut) ; formateur partagé étendu ; phrase d’interprétation fixe.
- Partage : fonction pure sur une projection fermée, adaptateur `application` (partage système, copie en repli).
- Bonne pratique : tirage injectable et stable ; lien externe non disponible (cible configurable).
- Hors epic : maquettes statiques `mockups/*.html`.

## UX & Interaction Patterns

- Accueil : une phrase + « Commencer ». Indicateur textuel « Étape N/3 : titre » + justification ; focus sur le nouveau titre à chaque étape. « Retour » libellé en haut à gauche, conserve les textes. Lien « Méthodologie » sur chaque écran. Barre d’action collante, statique à fort zoom / hauteur réduite / clavier logiciel, avec `scroll-padding`.

## Cross-Story Dependencies

- 7.1 pose la structure d’étapes, la barre d’action et la navigation que 7.2 à 7.5 réutilisent.
- 7.3 retire le calcul par bloc ; 7.4 construit le résultat sous la conversation ; 7.5 dépend du résultat valide de 7.4.
