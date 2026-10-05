#!/usr/bin/env python3
"""Generate data/clean/models.csv from the closed-model source tables."""

import csv
from datetime import date
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent
PARAMS_FILE = DATA_DIR / "raw/ikp_closedModels_params_with_active_predictions.csv"
PROMPTS_FILE = DATA_DIR / "raw/closedModels_systemPromptUrl.csv"
PRICING_FILE = DATA_DIR / "raw/model_token_pricing.csv"
OUTPUT_FILE = DATA_DIR / "clean/models.csv"

OUTPUT_COLUMNS = [
    "provider",
    "model_name",
    "nb_params",
    "nb_params_activated",
    "system_prompt_token_count",
    "input_ratio",
    "cache_ratio",
    "consolidation_date",
]

PROVIDERS = {
    "openai": "ChatGPT",
    "google": "Gemini",
    "anthropic": "Claude",
    "mistral": "MistralAI",
    "alibaba": "Alibaba",
    "amazon": "Amazon",
    "bytedance": "ByteDance",
    "deepseek": "DeepSeek",
    "minimax": "MiniMax",
    "stepfun": "StepFun",
    "tencent": "Tencent",
    "xiaomi": "Xiaomi",
    "xai": "xAI",
    "zhipu": "Zhipu",
}
DEFAULT_PROMPT_TOKENS = "2955"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as source:
        return list(csv.DictReader(source))


def by_model(rows: list[dict[str, str]], source_name: str) -> dict[str, dict[str, str]]:
    indexed = {row["model"]: row for row in rows}
    if len(indexed) != len(rows):
        raise ValueError(f"La source {source_name} contient des modèles en double.")
    return indexed


def prompt_token_count(row: dict[str, str]) -> str:
    """Handle source rows where the token count occupies the URL column."""
    for value in (row.get("system_prompt_token_count"), row.get("system_prompt_url")):
        if value and value.isdigit():
            return value
    return DEFAULT_PROMPT_TOKENS


def main() -> None:
    params = read_csv(PARAMS_FILE)
    prompts = by_model(read_csv(PROMPTS_FILE), PROMPTS_FILE.name)
    pricing = by_model(read_csv(PRICING_FILE), PRICING_FILE.name)
    model_names = {row["model"] for row in params}

    if len(model_names) != len(params):
        raise ValueError(f"La source {PARAMS_FILE.name} contient des modèles en double.")
    if model_names != prompts.keys() or model_names != pricing.keys():
        raise ValueError("Les trois sources ne contiennent pas les mêmes modèles.")

    output_rows = []
    excluded_models = []
    for model in params:
        name = model["model"]
        vendor = model["vendor"]
        if vendor not in PROVIDERS:
            raise ValueError(f"Fournisseur non mappé pour {name}: {vendor}")

        prompt = prompts[name]
        price = pricing[name]
        if not price["input_token_price (€/M tokens)"] or not price["output_token_price"]:
            excluded_models.append(name)
            continue

        output_rows.append(
            {
                "provider": PROVIDERS[vendor],
                "model_name": name,
                "nb_params": model["estimated_params_billions"],
                "nb_params_activated": model["predicted_active_params_billions"],
                "system_prompt_token_count": prompt_token_count(prompt),
                # Zero is the numeric fallback expected by the application when
                # the source has no pricing ratio for a model.
                "input_ratio": price["ratio input price / output price"] or "0",
                "cache_ratio": price["ratio cached input/ input price"] or "0",
                # Record when this consolidated output is generated.
                "consolidation_date": date.today().isoformat(),
            }
        )

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=OUTPUT_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(output_rows)

    print(
        f"{len(output_rows)} modèles écrits dans {OUTPUT_FILE.relative_to(DATA_DIR.parent)} "
        f"({len(excluded_models)} exclus faute de prix input/output)."
    )


if __name__ == "__main__":
    main()
