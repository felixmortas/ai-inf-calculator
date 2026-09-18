---
title: 'Story 2.2 — Reconstituer l’historique et les versions d’artifact'
type: 'feature'
created: '2026-09-18'
status: 'in-progress'
route: 'dispatch'
baseline_commit: '3e920727f3edef5d0ba7288f58293185b47204d1'
review_loop_iteration: 2
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les tokens d’un bloc sont disponibles localement, mais le calcul futur ne sait pas encore distinguer les textes nouveaux du contexte antérieur ni éviter de recompter les versions déjà connues d’un artifact. Sans cette reconstruction, l’estimation d’un échange ne représente pas fidèlement la conversation réelle.

**Approach:** Ajouter un domaine pur qui prépare, pour un bloc ciblé, l’historique textuel antérieur, le volume unique de prompt système injecté et la contribution de l’artifact courant par rapport à sa dernière version complète connue. La story ne déclenche aucun comptage ni calcul d’impact.

## Boundaries & Constraints

**Always:** Respecter l’ordre des blocs. Exclure entièrement le bloc courant de son historique et ignorer les blocs dont les quatre champs sont vides après `trim()`. L’historique antérieur contient seulement messages, raisonnements visibles et réponses finales bruts; il n’infère aucun raisonnement caché. Inclure au plus une dernière version complète d’artifact non vide antérieure, sans jamais cumuler ses anciennes versions ou diffs. Exposer une seule fois le volume de prompt système cache reçu en paramètre — y compris au premier bloc — sans importer de catalogue concret ni exposer de texte de prompt. Un artifact vide conserve la référence antérieure; le premier artifact non vide est complet; un artifact identique contribue une sortie vide. Comparer les artifacts par mots : un passage ajouté ou modifié fournit ses mots de la nouvelle version; une suppression seule ne fournit aucune sortie. Le domaine reste déterministe, immuable et indépendant de React, Worker et tokenisation asynchrone.

**Never:** Ne pas modifier l’UI, le reducer, le client/Worker de tokenisation, le catalogue de modèles ni la configuration Vite. Ne pas compter de tokens, lancer de calcul, persister ou transmettre les textes. Ne pas faire participer les artifacts aux messages d’historique, hormis l’unique dernière version complète retournée séparément.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Premier bloc renseigné | Index 0, sans artifact antérieur | Aucun texte antérieur; prompt cache présent une fois; artifact courant non vide complet en sortie | Les champs vides restent des chaînes vides |
| Bloc ultérieur | Blocs antérieurs renseignés, courant exclu | Messages, raisonnements et réponses antérieurs dans l’ordre; une seule dernière version artifact non vide | Les blocs entièrement blancs sont ignorés |
| Artifact identique ou vide | Référence antérieure non vide | Sortie artifact vide; la référence reste la dernière version non vide | Aucun retrait ni cumul de version |
| Nouvelle version | Artifact courant différent | Seulement les passages ajoutés ou modifiés de la nouvelle version sont retournés | Les suppressions seules n’ajoutent aucune sortie |
</frozen-after-approval>

## Code Map

- `src/domain/conversationHistory.ts` -- nouveau module pur recevant une projection de bloc et le volume de prompt système; reconstruit le contexte et la contribution artifact sans import applicatif, avec un diff de mots déterministe en temps et mémoire linéaires.
- `src/domain/conversationHistory.test.ts` -- nouveaux scénarios déterministes couvrant les règles d’historique, de référence artifact et de diff.
- `src/application/conversationReducer.ts` -- fournit la forme actuelle `ConversationBlock` et `isIgnoredConversationBlock`; ne pas l’importer depuis le domaine afin de préserver les couches.
- `src/domain/tokenization.ts` -- conserve les contrats de textes et le comptage; ne pas y ajouter l’orchestration historique ni appeler le Worker.
- `src/domain/tokenization.test.ts` -- montre la convention Vitest des règles de domaine pures à reprendre dans le nouveau test.

## Tasks & Acceptance

**Execution:**

- [x] `src/domain/conversationHistory.ts` -- définir une projection de bloc indépendante de l’application et une préparation déterministe par index ou identifiant, avec validation du volume cache injecté -- rendre le contexte utilisable par la future story de calcul sans accéder au catalogue.
- [x] `src/domain/conversationHistory.ts` -- implémenter la recherche de la dernière version artifact non vide, l’exclusion du bloc courant et le diff déterministe par mots en temps et mémoire linéaires -- empêcher le double comptage sans geler ou épuiser le navigateur.
- [x] `src/domain/conversationHistory.test.ts` -- couvrir premier échange, historique antérieur, bloc blanc, prompt unique, artifact initial/modifié/identique/vide, suppressions, répétitions et non-cumul des versions -- verrouiller les invariants sans React ni Worker.

**Acceptance Criteria:**

- Given un bloc renseigné à l’index `i`, when son contexte est préparé, then seuls les messages, raisonnements visibles et réponses finales des blocs antérieurs renseignés sont retournés dans l’ordre, jamais les textes du bloc courant.
- Given un nombre de tokens de prompt système fourni par appelant, when un bloc est préparé, then ce nombre est présent une seule fois dans sa part cache, y compris pour le premier bloc, sans dépendance au catalogue concret.
- Given le premier artifact non vide puis des versions ultérieures, when la préparation est effectuée, then le premier est complet, une version différente ne retourne que les passages ajoutés ou modifiés, et une version identique retourne une sortie vide.
- Given un artifact vide ou plusieurs versions précédentes, when un bloc ultérieur est préparé, then la dernière version complète non vide est conservée seule et les versions/diffs antérieurs ne sont jamais cumulés.
- Given les règles de reconstruction, when les tests s’exécutent, then elles sont pures, déterministes et sans import de React, Worker, catalogue ou service externe.

## Implementation Notes

## Spec Change Log

- La revue a identifié que le LCS matriciel prévu implicitement par le diff déterministe pouvait allouer une mémoire quadratique pour de longs artifacts. La spécification impose désormais une mémoire linéaire; cela évite le gel ou l’épuisement mémoire du navigateur. **KEEP:** conserver le domaine pur, les textes historiques bruts, le prompt opaque injecté et le comportement de diff par mots retenu par l’utilisateur.
- La seconde revue a confirmé que Hirschberg gardait un temps quadratique malgré sa mémoire linéaire. Le diff doit désormais rapprocher les occurrences de mots de façon déterministe en temps et mémoire linéaires; cela évite encore le gel du navigateur sur de longs artifacts. **KEEP:** conserver le texte complet du premier artifact, les suppressions sans contribution, l’ignorance complète d’un bloc vide et les tests de la préparation publique.

## Review Triage Log

- patch — `systemPromptCacheTokens` acceptait une valeur fractionnaire; un volume de tokens doit être entier. La validation et son test seront ajoutés.
- patch — Un bloc cible entièrement vide conservait le prompt système et pouvait donc contribuer à un impact. Il doit produire une préparation sans contribution.
- false — Le diff par mots normalise les séparateurs de l’artifact, mais la fonction retourne explicitement une contribution en mots; les historiques eux-mêmes conservent leurs textes bruts. Le contrat ne promet pas de préserver la mise en forme d’un passage de diff.
- medium — La table LCS allouait `O(m*n)` cellules pour deux artifacts. Ce cas peut épuiser la mémoire du navigateur sur un artifact long; la règle de mémoire linéaire est ajoutée à la spécification et impose une ré-implémentation.
- false — Un bloc partiellement renseigné conserve ses champs bruts, y compris blancs; seuls les quatre champs blancs rendent le bloc ignoré. Filtrer chaque champ contredirait le contrat de texte brut et les règles de tokenisation existantes.
- low — L’API par `blockId` choisit la première occurrence dupliquée, mais les identifiants sont générés et rendus uniques par le reducer existant; cet état invalide n’est pas atteignable dans le parcours quotidien. La garde supplémentaire est rejetée.
- patch — Le contrôle de volume fractionnaire de l’edge-case hunter recoupe la première entrée; même verdict, même correction et test.
- low — Le contrôle d’identifiant `blockId` dupliqué recoupe le cas déjà rejeté : l’invariant applicatif garantit l’unicité avant l’entrée dans ce domaine.
- medium — Le risque de mémoire quadratique du diff recoupe la quatrième entrée; même cause et même changement de spécification.
- patch — Les tests n’exerçaient pas le point d’entrée `prepareConversationHistory` avec un artifact précédent et un artifact courant modifié ou identique. Des assertions d’intégration seront ajoutées.
- patch — Les tests ne verrouillaient pas la conservation d’espaces significatifs dans les champs historiques renseignés. Des assertions exactes sur ces valeurs seront ajoutées.
- patch — `artifactWordDiff` pouvait renvoyer un artifact uniquement blanc quand il était appelé directement. Le helper et son test doivent traiter `trim() === ''` comme vide.
- medium — Hirschberg utilisait une mémoire linéaire mais restait en temps `O(m*n)`, donc pouvait encore geler le navigateur pour deux artifacts longs. La stratégie du diff est précisée puis réimplémentée.
- low — Une cible inconnue retournait la même préparation vide qu’un bloc ignoré, mais l’appelant applicatif fournit un identifiant stable issu du reducer; une garde supplémentaire n’est pas justifiée dans ce domaine pur.
- patch — L’égalité artifact n’était pas vérifiée via `prepareConversationHistory`. Le test doit exercer la référence précédente et la contribution vide à travers l’entrée publique.
- patch — Le maintien d’une référence après un artifact courant vide n’était pas verrouillé. Un test doit viser un bloc ultérieur après une version non vide puis un artifact vide.
- patch — Les répétitions et égalités de choix du diff n’étaient pas testées. Des tests doivent fixer la règle déterministe de rapprochement des occurrences.
- patch — Un bloc antérieur partiellement renseigné n’avait pas de test conservant ses entrées vides brutes dans les trois catégories. Le test doit verrouiller cette forme de sortie.

## Design Notes

Le domaine retournera des textes bruts, sans les concaténer ni les tokeniser : la story 2.3 pourra appliquer le même tokenizer local aux catégories adaptées. La référence artifact est une valeur dérivée des blocs strictement précédents; un artifact courant vide ne peut donc pas l’effacer. Le diff par mots rapproche les occurrences communes dans un ordre déterministe par leurs comptes disponibles, en temps et mémoire linéaires; les occurrences nouvelles de la version courante constituent la sortie.

## Verification

**Commands:**

- `npm test -- --run` -- expected: toutes les suites Vitest, dont l’historique, passent.
- `npm run lint` -- expected: TypeScript et ESLint ne signalent aucune erreur.
- `npm run build` -- expected: la production Vite compile sans changer sa base `/calculator/`.
