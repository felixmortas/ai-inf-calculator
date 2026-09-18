# Contrat de calcul et données

## Données de référence

Le catalogue local validé au build porte versions, dates et provenance. Pour chaque modèle/fournisseur, il fournit au minimum `P_tot`, `P_act`, `S_tokens`, pays de référence, ratios `κ_in` et `κ_cache` calibrés à date, ainsi que les facteurs `PUE`, `EF`, `WUE`, risque de sécheresse et valeurs Monde nécessaires. `P_tot` et `P_act` sont exprimés en milliards de paramètres. Les prix ne sont jamais encodés dans les formules : `κ_in = prix_input / prix_output` et `κ_cache = prix_input_en_cache / prix_input`.

## Comptage

`T(texte)` emploie le tokenizer par défaut ; en fallback, `nombre_de_mots / coefficient_mots_par_token`, avec `0,75` par défaut. Pour le bloc renseigné `i` :

```text
new_input(i) = T(message_i)
history(i) = S_tokens + Σ[j<i](T(message_j) + T(raisonnement_j) + T(réponse_j))
             + T(dernière_version_artifact_avant_i)
output(i) = T(raisonnement_i) + T(réponse_i) + T(diff_artifact_i)
```

Tout l’historique est traité comme cache. Le raisonnement absent vaut zéro. Les règles précises de segmentation, diff et arrondi sont à décider avant les tests.

## Énergie IT

Les constantes par défaut sont modifiables : `BATCH_SIZE=64`, `GPU_INSTALLED_PER_SERVER=8`, `SERVER_POWER_WITHOUT_GPU_W=1200`, `GPU_MEMORY_GB=80`, `QUANTIZATION_BITS=16`, `MEMORY_OVERHEAD=1.2`, `ENERGY_ALPHA=1.17e-6`, `ENERGY_BETA=-1.12e-2`, `ENERGY_GAMMA=4.05e-5`, `LATENCY_ALPHA=6.78e-4`, `LATENCY_BETA=3.12e-4`, `LATENCY_GAMMA=1.94e-2`.

```text
memory_gb = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
gpu_count = ceil(memory_gb / GPU_MEMORY_GB)
gpu_wh_token = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
latency_s_token = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
server_wh_token = latency_s_token × (SERVER_POWER_WITHOUT_GPU_W / 3600)
                  × (gpu_count / GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
r_out = gpu_wh_token + server_wh_token
r_in = κ_in × r_out
r_cache = κ_cache × r_in
```

Les taux sont en Wh/token avant PUE. `P_act` n’est pas remultiplié ; `P_tot` intervient seulement dans mémoire et nombre de GPU. Le PUE générique Ecologits est exclu.

## Impacts et total

```text
energy_compute = new_input × r_in + history × r_cache + output × r_out       [Wh]
energy = energy_compute × PUE(pays_hébergement, fournisseur)                 [Wh]
carbon = (energy / 1000) × EF(pays_hébergement)                              [gCO2e]
water = (energy / 1000) × WUE(pays_hébergement, fournisseur)                [L]
total = Σ résultats de blocs renseignés à jour
```

PUE est appliqué exactement une fois ; carbone et eau réutilisent la même énergie datacenter. Le risque est une catégorie recherchée pour le pays d’hébergement, sans somme ni multiplication. L’affichage peut convertir les unités mais ne modifie pas le calcul. Le modèle couvre l’usage uniquement, eau sur site uniquement, sans KV-cache réel, mesure physique de l’exécution ni marge chiffrée d’incertitude.

## Équivalence douche

Par défaut, une douche électrique a débit 15 L/min, de 18 à 38 °C et énergie 0,0232 kWh/L : `0,348 kWh/min`. Pour un carbone `C` et `EF_utilisateur` :

```text
carbone_douche_min = débit × énergie_litre × EF_utilisateur
durée_secondes = 60 × C / carbone_douche_min
```

Le facteur vient du pays utilisateur, indépendamment du pays d’hébergement. Les paramètres sont ajustables, mais la relation températures/énergie par litre doit être définie avant développement pour éviter des valeurs contradictoires.
