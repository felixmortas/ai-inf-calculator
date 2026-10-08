---
title: Epics et stories — Calculateur d’empreinte environnementale des LLM
status: final
created: 2026-09-18
updated: 2026-10-07
stepsCompleted: [1, 2, 3, 4]
previousWorkflowCompleted: [1, 2, 3, 4]
targetedValidations:
  - epic: 5
    source: sprint-change-proposal-2026-09-20.md
    status: confirmed-with-dispatch-order
    date: 2026-09-20
  - epic: 6
    source: sprint-change-proposal-2026-09-23.md
    status: validated
    date: 2026-09-23
  - epic: 7
    source: sprint-change-proposal-2026-10-07.md
    status: stories-written
    date: 2026-10-07
inputDocuments:
  - prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
  - ../specs/spec-ai-env-impact-calculator/SPEC.md
  - ../specs/spec-ai-env-impact-calculator/functional-contract.md
  - ../specs/spec-ai-env-impact-calculator/calculation-contract.md
  - sprint-change-proposal-2026-09-19.md
  - sprint-change-proposal-2026-09-20.md
  - sprint-change-proposal-2026-09-23.md
  - sprint-change-proposal-2026-10-07.md
  - ux-designs/ux-ai-env-impact-calculator-2026-09-23/DESIGN.md
  - ux-designs/ux-ai-env-impact-calculator-2026-09-23/EXPERIENCE.md
---

# Calculateur d’empreinte environnementale des LLM — Epic Breakdown

> **Périmètre courant — 2026-10-06 :** le risque de sécheresse a été supprimé. Les FR-22/FR-24, UX-DR7 et critères d’acceptation ont été réconciliés avec cette décision ; suivre la SPEC canonique pour les travaux futurs.

## Overview

Ce document conserve les epics 1 à 6 comme trace des versions livrées et ajoute l’epic 7 (parcours grand public simplifié), issu de la proposition de changement du 7 octobre 2026. Pour l’epic 6, le PRD, l’architecture, la SPEC du calculateur et les spines UX mis à jour définissent le parcours maintenu.

## Requirements Inventory

### Functional Requirements

FR-1: Proposer pour ChatGPT `gpt-5.6-luna` sans abonnement ou `gpt-5.6-terra` avec abonnement comme estimation initiale, modifiable directement par tout modèle ChatGPT valide du catalogue.

FR-2: Permettre pour tout chatbot de choisir un modèle valide du catalogue pour toute la conversation ; proposer pour Mistral `mistral-small` en mode rapide ou `mistral-large` en mode réflexion ; un changement rend les résultats dépendants périmés sans calcul automatique.

FR-3: Ne compter que les textes fournis, sans reconstituer de raisonnement invisible, hormis les tokens de prompt système catalogués.

FR-4: Comparer les versions complètes d’un artifact et compter en sortie seulement les passages ajoutés ou modifiés.

FR-5: Convertir le carbone estimé en durée de douche électrique à partir du pays de la personne (déduit de la langue du navigateur, indicatif, corrigeable dans le Mode avancé). L’eau ne fait l’objet d’aucune comparaison ; la comparaison énergétique LED relève de FR-25.

FR-6: Afficher dans le résultat une seule bonne pratique, tirée au sort localement dans une liste commune non personnalisée (tirage injectable dans les tests, stable pour un même résultat) ; l’accès à toutes les autres passe par un lien externe, pas encore disponible (cible à renseigner plus tard).

FR-7: Rendre le calculateur accessible publiquement sans compte ni connexion.

FR-8: Compter les tokens localement avec Tiktoken par défaut, et appliquer le fallback local mots / 0,75 en cas d’échec.

FR-10: [RETIRÉ par l’epic 7 — historique epics 2 et 6] Calcul d’un bloc seul sur action explicite.

FR-11: [RETIRÉ par l’epic 7 — historique epics 3 et 6] Calcul de tous les blocs par une action dédiée, désormais couvert par FR-12.

FR-12: Un seul bouton « Calculer », toujours visible : il calcule tous les blocs renseignés et affiche tout (cartes, total, résultat sous la conversation). Plus de calcul par bloc ni de recalcul du seul total ; une modification ne lance jamais de calcul ; un résultat périmé est retiré ou marqué « à recalculer » jusqu’au prochain « Calculer » ; « Calculer » est indisponible avec explication sans bloc renseigné ou avec un paramètre invalide.

FR-13: [RETIRÉ par l’epic 7 — historique epics 3 et 6] Masquage d’un total incomplet et accès aux blocs à recalculer.

FR-14: Ajouter, modifier et supprimer des blocs contenant message, réponse, raisonnement visible et artifact, avec invalidation des dépendances affectées.

FR-15: Préremplir le pays d’hébergement par fournisseur et autoriser sa modification dans le Mode expert, imbriqué dans le Mode avancé.

FR-16: Guider en trois étapes (Votre IA, Votre conversation, Résultat) avec indicateur textuel et justification des questions ; le résultat est une section sous la conversation, sans nouvel écran ; chatbot et modèle (modèle de référence déduit, « Modifier ») restent visibles et modifiables dans l’en-tête du fil ; anciens échanges en cartes compactes dépliables, éditeur courant ouvert ; « Retour » libellé en haut à gauche conservant les textes.

FR-17: Autoriser les surcharges de session des paramètres sur deux niveaux repliés par défaut à l’étape 1/3 : « Mode avancé » (pays de la personne, douche, puissance de l’ampoule LED) sous le choix du modèle, et « Mode expert » (pays d’hébergement, intensité carbone, paramètres du modèle, PUE, WUE, reste) à l’intérieur ; pas de bouton « Appliquer » (valeurs valides appliquées à « Continuer » ou « Calculer », sans calcul) ; tokens système masqués.

FR-18: Rétablir par un lien discret les paramètres de référence du Mode avancé et du Mode expert sans modifier textes, blocs, chatbot ou modèle et sans lancer de calcul.

FR-19: Reconstruire localement l’historique en cache, incluant les échanges antérieurs, la dernière version complète d’artifact et le prompt système.

FR-20: Utiliser exclusivement le volume de prompt système fourni par le catalogue, sans l’exposer ni le rendre modifiable.

FR-21: Exclure entièrement un bloc dont les quatre champs sont vides ou ne contiennent que des espaces.

FR-22: Présenter chaque impact comme une estimation unique avec incertitude ; carbone et eau dans l’en-tête de chaque carte, puis dans le résultat : douche en grand, carbone, eau, électricité, comparaison du quotidien, interprétation, bonne pratique ; périmètre formulé sans jargon (« Scope 2/3 » dans « En savoir plus ») ; états « ✓ » et « à recalculer » textuels ; unités à trois chiffres significatifs au plus sans arrondir les valeurs internes.

FR-23: Utiliser et signaler la valeur « Monde » pour le seul facteur environnemental manquant; bloquer le résultat si ce repli est absent.

FR-24: Calculer énergie, eau et carbone selon les formules et unités définies.

FR-25: Présenter l’électricité estimée en durée d’ampoule LED de 5 W (paramètre modifiable dans le Mode avancé ; puissance nulle → non calculable, sans division par zéro) calculée sur l’électricité non arrondie, avec une phrase d’interprétation neutre (« …100 conversations comme celle-ci ont un impact plus conséquent ») ; aucune comparaison pour l’eau.

FR-26: Proposer, pour un résultat valide et à jour, un seul bouton « Partager » : partage système avec texte prérempli (chatbot, nombre d’échanges, équivalence douche, valeurs principales avec unités, mention d’estimation, adresse de la page), copie en repli ; jamais de contenu de conversation, de nom de fichier ni de paramètre ; retour textuel de succès ou d’échec.


### NonFunctional Requirements

NFR-1: Permettre le parcours en trois étapes sur ordinateur comme sur mobile, avec une seule action principale par étape, toujours visible (barre collante, statique à fort zoom ou en hauteur réduite), selon les spines UX du 2026-10-07.

NFR-2: Produire une application statique publiable sur GitHub Pages et intégrable à `felixmortas.com`.

NFR-3: Conserver messages, calculs, tokenisation et diff dans le navigateur, sans analytics ni journal distant ; le texte de partage (FR-26) ne transite que par le moyen choisi par la personne, sur son action explicite, sans contenu de conversation.

NFR-4: Ne conserver durablement ni textes, ni résultats, ni choix après la fermeture de la page.

NFR-5: Livrer l’interface française en séparant les messages et formats des règles et données métier afin de permettre l’internationalisation.

NFR-6: Bloquer les résultats invalides et garantir les domaines numériques, unités, replis et divisions définis.

NFR-7: Fournir libellés, clavier, focus visible (jamais masqué par la barre collante), erreurs associées et états textuels ; assurer reflow à 320 px et zooms 200 %/400 %, cibles d’au moins 44 × 44 px, dialogue modal accessible (suppression), restitution du focus et annonces concises.

NFR-8: Employer un langage et des libellés grand public : aucun jargon dans le parcours principal, libellé visible sur toute action (même avec icône), états initiaux normaux non présentés comme des avertissements, exemples dans les champs vides.

### Additional Requirements

- Créer un sous-projet Vite portable dans `ai-inf-calculator/`, avec base `/ai-inf-calculator/`, build statique et intégration sans écraser le site racine.
- Structurer l’application en `ui`, `application`, `domain`, `data`, `i18n` et `workers`; le domaine est pur, synchrone et déterministe, et l’UI ne calcule pas.
- Centraliser l’état de session dans un reducer React et dériver la fraîcheur à partir d’empreintes canoniques `impactFingerprint` et `showerFingerprint`.
- Implémenter la tokenisation dans un Worker local typé utilisant `js-tiktoken/lite` et `o200k_base`, avec `requestId` et empreinte de demande pour ignorer les réponses périmées.
- Versionner et valider avant build les catalogues immuables de modèles, tarifs, constantes, facteurs, risques, valeurs Monde et provenance; n’autoriser que des surcharges en mémoire.
- Résoudre toute donnée environnementale par clé normalisée, pays retenu, repli Monde du même facteur, puis surcharge de session; signaler repli et indisponibilité.
- Détecter le pays utilisateur sans donnée externe, d’abord par table locale fuseau IANA → pays probable, puis locale navigateur, puis Monde; le qualifier d’indicatif.
- Adresser tout texte utilisateur par clé de messages typés, distribuer `fr-FR` au lancement et formater via `Intl`.
- Conserver les calculs non arrondis en Wh, gCO2e et L; ne laisser franchir aucune valeur `NaN` ou infinie à la frontière du domaine.
- Prévoir tests de domaine et Worker, incluant les scénarios de référence: premier échange, artifact modifié, suppression, bloc vide, péremption, total, modèle/pays, restauration, repli Monde et fermeture de session.
- Appliquer la segmentation des mots et le diff définis par les contrats fonctionnels ; utiliser pour l’epic 6 un formateur partagé à trois chiffres significatifs au plus et aux séries d’unités de `EXPERIENCE.md`, sans arrondir les valeurs internes. Valider seuils et cas extrêmes sur des données représentatives.
- Normaliser la clé fournisseur entre `models_params` et `provider_country.csv` ; vérifier pour `mistral-small` et `mistral-large` le pays et les facteurs résolus ; centraliser les correspondances ChatGPT abonnement et Mistral rapide/réflexion dans une table locale modifiable.
- Conserver l’état dans un reducer unique ; les vues accueil, choix du modèle, fil et bilan partagent la même session éphémère. L’UI orchestre et affiche, le domaine calcule sans React, les catalogues demeurent immuables et aucun nouveau service réseau de calcul n’est ajouté.
- **Epic 7 — ampoule LED (AD-5) :** paramètre de comparaison « puissance de l’ampoule » (5 W par défaut, session) ; durée LED = fonction pure du domaine sur l’électricité non arrondie (`durée_LED = E_total / P_LED`) ; puissance nulle ou négative → non calculable ; la modifier ne périme que les équivalences. Formule déjà reportée dans la méthodologie §8.2, l’addendum et `calculation-contract.md`.
- **Epic 7 — pays de la personne (AD-6) :** déduit de la région de la langue du navigateur, sinon Monde ; ni géolocalisation ni table de fuseaux (remplace la détection par fuseau IANA citée plus haut) ; indicatif et corrigeable dans le Mode avancé.
- **Epic 7 — affichage (AD-9) :** le formateur partagé couvre aussi la durée LED (ms → j) ; la phrase d’interprétation est un message i18n fixe, jamais choisi selon la valeur.
- **Epic 7 — partage (AD-10) :** texte produit par une fonction pure sur une projection fermée `ShareableResult` (chatbot, nombre d’échanges, équivalence douche, valeurs formatées, mention d’estimation, adresse de la page sans requête ni fragment) ; adaptateur `application` appelant le partage du système, copie en repli, sur action explicite et résultat actuel uniquement ; aucun appel réseau, analytics ni stockage.
- **Epic 7 — bonne pratique :** tirage aléatoire injectable, stable pour un même résultat ; le lien externe « toutes les bonnes pratiques » n’est pas encore disponible (cible configurable, à renseigner plus tard).
- **Epic 7 — suppression :** retirer calcul par bloc et recalcul du total du reducer, de l’application et de l’UI ; la fraîcheur n’alimente plus que « ✓ » / « à recalculer ».
- **Hors epic 7 :** régénération ou retrait des maquettes statiques (`mockups/*.html`), traitée à part.

### UX Design Requirements

UX-DR1: Appliquer les couleurs, typographies, espacements, rayons et styles des composants de `DESIGN.md` ; utiliser une colonne de lecture de 760 px maximum et une marge mobile de 16 px, avec contrastes texte 4,5:1 et grands caractères/indicateurs 3:1 au minimum.

UX-DR2: Construire le guide d’accueil avec une seule action visible vers la saisie manuelle ; guider ensuite vers le choix du chatbot et du modèle sans effacer les textes déjà saisis.

UX-DR3: Construire le sélecteur visible chatbot/modèle : valeur de référence présentée comme estimation modifiable, choix direct d’un modèle catalogue valide, puis accès permanent depuis l’en-tête du fil sans ouvrir les paramètres avancés.

UX-DR4: Afficher les échanges dans l’ordre chronologique ; rendre les anciens sous forme de cartes compactes avec numéro, aperçu, état, carbone/eau actuels et commande de dépliage à nom et état explicites ; garder l’éditeur courant ouvert.

UX-DR5: Organiser l’éditeur courant avec question puis réponse et un groupe facultatif pour raisonnement visible, document/code généré et fichiers source texte UTF-8 ; calculer un échange dès qu’au moins un texte utile existe et expliquer pourquoi un échange vide ne se calcule pas.

UX-DR6: Afficher après calcul explicite une paire carbone/eau près des textes de l’échange, avec unité et mention d’estimation ; présenter les erreurs, péremptions, replis Monde et indisponibilités par des messages locaux et des actions de suite.

UX-DR7: Construire un bilan après « Calculer toute la conversation » : carbone, eau, électricité, équivalence douche et recommandations ; sur « Recalculer le total », nommer les échanges non calculés ou périmés et fournir un accès à leurs cartes sans montrer un total ancien comme actuel.

UX-DR8: Fournir un panneau de paramètres avancés secondaire avec pays d’hébergement, pays utilisateur, hypothèses mathématiques, unités, erreurs liées aux champs et restauration ; appliquer ou restaurer annonce une fois les résultats à recalculer sans déclencher de calcul.

UX-DR12: Après ajout d’un échange, placer le focus sur sa question ; après suppression, sur une carte voisine ou l’action d’ajout ; après changement d’étape, sur le nouveau titre. Les annonces de calcul et de péremption restent concises et ne relisent pas tout le fil.

UX-DR13: Formater toutes les quantités affichées avec au plus trois chiffres significatifs et unités adaptées : carbone µgCO₂e à tCO₂e, eau µL à ML, électricité mWh à GWh et durée de douche ms à j ; couvrir zéro, valeur sous 0,001 de l’unité minimale, bascule après arrondi et dépassement de l’unité maximale, avec virgule française et nom accessible complet.

UX-DR14: Assurer 44 × 44 px minimum pour les cibles, reflow à 320 px et zooms 200 %/400 % sans perte d’action ni troncature ; éviter les commandes réservées au survol, respecter `prefers-reduced-motion` et ne transmettre aucun statut par couleur seule.

UX-DR15: Employer des libellés et textes français compréhensibles pour une personne non technique ; expliquer à la demande « artifact », « PUE », « WUE » et « tokens », et présenter l’incertitude, l’usage hors Scope 3 et les conseils sans promettre une mesure exacte ou un gain chiffré.

**Epic 7 — parcours grand public simplifié (EXPERIENCE.md / DESIGN.md du 2026-10-07).** UX-DR16 à UX-DR30 remplacent, pour le parcours publié, UX-DR2, UX-DR7 et UX-DR8 et la partie « calcul par échange » de UX-DR5/UX-DR6.

UX-DR16: Accueil limité à une phrase d’introduction (`guide-prompt`) et un bouton « Commencer » (`start-button`), sans carte intermédiaire ni « ou » ; le texte d’introduction n’est pas répété hors accueil.
UX-DR17: Indicateur textuel « Étape N/3 : titre » (`step-indicator`) suivi d’une phrase de justification ; annonce de l’étape et focus sur le nouveau titre à chaque changement.
UX-DR18: Bouton « Retour » libellé (icône décorative + texte), en haut à gauche au-dessus du titre, cible 44 × 44 px ; depuis l’étape 2 il mène à l’étape 1 sans effacer les textes.
UX-DR19: Barre d’action collante unique (« Continuer », « Calculer ») ; statique à fort zoom, en hauteur réduite ou clavier logiciel ouvert ; `scroll-padding` pour ne jamais masquer le champ ou l’anneau de focus.
UX-DR20: Étape 1/3 : modèle estimé affiché avec « Modifier » ; pays de la personne déduit avec « Modifier » ; libellés « Où vous vous trouvez (pour la comparaison douche) » et « Où est hébergée l’IA (pour le CO₂) » ; « Si vous ne savez pas, laissez la valeur par défaut. »
UX-DR21: « Mode avancé » replié sous le choix du modèle (pays de la personne, débit, températures, puissance LED) contenant le « Mode expert » replié, imbriqué avec retrait visible et libellé de dépliage propre ; chaque champ explique son effet ; lien « Rétablir les valeurs par défaut » ; plus de bouton « Appliquer » ; « Continuer » et « Calculer » désactivés avec explication et focus sur la première erreur si un paramètre est invalide.
UX-DR22: Libellés grand public : « Collez ici votre message / la réponse de l’IA », « Réflexion affichée par l’IA (optionnel) », « Contenu du fichier créé par l’IA (optionnel) », « Fichiers que vous avez joints », « Ajouterne question / réponse » ; aucune icône seule ; champs vides sans avertissement ; explications à la demande de « fichier créé par l’IA », PUE, WUE et tokens.
UX-DR23: Cartes question / réponse sans action de calcul propre : en-tête avec numéro, aperçu, état « ✓ » ou « à recalculer » (texte + pictogramme), carbone et eau si à jour ; commandes « Déplier » / « Replier » avec `aria-expanded` et `aria-controls`.
UX-DR24: « Calculer » unique : indisponible avec explication sans texte utile ; état de calcul annoncé près de l’action avec interface verrouillée ; après succès, le focus va au titre du résultat sous la conversation, sans changement d’écran ; la section résultat n’existe pas avant le premier calcul.
UX-DR25: Résultat (`result-hero`) : équivalence douche en `metric-hero` avec nom accessible complet de l’unité ; puis carbone, eau et électricité en `metric` ; puis durée LED et phrase d’interprétation neutre ; périmètre sans jargon avec « En savoir plus » ; mention d’incertitude.
UX-DR26: Résultat périmé : « à recalculer » sur les cartes touchées et sur la section résultat, valeurs anciennes retirées ou clairement inutilisables, partage indisponible ; états « durée LED non calculable », « pays non déduit » et repli Monde expliqués près du résultat concerné.
UX-DR27: Bonne pratique unique avec lien « Voir toutes les bonnes pratiques » (cible externe non disponible : prévoir un état explicite) ; bouton « Partager » à contour, moins saillant que l’action principale, avec retour textuel « Résultat copié. » ou message d’échec et action de suite.
UX-DR28: Lien « Méthodologie » libellé présent uniquement sur l’accueil, sous « Commencer » (plus de bouton « ? », aucun tutoriel) ; page de méthodologie avec « Retour » libellé en haut et un seul titre principal.
UX-DR29: Un seul dialogue modal : confirmation de suppression, avec fond inerte et restitution du focus ; focus après ajout sur la nouvelle question, après suppression sur la carte voisine ou « Ajouter une question / réponse ».
UX-DR30: Accessibilité du parcours simplifié : clavier, 320 px, zooms 200 %/400 %, cibles 44 × 44 px, `prefers-reduced-motion`, aucun statut par la couleur seule ; correction des coquilles de `fr.ts` (« entraiment », « conscis », etc.).

### FR Coverage Map

FR-1: Epic 1 (historique), Epic 6 — Référence ChatGPT selon abonnement, directement modifiable dans le parcours actuel.

FR-2: Epic 1 (historique), Epic 6 — Modèle catalogue modifiable pour tous les chatbots et mode Mistral rapide/réflexion.

FR-3: Epic 2 — Comptage limité aux textes fournis et prompt système catalogué.

FR-4: Epic 2 — Diff des versions d’artifact.

FR-5: Epic 4, Epic 6 — Équivalence carbone en douche locale réservée au bilan actuel.

FR-6: Epic 4, Epic 6 — Conseils de sobriété non personnalisés dans le bilan actuel.

FR-7: Epic 1 — Accès public sans compte.

FR-8: Epic 2 — Tokenisation locale et fallback.

FR-10: Epic 2, Epic 6 — Calcul explicite d’un bloc et affichage actuel carbone/eau seulement.

FR-11: Epic 3, Epic 6 — Calcul de tous les blocs et accès au bilan dans le nouveau parcours.

FR-12: Epic 3, Epic 6 — Recalcul du total seul depuis le bilan actuel.

FR-13: Epic 3, Epic 6 — Fraîcheur, état « total incomplet » et accès aux échanges à recalculer.

FR-14: Epic 1, Epic 6 — Gestion des blocs dans le fil compact et conservation de la session.

FR-15: Epic 4, Epic 6 — Pays d’hébergement modifiable dans le panneau avancé du nouveau parcours.

FR-16: Epic 1 (historique), Epic 6 — Entrée manuelle unique, fil compact et modèle directement modifiable.

FR-17: Epic 4, Epic 6 — Paramètres avancés de session accessibles depuis le fil et le bilan.

FR-18: Epic 4, Epic 6 — Restauration sans calcul automatique dans le nouveau parcours.

FR-19: Epic 2 — Historique en cache reconstruit.

FR-20: Epic 2 — Prompt système exclusivement catalogué.

FR-21: Epic 1 — Blocs entièrement vides ignorés.

FR-22: Epic 2 (historique), Epic 6 — Répartition actuelle des métriques, incertitude et unités adaptées.

FR-23: Epic 4, Epic 6 — Repli environnemental « Monde » signalé près du résultat concerné.

FR-24: Epic 3, Epic 6 — Impacts énergie, eau et carbone complets sans changement de formule.



NFR-1 à NFR-7 et UX-DR1 à UX-DR14: Epic 6 — Parcours Canopée claire, confidentialité, affichage, clavier et petit écran.

FR-5, FR-6, FR-12, FR-15, FR-16, FR-17, FR-18, FR-22: Epic 7 — révisés par le parcours simplifié (voir ci-dessous).

FR-5: Epic 7 (7.2, 7.4) — Pays de la personne déduit de la langue du navigateur ; douche en vedette.
FR-6: Epic 7 (7.4) — Une bonne pratique tirée au sort ; lien externe vers les autres, non disponible.
FR-12: Epic 7 (7.3) — « Calculer » unique ; plus de calcul par bloc ni de recalcul du total.
FR-15: Epic 7 (7.2) — Pays d’hébergement dans le Mode expert imbriqué.
FR-16: Epic 7 (7.1, 7.2, 7.3) — Trois étapes, résultat sous la conversation, « Retour » libellé.
FR-17: Epic 7 (7.2) — Mode avancé et Mode expert, sans bouton « Appliquer ».
FR-18: Epic 7 (7.2) — Rétablissement par lien discret.
FR-22: Epic 7 (7.3, 7.4) — États « ✓ » / « à recalculer », hiérarchie du résultat, périmètre sans jargon.
FR-25: Epic 7 (7.4) — Durée d’ampoule LED et phrase d’interprétation.
FR-26: Epic 7 (7.5) — Partage système sans contenu de conversation.
FR-10, FR-11, FR-13: Retirés par l’epic 7 (traces des epics 2, 3 et 6).

NFR-1, NFR-3, NFR-7, NFR-8: Epic 7 — transversal (7.1 à 7.5).
UX-DR16, UX-DR17, UX-DR18, UX-DR19, UX-DR28: Epic 7.1. UX-DR20, UX-DR21: Epic 7.2. UX-DR22, UX-DR23, UX-DR24, UX-DR29: Epic 7.3. UX-DR25, UX-DR26, UX-DR27: Epic 7.4. UX-DR30: Epic 7.1 à 7.5.

## Epic List

### Epic 1: Configurer et saisir une conversation

La personne accède au calculateur, choisit son chatbot et son modèle, puis compose librement les échanges de sa conversation.

**FRs covered:** FR-1, FR-2, FR-7, FR-14, FR-16, FR-21

### Epic 2: Estimer l’impact d’un échange

La personne calcule volontairement un bloc et consulte une estimation fiable de son impact individuel, fondée uniquement sur ses textes.

**FRs covered:** FR-3, FR-4, FR-8, FR-10, FR-19, FR-20, FR-22

### Epic 3: Obtenir un bilan valide de la conversation

La personne calcule tous ses échanges, consulte le total énergie/eau/carbone et comprend les recalculs nécessaires après une modification.

**FRs covered:** FR-11, FR-12, FR-13, FR-24

### Epic 4: Ajuster les hypothèses et comprendre les résultats

La personne adapte les références de sa session, restaure les valeurs par défaut et interprète les impacts grâce à l’équivalence douche et aux conseils de sobriété.

**FRs covered:** FR-5, FR-6, FR-15, FR-17, FR-18, FR-23

### Epic 6: Aligner le calculateur sur l’expérience Canopée claire

La personne choisit dès l’accueil la saisie ou le copier/coller manuel, corrige le modèle proposé, suit sa conversation dans un fil compact et comprend des estimations par échange et un bilan lisibles et accessibles. L’epic adapte les capacités déjà livrées sans changer les formules ni réécrire l’historique des epics 1 à 5.

**FRs covered:** FR-1, FR-2, FR-5, FR-6, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-22, FR-23, FR-24. **Quality and UX:** NFR-1 à NFR-7, UX-DR1 à UX-DR14.

### Epic 7: Parcours grand public simplifié

Une personne non technique atteint un résultat lisible en trois étapes, sans ouvrir le Mode avancé. Un seul « Calculer » affiche la douche en grand, des comparaisons du quotidien et une bonne pratique ; elle peut partager le résultat sans révéler sa conversation. L’epic remplace le parcours livré par l’epic 6 sans changer les formules ni réécrire les epics 1 à 6.

**FRs covered:** FR-5, FR-6, FR-12, FR-15, FR-16, FR-17, FR-18, FR-22, FR-25, FR-26 (FR-10, FR-11 et FR-13 retirés). **Quality and UX:** NFR-1, NFR-3, NFR-7, NFR-8, UX-DR16 à UX-DR30.

## Epic 1: Configurer et saisir une conversation

La personne accède au calculateur, choisit son chatbot et son modèle, puis compose librement les échanges de sa conversation.

### Story 1.1: Accéder au calculateur et choisir le modèle de conversation

As a visiteuse,
I want sélectionner mon chatbot puis le mode de sélection de son modèle,
So that la conversation utilise une référence cohérente dès le départ.

**Acceptance Criteria:**

**Given** la publication du sous-projet sur GitHub Pages
**When** je visite `/ai-inf-calculator/`
**Then** l’application est servie sous cette base sans écraser le site racine et aucun compte ni écran de connexion n’est requis.

**Given** une nouvelle session
**When** je sélectionne ChatGPT comme chatbot
**Then** un choix d’abonnement affiche « sans abonnement payant » et « avec abonnement payant ».

**Given** ChatGPT avec l’option « sans abonnement payant » ou « avec abonnement payant »
**When** la sélection est appliquée
**Then** le modèle visible et applicable à toute la conversation est respectivement `gpt-5.6-luna` ou `gpt-5.6-terra`.

**Given** que je sélectionne un chatbot autre que ChatGPT
**When** je consulte le contrôle de modèle
**Then** le choix d’abonnement ChatGPT n’est pas présenté et je peux sélectionner uniquement un modèle appartenant à ce fournisseur dans le catalogue local.

**Given** un modèle absent du catalogue du fournisseur sélectionné
**When** je consulte les options
**Then** ce modèle n’est pas proposé.

**Given** l’interface principale
**When** je consulte la page sans ouvrir les paramètres avancés
**Then** le chatbot, le modèle et la zone de conversation restent visibles.

**Given** toute interaction avec cette story
**When** je ferme puis rouvre la page
**Then** aucun choix ou texte précédent n’est restauré depuis un stockage durable.

**Given** le rendu initial
**When** je navigue au clavier ou sur petit écran
**Then** les contrôles ont des libellés français explicites, un focus visible et restent utilisables sans survol.

### Story 1.2: Composer une conversation en blocs

As a visiteuse,
I want ajouter, modifier et supprimer les échanges de ma conversation,
So that je prépare fidèlement les textes à analyser.

**Acceptance Criteria:**

**Given** une conversation ouverte
**When** j’ajoute un bloc
**Then** il contient des champs distincts et explicitement libellés pour le message, la réponse finale, le raisonnement visible et l’artifact optionnel.

**Given** un ou plusieurs blocs
**When** je modifie l’un de leurs champs
**Then** la modification reste visible dans la session courante et aucun calcul n’est déclenché automatiquement.

**Given** plusieurs blocs
**When** je supprime un bloc renseigné
**Then** il disparaît de la conversation avec ses données de session et son futur résultat ne peut plus contribuer à un total.

**Given** un bloc dont les quatre champs sont vides ou composés uniquement d’espaces
**When** la conversation est préparée pour un futur calcul
**Then** ce bloc est identifié comme ignoré et n’ajoute ni texte, ni historique, ni prompt système, ni impact.

**Given** qu’aucun bloc n’est renseigné
**When** je tente d’utiliser une action de calcul ultérieure
**Then** l’interface m’invite à saisir un échange plutôt que de présenter un impact nul ou calculé.

**Given** les champs de conversation
**When** je saisis ou modifie du texte
**Then** celui-ci reste exclusivement dans la mémoire de session du navigateur et ne figure ni dans une URL, ni dans un journal, ni dans un stockage durable.

**Given** un écran étroit ou une navigation clavier
**When** je gère les blocs
**Then** les champs et actions d’ajout ou suppression restent accessibles sans survol, avec focus visible et libellés associés.

## Epic 2: Estimer l’impact d’un échange

La personne calcule volontairement un bloc et consulte une estimation fiable de son impact individuel, fondée uniquement sur ses textes.

### Story 2.1: Compter localement les textes d’un bloc

As a visiteuse,
I want que les textes de mon bloc soient comptés directement dans mon navigateur,
So that le calcul puisse utiliser mes contenus sans les transmettre à un service externe.

**Acceptance Criteria:**

**Given** un bloc renseigné
**When** le calcul nécessite le nombre de tokens de ses textes
**Then** la tokenisation utilise le tokenizer Tiktoken par défaut emballé localement (`js-tiktoken/lite` avec `o200k_base`), sans CDN, API ni clé.

**Given** une demande de tokenisation
**When** elle est traitée
**Then** elle s’exécute dans un Worker dédié, via un protocole typé comportant un `requestId` et une empreinte du texte et de l’encodage.

**Given** que le texte ou la sélection change pendant une tokenisation
**When** une réponse plus ancienne revient
**Then** le reducer l’ignore et ne l’utilise jamais pour un calcul.

**Given** une erreur structurée du Worker
**When** le compte Tiktoken est indisponible
**Then** le domaine applique le fallback local `nombre de mots / 0,75`, avec segmentation par caractères non alphanumériques.

**Given** un texte vide
**When** il est compté
**Then** il contribue exactement zéro token et l’absence de raisonnement visible ne déclenche aucune estimation de raisonnement caché.

**Given** les textes fournis
**When** le comptage s’exécute ou échoue
**Then** aucun texte ni résultat ne quitte le navigateur via une requête réseau, un journal, analytics ou stockage durable.

**Given** les règles de tokenisation
**When** elles sont implémentées
**Then** elles sont testées dans le domaine et le Worker, sans dépendance à React ni au rendu UI.

### Story 2.2: Reconstituer l’historique et les versions d’artifact

As a visiteuse,
I want que chaque échange prenne en compte le contexte antérieur pertinent sans recompter inutilement mes artifacts,
So that l’estimation reflète ma conversation réelle.

**Acceptance Criteria:**

**Given** un bloc renseigné à l’index `i`
**When** son contexte est reconstruit
**Then** l’historique comprend les messages, raisonnements visibles et réponses finales des blocs renseignés précédents, sans inclure les textes du bloc courant.

**Given** un modèle sélectionné
**When** l’historique de n’importe quel bloc renseigné est établi
**Then** le nombre de tokens de prompt système fourni par le catalogue est ajouté une seule fois au taux cache, y compris pour le premier bloc.

**Given** un premier artifact non vide
**When** son bloc est préparé
**Then** sa version complète est comptée en sortie et devient la dernière version complète de référence.

**Given** une version ultérieure d’artifact
**When** elle diffère de la dernière version complète
**Then** seuls les passages ajoutés ou modifiés sont comptés en sortie et les passages inchangés ne le sont pas une seconde fois.

**Given** deux versions identiques
**When** la seconde est traitée
**Then** elle ajoute zéro token de sortie au titre de l’artifact.

**Given** un artifact vide dans un bloc ultérieur
**When** l’historique des blocs suivants est préparé
**Then** il ne supprime pas la dernière version complète disponible.

**Given** l’historique d’un bloc
**When** une version d’artifact antérieure existe
**Then** une seule dernière version complète est incluse et les versions précédentes comme leurs diffs ne sont jamais cumulés.

**Given** ces règles
**When** elles sont exécutées
**Then** elles résident dans le domaine pur, déterministe et testé, indépendamment de React, du Worker et du catalogue concret.

### Story 2.3: Calculer et afficher l’impact d’un bloc

As a visiteuse,
I want déclencher le calcul d’un échange et en consulter les impacts estimés,
So that je comprends l’empreinte de ce message sans recalculer toute ma conversation.

**Acceptance Criteria:**

**Given** un bloc renseigné
**When** je déclenche son action « Calculer »
**Then** seuls ce bloc, ses comptes locaux et son historique reconstruit sont traités et aucun autre bloc n’est calculé implicitement.

**Given** des blocs précédents non calculés
**When** je calcule un bloc ultérieur
**Then** son historique textuel est tout de même reconstruit et son calcul peut aboutir.

**Given** les comptes d’entrée nouvelle, cache et sortie disponibles
**When** le calcul est lancé
**Then** le domaine pur applique les paramètres résolus et les formules de référence pour produire énergie, carbone et eau, sans arrondir les valeurs de calcul.

**Given** un catalogue local de référence
**When** le calcul utilise des données modèle, tarifaires ou environnementales
**Then** ces données sont typées, immuables en session, versionnées, datées et associées à leur provenance.

**Given** un résultat valide
**When** il est affiché
**Then** énergie, eau et carbone sont présentés comme des estimations, avec unités cohérentes et arrondi d’affichage à quatre chiffres significatifs.

**Given** la présentation d’un résultat
**When** je le consulte
**Then** une mention visible indique l’incertitude des hypothèses et le périmètre usage, hors fabrication, amortissement et Scope 3.

**Given** une donnée indispensable absente ou une valeur numérique invalide
**When** le calcul est demandé
**Then** aucun résultat n’est présenté comme calculé et un message explicite explique le blocage.

**Given** un résultat affiché
**When** je modifie un texte ou les paramètres utilisés ultérieurement
**Then** aucun recalcul automatique n’est déclenché.

## Epic 3: Obtenir un bilan valide de la conversation

La personne calcule tous ses échanges, consulte le total énergie/eau/carbone et comprend les recalculs nécessaires après une modification.

### Story 3.1: Calculer tous les échanges et leur bilan

As a visiteuse,
I want calculer tous les blocs renseignés de ma conversation en une action,
So that j’obtiens leur impact individuel et un bilan global cohérent.

**Acceptance Criteria:**

**Given** une conversation contenant des blocs renseignés et vides
**When** je déclenche « Tout calculer »
**Then** chaque bloc renseigné est calculé dans l’ordre, les blocs entièrement vides sont ignorés et aucun impact ne leur est attribué.

**Given** un calcul global abouti
**When** j’affiche les résultats
**Then** chaque bloc renseigné possède ses estimations énergie, eau et carbone et le total additionne les valeurs non arrondies de ces résultats.

**Given** les formules d’impact
**When** l’énergie est calculée
**Then** le PUE du pays d’hébergement et du fournisseur est appliqué exactement une fois à l’énergie informatique, sans PUE générique supplémentaire.

**Given** l’énergie datacenter d’un bloc
**When** le carbone et l’eau sont dérivés
**Then** ils réutilisent cette même énergie, dans les unités gCO2e et litres, et l’eau couvre uniquement la consommation sur site.

**Given** un total disponible
**When** le bilan est présenté après un calcul complet
**Then** il affiche énergie, carbone, eau, équivalence douche et recommandations, sans indicateur de risque de sécheresse.

**Given** un affichage de résultats individuels
**When** je consulte l’eau
**Then** aucune équivalence comparative de volume d’eau n’est affichée.

**Given** qu’aucun bloc n’est renseigné
**When** je déclenche « Tout calculer »
**Then** l’interface m’invite à saisir un échange et ne présente pas de bilan environnemental calculé.

**Given** l’exécution du calcul global
**When** elle se termine
**Then** les calculs et agrégations restent dans le navigateur, sans stockage durable ni transmission de contenus.

### Story 3.2: Identifier les résultats périmés et recalculer le total

As a visiteuse,
I want savoir quels résultats ne sont plus valides et recalculer seulement le total lorsque c’est possible,
So that je n’interprète jamais un bilan obsolète.

**Acceptance Criteria:**

**Given** un résultat de bloc calculé
**When** un texte de ce bloc est ajouté ou modifié
**Then** son résultat devient périmé et les résultats des blocs suivants dépendant de son historique ou de son artifact deviennent eux aussi périmés.

**Given** un bloc renseigné supprimé
**When** la suppression est confirmée
**Then** les résultats des blocs suivants qui en dépendent sont périmés et le total précédemment affiché cesse d’être présenté comme actuel.

**Given** l’ajout ou la suppression d’un bloc entièrement vide
**When** l’opération est réalisée
**Then** aucun résultat existant ne devient périmé.

**Given** une valeur ou sélection utilisée par le calcul qui change
**When** l’état est mis à jour
**Then** les résultats dépendants sont marqués périmés sans qu’un calcul soit lancé automatiquement.

**Given** des résultats de blocs périmés ou jamais calculés
**When** je demande le recalcul du total
**Then** l’interface indique les blocs concernés et ne calcule implicitement aucun bloc ni total incomplet.

**Given** tous les blocs renseignés avec un impact à jour
**When** je déclenche « Recalculer le total »
**Then** l’énergie, l’eau et le carbone sont agrégés depuis les résultats existants sans relancer leurs calculs d’impact.

**Given** l’état applicatif
**When** fraîcheur et dépendances sont déterminées
**Then** elles sont dérivées d’empreintes canoniques `impactFingerprint` et `showerFingerprint`, sans dépendre de l’ordre de rendu React.

## Epic 4: Ajuster les hypothèses et comprendre les résultats

La personne adapte les références de sa session, restaure les valeurs par défaut et interprète les impacts grâce à l’équivalence douche et aux conseils de sobriété.

### Story 4.1: Choisir le pays d’hébergement et gérer les données manquantes

As a visiteuse,
I want consulter et modifier le pays d’hébergement de référence dans les paramètres avancés,
So that j’adapte les facteurs environnementaux appliqués à ma conversation.

**Acceptance Criteria:**

**Given** un chatbot et un modèle sélectionnés
**When** j’ouvre les paramètres avancés
**Then** le pays d’hébergement de référence défini par le fournisseur est affiché et utilisé par défaut.

**Given** les paramètres avancés
**When** je choisis un autre pays d’hébergement valide
**Then** ce pays s’applique à tous les blocs de la conversation pour l’énergie, le carbone et l’eau.

**Given** une modification du pays d’hébergement
**When** elle est appliquée
**Then** les impacts et le total qui en dépendent deviennent périmés sans calcul automatique.

**Given** le pays d’hébergement
**When** je le modifie
**Then** il reste distinct du pays utilisateur utilisé ultérieurement pour l’équivalence douche.

**Given** qu’un facteur environnemental est absent pour le pays retenu
**When** un calcul nécessite ce facteur
**Then** la valeur « Monde » du même facteur est utilisée et ce repli est signalé avec le résultat concerné.

**Given** qu’un facteur est disponible avec la valeur numérique zéro
**When** il est résolu
**Then** zéro est conservé comme valeur valide et n’est pas remplacé par « Monde ».

**Given** que le facteur « Monde » requis, une donnée catalogue indispensable ou une surcharge valide manque
**When** un résultat dépendant est demandé
**Then** ce résultat est bloqué par un message explicite et aucune valeur inventée n’est affichée.

**Given** les catalogues de référence
**When** un pays, un facteur ou un risque est résolu
**Then** la résolution suit la clé normalisée, la valeur pays, le repli Monde du même facteur puis la surcharge de session, sans muter les catalogues.

### Story 4.2: Personnaliser et restaurer les paramètres de calcul

As a visiteuse,
I want ajuster temporairement les hypothèses de calcul et pouvoir revenir aux références,
So that j’explore leur effet sans modifier les données publiées ni perdre ma conversation.

**Acceptance Criteria:**

**Given** les paramètres avancés
**When** je les ouvre
**Then** je peux consulter et modifier, avec noms et unités, les paramètres modèle, énergie et latence, matériel, batch, ratios de tokens, facteurs environnementaux, conversion mots-tokens et référence douche.

**Given** les paramètres avancés
**When** je consulte les réglages
**Then** le nombre de tokens du prompt système n’est ni affiché ni modifiable et il provient exclusivement du catalogue.

**Given** une modification de paramètre d’impact valide
**When** je l’applique
**Then** elle s’applique à toute la conversation, reste uniquement en mémoire de session et rend périmés les impacts et totaux dépendants, sans lancer de calcul.

**Given** une modification limitée aux paramètres de douche
**When** je l’applique
**Then** seuls les résultats d’équivalence concernés deviennent périmés et les impacts énergie, eau et carbone restent valides.

**Given** une valeur saisie non numérique, infinie, hors domaine, un diviseur non positif, un PUE inférieur à 1 ou des paramètres actifs supérieurs aux paramètres totaux
**When** je tente de calculer
**Then** l’erreur est associée au champ et le résultat dépendant est bloqué.

**Given** les paramètres de douche ajustables
**When** débit, températures ou énergie par litre sont modifiés
**Then** l’énergie par litre est dérivée des températures selon `énergie_kWh = (masse_eau_g × capacité_thermique_spécifique_J/g°C × delta_T_°C) / coefficient_conversion_J/kWh`, avec la masse déduite du volume d’eau, et aucune valeur contradictoire ne peut être conservée.

**Given** des surcharges de session
**When** je clique « Rétablir les valeurs par défaut »
**Then** les références applicables au chatbot et modèle courants sont restaurées, tandis que mes textes, blocs, chatbot et modèle restent inchangés.

**Given** une restauration
**When** elle modifie une valeur effectivement surchargée
**Then** seuls les résultats qui en dépendent deviennent périmés et aucun calcul n’est lancé automatiquement.

### Story 4.3: Interpréter le carbone par une durée de douche locale

As a visiteuse,
I want comparer le carbone estimé à une durée de douche chaude adaptée à mon pays,
So that je dispose d’un repère concret pour l’estimation.

**Acceptance Criteria:**

**Given** une nouvelle session
**When** le pays utilisateur est proposé
**Then** il est déterminé sans donnée externe, par table locale fuseau IANA vers pays probable, puis région de la locale navigateur, puis « Monde ».

**Given** un pays utilisateur proposé
**When** je le consulte
**Then** il est qualifié d’indicatif, visible et corrigeable manuellement dans les paramètres avancés.

**Given** un carbone de bloc ou de total valide
**When** l’équivalence est calculée
**Then** elle utilise exclusivement le facteur d’émission du pays utilisateur et les paramètres de douche électrique retenus, sans utiliser le pays d’hébergement.

**Given** le pays utilisateur ou les paramètres de douche
**When** je les modifie
**Then** seule l’équivalence concernée devient périmée, sans modifier énergie, eau ni carbone.

**Given** un facteur d’émission utilisateur absent
**When** l’équivalence est calculée
**Then** le repli « Monde » du même facteur est utilisé et signalé.

**Given** une référence douche avec émissions par minute nulles
**When** une équivalence est demandée
**Then** la durée est affichée comme non calculable, sans division par zéro ni durée infinie.

**Given** une équivalence valide
**When** je consulte les résultats
**Then** elle est présentée comme une estimation de durée de douche, tandis que l’eau reste affichée sans comparaison de volume.

**Given** un total dont seul le pays utilisateur ou les paramètres de douche ont changé
**When** je déclenche « Recalculer le total »
**Then** son équivalence est actualisée depuis le carbone valide sans recalculer les impacts des blocs.

### Story 4.4: Découvrir des bonnes pratiques de sobriété

As a visiteuse,
I want consulter des conseils simples après mes résultats,
So that je retiens des gestes pour réduire l’impact de mes prochains usages.

**Acceptance Criteria:**

**Given** que des résultats de calcul sont consultables
**When** je parcours la zone de résultats
**Then** une liste de bonnes pratiques est accessible après ces résultats.

**Given** cette liste
**When** elle est affichée
**Then** elle traite au minimum : choisir un petit modèle, éviter de faire raisonner le modèle, réduire les tokens entrants et sortants, relancer une conversation lorsque le contexte n’est plus nécessaire, et éditer un message plutôt que d’en renvoyer un lorsque pertinent.

**Given** les conseils
**When** je les lis
**Then** ils sont identiques pour toutes les visiteuses, non personnalisés par ma conversation, et peuvent être enrichis ultérieurement.

**Given** un conseil qui évoque tokens, raisonnement, relance ou édition
**When** il est présenté
**Then** son vocabulaire est compréhensible pour une personne non technique et ne confond pas l’absence de raisonnement collé avec une désactivation du raisonnement du chatbot.

**Given** le contenu pédagogique
**When** il est rendu
**Then** il ne promet ni gain chiffré, ni économie systématique, notamment pour l’édition d’un message.

**Given** l’interface française initiale
**When** ces textes sont intégrés
**Then** ils proviennent de messages séparés des règles métier afin de permettre leur traduction ultérieure.

**Given** une navigation clavier ou mobile
**When** je consulte les conseils
**Then** ils restent accessibles sans survol et avec une structure lisible.

**Given** un résultat périmé
**When** il est rendu
**Then** son état est signalé sans reposer uniquement sur la couleur et sa valeur n’est jamais présentée comme actuelle.

## Epic 6: Aligner le calculateur sur l’expérience Canopée claire

La personne choisit dès l’accueil la saisie ou le copier/coller manuel, corrige le modèle proposé, suit sa conversation dans un fil compact et comprend des estimations par échange et un bilan lisibles et accessibles. Les stories précédentes restent la trace des versions livrées ; les critères de l’epic 6 définissent le parcours publié.

### Story 6.1: Choisir son parcours et son modèle de référence

En tant que personne qui veut estimer une conversation déjà tenue,
je veux commencer par copier/coller ou saisir manuellement ma conversation, puis vérifier et modifier le modèle proposé,
afin de commencer avec des hypothèses adaptées à ma conversation.

**Critères d’acceptation :**

**Étant donné** une nouvelle session,
**quand** la page s’ouvre,
**alors** l’accueil présente un seul bouton pour commencer par copier/coller ou saisir manuellement la conversation. (FR-16, UX-DR1, UX-DR2)

**Étant donné** la saisie manuelle,
**quand** la personne choisit un chatbot,
**alors** le parcours propose un modèle de référence de ce chatbot et permet de choisir directement tout autre modèle valide de son catalogue ; la référence est présentée comme une estimation modifiable. (FR-2, UX-DR3)

**Étant donné** ChatGPT,
**quand** la personne précise si elle dispose d’un abonnement payant,
**alors** le modèle de référence proposé est respectivement `gpt-5.6-terra` ou `gpt-5.6-luna` ; elle peut ensuite le remplacer. (FR-1)

**Étant donné** Mistral,
**quand** la personne précise si sa conversation était en mode « rapide » ou « réflexion »,
**alors** le modèle de référence proposé est respectivement `mistral-small` ou `mistral-large` ; elle peut ensuite le remplacer. Les correspondances sont centralisées et les deux modèles résolvent leur pays et leurs facteurs avant publication. (FR-2, AD-5, D-1)

**Étant donné** des textes déjà saisis,
**quand** la personne revient à une étape précédente ou change de chatbot, de type d’abonnement, de mode ou de modèle,
**alors** les textes restent présents, les résultats dépendants deviennent périmés et aucun calcul ne démarre. (FR-13, FR-16, AD-3)


### Story 6.2: Suivre les échanges et leurs estimations

En tant que personne qui reconstitue une conversation,
je veux relire mes échanges dans un fil compact et calculer chacun à ma demande,
afin de voir le carbone et l’eau estimés près des textes concernés.

**Critères d’acceptation :**

**Étant donné** une conversation contenant plusieurs échanges,
**quand** son fil est affiché,
**alors** les échanges sont ordonnés ; les anciens se replient en cartes montrant un aperçu, un état textuel et, si le résultat est actuel, le carbone et l’eau. La commande annonce « Déplier » ou « Replier » avec `aria-expanded` et l’éditeur courant reste ouvert. (FR-16, UX-DR4)

**Étant donné** l’éditeur courant,
**quand** la personne saisit ou consulte un échange,
**alors** la question précède la réponse et le raisonnement visible, le document ou code généré et les fichiers source texte sont regroupés comme contenus facultatifs avec des libellés compréhensibles. (FR-14, UX-DR5, UX-DR15)

**Étant donné** au moins un texte utile dans un échange,
**quand** la personne actionne « Calculer cet échange »,
**alors** seul cet échange est calculé, même si un précédent n’a pas de résultat ; un échange vide est ignoré et l’interface explique pourquoi il ne peut pas être calculé. Aucun calcul ne démarre au collage ou à la modification. (FR-10, FR-21, UX-DR5)

**Étant donné** un échange calculé et actuel,
**quand** son résultat est affiché,
**alors** seuls le carbone et l’eau sont présentés près des textes, avec leurs unités et une mention d’estimation ; l’électricité et l’équivalence douche ne figurent pas sur cette carte. (FR-10, FR-22, UX-DR6)

**Étant donné** le fil actif,
**quand** la personne ajoute un échange,
**alors** l’échange précédent se replie et le focus va à la nouvelle question ; après suppression, le focus va à une carte voisine ou à « Ajouter un échange », et les autres textes restent présents. (FR-14, UX-DR12)

**Étant donné** des résultats d’échanges et un bilan existants,
**quand** la personne modifie ou supprime un échange renseigné,
**alors** les résultats de cet échange et des suivants qui dépendent de son historique ou de son artifact deviennent périmés ; chaque carte concernée le dit et propose le recalcul, aucun bilan dépendant n’est présenté comme actuel et aucun calcul ne démarre seul. (FR-13, FR-14, UX-DR6)

**Étant donné** une erreur de calcul ou un facteur de repli,
**quand** l’état est affiché,
**alors** un message près du résultat concerné l’explique, conserve les textes et ne déplace pas le focus de façon inattendue. (FR-22, FR-23, UX-DR6)

### Story 6.4: Lire le bilan et ajuster les hypothèses

En tant que personne qui a saisi une conversation,
je veux consulter un bilan compréhensible et corriger mes hypothèses,
afin de savoir ce que les estimations couvrent et quand les recalculer.

**Critères d’acceptation :**

**Étant donné** une conversation avec des échanges renseignés,
**quand** la personne actionne « Calculer toute la conversation »,
**alors** ces échanges sont calculés explicitement et un bilan valide présente carbone, eau, électricité, équivalence carbone en durée de douche et recommandations. L’équivalence ne compare pas les volumes d’eau. (FR-5, FR-6, FR-11, FR-22, FR-24, UX-DR7)

**Étant donné** des résultats d’échanges actuels, manquants ou périmés,
**quand** la personne actionne « Recalculer le total »,
**alors** seuls les résultats actuels sont réutilisés, sans calcul d’échange ; si un résultat manque ou est périmé, le bilan indique « total incomplet », nomme les échanges concernés et donne accès à leurs cartes, sans afficher d’ancien total comme actuel. (FR-12, FR-13, UX-DR7)

**Étant donné** le panneau avancé ouvert depuis le fil ou le bilan,
**quand** la personne voit, modifie, applique ou restaure les paramètres autorisés, dont les pays distincts,
**alors** les champs invalides portent une erreur associée ; les textes, le chatbot et le modèle restent présents, une annonce unique indique les résultats à recalculer et aucun calcul ne démarre. Un changement limité à la douche ne périme que l’équivalence. (FR-15, FR-17, FR-18, UX-DR8)

**Étant donné** une valeur d’impact ou de durée à présenter,
**quand** le formateur partagé choisit une unité selon `EXPERIENCE.md`,
**alors** le carbone, l’eau, l’électricité et la durée de douche utilisent au plus trois chiffres significatifs, une virgule française et une unité adaptée ; zéro, sous-seuil, bascule d’unité après arrondi et dépassement de l’unité maximale sont traités. Les totaux partent des valeurs internes non arrondies et chaque unité abrégée a un nom accessible complet. (FR-22, AD-9, UX-DR13)

**Étant donné** les résultats ou une donnée indisponible,
**quand** la personne lit le bilan ou les cartes,
**alors** l’incertitude, le périmètre d’usage hors Scope 3, les replis « Monde » et les indisponibilités sont expliqués près des résultats concernés ; les conseils restent compréhensibles et ne font pas passer une estimation pour une mesure. (FR-6, FR-22, FR-23, UX-DR15)

**Étant donné** les surfaces accueil, choix du modèle, fil et bilan,
**quand** elles sont parcourues au clavier, à 320 px et aux zooms 200 %/400 %,
**alors** elles suivent `DESIGN.md` et `EXPERIENCE.md` : états lisibles sans couleur seule, focus visible, cibles d’au moins 44 × 44 px, aucun contrôle tronqué ou réservé au survol, et respect de `prefers-reduced-motion`. (NFR-1, NFR-7, UX-DR1, UX-DR2, UX-DR14)

**Étant donné** la validation de l’epic,
**quand** le parcours manuel est vérifié,
**alors** les scénarios couvrent la péremption, la restauration, les valeurs représentatives et extrêmes du formatage, ainsi que le focus et les annonces aux transitions. (NFR-7, UX-DR12, UX-DR13)


## Epic 7: Parcours grand public simplifié

Une personne non technique atteint un résultat lisible en trois étapes, sans ouvrir le Mode avancé. Un seul « Calculer » affiche la douche en grand, des comparaisons du quotidien et une bonne pratique ; elle peut partager le résultat sans révéler sa conversation. Les stories des epics 1 à 6 restent la trace des versions livrées ; les critères de l’epic 7 définissent le parcours publié.

### Story 7.1: Commencer simplement et se repérer dans le parcours

En tant que personne non technique qui découvre le calculateur,
je veux comprendre en une phrase à quoi il sert, commencer d’un clic et toujours savoir où j’en suis,
afin d’arriver au résultat sans me demander quoi faire.

**Critères d’acceptation :**

**Étant donné** une nouvelle session,
**quand** la page s’ouvre,
**alors** l’accueil affiche une seule phrase d’introduction et un bouton « Commencer », sans carte intermédiaire, sans « ou » et sans paramètre. Le texte d’introduction n’apparaît plus ensuite. (FR-16, NFR-8, UX-DR16)

**Étant donné** l’accueil,
**quand** la personne active « Commencer »,
**alors** l’étape « Étape 1/3 : Votre IA » s’affiche avec une phrase de justification. Le titre reçoit le focus et l’étape est annoncée. L’indicateur est textuel : il ne repose pas sur une barre colorée. (FR-16, UX-DR17)

**Étant donné** l’étape 2/3,
**quand** la personne active « Retour » (libellé et icône décorative, en haut à gauche au-dessus du titre, cible d’au moins 44 × 44 px),
**alors** elle revient à l’étape 1/3 sans perdre les textes saisis. (FR-16, UX-DR18)

**Étant donné** l’accueil,
**quand** il est affiché,
**alors** un lien libellé « Méthodologie » est présent sous le bouton « Commencer » ; il est absent des autres écrans. Il n’y a ni bouton « ? » seul ni tutoriel. (UX-DR28)

**Étant donné** la page de méthodologie,
**quand** elle s’ouvre,
**alors** un « Retour » libellé figure tout en haut, au-dessus d’un seul titre principal. Il ramène à l’accueil. (UX-DR28)

**Étant donné** une étape portant une action principale (« Continuer » ou « Calculer »),
**quand** elle est affichée,
**alors** l’action est portée par une barre d’action collante en bas de l’écran. La barre devient statique à fort zoom, en hauteur réduite ou avec clavier logiciel ouvert. Elle ne masque jamais l’élément en focus, grâce à `scroll-padding`. Elle reste utilisable au clavier. (NFR-1, NFR-7, UX-DR19)

**Étant donné** les textes de `fr.ts` concernés,
**quand** ils sont relus,
**alors** les coquilles relevées par l’audit sont corrigées (« entraiment », « conscis », « denrière », « promett », « et et », « A chaque »). Aucune action n’est portée par une icône seule. (NFR-8, UX-DR30)

**Étant donné** l’accueil et le début du parcours,
**quand** ils sont parcourus au clavier, à 320 px, en zoom 200 % et 400 %,
**alors** aucune action n’est perdue ni tronquée, et `prefers-reduced-motion` est respecté. (NFR-7, UX-DR30)

### Story 7.2: Choisir son IA et régler ses hypothèses sans se perdre

En tant que personne qui a utilisé un chatbot,
je veux que le calculateur déduise un modèle et mon pays, et que je puisse tout corriger dans des sections repliées,
afin de continuer sans comprendre les paramètres techniques.

**Critères d’acceptation :**

**Étant donné** l’étape 1/3,
**quand** la personne choisit un chatbot et son abonnement ou mode,
**alors** le modèle de référence est affiché sous la forme « Modèle estimé : … » avec un lien « Modifier ». Elle peut choisir tout autre modèle valide du catalogue. (FR-1, FR-2, FR-16, UX-DR20)

**Étant donné** une session,
**quand** l’étape 1/3 s’affiche,
**alors** le pays de la personne est déduit de la région de la langue du navigateur, sinon « Monde ». Il est présenté comme une estimation avec « Modifier », sans géolocalisation. Les libellés sont « Où vous vous trouvez (pour la comparaison douche) » et « Où est hébergée l’IA (pour le CO₂) ». (FR-5, AD-6, UX-DR20)

**Étant donné** l’étape 1/3,
**quand** elle est affichée,
**alors** le « Mode avancé » est replié sous le choix du modèle. Il contient le pays de la personne, le débit de douche, les températures de l’eau froide et de la douche, et la puissance de l’ampoule LED. Le « Mode expert » est replié à l’intérieur, avec retrait visible et son propre libellé de dépliage. Il contient le pays d’hébergement, l’intensité carbone, les paramètres totaux et activés, le PUE, le WUE et le reste. Il ne s’affiche jamais hors du Mode avancé. (FR-15, FR-17, UX-DR21)

**Étant donné** des paramètres modifiés,
**quand** la personne active « Continuer »,
**alors** les valeurs valides sont appliquées, sans bouton « Appliquer » et sans calcul. Les résultats dépendants deviennent « à recalculer » et une seule annonce le dit. Une modification limitée à la douche ou à la LED ne périme que l’équivalence. Le prompt système n’est jamais affiché ni modifiable. (FR-17, FR-20, UX-DR21)

**Étant donné** un champ invalide,
**quand** la personne tente de continuer,
**alors** « Continuer » est désactivé avec une explication, le message est lié au champ et le focus va à la première erreur. Les unités sont indiquées. (NFR-6, UX-DR21)

**Étant donné** des paramètres modifiés,
**quand** la personne active « Rétablir les valeurs par défaut » (lien discret du Mode avancé),
**alors** les valeurs de référence applicables au modèle sont rétablies. Les textes, le chatbot et le modèle sont conservés et aucun calcul ne démarre. (FR-18)

**Étant donné** un facteur environnemental manquant,
**quand** le repli « Monde » est utilisé,
**alors** il est signalé près du champ ou du résultat concerné, sans changer silencieusement le pays choisi. (FR-23, UX-DR26)

**Étant donné** « PUE », « WUE » et « tokens »,
**quand** la personne cherche leur sens,
**alors** une explication courte est disponible à la demande, et chaque champ du Mode expert explique son effet. (NFR-8, UX-DR22)

### Story 7.3: Saisir sa conversation et la calculer d’un seul clic

En tant que personne qui reconstitue sa conversation,
je veux coller mes questions et réponses avec des libellés clairs et lancer un seul « Calculer »,
afin d’obtenir carbone et eau pour chaque échange sans me demander quel bouton choisir.

**Critères d’acceptation :**

**Étant donné** l’étape 2/3,
**quand** elle s’affiche,
**alors** les libellés sont « Collez ici votre message » et « Collez ici la réponse de l’IA ». Les options sont « Réflexion affichée par l’IA (optionnel) », « Contenu du fichier créé par l’IA (optionnel) » et « Fichiers que vous avez joints ». Les champs vides n’affichent aucun avertissement. Chaque action porte un libellé visible : « Ajouter une question / réponse », « Déplier » et « Replier ». (FR-14, NFR-8, UX-DR22)

**Étant donné** une carte de question / réponse,
**quand** elle est repliée,
**alors** son en-tête montre le numéro, l’aperçu et l’état « ✓ » ou « à recalculer » en texte avec pictogramme. Les valeurs carbone et eau apparaissent si l’estimation est à jour. La commande dit « Déplier la question / réponse N » ou « Replier… », avec `aria-expanded` et `aria-controls`. Elle ne porte aucune action de calcul. (FR-22, UX-DR23)

**Étant donné** au moins un échange renseigné,
**quand** la personne active « Calculer » (action unique de la barre collante),
**alors** tous les échanges renseignés sont calculés, les blocs vides sont ignorés, et cartes, total et résultat sont mis à jour ensemble. L’interface est verrouillée pendant le calcul et l’état est annoncé près de l’action. (FR-12, FR-21, UX-DR24)

**Étant donné** aucun échange renseigné ou un paramètre invalide,
**quand** la barre d’action est affichée,
**alors** « Calculer » est indisponible avec une explication, et aucun résultat n’est présenté comme calculé. (FR-12, UX-DR24)

**Étant donné** le code existant,
**quand** l’epic est livré,
**alors** le calcul par échange, le bouton « Calculer cet échange uniquement » et le recalcul du seul total n’existent plus dans l’interface, le reducer et l’application. Le moteur de calcul, la tokenisation, l’historique et les formules sont inchangés. (FR-12)

**Étant donné** des résultats existants,
**quand** la personne modifie ou supprime un échange renseigné, ou change un paramètre, le modèle ou le chatbot,
**alors** les cartes dépendantes passent à « à recalculer », leurs anciennes valeurs sont retirées ou clairement inutilisables, aucun calcul ne démarre, et une annonce concise indique le changement. (FR-12, FR-14, FR-22, UX-DR26)

**Étant donné** l’ajout ou la suppression d’un échange,
**quand** l’action est faite,
**alors** l’échange précédent se replie et le focus va à la question de la nouvelle carte. Après suppression, le focus va à la carte voisine ou à « Ajouter une question / réponse ». La suppression passe par le seul dialogue modal du parcours : fond inerte, focus restitué. (FR-14, UX-DR12, UX-DR29)

**Étant donné** une erreur de calcul,
**quand** elle survient,
**alors** un message près de l’action l’explique, les textes sont conservés, et le focus n’est pas déplacé de façon inattendue. (NFR-6, UX-DR24)

### Story 7.4: Lire un résultat clair sous la conversation

En tant que personne qui vient de calculer,
je veux voir immédiatement une comparaison parlante, puis les valeurs et une bonne pratique,
afin de comprendre l’ordre de grandeur de ma conversation.

**Critères d’acceptation :**

**Étant donné** le premier « Calculer » réussi,
**quand** il aboutit,
**alors** une section résultat s’ajoute sous la conversation, sans nouvel écran, et son titre reçoit le focus. Avant cela, la section n’existe pas. (FR-16, FR-22, UX-DR24)

**Étant donné** un résultat à jour,
**quand** il est affiché,
**alors** l’équivalence carbone en durée de douche chaude, calculée avec le facteur du pays de la personne, est en `metric-hero`, avec l’unité complète en nom accessible. Viennent ensuite carbone, eau et électricité en `metric`, avec unités adaptées. L’eau ne fait l’objet d’aucune comparaison. (FR-5, FR-22, UX-DR25)

**Étant donné** l’électricité non arrondie,
**quand** le résultat est calculé,
**alors** la durée d’ampoule LED vaut `E_total / P_LED`, avec 5 W par défaut, en unité adaptée (ms à j). Une puissance nulle ou négative affiche « comparaison non calculable », sans division par zéro ni durée infinie. Modifier la puissance ne périme que cette équivalence. (FR-25, AD-5, UX-DR26)

**Étant donné** le résultat,
**quand** la phrase d’interprétation est affichée,
**alors** c’est le message fixe « Une conversation pèse peu, mais ça s’additionne : 100 conversations comme celle-ci ont un impact plus conséquent. » Elle n’est jamais choisie ni qualifiée selon la valeur, ne promet aucun gain, et le multiplicateur est présenté comme une convention d’illustration. (FR-25, AD-9)

**Étant donné** le formateur d’unités partagé,
**quand** une valeur est présentée,
**alors** il applique trois chiffres significatifs au plus, la virgule française et les séries d’unités de `EXPERIENCE.md`, durée LED comprise. Zéro, sous-seuil, bascule après arrondi et dépassement de l’unité maximale sont traités. Chaque unité abrégée a un nom accessible complet. Les totaux partent des valeurs non arrondies. (FR-22, AD-9, UX-DR13)

**Étant donné** le résultat,
**quand** il est affiché,
**alors** le périmètre est formulé ainsi : « Ne compte que l’électricité des serveurs, pas la fabrication du matériel ni l’entraînement de l’IA », avec « En savoir plus » menant aux détails (Scope 2/3). Une mention visible précise que l’estimation repose sur des hypothèses et non sur une mesure. (FR-22, NFR-8)

**Étant donné** le résultat,
**quand** il est affiché,
**alors** une seule bonne pratique est tirée au sort localement. Le tirage est injectable dans les tests et stable pour un même résultat (pas de nouveau tirage au re-rendu). Le lien « Voir toutes les bonnes pratiques » pointe vers une cible externe configurable : tant qu’elle n’est pas renseignée, un état explicite évite un lien mort. Le conseil ne promet aucun gain chiffré. (FR-6, UX-DR27)

**Étant donné** un résultat devenu périmé,
**quand** une entrée ou un paramètre change,
**alors** la section résultat affiche « à recalculer » et ses anciennes valeurs sont retirées. Aucun total ancien ou incomplet n’est présenté comme actuel. (FR-12, FR-22, UX-DR26)

**Étant donné** un pays de la personne non déduit,
**quand** le résultat est affiché,
**alors** le pays de repli est présenté comme une estimation corrigeable, et seul le comparatif douche en dépend. (FR-5, FR-23, UX-DR26)

**Étant donné** la section résultat,
**quand** elle est parcourue au clavier, à 320 px et en zoom 200 % et 400 %,
**alors** l’ordre de lecture suit l’ordre visuel, aucune métrique n’est tronquée et aucun statut ne repose sur la couleur seule. (NFR-7, UX-DR30)

### Story 7.5: Partager son résultat sans partager sa conversation

En tant que personne qui veut en parler autour d’elle,
je veux partager mon résultat en un bouton,
afin d’envoyer un texte clair sans exposer le contenu de mes échanges.

**Critères d’acceptation :**

**Étant donné** un résultat valide et à jour,
**quand** la section résultat est affichée,
**alors** un unique bouton « Partager » (contour `border-interactive`, icône décorative et texte visibles) apparaît, moins saillant que l’action principale. (FR-26, UX-DR27)

**Étant donné** un résultat périmé, un calcul en erreur ou aucun résultat,
**quand** la page est affichée,
**alors** le bouton « Partager » n’est pas proposé. (FR-26, UX-DR26)

**Étant donné** la projection fermée `ShareableResult`,
**quand** le texte est produit par la fonction pure,
**alors** il ne contient que le chatbot, le nombre d’échanges, l’équivalence douche, les valeurs principales avec unités, la mention d’estimation et l’adresse de la page, sans requête ni fragment. Aucun message, réponse, raisonnement, contenu ou nom de fichier, paramètre de session ni résultat encodé n’y figure. Un test le vérifie sur une conversation contenant des marqueurs identifiables. (FR-26, AD-10, NFR-3)

**Étant donné** un navigateur offrant le partage du système,
**quand** la personne active « Partager »,
**alors** le partage système s’ouvre avec ce texte. Annuler le partage n’est pas une erreur. (FR-26, AD-10)

**Étant donné** un navigateur sans partage du système,
**quand** la personne active « Partager »,
**alors** le texte est copié dans le presse-papiers et « Résultat copié. » est annoncé en texte. Si la copie échoue, un message l’explique et propose une action de suite. Le retour ne dépend pas de la couleur seule. (FR-26, UX-DR27)

**Étant donné** l’action de partage,
**quand** elle s’exécute,
**alors** aucun appel réseau, analytics ni stockage n’est ajouté, et rien n’est déclenché sans action explicite. (NFR-3, AD-10)

**Étant donné** la validation de l’epic 7,
**quand** le parcours est vérifié,
**alors** les scénarios couvrent : accueil, trois étapes, Mode avancé et Mode expert, « Calculer » unique, péremption, restauration, LED non calculable, tirage de la bonne pratique, partage avec et sans partage système, clavier, 320 px, zoom 200 % et 400 %. (NFR-7, UX-DR30)
