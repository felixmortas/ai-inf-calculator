---
title: 'Consulter la méthodologie depuis le calculateur'
type: 'feature'
created: '2026-10-06'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les personnes qui utilisent le calculateur ne disposent pas d’un accès direct à la méthodologie qui explique ses estimations.

**Approach:** Ajouter une vue méthodologique accessible depuis le bouton « ? » présent dans l’en-tête commun du calculateur. Son contenu est compilé depuis `docs/methodologie-empreinte-inference-llm.md` à chaque build, qui reste l’unique source de vérité.

</frozen-after-approval>

## Implementation Notes

L’application React pilote déjà ses écrans sans routeur dans `src/ui/App.tsx`; l’en-tête global y est commun aux étapes. Les textes d’interface sont centralisés dans `src/i18n/fr.ts` et les styles dans `src/ui/styles.css`. Le script `npm run build` est la commande déjà appelée par `.github/workflows/deploy.yml`; intégrer la génération du contenu à cette commande suffit pour le déploiement. La source Markdown contient notamment tableaux, liens et blocs de code : le rendu doit préserver ces structures et afficher le texte comme contenu, sans l’interpréter comme HTML actif.

Implémentation : `vite.config.ts` compile le document en module HTML avec `marked` au build ; les blocs HTML bruts du Markdown sont échappés, et les titres sont décalés dans la hiérarchie de la page. `App.tsx` ajoute l’accès d’aide et conserve l’écran précédent monté pendant la consultation afin de préserver les saisies locales ; `Methodology.tsx`, `fr.ts` et `styles.css` composent la vue accessible et responsive. `npm run build` bloque sur une erreur TS6133 préexistante dans `src/ui/ConversationBlocks.tsx` (`hostingCountryOptions` inutilisé) ; `npx vite build` confirme que l’étape Vite compile et embarque le contenu.

Le test de parcours existant sélectionnait initialement tous les boutons de la page ; il inclut maintenant seulement les actions de la région des deux voies, afin de continuer à vérifier leur ordre malgré le bouton d’aide global. Le cas ciblé réussit et vérifie aussi le focus sur chaque étape.

## Review Triage Log

- medium — Le titre de méthodologie partageait `id="step-title"` avec le titre de l’écran précédent masqué ; un identifiant propre `methodology-title` résout le nom accessible de la section.
- medium — Le rendu `marked` autorisait le HTML brut dans le Markdown injecté ; le renderer l’échappe avant insertion dans le DOM.
- low — Le titre de niveau 1 du document créait un second titre principal sous celui du calculateur ; les titres importés sont décalés de deux niveaux pour rester sous le titre de la vue.
