---
name: Calculateur d’empreinte environnementale des LLM
type: architecture-spine
purpose: build-substrate
altitude: initiative
paradigm: application monopage client-side, en couches et noyau fonctionnel pur
scope: Sous-projet portable `ai-inf-calculator/`, intégré au chemin `/ai-inf-calculator/` de felixmortas.com
status: final
created: 2026-09-18
updated: 2026-10-06
binds: [FR-1, FR-2, FR-3, FR-4, FR-7, FR-8, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-17, FR-18, FR-19, FR-20, FR-21, FR-23, FR-24, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6, NFR-7]
sources:
  - ../../prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - ../../prds/prd-ai-env-impact-calculator-2026-09-17/addendum.md
  - ../../sprint-change-proposal-2026-09-19.md
  - ../../sprint-change-proposal-2026-09-20.md
  - ../../sprint-change-proposal-2026-09-23.md
  - ../../ux-designs/ux-ao-env-impact-calculator-2026-09-23/DESIGN.md
  - ../../ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md
companions: []
---

# Architecture Spine — Calculateur d’empreinte environnementale des LLM

## Design Paradigm

Application monopage client-side, en couches, avec un noyau de domaine fonctionnel pur. React rend l’état de session ; l’application orchestre les cas d’usage ; le domaine calcule et valide sans dépendre du navigateur, de React ni du catalogue concret.

```mermaid
flowchart LR
  UI[React : composants et vues] --> APP[Application : reducer, cas d’usage, fraîcheur]
  APP --> DOMAIN[Domaine pur : tokens, historique, impacts]
  APP --> CATALOG[Catalogues locaux typés]
  APP --> WORKER[Web Worker : tokenisation locale]
```

## Invariants & Rules

### AD-1 — Sous-projet portable et publication statique [ADOPTED]

- **Binds:** NFR-2, intégration dans le dépôt hôte
- **Prevents:** une dépendance au framework ou au mode de publication du site parent.
- **Rule:** `ai-inf-calculator/` contient son propre projet Vite et produit `dist/` avec une base `/ai-inf-calculator/`. Le dépôt hôte monte le contenu de ce dossier à `/ai-inf-calculator/` dans son artefact GitHub Pages, sans écraser les fichiers du site racine ; le sous-projet n’écrit pas dans les sources du site parent.

### AD-2 — Dépendances dirigées vers le noyau [ADOPTED]

- **Binds:** FR-3, FR-4, FR-8, FR-19, FR-24, NFR-6
- **Prevents:** des formules ou règles de fraîcheur réparties dans les composants React, le worker et les données.
- **Rule:** seuls les modules `application` appellent les adaptateurs navigateur et assemblent les cas d’usage. `domain` est synchrone, déterministe et sans import React, Worker, `Intl` ou fichier de données. `ui` ne calcule pas ; il envoie des intentions au reducer et affiche ses états.

### AD-3 — Session éphémère et résultats traçables [ADOPTED]

- **Binds:** FR-10 à FR-14, FR-17, FR-18, FR-21, NFR-3, NFR-4
- **Prevents:** la conservation accidentelle d’une conversation, le total calculé sur des résultats périmés, ou des invalidations dépendantes de l’ordre de rendu.
- **Rule:** un unique reducer React possède les textes, les sélections et les surcharges de session ; accueil, fil et bilan sont des vues de cette même session et un retour d’étape conserve les textes. `application` construit les empreintes déterministes à partir de l’état et des paramètres résolus : `impactFingerprint` couvre les entrées pertinentes, paramètres d’impact résolus, catalogue et version d’algorithme ; `showerFingerprint` couvre `impactFingerprint`, pays utilisateur et paramètres douche. La fraîcheur est dérivée de ces empreintes : une modification douche ne périt que l’équivalence, jamais les impacts. Chaque calcul part d’une intention explicite ; modifier un texte, un modèle ou un paramètre ne recalcule rien. « Tout calculer » calcule tous les échanges renseignés, attend leurs résultats actuels, puis agrège ; « Recalculer le total » n’effectue aucun calcul d’échange et désigne les résultats manquants ou périmés. Les réponses tardives restent soumises aux empreintes. Aucun total ancien ou incomplet n’est présenté comme actuel. Aucun stockage durable, analytics, cookie applicatif ou journalisation distante n’est permis.

### AD-4 — Tokenisation locale isolée [ADOPTED]

- **Binds:** FR-3, FR-8, FR-19, NFR-3
- **Prevents:** un envoi de texte, un blocage de l’interface lors de gros collages ou deux méthodes de comptage divergentes.
- **Rule:** l’application ne parle au tokenizer qu’au travers d’un protocole typé de Worker. Chaque demande et réponse contient `requestId` et `tokenizationFingerprint` (texte et encodage) ; le reducer ignore une réponse qui ne correspond plus à la demande en attente. Un calcul attend ses comptes, ou leur fallback. Le Worker embarque `js-tiktoken/lite` et les rangs `o200k_base` dans le bundle ; il ne charge ni CDN ni API. Il renvoie un compte ou une erreur structurée, qui déclenche le fallback unique `mots / 0,75` du domaine.

### AD-5 — Catalogues de référence immuables et surcharges de session [ADOPTED]

- **Binds:** FR-1, FR-2, FR-15, FR-17, FR-20, FR-23, FR-24, NFR-6
- **Prevents:** des constantes dispersées, des prix mêlés aux formules, ou la modification durable des données publiées par les paramètres avancés.
- **Rule:** modèles, tarifs et calibration, constantes, facteurs environnementaux carbone, eau et énergie, valeurs Monde et correspondances fuseau-pays sont des catalogues locaux versionnés, validés avant build et accompagnés de provenance. La clé fournisseur est normalisée entre modèles et pays d’hébergement ; chaque référence de modèle doit résoudre ses facteurs et son pays avant publication. Une table locale unique propose les références ChatGPT `sans abonnement → gpt-5.6-luna`, `avec abonnement → gpt-5.6-terra`, et Mistral `rapide → mistral-small`, `réflexion → mistral-large` ; ce préremplissage est une estimation : le choix explicite valide de la personne prévaut, et le reducer accepte le choix direct de tout modèle valide du chatbot sélectionné, ChatGPT compris, pour toute la conversation. Une unique fonction de `data/modelCatalog`, appelée par `application`, résout chaque paramètre : clé normalisée, valeur du pays choisi, repli Monde du même facteur, puis surcharge de session autorisée ; elle renvoie un statut de repli ou d’indisponibilité. `domain` reçoit les paramètres résolus, sans dépendre du catalogue concret. Une donnée indispensable absente sans repli ni surcharge valide bloque le résultat dépendant. Le prompt système provient exclusivement du catalogue et ne peut pas être surchargé. Les réglages avancés créent une vue de paramètres résolus en mémoire ; ils ne mutent jamais les catalogues.

### AD-6 — Localisation indicative sans donnée externe [ADOPTED]

- **Binds:** FR-5, FR-23, NFR-3
- **Prevents:** une localisation IP/GPS contraire à la confidentialité ou la présentation d’un pays comme certain.
- **Rule:** les pays sont des codes ISO 3166-1 alpha-2. Le pays utilisateur proposé vient d’abord d’une table locale déterministe fuseau IANA → pays probable, puis de la région de la locale navigateur, puis de Monde. Il est qualifié d’indicatif, visible et modifiable. Le pays utilisateur ne peut alimenter que l’équivalence douche ; le pays d’hébergement alimente énergie, carbone et eau.

### AD-7 — Internationalisation par messages, non par branchements métier [ADOPTED]

- **Binds:** FR-6, FR-22, NFR-5
- **Prevents:** des textes français dans les calculs ou une seconde locale qui change des nombres de référence.
- **Rule:** tout texte utilisateur est adressé par clé dans des catalogues de messages typés ; `fr-FR` est la seule locale distribuée au lancement. Les formats d’affichage passent par `Intl`. Les identifiants, unités internes, formules, valeurs de catalogues et empreintes ne dépendent pas de la langue.

### AD-9 — Projection des résultats et unités [ADOPTED]

- **Binds:** FR-10, FR-22, epic 6.2, epic 6.4
- **Prevents:** des formules ou agrégations différentes selon la vue et un total construit à partir de nombres arrondis.
- **Rule:** le domaine garde par échange et au total les valeurs non arrondies en Wh, gCO₂e et L ; la présentation seule choisit les métriques et unités. La carte d’échange montre carbone et eau après calcul explicite, avec incertitude et état de fraîcheur ; le bilan valide montre carbone, eau, électricité, équivalence douche et recommandations. Un formateur partagé suit les séries, seuils et cas extrêmes de `EXPERIENCE.md` : au plus trois chiffres significatifs, unité adaptée, virgule française et nom accessible complet. Les replis et indisponibilités sont signalés près du résultat concerné.

## Consistency Conventions

| Concern | Convention |
| --- | --- |
| Types et erreurs | `camelCase`; identifiants stables `blockId`; erreurs attendues en union discriminée `code` + contexte non sensible. |
| Nombres et unités | Calculs non arrondis en Wh, gCO₂e et L ; seul le formateur partagé adapte l’unité et arrondit à trois chiffres significatifs au plus. Aucun `NaN` ou infini ne franchit la frontière du domaine. |
| Données | Les fichiers portent `schemaVersion`, `dataVersion`, provenance et date de calibration ; une valeur environnementale absente cherche seulement sa valeur Monde du même facteur. |
| Mutation | Les actions du reducer sont les seules mutations de session. Une mutation ne lance jamais de calcul sans intention utilisateur explicite. |
| Confidentialité | Les messages de conversation ne figurent ni dans une URL, ni dans un log, ni dans un stockage navigateur durable. Aucun texte local, fichier, résultat ou paramètre de calcul n’est transmis à un service distant. La tokenisation et les calculs s’exécutent localement. |

## Stack

| Name | Version |
| --- | --- |
| React et React DOM | 19.3.0 |
| TypeScript | 7.0.2 |
| Vite | 8.3.0 |
| js-tiktoken | 1.0.21 |
| Vitest | 5.0.1 |
| GitHub Pages | service géré |

## Structural Seed

```text
ai-inf-calculator/
  src/
    ui/                 # composants React, accessibilité, présentation
    application/        # reducer, cas d’usage et orchestration locale
    domain/             # règles pures : historique, diff, impacts, validation, fraîcheur
    data/               # catalogues locaux, schémas et métadonnées de sources
    i18n/               # messages fr-FR et formatage
    workers/            # protocole et implémentation de tokenisation
  tests/                # jeux de référence et tests de domaine/Worker
  public/               # actifs statiques propres au calculateur
  vite.config.ts        # base /ai-inf-calculator/ et sortie statique
```

```mermaid
flowchart TB
  REPO[Repo hôte felixmortas.com] --> BUILD[Build d’intégration]
  CALC[ai-inf-calculator/: Vite build] --> BUILD
  ROOT[Site racine existant] --> BUILD
  BUILD --> PAGES[GitHub Pages]
  PAGES --> URL[felixmortas.com/ai-inf-calculator/]
```

```mermaid
sequenceDiagram
  participant U as Personne
  participant UI as Interface de saisie
  participant A as Application locale
  participant T as Worker de tokenisation local
  U->>UI: Saisir ou coller les échanges
  UI->>A: Mettre à jour les blocs et la configuration
  A->>T: Demander une tokenisation locale
  T-->>A: Retourner les comptes de tokens
  A-->>UI: Afficher l’estimation calculée localement
```

## Capability → Architecture Map

| Capability / Area | Lives in | Governed by |
| --- | --- | --- |
| Accueil, fil, bilan, calcul explicite et péremption | `ui/`, `application/`, `domain/` | AD-2, AD-3, AD-9 |
| Historique, artifact et total | `domain/` | AD-2, AD-3 |
| Comptage local et fallback | `workers/`, `domain/` | AD-2, AD-4 |
| Modèles, références initiales, paramètres et calcul | `data/`, `application/`, `domain/` | AD-3, AD-5 |
| Pays, eau, carbone, douche et affichage | `data/`, `domain/`, `ui/`, `i18n/` | AD-5, AD-6, AD-9 |
| Français et extensions de langues | `i18n/`, `ui/` | AD-7 |
| Publication GitHub Pages | `ai-inf-calculator/` et workflow du repo hôte | AD-1 |

## Deferred

- Granularité exacte du diff d’artifact et segmentation des mots de fallback : D-2 du PRD les fixe avant les tests de référence ; ils ne modifient pas les frontières ci-dessus.
- Schéma concret et contenu du catalogue `models_params`, calibration tarifaire et processus de mise à jour : D-1/D-6 ; ils doivent satisfaire AD-5 avant publication.
- Workflow GitHub Actions précis du dépôt hôte : décidé lors de l’intégration ; il doit respecter AD-1 et publier aussi le site racine.
