# Epic 6 Context: Aligner le calculateur sur l’expérience Canopée claire

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettre à une personne de reconstituer une conversation déjà tenue, par saisie ou import d’un lien public Mistral, puis de lire des estimations par échange et un bilan accessibles. Cet epic adapte le parcours publié sans modifier les formules ; ses décisions UX prévalent sur les critères d’affichage et d’import des epics 1 à 5 lorsqu’ils divergent.

## Stories

- Story 6.1: Choisir son parcours et son modèle de référence
- Story 6.2: Suivre les échanges et leurs estimations
- Story 6.3: Importer un partage Mistral avec consentement
- Story 6.4: Lire le bilan et ajuster les hypothèses

## Requirements & Constraints

- L’accueil présente l’import Mistral et la saisie manuelle. Le chatbot et le modèle s’appliquent à toute la conversation ; le modèle prérempli reste une estimation remplaçable par tout modèle valide du catalogue. ChatGPT propose `gpt-5.6-luna` sans abonnement payant et `gpt-5.6-terra` avec abonnement ; Mistral propose `mistral-small` en mode rapide et `mistral-large` en mode réflexion. Demander le mode inconnu d’un import sans le déduire du texte.
- Les échanges restent ordonnés, éditables et calculables individuellement sur action explicite dès qu’un texte utile existe. Ignorer les échanges vides. Montrer carbone et eau estimés près de chaque échange ; réserver électricité, risque de sécheresse qualitatif, équivalence carbone en durée de douche et conseils au bilan valide. Garder les formules et valeurs internes non arrondies.
- Toute modification pertinente conserve les textes et périme les résultats dépendants sans lancer de calcul. Un changement limité à la douche ne périme que l’équivalence. « Calculer toute la conversation » traite les échanges renseignés ; « Recalculer le total » réutilise seulement les résultats actuels, signale les échanges manquants ou périmés et ne présente jamais un ancien total comme actuel.
- Accepter uniquement un lien public Mistral dans l’import publié. Refuser les autres avant toute requête. Exiger pour chaque récupération un consentement explicite lié à l’URL canonique et à l’endpoint Worker actif ; transmettre uniquement `shareUrl`. Prévisualiser avant ajout et confirmer séparément le remplacement d’une conversation renseignée. Refus et erreurs préservent la session.
- Les quantités visibles utilisent des unités adaptées, au plus trois chiffres significatifs, une virgule française et des noms accessibles complets. Expliquer près des résultats l’incertitude, le périmètre d’usage hors Scope 3, les replis « Monde » et les indisponibilités.

## Technical Decisions

- Une session éphémère unique porte textes, sélections et résultats dans un reducer React. L’UI affiche et envoie des intentions ; l’application orchestre les cas d’usage ; le domaine garde les règles pures. Aucun stockage durable, calcul distant ou journalisation des textes.
- Des empreintes déterministes distinguent la fraîcheur des impacts et de l’équivalence douche. Ignorer les réponses asynchrones devenues obsolètes. Les catalogues locaux sont immuables et validés avant publication ; les correspondances de modèles sont centralisées, chaque référence résout pays et facteurs, et les surcharges restent en mémoire.
- Le registre d’import et la passerelle appliquent la politique Mistral seule. La passerelle accepte uniquement un partage attesté et un consentement valide pour le Worker allowlisté. La réponse bornée est extraite localement sans exécution du HTML ; aucun échec n’injecte d’échange.
- Le domaine conserve Wh, gCO₂e et L non arrondis ; la présentation choisit les métriques et formate les unités. Les textes d’interface français restent séparés des règles de calcul.

## UX & Interaction Patterns

- `DESIGN.md` et `EXPERIENCE.md` gouvernent l’identité Canopée claire : guide discret à l’accueil, fil chronologique de conversation passée, résultats proches des textes, largeur de lecture limitée. Revenir à une étape précédente conserve la saisie ; chatbot et modèle restent modifiables depuis le fil.
- Les anciens échanges se replient en cartes avec aperçu, état textuel et résultats actuels ; l’éditeur courant reste ouvert. Question et réponse précèdent les contenus facultatifs. Les commandes de dépliage exposent leur état. Après ajout, le focus rejoint la nouvelle question ; après suppression, une carte voisine ou l’action d’ajout. Erreurs et péremptions donnent une action de suite sans déplacer le focus de façon inattendue.
- Les dialogues de consentement et de remplacement sont distincts, accessibles au clavier et non superposés. Les états ne reposent jamais sur la seule couleur ; focus visible, cibles de 44 × 44 px, reflow à 320 px et aux zooms 200 % et 400 %, sans action réservée au survol.

## Cross-Story Dependencies

- Les modèles de référence et leurs facteurs établis en 6.1 servent au calcul du fil, à l’import et au bilan. La politique Mistral seule doit être effective aux frontières publiques avant l’exposition de l’import ; 6.3 ajoute le consentement et la prévisualisation.
- Les résultats et états de fraîcheur du fil alimentent le bilan de 6.4. Le formatage et l’accessibilité s’appliquent aux quatre stories et se vérifient sur le parcours complet.
