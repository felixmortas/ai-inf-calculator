# Revue adversariale — Architecture Spine

## Verdict

**À corriger avant finalisation.** Le paradigme, les frontières et les contraintes de confidentialité sont clairs et proportionnés. Deux unités indépendantes peuvent néanmoins rester conformes aux AD tout en produisant des résultats différents ou en faisant réapparaître un résultat obsolète : le contrat de résolution des données et celui de la requête asynchrone de tokenisation ne sont pas encore fixés.

## Bloquants

### B1 — La résolution des paramètres et facteurs n’est pas déterminée

Plausible clash : un cas d’usage « calcul d’impact » choisit le facteur carbone du pays d’hébergement, puis Monde si absent (la convention le dit). Un autre, chargé de préparer la vue de paramètres résolus, applique les surcharges avancées après ce fallback ; un troisième les applique avant. Les trois respectent AD-3 et AD-5, mais une même entrée produit un résultat différent si une surcharge vise le facteur pays ou si le facteur pays est partiel.

À fixer : un contrat pur unique `resolveParameters` qui énonce, pour **chaque** famille (modèle, tarif/calibration, énergie, carbone, eau, risque), clés de recherche, ordre pays → Monde, conditions d’absence/invalidité, priorité des surcharges et représentation canonique incluse dans l’empreinte.

### B2 — Le protocole Worker ne protège pas le résultat contre les courses

Plausible clash : l’utilisateur lance le comptage du texte A, modifie le bloc en B, puis le Worker répond tardivement pour A. L’orchestrateur peut légitimement écrire ce compte dans le reducer (AD-3) ; le domaine peut légitimement accepter un entier ; l’UI affichera alors A comme si B avait été compté, ou relancera un calcul avec ce compte erroné. AD-3 exige une empreinte finale, mais ne lie pas la réponse asynchrone à l’empreinte/revision demandée.

À fixer : chaque requête/réponse transporte un `requestId` et l’empreinte (ou revision) exacte du texte et de l’encodage ; le reducer ignore une réponse qui ne correspond plus à l’état courant. Définir aussi l’état `pending` et l’interdiction de calculer tant que la tokenisation requise n’est ni résolue ni tombée en fallback.

## Importants

### I1 — L’empreinte déterministe n’a pas de sérialisation canonique

Deux équipes peuvent inclure les mêmes champs mais hasher `JSON.stringify` d’objets construits dans des ordres différents, formater des nombres différemment, ou versionner l’algorithme par chaîne différente. Elles satisfont AD-3 mais divergent sur la fraîcheur et l’agrégation du total.

À fixer : une fonction de domaine unique qui construit un payload typé et canoniquement ordonné, sa représentation (p. ex. JSON canonique UTF-8) et un algorithme/version de hash ; interdire les empreintes produites par l’UI, le Worker ou les adaptateurs.

### I2 — Les règles de sélection de pays restent ambiguës au-delà du fallback Monde

AD-6 dit d’où vient le pays proposé, mais pas comment traiter un fuseau multi-pays, une locale sans région, une valeur invalide ni l’identifiant pays normalisé. Deux tables et deux normalisations peuvent respecter la règle et conduire à des équivalences douche différentes.

À fixer : code pays canonique (ISO 3166-1 alpha-2), statut de confiance, table déterministe par fuseau avec choix documenté et règles exactes de repli/validation.

## Mineurs / qualité de spine

- Les versions de stack paraissent inutilement précises pour une spine et sont coûteuses à garder vraies ; si elles restent, elles doivent être vérifiées et verrouillées dans le manifeste/lockfile du sous-projet, sinon les remplacer par des contraintes de compatibilité.
- AD-1 décrit un « build d’intégration » tout en différant son workflow. C’est acceptable, mais il manque le contrat minimal de sortie : dossier produit attendu, non-écrasement du site racine et traitement des assets sous `/calculator/`. Sans cela, l’intégrateur peut copier `dist` de façons incompatibles.
- La frontière `data/` est présentée comme locale et validée avant build, sans nommer le responsable ni l’outil de validation. Un validateur de build distinct est un choix d’implémentation possible ; le point à conserver dans la spine est seulement qu’une publication échoue sur un catalogue invalide.

## Rubrique « bonne spine »

| Critère | État | Observation |
| --- | --- | --- |
| Paradigme nommé et pertinent | OK | SPA client-side, couches, noyau pur. |
| Frontières / sens des dépendances | OK | AD-2 est net et testable. |
| Propriété de l’état partagé | Partiel | Reducer unique clair ; retour asynchrone non corrélé. |
| Données partagées | Partiel | Immutabilité et provenance claires ; résolution non unique. |
| Opérations / déploiement | Partiel | Static hosting et chemin clairs ; contrat d’intégration incomplet. |
| Déférés distingués du contrat | OK | Liste courte avec conditions de reprise. |
| Proportion / absence de surconception | OK | Structure minimale, sans arbre artificiellement détaillé. |
