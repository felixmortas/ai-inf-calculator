# Revue rubric — AD-8, import distant multi-fournisseur

**Verdict : à corriger avant handoff d’implémentation.** La révision remplace correctement la dépendance structurelle à une URL ChatGPT par un `ResolvedShare` provenant d’un adaptateur et conserve les garde-fous principaux. Elle ne fixe toutefois pas encore les mécanismes nécessaires pour que l’allowlist, le consentement et l’absence de données locales soient réellement opposables et non simplement conventionnels.

Le lint déterministe de la spine passe sans constat (`0` finding). Les constats ci-dessous sont sémantiques et centrés sur la transition multi-fournisseur.

## Constats prioritaires

### H1 — La provenance « émis par un adaptateur validé » n’est pas vérifiable par `remoteGateway`

**Divergence permise.** En TypeScript structurel, tout module de `application/` peut fabriquer un objet ayant la forme `{ providerId, canonicalUrl, limits }`. La règle dit qu’il est émis par un adaptateur du registre, mais ne dit pas comment la passerelle distingue ce faux objet d’un objet produit par le registre. Deux implémentations peuvent donc respecter la forme de `ResolvedShare` tout en laissant l’une contourner l’allowlist fournisseur.

**Action : autofix.** Faire de `ResolvedShare` une capacité opaque créée dans un seul module de registre (constructeur non exporté, marque privée/symbole ou identifiant de résolution revérifié dans le registre) ; `remoteGateway` reçoit cette capacité et retrouve l’adaptateur par une entrée de registre figée, plutôt que de faire confiance à des champs fournis par l’appelant. Les `limits`, l’extracteur et la politique de redirection doivent découler de cette même entrée, jamais de l’objet appelant.

### H2 — La politique de redirection n’est pas exécutable à travers `corsproxy.io`

**Divergence permise.** AD-8 impose que la passerelle ne suive que les redirections allowlistées, mais ne fixe ni le mode de redirection du proxy ni la preuve de chaque URL intermédiaire/finale. Un proxy qui suit les redirections amont avant de répondre rend cette règle impossible à appliquer côté navigateur ; une autre implémentation peut suivre automatiquement, ou seulement vérifier l’URL finale.

**Action : autofix.** Par fournisseur, définir une chaîne maximale (le changement de sprint requiert notamment Gemini), les hôtes/chemins autorisés à chaque saut, et un mécanisme contrôlable : proxy configuré pour renvoyer les `3xx` sans les suivre, ou contrat de proxy fournissant la chaîne complète authentifiable. En l’absence de ce contrat, refuser toute redirection. Tester redirection autorisée, second saut, hôte/chemin/query hors allowlist et destination finale non attendue.

### H3 — Le contrat réseau n’interdit pas techniquement l’ajout de données locales

**Divergence permise.** La minimisation énumère ce qui ne doit pas être envoyé, sans fixer la requête que construit `remoteGateway`. Une implémentation peut encore ajouter un corps, un header ou un paramètre issu du reducer tout en passant une `canonicalUrl` valide. Le changement approuvé exige que seule cette URL quitte le calculateur pour chacun des quatre fournisseurs.

**Action : autofix.** Lier AD-8 à une requête construite exclusivement par la passerelle : méthode et headers fixes/allowlistés, `body` absent, `credentials: 'omit'`, aucune donnée de session, et destination proxy dérivée seulement de la configuration figée plus de la `canonicalUrl` de la capacité. Ajouter un test de capture de requête qui prouve, pour les quatre adaptateurs, l’absence de corps, cookie/autorisation, header applicatif et paramètre local.

### H4 — Le consentement ne dissocie pas assez l’URL cible de l’URL réellement appelée au proxy

**Divergence permise.** Le texte assimile `canonicalUrl` à « l’URL effectivement transmise », tandis que la requête réseau va en pratique vers l’origine `https://corsproxy.io/` avec une destination encodée selon son contrat. Une UI peut afficher uniquement le lien fournisseur, une autre l’URL proxy complète, ou une troisième une réécriture différente ; le consentement n’est alors pas uniformément informé sur le tiers et l’URL cible.

**Action : autofix.** Fixer un payload de consentement immuable, lié à la capacité de résolution, qui affiche séparément : `providerId`/nom fournisseur, URL cible canonique exacte, origine proxy exacte et toute URL de redirection autorisée pertinente. La requête ne peut partir que si ce payload, ou son identifiant non forgeable, correspond au `ResolvedShare` courant ; changement d’URL, de fournisseur ou de politique le révoque.

## Conformité à la proposition de changement

| Exigence de la proposition du 20 septembre | État | Observation |
| --- | --- | --- |
| `remoteGateway` accepte un contrat validé, non une URL ChatGPT seule | Partiel | `ResolvedShare` est le bon contrat, mais sa provenance doit être rendue vérifiable (H1). |
| Registre et adaptation multi-fournisseur | Partiel | AD-8 est générique ; il ne lie pas explicitement le registre initial aux quatre adaptateurs ChatGPT, Claude, Mistral et Gemini, ni au comportement d’indisponibilité isolée d’un fournisseur. Cela devrait être ajouté à l’entrée registre ou à la carte Capability → Architecture. |
| Allowlist proxy et fournisseur | Partiel | L’origine proxy est exacte et les politiques sont attribuées à l’adaptateur, mais la chaîne de redirection n’est pas contrôlable telle qu’écrite (H2). |
| Consentement par requête, lié à l’URL courante | Partiel | Refus, annulation et changement d’URL sont bien traités ; le contenu précis affiché et son lien non forgeable au départ réseau doivent être clarifiés (H4). |
| Bornes et erreurs atomiques | OK | Les limites par fournisseur, taille/délai, erreurs typées et conservation de la session sont explicitement fixés. |
| Aucun envoi de données locales ; parsing local et textuel | Partiel | L’intention et les exclusions sont complètes ; il manque le contrat mécanique de requête et ses tests (H3). |

## Rubrique « bonne spine »

| Critère | État | Observation |
| --- | --- | --- |
| Divergences réelles au niveau inférieur fixées | Partiel | Frontière unique, registre et parseur local sont bien séparés ; provenance, redirections et construction de requête restent des choix incompatibles. |
| Chaque règle est exécutable et prévient ce qu’elle annonce | Partiel | Le consentement, les limites et la séparation de domaine sont actionnables ; H1–H4 empêchent l’exécution uniforme des promesses d’allowlist et de minimisation. |
| Aucun différé ne crée une divergence | OK sous réserve | Le remplacement futur du proxy est bien circonscrit ; son contrat devra respecter les mécanismes de redirection et de consentement fixés avant implémentation. |
| Source de changement réconciliée | Partiel | Le modèle d’adaptateur et le dialogue fournisseur+URL ont été repris. La liste de lancement des quatre fournisseurs et la désactivation isolée d’un adaptateur ne sont pas encore portées explicitement. |
| Frontières et données locales protégées | Partiel | Une seule passerelle, aucun parseur réseau et aucun téléchargement de ressource sont clairs. Le transport sortant doit être rendu incapable d’emporter des données locales. |
| Dimensions de l’initiative traitées | OK | Architecture client, sécurité/confidentialité, dépendance proxy transitoire, défaillances et fallback manuel sont décidés ou différés. |

## Décision de revue

Ne pas considérer AD-8 prête à construire tant que H1 à H4 ne sont pas intégrées. Après ces corrections, la généralisation multi-fournisseur est cohérente avec le paradigme en couches : le registre porte la politique fournisseur, `remoteGateway` reste l’unique capacité réseau, et chaque extracteur demeure local et isolé.
