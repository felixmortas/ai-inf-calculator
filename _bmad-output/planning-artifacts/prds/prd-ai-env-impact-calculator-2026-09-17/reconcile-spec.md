# Réconciliation de la spécification et des décisions produit

Date : 2026-09-18. Documents lus intégralement : `spec-formules-calculateur-empreinte-llm.md`, `prd.md`, `addendum.md` et `.memlog.md`. Les décisions finales de Felix priment sur les dispositions initiales remplacées. Vérification documentaire et dimensionnelle ; aucune certification scientifique externe des régressions ou des données fournisseur.

## Verdict

La source est couverte et les adaptations produit sont explicites. Aucun défaut critique ou élevé, ni omission bloquant le démarrage de l’UX ou de l’architecture. Deux précisions locales sur la référence de douche peuvent être corrigées sans réouvrir le cadrage.

## Couverture de la source

- Pipeline §0 et §3–7 : énergie IT, application unique du PUE, puis conversions carbone et eau depuis la même énergie datacenter. FR-24 et le contrat mathématique reproduisent cette séparation.
- Unités §1 : paramètres en milliards, taux en Wh/token, énergie Wh, carbone gCO₂e, eau litres ; division par 1000 avant les facteurs par kWh. Aucun second multiplicateur par paramètres activés ou nombre de GPU ajouté au terme GPU.
- Comptage §2 : trois catégories conservées. Prompt système compté en cache dès le premier bloc ; messages, réponses et raisonnements antérieurs en cache. Un résultat d’outil collé est traité comme texte dans l’addendum.
- Énergie §3bis : toutes les constantes et les équations successives mémoire/GPU/latence/serveur sont reprises exactement. La correction de la phrase source sur la continuité est justifiée : à nombre de GPU fixé, dépendance affine en paramètres activés ; sauts possibles lorsque les paramètres totaux franchissent un seuil de mémoire.
- Ratios §3ter : ratios tarifaires propres au modèle/fournisseur, date et provenance de calibration ; préparation par script hors navigateur et absence de prix codés dans les formules. Les cas de prix nul ou manquant sont explicitement laissés au contrat de données.
- Risque §7 : indicateur catégoriel à côté de l’eau, sans somme ni multiplication par le volume. L’écart de granularité entre lookup pays/fournisseur et fichier par pays est signalé.
- Agrégation §8 : sommes des résultats valides non arrondis ; ajout du contrôle explicite de fraîcheur demandé par Felix.
- Limites §10 : coût commun raisonnement/complétion, paramètres activés estimés pour modèles fermés, cache intégral, WUE sur site, hypothèses matérielles et batch, usage hors Scope 3. Les limites de la source sont conservées.

## Écarts voulus et documentés

- Saisie de textes et conversation centrale, au lieu d’une saisie principale de volumes de tokens et d’une agrégation optionnelle.
- Approximation locale mots / 0,7 ; abandon de l’option API après le refus d’une clé et d’un serveur. Aucun raisonnement invisible estimé.
- Prompt système fourni en tokens dans le catalogue, masqué et non modifiable, exception au texte fourni et aux réglages avancés.
- Tous les autres paramètres mathématiques modifiables, contrairement aux constantes internes fixes de la source.
- Artifact : première version intégrale en sortie, ajouts/remplacements seulement ensuite ; historique limité à la dernière version complète. Blocs entièrement vides ignorés, sans contribution système.
- Déclenchement manuel individuel/global/total seul, invalidation des dépendances et refus d’un total périmé.
- Pays d’hébergement distinct du pays utilisateur ; comparaison douche uniquement carbone ; repli « Monde » par facteur manquant.
- Modèles ChatGPT déterminés par abonnement selon la règle projet ; autres modèles issus du catalogue fourni, sans liste inventée.
- Import par lien conditionnel et hors engagement de lancement. Site statique, session non persistée, français internationalisable et conseils communs.

## Vérification dimensionnelle et arithmétique

`tokens × Wh/token = Wh`. `secondes × W / 3600 = Wh`, avec partage sans dimension par GPU/serveur et batch. PUE sans dimension. `Wh / 1000 × gCO₂e/kWh = gCO₂e` ; même conversion avec L/kWh pour l’eau.

Douche : `15 L/min × 0,0232 kWh/L = 0,348 kWh/min` ; multiplication par `EF_utilisateur` donne gCO₂e/min ; carbone en gCO₂e divisé par cette référence donne des minutes. L’exemple de l’addendum est correct : 1 Wh IT × 1,2 = 1,2 Wh ; à 100 gCO₂e/kWh et 0,5 L/kWh, 0,12 gCO₂e et 0,0006 L ; équivalence `0,12 / 34,8 × 60 ≈ 0,207 s`.

Le premier bloc ne reçoit pas son propre artifact dans son historique. La dernière version antérieure n’est ajoutée qu’une fois. Les blocs vides ne créent ni historique ni système. Les calculs individuels peuvent se baser sur les textes précédents sans résultats calculés, conformément au modèle.

## Précisions à corriger ou suivre

1. **Faible — facteur carbone nul déjà tranché.** Le paragraphe « Référence de douche chaude » de l’addendum dit encore que le traitement d’un facteur nul reste à préciser. NFR-6 définit déjà le résultat « non calculable », sans remplacement par Monde ni division par zéro. Aligner la phrase sur NFR-6 ; seuls les arrondis restent en D-2.
2. **Moyenne — rôle des températures dans les paramètres avancés.** L’addendum énumère 18 °C et 38 °C parmi les paramètres modifiables, alors que la formule dépend seulement du débit et du coefficient kWh/L. Le comportement en cas de modification des températures n’est pas défini. Préciser en D-2 si ces températures contextualisent le coefficient fourni ou définissent un calcul de ce coefficient ; ne pas ajouter silencieusement une loi thermique absente des décisions. La formule générale `débit × énergie_par_litre` permet déjà les réglages confirmés sans figer 0,348 dans le moteur. Ce détail ne bloque pas le cadrage UX/architecture ; il doit être résolu avant le moteur et ses contrôles avancés.

## Dépendances légitimement différées

D-1 : valeurs et schéma du catalogue, repli Monde, correspondances ChatGPT. D-2 : segmentation, diff, domaines et arrondis ; la précision sur les températures y trouve sa place. D-3 : localisation compatible avec confidentialité et page statique. D-4 : accès réel aux conversations partagées. D-5 : textes et présentation. D-6 : maintenance et calibration datée. Ces dépendances ne sont pas des omissions de cadrage ; elles sont assignées et assorties d’une échéance. Leur non-résolution bloque seulement la réalisation ou publication concernée, pas la finalisation du PRD.
