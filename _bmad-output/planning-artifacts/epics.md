---
title: Epics et stories — Calculateur d’empreinte environnementale des LLM
status: final
created: 2026-09-18
updated: 2026-09-20
stepsCompleted: [1, 2, 3, 4]
targetedValidations:
  - epic: 5
    source: sprint-change-proposal-2026-09-20.md
    status: confirmed-with-dispatch-order
    date: 2026-09-20
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
---

# Calculateur d’empreinte environnementale des LLM — Epic Breakdown

## Overview

Ce document décompose les exigences validées du calculateur d’impact environnemental des conversations avec LLM. Il sera complété avec la couverture et les stories après validation de cet inventaire.

## Requirements Inventory

### Functional Requirements

FR-1: Résoudre pour toute conversation ChatGPT le modèle de référence `gpt-5.6-luna` sans abonnement et `gpt-5.6-terra` avec abonnement.

FR-2: Permettre, pour les autres fournisseurs, de choisir un modèle du catalogue local applicable à toute la conversation.

FR-3: Ne compter que les textes fournis, sans reconstituer de raisonnement invisible, hormis les tokens de prompt système catalogués.

FR-4: Comparer les versions complètes d’un artifact et compter en sortie seulement les passages ajoutés ou modifiés.

FR-5: Convertir le carbone estimé en durée de douche électrique à partir du pays utilisateur, indicatif et corrigeable.

FR-6: Afficher après les résultats des conseils de sobriété communs, compréhensibles et non personnalisés.

FR-7: Rendre le calculateur accessible publiquement sans compte ni connexion.

FR-8: Compter les tokens localement avec Tiktoken par défaut, et appliquer le fallback local mots / 0,75 en cas d’échec.

FR-10: Calculer un bloc uniquement sur action explicite, sans déclencher les calculs des autres blocs.

FR-11: Calculer tous les blocs renseignés puis le total par une action unique, en ignorant les blocs vides.

FR-12: Recalculer les agrégats et l’équivalence du total à partir de résultats valides existants, sans recalculer les blocs.

FR-13: Masquer un total devenu périmé, indiquer les blocs à recalculer et n’afficher le total que lorsque tous les blocs renseignés sont à jour.

FR-14: Ajouter, modifier et supprimer des blocs contenant message, réponse, raisonnement visible et artifact, avec invalidation des dépendances affectées.

FR-15: Préremplir le pays d’hébergement par fournisseur et autoriser sa modification dans les paramètres avancés.

FR-16: Garder chatbot, modèle et conversation visibles dans le parcours courant; réserver les autres réglages aux paramètres avancés.

FR-17: Autoriser les surcharges de session des paramètres mathématiques, géographiques et de douche, sauf les tokens système catalogués et masqués.

FR-18: Restaurer les paramètres de référence applicables sans modifier textes, blocs, chatbot ou modèle et sans lancer de calcul.

FR-19: Reconstruire localement l’historique en cache, incluant les échanges antérieurs, la dernière version complète d’artifact et le prompt système.

FR-20: Utiliser exclusivement le volume de prompt système fourni par le catalogue, sans l’exposer ni le rendre modifiable.

FR-21: Exclure entièrement un bloc dont les quatre champs sont vides ou ne contiennent que des espaces.

FR-22: Présenter chaque impact comme une estimation unique, avec une mention visible d’incertitude et de périmètre d’usage hors Scope 3.

FR-23: Utiliser et signaler la valeur « Monde » pour le seul facteur environnemental manquant; bloquer le résultat si ce repli est absent.

FR-24: Calculer énergie, eau, carbone et risque de sécheresse selon les formules et unités définies, avec risque uniquement au total.

### NonFunctional Requirements

NFR-1: Permettre la saisie, les résultats, les conseils et la correction du pays sur ordinateur comme sur mobile.

NFR-2: Produire une application publiable sur GitHub Pages et intégrable à `felixmortas.com`.

NFR-3: Conserver par défaut messages, calculs, tokenisation et diff dans le navigateur, sans analytics ni journal distant ; l’import d’un partage public est une exception consentie par requête qui transmet uniquement son URL canonique à `corsproxy.io`, sans données locales.

NFR-4: Ne conserver durablement ni textes, ni résultats, ni choix après la fermeture de la page.

NFR-5: Livrer l’interface française en séparant les messages et formats des règles et données métier afin de permettre l’internationalisation.

NFR-6: Bloquer les résultats invalides et garantir les domaines numériques, unités, replis et divisions définis.

NFR-7: Fournir libellés, clavier, focus visible, erreurs associées et états accessibles sans couleur seule ni survol, y compris sur petit écran.

### Additional Requirements

- Créer un sous-projet Vite portable dans `calculator/`, avec base `/calculator/`, build statique et intégration sans écraser le site racine.
- Structurer l’application en `ui`, `application`, `domain`, `data`, `i18n` et `workers`; le domaine est pur, synchrone et déterministe, et l’UI ne calcule pas.
- Centraliser l’état de session dans un reducer React et dériver la fraîcheur à partir d’empreintes canoniques `impactFingerprint` et `showerFingerprint`.
- Implémenter la tokenisation dans un Worker local typé utilisant `js-tiktoken/lite` et `o200k_base`, avec `requestId` et empreinte de demande pour ignorer les réponses périmées.
- Versionner et valider avant build les catalogues immuables de modèles, tarifs, constantes, facteurs, risques, valeurs Monde et provenance; n’autoriser que des surcharges en mémoire.
- Résoudre toute donnée environnementale par clé normalisée, pays retenu, repli Monde du même facteur, puis surcharge de session; signaler repli et indisponibilité.
- Détecter le pays utilisateur sans donnée externe, d’abord par table locale fuseau IANA → pays probable, puis locale navigateur, puis Monde; le qualifier d’indicatif.
- Adresser tout texte utilisateur par clé de messages typés, distribuer `fr-FR` au lancement et formater via `Intl`.
- Conserver les calculs non arrondis en Wh, gCO2e et L; ne laisser franchir aucune valeur `NaN` ou infinie à la frontière du domaine.
- Prévoir tests de domaine et Worker, incluant les scénarios de référence: premier échange, artifact modifié, suppression, bloc vide, péremption, total, modèle/pays, restauration, repli Monde et fermeture de session.
- Appliquer les décisions SPEC: séparation des mots par caractères non alphanumériques pour le fallback, quatre chiffres significatifs à l’affichage, granularité du diff à définir lors de l’implémentation, absence de bornes numériques additionnelles pour le moment.
- Isoler l’import distant exceptionnel dans `application/import/remoteGateway` : seule une URL ChatGPT validée et consentie peut être transmise à l’origine allowlistée `https://corsproxy.io/`; délai et taille sont bornés, les erreurs sont typées, atomiques et le HTML reste traité localement comme texte non exécutable.
- Ne jamais transmettre au tiers les blocs, fichiers locaux, résultats, catalogues, paramètres de calcul, cookies applicatifs, jetons de session ou secrets ; ne suivre ni liens, artifacts ou ressources citées.
- Afficher avant chaque requête un dialogue accessible, non pré-coché et distinct de la confirmation de remplacement : fournisseur, finalité, URL envoyée, métadonnées possibles, exclusions de données locales, annulation, `Escape` et parcours manuel sans requête.
- Documenter les faits et incertitudes de traitement de `corsproxy.io`, revoir ses documents à chaque publication selon D-4, et conserver l’import manuel si le fournisseur est indisponible ou ne convient plus.

### UX Design Requirements

Aucun contrat UX n’a été fourni. Les exigences de responsive, d’accessibilité, de parcours principal et de présentation sont couvertes par FR-16, FR-22, NFR-1 et NFR-7; la rédaction éditoriale et la disposition responsive définitives restent à valider avant publication.

### FR Coverage Map

FR-1: Epic 1 — Convention de modèle ChatGPT selon abonnement.

FR-2: Epic 1 — Sélection du modèle catalogue pour les autres fournisseurs.

FR-3: Epic 2 — Comptage limité aux textes fournis et prompt système catalogué.

FR-4: Epic 2 — Diff des versions d’artifact.

FR-5: Epic 4 — Équivalence carbone en douche locale.

FR-6: Epic 4 — Conseils de sobriété non personnalisés.

FR-7: Epic 1 — Accès public sans compte.

FR-8: Epic 2 — Tokenisation locale et fallback.

FR-10: Epic 2 — Calcul explicite d’un bloc.

FR-11: Epic 3 — Calcul de tous les blocs et du total.

FR-12: Epic 3 — Recalcul du total seul.

FR-13: Epic 3 — Fraîcheur et refus d’un total incomplet.

FR-14: Epic 1 — Gestion des blocs de conversation.

FR-15: Epic 4 — Pays d’hébergement modifiable.

FR-16: Epic 1 — Informations de conversation visibles.

FR-17: Epic 4 — Paramètres avancés de session.

FR-18: Epic 4 — Restauration des paramètres de référence.

FR-19: Epic 2 — Historique en cache reconstruit.

FR-20: Epic 2 — Prompt système exclusivement catalogué.

FR-21: Epic 1 — Blocs entièrement vides ignorés.

FR-22: Epic 2 — Résultats estimés et incertitude visible.

FR-23: Epic 4 — Repli environnemental « Monde » signalé.

FR-24: Epic 3 — Impacts complets, total et risque de sécheresse.

NFR-2, NFR-3, NFR-4, NFR-7: Epic 5 — Import distant consentant, limité et accessible, conservant la confidentialité locale par défaut.

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

## Epic 1: Configurer et saisir une conversation

La personne accède au calculateur, choisit son chatbot et son modèle, puis compose librement les échanges de sa conversation.

### Story 1.1: Accéder au calculateur et choisir le modèle de conversation

As a visiteuse,
I want sélectionner mon chatbot puis le mode de sélection de son modèle,
So that la conversation utilise une référence cohérente dès le départ.

**Acceptance Criteria:**

**Given** la publication du sous-projet sur GitHub Pages
**When** je visite `/calculator/`
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
