import pandas as pd
from pathlib import Path

# -------------------------------------------------------------------
# Paramètres
# -------------------------------------------------------------------
INPUT_FILE = Path("raw", "release_generation_yearly_global.csv")
OUTPUT_FILE = Path("clean", "carbon_emissions_intensity_2025.csv")

YEAR = 2025
ELECTRICITY_SOURCE = "Total generation"
AREA_TYPE = "Country or economy"

# -------------------------------------------------------------------
# Lecture des données Ember
# -------------------------------------------------------------------
df = pd.read_csv(INPUT_FILE, low_memory=False)

# Colonnes nécessaires
required_columns = [
    "Area",
    "Year",
    "Area type",
    "Electricity source",
    "Emissions intensity (gCO2e/kWh)",
]

missing_columns = [col for col in required_columns if col not in df.columns]

if missing_columns:
    raise ValueError(
        f"Colonnes manquantes dans le fichier source : {missing_columns}"
    )

# -------------------------------------------------------------------
# Sélection des données
# -------------------------------------------------------------------
result = (
    df.loc[
        (df["Year"] == YEAR)
        & (df["Area type"] == AREA_TYPE)
        & (df["Electricity source"] == ELECTRICITY_SOURCE),
        [
            "Area",
            "Emissions intensity (gCO2e/kWh)",
        ],
    ]
    .dropna(subset=["Emissions intensity (gCO2e/kWh)"])
    .sort_values("Area")
    .reset_index(drop=True)
)

# Vérification : une seule ligne attendue par pays/économie
duplicates = result[result.duplicated(subset=["Area"], keep=False)]

if not duplicates.empty:
    raise ValueError(
        "Plusieurs valeurs ont été trouvées pour certains pays :\n"
        + duplicates.to_string(index=False)
    )

# -------------------------------------------------------------------
# Export
# -------------------------------------------------------------------
result.to_csv(
    OUTPUT_FILE,
    index=False,
    encoding="utf-8-sig",
)

print(f"{len(result)} pays/économies exportés.")
print(f"Fichier créé : {OUTPUT_FILE}")
print()
print(result.head(10).to_string(index=False))