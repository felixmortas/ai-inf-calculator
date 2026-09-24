---
title: 'Rafraîchir les commandes et l’ordre du parcours UI'
type: 'feature'
created: '2026-09-24'
status: 'done'
route: 'dispatch'
baseline_commit: 'c72a1e03a95264e556e92b894288ef1b1ae3f630'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-ao-env-impact-calculator-2026-09-23/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les commandes principales du parcours sont souvent de longs boutons textuels et l’ordre de lecture de la conversation ne correspond plus au flux souhaité : les résultats et paramètres sont éloignés des actions qui les concernent.

**Approach:** Employer des commandes iconographiques accessibles pour les navigations et actions compactes, organiser le fil autour du dernier échange puis de ses actions, du bilan et enfin de la référence choisie, sans modifier les règles de calcul, d’import ni la persistance locale.

## Boundaries & Constraints

**Always:** Conserver des noms accessibles explicites pour chaque commande icône, une cible tactile/clavier d’au moins 44 px, le focus visible, `aria-expanded` et `aria-controls` des replis. Les chevrons tournent entre états ouvert et fermé, avec respect de `prefers-reduced-motion`. Les icônes maison, flèches, plus, crayon et croix sont rendues dans le code sans nouvelle dépendance. L’entrée dans le fil fait défiler automatiquement au bas de la page sans animation forcée et sans empêcher la gestion de focus existante. Le résumé d’import reste annoncé avant son titre ; la confirmation de remplacement d’import reste inchangée. Les estimations par échange, même replié, ne montrent que carbone et eau sous forme `🪨 valeur unité` et `💧 valeur unité`.

**Never:** Ne pas changer les calculs, le reducer, l’import distant, les textes conservés, le consentement de remplacement d’import, ni supprimer définitivement le code de recalcul de total ou de confirmation de suppression : leurs contrôles doivent seulement disparaître du parcours actif. Ne pas cacher une commande uniquement au survol ni dépendre du pictogramme pour son nom accessible.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Parcours compact | Accueil, import, sélection ou fil | Les commandes demandées sont des icônes étiquetées ; les retours maison/flèche mènent à l’étape actuelle prévue. | Les libellés accessibles préservent l’usage clavier et lecteur d’écran. |
| Import prévisualisé | Analyse Mistral réussie | Un séparateur suit « Analyser le lien » ; le résumé est répété juste avant « Prévisualisation », et remplacer reste en bas. | Les avertissements, dialogues et focus de l’import restent fonctionnels. |
| Fil avec échanges calculés | Échange replié et bilan calculé | Impact compact sous son en-tête, actions après le dernier échange, bilan/conseils puis référence en bas. | Un résultat périmé ou absent conserve ses messages et actions existants. |
| Suppression directe | Clic sur la croix d’un échange | L’échange est supprimé sans dialogue ; le focus est rendu à l’échange voisin ou à l’ajout. | Les protections de suppression et leur code restent isolés pour un retour ultérieur. |
</frozen-after-approval>

## Code Map

- `src/ui/App.tsx` -- machine des étapes, titres/focus, boutons accueil/retour, référence du fil et fonctions de calcul à conserver.
- `src/ui/ConversationImport.tsx` -- analyse, prévisualisation, résumé et action de remplacement ; préserver les portails de consentement et de confirmation.
- `src/ui/ConversationConfiguration.tsx` -- contrôle `<details>` des paramètres avancés et son état ouvert.
- `src/ui/ConversationBlocks.tsx` -- en-tête/actions du fil, cartes, estimation, suppression, bilan et bonnes pratiques.
- `src/ui/styles.css` -- grille responsive, contrôles, chevrons et media query de mouvement réduit.
- `src/i18n/fr.ts` -- noms accessibles et libellés conservés/ajustés des nouvelles commandes.
- `src/ui/AppFlow.test.tsx`, `src/ui/ConversationImport.test.tsx`, `src/ui/ConversationConfiguration.test.tsx`, `src/ui/ConversationBlocks.test.tsx`, `src/ui/styles.test.ts` -- attentes d’ordre, focus, ARIA et contenu visuel à mettre à jour ou compléter.

## Tasks & Acceptance

**Execution:**

- [x] `src/ui/App.tsx`, `src/i18n/fr.ts` -- remplacer les commandes d’accueil et de retour par les icônes demandées, déplacer la référence sous le fil, ajouter le défilement à l’entrée du fil et conserver les fonctions de recalcul sans bouton rendu.
- [x] `src/ui/ConversationImport.tsx`, `src/ui/styles.css` -- séparer analyse/prévisualisation et répéter le résumé juste avant le titre sans déplacer l’action finale.
- [x] `src/ui/ConversationConfiguration.tsx`, `src/ui/styles.css` -- rendre le déclencheur avancé nettement cliquable avec chevron rotatif lié à l’état natif `<details>`.
- [x] `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` -- restructurer les cartes, actions, bilan et référence selon l’ordre demandé ; substituer les contrôles par icônes, rendre la suppression immédiate tout en conservant son ancien code non appelé.
- [x] `src/ui/*.test.tsx`, `src/ui/styles.test.ts` -- vérifier les libellés accessibles, l’ordre DOM, les états ARIA/chevrons, suppression directe, estimation compacte et non-régression import/focus.

**Acceptance Criteria:**

- Given l’accueil, when je choisis import ou saisie, then chaque carte possède une flèche droite iconographique avec nom accessible correspondant à son parcours.
- Given les pages import et fil, when je reviens à l’accueil, then une maison juste sous le titre assure ce retour ; given le sélecteur, then une flèche gauche sous son titre retourne à l’étape d’origine.
- Given la prévisualisation est prête, when je la lis, then le séparateur, le résumé répété et le titre précèdent les échanges, tandis que « Remplacer les échanges par l’import » reste après eux.
- Given un menu avancé ou un échange est ouvert puis fermé, when je bascule son contrôle, then son chevron visible change d’orientation, ses attributs ARIA restent exacts et son libellé accessible décrit l’action.
- Given j’arrive dans le fil, when la vue est rendue, then la page est positionnée au bas du fil ; les actions Ajouter/Calculer toute la conversation suivent le dernier échange, le bilan/conseils les suit, puis la référence fournisseur-modèle clôt la page.
- Given un échange calculé est replié, when je consulte son en-tête, then je vois immédiatement seulement `🪨` carbone et `💧` eau avec leurs valeurs et unités ; given la croix, when je l’active, then l’échange disparaît sans popup et le focus reste utile.
- Given un bilan actuel, when je consulte le fil, then il n’expose plus « Recalculer le total » ni « Ajuster les hypothèses », et l’édition fournisseur/modèle est un crayon à droite de la référence.

## Implementation Notes

- Les actions icône gardent leur nom accessible via `aria-label`; les contrôles ont une zone de 44 px minimum.
- Le fil défile au bas uniquement lorsque son contenu dépasse la fenêtre. Les métriques d’échange restent visibles au-dessus du contenu, y compris repliées, et n’affichent que carbone et eau.
- La fonction `recalculateSummary` et le panneau de confirmation de suppression demeurent présents dans le code, mais ne sont plus joignables depuis l’interface.
- Vérification finale: `npm run lint` réussi ; `npm test -- --run` réussi (25 fichiers, 227 tests) ; `git diff --check` sans erreur. Les commandes d’échange restent alignées sur une ligne étroite.

## Spec Change Log

## Review Triage Log

- false — La feuille définit bien une règle `prefers-reduced-motion` qui réduit les transitions, donc les chevrons respectent le réglage système.
- false — Le paragraphe `.exchange-status` garde `role="status"` et annonce le changement vers « Estimation à jour » quand le calcul se termine.
- false — La règle générique `button` fixe `min-height: 2.75rem` ; `.icon-button` fixe aussi la largeur à 2.75 rem, soit la cible 44 × 44 px requise.
- false — Le résumé primaire de prévisualisation conserve `role="status"`; la copie visuelle ajoutée près du titre n’a pas besoin d’une seconde annonce identique.
- false — L’effet de l’étape fil lit la hauteur du document après le rendu React, puis transmet cette hauteur à `scrollTo`; les échanges importés sont déjà dans le même rendu.
- patch — L’état ouvert du chevron avancé était couvert par ARIA mais pas vérifié pour sa règle de rotation ; `ConversationConfiguration.test.tsx` et `styles.test.ts` couvrent désormais état et rotation.
- false — Les notes retirées concernent le résumé par échange, qui doit désormais afficher uniquement carbone et eau ; les limites et replis restent décrits dans le bilan.
- low — Le séparateur était affiché même sans prévisualisation ; il est maintenant conditionné à `preview`, ce qui le place uniquement entre l’action d’analyse et le contenu prêt.
- patch — Les tests ne verrouillaient pas l’ordre cartes → actions → bilan → référence ; un contrôle d’ordre DOM a été ajouté dans `AppFlow.test.tsx`.
- patch — Le test d’import vérifiait le nombre de résumés, sans leur voisinage avec le titre ; il vérifie maintenant que la copie répétée précède immédiatement le titre après l’annonce initiale.
- false — La focalisation du titre à l’entrée est l’annonce de changement d’étape prévue dans `EXPERIENCE.md`; le défilement demandé place ensuite le fil en bas et le parcours clavier conserve son ordre DOM.

## Design Notes

Les pictogrammes remplacent le texte visible seulement quand leur fonction est déjà établie par leur emplacement ; leur `aria-label` conserve donc le verbe précis du contrôle précédent. La hiérarchie visuelle suit le parcours de lecture : contenu, actions, bilan, contexte de configuration.

## Verification

**Commands:**

- `npm test -- --run` -- attendu : toutes les suites UI, domaine et application réussissent.
- `npm run lint` -- attendu : TypeScript/ESLint sans erreur.
