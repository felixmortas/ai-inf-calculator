# Méthodologie d'estimation de l'empreinte environnementale de l'inférence des LLM

## 1. Objet, périmètre et principe directeur

### 1.1 Objet
Estimer l'énergie électrique, les émissions de gaz à effet de serre (gCO₂e) et l'eau consommée par une **conversation** avec un chatbot, calculée **échange par échange** (un échange = un appel API qui reçoit l'historique et le nouveau message, et renvoie un raisonnement visible et une réponse).

### 1.2 Périmètre inclus
- Énergie d'**inférence** (phase d'usage) du centre de données.
- Émissions associées, via l'intensité carbone du réseau du **pays d'hébergement** du centre de données.
- Eau **sur site** (refroidissement), via le WUE.
- Équivalence carbone en durée de douche chaude électrique.
- Comparaison de l'électricité en durée d'allumage d'une ampoule LED.

### 1.3 Périmètre exclu
Scope 3 (fabrication et amortissement des GPU, serveurs, bâtiments) ; entraînement du modèle ; eau hors site liée à la production d'électricité ; extraction des métaux ; réseau et terminaux ; raisonnement invisible ; image, audio, vidéo ; fourchette d'incertitude chiffrée. 
Le résultat est une **empreinte d'usage, un ordre de grandeur**, pas une empreinte de cycle de vie.

### 1.4 Principe directeur : modéliser physiquement ce qui est modélisable, s'appuyer sur l'observable pour le reste
Les modèles propriétaires (GPT, Claude, Gemini…) ne publient ni paramètres activés, ni matériel, ni taux d'utilisation réel des GPU. Deux informations restent accessibles : une estimation du nombre de paramètres (travaux IKP) et les grilles tarifaires des API. D'où :
- l'énergie du token de **sortie** est modélisée physiquement à partir du modèle d'Ecologits, car c'est le poste qui varie le plus avec la taille du modèle et le régime de décodage est le mieux caractérisé publiquement.
- l'énergie des tokens d'**entrée** et de **cache** est dérivée du **rapport des prix** facturés, faute d'un modèle physique pertinent sur les dynamiques du prefill et de l'encoding.

---

## 2. Chaîne de calcul

```
Modèle (P_tot, P_act, κ_in, κ_cache, S_tokens, pays/fournisseur)  +  textes de l'échange i
   │
   ▼ [1] Comptage de tokens : new_input(i), history(i), output(i)          (§5)
   ▼ [2] r_out (Ecologits) ; r_in = κ_in·r_out ; r_cache = κ_cache·r_in    (§6)
   ▼ [3] nrj_compute(i) = new_input·r_in + history·r_cache + output·r_out  [Wh, IT brut]
   ▼ [4] nrj_request(i) = nrj_compute(i) × PUE(pays, fournisseur)          [Wh]
        ├─► co2_request(i)   = nrj_request/1000 × EF(pays)                 [gCO₂e]
        └─► water_request(i) = nrj_request/1000 × WUE(pays, fournisseur)   [L]
   ▼ [5] Agrégation : Σ sur les échanges à jour ; équivalences douche et LED  (§8, §9)
```

---

## 3. Notations et unités

| Symbole | Signification | Unité | Origine |
|---|---|---|---|
| `P_tot` | paramètres totaux | milliards | estimation IKP (§4.2) |
| `P_act` | paramètres activés (MoE) | milliards | régression sur modèles ouverts d'IKP (§4.3) |
| `S_tokens` | tokens du prompt système | tokens | §4.4 |
| `κ_in`, `κ_cache` | ratios de prix input/output et cache/input | sans unité | §4.5 |
| `EF(pays)` | intensité carbone de la production électrique | gCO₂e/kWh | §4.1 |
| `PUE(pays, fournisseur)` | rendement énergétique du centre de données | ratio ≥ 1 | §4.7 |
| `WUE(pays, fournisseur)` | eau consommée par kWh | L/kWh | §4.8 |
| `r_out`, `r_in`, `r_cache` | énergie IT par token de sortie / d'entrée / en cache | Wh/token | §6 |

---

## 4. Données et leur construction

### 4.1 Facteurs d'émission carbone `EF`
- **Source** : jeu Ember « generation yearly global » (`release_generation_yearly_global.csv`).
- **Filtres** : `Area type = Country or economy` ; année **2025** ; `Electricity source = Total generation` (intensité du mix de production domestique).
- **Variable** : `Emissions intensity (gCO2e/kWh)` ; Les observations sans valeur sont exclues.
- **Référence Monde** : ligne `World` = **473 gCO₂e/kWh**, intensité mondiale **2024** (Ember, *Global Electricity Review 2025*).

### 4.2 Paramètres totaux `P_tot` des modèles fermés
Estimations issues de l'article [Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity](https://01.me/research/ikp//#/calibration).

### 4.3 Paramètres activés `P_act` des modèles fermés
1. Construction d'un CSV (`model, params, params_activated`) à partir de `configs/all_models.json` du dépôt `19PINE-AI/ikp`, en ne retenant que les modèles dont `params` et `params_activated` sont **renseignés et différents** (modèles MoE).
2. Ajout de **20 modèles Hugging Face**.
3. Suppression des doublons et de **gpt-4** (nombre de paramètres non vérifiable).
4. **Régression** `P_act = f(P_tot)` de forme **exponentielle** ajustée sur ces modèles ouverts, puis appliquée aux modèles fermés. Scripts : `ai-inf-calculator/data/analyze_moe_params.py` (ajustement) et `visualize_closed_model_params.py` (prédiction).

### 4.4 Tokens du prompt système `S_tokens`
- Comptés **avec le tokenizer du calculateur** sur les prompts système divulgués du dépôt `asgeirtj/system_prompts_leaks`.
- Modèle sans prompt correspondant : attribution, par ordre de priorité, (1) du prompt du **modèle le plus proche de la même famille**, (2) à défaut de la **médiane** de tous les prompts. La médiane est retenue car insensible aux valeurs extrêmes et cas particuliers (par ex. Claude Fable 5).
- `S_tokens` est une valeur du catalogue, en tokens (non converti via mots/token) ; c'est un paramètre **imposé et masqué** à l'utilisateur.

### 4.5 Ratios tarifaires `κ_in`, `κ_cache`
```
κ_in(modèle, fournisseur)    = prix_input / prix_output
κ_cache(modèle, fournisseur) = prix_input_en_cache / prix_input
```
- Sources : prix publics, collectés notamment sur **OpenRouter**, ramenés à la **même devise et à la même quantité de tokens**.
- Calculés **par modèle et fournisseur**, jamais figés en constante universelle.
- Un script de calibration **hors navigateur** relève les tarifs à date et **conserve la date** avec les ratios et la source tarifaire exacte.
- **Choix « market-based »** : approche simple, volontairement non représentative du coût physique, jugée équilibrée par les autres incertitudes.

### 4.6 Localisation des centres de données (fournisseur de LLM → cloud → pays)
| Fournisseur de LLM | Cloud retenu | Pays par défaut (utilisateurs gratuits) |
|---|---|---|
| OpenAI (partenariat Microsoft) | Azure | États-Unis |
| Mistral AI (partenariat Microsoft) | Azure | centres souverains en Europe, probablement **Suisse** |
| Gemini | Google Cloud (obligatoire) | États-Unis |
| Anthropic | AWS (cloud le plus concurrentiel parmi les trois possibles) | États-Unis |

Ce sont des **hypothèses de localisation probable** et modifiables. Pour la **comparaison entre modèles**, l'hypothèse simplificatrice retenue est que les centres de données des fournisseurs sont aux **États-Unis** ; c'est pourquoi l'indicateur de **risque de sécheresse a été supprimé** (il ajoutait données et complexité sans différencier les modèles sous cette hypothèse).

### 4.7 PUE par pays et fournisseur
Cascade à quatre niveaux de fiabilité décroissante, avec traçabilité du niveau utilisé :
1. **measured** : valeur publiée par AWS, Azure ou GCP pour le pays/région précis ;
2. **estimated** : interpolation régionale (pays sans centre connu, dans une zone à PUE publiée) ;
3. **regional** : PUE régionale agrégée (Asie-Pacifique, EMEA…) ;
4. **global** : PUE mondiale moyenne du fournisseur (pays isolés).

Le PUE générique Ecologits de 1,20 est **exclu** de `r_out` et remplacé par ce PUE géographique, appliqué une seule fois (§2).

### 4.8 WUE par pays et fournisseur
Les fournisseurs ne publient que des WUE **régionaux**. Chaque pays est rattaché à la région cloud la plus proche ; si la valeur régionale existe (ex. Singapour 1,57 L/kWh pour AWS), elle est utilisée telle quelle ; sinon, **moyenne globale du fournisseur**, sans ajustement subjectif. L'imputation repose exclusivement sur des données publiées mais masque la variabilité intra-régionale (technologie de refroidissement, conception).

### 4.9 Catalogue de modèles
Un catalogue local par modèle/fournisseur : `P_tot`, `P_act`, `S_tokens`, pays de référence, `κ_in`, `κ_cache`, et les facteurs `PUE`, `EF`, `WUE`. Modèles proposés par défaut : ChatGPT → petit modèle actuel (sans abonnement), gros modèle actuel (avec abonnement) ; Mistral → petit modèle (rapide), gros modèle (réflexion).

---

## 5. Comptage des tokens

### 5.1 Tokenisation
- Par défaut : **Tiktoken**, exécuté localement (Worker navigateur) ; aucun texte n'est envoyé.
- Repli en cas d'échec : `T(texte) = nombre_de_mots / coefficient`, coefficient **0,75** mot/token par défaut (référence OpenAI), modifiable ; les mots sont segmentés aux caractères non alphanumériques.
- `T(texte vide) = 0` ; raisonnement non fourni = 0. Un résultat d'outil collé dans un message est du texte ordinaire.

### 5.2 Constitution des tokens d'un échange `i`
Les indices suivent l'ordre des échanges **renseignés** (un bloc entièrement vide est ignoré, y compris pour le prompt système). `M_i` message, `R_i` raisonnement visible, `C_i` réponse, `A_i` version complète de l'artifact fournie à l'échange `i`.

```
A_prec(i) = dernière version complète d'artifact fournie avant i (vide si aucune)
D_i       = passages ajoutés ou modifiés de A_i par rapport à A_prec(i)
            (A_i complet à la première version ; vide si pas d'artifact)

new_input(i) = T(M_i)
history(i)   = S_tokens + Σ_{j<i} [T(M_j) + T(R_j) + T(C_j)] + T(A_prec(i))
output(i)    = T(R_i) + T(C_i) + T(D_i)
```

Règles associées :
- `S_tokens` est traité au taux du cache **dès le premier échange**.
- L'historique **ne cumule pas** les anciennes versions d'artifact ni leurs différences : seule la dernière version complète compte. Le diff de l'échange courant va en **sortie** ; sa version complète devient la référence suivante.
- Versions identiques → 0 token d'artifact en sortie ; une suppression seule n'ajoute aucun token de sortie, ce qui sous-estime l'impact final.
- Tout l'historique est supposé **100 % en cache**.

---

## 6. Énergie IT par token

### 6.1 `r_out` : modèle physique Ecologits (hors Scope 3, TPS/TTFT fixes)
Régression publique sur matériel réel ; batch et temps de calcul par token traités comme des fonctions déterministes des constantes (hypothèse « TPS/TTFT fixes »).

| Constante | Valeur | Rôle |
|---|---:|---|
| `BATCH_SIZE` | 64 | requêtes servies en parallèle |
| `GPU_INSTALLED_PER_SERVER` | 8 | GPU par serveur |
| `SERVER_POWER_WITHOUT_GPU_W` | 1200 | puissance serveur hors GPU (CPU, RAM, alim., ventilation), W |
| `GPU_MEMORY_GB` | 80 | VRAM par GPU (classe A100/H100) |
| `QUANTIZATION_BITS` | 16 | bits par poids |
| `MEMORY_OVERHEAD` | 1,2 | marge mémoire (KV cache, activations, fragmentation) |
| `ENERGY_ALPHA` / `BETA` / `GAMMA` | 1,17e-6 / −1,12e-2 / 4,05e-5 | régression énergie GPU |
| `LATENCY_ALPHA` / `BETA` / `GAMMA` | 6,78e-4 / 3,12e-4 / 1,94e-2 | régression latence |

**Équations :**
```
(a) memory_gb        = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
    gpu_count        = ceil(memory_gb / GPU_MEMORY_GB)
(b) gpu_wh_token     = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
(c) latency_s_token  = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
(d) server_wh_token  = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W/3600)
                       × (gpu_count/GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
(e) r_out            = gpu_wh_token + server_wh_token
```

### 6.2 `r_in` et `r_cache` : ancrage sur `r_out` par les prix
```
r_in    = κ_in × r_out
r_cache = κ_cache × r_in
```
Ils héritent donc de la dépendance à `P_act`/`P_tot` sans réestimation indépendante (pas d'hétérogénéité méthodologique).

### 6.3 Justification du price-based plutôt qu'un modèle physique du prefill (compute-bound vs memory-bound, envisagé puis écarté)
1. **Observabilité** : MFU, taille de batch et matériel du prefill des modèles fermés ne sont pas observables, alors que la latence de décodage est mesurable de l'extérieur ; un modèle physique du prefill reposerait sur des hypothèses invérifiables, quand le prix est public, daté et spécifique au modèle.
2. **Scalabilité** : le catalogue évolue en continu ; un ratio physique exigerait de recalibrer un rendement matériel à chaque modèle sans données ; le prix se met à jour à chaque annonce.
3. **Biais opposés assumés et non corrigés séparément** :
   - le prix du cache **surestime** probablement son coût énergétique (lecture mémoire, coût marginal proche de zéro ; le prix reflète l'amortissement de l'infrastructure et une logique commerciale) → biais à la hausse sur `r_cache` ;
   - `r_out` traite tous les tokens de sortie à coût égal alors que le coût réel **croît** avec le nombre de tokens en input et déjà générés (KV-cache grandissant) → **sous-estimation** des longs contextes et longues complétions, biais à la baisse sur `r_in` et `r_out`.
   Dans une conversation multi-tours, l'historique en cache intègre les sorties précédentes, de sorte que le volume facturé au tarif « cache » grossit et que les deux biais, du même ordre de grandeur, se compensent **approximativement**. C'est une simplification, pas une élimination de l'erreur.
4. **Cohérence** avec le reste de la méthode, qui utilise déjà une proxy observable (régression publique) pour `P_act` des modèles fermés.

---

## 7. Impacts : énergie, carbone, eau

```
nrj_compute(i)   = new_input(i)·r_in + history(i)·r_cache + output(i)·r_out        [Wh]
nrj_request(i)   = nrj_compute(i) × PUE(pays_hébergement, fournisseur)             [Wh]
co2_request(i)   = (nrj_request(i)/1000) × EF(pays_hébergement)                    [gCO₂e]
water_request(i) = (nrj_request(i)/1000) × WUE(pays_hébergement, fournisseur)      [L]
```

---

## 8. Équivalences

### 8.1 Douche électrique
Débit 15 L/min ; 18 → 38 °C (élévation de 20 °C selon la thermodynamique) ; 0,0232 kWh/L ⇒ **0,348 kWh/min**. Paramètres par défaut, modifiables.
```
carbone_douche_min = débit × énergie_par_litre × EF_utilisateur      [gCO₂e/min]
durée_minutes      = C / (0,348 × EF_utilisateur)
durée_secondes     = 60 × C / carbone_douche_min
```
- `EF_utilisateur` est le pays de l'**utilisateur** (détecté ou corrigé).
- Comparaison **carbone uniquement** ; aucun volume d'eau équivalent n'est calculé.

### 8.2 Ampoule LED
Comparaison de l'**électricité** de la conversation, exprimée en durée d'allumage d'une ampoule LED.
```
E_total   = Σ nrj_request(i)    [Wh]   échanges renseignés à jour, PUE inclus
P_LED     = 5 W                 [W]    par défaut, modifiable
durée_LED = E_total / P_LED     [h]    (secondes : 3 600 × E_total / P_LED)
```
- `P_LED` doit être strictement positive ; sinon la durée est non calculable.
- Le carbone et l'eau ne sont pas concernés ; `P_LED` n'intervient dans aucune équation d'impact.
- La valeur de 5 W est une convention d'illustration, non une mesure.
---

## 9. Limites

### 9.1. Absence d'incertitude
Le résultat est un point unique, alors que la chaîne enchaîne des estimations très bruitées. Les erreurs se multiplient donc exclure la fourchette d'incertitude revient à afficher une précision que la méthode ne possède pas. 
Cette incertitude n'est pas un problème pour l'utilisation du calculateur à des fins pédagogiques. Les compétences à transmettre reposent sur une comparaison des pratiques, utilisant toutes la même méthodologie de mesure.

### 9.2. Régression P_act = f(P_tot)
On suppose que tous les modèles propriétaires sont des MoE car des modèles denses avec autant de paramètres sont peu probables. Mais si l'un d'eux est dense, P_act est largement sous-estimé.
La forme exponentielle de la fonction diverge hors de la plage d'ajustement. Or, les modèles fermés estimés se situent au-delà de la plupart des modèles ouverts.

### 9.3. Raisonnement invisible exclu
Pour les modèles de « réflexion », les tokens de raisonnement cachés peuvent largement dépasser la réponse visible. Leur exclusion produit une sous-estimation globale et avantage les modèles de raisonnement dans la comparaison. Un rappel est réalisé dans les bonnes pratiques.

### 9.4. Ancrage sur les prix
`κ_in` change quand un fournisseur baisse son prix, peut-être sans aucun changement physique. Les surcharges de contexte long et les tarifs batch ou prioritaires posent le même problème. La tarification n'a peut-être pas de corrélation avec la consommation énergétique lors du traitement.

### 9.5. Choix des FE, PUE et WUE
La localisation des modèles des fournisseurs privés n'étant pas connue, il est difficile d'estimer ces variables.

---

## 10. Sources
- Ember — Electricity generation yearly (`release_generation_yearly_global.csv`) ; *Global Electricity Review 2025* (référence Monde).
- IKP — *Incompressible Knowledge Probes: Estimating Black-Box LLM Parameter Counts via Factual Capacity* (01.me/research/ikp) ; dépôt `19PINE-AI/ikp` (`configs/all_models.json`).
- Hugging Face - 20 modèles additionnels pour estimation de `P_act` des modèles d'IKP.
- Ecologits — estimation du coût énergétique d'un token.
- OpenRouter et grilles tarifaires publiques des fournisseurs.
- Dépôt `asgeirtj/system_prompts_leaks` - prompts système.
- Publications PUE/WUE d'AWS (2025), Azure (FY25), Google Cloud (2024).
- Scripts de projet : `analyze_moe_params.py`, `visualize_closed_model_params.py`.
