# Extraction fidèle — spécification des formules

Source : `spec-formules-calculateur-empreinte-llm.md`, lue intégralement le 17 septembre 2026. Les références ci-dessous renvoient à ses sections. Les lacunes sont constatées, sans décision produit ajoutée.

## Périmètre et expérience explicitement définis

- Calculer l'empreinte **d'usage** d'une requête LLM, avec énergie, carbone, eau et risque de sécheresse (§0, §4–7, §10.8).
- Un bloc/requête est un appel API transmettant historique et nouveau message et produisant raisonnement + complétion (§0).
- L'utilisateur sélectionne un modèle, ce qui fournit `P_tot` et `P_act` (§3bis.2), et saisit directement les nombres de tokens `new_input`, `history` (cache) et `output` (§2).
- Le pays de datacenter est prérempli depuis le fournisseur ; ce n'est pas le pays de l'utilisateur (§5). La source ne précise pas le contrôle de sélection du fournisseur ni si le pays est modifiable.
- Afficher un label de risque de sécheresse à côté de l'eau (§7). Signaler dans l'interface que l'empreinte couvre uniquement l'usage et exclut la fabrication (§10.8).
- Mode optionnel « coller une conversation » avec déduction des tokens (§2). Agrégation conversationnelle optionnelle ; recommandation d'afficher dernier tour et cumul (§8).
- Aucun rôle, public cible, protagoniste, parcours complet, support web/mobile/desktop, objectif commercial, indicateur de succès ou échéance n'est décrit.

## Capacités et règles fonctionnelles

1. Résoudre les paramètres totaux et activés du modèle, tous deux en **milliards** ; convertir en amont si données en paramètres bruts (§1). Origines annoncées : estimation IKP pour les paramètres totaux et régression sur modèles ouverts pour les activés ; régression appliquée aux modèles propriétaires (§1, §10.2).
2. Déterminer `r_out` par les formules Ecologits adaptées (ci-dessous), hors Scope 3 et hors PUE générique (§3bis).
3. Déterminer les ratios d'entrée et de cache **par modèle et fournisseur** à partir des tarifs publics relevés à la date d'implémentation. Prévoir un script de calibration, éviter les prix figés dans le code et conserver la date de relevé à côté des ratios (§3ter.2).
4. Calculer une fois l'énergie IT de chaque requête, puis appliquer **une fois** le PUE pays/fournisseur pour obtenir l'énergie datacenter (§0, §3–4). Ne jamais multiplier les taux Wh/token par `P_act` : leur dépendance à la taille du modèle est déjà intégrée (§1).
5. Dériver carbone et eau exclusivement de cette énergie datacenter ; contextualiser l'eau avec le risque de sécheresse (§0, §5–7).
6. Si mode conversation retenu : compter textes avec tokenizer réel dépendant du modèle, ou approximation `tokens ≈ mots / 0.7` ; traiter les résultats d'outils comme texte classique (§2).
7. Si agrégation retenue : sommer énergie, carbone, eau par requête ; la source ne définit pas d'agrégation du risque (§8).

## Formules, valeurs et unités à préserver

### Entrées et facteurs (§1)

| Élément | Unité / domaine | Source annoncée |
|---|---|---|
| `P_tot`, `P_act` | milliards de paramètres | données du modèle |
| `new_input`, `history`, `output` | tokens | saisie directe ; tokenisation optionnelle |
| `EF(pays)` | gCO2e/kWh | `carbon_emissions_intensity_2025.csv`, colonnes `Area`, `Emissions intensity (gCO2e/kWh)` |
| `PUE(pays, fournisseur)` | ratio ≥ 1 | données fournisseurs + extrapolation |
| `WUE(pays, fournisseur)` | L/kWh | données fournisseurs + extrapolation |
| `dry_risk` | `low`, `med`, `high`, `extreme` | `country_drought_risk.csv`, colonnes `Area`, `drought_risk_level` ; label WRI Aqueduct (§7) |

### Constantes internes (§3bis.3)

| Constante | Valeur |
|---|---:|
| `BATCH_SIZE` | 64 |
| `GPU_INSTALLED_PER_SERVER` | 8 |
| `SERVER_POWER_WITHOUT_GPU_W` | 1200 |
| `GPU_MEMORY_GB` | 80 |
| `QUANTIZATION_BITS` | 16 |
| `MEMORY_OVERHEAD` | 1.2 |
| `ENERGY_ALPHA` | 1.17e-6 |
| `ENERGY_BETA` | -1.12e-2 |
| `ENERGY_GAMMA` | 4.05e-5 |
| `LATENCY_ALPHA` | 6.78e-4 |
| `LATENCY_BETA` | 3.12e-4 |
| `LATENCY_GAMMA` | 1.94e-2 |

Ces paramètres sont internes, non modifiables par l'utilisateur (§3bis.2). Le PUE Ecologits générique 1.20 est explicitement exclu, remplacé par le PUE pays/fournisseur.

### Énergie et conversions (§3bis.4, §3ter, §3–7)

```text
memory_gb = MEMORY_OVERHEAD × P_tot × QUANTIZATION_BITS / 8
gpu_count = ceil(memory_gb / GPU_MEMORY_GB)
gpu_e = ENERGY_ALPHA × exp(ENERGY_BETA × BATCH_SIZE) × P_act + ENERGY_GAMMA
latency_s = LATENCY_ALPHA × P_act + LATENCY_BETA × BATCH_SIZE + LATENCY_GAMMA
server_e = latency_s × (SERVER_POWER_WITHOUT_GPU_W / 3600)
           × (gpu_count / GPU_INSTALLED_PER_SERVER) / BATCH_SIZE
r_out = gpu_e + server_e                                      [Wh/token]
κ_in = prix_input / prix_output
κ_cache = prix_input_en_cache / prix_input
r_in = κ_in × r_out                                          [Wh/token]
r_cache = κ_cache × r_in                                     [Wh/token]
nrj_compute(i) = new_input(i) × r_in + history(i) × r_cache + output(i) × r_out
nrj_request(i) = nrj_compute(i) × PUE(pays, fournisseur)       [Wh]
co2_request(i) = nrj_request(i) / 1000 × EF(pays)             [gCO2e]
water_request(i) = nrj_request(i) / 1000 × WUE(pays, fournisseur) [L]
dry_risk_request(i) = lookup dry_risk(pays, fournisseur)      [catégorie]
```

Affichage alternatif possible : Wh/1000 → kWh ; gCO2e/1000 → kgCO2e (§4–5). Pas de précision ni règle d'arrondi spécifiée.

`P_tot` n'intervient que via la mémoire et `gpu_count` ; `P_act` intervient dans énergie GPU et latence. Tous les experts MoE sont supposés chargés en mémoire (§3bis.4a).

La forme affine indicative (§3bis.5), à `gpu_count = n` fixé, est `r_out = C(n) + S(n) × P_act`, avec `K = (1200/3600)/64/8 ≈ 6.5104e-4`, `C(n) ≈ 4.0500e-5 + 2.5630e-5 × n`, `S(n) ≈ 5.7135e-7 + 4.4141e-7 × n`. Elle sert à la documentation et aux tests ; **implémenter les formules successives exactes, pas les coefficients arrondis**.

### Conversation optionnelle (§2, §8)

```text
new_input(i) = T(user_message(i))
history(1) = T(system_prompt)
history(i>1) = T(system_prompt)
             + Σ[j=1..i-1](T(user_message(j)) + T(reasoning(j)) + T(completion(j)))
output(i) = T(reasoning(i)) + T(completion(i))
nrj_total = Σ nrj_request(i)
co2_total = Σ co2_request(i)
water_total = Σ water_request(i)
```

Le prompt système est assimilé au cache dès le premier bloc. L'historique suppose **100 % de cache hit**, même si le fonctionnement réel diffère (§2, §10.3).

## Hypothèses méthodologiques et exclusions

- Raisonnement et complétion partagent un taux énergétique unique ; le surcoût lié à l'augmentation du KV cache pendant génération n'est pas modélisé (§10.1).
- Taille active des modèles fermés estimée par régression sur les modèles ouverts (§10.2).
- Historique entièrement en cache ; expirations, premier appel sans cache et changements de paramètres non modélisés (§10.3).
- Eau **on-site uniquement** ; eau liée à la production électrique exclue. Ajout possible en V2 si données disponibles (§6, §10.4).
- Hypothèses fixes de mémoire, quantification, GPU et batch 64 ; batch réel variable non modélisé (§10.6–7).
- TPS/TTFT déterministes selon constantes ; aucune mesure par requête (§3bis.1).
- Scope 3 et amortissement fabrication GPU/serveurs exclus ; avertissement UI obligatoire (§10.8).
- Les prix servent de proxy énergétique par décision finale, et non de modèle physique du prefill (§3ter.2).

## Ambiguïtés, incohérences et lacunes explicites à instruire

1. **Ratios tarifaires :** aucune règle pour tarif absent, input/output nul, cache non proposé, devise/unité différentes, plusieurs offres tarifaires ou changement de prix. Fréquence de calibration, responsabilité et source tarifaire exacte par fournisseur non fixées.
2. **Données géographiques :** `dry_risk(pays, fournisseur)` annoncé, mais CSV décrit au niveau pays seulement. Pas de règle de résolution fournisseur→datacenter/pays, datacenters multiples ou facteur manquant ; méthode d'extrapolation PUE/WUE non précisée.
3. **Domaine de validité et données invalides :** aucune borne de tokens ou paramètres, politique pour valeurs négatives/fractionnaires/manquantes, tailles incohérentes (`P_act > P_tot`), modèle inconnu, ni traitement d'erreur.
4. **Optionnels :** import conversation et agrégation sont explicitement optionnels, sans décision d'inclusion. Format conversation, disponibilité du raisonnement caché et découpage des tours non définis.
5. **Références internes invalides :** renvois à §0.1 et §11, absents du document (dernier §10).
6. **Forme affine :** assertion « continue et croissante par morceaux en `P_act`, avec des sauts » imprécise : `gpu_count` dépend de `P_tot`, pas directement de `P_act`. La formulation ne doit pas devenir un invariant de monotonie sans préciser les paramètres variables.
7. **Provenance des ratios :** tableau §1 évoque rendement prefill/physique, alors que §3ter.2 explicite une décision finale strictement tarifaire ; retenir la décision finale et harmoniser les formulations.
8. **Fiabilité perçue :** aucun intervalle d'incertitude ni seuil d'exactitude ; les nombreuses hypothèses sont documentées, mais seule l'exclusion Scope 3 impose explicitement une mention UI.
9. **Produit :** public, finalité décisionnelle, support, parcours, métriques et contre-métriques, performance, accessibilité, confidentialité et conditions de lancement ne sont pas définis.

## Préoccupations à porter dans le PRD

Fidélité des résultats aux unités et à l'ordre de calcul ; transparence sur l'empreinte d'usage et hypothèses ; traçabilité et actualisation des ratios ; complétude et cohérence des données modèles/fournisseurs/pays ; traitement des entrées ou référentiels incomplets ; cadrage explicite des fonctions optionnelles. Ces préoccupations découlent de la source ; leurs solutions produit restent à décider.
