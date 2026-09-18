# Epic 3 Context: Obtenir un bilan valide de la conversation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettre à la personne de calculer explicitement tous les échanges renseignés d’une conversation et d’en consulter un bilan énergie, eau et carbone fiable. Le bilan ne doit jamais être présenté comme actuel s’il repose sur un bloc absent, non calculé ou devenu périmé après une modification ; l’utilisateur doit comprendre et pouvoir effectuer le recalcul nécessaire, sans que l’application lance de calcul à son insu.

## Stories

- Story 3.1: Calculer tous les échanges et leur bilan
- Story 3.2: Identifier les résultats périmés et recalculer le total

## Requirements & Constraints

- L’action « Tout calculer » traite les blocs renseignés dans leur ordre de conversation, ignore totalement les blocs dont tous les champs sont vides ou composés d’espaces, puis expose les impacts individuels et le total. Si aucun bloc n’est renseigné, inviter à saisir un échange et ne pas afficher de bilan calculé.
- Chaque résultat individuel fournit des estimations d’énergie, d’eau et de carbone. Le total additionne les valeurs internes non arrondies des seuls résultats à jour ; le formatage et les arrondis sont exclusivement une responsabilité d’affichage.
- L’énergie informatique est majorée une unique fois du PUE résolu pour le pays d’hébergement et le fournisseur. Cette même énergie datacenter est réemployée pour dériver le carbone en gCO2e et l’eau en litres. L’eau couvre la consommation sur site, sans eau liée à la production d’électricité.
- Le risque de sécheresse est une catégorie liée au pays d’hébergement : il apparaît seulement avec le total, sans somme, produit ni proportion au volume d’eau. Aucune équivalence de volume d’eau ne doit être affichée pour les résultats individuels.
- Un facteur environnemental absent est recherché dans la référence « Monde » du même facteur et le repli est signalé ; une valeur numérique zéro est valide. Si aucune valeur utilisable n’existe, le résultat dépendant est bloqué explicitement, jamais inventé ou assimilé à zéro.
- Une action séparée « Recalculer le total » agrège les résultats de blocs existants sans relancer leurs impacts. Elle est refusée si un bloc renseigné est absent, jamais calculé ou périmé : identifier alors les blocs à recalculer, sans calcul implicite ni total partiel. Les blocs vides ne bloquent pas le total.
- Toute modification d’un texte, suppression d’un bloc renseigné, changement de sélection ou paramètre d’impact rend périmés les résultats qui en dépendent, y compris les blocs ultérieurs affectés par l’historique ou les versions d’artifact. Ajouter ou supprimer un bloc vide ne périme rien. Aucun de ces changements ne lance un calcul automatiquement.
- Les calculs, agrégats et textes de conversation restent dans le navigateur, en mémoire de session seulement : pas de requête réseau, journalisation distante, analytics, cookie applicatif ni stockage durable. Les résultats doivent signaler qu’il s’agit d’estimations fondées sur des hypothèses, et non de mesures réelles.

## Technical Decisions

- Conserver l’état de session dans un unique reducer React. Les modules d’application orchestrent les intentions et adaptateurs ; le domaine synchrone, déterministe et pur porte calcul d’impact, agrégation, validation et fraîcheur. Les composants UI n’embarquent pas les règles métier.
- Identifier les blocs par `blockId`. Les résultats sont traçables par empreintes canoniques : `impactFingerprint` inclut les textes pertinents, paramètres d’impact résolus, catalogue et version d’algorithme ; `showerFingerprint` étend cette empreinte avec le pays utilisateur et les paramètres douche. Déterminer la fraîcheur à partir de ces empreintes, jamais de l’ordre de rendu React.
- Les catalogues locaux versionnés restent immuables. Résoudre les données environnementales par clé normalisée, valeur du pays, repli Monde du même facteur, puis surcharge de session autorisée, en retournant un statut de repli ou d’indisponibilité. Les catalogues ne sont jamais mutés.
- Maintenir les calculs non arrondis en Wh, gCO2e et L dans le domaine ; aucun `NaN` ni infini ne doit franchir sa frontière. Les messages et formats d’affichage sont français et séparés des formules.

## UX & Interaction Patterns

- Rendre les actions de calcul, les résultats et les messages de blocage accessibles au clavier et sur petit écran, avec libellés français explicites et focus visible ; un résultat périmé ou le risque de sécheresse ne peut pas être communiqué uniquement par la couleur.
- Afficher l’incertitude dans le parcours courant. Masquer un résultat périmé plutôt que de le montrer comme actuel ; expliquer les blocs empêchant le total et proposer le recalcul adéquat.

## Cross-Story Dependencies

- Les blocs et la détection des blocs vides proviennent de l’epic 1. Le calcul global doit employer la tokenisation locale, la reconstruction d’historique, les diffs d’artifact et le calcul d’impact individuel établis dans l’epic 2.
- Les choix de modèle, pays d’hébergement et paramètres avancés appliqués à toute la conversation déterminent les empreintes et les invalidations. Les évolutions de l’epic 4 doivent pouvoir rendre les dépendances concernées périmées sans déclencher de calcul.
