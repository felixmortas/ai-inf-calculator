---
title: 'Refonte DA « Canopée épurée » (audit UI/DA)'
type: 'refactor'
created: '2026-10-08'
status: 'done'
baseline_commit: '8aa1f3899c413de93022064095cfc7747fb44954'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-ai-env-impact-calculator-2026-09-23/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-ai-env-impact-calculator-2026-09-23/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'interface (fonds beiges, bordures dures, coins peu arrondis, emojis, métriques en tableau) ne suit pas le DESIGN.md révisé après l'audit UI/DA du 2026-10-08.

**Approach:** Appliquer la DA de DESIGN.md et des maquettes `mockups/*.html` (tokens, Inter, pilules, ombres douces, icônes SVG au trait, badges et cartes de données, hero douche, callout) sans modifier la disposition, les textes i18n ni les comportements.

## Boundaries & Constraints

**Always:** Tokens exacts de DESIGN.md (accent `#0B7A5E` pour texte/boutons, `#10A37F` graphique seul). Contour fin `#8A8A8A` conservé sur champs et sélecteurs. Cibles tactiles ≥ 44 px, focus `#184BB2`, `prefers-reduced-motion`, sticky bar et media queries existantes. Nom + unité toujours écrits (couleur jamais seule). Icônes `aria-hidden`.

**Ask First:** Ajout d'une dépendance (police Inter hébergée, bibliothèque d'icônes).

**Never:** Modifier textes i18n, logique/reducer, ordre ou structure des écrans, rôles/labels ARIA, classes référencées par `App.tsx` (`.result-section button`, `.thread-reference button`, `.app-shell`). Pas de dégradés, textures ni bordures grises dures sur cartes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Résultat à jour | Résumé courant | Hero douche (48 px, fond teinté), 3 cartes métriques + carte ampoule, callout bonne pratique | N/A |
| Résultat périmé / erreur | Résumé non courant, erreur | Surfaces `warning`/`error` avec libellé et icône textuelle | Libellé explicite conservé |
| Carte échange à jour | Impact courant | Badges pastel carbone et eau (icône + nom accessible + valeur + unité) | Textes accessibles inchangés |

</frozen-after-approval>

## Code Map

- `src/ui/styles.css` -- feuille unique (252 l.) : tokens `:root`, boutons, champs, cartes, résultat, langue, modale.
- `src/ui/styles.test.ts` -- teste des chaînes CSS exactes (chevrons, `.sticky-actions`, `.thread-reference button`, media queries) ; à garder vertes.
- `src/ui/ResultSection.tsx:66-100` -- hero 🚿, `<ul.metrics>`, `.good-practices`, `.result-link`, bouton partage `↗`.
- `src/ui/ConversationBlocks.tsx:189-197` -- `compact-impact` avec emojis 🪨/💧 → badges ; `🗑️` ligne 205 ; chevron `⌄`.
- `src/ui/LanguageMenu.tsx:69` -- emoji 🌐 → icône SVG globe.
- `src/ui/App.tsx:252,262` -- `Icon` « ← » → icône SVG retour.
- `src/ui/CalculationBar.tsx`, `ConversationConfiguration.tsx` -- classes `.sticky-actions`, `.field`, `.advanced-settings`, `.expert-settings`.
- `_bmad-output/planning-artifacts/ux-designs/ux-ai-env-impact-calculator-2026-09-23/mockups/` -- références visuelles (symboles SVG leaf, drop, bolt, bulb, shower, globe, back, trash, share, plus, clip).
- `index.html` -- `<title>`/police ; police Inter via pile système (pas de chargement distant).

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/Icons.tsx` -- créer composant `Icon` SVG (leaf, drop, bolt, bulb, shower, globe, back, trash, share, plus, chev) d'après les maquettes -- remplacer emojis
- [x] `src/ui/styles.css` -- réécrire : tokens, Inter/système, fond blanc, boutons pilule, champs `#F4F4F4` + contour fin, cartes `16px` + ombre, bulles, badges, hero, cartes métriques, callout, pilules de langue, barre d'action, modale -- sans casser les chaînes testées
- [x] `src/ui/ResultSection.tsx` -- hero avec icône et fond teinté ; métriques en cartes avec disque d'icône ; carte ampoule ; callout ; bouton partage avec icône
- [x] `src/ui/ConversationBlocks.tsx` -- badges carbone/eau, icône corbeille, bouton « Ajouter » en pilule avec icône
- [x] `src/ui/LanguageMenu.tsx`, `src/ui/App.tsx` -- icônes globe et retour SVG
- [x] `src/ui/*.test.*` -- adapter uniquement les assertions dépendant des emojis retirés ; ajouter un test sur tokens clés de `styles.css`

**Acceptance Criteria:**
- Given l'accueil, when affiché, then fond `#FFFFFF`, titre 36 px Inter, « Commencer » pilule `#0B7A5E` ombre douce, langue en pilule.
- Given un échange calculé, when affiché, then carbone et eau en badges pastel avec nom accessible, valeur et unité.
- Given un résultat à jour, when affiché, then la douche est l'élément le plus grand, suivie de cartes carbone/eau/électricité et du callout à bordure gauche 4 px.
- Given toute l'interface, when inspectée, then aucune bordure grise dure sur cartes, champs avec contour `#8A8A8A`, focus visible.
- Given la suite de tests, when lancée, then tests, lint et build passent.

## Design Notes

Tokens : `--accent:#0b7a5e; --brand:#10a37f; --tint:#e6f6f1; --muted:#f4f4f4; --card:0 4px 12px rgba(0,0,0,.05)`. Icônes : `stroke:currentColor; stroke-width:1.75; fill:none; linecap/linejoin:round`.

## Verification

**Commands:**
- `npm test -- --run` -- expected: tous les tests passent
- `npm run build` -- expected: build sans erreur de types

**Manual checks (if no CLI):**
- `npm run dev` : parcourir accueil → étape 1 → étape 2 → résultat à 360 px et 200 % de zoom ; comparer aux maquettes.

## Suggested Review Order

**Icônes et tokens**

- Composant `Icon` SVG au trait, remplace tous les emojis.
  [`Icons.tsx:18`](../../src/ui/Icons.tsx#L18)

- Feuille réécrite : tokens Canopée, fond blanc, pilules, cartes ombrées.
  [`styles.css:1`](../../src/ui/styles.css#L1)

**Écran résultat**

- Hero douche, cartes métriques et carte ampoule.
  [`ResultSection.tsx:72`](../../src/ui/ResultSection.tsx#L72)

- Callout bonne pratique à bordure gauche 4 px.
  [`styles.css:275`](../../src/ui/styles.css#L275)

**Échanges et navigation**

- Badges pastel carbone/eau avec nom accessible.
  [`ConversationBlocks.tsx:194`](../../src/ui/ConversationBlocks.tsx#L194)

- Icônes globe et retour SVG.
  [`LanguageMenu.tsx:64`](../../src/ui/LanguageMenu.tsx#L64)
  [`App.tsx:251`](../../src/ui/App.tsx#L251)

**Tests**

- Test des jetons clés de la feuille de style.
  [`styles.test.ts:43`](../../src/ui/styles.test.ts#L43)
