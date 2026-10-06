# Contrat de calcul et données

> La source de vérité unique pour la méthode, les valeurs, leur provenance et leurs limites est [`docs/methodologie-empreinte-inference-llm.md`](../../../docs/methodologie-empreinte-inference-llm.md). Ce document en donne le résumé opérationnel ; en cas d’écart, la méthodologie prévaut. Les règles d’interface et d’agrégation propres au produit sont dans `SPEC.md` et `functional-contract.md`.

## Données et comptage

Le catalogue par modèle/fournisseur fournit `P_tot`, `P_act`, `S_tokens`, le pays de référence, `κ_in`, `κ_cache`, ainsi que les facteurs `PUE`, `EF` et `WUE` selon les méthodes et cascades de provenance définies aux §4.1–4.9. `P_tot` et `P_act` sont en milliards de paramètres. Les ratios sont datés et spécifiques au modèle/fournisseur : `κ_in = prix_input / prix_output` et `κ_cache = prix_input_en_cache / prix_input`.

La tokenisation locale utilise Tiktoken ; en cas d’échec, `T(texte) = nombre_de_mots / 0,75`, avec segmentation aux caractères non alphanumériques. Le texte vide et le raisonnement non fourni valent zéro. Pour les échanges renseignés, dans leur ordre :

```text
A_prec(i) = dernière version complète d’artifact antérieure à i (vide si aucune)
D_i = ajouts et modifications de A_i par rapport à A_prec(i)
      (A_i complet lors de la première version ; vide si aucun artifact)
new_input(i) = T(M_i)
history(i) = S_tokens + Σ[j<i](T(M_j) + T(R_j) + T(C_j)) + T(A_prec(i))
output(i) = T(R_i) + T(C_i) + T(D_i)
```

Le prompt système est au taux cache dès le premier échange. Tout l’historique est supposé en cache. Les anciennes versions d’artifact ne sont pas cumulées ; une suppression seule ne produit aucun token de sortie.

## Énergie IT par token

Les constantes et équations `r_out` de la méthode (§6.1) sont reprises sans modification. Elles ne sont pas des réglages avancés : le catalogue fournit les paramètres modèle et le calcul applique les constantes publiées. `P_tot` détermine la mémoire et le nombre de GPU ; `P_act` intervient dans les équations GPU et latence. Ne pas remultiplier l’énergie GPU par le nombre de GPU ni par `P_act`. Le PUE générique Ecologits de 1,20 est exclu.

```text
r_in = κ_in × r_out
r_cache = κ_cache × r_in
```

Les taux sont en Wh/token avant PUE. Le taux d’entrée et celui du cache sont des proxys fondés sur les rapports tarifaires, pas des mesures physiques distinctes.

## Impacts et agrégation

```text
nrj_compute(i) = new_input(i) × r_in + history(i) × r_cache + output(i) × r_out [Wh]
nrj_request(i) = nrj_compute(i) × PUE(pays_hébergement, fournisseur)             [Wh]
co2_request(i) = nrj_request(i) / 1000 × EF(pays_hébergement)                    [gCO₂e]
water_request(i) = nrj_request(i) / 1000 × WUE(pays_hébergement, fournisseur)    [L]
```

Le PUE est appliqué une seule fois ; carbone et eau réutilisent la même énergie datacenter. Agréger les résultats non arrondis des échanges à jour. Le facteur carbone de douche provient du pays utilisateur ; la méthode de douche, ses valeurs par défaut et ses formules sont définies au §8.

## Périmètre et limites

Le calcul estime l’usage d’inférence : Scope 3, entraînement, eau hors site de production électrique, réseau, terminaux, raisonnement invisible, images, audio et vidéo sont exclus. L’eau calculée est l’eau sur site selon WUE. Le résultat est un ordre de grandeur ponctuel, sans fourchette chiffrée d’incertitude. Les hypothèses sur paramètres activés, matériel, cache, localisation et ratios tarifaires ainsi que leurs limites sont celles du §9 de la méthodologie.
