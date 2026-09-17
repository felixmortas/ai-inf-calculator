from pathlib import Path

import pandas as pd
import numpy as np

# Load the dataset
file_path = Path("raw", "Aqueduct40_baseline_annual_y2023m07d05.csv")
if not file_path.exists():
    raise FileNotFoundError(f"Dataset not found at: {file_path.resolve()}")

df = pd.read_csv(file_path)

# ============================================================
# 1. Chargement des données
# ============================================================

df = pd.read_csv(file_path)


# ============================================================
# 2. Définition de l'ordre des niveaux de risque
# ============================================================

# "No Data" n'est pas un niveau de risque et n'est donc pas inclus
# dans l'échelle ordinale.
risk_order = [
    "Low (0.0-0.2)",
    "Low - Medium (0.2-0.4)",
    "Medium (0.4-0.6)",
    "Medium - High (0.6-0.8)",
    "High (0.8-1.0)"
]


# ============================================================
# 3. Sélection des colonnes utiles
# ============================================================

drought = df[["name_0", "drr_label"]].copy()

# Suppression des lignes sans pays
drought = drought.dropna(subset=["name_0"])


# ============================================================
# 4. Identification de tous les pays
# ============================================================

# On conserve cette liste afin que les pays pour lesquels
# toutes les observations sont "No Data" ne disparaissent pas.
countries = (
    drought[["name_0"]]
    .drop_duplicates()
)


# ============================================================
# 5. Suppression des observations sans donnée de sécheresse
# ============================================================

valid_drought = drought[
    drought["drr_label"].notna()
    & drought["drr_label"].ne("No Data")
].copy()


# ============================================================
# 6. Conversion du label en variable ordinale
# ============================================================

valid_drought["drr_label"] = pd.Categorical(
    valid_drought["drr_label"],
    categories=risk_order,
    ordered=True
)


# ============================================================
# 7. Calcul du risque maximal par pays
# ============================================================

country_max_risk = (
    valid_drought
    .groupby("name_0", observed=True)["drr_label"]
    .max()
    .reset_index()
)


# ============================================================
# 8. Réintégration des pays sans données
# ============================================================

country_drought = countries.merge(
    country_max_risk,
    on="name_0",
    how="left"
)

# Les pays ne possédant aucune observation valide sont
# explicitement identifiés comme "No Data".
country_drought["drr_label"] = (
    country_drought["drr_label"]
    .astype("object")
    .fillna("No Data")
)


# ============================================================
# 9. Renommage des colonnes
# ============================================================

country_drought = country_drought.rename(
    columns={
        "name_0": "Area",
        "drr_label": "drought_risk_level"
    }
)


# ============================================================
# 10. Tri alphabétique et export
# ============================================================

country_drought = (
    country_drought
    .sort_values("Area")
    .reset_index(drop=True)
)

output_path = Path("clean", "v1-country_drought_risk.csv")

country_drought.to_csv(
    output_path,
    index=False,
    encoding="utf-8"
)

print(f"Fichier créé : {output_path}")
print(f"Nombre de pays : {len(country_drought)}")
print()

print(country_drought.head(20))