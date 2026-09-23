---
title: Epics et stories — Calculateur d’empreinte environnementale des LLM
status: final
created: 2026-09-18
updated: 2026-09-23
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
inputDocuments:
  - prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
  - ../specs/spec-ai-env-impact-calculator/SPEC.md
  - ../specs/spec-ai-env-impact-calculator/functional-contract.md
  - ../specs/spec-ai-env-impact-calculator/calculation-contract.md
  - sprint-change-proposal-2026-09-19.md
  - sprint-change-proposal-2026-09-20.md
  - ../specs/spec-import-chatgpt-share/SPEC.md
  - ../specs/spec-import-chatgpt-share/import-contract.md
  - ../specs/spec-import-chatgpt-share/stories/4-consentement-informe-avant-import-distant.md
  - ../specs/spec-import-chatgpt-share/stories/5-passerelle-proxy-tiers-bornee-et-allowlistee.md
  - ../specs/spec-import-chatgpt-share/stories/6-documenter-et-verifier-la-frontiere-d-import-distant.md
  - sprint-change-proposal-2026-09-23.md
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/DESIGN.md
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md
---

# Calculateur d’empreinte environnementale des LLM — Epic Breakdown

## Overview

Ce document conserve les epics 1 à 5 comme trace des versions livrées et prépare l’epic 6 issu de la proposition de changement approuvée le 23 septembre 2026. Pour l’epic 6, le PRD, l’architecture, la SPEC du calculateur et les spines UX mis à jour priment sur les anciens critères d’affichage et d’import des stories terminées. La SPEC d’import multi-fournisseur reste une trace historique de l’epic 5.

## Requirements Inventory

### Functional Requirements

FR-1: Proposer pour ChatGPT `gpt-5.6-luna` sans abonnement ou `gpt-5.6-terra` avec abonnement comme estimation initiale, modifiable directement par tout modèle ChatGPT valide du catalogue.

FR-2: Permettre pour tout chatbot de choisir un modèle valide du catalogue pour toute la conversation ; proposer pour Mistral `mistral-small` en mode rapide ou `mistral-large` en mode réflexion, sans inférer un mode inconnu du texte importé ; un changement rend les résultats dépendants périmés sans calcul automatique.

FR-3: Ne compter que les textes fournis, sans reconstituer de raisonnement invisible, hormis les tokens de prompt système catalogués.

FR-4: Comparer les versions complètes d’un artifact et compter en sortie seulement les passages ajoutés ou modifiés.

FR-5: Convertir le carbone estimé en durée de douche électrique à partir du pays utilisateur, indicatif et corrigeable.

FR-6: Afficher après les résultats des conseils de sobriété communs, compréhensibles et non personnalisés.

FR-7: Rendre le calculateur accessible publiquement sans compte ni connexion.

FR-8: Compter les tokens localement avec Tiktoken par défaut, et appliquer le fallback local mots / 0,75 en cas d’échec.

FR-10: Calculer un bloc uniquement sur action explicite, sans déclencher les autres blocs ; afficher près de ses textes le carbone et l’eau estimés, avec unité et incertitude, en réservant électricité et équivalence douche au bilan.

FR-11: Calculer tous les blocs renseignés puis le total par une action unique, en ignorant les blocs vides.

FR-12: Recalculer les agrégats et l’équivalence du total à partir de résultats valides existants, sans recalculer les blocs.

FR-13: Masquer un total devenu périmé ou incomplet, indiquer les blocs à recalculer avec un accès à leurs cartes et n’afficher le total que lorsque tous les blocs renseignés sont à jour.

FR-14: Ajouter, modifier et supprimer des blocs contenant message, réponse, raisonnement visible et artifact, avec invalidation des dépendances affectées.

FR-15: Préremplir le pays d’hébergement par fournisseur et autoriser sa modification dans les paramètres avancés.

FR-16: Ouvrir sur un accueil à deux voies, puis garder chatbot et modèle directement modifiables dans le fil chronologique ; replier les anciens échanges, ouvrir l’éditeur courant et préserver les textes lors d’un retour d’étape ; réserver les autres réglages aux paramètres avancés.

FR-17: Autoriser les surcharges de session des paramètres mathématiques, géographiques et de douche, sauf les tokens système catalogués et masqués.

FR-18: Restaurer les paramètres de référence applicables sans modifier textes, blocs, chatbot ou modèle et sans lancer de calcul.

FR-19: Reconstruire localement l’historique en cache, incluant les échanges antérieurs, la dernière version complète d’artifact et le prompt système.

FR-20: Utiliser exclusivement le volume de prompt système fourni par le catalogue, sans l’exposer ni le rendre modifiable.

FR-21: Exclure entièrement un bloc dont les quatre champs sont vides ou ne contiennent que des espaces.

FR-22: Présenter chaque impact comme une estimation unique avec incertitude et périmètre d’usage hors Scope 3 ; afficher carbone et eau par échange, puis carbone, eau, électricité, risque de sécheresse, équivalence douche et conseils dans le bilan valide ; adapter les unités à trois chiffres significatifs au plus sans arrondir les valeurs internes.

FR-23: Utiliser et signaler la valeur « Monde » pour le seul facteur environnemental manquant; bloquer le résultat si ce repli est absent.

FR-24: Calculer énergie, eau, carbone et risque de sécheresse selon les formules et unités définies, avec risque uniquement au total.

FR-25: Proposer et accepter uniquement un partage public Mistral dans le parcours publié ; refuser localement toute autre URL sans requête, demander un consentement ponctuel avant réseau, prévisualiser avant ajout et confirmer séparément le remplacement d’une conversation contenant du texte ; préserver la session sur refus ou échec.

### NonFunctional Requirements

NFR-1: Permettre les deux voies d’accueil, la saisie, l’import Mistral, les résultats, les conseils et la correction du pays sur ordinateur comme sur mobile, selon les spines UX finaux.

NFR-2: Produire une application statique publiable sur GitHub Pages et intégrable à `felixmortas.com` ; réserver la récupération distante au Worker HTML configuré du projet.

NFR-3: Conserver par défaut messages, calculs, tokenisation et diff dans le navigateur, sans analytics ni journal distant ; après validation locale et consentement ponctuel, transmettre uniquement l’URL canonique Mistral par `POST` borné au Worker allowlisté, sans contenu ni paramètre local.

NFR-4: Ne conserver durablement ni textes, ni résultats, ni choix après la fermeture de la page.

NFR-5: Livrer l’interface française en séparant les messages et formats des règles et données métier afin de permettre l’internationalisation.

NFR-6: Bloquer les résultats invalides et garantir les domaines numériques, unités, replis et divisions définis.

NFR-7: Fournir libellés, clavier, focus visible, erreurs associées et états textuels ; assurer reflow à 320 px et zooms 200 %/400 %, cibles d’au moins 44 × 44 px, dialogues modaux accessibles, restitution du focus et annonces concises.

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
- Isoler l’import distant dans `application/import/remoteGateway` : seul un `ResolvedShare` Mistral attesté, validé et consenti peut atteindre l’endpoint Worker HTML configuré et allowlisté ; le registre et la passerelle refusent les autres fournisseurs dans le parcours publié. Les adaptateurs historiques restent isolés.
- Envoyer au Worker un `POST` JSON contenant seulement `shareUrl`, avec `credentials: omit`, `redirect: error`, `cache: no-store`, `referrerPolicy: no-referrer` ; borner requête et lecture à 10 s, 2 Mio et 1 000 événements, sous réserve de limites d’adaptateur plus strictes.
- Ne jamais transmettre au tiers les blocs, fichiers locaux, résultats, catalogues, paramètres de calcul, cookies applicatifs, jetons de session ou secrets ; ne suivre ni liens, artifacts ou ressources citées.
- Afficher avant chaque requête un dialogue accessible, non pré-coché et distinct de la confirmation de remplacement : fournisseur, finalité, URL envoyée, métadonnées possibles, exclusions de données locales, annulation, `Escape` et parcours manuel sans requête.
- Documenter les faits et incertitudes de traitement du Worker actif, ses métadonnées et sa rétention déclarée, revoir sa politique à chaque publication selon D-4 et conserver la saisie manuelle si l’import est indisponible.
- Conserver l’état dans un reducer unique ; les vues accueil, fil, import et bilan partagent la même session éphémère. L’UI orchestre et affiche, le domaine calcule sans React, les catalogues demeurent immuables et aucun nouveau service réseau de calcul n’est ajouté.

### UX Design Requirements

UX-DR1: Appliquer les couleurs, typographies, espacements, rayons et styles des composants de `DESIGN.md` ; utiliser une colonne de lecture de 760 px maximum et une marge mobile de 16 px, avec contrastes texte 4,5:1 et grands caractères/indicateurs 3:1 au minimum.

UX-DR2: Construire le guide d’accueil et deux cartes d’entrée entièrement visibles, import Mistral en premier, saisie manuelle en second ; après choix, guider vers l’étape correspondante sans effacer l’autre possibilité ni les textes déjà saisis.

UX-DR3: Construire le sélecteur visible chatbot/modèle : valeur de référence présentée comme estimation modifiable, choix direct d’un modèle catalogue valide, puis accès permanent depuis l’en-tête du fil sans ouvrir les paramètres avancés.

UX-DR4: Afficher les échanges dans l’ordre chronologique ; rendre les anciens sous forme de cartes compactes avec numéro, aperçu, état, carbone/eau actuels et commande de dépliage à nom et état explicites ; garder l’éditeur courant ouvert.

UX-DR5: Organiser l’éditeur courant avec question puis réponse et un groupe facultatif pour raisonnement visible, document/code généré et fichiers source texte UTF-8 ; calculer un échange dès qu’au moins un texte utile existe et expliquer pourquoi un échange vide ne se calcule pas.

UX-DR6: Afficher après calcul explicite une paire carbone/eau près des textes de l’échange, avec unité et mention d’estimation ; présenter les erreurs, péremptions, replis Monde et indisponibilités par des messages locaux et des actions de suite.

UX-DR7: Construire un bilan après « Calculer toute la conversation » : carbone, eau, électricité, risque de sécheresse qualitatif, équivalence douche et recommandations ; sur « Recalculer le total », nommer les échanges non calculés ou périmés et fournir un accès à leurs cartes sans montrer un total ancien comme actuel.

UX-DR8: Fournir un panneau de paramètres avancés secondaire avec pays d’hébergement, pays utilisateur, hypothèses mathématiques, unités, erreurs liées aux champs et restauration ; appliquer ou restaurer annonce une fois les résultats à recalculer sans déclencher de calcul.

UX-DR9: Pour l’import Mistral, afficher un état de validation locale, puis un dialogue de consentement séparé montrant en entier l’URL canonique et l’endpoint Worker actif, sa finalité, les données transmises et non transmises ; un refus garde la session et la saisie manuelle accessible.

UX-DR10: Après récupération, montrer une prévisualisation titrée avec échanges et avertissements navigables ; annoncer seulement leurs nombres puis placer le focus sur le titre ; exiger un dialogue distinct avant remplacement d’une conversation contenant du texte et n’ajouter aucun import partiel.

UX-DR11: Gérer les dialogues avec fond inerte, focus initial sur l’action conservatrice, focus retenu, fermeture par Échap et restitution au déclencheur ; ne jamais superposer consentement et remplacement.

UX-DR12: Après ajout d’un échange, placer le focus sur sa question ; après suppression, sur une carte voisine ou l’action d’ajout ; après changement d’étape, sur le nouveau titre. Les annonces de calcul et de péremption restent concises et ne relisent pas tout le fil.

UX-DR13: Formater toutes les quantités affichées avec au plus trois chiffres significatifs et unités adaptées : carbone µgCO₂e à tCO₂e, eau µL à ML, électricité mWh à GWh et durée de douche ms à j ; couvrir zéro, valeur sous 0,001 de l’unité minimale, bascule après arrondi et dépassement de l’unité maximale, avec virgule française et nom accessible complet.

UX-DR14: Assurer 44 × 44 px minimum pour les cibles, reflow à 320 px et zooms 200 %/400 % sans perte d’action ni troncature ; éviter les commandes réservées au survol, respecter `prefers-reduced-motion` et ne transmettre aucun statut par couleur seule.

UX-DR15: Employer des libellés et textes français compréhensibles pour une personne non technique ; expliquer à la demande « artifact », « PUE », « WUE » et « tokens », et présenter l’incertitude, l’usage hors Scope 3 et les conseils sans promettre une mesure exacte ou un gain chiffré.

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

FR-16: Epic 1 (historique), Epic 6 — Accueil à deux voies, fil compact et modèle directement modifiable.

FR-17: Epic 4, Epic 6 — Paramètres avancés de session accessibles depuis le fil et le bilan.

FR-18: Epic 4, Epic 6 — Restauration sans calcul automatique dans le nouveau parcours.

FR-19: Epic 2 — Historique en cache reconstruit.

FR-20: Epic 2 — Prompt système exclusivement catalogué.

FR-21: Epic 1 — Blocs entièrement vides ignorés.

FR-22: Epic 2 (historique), Epic 6 — Répartition actuelle des métriques, incertitude et unités adaptées.

FR-23: Epic 4, Epic 6 — Repli environnemental « Monde » signalé près du résultat concerné.

FR-24: Epic 3, Epic 6 — Impacts complets sans changement de formule ; risque de sécheresse visible au bilan seulement.

FR-25: Epic 6 — Import publié Mistral uniquement, consenti, prévisualisé et ajouté atomiquement.

NFR-2, NFR-3, NFR-4, NFR-7: Epic 5 — Import distant consentant, limité et accessible, conservant la confidentialité locale par défaut.

NFR-1 à NFR-7 et UX-DR1 à UX-DR15: Epic 6 — Parcours Canopée claire, Worker configuré, confidentialité, affichage, clavier et petit écran. Les exigences déjà livrées sont maintenues ou adaptées dans les quatre stories de migration.

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

### Epic 5: Importer un partage via un intermédiaire tiers consenti

La personne peut importer une conversation publique ChatGPT, Claude, Mistral ou Gemini depuis son lien de partage, après un consentement éclairé pour transmettre uniquement son URL canonique validée à `corsproxy.io`, ou poursuivre l’import manuel sans transmission.

**Requirements covered:** CAP-1, CAP-5, CAP-6; NFR-2, NFR-3, NFR-4, NFR-7

### Epic 6: Aligner le calculateur sur l’expérience Canopée claire

La personne choisit dès l’accueil la saisie ou l’import d’un lien Mistral, corrige le modèle proposé, suit sa conversation dans un fil compact et comprend des estimations par échange et un bilan lisibles et accessibles. L’epic adapte les capacités déjà livrées sans changer les formules ni réécrire l’historique des epics 1 à 5.

**FRs covered:** FR-1, FR-2, FR-5, FR-6, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-22, FR-23, FR-24, FR-25. **Quality and UX:** NFR-1 à NFR-7, UX-DR1 à UX-DR15.

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
**When** le risque de sécheresse est présenté
**Then** il est recherché pour le pays d’hébergement retenu, affiché uniquement avec le total et traité comme une catégorie non additive, non proportionnelle au volume d’eau.

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
**Then** ce pays s’applique à tous les blocs de la conversation pour l’énergie, le carbone, l’eau et le risque de sécheresse.

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
**Then** seule l’équivalence concernée devient périmée, sans modifier énergie, eau, carbone ni risque de sécheresse.

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

## Epic 5: Importer un partage via un intermédiaire tiers consenti

La personne peut importer une conversation publique ChatGPT, Claude, Mistral ou Gemini depuis son lien de partage, après un consentement éclairé pour transmettre uniquement son URL canonique validée à `corsproxy.io`, ou poursuivre l’import manuel sans transmission.

**Ordre de livraison :** 5.4 → 5.1 → 5.2 → 5.3. La story 5.4 rend disponibles le registre, les politiques d’adaptateur et le `ResolvedShare` consommés ensuite par le consentement (5.1), la passerelle (5.2), puis les tests de parcours et la documentation (5.3). Les identifiants de stories restent stables ; cet ordre prévaut sur leur numérotation pour le dispatch.

### Story 5.1: Consentir à l’import distant avant toute requête

As a visiteuse,
I want recevoir une information claire et choisir explicitement avant que mon lien de partage soit transmis à un tiers,
So that je garde la maîtrise de cette exception à la confidentialité locale.

**Acceptance Criteria:**

**Given** une URL de partage canonique valide pour ChatGPT, Claude, Mistral ou Gemini,
**When** je demande son analyse,
**Then** un dialogue de consentement accessible identifie le fournisseur détecté et est affiché avant tout appel d’import ou effet réseau.

**Given** ce dialogue,
**When** je consulte son contenu,
**Then** il identifie `corsproxy.io`, la finalité, l’URL canonique transmise, les métadonnées possibles — dont IP et agent utilisateur —, les données locales exclues et les liens ou conditions du fournisseur détecté.

**Given** le dialogue ouvert,
**When** je refuse, annule, presse `Escape`, modifie l’URL, le fournisseur, l’adaptateur, sa politique, ses limites ou la configuration proxy,
**Then** aucune requête ni mutation de session ne survient et un nouveau `ResolvedShare` exige un nouveau consentement.

**Given** le dialogue ouvert,
**When** je choisis l’import manuel,
**Then** je peux poursuivre ce parcours sans requête à `corsproxy.io`.

### Story 5.2: Récupérer un partage par une passerelle tiers bornée

As a visiteuse ayant consenti pour l’URL courante,
I want que le calculateur récupère la page publique via une passerelle strictement limitée,
So that l’import reste possible malgré CORS sans transmettre mon état local.

**Acceptance Criteria:**

**Given** un consentement courant lié à un `ResolvedShare` validé,
**When** l’import distant démarre,
**Then** `remoteGateway` appelle uniquement `https://corsproxy.io/` et construit la destination depuis ce seul `ResolvedShare` attesté.

**Given** un `ResolvedShare` validé,
**When** la passerelle prépare ou suit une destination,
**Then** les hôtes, chemins, requêtes admises, redirections et limites proviennent exclusivement du registre de l’adaptateur du fournisseur ; une URL non canonique, une redirection hors allowlist ou un dépassement de limites échoue sans import partiel.

**Given** une absence de consentement, une annulation, une URL modifiée ou une valeur `ResolvedShare` forgée ou clonée,
**When** une récupération est tentée,
**Then** aucune requête n’est lancée, une erreur typée est renvoyée et la session est préservée.

**Given** une requête de passerelle,
**When** elle est inspectée,
**Then** elle ne contient aucun bloc, fichier, résultat, catalogue, paramètre, cookie applicatif, jeton de session ou secret.

**Given** un échec réseau, HTTP, délai, taille, politique ou configuration,
**When** la passerelle échoue,
**Then** aucun HTML partiel ni import n’est appliqué et le parcours manuel reste disponible.

**Given** un HTML borné admis,
**When** il est analysé,
**Then** seul l’extracteur local le traite comme texte non exécutable, sans suivi de lien ni téléchargement d’artifact.

### Story 5.3: Documenter et vérifier la frontière d’import distant

As a visiteuse,
I want comprendre les données exposées au tiers et disposer d’un parcours sûr lorsque le service est indisponible,
So that je puisse choisir l’import distant sans promesse de confidentialité non vérifiée.

**Acceptance Criteria:**

**Given** l’aide d’import,
**When** je lis sa section d’import distant,
**Then** elle présente `corsproxy.io`, ses documents, les données exposées, les incertitudes de traitement, le consentement par requête et l’alternative manuelle.

**Given** les tests d’intégration,
**When** ils exercent consentement, annulation, changement d’URL, indisponibilité et succès,
**Then** le réseau ne démarre qu’après consentement et tout échec préserve la session.

**Given** une requête distante consentie,
**When** son contenu est vérifié,
**Then** seule l’URL canonique validée du fournisseur identifié quitte le calculateur ; blocs, fichiers, résultats et paramètres locaux n’y figurent pas.

**Given** les tests d’intégration,
**When** ils exercent les quatre fournisseurs,
**Then** ils vérifient pour chacun le consentement, le refus, le changement d’URL ou de fournisseur, l’erreur proxy et le succès, sans donnée locale dans la requête.

**Given** que le fournisseur est indisponible ou que ses politiques doivent être revues,
**When** l’exception ne peut pas être activée,
**Then** l’aide et le produit maintiennent l’import manuel sans promesse non vérifiée.

### Story 5.4: Ajouter les adaptateurs de partage multi-fournisseur

As a visiteuse,
I want importer une conversation publique ChatGPT, Claude, Mistral ou Gemini depuis son lien de partage,
So that mes échanges textuels deviennent des blocs calculables sans recopie.

**Acceptance Criteria:**

**Given** le registre d’import statique,
**When** je fournis une URL de partage prise en charge,
**Then** il expose et sélectionne automatiquement l’un des quatre adaptateurs distincts — ChatGPT, Claude, Mistral ou Gemini — avant le consentement.

**Given** chaque adaptateur,
**When** il valide puis canonicalise une URL,
**Then** il applique ses propres règles de format, limites, politique de redirection et `policyVersion`, et le registre crée le seul `ResolvedShare` opaque, immuable et attesté accepté par la passerelle.

**Given** un HTML public borné pour un fournisseur,
**When** son extracteur local associé l’analyse,
**Then** il préserve l’ordre des messages textuels publics, ignore les rôles ou contenus non textuels non pris en charge, et retourne `format-unknown` sans inventer de message si l’état public n’est pas reconnu.

**Given** une URL authentifiée, un hôte ressemblant, un format invalide, une query ou un fragment non admis, ou une redirection non allowlistée,
**When** son analyse est demandée,
**Then** elle échoue sans requête ou import partiel et le parcours manuel reste disponible.

**Given** les tests et fixtures de régression,
**When** ils couvrent chaque fournisseur,
**Then** ils incluent au minimum une conversation à deux rôles, un artifact ou contenu non textuel ignoré, l’absence d’état public, le dépassement de limites, la révocation du consentement et des fixtures HTML publiques minimisées.

**Given** qu’un échantillon de régression révèle un changement de structure pour un fournisseur,
**When** son adaptateur ne peut plus extraire le format,
**Then** seul l’import de ce fournisseur est désactivé avec un message expliquant l’alternative manuelle, sans affecter les autres fournisseurs, les calculs ou les blocs existants.

## Passe ciblée — traçabilité du changement approuvé (Epic 5)

`epics.md` est la source de vérité exécutable pour l’extension approuvée le 20 septembre 2026 ; `sprint-change-proposal-2026-09-20.md`, le SPEC d’import et son contrat conservent le contexte, les décisions et le détail technique.

| Changement approuvé | Critères Epic 5 qui le portent |
| --- | --- |
| Détection des quatre fournisseurs et consentement informé | 5.1 : URL canonique, fournisseur détecté, dialogue avant réseau, invalidation du consentement et voie manuelle. |
| `ResolvedShare`, passerelle unique, minimisation et échecs atomiques | 5.2 : identité attestée, politique/limites du registre, refus des valeurs forgées, requête sans état local et parsing local borné. |
| Transparence de la dépendance tierce et tests d’intégration communs | 5.3 : aide, consentement/annulation/changement/indisponibilité, et test des quatre fournisseurs sans donnée locale sortante. |
| Adaptateurs isolés et régression par fournisseur | 5.4 : registre à quatre adaptateurs, politiques propres, fixtures HTML minimisées, deux rôles, non-texte, état absent, limites, révocation, redirections refusées et isolement d’une dérive de structure. |

La couverture de test est donc répartie volontairement : 5.3 exerce le parcours intégré des quatre fournisseurs, tandis que 5.4 fixe les fixtures et tests de contrat propres à chaque adaptateur. Les limites de redirection — y compris le chemin Gemini lorsqu’il est admis — relèvent de la politique du registre vérifiée par 5.2 et des tests de régression de 5.4. L’ordre de livraison 5.4 → 5.1 → 5.2 → 5.3 est la seule correction de planification relevée ; les critères eux-mêmes restent la source de vérité.

## Epic 6: Aligner le calculateur sur l’expérience Canopée claire

La personne choisit dès l’accueil la saisie ou l’import d’un lien Mistral, corrige le modèle proposé, suit sa conversation dans un fil compact et comprend des estimations par échange et un bilan lisibles et accessibles. Les stories 1.1 à 5.4 restent la trace des versions livrées ; lorsque leurs critères d’affichage ou d’import divergent, les critères de l’epic 6 définissent le parcours publié.

### Story 6.1: Choisir son parcours et son modèle de référence

En tant que personne qui veut estimer une conversation déjà tenue,
je veux choisir dès l’accueil l’import Mistral ou la saisie manuelle, puis vérifier et modifier le modèle proposé,
afin de commencer avec des hypothèses adaptées à ma conversation.

**Critères d’acceptation :**

**Étant donné** une nouvelle session,
**quand** la page s’ouvre,
**alors** l’accueil présente l’import Mistral en premier et la saisie manuelle en second ; les deux choix sont visibles et utilisables au clavier. (FR-16, UX-DR1, UX-DR2)

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

**Étant donné** l’entrée d’import visible,
**quand** une URL non Mistral est soumise par l’interface ou la passerelle,
**alors** elle est refusée sans requête distante et la saisie manuelle reste accessible. (FR-25, AD-8)

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
**alors** seuls le carbone et l’eau sont présentés près des textes, avec leurs unités et une mention d’estimation ; l’électricité, le risque de sécheresse et l’équivalence douche ne figurent pas sur cette carte. (FR-10, FR-22, UX-DR6)

**Étant donné** le fil actif,
**quand** la personne ajoute un échange,
**alors** l’échange précédent se replie et le focus va à la nouvelle question ; après suppression, le focus va à une carte voisine ou à « Ajouter un échange », et les autres textes restent présents. (FR-14, UX-DR12)

**Étant donné** des résultats d’échanges et un bilan existants,
**quand** la personne modifie ou supprime un échange renseigné,
**alors** les résultats de cet échange et des suivants qui dépendent de son historique ou de son artifact deviennent périmés ; chaque carte concernée le dit et propose le recalcul, aucun bilan dépendant n’est présenté comme actuel et aucun calcul ne démarre seul. (FR-13, FR-14, UX-DR6)

**Étant donné** une erreur de calcul ou un facteur de repli,
**quand** l’état est affiché,
**alors** un message près du résultat concerné l’explique, conserve les textes et ne déplace pas le focus de façon inattendue. (FR-22, FR-23, UX-DR6)

### Story 6.3: Importer un partage Mistral avec consentement

En tant que personne qui possède un lien public Mistral,
je veux vérifier ce qui sera transmis et prévisualiser les échanges avant leur ajout,
afin de garder le contrôle de ma conversation.

**Critères d’acceptation :**

**Étant donné** une URL de partage,
**quand** la personne demande son analyse,
**alors** seule une URL publique Mistral au format admis est reconnue et canonicalisée localement ; toute autre URL est refusée avant consentement et sans requête. La passerelle et l’endpoint publié refusent aussi un partage non Mistral, et la saisie manuelle reste accessible. (FR-25, AD-8, UX-DR9)

**Étant donné** une URL Mistral admise,
**quand** le consentement est demandé avant chaque requête,
**alors** un dialogue distinct affiche en entier l’URL canonique, l’endpoint Worker actif, la finalité, les données transmises et celles qui restent locales ; le consentement est explicite, ponctuel et lié à cette URL et à cet endpoint. (NFR-3, AD-8, UX-DR9)

**Étant donné** le dialogue de consentement,
**quand** la personne refuse, annule, appuie sur Échap ou modifie l’URL ou la configuration,
**alors** le consentement est invalidé sans requête. Le fond est inerte, le focus initial va sur « Annuler », reste dans le dialogue et revient au déclencheur à sa fermeture. (FR-25, UX-DR11)

**Étant donné** un consentement encore valide,
**quand** la récupération commence,
**alors** seule la passerelle envoie au Worker allowlisté un `POST` borné dont le corps contient uniquement `shareUrl`, sans texte, fichier, résultat ni paramètre local ; erreur, limite dépassée ou format inconnu laissent la session intacte. (NFR-3, AD-8)

**Étant donné** une récupération exploitable,
**quand** la prévisualisation apparaît avant tout ajout,
**alors** les échanges et avertissements sont navigables ; seuls leurs nombres sont annoncés, puis le focus va au titre. (FR-25, UX-DR10)

**Étant donné** un partage dont le mode Mistral n’est pas révélé fiablement,
**quand** la personne prépare l’import,
**alors** elle choisit « rapide » ou « réflexion » avant calcul ; aucun mode n’est inféré du texte de la conversation. (FR-2, AD-5)

**Étant donné** une prévisualisation vide, un refus ou un échec,
**quand** le parcours d’import se termine,
**alors** aucun échange n’est ajouté. Si la conversation actuelle contient du texte, une seconde confirmation place d’abord le focus sur « Conserver ma conversation » ; seul l’accord remplace atomiquement les échanges, sans lancer de calcul. (FR-25, UX-DR10, UX-DR11)

**Étant donné** la préparation de la publication,
**quand** l’aide et la politique d’import sont vérifiées,
**alors** elles décrivent le Worker réellement utilisé, les données et métadonnées qu’il peut traiter et les incertitudes de conservation ; ces informations font l’objet de la revue D-4. (NFR-3, D-4)

### Story 6.4: Lire le bilan et ajuster les hypothèses

En tant que personne qui a saisi ou importé une conversation,
je veux consulter un bilan compréhensible et corriger mes hypothèses,
afin de savoir ce que les estimations couvrent et quand les recalculer.

**Critères d’acceptation :**

**Étant donné** une conversation avec des échanges renseignés,
**quand** la personne actionne « Calculer toute la conversation »,
**alors** ces échanges sont calculés explicitement et un bilan valide présente carbone, eau, électricité, risque de sécheresse, équivalence carbone en durée de douche et recommandations. Le risque reste qualitatif et l’équivalence ne compare pas les volumes d’eau. (FR-5, FR-6, FR-11, FR-22, FR-24, UX-DR7)

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

**Étant donné** les surfaces accueil, import, fil et bilan,
**quand** elles sont parcourues au clavier, à 320 px et aux zooms 200 %/400 %,
**alors** elles suivent `DESIGN.md` et `EXPERIENCE.md` : états lisibles sans couleur seule, focus visible, cibles d’au moins 44 × 44 px, aucun contrôle tronqué ou réservé au survol, et respect de `prefers-reduced-motion`. (NFR-1, NFR-7, UX-DR1, UX-DR2, UX-DR14)

**Étant donné** la validation de l’epic,
**quand** les parcours manuels et importés sont vérifiés,
**alors** les scénarios couvrent la péremption, la restauration, les valeurs représentatives et extrêmes du formatage, ainsi que le focus et les annonces aux transitions. (NFR-7, UX-DR12, UX-DR13)
