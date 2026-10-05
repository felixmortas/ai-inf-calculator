| Title | id | source | link | Source file | Generated file(s) |
|---|---|---|---|---|---|
| Emission factors | emission_factor | Ember Energy | https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv | release_generation_yearly_global.csv | carbon_emissions_intensity_2025.csv |
| Drought risk | dry_risk | WRI Aqueduc | https://files.wri.org/aqueduct/aqueduct-4-0-water-risk-data.zip | Aqueduct40_baseline_annual_y2023m07d05.csv | country_drought_risk.csv |

# Paramètres des modèles fermés
L'estimation du nombre de paramètres des modèles fermées a été extraite du site web de l'article [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp/).

# Paramètres activés des modèles fermés
Le nombre de paramètres activés des modèles fermés ont été prédit à partir d'une regression sur une liste de modèles ouverts

# Tokens des prompts system
Le nombre de tokens du prompt système a été calculé avec le tokenizer du calculateur, à partir des leak de prompt system sur le dépôt github `https://github.com/asgeirtj/system_prompts_leaks`.
Les modèles n'ayant pas de prompt system correspondant sur le depôt se sont vus attribués en priorité le prompt system du modèle de la même famille le plus proche, puis la moyenne du nombre de tokens de tous les prompts system le cas échéant.