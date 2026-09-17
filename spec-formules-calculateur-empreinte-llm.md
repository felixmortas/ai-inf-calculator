# Spécification des formules — Calculateur d'empreinte d'une requête LLM

Document de référence pour l'implémentation des sorties `nrj_request`, `co2_request`, `water_request` et `dry_risk_request`, à partir des inputs et données décrits dans le modèle initial.

---

## 0. Architecture de calcul (pipeline)

```
Blocs de conversation (system_prompt + conversation_bloc[1..N])
        │
        ▼
[1] Tokenisation ─────────► new_input(i) / history(i) / output(i)
        │
        ▼
[2] Énergie de calcul brute (IT energy) ─► pondérée par nb_params_activated
        │       ▲
        │       └── r_out dérivé du modèle Ecologits (§3bis), r_in/r_cache : sources externes
        ▼
[3] Énergie totale datacenter ──────────► × PUE(pays, fournisseur) = nrj_request(i)
        │
        ├──[4a]──► × emission_factor(pays)          = co2_request(i)
        ├──[4b]──► × WUE(pays, fournisseur)          = water_request(i)
        └──[4c]──► lookup dry_risk(pays, fournisseur) = dry_risk_request(i)
```

**Principe central :** `co2_request` et `water_request` ne se calculent **pas** directement à partir des tokens — ils dérivent tous les deux de `nrj_request`. Calculer `nrj_request` une seule fois par requête, puis le réutiliser pour les deux conversions.

Le calcul se fait **par bloc `i`** (= par requête/tour de conversation). Un bloc `i` correspond à l'appel API qui envoie tout l'historique + le nouveau message utilisateur, et reçoit en retour le raisonnement + la complétion.

> ⚠️ **Point d'architecture important :** le modèle Ecologits utilisé pour dériver `r_out` (§3bis) comporte son propre PUE générique interne (1.20), utilisé dans la littérature pour passer de l'énergie GPU/serveur à l'énergie datacenter. **Ce PUE interne ne doit pas être reporté dans `r_out`** : le pipeline applique déjà son propre `PUE(pays, fournisseur)` à l'étape [3], avec une donnée plus fine (par pays/fournisseur). Reporter les deux reviendrait à appliquer le PUE deux fois et à surestimer systématiquement `nrj_request`, `co2_request` et `water_request`. `r_out` doit donc être calculé à partir de l'énergie **IT brute** (avant PUE) du modèle Ecologits — voir §3bis.

---

## 1. Notations et unités

| Variable | Description | Unité | Source |
|---|---|---|---|
| `P_tot` | `nb_params` — nombre total de paramètres du modèle | paramètres (unité brute) | estimation IKP |
| `P_act` | `nb_params_activated` — paramètres activés (MoE) | paramètres (unité brute) | régression (modèles ouverts) |
| `EF(pays)` | `emission_factor` | gCO2e / kWh | carbon_emissions_intensity_2025.csv -> colonnes : Area, Emissions intensity (gCO2e/kWh) |
| `PUE(pays, fournisseur)` | Power Usage Effectiveness du datacenter (utilisé au pipeline, étape [3]) | sans unité (ratio ≥ 1) | data fournisseurs + extrapolation |
| `WUE(pays, fournisseur)` | Water Usage Effectiveness | L / kWh | data fournisseurs + extrapolation |
| `dry_risk(pays, fournisseur)` | Risque de sécheresse | catégoriel (ex. low/med/high/extreme) | country_drought_risk.csv --> colonnes : Area, drought_risk_level |
| `r_in` | `nrj_input_token` | Wh / token / milliard de paramètres activés | étude(s) ou price-based |
| `r_cache` | `nrj_cache_input_token` | Wh / token / milliard de paramètres activés | étude(s) ou price-based |
| `r_out` | `nrj_output_token` | Wh / token / milliard de paramètres activés | **Modèle Ecologits, sans Scope 3, TPS/TTFT fixes, énergie IT brute (hors PUE interne) — voir §3bis** |

> ⚠️ Vérifier que `r_in`, `r_cache`, `r_out` sont bien exprimés dans la **même unité d'énergie** (Wh recommandé) avant toute implémentation. Si les études sources donnent du J ou du kWh, convertir en amont dans la couche data. `r_out` est en Wh dès sa dérivation (§3bis), aucune conversion nécessaire.

---

## 2. Étape 1 — Tokenisation des blocs

### 2.1 Comptage des tokens d'un texte
Deux méthodes possibles (à choisir en fonction de la précision voulue) :
- **Tokenizer réel** (ex. `tiktoken`, tokenizer OpenAI) → exact, dépend du modèle.
- **Approximation** : `nb_tokens ≈ nb_mots / 0.7`

### 2.2 Répartition new_input / history / output

Soit `T(x)` le nombre de tokens d'un texte `x`, et `S` le `system_prompt`.

**Bloc 1 (premier échange) :**
```
new_input(1) = T(user_message(1))
history(1)   = T(S)
output(1)    = T(reasoning(1)) + T(completion(1))
```

**Bloc i > 1 :**
```
new_input(i) = T(user_message(i))

history(i) = T(S) + Σ_{j=1}^{i-1} [ T(user_message(j)) + T(reasoning(j)) + T(completion(j)) ]

output(i) = T(reasoning(i)) + T(completion(i))
```

> Le `system_prompt` est compté comme "cache" même au bloc 1, car il est supposé identique à chaque appel indépendant de l'utilisateur et donc mis en cache côté fournisseur.

> Si un `user_message` est en réalité un **output d'outil** (tool result), le traiter comme du texte classique côté tokenisation — pas de règle spéciale nécessaire à ce niveau.

---

## 3. Étape 2 — Énergie de calcul brute (compute energy)

Les taux `r_in`, `r_cache`, `r_out` sont normalisés **par milliard de paramètres activés**. On les pondère donc par `P_act / 1e9` :

```
nrj_compute(i) = new_input(i) × r_in    × (P_act / 1e9)
               + history(i)   × r_cache × (P_act / 1e9)
               + output(i)    × r_out   × (P_act / 1e9)
```

Résultat en **Wh** (énergie IT brute, hors overhead datacenter).

> ⚠️ **Hypothèse d'extrapolation linéaire (nouvelle, cf. §11 pt. 6).** Cette pondération par `P_act / 1e9` suppose que l'énergie par token croît **linéairement** avec le nombre de paramètres activés. C'est une approximation : `r_out` est dérivé (§3bis) d'un modèle Ecologits calibré pour un modèle de **1 milliard de paramètres exactement**, et ce modèle contient des termes non strictement proportionnels aux paramètres (offset constant `ENERGY_GAMMA`, terme de latence constant `LATENCY_GAMMA`). L'extrapolation linéaire via `P_act/1e9` reste l'approche retenue par simplicité et cohérence avec `r_in`/`r_cache`, mais elle sous/sur-estime légèrement l'énergie réelle pour des `P_act` très éloignés de 1 milliard (voir §11).

---

## 3bis. Dérivation de `r_out` — modèle Ecologits (sans Scope 3, TPS/TTFT fixes)

Cette section documente le calcul de référence permettant d'obtenir la valeur numérique de `r_out` (Wh / token / milliard de paramètres activés) utilisée dans le pipeline (§3). Le calcul est effectué **une seule fois pour un modèle dense de référence de 1 milliard de paramètres** ; le résultat sert directement de taux unitaire `r_out`, ensuite pondéré par `P_act/1e9` comme les autres taux.

### 3bis.1 Objectif

Calculer la consommation électrique liée à l'inférence d'un LLM dense de 1 milliard de paramètres, par output token généré, à partir du modèle Ecologits (sans Scope 3, avec TPS et TTFT fixes — i.e. throughput et temps de calcul par token traités comme des constantes plutôt que mesurés par requête).

### 3bis.2 Input

Aucun input variable côté utilisateur pour cette dérivation : `r_out` est une **constante calculée une fois** à l'implémentation (ou recalculée si les constantes internes changent), puis réutilisée pour toutes les requêtes. Le seul input qui varie ensuite dans le pipeline est `output_tokens` (= `output(i)`, §2), déjà couvert par la formule §3.

### 3bis.3 Constantes internes (modèle de référence)

| Constante | Valeur |
|---|---|
| `PARAMETERS_BILLIONS` | 1 |
| `BATCH_SIZE` | 64 |
| `GPU_COUNT` | 1 |
| `GPU_INSTALLED_PER_SERVER` | 8 |
| `SERVER_POWER_WITHOUT_GPU_W` | 1200 |
| `PUE_ECOLOGITS` *(interne au modèle Ecologits, **non réutilisé** dans le pipeline — voir avertissement §0)* | 1.20 |
| `ENERGY_ALPHA` | 1.17e-6 |
| `ENERGY_BETA` | -1.12e-2 |
| `ENERGY_GAMMA` | 4.05e-5 |
| `LATENCY_ALPHA` | 6.78e-4 |
| `LATENCY_BETA` | 3.12e-4 |
| `LATENCY_GAMMA` | 1.94e-2 |

### 3bis.4 Calculs

```
gpu_energy_per_token_wh =
    ENERGY_ALPHA
    × exp(ENERGY_BETA × BATCH_SIZE)
    × PARAMETERS_BILLIONS
    + ENERGY_GAMMA

token_compute_time_seconds =
    LATENCY_ALPHA × PARAMETERS_BILLIONS
    + LATENCY_BETA × BATCH_SIZE
    + LATENCY_GAMMA

server_energy_without_gpu_per_token_wh =
    token_compute_time_seconds
    × (SERVER_POWER_WITHOUT_GPU_W / 3600)
    × (GPU_COUNT / GPU_INSTALLED_PER_SERVER)
    / BATCH_SIZE

it_energy_per_token_wh =
    gpu_energy_per_token_wh
    + server_energy_without_gpu_per_token_wh
```

**`it_energy_per_token_wh` est l'énergie IT brute, avant tout PUE.** C'est cette valeur — et non le résultat après application du `PUE_ECOLOGITS` générique — qui doit être utilisée comme `r_out` dans le pipeline, puisque le PUE spécifique pays/fournisseur est déjà appliqué séparément à l'étape [3] du pipeline principal (§0, §4).

Pour information, le calcul complet du modèle Ecologits (avec son PUE générique inclus) donnerait :

```
energy_per_token_wh_ECOLOGITS_COMPLET =
    PUE_ECOLOGITS × it_energy_per_token_wh
```

Cette dernière valeur **n'est pas** celle à utiliser comme `r_out` (elle est fournie ici uniquement pour référence/traçabilité vis-à-vis de la méthodologie Ecologits d'origine).

### 3bis.5 Valeur retenue pour `r_out`

```
r_out = it_energy_per_token_wh
```

### 3bis.6 Valeurs précalculées

| Grandeur | Valeur |
|---|---|
| `gpu_energy_per_token_wh` | ≈ 0.0000410713 |
| `token_compute_time_seconds` | 0.040046 |
| `server_energy_without_gpu_per_token_wh` | ≈ 0.0000260716 |
| **`it_energy_per_token_wh` (= `r_out` retenu)** | **≈ 0.0000671429 Wh/token** |
| `energy_per_token_wh_ECOLOGITS_COMPLET` (avec PUE Ecologits — non utilisé dans le pipeline) | ≈ 0.0000805715 |

### 3bis.7 Formule simplifiée (si `r_out` est codé en dur plutôt que recalculé)

```
r_out ≈ 0.0000671429   # Wh / output token / milliard de paramètres activés
```

> Ne pas utiliser `0.0000805715` comme `r_out` dans le pipeline principal : cette valeur inclut déjà un PUE générique (1.20) qui ferait doublon avec `PUE(pays, fournisseur)` appliqué à l'étape [3] du pipeline (§0, §4).

---

## 4. Étape 3 — Énergie totale de la requête : `nrj_request`

Application du PUE (électricité totale consommée par le datacenter pour produire cette énergie de calcul, refroidissement inclus) :

```
nrj_request(i) = nrj_compute(i) × PUE(pays, fournisseur)
```

**Unité de sortie : Wh** (convertir en kWh en divisant par 1000 pour les étapes suivantes si besoin).

---

## 5. Étape 4a — Émissions carbone : `co2_request`

```
co2_request(i) = (nrj_request(i) / 1000)   ×   EF(pays)
                  [kWh]                        [gCO2e/kWh]
```

**Unité de sortie : gCO2e** (diviser par 1000 pour obtenir du kgCO2e si préférence d'affichage).

> Le pays utilisé ici est le `country` associé à la requête (pré-rempli depuis le `provider`, donc le pays du datacenter — pas le pays de l'utilisateur final).

---

## 6. Étape 4b — Consommation d'eau : `water_request`

```
water_request(i) = (nrj_request(i) / 1000)   ×   WUE(pays, fournisseur)
                     [kWh]                        [L/kWh]
```

**Unité de sortie : Litres**.

> **Simplification actuelle** : on n'utilise que le WUE "on-site" du datacenter (fourni par la donnée). Un modèle plus complet ajouterait l'eau "off-site" liée à la production électrique elle-même (WUE source, dépendant du mix énergétique du pays). Voir section 11 si vous voulez affiner plus tard.

---

## 7. Étape 4c — Indicateur de risque : `dry_risk_request`

```
dry_risk_request(i) = dry_risk(pays, fournisseur)   # simple lookup, pas de calcul
```

C'est un **label catégoriel** (issu de WRI Aqueduct), pas une valeur numérique combinée à `water_request`. Il s'affiche à côté de `water_request` pour contextualiser le risque (ex. "12 L consommés — pays à risque de sécheresse ÉLEVÉ").

---

## 8. Agrégation sur une conversation entière (optionnel)

Le modèle de données autorise un nombre infini de `conversation_bloc`. Deux métriques sont possibles côté produit — à décider avec le développeur du site :

- **Par requête** (ce que ce document calcule) : `nrj_request(i)`, `co2_request(i)`, `water_request(i)` pour le dernier bloc ajouté.
- **Cumulé sur la conversation** :
```
nrj_total   = Σ_{i=1}^{N} nrj_request(i)
co2_total   = Σ_{i=1}^{N} co2_request(i)
water_total = Σ_{i=1}^{N} water_request(i)
```

Recommandation : afficher les deux sur le calculateur (coût du dernier tour + coût cumulé de la conversation), car `history(i)` grossit avec chaque bloc et le coût par requête augmente mécaniquement au fil de la conversation même si le fournisseur facture le cache moins cher.

---

## 9. Résumé condensé des formules

```
new_input(i), history(i), output(i)          → tokenisation (§2)

r_out = it_energy_per_token_wh (modèle Ecologits 1B, hors Scope 3, hors PUE interne) ≈ 0.0000671429  (§3bis)

nrj_compute(i) = (P_act/1e9) × [ new_input(i)·r_in + history(i)·r_cache + output(i)·r_out ]

nrj_request(i) = nrj_compute(i) × PUE(pays, fournisseur)                    [Wh]

co2_request(i)   = (nrj_request(i)/1000) × EF(pays)                          [gCO2e]

water_request(i) = (nrj_request(i)/1000) × WUE(pays, fournisseur)            [L]

dry_risk_request(i) = dry_risk(pays, fournisseur)                            [catégoriel]
```

---

## 10. Exemple chiffré (illustratif, valeurs fictives)

| Variable | Valeur |
|---|---|
| `P_act` | 37 milliards |
| `new_input(i)` | 500 tokens |
| `history(i)` | 4 000 tokens |
| `output(i)` | 800 tokens |
| `r_in` | 0.0020 Wh/token/Md params |
| `r_cache` | 0.0004 Wh/token/Md params |
| `r_out` | 0.0000671429 Wh/token/Md params *(dérivé Ecologits, §3bis — remplace la valeur fictive précédente)* |
| `PUE` | 1.15 |
| `EF(pays)` | 60 gCO2e/kWh |
| `WUE(pays, fournisseur)` | 1.8 L/kWh |

```
nrj_compute = 37 × [500×0.0020 + 4000×0.0004 + 800×0.0000671429]
            = 37 × [1.0 + 1.6 + 0.05371432]
            = 37 × 2.65371432
            = 98.187 Wh

nrj_request = 98.187 × 1.15 = 112.915 Wh  (0.112915 kWh)

co2_request   = 0.112915 × 60  = 6.775 gCO2e
water_request = 0.112915 × 1.8 = 0.203 L
```

> Cet exemple remplace le précédent (qui utilisait une valeur fictive de `r_out = 0.0060`) pour refléter la valeur réelle dérivée du modèle Ecologits. Les valeurs de `r_in`/`r_cache` restent fictives, en attente de la source définitive (cf. §1).

---

## 11. Hypothèses et points ouverts à valider avec l'équipe data

1. **Raisonnement vs complétion** : le modèle de données ne définit qu'un seul taux `nrj_output_token`. On suppose que `reasoning` et `completion` ont le même coût énergétique par token. En réalité, le coût énergétique d'un token d'output dépend du nombre de tokens générés précédemment. Dans le modèle, on suppose que tous les tokens d'output ont le même coût énergétique.
2. **`nb_params_activated` pour les modèles fermés** : la régression est réalisée avec des modèles ouverts. Elle sera utilisée pour les modèles propriétaires (GPT, Claude, Gemini...).
3. **Taux de succès du cache réel** : le modèle suppose 100% de cache hit sur l'historique, même si en pratique certains appels API n'activent pas le cache (première requête après expiration, changement de paramètres, etc.).
4. **WUE on-site uniquement** : pas de prise en compte de l'eau utilisée pour produire l'électricité elle-même (WUE source, lié au mix énergétique du pays). À ajouter en V2 si les données sont disponibles.
5. **Unités des taux `r_in`/`r_cache`/`r_out`** : à harmoniser en Wh avant implémentation — vérifier l'unité de chaque étude source. `r_out` est désormais fixé par dérivation Ecologits (§3bis), en Wh dès l'origine.
6. **(Nouveau) Extrapolation linéaire de `r_out` par `P_act`** : le modèle Ecologits utilisé (§3bis) est calibré pour un modèle dense de 1 milliard de paramètres exactement. Le pipeline extrapole ce taux linéairement à n'importe quel `P_act` via `P_act/1e9` (§3), alors que la formule Ecologits d'origine contient des termes non strictement proportionnels aux paramètres (`ENERGY_GAMMA`, `LATENCY_GAMMA`, `LATENCY_BETA×BATCH_SIZE`). Cette approximation est jugée acceptable pour la V1 (cohérence avec le traitement de `r_in`/`r_cache`, simplicité d'implémentation), mais introduit une erreur croissante pour des `P_act` très supérieurs à quelques milliards. À réévaluer si l'équipe data souhaite une précision plus fine par tranche de taille de modèle.
7. **(Nouveau) PUE Ecologits vs PUE pipeline** : le modèle Ecologits (§3bis) intègre nativement un PUE générique de 1.20. Ce PUE **n'est pas** reporté dans `r_out` (on ne conserve que `it_energy_per_token_wh`, avant PUE) pour éviter un double comptage avec `PUE(pays, fournisseur)` appliqué à l'étape [3] du pipeline principal. Décision actée : le PUE pays/fournisseur, plus précis, prévaut sur le PUE générique Ecologits.

> Les hypothèses 1 à 5 sont validées par l'équipe data. Les points 6 et 7 sont nouveaux (introduits par l'intégration de la dérivation Ecologits de `r_out`) et restent à valider explicitement.

---

## 12. Implémentation de référence (Python)

```python
import math
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Ecologits-derived reference model (§3bis): computes r_out, the energy cost
# per output token per billion activated parameters, for a 1B-parameter dense
# model, excluding Scope 3 and with fixed TPS/TTFT assumptions.
# ---------------------------------------------------------------------------

# Reference model constants (fixed, not user-configurable)
PARAMETERS_BILLIONS = 1
BATCH_SIZE = 64
GPU_COUNT = 1
GPU_INSTALLED_PER_SERVER = 8
SERVER_POWER_WITHOUT_GPU_W = 1200
PUE_ECOLOGITS = 1.20  # generic PUE from the Ecologits methodology (NOT reused in the main pipeline)

ENERGY_ALPHA = 1.17e-6
ENERGY_BETA = -1.12e-2
ENERGY_GAMMA = 4.05e-5

LATENCY_ALPHA = 6.78e-4
LATENCY_BETA = 3.12e-4
LATENCY_GAMMA = 1.94e-2


def derive_r_out_wh_per_token() -> float:
    """
    Derive r_out (Wh / output token / billion activated params) from the
    Ecologits methodology, using the *raw IT energy* (before any PUE),
    because the pipeline applies its own country/provider-specific PUE
    later on (see WARNING in spec section 0 / hypothesis 7 in section 11).

    Do NOT multiply the result by PUE_ECOLOGITS: that generic PUE would
    double-count against PUE(country, provider) applied downstream.
    """
    # GPU energy per token (Wh), linear in params + fixed offset
    gpu_energy_per_token_wh = (
        ENERGY_ALPHA * math.exp(ENERGY_BETA * BATCH_SIZE) * PARAMETERS_BILLIONS
        + ENERGY_GAMMA
    )

    # Compute time per token (seconds), used to amortize server (non-GPU) power
    token_compute_time_seconds = (
        LATENCY_ALPHA * PARAMETERS_BILLIONS
        + LATENCY_BETA * BATCH_SIZE
        + LATENCY_GAMMA
    )

    # Server power (excluding GPUs) allocated per token, per GPU, per batch slot
    server_energy_without_gpu_per_token_wh = (
        token_compute_time_seconds
        * (SERVER_POWER_WITHOUT_GPU_W / 3600)
        * (GPU_COUNT / GPU_INSTALLED_PER_SERVER)
        / BATCH_SIZE
    )

    # Raw IT energy per token, before any datacenter-level PUE
    it_energy_per_token_wh = gpu_energy_per_token_wh + server_energy_without_gpu_per_token_wh

    return it_energy_per_token_wh  # this is r_out, as used in the main pipeline


# Precomputed value (can be hardcoded instead of recalculated at runtime,
# as long as the constants above never change): r_out ~= 0.0000671429 Wh/token
R_OUT_WH_PER_TOKEN = derive_r_out_wh_per_token()


# ---------------------------------------------------------------------------
# Main pipeline (unchanged in structure, now fed with the derived r_out)
# ---------------------------------------------------------------------------

@dataclass
class ModelConfig:
    """Static configuration for a given model + provider + country."""
    params_activated_billions: float  # P_act, in billions of parameters
    pue: float                        # datacenter Power Usage Effectiveness (country/provider specific)
    emission_factor_g_per_kwh: float  # gCO2e per kWh
    wue_l_per_kwh: float              # liters per kWh
    dry_risk: str                     # categorical label, e.g. "high"


@dataclass
class TokenRates:
    """Energy rates per token, per billion activated parameters (Wh)."""
    input_rate: float       # r_in (external study / price-based)
    cache_input_rate: float # r_cache (external study / price-based)
    output_rate: float      # r_out, from derive_r_out_wh_per_token() (Ecologits-based)


@dataclass
class RequestResult:
    nrj_wh: float
    co2_g: float
    water_l: float
    dry_risk: str


def compute_request_footprint(
    new_input_tokens: int,
    history_tokens: int,
    output_tokens: int,
    model: ModelConfig,
    rates: TokenRates,
) -> RequestResult:
    """
    Compute the energy, CO2 and water footprint of a single LLM request (one
    conversation bloc), following the pipeline:
      tokens -> compute energy -> +PUE -> nrj_request -> co2/water/dry_risk
    """
    # Step 1: raw compute energy, scaled by activated params (per billion).
    # NOTE: this linearly extrapolates r_out (calibrated for a 1B model) to
    # arbitrary P_act - an approximation, see spec section 11, hypothesis 6.
    nrj_compute_wh = model.params_activated_billions * (
        new_input_tokens * rates.input_rate
        + history_tokens * rates.cache_input_rate
        + output_tokens * rates.output_rate
    )

    # Step 2: total datacenter energy, including cooling/overhead.
    # This PUE is country/provider-specific and replaces PUE_ECOLOGITS,
    # which is intentionally excluded from r_out (see hypothesis 7).
    nrj_request_wh = nrj_compute_wh * model.pue

    # Step 3: derive CO2 and water from nrj_request (convert Wh -> kWh)
    nrj_request_kwh = nrj_request_wh / 1000
    co2_request_g = nrj_request_kwh * model.emission_factor_g_per_kwh
    water_request_l = nrj_request_kwh * model.wue_l_per_kwh

    # Step 4: dry risk is a plain lookup, not derived from energy
    return RequestResult(
        nrj_wh=nrj_request_wh,
        co2_g=co2_request_g,
        water_l=water_request_l,
        dry_risk=model.dry_risk,
    )


def compute_conversation_footprint(
    blocs: list[dict],  # each: {"user_message": str, "reasoning": str, "completion": str}
    system_prompt: str,
    model: ModelConfig,
    rates: TokenRates,
    count_tokens,  # callable: str -> int (real tokenizer or word-based estimate)
) -> list[RequestResult]:
    """
    Walk through all conversation blocs and compute the per-request footprint
    for each one, applying the new_input / history / output split described
    in the spec (system prompt counted as new input only on the first bloc).
    """
    results: list[RequestResult] = []
    history_tokens = count_tokens(system_prompt)

    for i, bloc in enumerate(blocs):
        user_tokens = count_tokens(bloc["user_message"])
        reasoning_tokens = count_tokens(bloc.get("reasoning", ""))
        completion_tokens = count_tokens(bloc.get("completion", ""))

        # Subsequent requests: only the new user message is "new";
        # everything before it (system prompt + prior blocs) is cached
        new_input_tokens = user_tokens

        output_tokens = reasoning_tokens + completion_tokens

        result = compute_request_footprint(
            new_input_tokens=new_input_tokens,
            history_tokens=history_tokens,
            output_tokens=output_tokens,
            model=model,
            rates=rates,
        )
        results.append(result)

        # Update running history for the NEXT bloc: everything exchanged so far
        history_tokens += user_tokens + reasoning_tokens + completion_tokens

    return results
```

Ce squelette est volontairement simple (pas de gestion d'erreurs, pas de cache_hit_rate) — à adapter selon les décisions prises sur les points ouverts de la section 11.
