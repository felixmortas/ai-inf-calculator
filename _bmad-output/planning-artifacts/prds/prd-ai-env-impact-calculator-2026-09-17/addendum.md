# Compléments au PRD — Calculateur d’empreinte environnementale des LLM

## Intégration au site existant

Felix indique que son site `felixmortas.com` est réalisé en HTML/CSS/JavaScript purs. Le calculateur y constituera une page, utilisable sans compte depuis un ordinateur ou un mobile.

Il autorise tout langage de réalisation pour cette page, à condition que le livrable soit hébergeable sur GitHub Pages. Aucun framework ni outil de compilation n’est imposé à ce stade. L’étude d’import par URL de partage devra respecter cette contrainte d’hébergement ; aucun serveur complémentaire n’est prévu.

## Choix de comptage

Le comptage retenu est exclusivement local : nombre de tokens estimé = nombre de mots / 0,7. Le comptage distant OpenAI a été écarté par Felix en raison de la nécessité d’une clé API et de son refus d’un serveur complémentaire. Il n’y a donc aucun parcours de consentement à un envoi pour tokenisation à concevoir.

## Référence de douche chaude

Paramètres fournis par Felix pour une douche électrique de référence :

- Débit : 15 L/min.
- Température initiale : 18 °C.
- Température finale : 38 °C.
- Consommation pour chauffer un litre : 0,0232 kWh/L.

La référence utilise ces paramètres par défaut, et non les caractéristiques mesurées de la douche personnelle de l’utilisateur. Les paramètres peuvent être modifiés dans la section avancée, conformément à FR-17. Les valeurs numériques des formules ci-dessous correspondent aux valeurs par défaut.

Pour un facteur d’émission `EF_utilisateur` en gCO2e/kWh et un résultat carbone `C` en gCO2e :

```text
energie_douche_par_minute = 15 × 0.0232 = 0.348 kWh/min
carbone_douche_par_minute = 0.348 × EF_utilisateur  [gCO2e/min]
duree_equivalente_minutes = C / (0.348 × EF_utilisateur)
duree_equivalente_secondes = 60 × duree_equivalente_minutes
```

Ces formules de durée s’appliquent lorsque le facteur d’émission est disponible et strictement positif. Un facteur manquant utilise la référence « Monde », signalée à l’utilisateur. Le traitement d’un facteur nul et les règles d’arrondi restent à préciser ; aucune division par zéro n’est permise.

`EF_utilisateur` dépend du pays détecté automatiquement ou corrigé manuellement par l’utilisateur. Il est sélectionné indépendamment du facteur d’émission du pays d’hébergement utilisé pour calculer `C`. Le changement du pays utilisateur modifie l’équivalence, pas `C`.

La comparaison porte uniquement sur les émissions carbone. Aucun volume d’eau équivalent n’est calculé pour l’affichage.

## Contrat mathématique de référence

Ce contrat reprend les §1–10 de `spec-formules-calculateur-empreinte-llm.md` et les adapte aux décisions produit du PRD. Il ne constitue pas une vérification scientifique externe des données annoncées dans cette source. Les constantes ci-dessous sont des **valeurs par défaut modifiables dans les paramètres avancés** ; le seul paramètre imposé et masqué est le nombre de tokens du prompt système issu du catalogue. Les équations elles-mêmes ne sont pas éditables.

### Données, unités et provenance

| Donnée | Unité ou domaine | Provenance annoncée dans la source |
|---|---|---|
| `P_tot` (`nb_params`) | milliards de paramètres | estimation IKP (§1) |
| `P_act` (`nb_params_activated`) | milliards de paramètres activés | régression sur modèles ouverts, étendue aux modèles fermés (§1, §10.2) |
| `S_tokens` | tokens, sans reconversion en mots | catalogue `model_params` / `models_param` fourni par Felix |
| `EF(pays)` | gCO2e/kWh | `carbon_emissions_intensity_2025.csv`, `Area`, `Emissions intensity (gCO2e/kWh)` (§1) |
| `PUE(pays, fournisseur)` | ratio ≥ 1 | données fournisseurs et extrapolation (§1) |
| `WUE(pays, fournisseur)` | L/kWh | données fournisseurs et extrapolation (§1) |
| `dry_risk(pays, fournisseur)` | `low`, `med`, `high`, `extreme` | `country_drought_risk.csv`, `Area`, `drought_risk_level` ; WRI Aqueduct annoncé (§1, §7) |
| `κ_in`, `κ_cache` | ratios sans unité, par modèle/fournisseur | calibration tarifaire datée (§3ter.2) |

Le catalogue fournit les modèles et leurs données ; les valeurs non fournies ne sont pas inventées. `P_tot = 37` signifie 37 milliards de paramètres, et non 37 paramètres : une source en unités brutes doit être convertie avant calcul. Les tables environnementales doivent inclure les valeurs de repli « Monde ». Le pays utilisateur sert uniquement à la référence de douche ; le pays d’hébergement sert à l’empreinte du modèle.

### Constitution des tokens d’un bloc

Les indices ci-dessous suivent l’ordre des blocs renseignés ; un bloc entièrement vide est ignoré, y compris pour le prompt système. Soient `M_i` le message, `R_i` le raisonnement visible, `C_i` la réponse finale et `A_i` l’artifact complet fourni au bloc `i`.

```text
T(texte) = nombre_de_mots(texte) / coefficient_mots_par_token
coefficient_mots_par_token = 0.7 par défaut
T(texte vide) = 0

A_precedent(i) = dernière version complète d’artifact fournie avant i
                (texte vide si aucune version antérieure)
D_i = passages ajoutés ou modifiés de A_i par rapport à A_precedent(i)
      (A_i complet à la première version ; vide si aucun artifact fourni)

new_input(i) = T(M_i)
history(i) = S_tokens
             + Σ[j<i] (T(M_j) + T(R_j) + T(C_j))
             + T(A_precedent(i))
output(i) = T(R_i) + T(C_i) + T(D_i)
```

`S_tokens` est compté au taux du cache dès le premier bloc (§2 de la source) et n’est pas multiplié par le coefficient mots/tokens. Le raisonnement absent vaut zéro. Un résultat d’outil collé dans le message suit le traitement ordinaire du texte (§2.2). Tous les tokens de l’historique sont supposés en cache ; aucun taux de succès réel n’est mesuré.

L’historique ne cumule ni les anciennes versions d’artifact ni leurs différences. Le bloc courant produit une différence en sortie ; sa version complète devient la référence des blocs suivants. Des versions identiques produisent zéro token d’artifact en sortie ; une suppression seule n’ajoute aucun texte de sortie. La définition d’un mot, la granularité du diff et les arrondis devront être documentés avant les tests de comptage ; ce contrat ne les invente pas.

### Valeurs par défaut de l’énergie IT

Les valeurs suivantes reprennent exactement le §3bis.3 de la source.

| Paramètre | Valeur | Rôle |
|---|---:|---|
| `BATCH_SIZE` | 64 | requêtes simultanées |
| `GPU_INSTALLED_PER_SERVER` | 8 | GPU installés par serveur |
| `SERVER_POWER_WITHOUT_GPU_W` | 1200 | puissance hors GPU, en W |
| `GPU_MEMORY_GB` | 80 | mémoire par GPU, en Go |
| `QUANTIZATION_BITS` | 16 | bits par poids |
| `MEMORY_OVERHEAD` | 1.2 | marge mémoire |
| `ENERGY_ALPHA` | 1.17e-6 | coefficient GPU dépendant de `P_act` |
| `ENERGY_BETA` | -1.12e-2 | coefficient GPU dépendant du batch |
| `ENERGY_GAMMA` | 4.05e-5 | terme constant GPU |
| `LATENCY_ALPHA` | 6.78e-4 | coefficient de latence dépendant de `P_act` |
| `LATENCY_BETA` | 3.12e-4 | coefficient de latence dépendant du batch |
| `LATENCY_GAMMA` | 1.94e-2 | terme constant de latence |

```text
model_required_memory_gb = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
gpu_count = ceil(model_required_memory_gb / GPU_MEMORY_GB)

gpu_energy_per_token_wh = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act
                          + ENERGY_GAMMA

token_compute_time_seconds = LATENCY_ALPHA × P_act
                             + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA

server_energy_without_gpu_per_token_wh = token_compute_time_seconds
    × (SERVER_POWER_WITHOUT_GPU_W / 3600)
    × (gpu_count / GPU_INSTALLED_PER_SERVER) / BATCH_SIZE

r_out = gpu_energy_per_token_wh + server_energy_without_gpu_per_token_wh
r_in = κ_in × r_out
r_cache = κ_cache × r_in
```

Les trois taux sont en **Wh/token**, avant PUE. Ne jamais les multiplier de nouveau par `P_act`. `P_tot` n’intervient que dans la mémoire et le nombre de GPU : tous les experts d’un MoE sont supposés chargés. L’énergie GPU du §3bis.4b n’est pas remultipliée par `gpu_count`. Le PUE Ecologits générique de 1,20 n’est pas inclus ; il est remplacé par le PUE géographique à l’étape suivante.

### Calibration tarifaire datée

La décision finale du §3ter.2 prévaut sur les mentions antérieures de rendement physique ou de prefill :

```text
κ_in(modèle, fournisseur) = prix_input / prix_output
κ_cache(modèle, fournisseur) = prix_input_en_cache / prix_input
```

La calibration utilise les tarifs publics comparables d’un même modèle et fournisseur, ramenés à la même devise et à la même quantité de tokens. Les ratios ne sont pas universels. Le script de calibration demandé par la source relève de la préparation des données, hors du navigateur : il relève les tarifs à la date d’implémentation et conserve leur date avec les ratios. Ne pas coder les prix dans les formules. La source tarifaire exacte et les valeurs utilisées doivent accompagner les données pour permettre leur vérification et leur actualisation. Aucune valeur tarifaire contemporaine n’est postulée ici.

Les cas de prix absent ou nul, de cache non commercialisé et de grilles multiples demandent un contrat de données avant intégration ; une division par zéro ne produit pas un ratio valide. La fréquence et le responsable de la calibration restent à fixer. Une modification avancée de ratio est une surcharge de session ; la restauration reprend les valeurs de référence du modèle.

### Énergie, carbone, eau et sécheresse

```text
nrj_compute(i) = new_input(i) × r_in
                 + history(i) × r_cache
                 + output(i) × r_out                         [Wh]

nrj_request(i) = nrj_compute(i) × PUE(pays_hebergement, fournisseur) [Wh]
co2_request(i) = (nrj_request(i) / 1000) × EF(pays_hebergement)      [gCO2e]
water_request(i) = (nrj_request(i) / 1000)
                   × WUE(pays_hebergement, fournisseur)          [L]
dry_risk_request(i) = lookup(pays_hebergement, fournisseur)        [catégorie]
```

Conformément aux §0 et §3–7, calculer l’énergie datacenter une seule fois, appliquer le PUE une seule fois, puis réutiliser cette même énergie pour le carbone et l’eau. Les conversions Wh → kWh et gCO2e → kgCO2e divisent par 1000. Le risque de sécheresse n’est ni une émission ni une grandeur additive. La source annonce un lookup pays/fournisseur mais décrit une table de risque par pays ; le contrat de données devra préciser cette résolution sans inventer une granularité par datacenter.

Un facteur géographique manquant utilise la valeur « Monde » de ce facteur, signalée à l’utilisateur. Ce repli ne remplace pas les autres valeurs disponibles et n’est pas une règle de remplacement des données modèle ou des prix. Si la valeur « Monde » manque également, la donnée reste indisponible ; elle ne devient jamais implicitement zéro.

### Total et exemple d’unités

```text
nrj_total = Σ nrj_request(i)       [Wh]
co2_total = Σ co2_request(i)       [gCO2e]
water_total = Σ water_request(i)  [L]
```

Ces sommes portent sur tous les blocs renseignés dont les résultats sont à jour. Leur recalcul seul réutilise les résultats existants, sans réexécuter l’estimation des blocs. Un bloc renseigné non calculé ou périmé empêche l’affichage d’un total complet ; un bloc vide ne le bloque pas.

Exemple purement arithmétique, sans valeur de référence fournisseur : avec une énergie IT de 1 Wh, `PUE = 1,2`, `EF = 100 gCO2e/kWh` et `WUE = 0,5 L/kWh`, on obtient 1,2 Wh au datacenter, 0,12 gCO2e et 0,0006 L. Si le facteur utilisateur vaut aussi 100 gCO2e/kWh, la douche de référence émet 34,8 gCO2e/min et l’équivalence est `0,12 / 34,8 × 60 ≈ 0,207 seconde`. Cette illustration vérifie les conversions, pas la fiabilité des hypothèses.

### Limites et divergences explicites avec la source

- L’empreinte couvre l’usage uniquement : fabrication, amortissement matériel et Scope 3 exclus (§10.8). L’eau correspond au WUE sur site ; l’eau liée à la production électrique est exclue (§6, §10.4).
- Raisonnement et complétion partagent le taux de sortie. L’augmentation du coût des tokens avec le KV cache n’est pas représentée (§10.1). Les paramètres activés des modèles fermés sont estimés (§10.2).
- Le cache à 100 %, les hypothèses matérielles, le batch par défaut à 64 et les latences déterministes ne décrivent pas une exécution mesurée (§3bis.1, §10.3, §10.6–7). Les ratios de prix sont un proxy énergétique choisi par la source, pas une mesure physique.
- Contrairement au §2, la saisie de textes et l’agrégation sont centrales et non optionnelles ; le tokenizer distant est exclu. Les artifacts et la comparaison douche étendent la source. Le prompt système provient du catalogue en tokens, sans texte demandé à l’utilisateur.
- Contrairement au §3bis.2, les constantes sont modifiables en paramètres avancés. Le prompt système fait seul exception. Les bornes de validation des paramètres devront empêcher les calculs non définis ou physiquement incohérents ; leurs valeurs détaillées restent à définir en conception.
- Les renvois source vers §0.1 et §11 sont invalides : lire respectivement le pipeline §0 et les limites §6/§10.4. Aucun contenu absent n’est supposé.
- La formulation du §3bis.5 sur la continuité est corrigée : à `P_tot` fixé, donc `gpu_count` fixé, `r_out` est affine en `P_act`. Les sauts proviennent des seuils de GPU lorsque `P_tot` varie ; une continuité globale n’est pas garantie. Implémenter les équations successives du §3bis.4, pas les coefficients affines arrondis.

Les résultats restent des valeurs uniques présentées comme incertaines. Aucune marge d’erreur numérique n’est dérivée de ces hypothèses.
