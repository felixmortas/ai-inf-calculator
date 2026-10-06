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
ai-inf-calculator/data/visualize_closed_model_params.py et ai-inf-calculator/data/analyze_moe_params.py ont été utilisés pour prédire les paramètres des modèles fermés.

# Tokens des prompts system
Le nombre de tokens du prompt système a été calculé avec le tokenizer du calculateur, à partir des leak de prompt system sur le dépôt github `https://github.com/asgeirtj/system_prompts_leaks`.
Les modèles n'ayant pas de prompt system correspondant sur le depôt se sont vus attribués en priorité le prompt system du modèle de la même famille le plus proche, ou bien la médiane du nombre de tokens de tous les prompts system le cas échéant. La médiane a été choisie car elle est insensible au valeurs extrêmes et cas particuliers comme Claude Fable 5.

# Consommation des tokens d'input et de cache
Les ratios input/output et cache/input sont calculés à partir des prix des tokens sur openrouters.
On réalise une approche market-based car si même pas représentative, elle équilibre avec les incertitudes. Cette approche offre une méthode d'estimation simple et pertinente par rapport aux bonnes pratiques souhaitant être mises en avant.

# Localisation des data centers et fournisseurs de coud pour chaque fournisseur de LLM
OpenAI en partenariat avec Microsoft est probablement chez Azure et aux Etats-Unis pour les utilisateurs gratuits.
Mistral AI étant également en partenariat avec Microsoft, les data center souverains sont en Europe, probablement en Suisse.
Gemini est forcément chez Google, probablement aux Etats-Unis pour les utilisateurs gratuits.
Et Anthropic peut être chez les 3 cloud provider. Nous allons sélectionner AWS car il est le fournisseur le plus concurrentiel. Les modèles sont probablement hébergés aux Etats-Unis pour les utilisateurs gratuits.

# PUE par pays et fournisseur
Les valeurs PUE ont été collectées selon quatre niveaux de fiabilité décroissante : (1) measured : données mesurées publiées directement par AWS, Azure et GCP pour le pays/région spécifique ; (2) estimated : interpolation régionale pour pays sans datacenter connu mais situés dans une zone avec PUE publiée ; (3) regional : utilisation des PUE régionales agrégées (ex. Asia-Pacific, EMEA) quand aucune zone spécifique n'existe ; (4) global : fallback sur PUE mondiale moyenne du fournisseur pour pays isolés. Cette stratégie en cascade garantit une couverture complète de tous les pays tout en traçabilité de la source. Les données AWS (2025) offrent la meilleure granularité (~25 régions), suivies d'Azure (4 régions officielles, FY25) et GCP (données par datacenter, 2024). À noter : ces valeurs ne reflètent pas les variations climatiques locales (température/humidité ambiante), qui peuvent écarter le PUE réel de ±5-10% par rapport aux estimations régionales.

# WUE par pays et fournisseur

