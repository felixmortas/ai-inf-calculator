# Spécification des formules — Calculateur d'empreinte d'une requête LLM

Document de référence pour l'implémentation des sorties `nrj_request`, `co2_request`, `water_request` et `dry_risk_request`.

**Version 2** — intègre la dérivation Ecologits de l'énergie par output token, désormais fonction affine du nombre de paramètres (`§3bis`), et le nombre de GPU dérivé de la taille du modèle.

---

## 0. Architecture de calcul (pipeline)

```
Inputs utilisateur : modèle (P_tot, P_act) + nb tokens (new_input, cache, output)
        │
        ▼
[1] Tokenisation (optionnelle, §2) ─────► new_input(i) / history(i) / output(i)
        │
        ▼
[2] Énergie de calcul brute (IT energy, hors PUE)
        │   ├── input + cache : taux r_in / r_cache, pondérés par P_act/1e9
        │   └── output        : r_out(P_act, P_tot), fonction affine (§3bis)
        ▼
[3] Énergie totale datacenter ──────────► × PUE(pays, fournisseur) = nrj_request(i)
        │
        ├──[4a]──► × emission_factor(pays)           = co2_request(i)
        ├──[4b]──► × WUE(pays, fournisseur)          = water_request(i)
        └──[4c]──► lookup dry_risk(pays, fournisseur) = dry_risk_request(i)
```

**Principe central :** `co2_request` et `water_request` ne se calculent **pas** directement à partir des tokens — ils dérivent tous les deux de `nrj_request`. Calculer `nrj_request` une seule fois par requête, puis le réutiliser pour les deux conversions.

Le calcul se fait **par requête** (un bloc `i` = un appel API envoyant l'historique + le nouveau message, et retournant raisonnement + complétion).

---

## 1. Notations et unités

| Variable | Description | Unité | Source |
|---|---|---|---|
| `P_tot` | `nb_params` — nombre **total** de paramètres du modèle | milliards de paramètres | estimation IKP |
| `P_act` | `nb_params_activated` — paramètres **activés** (MoE) | milliards de paramètres | régression (modèles ouverts) |
| `EF(pays)` | `emission_factor` | gCO2e / kWh | carbon_emissions_intensity_2025.csv → colonnes : Area, Emissions intensity (gCO2e/kWh) |
| `PUE(pays, fournisseur)` | Power Usage Effectiveness du datacenter (étape [3]) | sans unité (ratio ≥ 1) | data fournisseurs + extrapolation |
| `WUE(pays, fournisseur)` | Water Usage Effectiveness | L / kWh | data fournisseurs + extrapolation |
| `dry_risk(pays, fournisseur)` | Risque de sécheresse | catégoriel (low/med/high/extreme) | country_drought_risk.csv → colonnes : Area, drought_risk_level |
| `r_in` | `nrj_input_token` | Wh / token / **milliard de paramètres activés** | étude(s) ou price-based |
| `r_cache` | `nrj_cache_input_token` | Wh / token / **milliard de paramètres activés** | étude(s) ou price-based |
| `r_out(P_act, P_tot)` | `nrj_output_token` | **Wh / token** (valeur absolue, déjà à la taille du modèle) | **fonction dérivée du modèle Ecologits — §3bis** |

> ⚠️ **Attention à l'asymétrie d'unité.** `r_in` et `r_cache` sont des taux *normalisés par milliard de paramètres* (à multiplier par `P_act/1e9`). `r_out` n'est **pas** un taux normalisé : c'est une **énergie absolue par token**, déjà évaluée pour le modèle considéré. Ne pas la multiplier une seconde fois par `P_act`. Voir §3 pour la formule complète et §11 point 8 pour la résorption prévue de cette asymétrie.

> `P_tot` et `P_act` sont exprimés ici **en milliards** (ex. 37, pas 37e9) pour coller aux régressions Ecologits. Convertir en amont si la couche data fournit des unités brutes.

---

## 2. Étape 1 — Tokenisation des blocs (optionnelle)

Dans le calculateur final, l'utilisateur **saisit directement** `new_input`, `history` (tokens en cache) et `output`. Cette section ne s'applique qu'au mode « coller une conversation » où les tokens sont déduits du texte.

### 2.1 Comptage des tokens d'un texte
- **Tokenizer réel** (ex. `tiktoken`) → exact, dépend du modèle.
- **Approximation** : `nb_tokens ≈ nb_mots / 0.7`

### 2.2 Répartition new_input / history / output

Soit `T(x)` le nombre de tokens d'un texte `x`, et `S` le `system_prompt`.

**Bloc 1 :**
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

> Le `system_prompt` est compté comme "cache" même au bloc 1, car supposé identique à chaque appel et donc mis en cache côté fournisseur.

> Un `user_message` qui est en réalité un **output d'outil** (tool result) est traité comme du texte classique.

---

## 3. Étape 2 — Énergie de calcul brute (compute energy)

```
nrj_compute(i) = (P_act / 1e9) × [ new_input(i) × r_in + history(i) × r_cache ]
               + output(i) × r_out(P_act, P_tot)
```

Résultat en **Wh** (énergie IT brute, hors overhead datacenter).

Noter la structure en deux termes :
- **Input et cache** : taux normalisés par milliard, donc pondérés linéairement par `P_act`.
- **Output** : `r_out` est calculé directement à la taille du modèle par la fonction affine du §3bis, **sans pondération supplémentaire**. Multiplier à nouveau par `P_act/1e9` serait un double comptage.

> **Pourquoi l'output ne peut pas être un taux « par milliard de paramètres ».** Le modèle Ecologits donne une énergie par token qui est **affine** en nombre de paramètres activés, pas proportionnelle : `r_out(P) = C + S × P`. Pour un modèle de 1 Md, le terme constant `C` représente **98,5 %** du total (l'amortissement du serveur au batch 64 et l'offset `ENERGY_GAMMA` dominent largement le terme proportionnel). Normaliser par 1 Md puis multiplier par `P_act` revient à traiter 100 % de la valeur comme proportionnelle, ce qui surestime l'énergie d'un facteur ~24 à 37 Md et ~34 à 70 Md. Cette erreur est rédhibitoire ; d'où le passage à la forme affine. Voir §11 point 6 pour la table d'écarts.

---

## 3bis. Dérivation de `r_out` — modèle Ecologits (sans Scope 3, TPS/TTFT fixes)

### 3bis.1 Objectif

Calculer la consommation électrique **IT** liée à la génération d'un output token par un LLM, en fonction de la taille du modèle, selon la méthodologie Ecologits, **hors Scope 3** (pas d'impacts de fabrication) et avec **TPS/TTFT fixes** (throughput et temps de calcul par token traités comme des fonctions déterministes des constantes ci-dessous, et non mesurés par requête).

Contrairement à la V1 de ce document, `r_out` n'est **pas** une constante : c'est une fonction de `P_act` (énergie de calcul) et de `P_tot` (mémoire, donc nombre de GPU mobilisés).

### 3bis.2 Inputs

| Input | Origine |
|---|---|
| `P_act` (milliards) | modèle sélectionné par l'utilisateur |
| `P_tot` (milliards) | modèle sélectionné par l'utilisateur |

Aucun autre paramètre n'est modifiable par l'utilisateur : tout le reste est constante interne.

### 3bis.3 Constantes internes

| Constante | Valeur | Rôle |
|---|---|---|
| `BATCH_SIZE` | 64 | nombre de requêtes servies en parallèle |
| `GPU_INSTALLED_PER_SERVER` | 8 | GPU physiquement présents dans un serveur |
| `SERVER_POWER_WITHOUT_GPU_W` | 1200 | puissance du serveur hors GPU (CPU, RAM, alim, ventilation) |
| `GPU_MEMORY_GB` | 80 | VRAM par GPU (classe A100/H100 80 Go) |
| `QUANTIZATION_BITS` | 4 | quantification supposée des poids en inférence |
| `MEMORY_OVERHEAD` | 1.2 | marge mémoire (KV cache, activations, fragmentation) |
| `ENERGY_ALPHA` | 1.17e-6 | régression énergie GPU — terme proportionnel aux paramètres |
| `ENERGY_BETA` | -1.12e-2 | régression énergie GPU — effet du batch |
| `ENERGY_GAMMA` | 4.05e-5 | régression énergie GPU — offset constant |
| `LATENCY_ALPHA` | 6.78e-4 | régression latence — terme proportionnel aux paramètres |
| `LATENCY_BETA` | 3.12e-4 | régression latence — effet du batch |
| `LATENCY_GAMMA` | 1.94e-2 | régression latence — offset constant |

> **Le PUE générique de 1.20 d'Ecologits est délibérément absent de cette liste** : il est remplacé par `PUE(pays, fournisseur)` à l'étape [3] du pipeline. Voir §0.1.

### 3bis.4 Calculs

**(a) Nombre de GPU mobilisés — dérivé de `P_tot`**

```
model_required_memory_gb = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8

gpu_count = ceil( model_required_memory_gb / GPU_MEMORY_GB )
```

> La mémoire dépend du nombre **total** de paramètres : sur un modèle MoE, tous les experts doivent être chargés en VRAM même si un seul sous-ensemble est activé par token. C'est le seul endroit du pipeline où `P_tot` intervient — et la raison pour laquelle le modèle de données distingue `nb_params` et `nb_params_activated`.

**(b) Énergie GPU par output token — dépend de `P_act`**

```
gpu_energy_per_token_wh =
    ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act
    + ENERGY_GAMMA
```

**(c) Temps de calcul par token — dépend de `P_act`**

```
token_compute_time_seconds =
    LATENCY_ALPHA × P_act
    + LATENCY_BETA × BATCH_SIZE
    + LATENCY_GAMMA
```

**(d) Énergie du serveur hors GPU, amortie par token**

```
server_energy_without_gpu_per_token_wh =
    token_compute_time_seconds
    × (SERVER_POWER_WITHOUT_GPU_W / 3600)     # W → Wh/s
    × (gpu_count / GPU_INSTALLED_PER_SERVER)  # part du serveur mobilisée
    / BATCH_SIZE                              # amortie sur les requêtes du batch
```

**(e) Résultat — énergie IT par output token**

```
r_out(P_act, P_tot) =
    gpu_energy_per_token_wh
    + server_energy_without_gpu_per_token_wh
```

**Unité : Wh / output token.** Valeur d'énergie **IT brute, avant tout PUE** (voir §0.1).

### 3bis.5 Forme affine explicite

À `gpu_count = n` fixé, `r_out` est affine en `P_act` :

```
r_out(P_act) = C(n) + S(n) × P_act

avec, en posant K = (SERVER_POWER_WITHOUT_GPU_W / 3600) / BATCH_SIZE / GPU_INSTALLED_PER_SERVER
     (soit K = 6.5104e-4) :

C(n) = ENERGY_GAMMA + (LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA) × K × n
     = 4.0500e-5 + 2.5630e-5 × n

S(n) = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) + LATENCY_ALPHA × K × n
     = 5.7135e-7 + 4.4141e-7 × n
```

`r_out` est donc **continue et croissante par morceaux en `P_act`**, avec des **sauts** aux seuils où `gpu_count` s'incrémente (tous les `P_tot` multiples de `80 / (1.2 × 4/8) = 133.33` milliards de paramètres totaux).

Cette forme fermée est fournie pour la documentation et les tests ; **l'implémentation doit utiliser les formules (a)–(e)**, plus lisibles et robustes à un changement de constantes.

### 3bis.6 Valeurs de référence

Vérification : à `P_act = P_tot = 1`, on retrouve exactement la valeur de référence du modèle Ecologits 1 Md.

| `P_tot` | `P_act` | `gpu_count` | `token_compute_time_s` | `gpu_energy` (Wh/tok) | `server_energy` (Wh/tok) | **`r_out`** (Wh/tok) |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 0.040046 | 4.1071e-5 | 2.6072e-5 | **6.7143e-5** |
| 8 | 8 | 1 | 0.044786 | 4.5071e-5 | 2.9161e-5 | **7.4232e-5** |
| 70 | 70 | 1 | 0.086828 | 8.0493e-5 | 5.6529e-5 | **1.3702e-4** |
| 120 | 120 | 1 | 0.120728 | 1.0906e-4 | 7.8599e-5 | **1.8766e-4** |
| 405 | 405 | 4 | 0.313958 | 2.7189e-4 | 8.1760e-4 | **1.0895e-3** |
| 671 | 37 | 6 | 0.064454 | 6.1639e-5 | 2.5177e-4 | **3.1341e-4** |
| 1000 | 100 | 8 | 0.107168 | 9.7633e-5 | 5.5817e-4 | **6.5580e-4** |

> Les deux dernières lignes illustrent le cas MoE : un modèle très large mais peu activé reste peu coûteux côté GPU, mais mobilise beaucoup de VRAM, donc une grande part de serveurs — d'où un coût serveur qui devient dominant. C'est le comportement attendu et la raison d'être de la distinction `P_tot`/`P_act`.

---

## 4. Étape 3 — Énergie totale de la requête : `nrj_request`

```
nrj_request(i) = nrj_compute(i) × PUE(pays, fournisseur)
```

**Unité de sortie : Wh** (diviser par 1000 pour obtenir des kWh).

---

## 5. Étape 4a — Émissions carbone : `co2_request`

```
co2_request(i) = (nrj_request(i) / 1000)   ×   EF(pays)
                  [kWh]                        [gCO2e/kWh]
```

**Unité de sortie : gCO2e** (diviser par 1000 pour du kgCO2e si préférence d'affichage).

> Le pays utilisé est le `country` associé à la requête (pré-rempli depuis le `provider`, donc le pays du datacenter — pas celui de l'utilisateur final).

---

## 6. Étape 4b — Consommation d'eau : `water_request`

```
water_request(i) = (nrj_request(i) / 1000)   ×   WUE(pays, fournisseur)
                     [kWh]                        [L/kWh]
```

**Unité de sortie : Litres**.

> **Simplification actuelle** : uniquement le WUE "on-site" du datacenter. Un modèle plus complet ajouterait l'eau "off-site" liée à la production électrique (WUE source, dépendant du mix énergétique du pays). Voir §11.

---

## 7. Étape 4c — Indicateur de risque : `dry_risk_request`

```
dry_risk_request(i) = dry_risk(pays, fournisseur)   # simple lookup, pas de calcul
```

Label **catégoriel** (WRI Aqueduct), affiché à côté de `water_request` pour contextualiser le risque (ex. « 12 L consommés — pays à risque de sécheresse ÉLEVÉ »).

---

## 8. Agrégation sur une conversation entière (optionnel)

- **Par requête** : `nrj_request(i)`, `co2_request(i)`, `water_request(i)` pour le dernier bloc.
- **Cumulé** :
```
nrj_total   = Σ_{i=1}^{N} nrj_request(i)
co2_total   = Σ_{i=1}^{N} co2_request(i)
water_total = Σ_{i=1}^{N} water_request(i)
```

Recommandation : afficher les deux (coût du dernier tour + coût cumulé), car `history(i)` grossit à chaque bloc et le coût par requête augmente mécaniquement même si le cache est facturé moins cher.

---

## 9. Résumé condensé des formules

```
── Paramètres du modèle (milliards) : P_tot, P_act

gpu_count = ceil( 1.2 × P_tot × 4/8 / 80 )

gpu_e   = 1.17e-6 × exp(-1.12e-2 × 64) × P_act + 4.05e-5                      [Wh/tok]
lat     = 6.78e-4 × P_act + 3.12e-4 × 64 + 1.94e-2                            [s/tok]
serv_e  = lat × (1200/3600) × (gpu_count/8) / 64                              [Wh/tok]

r_out   = gpu_e + serv_e                                                      [Wh/tok]

── Énergie de la requête

nrj_compute(i) = (P_act/1e9) × [ new_input(i)·r_in + history(i)·r_cache ]
               + output(i) × r_out                                            [Wh]

nrj_request(i) = nrj_compute(i) × PUE(pays, fournisseur)                       [Wh]

── Conversions

co2_request(i)      = (nrj_request(i)/1000) × EF(pays)                         [gCO2e]
water_request(i)    = (nrj_request(i)/1000) × WUE(pays, fournisseur)           [L]
dry_risk_request(i) = dry_risk(pays, fournisseur)                              [catégoriel]
```

---

## 10. Exemple chiffré

Modèle MoE type (671 Md totaux, 37 Md activés), datacenter à faible intensité carbone.

| Variable | Valeur |
|---|---|
| `P_tot` | 671 Md |
| `P_act` | 37 Md |
| `new_input(i)` | 500 tokens |
| `history(i)` | 4 000 tokens |
| `output(i)` | 800 tokens |
| `r_in` | 0.0020 Wh/token/Md ⚠️ *valeur fictive, cf. §11 pt. 8* |
| `r_cache` | 0.0004 Wh/token/Md ⚠️ *valeur fictive* |
| `PUE` | 1.15 |
| `EF(pays)` | 60 gCO2e/kWh |
| `WUE(pays, fournisseur)` | 1.8 L/kWh |

**Calcul de `r_out` :**
```
gpu_count = ceil(1.2 × 671 × 0.5 / 80) = ceil(5.03) = 6

gpu_e  = 1.17e-6 × 0.488 × 37 + 4.05e-5      = 6.1639e-5 Wh/tok
lat    = 6.78e-4 × 37 + 3.12e-4 × 64 + 1.94e-2 = 0.064454 s/tok
serv_e = 0.064454 × 0.33333 × (6/8) / 64      = 2.5177e-4 Wh/tok

r_out  = 6.1639e-5 + 2.5177e-4 = 3.1341e-4 Wh/tok
```

**Calcul de la requête :**
```
part input/cache = 37 × [500 × 0.0020 + 4000 × 0.0004]
                 = 37 × [1.0 + 1.6] = 37 × 2.6 = 96.20 Wh
part output      = 800 × 3.1341e-4 = 0.2507 Wh

nrj_compute = 96.20 + 0.2507 = 96.4507 Wh

nrj_request = 96.4507 × 1.15 = 110.92 Wh  (0.11092 kWh)

co2_request   = 0.11092 × 60  = 6.66 gCO2e
water_request = 0.11092 × 1.8 = 0.200 L
```

> 🚩 **Incohérence visible à corriger.** Dans cet exemple, la part input/cache (96 Wh) écrase la part output (0,25 Wh) d'un facteur ~380. C'est physiquement invraisemblable : un token d'output, généré séquentiellement, coûte **plus** cher qu'un token d'input traité en parallèle lors du prefill, et non 380 fois moins. Les valeurs de `r_in` et `r_cache` utilisées ici sont des placeholders fictifs hérités de la V1, et sont incompatibles en ordre de grandeur avec `r_out` désormais dérivé rigoureusement. **Ne pas mettre le calculateur en production avant d'avoir sourcé `r_in` et `r_cache` sur la même base méthodologique.** Voir §11 point 8.

---

## 11. Hypothèses et points ouverts

**Validés par l'équipe data (V1) :**

1. **Raisonnement vs complétion** : un seul taux `nrj_output_token`. On suppose que `reasoning` et `completion` ont le même coût énergétique par token, alors qu'en réalité le coût d'un token d'output croît avec le nombre de tokens déjà générés (KV cache grandissant).
2. **`nb_params_activated` pour les modèles fermés** : régression établie sur des modèles ouverts, appliquée aux modèles propriétaires (GPT, Claude, Gemini…).
3. **Taux de succès du cache réel** : 100 % de cache hit supposé sur l'historique, alors qu'en pratique certains appels n'activent pas le cache (première requête, expiration, changement de paramètres).
4. **WUE on-site uniquement** : pas d'eau liée à la production électrique (WUE source). À ajouter en V2 si les données sont disponibles.
5. **Unités harmonisées en Wh** : `r_out` est en Wh par construction ; vérifier `r_in` / `r_cache`.

**Nouveaux (V2) — à valider :**

6. **Forme affine de `r_out` — résolu.** La V1 normalisait `r_out` « par milliard de paramètres » puis le multipliait par `P_act/1e9`. Or la formule Ecologits est affine, pas proportionnelle, et à 1 Md le terme constant pèse 98,5 %. L'écart généré :

   | `P_act` | Ecologits exact | Extrapolation linéaire V1 | Facteur d'erreur |
   |---|---|---|---|
   | 7 Md | 7.32e-5 | 4.70e-4 | ×6,4 |
   | 37 Md | 1.04e-4 | 2.48e-3 | ×24 |
   | 70 Md | 1.37e-4 | 4.70e-3 | ×34 |
   | 400 Md | 4.71e-4 | 2.69e-2 | ×57 |

   La V2 évalue la formule directement à `P_act`, supprimant cette erreur.

7. **`gpu_count` dérivé de `P_tot` — nouveau.** La V1 figeait `GPU_COUNT = 1`, ce qui sous-estime fortement les gros modèles (un modèle de 405 Md ne tient pas sur un GPU de 80 Go). La V2 le dérive de la mémoire requise. Les constantes `QUANTIZATION_BITS = 4`, `GPU_MEMORY_GB = 80` et `MEMORY_OVERHEAD = 1.2` sont des hypothèses à faire confirmer par l'équipe data : une quantification en 8 bits doublerait le nombre de GPU et donc la part serveur.

8. **🚩 `r_in` et `r_cache` ne sont pas sourcés sur la même base que `r_out` — bloquant.** Depuis que `r_out` est dérivé rigoureusement d'Ecologits, l'asymétrie méthodologique avec `r_in`/`r_cache` (« price-based » ou études hétérogènes) devient le maillon faible du calculateur : dans l'exemple §10, ils dominent le résultat d'un facteur 380 tout en étant les moins fiables. Deux options :
   - **(a)** Dériver `r_in` et `r_cache` du même modèle Ecologits, en modélisant le prefill (traitement parallèle de tous les tokens d'entrée, donc un coût par token bien inférieur à l'output, mais pas nul), et appliquer un facteur de réduction pour le cache.
   - **(b)** Conserver des sources externes, mais les convertir en Wh/token absolus à la taille du modèle pour supprimer l'asymétrie d'unité signalée au §1.

   **Recommandation : option (a)**, pour la cohérence méthodologique de bout en bout.

9. **Batch size fixe à 64.** Le batch réel varie fortement selon la charge du fournisseur et impacte l'énergie par token de manière non linéaire (terme exponentiel + amortissement du serveur). Valeur unique retenue faute de donnée publique.

10. **Pas de Scope 3.** Aucune prise en compte de la fabrication des GPU et serveurs, ni de leur amortissement sur la durée de vie. Le résultat est donc une empreinte **d'usage uniquement**, à signaler dans l'UI pour éviter une lecture trompeuse.

---

## 12. Implémentation de référence (Python)

```python
import math
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Ecologits-derived model for output-token energy (spec section 3bis).
#
# Scope: inference energy only (no Scope 3 / embodied impacts), with fixed
# TPS/TTFT assumptions. Returns RAW IT ENERGY, before any PUE: the pipeline
# applies its own country/provider-specific PUE downstream (section 0.1).
# ---------------------------------------------------------------------------

# Internal constants - never exposed to the end user.
BATCH_SIZE = 64
GPU_INSTALLED_PER_SERVER = 8
SERVER_POWER_WITHOUT_GPU_W = 1200
GPU_MEMORY_GB = 80          # VRAM per GPU (A100/H100 80GB class)
QUANTIZATION_BITS = 4       # assumed weight quantization at inference time
MEMORY_OVERHEAD = 1.2       # KV cache, activations, fragmentation

ENERGY_ALPHA = 1.17e-6
ENERGY_BETA = -1.12e-2
ENERGY_GAMMA = 4.05e-5

LATENCY_ALPHA = 6.78e-4
LATENCY_BETA = 3.12e-4
LATENCY_GAMMA = 1.94e-2


def compute_gpu_count(params_total_billions: float) -> int:
    """
    Number of GPUs needed to host the model, derived from VRAM requirements.

    Uses TOTAL parameters, not activated ones: on a Mixture-of-Experts model
    every expert must be resident in VRAM even though only a subset is
    activated per token. This is the only place where P_tot is used.
    """
    required_memory_gb = (
        MEMORY_OVERHEAD * params_total_billions * QUANTIZATION_BITS / 8
    )
    return math.ceil(required_memory_gb / GPU_MEMORY_GB)


def compute_r_out_wh_per_token(
    params_activated_billions: float,
    params_total_billions: float,
) -> float:
    """
    Energy cost of generating ONE output token, in Wh, for the given model.

    Affine in activated parameters (not proportional): the constant terms
    dominate at small sizes, which is why this must NOT be normalized "per
    billion parameters" and rescaled (see spec section 3 and section 11.6).

    Returns raw IT energy - do NOT multiply by the Ecologits generic PUE of
    1.20 here; PUE(country, provider) is applied later in the pipeline.
    """
    # (b) GPU energy per token: scales with ACTIVATED params
    gpu_energy_per_token_wh = (
        ENERGY_ALPHA
        * math.exp(ENERGY_BETA * BATCH_SIZE)
        * params_activated_billions
        + ENERGY_GAMMA
    )

    # (c) Per-token compute time, used to amortize non-GPU server power
    token_compute_time_s = (
        LATENCY_ALPHA * params_activated_billions
        + LATENCY_BETA * BATCH_SIZE
        + LATENCY_GAMMA
    )

    # (a) GPU count depends on TOTAL params (memory footprint)
    gpu_count = compute_gpu_count(params_total_billions)

    # (d) Share of the server (excluding GPUs) attributable to one token
    server_energy_per_token_wh = (
        token_compute_time_s
        * (SERVER_POWER_WITHOUT_GPU_W / 3600)          # W -> Wh per second
        * (gpu_count / GPU_INSTALLED_PER_SERVER)       # fraction of server used
        / BATCH_SIZE                                   # amortized over the batch
    )

    # (e) Total IT energy per output token
    return gpu_energy_per_token_wh + server_energy_per_token_wh


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

@dataclass
class ModelConfig:
    """Static configuration for a given model + provider + country."""
    params_total_billions: float      # P_tot, drives GPU/VRAM count
    params_activated_billions: float  # P_act, drives compute energy
    pue: float                        # country/provider-specific PUE
    emission_factor_g_per_kwh: float  # gCO2e per kWh
    wue_l_per_kwh: float              # liters per kWh
    dry_risk: str                     # categorical label, e.g. "high"


@dataclass
class TokenRates:
    """
    Input/cache energy rates, per token, PER BILLION activated parameters (Wh).

    NOTE: output has no entry here - r_out is computed from the model itself by
    compute_r_out_wh_per_token() and is an ABSOLUTE Wh/token value.
    TODO (spec 11.8): these two rates are not sourced on the same methodology
    as r_out and currently dominate the result by ~2.5 orders of magnitude,
    which is physically implausible. Must be resolved before production.
    """
    input_rate: float        # r_in
    cache_input_rate: float  # r_cache


@dataclass
class RequestResult:
    nrj_wh: float
    co2_g: float
    water_l: float
    dry_risk: str
    r_out_wh_per_token: float  # exposed for transparency / debugging


def compute_request_footprint(
    new_input_tokens: int,
    history_tokens: int,
    output_tokens: int,
    model: ModelConfig,
    rates: TokenRates,
) -> RequestResult:
    """
    Energy, CO2 and water footprint of a single LLM request, following:
      tokens -> IT compute energy -> x PUE -> nrj_request -> co2 / water / risk
    """
    # Output rate: absolute Wh per token, already evaluated at model size
    r_out = compute_r_out_wh_per_token(
        model.params_activated_billions,
        model.params_total_billions,
    )

    # Step 1: raw IT compute energy.
    # Input/cache rates are per-billion and scaled by P_act; the output term is
    # NOT scaled again - doing so would double-count model size.
    nrj_compute_wh = (
        model.params_activated_billions
        * (
            new_input_tokens * rates.input_rate
            + history_tokens * rates.cache_input_rate
        )
        + output_tokens * r_out
    )

    # Step 2: total datacenter energy. This single multiplication is equivalent
    # to applying PUE to each component separately (distributivity), so there is
    # no loss of accuracy in applying it here rather than upstream.
    nrj_request_wh = nrj_compute_wh * model.pue

    # Step 3: derive CO2 and water from nrj_request (Wh -> kWh)
    nrj_request_kwh = nrj_request_wh / 1000
    co2_request_g = nrj_request_kwh * model.emission_factor_g_per_kwh
    water_request_l = nrj_request_kwh * model.wue_l_per_kwh

    # Step 4: dry risk is a plain lookup, not derived from energy
    return RequestResult(
        nrj_wh=nrj_request_wh,
        co2_g=co2_request_g,
        water_l=water_request_l,
        dry_risk=model.dry_risk,
        r_out_wh_per_token=r_out,
    )


def compute_conversation_footprint(
    blocs: list[dict],  # each: {"user_message": str, "reasoning": str, "completion": str}
    system_prompt: str,
    model: ModelConfig,
    rates: TokenRates,
    count_tokens,  # callable: str -> int (real tokenizer or word-based estimate)
) -> list[RequestResult]:
    """
    Per-request footprint across a whole conversation, applying the
    new_input / history / output split from spec section 2.
    """
    results: list[RequestResult] = []

    # System prompt is treated as cached history from the very first bloc
    history_tokens = count_tokens(system_prompt)

    for bloc in blocs:
        user_tokens = count_tokens(bloc["user_message"])
        reasoning_tokens = count_tokens(bloc.get("reasoning", ""))
        completion_tokens = count_tokens(bloc.get("completion", ""))

        results.append(
            compute_request_footprint(
                new_input_tokens=user_tokens,
                history_tokens=history_tokens,
                output_tokens=reasoning_tokens + completion_tokens,
                model=model,
                rates=rates,
            )
        )

        # Everything exchanged so far becomes cached history for the next bloc
        history_tokens += user_tokens + reasoning_tokens + completion_tokens

    return results
```

Ce squelette reste volontairement simple (pas de gestion d'erreurs, pas de `cache_hit_rate`) — à adapter selon les décisions prises sur les points ouverts de la §11, en priorité le point 8.