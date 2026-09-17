---
creation-date: 15-09-2026
last-update-date: 15-09-2026
---

### Note méthodologique

**Objet de l'indicateur.** Le tableau vise à fournir, pour chaque pays ou économie couvert par le jeu de données Ember, l'intensité carbone moyenne de la production d'électricité en 2025, exprimée en grammes de CO₂ équivalent par kilowattheure (`gCO2e/kWh`).

**Périmètre géographique.** Seules les observations dont `Area type` est égal à `Country or economy` sont conservées. Ce filtre est important : le fichier Ember contient également des agrégats géographiques tels que des régions ou groupes de pays. Sans ce filtre, ceux-ci apparaîtraient dans le tableau aux côtés des pays et pourraient être interprétés à tort comme des observations nationales.

**Période de référence.** Le champ `Year` est filtré sur **2025**. Le tableau représente donc les données annuelles correspondant à cette année et non une moyenne pluriannuelle.

**Mix électrique retenu.** Le champ `Electricity source` est limité à **`Total generation`**. L'objectif n'est pas de comparer l'intensité carbone propre à chaque technologie de production — charbon, gaz, solaire, nucléaire, etc. — mais d'obtenir l'intensité moyenne associée au **mix de production électrique dans son ensemble** pour chaque pays.

**Indicateur retenu.** La variable `Emissions intensity (gCO2e/kWh)` est utilisée directement telle que fournie par Ember. Elle rapporte les émissions associées à la production électrique à la quantité totale d'électricité produite. Le script ne recalcule donc pas l'intensité à partir des colonnes `Emissions (MtCO2e)` et `Generation (TWh)`, ce qui permet de conserver la valeur publiée dans le jeu de données source.

**Traitement des valeurs manquantes.** Les observations pour lesquelles l'intensité d'émissions n'est pas renseignée sont exclues du tableau final (`dropna`). Cette approche évite de remplacer artificiellement une donnée absente par zéro, qui aurait une signification très différente sur le plan environnemental.

**Imports et consommation.** Il convient de noter que cet indicateur caractérise ici le **mix de production domestique**, et non nécessairement le mix électrique consommé dans le pays. Le choix de `Total generation` signifie notamment que les échanges internationaux d'électricité ne sont pas utilisés pour construire une intensité carbone fondée sur la consommation. Cette distinction peut être significative pour les pays fortement importateurs ou exportateurs d'électricité.

**Contrôle de cohérence.** Le script vérifie qu'une seule observation est obtenue par `Area` après application des filtres. La présence de doublons déclenche une erreur plutôt qu'une déduplication automatique, afin de rendre visible une éventuelle modification de la structure du jeu de données Ember ou une ambiguïté dans les données.

Enfin, j'ai conservé le nom exact **`Emissions intensity (gCO2e/kWh)`** dans le fichier de sortie afin de préserver l'unité et la traçabilité avec la variable Ember d'origine.
