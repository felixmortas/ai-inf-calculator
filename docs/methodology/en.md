# Methodology for Estimating the Environmental Footprint of LLM Inference

## 1. Purpose, scope and guiding principle

### 1.1 Purpose

Estimate the electricity, greenhouse gas emissions (gCO₂e), and water consumed by a **conversation** with a chatbot, calculated **exchange by exchange** (an exchange = an API call that receives the history and the new message, and returns visible reasoning and a response).

### 1.2 Included scope

* **Inference** energy (use phase) of the data center.
* Associated emissions, via the grid carbon intensity of the **country where the data center is hosted**.
* **On-site** water (cooling), via WUE.
* Carbon equivalent expressed as the duration of an electric hot shower.
* Electricity comparison expressed as the duration of a LED light bulb being on.

### 1.3 Excluded scope

Scope 3 (manufacturing and depreciation of GPUs, servers, buildings); model training; off-site water associated with electricity generation; metal extraction; network and end-user devices; invisible reasoning; image, audio, video; quantified uncertainty range.
The result is a **use-phase footprint, an order of magnitude**, not a life-cycle footprint.

### 1.4 Guiding principle: physically model what can be modeled, rely on observable data for the rest

Proprietary models (GPT, Claude, Gemini…) publish neither activated parameters, hardware, nor actual GPU utilization rates. Two pieces of information remain accessible: an estimate of the number of parameters (IKP research) and API pricing schedules. Therefore:

* the energy of **output** tokens is physically modeled using the Ecologits model, because this is the component that varies most with model size and the decoding regime is the best characterized publicly.
* the energy of **input** and **cache** tokens is derived from the **price ratios** charged, due to the lack of a relevant physical model for prefill and encoding dynamics.

---

## 2. Calculation chain

```text
Model (P_tot, P_act, κ_in, κ_cache, S_tokens, country/provider)  +  texts of exchange i
   │
   ▼ [1] Token counting: new_input(i), history(i), output(i)          (§5)
   ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, gross IT]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(country, provider)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(country)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(country, provider)   [L]
   ▼ [5] Aggregation: Σ across up-to-date exchanges; shower and LED equivalents  (§8, §9)
```

---

## 3. Notation and units

| Symbol                     | Meaning                                     | Unit          | Source                               |
| -------------------------- | ------------------------------------------- | ------------- | ------------------------------------ |
| `P_tot`                    | total parameters                            | billions      | IKP estimate (§4.2)                  |
| `P_act`                    | activated parameters (MoE)                  | billions      | regression on IKP open models (§4.3) |
| `S_tokens`                 | system prompt tokens                        | tokens        | §4.4                                 |
| `κ_in`, `κ_cache`          | input/output and cache/input price ratios   | dimensionless | §4.5                                 |
| `EF(country)`              | carbon intensity of electricity generation  | gCO₂e/kWh     | §4.1                                 |
| `PUE(country, provider)`   | data center energy efficiency               | ratio ≥ 1     | §4.7                                 |
| `WUE(country, provider)`   | water consumed per kWh                      | L/kWh         | §4.8                                 |
| `r_out`, `r_in`, `r_cache` | IT energy per output / input / cached token | Wh/token      | §6                                   |

---

## 4. Data and how it is constructed

### 4.1 Carbon emission factors `EF`

* **Source**: Ember “generation yearly global” dataset (`release_generation_yearly_global.csv`).
* **Filters**: `Area type = Country or economy`; year **2025**; `Electricity source = Total generation` (intensity of the domestic generation mix).
* **Variable**: `Emissions intensity (gCO2e/kWh)`; observations without a value are excluded.
* **World reference**: `World` row = **473 gCO₂e/kWh**, global **2024** intensity (Ember, *Global Electricity Review 2025*).

### 4.2 Total parameters `P_tot` of closed models

Estimates from the article [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration).

### 4.3 Activated parameters `P_act` of closed models

1. Construction of a CSV (`model, params, params_activated`) from `configs/all_models.json` in the `19PINE-AI/ikp` repository, retaining only models whose `params` and `params_activated` are **filled in and different** (MoE models).
2. Addition of **20 Hugging Face models**.
3. Removal of duplicates and **gpt-4** (parameter count cannot be verified).
4. **Regression** `P_act = f(P_tot)` using an **exponential** form fitted to these open models, then applied to closed models. Scripts: `ai-inf-calculator/data/analyze_moe_params.py` (fitting) and `visualize_closed_model_params.py` (prediction).

### 4.4 System prompt tokens `S_tokens`

* Counted **with the calculator's tokenizer** on the disclosed system prompts from the `asgeirtj/system_prompts_leaks` repository.
* Model without a corresponding prompt: assigned, in order of priority, (1) the prompt of the **closest model from the same family**, (2) failing that, the **median** of all prompts. The median is used because it is insensitive to extreme values and special cases (e.g. Claude Fable 5).
* `S_tokens` is a catalog value, in tokens (not converted via words/token); it is a **fixed and hidden** parameter imposed on the user.

### 4.5 Pricing ratios `κ_in`, `κ_cache`

```text
κ_in(model, provider)    = input_price / output_price
κ_cache(model, provider) = cached_input_price / input_price
```

* Sources: public prices, collected notably from **OpenRouter**, converted to the **same currency and the same number of tokens**.
* Calculated **per model and provider**, never fixed as a universal constant.
* An **offline** calibration script retrieves prices as of a given date and **stores the date** together with the ratios and the exact pricing source.
* **“Market-based” choice**: a simple approach, deliberately not representative of physical cost, considered balanced given the other uncertainties.

### 4.6 Data center location (LLM provider → cloud → country)

| LLM provider                       | Selected cloud                                                | Default country (free users)                          |
| ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| OpenAI (Microsoft partnership)     | Azure                                                         | United States                                         |
| Mistral AI (Microsoft partnership) | Azure                                                         | sovereign centers in Europe, probably **Switzerland** |
| Gemini                             | Google Cloud (mandatory)                                      | United States                                         |
| Anthropic                          | AWS (most competitive cloud among the three possible options) | United States                                         |

These are **probable and adjustable location assumptions**. For **comparison between models**, the simplifying assumption is that providers' data centers are in the **United States**; this is why the **drought risk indicator was removed** (it added data and complexity without differentiating models under this assumption).

### 4.7 PUE by country and provider

Four-level cascade of decreasing reliability, with traceability of the level used:

1. **measured**: value published by AWS, Azure, or GCP for the specific country/region;
2. **estimated**: regional interpolation (country without a known data center, within an area with a published PUE);
3. **regional**: aggregated regional PUE (Asia-Pacific, EMEA…);
4. **global**: provider's global average PUE (isolated countries).

The generic Ecologits PUE of 1.20 is **excluded** from `r_out` and replaced by this geographic PUE, applied only once (§2).

### 4.8 WUE by country and provider

Providers publish only **regional** WUE values. Each country is assigned to the nearest cloud region; if the regional value exists (e.g. Singapore 1.57 L/kWh for AWS), it is used as is; otherwise, the **provider's global average** is used, without subjective adjustment. The imputation relies exclusively on published data but masks intra-regional variability (cooling technology, design).

### 4.9 Model catalog

A local catalog by model/provider: `P_tot`, `P_act`, `S_tokens`, reference country, `κ_in`, `κ_cache`, and the `PUE`, `EF`, `WUE` factors. Default models offered: ChatGPT → current small model (without subscription), current large model (with subscription); Mistral → small model (fast), large model (reasoning).

---

## 5. Token counting

### 5.1 Tokenization

* By default: **Tiktoken**, run locally (browser Worker); no text is sent.
* Fallback in case of failure: `T(text) = number_of_words / coefficient`, coefficient **0.75** word/token by default (OpenAI reference), adjustable; words are segmented at non-alphanumeric characters.
* `T(empty text) = 0`; reasoning not provided = 0. A tool result pasted into a message is ordinary text.

### 5.2 Token composition of an exchange `i`

Indices follow the order of **populated** exchanges (an entirely empty block is ignored, including for the system prompt). `M_i` message, `R_i` visible reasoning, `C_i` response, `A_i` complete version of the artifact provided in exchange `i`.

```text
A_prec(i) = last complete version of an artifact provided before i (empty if none)
D_i       = passages added or modified from A_i compared with A_prec(i)
            (A_i complete on the first version; empty if no artifact)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

Associated rules:

* `S_tokens` is charged at the cache rate **from the first exchange**.
* The history **does not accumulate** previous artifact versions or their differences: only the latest complete version counts. The diff from the current exchange goes into **output**; its complete version becomes the next reference.
* Identical versions → 0 artifact tokens in output; a deletion alone adds no output tokens, which underestimates the final impact.
* The entire history is assumed to be **100% cached**.

---

## 6. IT energy per token

### 6.1 `r_out`: Ecologits physical model (excluding Scope 3, fixed TPS/TTFT)

Public regression on real hardware; batch and computation time per token are treated as deterministic functions of the constants (”fixed TPS/TTFT” assumption).

| Constant                           |                        Value | Role                                                                 |
| ---------------------------------- | ---------------------------: | -------------------------------------------------------------------- |
| `BATCH_SIZE`                       |                           64 | requests served in parallel                                          |
| `GPU_INSTALLED_PER_SERVER`         |                            8 | GPUs per server                                                      |
| `SERVER_POWER_WITHOUT_GPU_W`       |                         1200 | server power excluding GPUs (CPU, RAM, power supply, ventilation), W |
| `GPU_MEMORY_GB`                    |                           80 | VRAM per GPU (A100/H100 class)                                       |
| `QUANTIZATION_BITS`                |                           16 | bits per weight                                                      |
| `MEMORY_OVERHEAD`                  |                          1.2 | memory margin (KV cache, activations, fragmentation)                 |
| `ENERGY_ALPHA` / `BETA` / `GAMMA`  | 1.17e-6 / −1.12e-2 / 4.05e-5 | GPU energy regression                                                |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` |  6.78e-4 / 3.12e-4 / 1.94e-2 | latency regression                                                   |

**Equations:**

```text
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` and `r_cache`: anchoring to `r_out` through prices

```text
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```

They therefore inherit the dependence on `P_act`/`P_tot` without independent re-estimation (no methodological heterogeneity).

### 6.3 Rationale for price-based rather than a physical prefill model (compute-bound vs memory-bound, considered then rejected)

1. **Observability**: MFU, batch size, and prefill hardware of closed models are not observable, whereas decoding latency can be measured externally; a physical prefill model would rely on unverifiable assumptions, while the price is public, dated, and model-specific.
2. **Scalability**: the catalog evolves continuously; a physical ratio would require recalibrating hardware efficiency for every model without data; price is updated with each announcement.
3. **Opposing biases deliberately accepted and not corrected separately**:

   * cache pricing probably **overestimates** its energy cost (memory read, marginal cost close to zero; price reflects infrastructure depreciation and a commercial logic) → upward bias on `r_cache`;
   * `r_out` treats all output tokens as having equal cost, whereas the actual cost **increases** with the number of input and already-generated tokens (growing KV-cache) → **underestimation** of long contexts and long completions, downward bias on `r_in` and `r_out`.
     In a multi-turn conversation, cached history includes previous outputs, so the volume billed at the “cache” rate grows and the two biases, of the same order of magnitude, approximately offset each other. This is a simplification, not an elimination of the error.
4. **Consistency** with the rest of the methodology, which already uses an observable proxy (public regression) for `P_act` of closed models.

---

## 7. Impacts: energy, carbon, water

```text
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(hosting_country, provider)                 [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(hosting_country)                     [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(hosting_country, provider)           [L]
```

---

## 8. Equivalents

### 8.1 Electric shower

Flow rate 15 L/min; 18 → 38 °C (20 °C increase according to thermodynamics); 0.0232 kWh/L ⇒ **0.348 kWh/min**. Default parameters, adjustable.

```text
carbon_shower_min = flow_rate × energy_per_liter × EF_user      [gCO₂e/min]
duration_minutes  = C / (0.348 × EF_user)
duration_seconds   = 60 × C / carbon_shower_min
```

* `EF_user` is the country of the **user** (detected or corrected).
* **Carbon-only** comparison; no equivalent water volume is calculated.

### 8.2 LED light bulb

Comparison of the conversation's **electricity**, expressed as the duration of a LED light bulb being on.

```text
E_total   = Σ nrj_request(i)    [Wh]   up-to-date exchanges, PUE included
P_LED     = 5 W                 [W]    default, adjustable
duration_LED = E_total / P_LED     [h]    (seconds: 3,600 × E_total / P_LED)
```

* `P_LED` must be strictly positive; otherwise the duration cannot be calculated.
* Carbon and water are not affected; `P_LED` is not involved in any impact equation.
* The 5 W value is an illustrative convention, not a measurement.

---

## 9. Limitations

### 9.1. Absence of uncertainty

The result is a single point, while the chain combines highly noisy estimates. Errors therefore multiply, so excluding the uncertainty range amounts to displaying a level of precision that the methodology does not possess.
This uncertainty is not a problem when using the calculator for educational purposes. The skills to be conveyed are based on comparing practices, all using the same measurement methodology.

### 9.2. Regression `P_act = f(P_tot)`

We assume that all proprietary models are MoE because dense models with that many parameters are unlikely. However, if one of them is dense, `P_act` is substantially underestimated.
The exponential form of the function diverges outside the fitting range. However, the estimated closed models are beyond most open models.

### 9.3. Invisible reasoning excluded

For “reasoning” models, hidden reasoning tokens can greatly exceed the visible response. Their exclusion produces an overall underestimation and favors reasoning models in the comparison. A reminder is provided in the best practices.

### 9.4. Price anchoring

`κ_in` changes when a provider lowers its price, possibly without any physical change. Long-context surcharges and batch or priority pricing pose the same problem. Pricing may have no correlation with energy consumption during processing.

### 9.5. Choice of EF, PUE and WUE

Since the location of private providers' models is not known, it is difficult to estimate these variables.

---

## 10. Sources

* Ember — Electricity generation yearly (`release_generation_yearly_global.csv`); *Global Electricity Review 2025* (World reference).
* IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp); `19PINE-AI/ikp` repository (`configs/all_models.json`).
* Hugging Face - 20 additional models for estimating `P_act` of IKP models.
* Ecologits — estimation of the energy cost of a token.
* OpenRouter and public provider pricing schedules.
* `asgeirtj/system_prompts_leaks` repository - system prompts.
* AWS (2025), Azure (FY25), Google Cloud (2024) PUE/WUE publications.
* Project scripts: `analyze_moe_params.py`, `visualize_closed_model_params.py`.
