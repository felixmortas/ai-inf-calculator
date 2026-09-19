---
title: 'Remédier à la confirmation d’import avec sources locales'
type: 'bugfix'
created: '2026-09-19'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’import peut remplacer sans confirmation une session qui ne contient que des sources locales, bien que celles-ci contribuent au calcul et constituent du contenu existant.

**Approach:** Exporter depuis le domaine la règle commune qui détermine qu’un bloc possède des sources non blanches, l’employer dans le reducer et l’UI d’import, puis verrouiller le parcours d’annulation par un test.
</frozen-after-approval>

## Implementation Notes

- Ajout de `hasConversationBlockContent` dans le domaine : la règle couvre les quatre champs éditables et les sources dont le texte n’est pas blanc.
- Le reducer, l’historique et l’interface d’import réemploient ce prédicat ; un test UI verrouille la confirmation suivie d’une annulation pour un bloc à sources seules.
- La rétrospective de l’épic est mise à jour avec le verdict accepté et les preuves de remédiation.
- Vérifications réussies : 47 tests ciblés, `npm run lint`, `npm run build` et `git diff --check`.

## Review Triage Log

- medium — L’import de `conversationHistory` avait été ajouté après les déclarations exécutables ; déplacé en tête de module pour conserver les dépendances visibles.
- medium — Le test UI ne vérifiait pas le retour au contrôle de remplacement après annulation ; il vérifie désormais la fermeture du dialogue et sa réouverture possible.
- medium — La rétrospective restait sur un verdict rejeté après la correction ; elle documente désormais la remédiation, ses preuves et le verdict accepté.
