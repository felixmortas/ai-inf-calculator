| Title | id | source | link | Source file | Generated file(s) |
|---|---|---|---|---|---|
| Emission factors | emission_factor | Ember Energy | https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv | release_generation_yearly_global.csv | carbon_emissions_intensity_2025.csv |
| Drought risk | dry_risk | WRI Aqueduc | https://files.wri.org/aqueduct/aqueduct-4-0-water-risk-data.zip | Aqueduct40_baseline_annual_y2023m07d05.csv | country_drought_risk.csv |

# Paramètres des modèles fermés
L'estimation du nombre de paramètres des modèles fermées a été extraite du site web de l'article [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp/).

# Paramètres activés des modèles fermés
Création d'un fichier csv qui reprend les modeles de https://github.com/19PINE-AI/ikp/blob/main/configs/all_models.json qui ont un nombre de paramètre et paramètres activés renseignés et non-égaux (MoE). Le fichier a 3 colonnes : model,params, params_activated.
Ajout de 20 modèles d'huggingface.
Suppression des doublons et gpt-4 (nombre de paramètre non vériafiable).
Le nombre de paramètres activés des modèles fermés ont été prédit à partir d'une regression sur une liste de modèles ouverts. Régression et création d'une fonction exponentielle.

# Tokens des prompts system
Le nombre de tokens du prompt système a été calculé avec le tokenizer du calculateur, à partir des leak de prompt system sur le dépôt github `https://github.com/asgeirtj/system_prompts_leaks`.
Les modèles n'ayant pas de prompt system correspondant sur le depôt se sont vus attribués en priorité le prompt system du modèle de la même famille le plus proche, ou bien la médiane du nombre de tokens de tous les prompts system le cas échéant. La médiane a été choisie car elle est insensible au valeurs extrêmes et cas particuliers comme Claude Fable 5.

# Consommation des tokens d'input et de cache
Les ratios input/output et cache/input sont calculés à partir des prix des tokens sur openrouters.
On réalise une approche market-based car si même pas représentative, elle équilibre avec les incertitudes. Cette approche offre une méthode d'estimation simple et pertinente par rapport aux bonnes pratiques souhaitant être mises en avant.