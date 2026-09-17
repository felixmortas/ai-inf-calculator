---
creation-date: 15-09-2026
last-update-date: 15-09-2026
---
### Objectif

L'objectif du traitement est de construire, à partir du dataset *Water Risk*, un indicateur synthétique permettant d'associer à chaque pays un niveau de risque de sécheresse.

Le jeu de données initial contient plusieurs observations pour un même pays. Le risque de sécheresse peut donc varier à l'intérieur du territoire national. Il est par conséquent nécessaire de définir une règle d'agrégation afin d'obtenir une seule valeur par pays.

### Indicateur retenu

L'analyse utilise la variable `drr_label`, qui fournit une classification du risque de sécheresse (*Drought Risk*) en cinq niveaux ordonnés :

* Low (0.0-0.2)
* Low - Medium (0.2-0.4)
* Medium (0.4-0.6)
* Medium - High (0.6-0.8)
* High (0.8-1.0)

La modalité `No Data` est traitée séparément, car elle correspond à une absence d'information et non à un niveau de risque.

### Agrégation au niveau national

Plusieurs niveaux de risque pouvant être observés au sein d'un même pays, le niveau le plus élevé observé sur le territoire est retenu comme indicateur national.

Cette méthode adopte une logique de précaution : elle vise à identifier l'existence d'une exposition importante à la sécheresse quelque part dans le pays, même lorsque le reste du territoire présente un risque plus faible.

Par exemple, si un pays contient des zones classées `Low`, `Medium` et `High`, le pays est classé `High`.

Le résultat doit donc être interprété comme le **niveau maximal de risque de sécheresse observé dans le pays**, et non comme le niveau moyen ou représentatif de l'ensemble du territoire national.

### Traitement des données manquantes

Les observations portant la valeur `No Data` sont exclues lors de la recherche du niveau maximal. Ainsi, lorsqu'un pays possède à la fois des observations valides et des observations `No Data`, seules les observations disposant effectivement d'une mesure de risque sont prises en compte.

Lorsqu'aucune observation valide n'est disponible pour un pays, celui-ci est néanmoins conservé dans le fichier final et reçoit la valeur `No Data`.

Cette approche permet d'éviter de confondre absence de données et faible niveau de risque.

### Limites de l'approche

La principale limite de cette méthode est qu'elle ne tient pas compte de l'étendue géographique concernée par chaque niveau de risque. Une petite partie du territoire classée `High` suffit ainsi à classer l'ensemble du pays dans cette catégorie.

L'indicateur produit doit donc être considéré comme un **indicateur de risque maximal territorial** plutôt que comme une mesure du risque moyen national.

Cette approche est particulièrement adaptée lorsqu'on cherche à identifier les pays dans lesquels existe au moins une zone fortement exposée à la sécheresse. Elle est en revanche moins adaptée si l'objectif est de mesurer le niveau de risque auquel est exposée la majorité du territoire ou de la population.

Pour une analyse complémentaire, il serait possible de construire un indicateur national pondéré par la superficie des différentes zones (`area_km2`), ou éventuellement par la population si des données d'exposition démographique sont disponibles.

### Structure du fichier produit

Le fichier final contient une ligne par pays et deux variables :

* `Area` : nom du pays ;
* `drought_risk_level` : niveau maximal de risque de sécheresse observé dans le pays.

Cette simplification facilite ensuite le croisement de l'indicateur de sécheresse avec d'autres données disponibles au niveau national.
