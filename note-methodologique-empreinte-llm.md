# Note méthodologique — Calculateur d'empreinte d'une requête LLM

*Méthodologie d'estimation de l'énergie, des émissions de CO2e et de la consommation d'eau d'une requête envoyée à un modèle de langage, à l'usage principal des modèles propriétaires (GPT, Claude, Gemini, etc.).*

---

## 1. Résumé

Ce calculateur estime l'empreinte environnementale **d'une requête individuelle** vers un LLM, à partir de trois nombres saisis par l'utilisateur (tokens d'input, tokens en cache, tokens d'output) et d'un modèle sélectionné dans une liste. Il combine deux familles de méthodes selon la nature du poste calculé :

- l'énergie de génération des tokens de sortie (`r_out`) est modélisée **physiquement**, à partir d'une régression publique sur du matériel réel (méthodologie Ecologits) ;
- l'énergie des tokens d'entrée et de cache (`r_in`, `r_cache`) est estimée **par les prix publics** facturés par les fournisseurs, faute d'accès aux caractéristiques d'infrastructure des modèles propriétaires.

Ce choix hybride n'est pas un compromis par défaut : c'est une décision motivée, documentée ci-dessous, avec ses justifications et ses limites explicites — dans l'esprit de la documentation méthodologique d'Ecologits, dont ce calculateur reprend largement l'approche pour la partie output.

---

## 2. Objectif et périmètre de l'étude

### 2.1 Ce que le calculateur mesure

- L'énergie électrique **de la phase d'inférence** (« use phase »), pour une requête donnée à un modèle donné.
- Les émissions de gaz à effet de serre associées, converties via l'intensité carbone du réseau électrique du pays d'hébergement du datacenter.
- La consommation d'eau **on-site** du datacenter (refroidissement), et un indicateur qualitatif de risque de sécheresse du pays concerné.

### 2.2 Ce que le calculateur ne mesure pas

- **Le Scope 3** : fabrication des GPU, serveurs, datacenters, et leur amortissement sur la durée de vie du matériel. Seul l'usage est couvert.
- **L'entraînement du modèle**, amorti sur l'ensemble des requêtes qu'il traitera pendant sa durée de vie — non inclus ici, la requête individuelle ne porte que le coût marginal d'inférence.
- **L'eau « off-site »**, liée à la production de l'électricité consommée (dépend du mix énergétique du pays). Seul le WUE on-site du datacenter est utilisé.
- **Le réseau et les terminaux utilisateurs** (transport des données, appareil de l'utilisateur final).

Le calculateur donne donc une empreinte **d'usage**, à afficher comme telle dans l'interface pour éviter toute lecture comme une empreinte totale « du cycle de vie ».

### 2.3 Pourquoi cibler les modèles propriétaires

Les modèles ouverts (Llama, Mistral, DeepSeek…) permettent en principe une modélisation physique complète : nombre de paramètres exact, poids accessibles, matériel de référence documenté par des benchmarks indépendants. Les modèles propriétaires (GPT, Claude, Gemini) ne publient ni le nombre de paramètres activés, ni le matériel utilisé, ni le taux d'utilisation réel des GPU (MFU). Deux informations restent en revanche publiques et fiables pour ces modèles : une **estimation du nombre de paramètres activés par régression** (travaux type IKP, déjà utilisés dans le modèle de données) et **les grilles tarifaires** de l'API. Toute la méthodologie ci-dessous découle de ce constat : s'appuyer sur ce qui est observable pour les modèles fermés, plutôt que d'importer des hypothèses calibrées sur des modèles ouverts là où elles ne sont pas vérifiables.

---

## 3. Vue d'ensemble de la chaîne de calcul

```
Modèle sélectionné (P_act, P_tot)  +  tokens saisis (input, cache, output)
        │
        ▼
[1] r_out(P_act, P_tot)   ← modèle physique Ecologits (§4.1)
        │
        ▼
[2] r_in = κ_in × r_out          κ_in, κ_cache  ← ratios de prix publics (§4.3)
    r_cache = κ_cache × r_in
        │
        ▼
[3] nrj_compute = input × r_in + cache × r_cache + output × r_out     [Wh, énergie IT brute]
        │
        ▼
[4] nrj_request = nrj_compute × PUE(pays, fournisseur)                [Wh, énergie datacenter]
        │
        ├──► × emission_factor(pays)        = co2_request     [gCO2e]
        ├──► × WUE(pays, fournisseur)        = water_request   [L]
        └──► lookup dry_risk(pays, fournisseur) = dry_risk_request
```

Un seul poste (`r_out`) est modélisé physiquement ; les deux autres en héritent la dépendance à la taille du modèle par construction (`r_in` et `r_cache` sont des fractions de `r_out`, jamais des valeurs indépendantes). Le PUE n'intervient qu'une seule fois, en toute fin de chaîne énergétique, avant la conversion en CO2/eau.

---

## 4. Choix méthodologiques détaillés

### 4.1 Énergie du token de sortie (`r_out`) — modélisation physique

**Choix retenu :** dériver `r_out` de la régression Ecologits sur l'énergie GPU et serveur, en fonction de `P_act` (calcul) et de `P_tot` (nombre de GPU mobilisés, via la mémoire requise), sans Scope 3, avec un batch et des temps de calcul par token fixés à des valeurs de référence (hypothèse dite « TPS/TTFT fixes »).

**Pourquoi un modèle physique plutôt qu'un proxy tarifaire ici, alors qu'on utilise le prix ailleurs ?**

- C'est le poste qui varie le plus avec la taille du modèle (facteur de plus de 20 entre un 8B et un modèle MoE à ~200 Md de paramètres activés dans nos tables de référence). Une erreur de méthode sur ce terme domine directement le résultat final — il mérite l'effort de modélisation le plus rigoureux disponible.
- La génération séquentielle (decode) est le régime le mieux caractérisé par la littérature publique (Ecologits, ainsi que les études sur le memory-bandwidth-bound decoding), car il est observable de l'extérieur via la latence de génération, elle-même mesurable empiriquement sur n'importe quelle API, y compris fermée.
- Le prix de l'output, à l'inverse, est le plus éloigné du coût physique réel : il intègre la rareté perçue de la capacité de génération (latence utilisateur, files d'attente) et une marge commerciale plus visible que sur l'input, ce qui en fait un proxy énergétique de moins bonne qualité que pour l'input (voir §4.3).

**Constantes internes du modèle** (aucune n'est modifiable par l'utilisateur — seuls `P_act` et `P_tot` varient, selon le modèle sélectionné) :

| Constante | Valeur | Rôle |
|---|---|---|
| `BATCH_SIZE` | 64 | nombre de requêtes servies en parallèle |
| `GPU_INSTALLED_PER_SERVER` | 8 | GPU physiquement présents dans un serveur |
| `SERVER_POWER_WITHOUT_GPU_W` | 1200 | puissance du serveur hors GPU (CPU, RAM, alim, ventilation), en watts |
| `GPU_MEMORY_GB` | 80 | VRAM par GPU (classe A100/H100 80 Go) |
| `QUANTIZATION_BITS` | 16 | quantification supposée des poids en inférence |
| `MEMORY_OVERHEAD` | 1.2 | marge mémoire (KV cache, activations, fragmentation) |
| `ENERGY_ALPHA` | 1.17e-6 | régression énergie GPU — terme proportionnel aux paramètres |
| `ENERGY_BETA` | -1.12e-2 | régression énergie GPU — effet du batch |
| `ENERGY_GAMMA` | 4.05e-5 | régression énergie GPU — offset constant |
| `LATENCY_ALPHA` | 6.78e-4 | régression latence — terme proportionnel aux paramètres |
| `LATENCY_BETA` | 3.12e-4 | régression latence — effet du batch |
| `LATENCY_GAMMA` | 1.94e-2 | régression latence — offset constant |

> **Le PUE générique de 1.20 intégré à la régression Ecologits d'origine est délibérément retiré de cette liste** : le calculateur applique à la place son propre `PUE(pays, fournisseur)`, plus précis, une seule fois en fin de chaîne énergétique (§4.2), plutôt que de le laisser mélangé dans le calcul de `r_out`.

**Étapes de calcul :**

**(a) Nombre de GPU mobilisés — dérivé de `P_tot`**, car sur un modèle MoE tous les experts doivent être chargés en VRAM même si un seul sous-ensemble est activé par token (c'est le seul endroit du pipeline où `P_tot` intervient, d'où la nécessité de distinguer `P_tot` et `P_act`) :

```
model_required_memory_gb = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
gpu_count = ceil( model_required_memory_gb / GPU_MEMORY_GB )
```

**(b) Énergie GPU par token de sortie — dépend de `P_act`** :

```
gpu_energy_per_token_wh =
    ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act
    + ENERGY_GAMMA
```

**(c) Temps de calcul par token — dépend de `P_act`** :

```
token_compute_time_seconds =
    LATENCY_ALPHA × P_act
    + LATENCY_BETA × BATCH_SIZE
    + LATENCY_GAMMA
```

**(d) Énergie du serveur hors GPU, amortie par token** (le temps de calcul du token détermine combien de temps le serveur est mobilisé, dont seule la fraction de GPU concernée et la part du batch sont imputées à ce token) :

```
server_energy_without_gpu_per_token_wh =
    token_compute_time_seconds
    × (SERVER_POWER_WITHOUT_GPU_W / 3600)     # W → Wh/s
    × (gpu_count / GPU_INSTALLED_PER_SERVER)  # part du serveur mobilisée
    / BATCH_SIZE                              # amortie sur les requêtes du batch
```

**(e) Résultat — énergie IT par token de sortie**, en Wh, valeur brute avant tout PUE :

```
r_out(P_act, P_tot) = gpu_energy_per_token_wh + server_energy_without_gpu_per_token_wh
```

**Forme affine (pour information) :** à `gpu_count = n` fixé, `r_out` est affine en `P_act` : `r_out(P_act) = C(n) + S(n) × P_act`, avec des sauts aux seuils où `gpu_count` s'incrémente — `r_out` est donc continue et croissante par morceaux en `P_act`. Cette forme fermée n'est utile que pour la documentation et les tests ; l'implémentation doit utiliser les étapes (a)–(e) ci-dessus, plus lisibles et robustes à un changement de constantes.

### 4.2 Énergie des tokens d'entrée et de cache (`r_in`, `r_cache`) — approche price-based

**Choix retenu (version finale) :** estimer `κ_in` et `κ_cache` directement à partir des grilles tarifaires publiques de chaque modèle/fournisseur, plutôt que d'un modèle physique du prefill :

```
κ_in    = prix_input(modèle)         / prix_output(modèle)
κ_cache = prix_input_en_cache(modèle) / prix_input(modèle)

r_in    = κ_in    × r_out
r_cache = κ_cache × r_in
```

Ces ratios sont recalculés **par modèle et par fournisseur**, à partir des tarifs publiés, et non fixés à une constante universelle.

**Pourquoi le price-based plutôt qu'un modèle physique du prefill (compute-bound vs memory-bound), envisagé puis écarté ?**

1. **Cohérence avec l'objectif du calculateur.** L'usage cible est la mesure de l'empreinte de requêtes vers des modèles propriétaires. Or le rendement matériel réel du prefill (MFU, taille de batch, matériel utilisé) n'est **pas observable** de l'extérieur pour ces modèles — contrairement au decode, dont la latence de génération est mesurable empiriquement. Un modèle physique du prefill pour des modèles fermés reposerait sur des hypothèses invérifiables, quand le prix, lui, est public, à jour, et spécifique à chaque modèle.
2. **Scalabilité opérationnelle.** Le calculateur doit couvrir un catalogue de modèles propriétaires qui évolue en continu. Maintenir un ratio physique nécessiterait de recalibrer une hypothèse de rendement matériel à chaque nouveau modèle, sans données pour le faire. Le prix, en revanche, se met à jour automatiquement à chaque annonce tarifaire.
3. **Un choix de biais compensés, assumé explicitement.** C'est le point central de cette décision, et il mérite d'être détaillé plutôt que passé sous silence :

   - Le prix d'un token lu en cache **surestime probablement son coût énergétique réel**. Un token en cache n'est pas recalculé — son coût marginal est proche de zéro (lecture mémoire, participation à l'attention des nouveaux tokens). Le prix facturé (typiquement une fraction non négligeable du prix de l'input, jamais proche de zéro) reflète surtout l'amortissement de l'infrastructure de cache et une logique commerciale, pas uniquement l'électricité consommée. → **biais à la hausse** sur `r_cache`.
   - À l'inverse, le modèle physique de `r_out` (§4.1) traite **tous les tokens de sortie comme ayant le même coût énergétique**, quelle que soit leur position dans la génération (hypothèse « TPS/TTFT fixes »). En réalité, le coût d'un token d'output **croît** avec le nombre de tokens déjà générés : chaque étape de decode relit un KV-cache qui grandit, ce qui augmente le trafic mémoire et le temps de calcul par token au fil de la génération. Le calculateur **sous-estime donc systématiquement** le coût réel des complétions longues. → **biais à la baisse** sur `r_out`, non corrigé (cf. §5).

   Ces deux biais jouent en sens opposé et sur des grandeurs du même ordre dans une conversation typique : à chaque nouveau tour, l'historique mis en cache (`history`) intègre les tokens de sortie du tour précédent, donc le volume facturé au tarif « cache » grossit mécaniquement à mesure que la conversation avance et que l'output s'accumule d'un tour à l'autre. Le choix méthodologique assumé ici est de **ne pas corriger séparément chacun des deux biais**, mais de considérer qu'ils se compensent approximativement à l'échelle d'une conversation, et d'ancrer `κ_cache` sur le prix tel quel plutôt que de tenter une correction physique partielle qui laisserait l'autre biais non traité. C'est une simplification, pas une élimination de l'erreur — voir §5 pour sa portée exacte.

4. **Précédent méthodologique.** Ce raisonnement — s'appuyer sur le prix comme proxy observable quand la donnée physique d'un modèle fermé est inaccessible — est le même principe que celui déjà utilisé dans ce calculateur pour estimer `P_act` des modèles propriétaires par régression à partir de données publiques (méthodologie Ecologits). Le price-based n'est donc pas une entorse à la rigueur du reste du document, mais une application cohérente du même principe à un autre poste.

**Ce qui est perdu par rapport à l'approche physique (MFU) envisagée précédemment :** la dépendance de `κ_in`/`κ_cache` à l'architecture du modèle (attention GQA/MLA, taille du KV-cache) n'est plus modélisée explicitement — elle est absorbée, sans distinction, dans le prix affiché par le fournisseur, qui la reflète imparfaitement et avec un temps de retard (les prix ne bougent pas aussi vite que l'architecture).

### 4.3 Passage de l'énergie aux impacts (CO2, eau, risque)

**Choix retenu :** dériver `co2_request` et `water_request` de `nrj_request` (jamais directement des tokens), avec des facteurs propres au pays d'hébergement du datacenter (et non au pays de l'utilisateur final) :

```
co2_request   = (nrj_request / 1000) × emission_factor(pays_datacenter)
water_request = (nrj_request / 1000) × WUE(pays_datacenter, fournisseur)
```

**Justification :** l'énergie est le dénominateur commun ; calculer CO2 et eau indépendamment à partir des tokens dupliquerait la logique de pondération par `P_act`/`P_tot` et introduirait un risque d'incohérence entre les deux sorties si l'une des deux formules était modifiée sans l'autre. Le pays du datacenter (et non celui de l'utilisateur) est utilisé car c'est là que l'électricité est consommée — le mix électrique de l'utilisateur final n'a aucune incidence sur cette empreinte.

Le risque de sécheresse (`dry_risk_request`) reste un simple lookup catégoriel, affiché à côté de `water_request` pour contextualiser la valeur sans être combiné numériquement — un chiffre de litres n'a pas le même sens en Norvège et en Californie.

---

## 5. Hypothèses et limites assumées

| # | Hypothèse | Portée de l'erreur |
|---|---|---|
| 1 | Coût énergétique du token de sortie constant, indépendant de la position dans la génération | Sous-estimation systématique des complétions longues ; partiellement compensée par le biais inverse du point 3 |
| 2 | `κ_in`, `κ_cache` estimés par les prix, pas par un modèle physique | Absorbe la marge commerciale et la rareté perçue dans l'estimation énergétique ; nécessite une mise à jour à chaque changement de grille tarifaire |
| 3 | Biais prix-cache (surestimation) et biais position-output (sous-estimation) supposés compensés | Compensation approximative, non démontrée formellement, plausible à l'échelle d'une conversation multi-tours mais pas nécessairement sur une requête isolée (ex. un unique tour très long-contexte / très courte réponse, où seul le biais 1 joue) |
| 4 | `nb_params_activated` des modèles fermés estimé par régression sur modèles ouverts | Incertitude propagée à `r_out`, donc à `r_in`/`r_cache` qui en héritent |
| 5 | 100 % de cache hit sur l'historique | Ignore les cas de première requête après expiration du cache ou de changement de paramètres |
| 6 | Batch size et régime de charge fixes (Ecologits, §4.1) | N'ajuste pas à la charge réelle du fournisseur au moment de la requête |
| 7 | Aucun Scope 3, aucun coût d'entraînement amorti | Empreinte d'usage uniquement — à ne jamais présenter comme une empreinte totale |
| 8 | WUE on-site uniquement | Ignore l'eau liée à la production électrique elle-même (dépendante du mix énergétique du pays) |

**Recommandation d'affichage produit :** signaler dans l'interface que le résultat est une estimation d'ordre de grandeur pour l'usage seul, particulièrement prudente sur les conversations à très long historique et réponse très courte (où l'hypothèse 3 cesse de tenir).

---

## 6. Glossaire des variables et constantes

| Symbole | Signification | Source |
|---|---|---|
| `P_act` | Paramètres activés du modèle (Md) | Régression Ecologits sur modèles ouverts, appliquée aux modèles fermés |
| `P_tot` | Paramètres totaux du modèle (Md) | Idem |
| `r_out` | Énergie IT par token de sortie (Wh) | Modèle physique Ecologits, §4.1 |
| `κ_in` | Ratio prix input / prix output | Grille tarifaire publique du modèle |
| `κ_cache` | Ratio prix cache / prix input | Grille tarifaire publique du modèle |
| `r_in`, `r_cache` | Énergie IT par token d'entrée / en cache (Wh) | Dérivés de `r_out` via `κ_in`, `κ_cache` |
| `PUE(pays, fournisseur)` | Rendement énergétique du datacenter | Données fournisseur / extrapolation |
| `EF(pays)` | Intensité carbone du réseau électrique (gCO2e/kWh) | carbon_emissions_intensity_2025.csv |
| `WUE(pays, fournisseur)` | Eau consommée par kWh (L/kWh) | Données fournisseur / extrapolation |
| `dry_risk(pays, fournisseur)` | Risque de sécheresse (catégoriel) | WRI Aqueduct |

Le détail des constantes internes du modèle Ecologits (`ENERGY_ALPHA`, `LATENCY_ALPHA`, `GPU_MEMORY_GB`, etc.) et des formules (a)–(e) qui les combinent est donné au §4.1.

---

## 7. Sources et méthodologie de référence

- **Ecologits** — méthodologie d'estimation de l'empreinte des LLM à l'inférence (régression énergie/latence GPU, estimation `nb_params_activated` par régression pour les modèles fermés, principe repris et adapté ici pour `r_out`).
- **WRI Aqueduct** — indicateur de risque de sécheresse par pays.
- **Grilles tarifaires publiques des fournisseurs** (OpenAI, Anthropic, Google, etc.) — source de `κ_in` et `κ_cache`, à recalibrer à chaque mise à jour de tarifs. Consigner systématiquement la date de relevé des prix utilisés à côté des valeurs de `κ` dans l'implémentation.
- **carbon_emissions_intensity_2025.csv**, **country_drought_risk.csv** — données pays fournies avec le modèle de données du calculateur.
