---
title: 'Rendre le dernier échange importé pliable'
type: 'feature'
created: '2026-09-24'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le dernier échange du fil reste toujours ouvert, alors que les échanges d'une conversation importée sont repliés. Il ne peut donc pas être parcouru sous la même forme compacte que les autres.

**Approach:** Rendre le dernier échange repliable avec le même contrôle accessible que les autres et le laisser replié par défaut après un import. Lorsqu'un échange est ajouté manuellement, conserver l'édition immédiate en l'ouvrant.

</frozen-after-approval>

## Implementation Notes

- `src/ui/ConversationBlocks.tsx` force actuellement l'expansion avec `isLatest || expandedBlocks.has(...)` et omet le bouton de repli du dernier bloc. L'état `expandedBlocks` démarre vide; `addBlock` peut explicitement y placer le nouveau bloc pour préserver la saisie immédiate.
- Les imports passent par `blocksReplaced` et fournissent une nouvelle liste de blocs. S'assurer que le remplacement replie aussi le dernier bloc; les blocs remplacés ne doivent pas hériter d'un état d'expansion obsolète par identifiant.
- Conserver les libellés français et l'association `aria-expanded` / `aria-controls` déjà utilisés par le bouton existant.
- Implémentation : tous les blocs utilisent le bouton de pliage existant; l'ajout manuel ouvre le nouvel échange et la suppression retire son identifiant de l'ensemble des blocs ouverts.
- Implémentation : `ConversationState.blocksReplacementRevision` signale explicitement les remplacements; `ConversationBlocks` vide les expansions dans un `useLayoutEffect`, avant l'affichage de l'import. Cela évite de confondre un import avec une édition ou un ajout et évite une ouverture transitoire d'identifiants réutilisés.
- Implémentation : les confirmations et avis de source propres aux blocs sont nettoyés au remplacement. Les lectures de fichier démarrées avant le remplacement sont invalidées et ne peuvent pas attacher leur résultat au fil importé.
- Fichiers modifiés : `src/ui/ConversationBlocks.tsx` et `src/application/conversationReducer.ts`. Vérification effectuée : `git diff --check` sans erreur. Aucun test n'a été lancé.

## Review Triage Log

- medium — La première détection du remplacement par forme de liste aurait aussi replié un bloc après édition/source et aurait pu conserver un bloc ouvert lors d'un import ressemblant à un ajout; remplacée par le signal explicite `blocksReplacementRevision`.
- medium — Un remplacement réutilisant les identifiants pouvait conserver confirmation/erreur locale et laisser aboutir une lecture de fichier démarrée dans l'ancien fil; états nettoyés et lectures invalidées par révision.
- medium (defer) — Les tests UI actuels ne vérifient pas le repli après remplacement, la suppression des états transitoires ni l'ouverture d'un échange manuel; couverture consignée dans `deferred-work.md`.
- medium (defer) — Aucun test ne remplace la conversation pendant une lecture locale en attente et ne vérifie l'absence de `sourceAdded`; couverture consignée dans `deferred-work.md`.
