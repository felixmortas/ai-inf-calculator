# Compléments au PRD — Calculateur d’empreinte environnementale des LLM

## Intégration au site existant

Felix indique que son site `felixmortas.com` est réalisé en HTML/CSS/JavaScript purs. Le calculateur y constituera une page, utilisable sans compte depuis un ordinateur ou un mobile.

Il autorise tout langage de réalisation pour cette page, à condition que le livrable soit hébergeable sur GitHub Pages et compatible avec le site actuel. La reconstitution d’une conversation passe par la saisie ou le copier-coller manuel ; aucune URL de partage n’est récupérée à distance.

## Choix de comptage

Le comptage retenu est exclusivement local : calcul avec Tiktoken par défaut, et en fallback nombre de tokens estimé = nombre de mots / 0,75. Le comptage distant OpenAI a été écarté par Felix en raison de la nécessité d’une clé API et de son refus d’un serveur complémentaire. Il n’y a donc aucun parcours de consentement à un envoi pour tokenisation à concevoir.

## Référence de douche chaude

Paramètres fournis par Felix pour une douche électrique de référence :

- Débit : 15 L/min.
- Température initiale : 18 °C.
- Température finale : 38 °C.
- Consommation pour chauffer un litre : 0,0232 kWh/L.

La référence utilise ces paramètres par défaut, et non les caractéristiques mesurées de la douche personnelle de l’utilisateur. Les paramètres peuvent être modifiés dans la section avancée, conformément à FR-17. Les valeurs numériques des formules ci-dessous correspondent aux valeurs par défaut.

Pour les valeurs personnalisées, l’énergie par minute est le débit choisi multiplié par l’énergie par litre applicable. La relation entre températures et énergie par litre doit être définie en D-2 avant développement : la valeur de 0,0232 kWh/L correspond à une élévation de 20 °C et ne doit pas rester inchangée implicitement si cette élévation est modifiée. La conception précisera les paramètres indépendants et les valeurs dérivées, en conservant la référence fournie par Felix.

Pour un facteur d’émission `EF_utilisateur` en gCO2e/kWh et un résultat carbone `C` en gCO2e :

```text
energie_douche_par_minute = 15 × 0.0232 = 0.348 kWh/min
carbone_douche_par_minute = 0.348 × EF_utilisateur  [gCO2e/min]
duree_equivalente_minutes = C / (0.348 × EF_utilisateur)
duree_equivalente_secondes = 60 × duree_equivalente_minutes
```

Ces formules de durée s’appliquent lorsque le facteur d’émission de l’utilisateur est disponible et strictement positif. Si les émissions de la douche de référence sont nulles, la durée est non calculable ; aucune division par zéro n’est permise. Les valeurs internes restent non arrondies ; la présentation suit les unités et la précision définies dans `EXPERIENCE.md`, à valider sur des valeurs représentatives avant livraison (D-2).

`EF_utilisateur` dépend du pays détecté automatiquement ou corrigé manuellement par l’utilisateur. Il est sélectionné indépendamment du facteur d’émission du pays d’hébergement utilisé pour calculer `C`. Le changement du pays utilisateur modifie l’équivalence, pas `C`.

La comparaison porte uniquement sur les émissions carbone. Aucun volume d’eau équivalent n’est calculé pour l’affichage.

### Équivalence en durée d’ampoule LED (FR-25)

```text
E_total = Σ nrj_request(i)  [Wh]    (blocs renseignés à jour, PUE inclus)
P_LED = 5 W par défaut, modifiable dans le Mode avancé (FR-17)
duree_LED_heures = E_total / P_LED
duree_LED_secondes = 3600 × E_total / P_LED
```

`P_LED` doit être strictement positive ; sinon la durée est non calculable, sans division par zéro. Cette comparaison porte sur l’électricité uniquement ; elle ne modifie aucun impact et le changement de `P_LED` ne périme que les équivalences. La valeur de 5 W reste à valider (D-4). Exemple : avec `E_total = 1,2 Wh` et `P_LED = 5 W`, la durée est 0,24 h, soit 864 s. La source de vérité reste la méthodologie §8.3.

## Référence méthodologique

La source de vérité unique pour la méthode, ses données, leurs provenances et leurs limites est [`docs/methodologie-empreinte-inference-llm.md`](../../../../docs/methodologie-empreinte-inference-llm.md). Ce résumé ne la remplace pas ; en cas d’écart, elle prévaut. Les exigences produit ci-dessous ne doivent pas modifier les règles de calcul. Les constantes de la méthode sont appliquées telles que publiées, sans réglage utilisateur ; `S_tokens` provient du catalogue et reste masqué.

### Données, unités et provenance

| Donnée | Unité ou domaine | Provenance annoncée dans la source |
|---|---|---|
| `P_tot` (`nb_params`) | milliards de paramètres | estimation IKP (§1) |
| `P_act` (`nb_params_activated`) | milliards de paramètres activés | régression sur modèles ouverts, étendue aux modèles fermés (§4.3, §9.2) |
| `S_tokens` | tokens, sans reconversion en mots | catalogue `models_params` fourni par Felix |
| `EF(pays)` | gCO₂e/kWh | Ember, année 2025, total de la production électrique (§4.1) |
| `PUE(pays, fournisseur)` | ratio ≥ 1 | cascade de fiabilité mesuré, estimé, régional, global (§4.7) |
| `WUE(pays, fournisseur)` | L/kWh | WUE régionale publiée ou moyenne globale du fournisseur (§4.8) |
| `κ_in`, `κ_cache` | ratios sans unité, par modèle/fournisseur | tarifs publics comparables, datés et sourcés (§4.5) |

Le catalogue fournit les modèles et leurs données selon les règles de construction du §4. Les facteurs géographiques et leurs replis suivent exclusivement les cascades spécifiées dans la méthodologie ; aucune règle de repli Monde supplémentaire n’est ajoutée ici. `P_tot = 37` signifie 37 milliards de paramètres. Le pays utilisateur sert uniquement à la référence de douche ; le pays d’hébergement sert à l’empreinte du modèle.

### Constitution des tokens d’un bloc

Les indices ci-dessous suivent l’ordre des blocs renseignés ; un bloc entièrement vide est ignoré, y compris pour le prompt système. Soient `M_i` le message, `R_i` le raisonnement visible, `C_i` la réponse finale et `A_i` l’artifact complet fourni au bloc `i`.

```text
T(texte) = Tiktoken(texte) par défaut
T(texte) = nombre_de_mots(texte) / coefficient_mots_par_token, en fallback
coefficient_mots_par_token = 0.75 par défaut
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

`S_tokens` est compté au taux du cache dès le premier bloc (§5.2 de la méthodologie) et n’est pas multiplié par le coefficient mots/tokens. Le raisonnement absent vaut zéro. Un résultat d’outil collé dans le message suit le traitement ordinaire du texte. Tous les tokens de l’historique sont supposés en cache ; aucun taux de succès réel n’est mesuré.

L’historique ne cumule ni les anciennes versions d’artifact ni leurs différences. Le bloc courant produit une différence en sortie ; sa version complète devient la référence des blocs suivants. Des versions identiques produisent zéro token d’artifact en sortie ; une suppression seule n’ajoute aucun texte de sortie. La définition d’un mot, la granularité du diff et les arrondis devront être documentés avant les tests de comptage ; ce contrat ne les invente pas.

### Valeurs par défaut de l’énergie IT

Les valeurs suivantes reprennent exactement le §6.1 de la méthodologie. Ce sont des constantes de calcul, pas des paramètres avancés modifiables.

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

Les trois taux sont en **Wh/token**, avant PUE. Ne jamais les multiplier de nouveau par `P_act`. `P_tot` n’intervient que dans la mémoire et le nombre de GPU : tous les experts d’un MoE sont supposés chargés. L’énergie GPU de l’équation (b) du §6.1 n’est pas remultipliée par `gpu_count`. Le PUE Ecologits générique de 1,20 n’est pas inclus ; il est remplacé par le PUE géographique à l’étape suivante.

### Calibration tarifaire datée

La décision finale du §3ter.2 prévaut sur les mentions antérieures de rendement physique ou de prefill :

```text
κ_in(modèle, fournisseur) = prix_input / prix_output
κ_cache(modèle, fournisseur) = prix_input_en_cache / prix_input
```

La calibration utilise les tarifs publics comparables d’un même modèle et fournisseur, ramenés à la même devise et à la même quantité de tokens. Les ratios ne sont pas universels. Le script de calibration demandé par la source relève de la préparation des données, hors du navigateur : il relève les tarifs à la date d’implémentation et conserve leur date avec les ratios. Ne pas coder les prix dans les formules. La source tarifaire exacte et les valeurs utilisées doivent accompagner les données pour permettre leur vérification et leur actualisation. Aucune valeur tarifaire contemporaine n’est postulée ici.

Une calibration qui ne permet pas de calculer un ratio défini ne fournit pas de valeur valide : ne pas inventer de ratio ni présenter un résultat calculé. Les ratios, leur date et la source tarifaire exacte accompagnent le catalogue selon §4.5.

### Énergie, carbone et eau

```text
nrj_compute(i) = new_input(i) × r_in
                 + history(i) × r_cache
                 + output(i) × r_out                         [Wh]

nrj_request(i) = nrj_compute(i) × PUE(pays_hebergement, fournisseur) [Wh]
co2_request(i) = (nrj_request(i) / 1000) × EF(pays_hebergement)      [gCO2e]
water_request(i) = (nrj_request(i) / 1000)
                   × WUE(pays_hebergement, fournisseur)          [L]
```

Conformément aux §2 et §7 de la méthodologie, calculer l’énergie datacenter une seule fois, appliquer le PUE une seule fois, puis réutiliser cette même énergie pour le carbone et l’eau. Les conversions Wh → kWh et gCO₂e → kgCO₂e divisent par 1000.

Les valeurs géographiques et les replis sont ceux définis par les cascades des §4.1, 4.7 et 4.8 de la méthodologie. Une donnée indispensable absente ne devient jamais implicitement zéro.

### Total et exemple d’unités

```text
nrj_total = Σ nrj_request(i)       [Wh]
co2_total = Σ co2_request(i)       [gCO2e]
water_total = Σ water_request(i)  [L]
```

Ces sommes portent sur tous les blocs renseignés dont les résultats sont à jour. Un seul « Calculer » estime tous les blocs renseignés puis agrège ; il n’existe pas de recalcul des seuls totaux. Un bloc renseigné non calculé ou périmé empêche l’affichage d’un total complet ; un bloc vide ne le bloque pas.

Exemple purement arithmétique, sans valeur de référence fournisseur : avec une énergie IT de 1 Wh, `PUE = 1,2`, `EF = 100 gCO2e/kWh` et `WUE = 0,5 L/kWh`, on obtient 1,2 Wh au datacenter, 0,12 gCO2e et 0,0006 L. Si le facteur utilisateur vaut aussi 100 gCO2e/kWh, la douche de référence émet 34,8 gCO2e/min et l’équivalence est `0,12 / 34,8 × 60 ≈ 0,207 seconde`. Cette illustration vérifie les conversions, pas la fiabilité des hypothèses.

### Périmètre et limites de la méthode

- L’empreinte couvre l’usage uniquement : fabrication, amortissement matériel et Scope 3 exclus (§1.2–1.3, §9). L’eau correspond au WUE sur site ; l’eau liée à la production électrique est exclue (§1.2–1.3).
- Raisonnement et complétion partagent le taux de sortie. L’augmentation du coût des tokens avec le KV cache n’est pas représentée (§6.3, §9.3). Les paramètres activés des modèles fermés sont estimés (§4.3, §9.2).
- Le cache à 100 %, les hypothèses matérielles, le batch par défaut à 64 et les latences déterministes ne décrivent pas une exécution mesurée (§6.1–6.3, §9). Les ratios de prix sont un proxy énergétique choisi par la méthode, pas une mesure physique.
- La saisie, l’agrégation par échange, le tokenizer local, les artifacts et l’équivalence douche sont des exigences produit autour de la méthode. Le prompt système provient du catalogue en tokens et n’est pas demandé à l’utilisateur.
- Les constantes et équations de calcul sont celles de la méthodologie ; elles ne sont pas modifiables dans les paramètres avancés. Les options de session portent uniquement sur les choix produit explicitement prévus, notamment la localisation.

Le résultat est un ordre de grandeur ponctuel ; aucune fourchette chiffrée d’incertitude n’est calculée.
