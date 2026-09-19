---
title: Proposition de changement de sprint — import ChatGPT via proxy tiers avec consentement
status: approved
created: 2026-09-19
approved: 2026-09-19
change_scope: major
mode: batch
---

# Proposition de changement de sprint — exception d’import distant consentie

## 1. Synthèse du problème

La feature `SPEC-import-chatgpt-share` a été construite sous l’hypothèse qu’une page publique ChatGPT pouvait être lue directement depuis GitHub Pages. L’implémentation actuelle effectue donc un unique `fetch` direct, sans cookie, vers `https://chatgpt.com/share/<id>`, et traite un refus CORS comme un échec sans import.

La contrainte technique observée est qu’un tel accès peut être bloqué par CORS. Pour rendre l’import par URL fonctionnel dans ce cas, le navigateur doit demander la page à un proxy tiers. Cette exception contredit l’engagement actuel : le PRD NFR-3, les epics, l’architecture et la SPEC interdisent tout serveur, proxy, contournement CORS ou envoi de contenu à un tiers.

Le changement demandé ne concerne pas les calculs, la tokenisation, l’historique ni les fichiers locaux : ceux-ci restent locaux et éphémères. Il concerne exclusivement la récupération volontaire d’une page de partage publique par un intermédiaire tiers.

### Preuves

- `src/application/import/chatgptShare.ts` configure un `fetch` direct CORS et retourne l’erreur « Accès refusé par le réseau ou CORS. » lorsqu’il échoue.
- La SPEC et les trois stories de `spec-import-chatgpt-share` prescrivent explicitement l’absence de proxy et le refus propre de CORS.
- Le PRD NFR-3 interdit la transmission de tout contenu de conversation à un serveur, y compris pour l’import conditionnel.

## 2. Analyse d’impact

### Épics et backlog

| Élément | État | Impact proposé |
| --- | --- | --- |
| Epics 1 à 4 | Non affectés fonctionnellement | Conserver leurs calculs, données et conversations locaux ; la règle « aucune transmission » doit devenir une règle générale avec exception explicitement limitée à l’import distant consenti. |
| Import par lien (D-4 / SPEC-import-chatgpt-share) | Réalisé en accès direct, mais insuffisant lorsque CORS bloque | Créer un Epic 5 V2 « Importer un partage via un intermédiaire tiers consentant » ; il complète le parcours d’import sans modifier le domaine de calcul. |
| Stories 1 à 3 de la SPEC d’import | `done` | Ne pas les réécrire rétroactivement ni les annuler. Ajouter des stories de changement, dépendantes de la nouvelle décision de confidentialité. |

L’ordre recommandé est : décisions de confidentialité et de fournisseur tiers → mise à jour des contrats → stories de consentement et d’adaptateur → build. Aucun rollback du parcours local existant n’est justifié : sa validation stricte, son parsing non exécutable, ses bornes de volume et son comportement atomique restent utiles.

### PRD

Les sections suivantes sont contradictoires avec l’exception demandée : l’introduction, NFR-3, D-4 et les scénarios de validation. Le MVP du calculateur reste atteignable, mais sa promesse doit être reformulée avec précision : la confidentialité locale demeure le défaut ; l’import distant est une exception activée par l’utilisateur avant la requête.

### Architecture

L’architecture client-side et le domaine pur restent valables. En revanche, le proxy tiers introduit une frontière de confiance externe qui n’est pas documentée. L’architecture doit ajouter :

- un adaptateur d’accès distant distinct du parseur ChatGPT ;
- une allowlist de l’origine du proxy et une validation inchangée de l’URL ChatGPT ;
- un flux « consentement → requête au proxy → réponse HTML bornée → parsing local » ;
- les données visibles par le tiers, les garanties effectivement connues et les garanties absentes ;
- des règles d’absence de secret, d’authentification, de cookie applicatif, de suivi de liens et de persistance applicative ;
- le comportement si le proxy échoue, change de politique ou n’est pas disponible.

### UX et accessibilité

Il n’existe pas de document UX autonome. Le composant `ConversationImport` doit néanmoins recevoir un état de consentement précédent toute requête : une explication accessible, la liste précise des données envoyées, le nom et la politique du tiers, une action « Continuer » explicite et une action d’annulation. Une confirmation de remplacement existante ne remplace pas ce consentement : elle intervient plus tard et protège une modification locale.

### Artefacts secondaires

À mettre à jour : `SPEC.md`, `import-contract.md`, `stories.yaml`, les nouvelles stories, l’aide `docs/importer-un-partage-chatgpt.md`, les textes i18n, les tests de l’adaptateur et de l’UI, et le suivi de sprint. Aucun changement des formules, du Worker, des catalogues ni du reducer de calcul n’est requis.

## 3. Décisions à verrouiller avant développement

Le proxy n’est pas détenu par le projet. Son identité et ses garanties ne peuvent donc pas être inventées. Les éléments suivants sont des prérequis bloquants pour activer l’import distant :

1. **Fournisseur et origine exacte.** Nom, URL, pays/juridiction si connu, politique de confidentialité et conditions applicables ; une origine non identifiée ne peut pas être mise en production.
2. **Données transmises.** Le navigateur doit envoyer au maximum l’URL de partage canonique, jamais les blocs locaux, pièces jointes, résultats, paramètres ni contenu collé par l’utilisateur. Si le proxy impose l’envoi de davantage, la SPEC doit le déclarer explicitement et le consentement doit l’énoncer.
3. **Traitement par le tiers.** Rétention, journaux, analytics, sous-traitants et réutilisation éventuelle doivent être décrits comme faits vérifiés, ou affichés honnêtement comme inconnus. L’application ne doit pas promettre « aucune conservation » sans engagement vérifiable du fournisseur.
4. **Contenu et accès.** Seule une URL publique ChatGPT canonique est admise ; aucune authentification, cookie ou contournement d’un contrôle d’accès ne doit être employé. Le proxy ne suit ni artifacts ni liens cités.
5. **Consentement.** Il est ponctuel, explicite, non pré-coché, demandé avant chaque requête distante ; le refus ou l’annulation ne crée aucune requête. Le chemin manuel/local demeure disponible.
6. **Sécurité opérationnelle.** La taille et le délai actuels restent bornés ; la réponse est parsée localement comme texte non exécutable ; le proxy est appelé sans données de session superflues et aucune URL tierce arbitraire ne peut être construite par entrée utilisateur.

## 4. Évaluation des options

| Option | Évaluation | Effort | Risque |
| --- | --- | --- | --- |
| Ajustement direct des stories existantes | Non retenu seul : il créerait une contradiction durable avec les contrats amont. | Moyen | Élevé |
| Rollback des stories 1–3 | Non retenu : le parcours local reste sûr, testé et réutilisable. | Élevé | Moyen |
| Revue MVP : abandonner l’import distant | Viable si le fournisseur tiers ne peut pas satisfaire les prérequis ; l’import local manuel reste disponible. | Faible | Faible |
| **Hybride retenu : correction de trajectoire + Epic 5 opt-in** | Mettre à jour les contrats et ajouter une capacité isolée, désactivée sans consentement ou sans fournisseur acceptable. | Moyen | Élevé, maîtrisable par les garde-fous ci-dessus |

## 5. Propositions détaillées de modifications

### PRD — NFR-3 et D-4

**Ancien**

> Les messages, réponses, raisonnements et artifacts restent dans le navigateur. Aucun contenu de conversation n’est transmis à un serveur, y compris par des services d’analyse, de journalisation ou de comptage des tokens.

**Nouveau proposé**

> Par défaut, les messages, réponses, raisonnements, artifacts, fichiers locaux, calculs, tokenisation et comparaisons restent dans le navigateur, en mémoire de session, sans analytics ni journal distant. L’import d’un lien de partage public peut constituer une exception : avant chaque requête, la personne consent explicitement à ce que l’URL canonique de partage — et uniquement les données documentées pour le fournisseur tiers retenu — soit transmise à cet intermédiaire afin qu’il récupère la page publique. Aucun bloc local, fichier ajouté, résultat ou paramètre de calcul n’est transmis. Le refus, l’annulation ou l’indisponibilité du tiers maintient l’intégralité des données dans le navigateur et laisse l’import manuel disponible.

**Ajout D-4 proposé** : remplacer l’étude de faisabilité par une décision de fournisseur, données transmises, juridiction/politique, rétention déclarée, mécanisme de consentement et revue des risques avant publication.

**Rationale** : préserver la règle locale comme norme, sans masquer la sortie exceptionnelle de données.

### Architecture — nouvelle AD de frontière d’import distant

**Ancien**

> Import d’un lien de partage : D-4. Aucun adaptateur d’import ni droit réseau n’est créé avant une étude de faisabilité compatible GitHub Pages et confidentialité.

**Nouveau proposé**

> AD-n — Import distant exceptionnel et consenti. La récupération distante est isolée dans `application/import/remoteGateway`. Elle est impossible sans consentement explicite de la requête courante. Elle transmet uniquement l’URL ChatGPT strictement validée au proxy tiers allowlisté ; toute réponse HTML est bornée et analysée localement par l’extracteur existant. Elle ne reçoit ni n’envoie d’état de conversation local, pièce jointe, résultat, catalogue, cookie applicatif ni secret. Le domaine et les calculs n’ont aucune dépendance vers le proxy. Une erreur de consentement, réseau, politique ou format est atomique et conserve la session.

**Rationale** : rendre visible la nouvelle frontière de confiance, sans propager une dépendance externe dans les calculs.

### Epics — ajouter Epic 5 V2

**Nouveau**

> Epic 5 : Importer une conversation partagée via un intermédiaire tiers consentant.
>
> La personne peut, après information et consentement explicites, utiliser un intermédiaire tiers documenté pour récupérer une page ChatGPT publique que le navigateur ne peut lire directement à cause de CORS. Elle garde un parcours local par défaut et peut refuser sans aucune transmission.

**Rationale** : la capacité modifie une promesse transversale ; elle doit être visible au backlog plutôt que cachée dans une story terminée.

### SPEC et contrat d’import

**Ancien**

> Publication statique GitHub Pages, sans [...] proxy [...] ou contournement CORS ; l’import direct doit échouer proprement [...].

**Nouveau proposé**

> L’import direct est tenté ou déclaré indisponible selon la configuration retenue. La voie proxy est optionnelle, tiers-identifiée, strictement allowlistée et précédée d’un consentement explicite par requête. Le contrat précise l’origine, les données transmises, les garanties de traitement vérifiées et les incertitudes. Elle ne transmet jamais les données de session locales ni les fichiers. Sans consentement ou en cas d’échec, aucun appel proxy n’a lieu et l’import manuel/local reste proposé.

**Nouvelles stories proposées dans `spec-import-chatgpt-share/stories.yaml`**

1. **Consentement informé avant import distant** — afficher les données envoyées, l’identité/politique du tiers et l’alternative locale ; tester qu’aucun `importFromUrl` ou appel proxy n’est exécuté avant consentement, après refus, annulation ou changement d’URL.
2. **Passerelle proxy tiers bornée** — introduire l’adaptateur isolé, la configuration allowlistée et les erreurs typées ; transmettre uniquement l’URL validée, borner délai/taille, parser localement et tester l’absence de données locales dans la requête.
3. **Documentation et vérification de la frontière** — mettre à jour l’aide et les tests intégration ; décrire les faits et inconnues sur le tiers sans déclaration de confidentialité non vérifiée.

### UX — nouveau parcours obligatoire

Avant l’action réseau, afficher : « Pour analyser ce lien, son URL sera envoyée à [fournisseur] afin de récupérer la page publique ; ce service peut voir les informations contenues dans cette URL et, selon sa politique, traiter la page récupérée. Vos blocs déjà saisis, fichiers locaux et résultats ne sont pas envoyés. » Les valeurs entre crochets sont remplies avec des faits validés sur le fournisseur. Les actions sont « Continuer avec [fournisseur] », « Annuler » et un lien « Importer manuellement ». Le focus est déplacé vers le dialogue ; `Escape` et Annuler ferment sans requête.

## 6. Décision de fournisseur transitoire

Felix a approuvé le 19 septembre 2026 l’usage transitoire de **corsproxy.io**. Il sera remplacé par un proxy géré par le projet dans une version ultérieure.

La configuration de production doit limiter la passerelle à l’origine `https://corsproxy.io/`, utiliser son mécanisme de clé API et d’autorisation de domaine, et construire l’URL de requête uniquement à partir du lien ChatGPT déjà validé. La clé est nécessaire à l’offre de production ; elle ne doit pas être traitée comme un secret protecteur si elle est embarquée dans une application statique. Les protections effectives doivent donc être l’autorisation de domaine et les plafonds configurés chez le fournisseur, complétés par les contrôles applicatifs.

La politique de confidentialité publiée par corsproxy.io indique collecter l’URL demandée, l’agent utilisateur, l’adresse IP, les horodatages et les compteurs de requêtes, et ne pas journaliser les corps ni les en-têtes de requêtes. Les conditions attribuent au fournisseur une licence de traitement du contenu proxyé nécessaire à la fourniture du service. Le produit doit donc déclarer au minimum que le lien de partage, l’adresse IP et les métadonnées de requête sont communiqués à corsproxy.io ; il ne doit pas affirmer que la page ou son contenu ne sont jamais traités par ce tiers.

Le texte de consentement proposé devient :

> Pour analyser ce lien, son URL sera envoyée à corsproxy.io afin qu’il récupère la page ChatGPT publique. Corsproxy.io recevra aussi des métadonnées de requête, dont votre adresse IP et votre agent utilisateur, selon sa politique de confidentialité. Vos blocs déjà saisis, fichiers locaux, résultats et paramètres de calcul ne sont pas envoyés par le calculateur. Annuler conserve ces données dans votre navigateur et vous pouvez importer manuellement.

Les sources à citer dans l’aide utilisateur et à revoir avant chaque publication sont : [documentation corsproxy.io](https://corsproxy.io/docs/), [politique de confidentialité](https://corsproxy.io/privacy/) et [conditions de service](https://corsproxy.io/tos/). Toute évolution de ces documents ou du proxy déclenche une revue de cette exception et, si nécessaire, un retour au parcours manuel.

## 7. Handoff et plan d’exécution

**Classification : majeure.** Le changement est techniquement circonscrit, mais modifie une promesse fondamentale de confidentialité et ajoute une dépendance de confiance externe.

1. **Product Manager (`bmad-prd`)** : approuver et mettre à jour NFR-3, D-4 et les critères de lancement après choix documenté du fournisseur tiers.
2. **Architecte (`bmad-architecture`, update)** : créer l’AD de frontière proxy, le diagramme de flux, les invariants de minimisation et le plan d’indisponibilité du tiers.
3. **UX (`bmad-ux`, update ciblé)** : arrêter les contenus de consentement, le flux accessible et le chemin de refus/import manuel.
4. **Spec (`bmad-spec`, update)** : aligner `SPEC.md` et `import-contract.md`, puis ajouter les stories de la feature avec critères d’acceptation testables.
5. **Planification (`bmad-create-epics-and-stories`, puis `bmad-sprint-planning`)** : intégrer Epic 5 et les stories au backlog ; les statuts doivent rester `backlog` jusqu’à ce que les prérequis fournisseur soient satisfaits.
6. **Développement (`bmad-build`)** : implémenter story par story après ces mises à jour, avec tests négatifs d’absence de requête avant consentement et de non-transmission des données locales.

## 8. Critères de succès

- L’interface décrit avant la requête le tiers, la finalité et les données réellement transmises.
- Un refus, une annulation, une URL invalide ou un changement de saisie n’envoie aucune requête au proxy.
- Seule l’URL de partage strictement validée est transmise ; les contenus locaux, fichiers, résultats et paramètres ne le sont pas.
- Le HTML reçu est limité, traité localement comme texte et ne déclenche ni exécution, ni suivi de liens, ni téléchargement d’artifacts.
- L’import direct/local et tous les calculs continuent de fonctionner sans dépendre du proxy.
- La documentation n’affirme aucune garantie de rétention ou de confidentialité qui ne soit pas étayée par le fournisseur tiers.

## 9. État de la checklist

- [x] Déclencheur, problème et preuves identifiés.
- [x] Impact des epics et des artefacts analysé.
- [x] Conflits PRD, architecture, spec, UX implicite, documentation et tests identifiés.
- [x] Options évaluées et approche hybride sélectionnée.
- [x] Fournisseur transitoire sélectionné : corsproxy.io ; sa politique et ses conditions sont consignées ci-dessus.
- [x] Approbation explicite de Felix enregistrée ; les artefacts et le code peuvent maintenant être mis à jour par les handoffs indiqués.
