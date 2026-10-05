---
title: 'Régression des paramètres actifs des modèles MoE'
type: 'feature'
created: '2026-10-05'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le fichier `data/raw/moe_models_params.csv` réunit 59 modèles MoE, mais ne fournit pas de fonction estimant `params_activated` à partir de `params` ni de visualisation de cette relation.

**Approach:** Comparer quelques formes de régression sur les données, retenir celle qui décrit le mieux l’évolution sans surajuster, puis fournir un script reproductible qui affiche les points, la courbe ajustée et les paramètres estimés.

</frozen-after-approval>

## Implementation Notes

- Environnement du projet: application Vite/TypeScript, mais aucune dépendance Python scientifique n’est installée; privilégier une solution exécutable avec les outils existants ou la bibliothèque standard.
- Le CSV contient 59 observations, paramètres mesurés en milliards, réparties entre sources `ikp` et `huggingface`, avec une étendue de `params` de 0,0998 à 1600.
- Script Python autonome sans dépendance externe: `data/analyze_moe_params.py`; génère `data/clean/moe_params_regression.svg` depuis le CSV brut.
- Comparaison leave-one-out: puissance 14,787; logarithmique 15,959; linéaire 16,402; quadratique 18,047 milliards RMSE. Fonction retenue: params_activated = 1,8150 × params^0,4596 (coefficients réestimés dans le script).
- Le graphique emploie un axe x logarithmique, distingue les sources par couleur et étiquette les quatre points les plus éloignés de la courbe; les infobulles donnent le détail de chaque modèle. Les données brutes restent inchangées.
- La validation leave-one-out retire une ligne à la fois; elle mesure l’erreur sur des modèles issus de ce jeu de données et non la généralisation à des familles entièrement inédites.

## Review Triage Log

- medium — Valeurs non finies acceptées par le parseur — validé et corrigé par contrôle de finitude avant ajustement.
- medium — Paramètres actifs supérieurs au total acceptés — validé et corrigé par validation `0 ≤ actifs ≤ total`.
- medium — Équations normales quadratiques sensibles à l’échelle — validé et corrigé en normalisant x avant l’ajustement polynomial.
- medium — Leave-one-out par ligne peut surestimer la généralisation à des familles jamais vues — limite vraie; la mesure est maintenant explicitement décrite comme validation au niveau des lignes, sans prétendre valider les familles inédites.
- low — Dernier repère de l’axe y pouvait dépasser le domaine du graphique — corrigé en limitant les repères à la plage tracée.
- low — Points difficiles à identifier dans un SVG statique — corrigé en étiquetant les quatre plus grands résidus, avec le nom de chaque modèle accessible en infobulle.
