---
title: '7.1 Commencer simplement et se repérer dans le parcours'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '177989aee41c70810631096bf5d337fd6bddd3e1'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’accueil actuel empile titre, texte d’introduction répété, carte « Copier/coller » et bouton-icône ; les étapes ne sont pas numérotées, les « Retour » et la méthodologie reposent sur des icônes seules, et `fr.ts` contient des coquilles.

**Approach:** Refondre accueil, indicateur d’étapes, « Retour », lien « Méthodologie », page de méthodologie et barre d’action collante dans `App.tsx`, `fr.ts` et `styles.css`, sans toucher au reducer ni aux calculs. Les étapes actuelles « sélection » et « fil » deviennent « Étape 1/3 : Votre IA » et « Étape 2/3 : Votre conversation » ; l’étape 3 relève de 7.4.

## Boundaries & Constraints

**Always:** Textes via `fr.ts`. Toute action a un libellé visible ; icône décorative `aria-hidden`. Cibles ≥ 44 × 44 px. Les textes saisis survivent à toute navigation. Focus sur le titre à chaque changement d’étape. Respecter `prefers-reduced-motion`. États jamais par la seule couleur.

**Ask First:** Toute modification du reducer, du domaine ou des données ; tout changement de comportement de « Calculer ».

**Never:** Implémenter 7.2 (Mode avancé, pays déduit, retrait de « Appliquer »), 7.3 (retrait du calcul par bloc, bouton « Calculer » collant, libellés des champs), 7.4 ou 7.5. Ajouter un tutoriel, un bouton « ? » ou une barre de progression colorée.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Accueil | Nouvelle session | Une phrase d’introduction + « Commencer » ; ni carte, ni « ou », ni paramètre | N/A |
| Commencer | Clic sur « Commencer » | « Étape 1/3 : Votre IA » + justification, titre focalisé, introduction absente | N/A |
| Retour étape 2 | Textes saisis | « Retour » (haut gauche, au-dessus du titre) mène à l’étape 1, textes conservés | N/A |
| Méthodologie | Lien « Méthodologie » depuis n’importe quel écran | Un seul h1 ; « Retour » libellé tout en haut ; retour à l’écran d’origine | N/A |
| Barre collante | Zoom ≥ 400 %, hauteur < 30 rem ou clavier logiciel | Barre statique ; l’élément en focus n’est jamais masqué | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/App.tsx` -- états `home | selection | thread | methodology` ; en-tête (h1 + introduction + bouton « ? »), accueil, boutons-icônes de retour (`below-title`), « Valider » ; `stepTitle`, `methodologyTitle`, focus dans l’effet sur `step`.
- `src/ui/Methodology.tsx` -- h2 + bouton-icône de retour sous le titre ; le contenu rendu contient un titre de document (h1 rétrogradé en h3 par `vite.config.ts`).
- `vite.config.ts` -- plugin `methodologyContent` : décalage des titres de +2 ; point d’ajout du retrait du titre de document en tête.
- `src/i18n/fr.ts` -- textes ; coquille « entraiment » (l. 87) et « lorque » dans `introduction` ; chercher « conscis », « denrière », « promett », « et et », « A chaque » (« Echange vide » → « Échange vide »).
- `src/ui/styles.css` -- `.icon-button`, `.below-title`, `[tabindex="-1"]:focus`, media `max-width: 30rem` ; ajouter barre collante et variantes statiques.
- `src/ui/AppFlow.test.tsx`, `src/ui/styles.test.ts` -- tests existants à adapter (« Saisir un échange », « Valider », « Retour au fil »).

## Tasks & Acceptance

**Execution:**
- [x] `src/i18n/fr.ts` -- ajouter intro d’une phrase, « Commencer », « Étape 1/3 : Votre IA », « Étape 2/3 : Votre conversation », justifications, « Continuer », « Retour », « Méthodologie » ; retirer les clés devenues inutiles ; corriger les coquilles listées.
- [x] `src/ui/App.tsx` -- accueil minimal ; `<header>` sans introduction hors accueil ; lien « Méthodologie » texte sur chaque écran ; « Retour » libellé en haut à gauche au-dessus du titre (étape 2 → étape 1, textes conservés) ; barre d’action collante portant « Continuer » ; focus sur le titre à chaque étape.
- [x] `src/ui/Methodology.tsx` + `vite.config.ts` -- « Retour » en tête, un seul h1 (le titre du document Markdown n’est plus rendu).
- [x] `src/ui/styles.css` -- `.sticky-actions` (position sticky en bas), `scroll-padding-bottom` sur `html`, statique sous `@media (max-height: 30rem)`, `(min-resolution)`/zoom via largeur ≤ 20rem et `body.keyboard-open` si détectable (`visualViewport`) ; style lien « Méthodologie » et « Retour » (44 × 44 px).
- [x] `src/ui/AppFlow.test.tsx`, `src/ui/styles.test.ts` -- tests des cinq scénarios de la matrice, conservation des textes au retour, focus, absence de « ? » et d’icône seule, absence des coquilles.

**Acceptance Criteria:**
- Given une nouvelle session, when la page s’ouvre, then seuls une phrase et « Commencer » sont proposés, et l’introduction disparaît ensuite.
- Given l’étape 2/3, when « Retour » est activé, then l’étape 1/3 s’affiche avec les textes intacts.
- Given tout écran, when il est affiché, then un lien « Méthodologie » existe et la page de méthodologie a un « Retour » libellé au-dessus d’un seul titre principal.
- Given la barre collante, when le zoom, la hauteur ou le clavier logiciel la rendent gênante, then elle est statique et le focus n’est jamais masqué.

## Spec Change Log

## Design Notes

L’indicateur est le titre focalisé lui-même (`<h2>Étape 1/3 : Votre IA</h2>`) suivi d’un `<p>` de justification : le texte porte l’état, aucune barre de progression. La barre collante de 7.1 ne porte que « Continuer » ; 7.3 y placera « Calculer ».

## Verification

**Commands:**
- `npm test -- --run` -- expected: tous les tests passent
- `npx tsc -b --noEmit` -- expected: aucune erreur
- `npm run build` -- expected: build réussi

**Manual checks (if no CLI):**
- Parcourir accueil → étape 1 → étape 2 → Retour → Méthodologie au clavier, à 320 px et en zoom 400 %.

## Suggested Review Order

**Parcours et navigation**

- Accueil minimal, « Retour » libellé et étapes numérotées.
  [`App.tsx:244`](../../src/ui/App.tsx#L244)

- « Retour » de l’étape 2 mène à l’étape 1 sans toucher aux textes.
  [`App.tsx:248`](../../src/ui/App.tsx#L248)

- Barre d’action collante portant « Continuer ».
  [`App.tsx:252`](../../src/ui/App.tsx#L252)

- Détection du clavier logiciel via `visualViewport`.
  [`App.tsx:91`](../../src/ui/App.tsx#L91)

**Méthodologie**

- Un seul h1 et « Retour » en tête.
  [`Methodology.tsx:11`](../../src/ui/Methodology.tsx#L11)

- Titre de document Markdown retiré pour éviter le doublon.
  [`vite.config.ts:22`](../../vite.config.ts#L22)

**Textes et styles**

- Nouveaux libellés et coquilles corrigées.
  [`fr.ts:4`](../../src/i18n/fr.ts#L4)

- Barre collante statique en hauteur réduite, petit écran ou clavier ouvert.
  [`styles.css:28`](../../src/ui/styles.css#L28)

**Tests**

- Parcours, retour, méthodologie et absence de « ? ».
  [`AppFlow.test.tsx:38`](../../src/ui/AppFlow.test.tsx#L38)
