# Revue adversariale — mise à jour architecture du 23 septembre 2026

## Verdict

**Corrections ciblées recommandées avant finalisation.** La spine ferme les principales divergences de l’epic 6 : politique Mistral à deux frontières, consentement lié au Worker actif, session unique, fraîcheur par empreintes et projection carbone/eau versus bilan. Trois contrats laissent encore deux unités conformes à la spine produire des comportements incompatibles.

## Findings

### H1 — « Tout calculer » peut encore devenir une simple agrégation

**Contrat :** AD-3 dit que chaque calcul part d’une intention explicite et que le total n’agrège que les résultats actuels ; AD-9 dit ce que présente un bilan valide ([spine, lignes 54–58 et 92–96](../ARCHITECTURE-SPINE.md)).

**Deux unités conformes mais incompatibles :** l’unité `ui` émet une action « Tout calculer » qui calcule tous les échanges renseignés, puis le bilan. L’unité `application` implémente cette action comme une demande de total à partir des seuls calculs déjà présents, puis signale les échanges non calculés. Les deux respectent « intention explicite » et « aucun total incomplet », mais la seconde contredit le parcours de l’UX et la story 6.4. `EXPERIENCE.md` précise que « Tout calculer » calcule les échanges renseignés, tandis que « Recalculer le total » réutilise les résultats à jour et désigne les blocages ([EXPERIENCE.md, lignes 98 et 108](../../ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md)).

**Impact :** le bouton principal du fil échoue à produire un bilan lors d’une première utilisation, alors que l’UI et l’orchestrateur pourraient chacun se croire conformes.

**Correction :** fixer dans AD-3 ou AD-9 les deux intentions et leur contrat partagé : `calculateAll` calcule les échanges renseignés avant le total ; `recalculateTotal` n’effectue aucun calcul d’échange et nomme les résultats manquants/périmés. Les résultats tardifs et les erreurs restent soumis aux empreintes avant agrégation.

### H2 — La référence ChatGPT selon l’abonnement reste sous-déterminée

**Contrat :** AD-5 exige une table locale unique « selon l’abonnement », sans donner la correspondance ChatGPT ([spine, lignes 66–70](../ARCHITECTURE-SPINE.md)). La proposition approuvée fixe pourtant sans abonnement → `gpt-5.6-luna` et avec abonnement → `gpt-5.6-terra` ([proposition, §4.1](../../sprint-change-proposal-2026-09-23.md)).

**Deux unités conformes mais incompatibles :** la table de référence peut choisir `gpt-5.6-luna` pour les deux états faute de valeur codifiée dans la spine ; une autre peut appliquer la correspondance approuvée. Le sélecteur UI et le reducer restent capables d’un choix direct dans les deux variantes. L’écart change néanmoins les calculs initiaux de toute la conversation.

**Impact :** des résultats différents pour les mêmes textes et abonnement, sans action de la personne ; la calibration et la fraîcheur ne peuvent pas réconcilier deux références initiales différentes.

**Correction :** inscrire les deux IDs approuvés dans AD-5, comme pour Mistral, et préciser que le préremplissage est remplacé par un choix explicite tant que celui-ci reste valide pour le chatbot sélectionné.

### M1 — Les bornes navigateur du Worker ne sont pas un contrat partagé

**Contrat :** AD-8 exige de borner délai, octets lus et extraction, sans nommer l’enveloppe ni la version de référence ([spine, lignes 84–90](../ARCHITECTURE-SPINE.md)). Le contrat Worker déjà livré et son implémentation navigateur utilisent 10 secondes et 2 Mio, avec `maxEvents: 1 000` dans la passerelle ([SPEC Worker, Boundaries & Constraints](../../../implementation-artifacts/spec-remplacer-corsproxy-par-le-worker-import-html.md) ; `remoteGateway.ts`).

**Deux unités conformes mais incompatibles :** une passerelle fixe un délai total de 10 s et 2 Mio ; une autre choisit 30 s et 10 Mio, tout en « bornant » effectivement les deux dimensions. L’extracteur local peut encore appliquer une borne de 1 000 ou 10 000 événements. Ces versions n’offrent ni la même admission ni la même résistance aux pages massives et ne correspondent pas au contrat déjà livré.

**Impact :** écarts d’import et de disponibilité selon la tranche implémentée ; l’UX reçoit des erreurs et délais différents pour un même partage.

**Correction :** référencer explicitement les plafonds du contrat actuel et la règle selon laquelle les limites de l’adaptateur ne peuvent que les resserrer ; rappeler que le délai couvre `fetch` et lecture du corps, et que le dépassement ne produit aucune prévisualisation.

## Points correctement fermés

- La politique publiée est Mistral uniquement à la résolution et à `remoteGateway` ; une capacité attestée d’un autre fournisseur ne peut pas lancer de trafic selon AD-8.
- Le consentement est lié à l’identité du partage, à la version de politique et à l’endpoint Worker affiché, puis consommé une fois ; le navigateur n’atteste pas la politique interne de redirection et de conservation du Worker.
- La source des données et les surcharges sont séparées ; la clé fournisseur doit être normalisée avant publication. Les calculs restent non arrondis, et un seul formateur pilote les valeurs affichées.

## Limite de cette revue

Cette revue teste la cohérence des décisions écrites contre la proposition approuvée et l’UX. Elle ne valide pas que le code actuel implémente déjà l’epic 6 ; `registry.ts` expose encore les quatre adaptateurs au moment de la lecture, ce que la story 6.3 devra modifier.
