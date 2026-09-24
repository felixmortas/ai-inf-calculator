# Spécification des formules — Calculateur d'empreinte d'une requête LLM

## 0. Architecture de calcul (pipeline)

```
Inputs utilisateur : modèle (P_tot, P_act) + nb tokens (new_input, cache, output)
        │
        ▼
[1] Tokenisation ─────► new_input(i) / history(i) / output(i)
        │
        ▼
[2] Énergie de calcul brute (IT energy, hors PUE)
        │   ├── output        : r_out(P_act, P_tot), modèle Ecologits (§3bis)
        │   └── input + cache : r_in = K_in x r_out, r_cache = K_cache x r_in (§3ter)
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
| `r_out(P_act, P_tot)` | `nrj_output_token` | Wh / token | dérivé du modèle Ecologits — **§3bis** |
| `r_in(P_act, P_tot)` | `nrj_input_token` | Wh / token | `κ_in × r_out` — **§3ter** |
| `r_cache(P_act, P_tot)` | `nrj_cache_input_token` | Wh / token | `κ_cache × r_in` — **§3ter** |
| `κ_in` | ratio énergie token input / token output | sans unité | rendement prefill vs decode — §3ter |
| `κ_cache` | ratio énergie token en cache / token input | sans unité | physique + cross-check tarifaire — §3ter |

> ✅ **Unités homogènes.** Les trois taux sont des **énergies absolues en Wh par token**, déjà évaluées pour le modèle considéré. Aucun n'est normalisé « par milliard de paramètres » : **ne jamais les multiplier par `P_act`**. La dépendance à la taille du modèle est intégrée dans `r_out` (§3bis) et se propage à `r_in` et `r_cache` par construction (§3ter).

> `P_tot` et `P_act` sont exprimés ici **en milliards** (ex. 37, pas 37e9) pour coller aux régressions Ecologits. Convertir en amont si la couche data fournit des unités brutes.

---

## 2. Étape 1 — Tokenisation des blocs (optionnelle)

Dans le calculateur final, l'utilisateur **saisit directement** `new_input`, `history` (tokens en cache) et `output`. Cette section ne s'applique qu'au mode « coller une conversation » où les tokens sont déduits du texte.

### 2.1 Comptage des tokens d'un texte
- **Tokenizer réel** (ex. `tiktoken`) → exact, dépend du modèle.
- **Approximation** : `nb_tokens ≈ nb_mots / 0.75` → selon OpenAI

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
nrj_compute(i) = new_input(i) × r_in
               + history(i)   × r_cache
               + output(i)    × r_out
```

avec `r_out = r_out(P_act, P_tot)` (§3bis), `r_in = κ_in × r_out` et `r_cache = κ_cache × r_in` (§3ter).

Résultat en **Wh** (énergie IT brute, hors overhead datacenter).

---

## 3bis. Dérivation de `r_out` — modèle Ecologits (sans Scope 3, TPS/TTFT fixes)

### 3bis.1 Objectif

Calculer la consommation électrique **IT** liée à la génération d'un output token par un LLM, en fonction de la taille du modèle, selon la méthodologie Ecologits, **hors Scope 3** (pas d'impacts de fabrication) et avec **TPS/TTFT fixes** (throughput et temps de calcul par token traités comme des fonctions déterministes des constantes ci-dessous, et non mesurés par requête).

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
| `QUANTIZATION_BITS` | 16 | quantification supposée des poids en inférence |
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

`r_out` est donc **continue et croissante par morceaux en `P_act`**, avec des **sauts** aux seuils où `gpu_count` s'incrémente.

Cette forme fermée est fournie pour la documentation et les tests ; **l'implémentation doit utiliser les formules (a)–(e)**, plus lisibles et robustes à un changement de constantes.

---

## 3ter. Dérivation de `r_in` et `r_cache` — ratios ancrés sur `r_out`

### 3ter.1 Principe

Plutôt que de sourcer `r_in` et `r_cache` indépendamment — ce qui réintroduirait une hétérogénéité méthodologique et une dépendance à la taille du modèle à estimer séparément — on les définit comme des **fractions de `r_out`** :

```
r_in(P_act, P_tot)    = κ_in    × r_out(P_act, P_tot)
r_cache(P_act, P_tot) = κ_cache × r_in(P_act, P_tot)
```

### 3ter.2 Ancrage de `κ_in` et `κ_cache` — approche price-based

**Choix retenu (décision finale) : `κ_in` et `κ_cache` sont lus directement dans la grille tarifaire publique de chaque modèle/fournisseur**, et non dérivés d'un modèle physique du prefill :

```
κ_in(modèle)    = prix_input(modèle)          / prix_output(modèle)
κ_cache(modèle) = prix_input_en_cache(modèle) / prix_input(modèle)
```

Ces ratios sont recalculés **par modèle et par fournisseur** — jamais figés comme constante universelle — à partir des tarifs publiés à la date d'implémentation.

> ⚠️ Les ratios tarifaires évoluent à chaque mise à jour de grille. Ne pas figer de prix en dur dans le code : prévoir un script de calibration relisant les tarifs publics à date, et consigner la date de relevé à côté des valeurs de `κ` utilisées.

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

gpu_count = ceil( 1.2 × P_tot × 16/8 / 80 )

gpu_e   = 1.17e-6 × exp(-1.12e-2 × 64) × P_act + 4.05e-5                      [Wh/tok]
lat     = 6.78e-4 × P_act + 3.12e-4 × 64 + 1.94e-2                            [s/tok]
serv_e  = lat × (1200/3600) × (gpu_count/8) / 64                              [Wh/tok]

r_out   = gpu_e + serv_e                                                      [Wh/tok]
r_in    = K_in × r_out                                                        [Wh/tok]
r_cache = K_cache × r_in                                                         [Wh/tok]

── Énergie de la requête

nrj_compute(i) = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out      [Wh]

nrj_request(i) = nrj_compute(i) × PUE(pays, fournisseur)                       [Wh]

── Conversions

co2_request(i)      = (nrj_request(i)/1000) × EF(pays)                         [gCO2e]
water_request(i)    = (nrj_request(i)/1000) × WUE(pays, fournisseur)           [L]
dry_risk_request(i) = dry_risk(pays, fournisseur)                              [catégoriel]
```

---

## 10. Hypothèses et points ouverts

**Validés par l'équipe data :**

1. **Raisonnement vs complétion** : un seul taux `nrj_output_token`. On suppose que `reasoning` et `completion` ont le même coût énergétique par token, alors qu'en réalité le coût d'un token d'output croît avec le nombre de tokens déjà générés (KV cache grandissant).
2. **`nb_params_activated` pour les modèles fermés** : régression établie sur des modèles ouverts, appliquée aux modèles propriétaires (GPT, Claude, Gemini…).
3. **Taux de succès du cache réel** : 100 % de cache hit supposé sur l'historique, alors qu'en pratique certains appels n'activent pas le cache (première requête, expiration, changement de paramètres).
4. **WUE on-site uniquement** : pas d'eau liée à la production électrique (WUE source). À ajouter en V2 si les données sont disponibles.
5. **Unités harmonisées en Wh** : `r_out` est en Wh par construction ; vérifier `r_in` / `r_cache`.
6. **`gpu_count` dérivé de `P_tot`.** Les constantes `QUANTIZATION_BITS = 16`, `GPU_MEMORY_GB = 80` et `MEMORY_OVERHEAD = 1.2` sont des hypothèses reprises d'Ecologits.
7. **Batch size fixe à 64.** Le batch réel varie fortement selon la charge du fournisseur et impacte l'énergie par token de manière non linéaire (terme exponentiel + amortissement du serveur). Valeur unique retenue faute de donnée publique.
8. **Pas de Scope 3.** Aucune prise en compte de la fabrication des GPU et serveurs, ni de leur amortissement sur la durée de vie. Le résultat est donc une empreinte **d'usage uniquement**, à signaler dans l'UI pour éviter une lecture trompeuse.
