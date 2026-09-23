---
title: Proposition de changement de sprint — alignement sur l’UX Canopée claire
status: approved
created: 2026-09-23
approved: 2026-09-23
change_scope: moderate
mode: incremental
trigger: UX finalisée le 2026-09-23 après clôture des epics 1 à 5
sources:
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/DESIGN.md
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/mockups/accueil.html
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/mockups/import.html
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/mockups/conversation.html
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/mockups/bilan.html
---

# Proposition de changement — expérience Canopée claire

## 1. Déclencheur et constat

La conception UX validée le 23 septembre 2026 décrit une entrée à deux voies, un fil compact, un import public Mistral, une sélection de modèle directement modifiable et une répartition précise des métriques entre échange et bilan. Les epics 1 à 5 sont marqués `done` dans `implementation-artifacts/sprint-status.yaml` ; leur exécution précède cette conception. Il n’existe donc pas de story déclencheuse en cours : le déclencheur est une nouvelle décision de Felix après la livraison des stories 1.1 à 5.4.

Exemples vérifiables :

- `src/ui/App.tsx` affiche actuellement configuration, import et blocs dans la même vue dès l’ouverture ; `src/ui/ConversationBlocks.tsx` laisse tous les blocs ouverts.
- `src/ui/ConversationConfiguration.tsx` affiche pour ChatGPT un modèle résolu non éditable et `conversationReducer.ts` refuse `modelSelected` pour ce fournisseur.
- `src/application/import/registry.ts` publie quatre fournisseurs, alors que l’UX n’admet que le lien Mistral dans le parcours publié.
- `ConversationBlocks.tsx` affiche énergie et équivalence douche par échange, en unités fixes à quatre chiffres significatifs ; l’UX prévoit carbone et eau par échange, les autres indicateurs dans le bilan, et des unités adaptées à trois chiffres significatifs au plus.
- Le PRD, AD-8 et les anciennes stories désignent `corsproxy.io`, tandis que `remoteGateway.ts` utilise le Worker HTML configuré et transmet un `POST` contenant seulement l’URL canonique du partage.
- Felix a ajouté `mistral-small` et `mistral-large` à `data/clean/models_params.csv`. Leur clé fournisseur `MistralAI` ne correspond pas encore à `Mistral AI` dans `data/clean/provider_country.csv` ; le pays d’hébergement ne peut donc pas être résolu sous cette clé.

## 2. Analyse d’impact

| Périmètre | Impact et décision |
| --- | --- |
| PRD | Mettre à jour UJ-1/UJ-2, FR-1/FR-2/FR-10/FR-22, NFR-2/NFR-3/NFR-7 et D-1/D-2/D-4/D-5. Conserver les formules et la confidentialité locale par défaut. |
| Epics 1–5 | Conserver leur historique et leur statut `done`. Leurs critères restent la trace des versions livrées, avec une note de supersession ciblée par l’epic 6 plutôt qu’une réécriture qui ferait croire que l’ancienne livraison répondait à l’UX récente. Corriger séparément les références factuellement périmées au Worker dans la documentation courante. |
| Nouvel epic 6 | Quatre stories de migration UX, dans l’ordre accueil/modèles → fil/résultats → import Mistral → bilan/unités/accessibilité, avec vérification transverse à chaque tranche. |
| Architecture | Actualiser AD-8 et le diagramme d’import : Worker configuré, `POST` borné et consenti, URL Mistral seule admise par la politique publiée. Conserver le registre et les adaptateurs existants isolés, sans exposition des trois autres importeurs dans l’application publiée. Maintenir la séparation `ui` / `application` / `domain` / `data` / `workers`. |
| UX | `DESIGN.md` et `EXPERIENCE.md` sont `final` et priment sur les quatre maquettes statiques en cas d’écart. Ajouter la décision de modèle Mistral « rapide » / « réflexion » dans `EXPERIENCE.md` et le statut des modèles de référence modifiables. Les états sans maquette dédiée sont construits depuis les spines. |
| Autres contrats | Réconcilier `SPEC-ai-env-impact-calculator` et sa précision à quatre chiffres, ainsi que la SPEC d’import et ses mentions de CorsProxy/quatre fournisseurs, avec le périmètre publié. Garder la trace des anciens contrats comme contexte, mais désigner clairement le contrat applicable à l’epic 6. |
| Code, tests, aide | Ajuster `App`, configuration, reducer, blocs, import, i18n, styles et formatage ; documenter l’import Mistral actuel. Tester la restriction du registre publié et de la passerelle, le consentement avant réseau, la préservation de la session et les parcours clavier/mobile. Aucun nouveau service réseau ni changement des formules n’est prévu. |

### Priorités et dépendances

1. Aligner les clés de fournisseur du catalogue et de `provider_country.csv`, puis définir dans une table locale facile à modifier `rapide → mistral-small` et `réflexion → mistral-large`. Vérifier que les deux IDs sont dans le catalogue et que le pays et les facteurs nécessaires se résolvent. Le choix du mode fournit le préremplissage ; si un import ne révèle pas ce mode de façon fiable, demander le choix à la personne au lieu de l’inférer du texte.
2. Fixer une politique d’import **Mistral seulement** à la frontière publique et la tester avant d’exposer l’accueil. Un lien des trois autres fournisseurs est refusé sans requête distante, avec accès à la saisie manuelle.
3. Vérifier sur des valeurs représentatives le contrat d’arrondi et d’unité de `EXPERIENCE.md` avant sa publication. Les valeurs internes restent non arrondies en Wh, gCO₂e et L.
4. Actualiser la documentation de l’exception réseau avec les faits connus du Worker et les incertitudes de traitement ; afficher l’endpoint actif, sans hôte figé dans le dialogue.

## 3. Voie recommandée

**Ajustement direct avec nouvel epic de migration UX ; portée modérée.** Le moteur de calcul, la tokenisation locale, l’historique, les empreintes de fraîcheur et le Worker d’import existent. Les changements principaux portent sur l’orchestration des vues, les règles de sélection, la restriction de l’import publié et la présentation des résultats. Une annulation des epics terminés effacerait un historique utile sans réduire ces travaux. Une réduction du MVP ferait perdre les parcours UX validés. Le MVP reste réalisable, mais sa définition de lancement doit suivre les décisions du 23 septembre.

**Effort estimé : moyen à élevé**, soit plusieurs stories de développement et une passe de vérification complète de l’interface. **Risque : moyen**, concentré sur la restriction effective de l’import, le préremplissage Mistral, la fraîcheur des résultats et les annonces/focus lors des transitions. Aucune date de livraison n’est déduite de cette estimation ; la capacité de sprint doit être évaluée pendant Sprint Planning.

## 4. Propositions détaillées approuvées une par une

Les propositions ci-dessous ont été examinées individuellement avec Felix le 23 septembre 2026. Felix a approuvé le document assemblé le même jour.

### 4.1 PRD — modèles et entrée manuelle

**Sections :** UJ-1, FR-1, FR-2, FR-16, D-1 ; `SPEC-ai-env-impact-calculator` CAP-1 et les critères futurs de l’epic 6.

**Actuel :** « Il applique à tous les échanges [...] sans abonnement payant : `gpt-5.6-luna` ; avec abonnement payant : `gpt-5.6-terra`. » FR-2 réserve le choix direct du modèle aux autres fournisseurs.

**Proposé :** « La personne choisit directement un modèle du catalogue pour le chatbot retenu, applicable à toute la conversation. Pour ChatGPT, la convention selon l’abonnement propose `gpt-5.6-luna` ou `gpt-5.6-terra` comme référence initiale, explicitement qualifiée d’estimation et modifiable. Pour Mistral, le choix indiqué par la personne entre conversation *rapide* et *réflexion* propose respectivement `mistral-small` et `mistral-large` comme références initiales, également modifiables. Les autres chatbots proposent un modèle de leur catalogue. Changer le chatbot, le mode ou le modèle ne lance aucun calcul et signale les résultats devenus périmés. »

**Raison :** permettre de corriger une estimation de modèle sans attribuer à l’outil une connaissance certaine du modèle réellement utilisé. La table de correspondance doit rester centralisée et simple à modifier. Aligner la clé `MistralAI` / `Mistral AI` et valider les données du catalogue avant la story 6.1.

### 4.2 PRD — import publié

**Sections :** vision, UJ-2, périmètre du lancement, NFR-3, D-4 ; epic 5 et SPEC d’import en tant que contrats historiques, epic 6 en tant que contrat applicable au parcours publié.

**Actuel :** « URL [...] ChatGPT, Claude, Gemini ou Mistral » et aide d’import à quatre liens.

**Proposé :** « Le parcours publié propose et accepte uniquement un lien public Mistral. ChatGPT, Claude et Gemini restent sélectionnables pour la saisie manuelle. Toute URL de partage non Mistral est refusée localement, sans consentement consommé ni requête, et la personne peut saisir ses échanges. La prévisualisation des échanges Mistral précède leur ajout ; une conversation existante contenant du texte n’est remplacée qu’après une confirmation distincte. »

**Raison :** décision UX explicite et état actuel de la récupération HTML documenté dans `docs/importer-un-partage-chatgpt.md`. Les adaptateurs précédemment livrés peuvent rester dans le code pour préserver l’historique, mais la politique publiée doit refuser leur utilisation par l’UI et la passerelle.

### 4.3 PRD — résultats par échange et bilan

**Sections :** UJ-1, FR-10, FR-22, FR-5 et critères de présentation des stories 2.3/3.1/4.3, supersédés pour l’epic 6.

**Actuel :** « La consommation électrique, la consommation d’eau et les émissions carbone sont affichées [...] pour chaque bloc et pour le total » ; FR-10 actualise aussi l’équivalence douche individuelle.

**Proposé :** « Après un calcul explicite, chaque échange présente près de ses textes le carbone et l’eau estimés, avec unité et incertitude. Le bilan valide présente carbone, eau, électricité, risque de sécheresse, équivalence carbone en durée de douche et recommandations. Le moteur conserve les valeurs d’énergie, d’eau et de carbone non arrondies pour chaque échange et leur total ; la répartition visuelle ne change pas les formules ni la règle de péremption. L’équivalence douche est présentée dans le bilan. »

**Raison :** rendre lisible l’effet de chaque échange tout en réservant les indicateurs de synthèse au bilan.

### 4.4 UX et stories — progression, fil et accessibilité

**Sections :** UJ-1/UJ-2, NFR-1/NFR-7, nouvel epic 6 ; `DESIGN.md` et `EXPERIENCE.md` sont les contrats de référence.

**Actuel :** configuration, import et formulaire complet visibles ensemble ; chaque échange est un formulaire ouvert ; quatre maquettes absentes des anciens epics.

**Proposé :** accueil à deux voies, import Mistral en premier et saisie manuelle en second ; après choix manuel, sélection du chatbot et du modèle ; fil chronologique avec échanges antérieurs repliables et éditeur courant ouvert ; bilan après action explicite. Les retours d’étape gardent les textes. Dialogues de consentement et de remplacement séparés, fond inerte, focus initial sur l’action conservatrice, piège de focus, Échap et restitution du focus. Après prévisualisation, annoncer seulement les comptes puis placer le focus sur le titre ; après ajout d’échange, sur la nouvelle question. Les états périmés, erreurs et facteurs de repli portent un texte. Vérifier le reflow à 320 px et aux zooms 200 % et 400 %, les cibles de 44 × 44 px et le parcours clavier.

**Raison :** appliquer les quatre maquettes aux surfaces illustrées et les spines UX aux états secondaires. `DESIGN.md` prévaut sur une maquette si leurs détails divergent.

### 4.5 SPEC / epics — affichage des unités

**Sections :** SPEC du calculateur « quatre chiffres significatifs », epic 2 story 2.3 et autres critères de présentation ; `EXPERIENCE.md` « Affichage des quantités ».

**Actuel :** formatage `Intl.NumberFormat('fr-FR', { maximumSignificantDigits: 4 })`, unités fixes Wh, gCO₂e, L et secondes.

**Proposé :** utiliser au plus trois chiffres significatifs et choisir l’unité à l’affichage suivant les séries définies dans `EXPERIENCE.md` : carbone µgCO₂e → tCO₂e, eau µL → ML, électricité mWh → GWh, durée de douche ms → j. Le rendu utilise la virgule française, évite les longues suites de zéros, fournit un nom accessible complet pour les unités abrégées et gère zéro, sous seuil, changement d’unité après arrondi et dépassement de l’unité maximale. Les totaux restent calculés à partir des valeurs non arrondies. Valider les seuils et extrêmes sur des données représentatives avant livraison.

**Raison :** appliquer la précision et la lisibilité UX sans modifier les résultats mathématiques.

### 4.6 PRD / architecture / SPEC d’import — frontière réseau actuelle

**Sections :** NFR-2/NFR-3/D-4, AD-8 et diagramme associé, epic 5 et SPEC d’import comme historique de livraison ; documentation active de l’import.

**Actuel :** `corsproxy.io` est désigné comme intermédiaire et origine de production ; AD-8 décrit une URL de destination encodée pour ce proxy.

**Proposé :** « La récupération distante passe uniquement par l’endpoint d’import HTML du Worker du projet, résolu depuis la configuration active et affiché intégralement dans le dialogue. Après consentement explicite, ponctuel et lié à l’URL Mistral canonique et à cet endpoint, le navigateur transmet un `POST` borné dont le corps ne contient que `shareUrl`. Aucun texte, fichier, résultat ou paramètre local n’est transmis. Refus, annulation, URL/configuration modifiée, erreur réseau ou format inconnu préservent la conversation. Le Worker reçoit le lien et peut traiter la page et des métadonnées de requête selon sa politique documentée. »

Mettre à jour le diagramme : `lien Mistral → validation/canonicalisation locale → consentement URL + endpoint Worker → POST Worker → HTML borné → extraction locale → prévisualisation → ajout ou confirmation de remplacement`. La politique d’admission publiée refuse les autres fournisseurs à la frontière réseau. Le choix d’endpoint reste contraint par l’allowlist existante ; aucune URL libre n’est admise.

**Raison :** refléter le code déployable et éviter un dialogue de consentement ou une architecture qui nomme le mauvais destinataire.

### 4.7 Epics et stories — nouvelle tranche de livraison

**Actuel :** epics 1–5 terminés ; `epics.md` indique encore « Aucun contrat UX n’a été fourni ».

**Proposé :** ajouter l’epic 6 « Aligner le calculateur sur l’expérience Canopée claire », traçable vers `DESIGN.md`, `EXPERIENCE.md` et les quatre maquettes. Les critères détaillés seront rédigés dans `epics.md` avant Sprint Planning :

| Story | Résultat et critères essentiels |
| --- | --- |
| 6.1 — Accueil et choix du modèle | Deux voies visibles ; ChatGPT et Mistral préremplis selon leurs conventions, choix direct de tout modèle valide du fournisseur ; correspondances centralisées ; clés Mistral/pays cohérentes ; aucune perte de texte en revenant à l’étape précédente. |
| 6.2 — Fil et estimation par échange | Cartes antérieures dépliables et éditeur courant ; question puis réponse et contenus facultatifs ; calcul explicite possible avec au moins un texte ; carbone/eau seuls par échange ; péremption et dépendances signalées ; focus après ajout/suppression. |
| 6.3 — Import Mistral consenti | Seul lien Mistral accepté par la politique publiée ; aucun réseau avant consentement ; endpoint et URL complets ; prévisualisation accessible, avertissements, import atomique et confirmation distincte avant remplacement. |
| 6.4 — Bilan, réglages et finition UX | Bilan complet sur action, total incomplet explicite, paramètres appliqués/restaurés sans calcul automatique, unités adaptées et accessibles ; design Canopée claire ; tests à 320 px, zoom 200/400 %, clavier et états d’erreur/péremption. |

Les critères de sécurité et de régression traversent les quatre stories. Après approbation, l’epic 6 entre au sprint-status en `backlog` ; les quatre entrées de stories seront ajoutées lorsqu’elles seront rédigées dans `epics.md`.

## 5. Handoff d’implémentation

**Classification : modérée.**

1. **Produit et architecture :** reporter les décisions approuvées dans le PRD, les contrats applicables et AD-8 ; expliciter la supersession des anciens critères sans réécrire leur historique ; valider les données et la politique d’import Mistral.
2. **Backlog :** créer l’epic 6 et ses quatre stories avec critères d’acceptation testables, puis lancer Sprint Planning et ajouter leurs entrées au `sprint-status.yaml` ; `epic-6: backlog` y figure déjà.
3. **Développement :** implémenter les stories dans l’ordre 6.1 → 6.4 en conservant la séparation des couches et les calculs non arrondis ; couvrir les parcours manuels/importés, la sécurité de l’import, la fraîcheur et l’accessibilité.
4. **Validation par Felix :** vérifier le modèle proposé pour « rapide » et « réflexion », les quatre surfaces, les unités sur exemples réels et les formulations grand public avant publication.

### Critères de succès

- La personne peut choisir la saisie manuelle ou l’import Mistral dès l’accueil ; seul Mistral peut déclencher une demande de consentement et une requête d’import publiée.
- Le modèle proposé est modifiable pour ChatGPT et Mistral, et la correspondance de mode Mistral est centralisée et vérifiée dans le catalogue.
- Le fil et le bilan présentent exactement les métriques définies par l’UX ; aucun total ou résultat périmé n’est présenté comme actuel.
- Les valeurs affichées adaptent leur unité et leur précision sans modifier les calculs non arrondis.
- Les dialogues, la prévisualisation, le focus, les annonces, le petit écran et le zoom suivent `EXPERIENCE.md` ; les quatre maquettes guident la réalisation visuelle.
- La documentation et le dialogue nomment le Worker effectivement utilisé et expliquent les données transmises.

## 6. État de la checklist Correct Course

| Section | État | Note |
| --- | --- | --- |
| 1. Déclencheur et preuves | [x] | Nouvelle décision UX après épics clos ; écarts PRD/code documentés. |
| 2. Impact epics | [x] | Epics 1–5 préservés ; epic 6 et ordre proposés. |
| 3. Conflits artefacts | [x] | PRD, architecture, UX, SPEC, catalogue, code, aide et tests examinés. |
| 4. Voies possibles | [x] | Ajustement direct retenu ; rollback et réduction du MVP écartés. |
| 5. Proposition et handoff | [x] | Éditions avant/après, risques, dépendances et critères rédigés. |
| 6. Revue finale et approbation | [x] | Felix a approuvé le document complet le 23 septembre 2026 ; epic 6 ajouté au sprint-status. |

**Décisions :** propositions 1 à 7 puis document assemblé approuvés par Felix au cours de la revue incrémentale du 23 septembre 2026, dont l’ajout des deux modèles Mistral au catalogue par Felix. **Handoff :** réconciliation PRD/architecture, rédaction de l’epic 6 et de ses stories, puis Sprint Planning et Build. L’historique des epics 1–5 reste marqué `done`.
