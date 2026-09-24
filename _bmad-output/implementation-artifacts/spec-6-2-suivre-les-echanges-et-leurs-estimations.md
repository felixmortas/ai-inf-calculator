---
title: '6.2 — Suivre les échanges et leurs estimations'
type: 'feature'
created: '2026-09-24'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: 'a0ddd4f6ddd5e2ee641a5113d0b385d60089e5ef'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le fil affiche aujourd’hui tous les échanges comme de longs formulaires ouverts. Les résultats individuels montrent aussi des métriques réservées au bilan, et l’ajout ne place pas le focus sur la nouvelle question.

**Approach:** Faire du fil une suite chronologique de cartes compactes : les anciens échanges se replient, l’éditeur courant reste ouvert et chaque échange renseigné se calcule sur demande. Montrer près des textes seulement le carbone et l’eau estimés, ainsi que les états qui indiquent quoi faire ensuite.

## Boundaries & Constraints

**Always:** Garder les textes et résultats dans la session en mémoire, les calculs sur action explicite, les empreintes de fraîcheur et les formules existantes. Conserver question puis réponse avant raisonnement, document/code et fichiers source facultatifs. Maintenir le bilan existant sans le présenter comme actuel si un échange dépendant a changé. Rendre état, erreur et repli compréhensibles au clavier et sans couleur seule.

**Never:** Lancer un calcul au collage, à l’édition, à l’ajout ou au dépliage ; calculer un échange vide ; afficher énergie, risque de sécheresse ou équivalence douche sur une carte d’échange ; supprimer un texte ou un résultat indépendant lors d’une édition.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Comportement attendu | Erreur |
|---|---|---|---|
| Fil | Plusieurs échanges, dernier courant | Ordre stable ; anciens compacts avec aperçu, état et métriques actuelles ; dernier éditeur ouvert ; Déplier/Replier expose `aria-expanded` | — |
| Calcul local | Échange renseigné dont un précédent n’a pas de résultat | « Calculer cet échange » ne cible que celui-ci | Erreur locale, textes et focus préservés |
| Échange vide | Aucun texte utile | Calcul indisponible avec explication visible | Aucun appel de calcul |
| Mutation | Édition ou suppression d’un échange renseigné calculé | Résultats dépendants périmés avec action de recalcul ; bilan non actuel ; autres textes conservés | Aucun recalcul implicite |
| Navigation | Ajout ou suppression | Ancien échange replié et focus sur nouvelle question ; après suppression focus sur carte voisine ou Ajouter | — |
| Facteur de repli | Résultat calculé avec facteur « Monde » | Mention locale explicite près du carbone et de l’eau estimés | — |

</frozen-after-approval>

## Code Map

- `src/ui/ConversationBlocks.tsx` — tous les blocs sont des `fieldset` ouverts ; y introduire état d’ouverture, aperçu distinct de question et réponse, ordre des champs, focus et résultat individuel réduit. Le dépliage nomme le numéro et révèle édition, calcul et suppression. Réutiliser `isIgnoredConversationBlock`, `isImpactCurrent`, `isImpactFresh`, `isSummaryCurrent` et les handlers existants.
- `src/application/conversationReducer.ts` — `impactFingerprint`, `summaryFingerprint` et `currentImpact` assurent la fraîcheur ; `blockUpdated`, `sourceAdded/Removed` et `blockRemoved` préservent les résultats indépendants. N’adapter le reducer que si un cas réel échoue ; ne pas changer les formules.
- `src/ui/App.tsx` — `calculate(blockId)` orchestre déjà le calcul d’un échange et ignore les réponses obsolètes via le reducer. Préserver cette frontière ; le bilan reste alimenté séparément.
- `src/i18n/fr.ts`, `src/ui/styles.css` — libellés explicites « question » et « réponse », unités adaptées avec noms accessibles, cartes, commandes et focus ; appliquer les règles précises de `EXPERIENCE.md:53,67-69,107,116-118` et l’identité de `DESIGN.md`.
- `src/ui/ConversationBlocks.test.tsx`, `src/ui/AppFlow.test.tsx`, `src/application/conversationReducer.test.ts` — adapter les assertions d’affichage et couvrir les transitions, calcul isolé, vide et péremption ; réutiliser les preuves reducer déjà présentes.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/ConversationBlocks.tsx` — rendre les anciens échanges en cartes repliables avec deux aperçus (question et réponse si présentes), état et résultat actuel ; dépliage numéroté avec `aria-expanded`, édition et actions visibles au dépliage, dernier éditeur ouvert, focus déterministe après ajout/suppression.
- [x] `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts` — libeller question et réponse ; placer raisonnement, artifact et fichiers dans un groupe dépliable « Ajouter des contenus facultatifs » ; garder visibles sur la carte compacte les avis d’import et de fichier refusé.
- [x] `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts` — calcul individuel explicite, explication du vide, carbone et eau seuls avec mention d’estimation, unités adaptées selon `EXPERIENCE.md:116-118` et noms complets accessibles ; erreur, facteur Monde et péremption près de l’échange avec action de recalcul au dépliage.
- [x] `src/ui/ConversationBlocks.tsx` — demander une confirmation locale avant de retirer un échange contenant du texte, sans perdre les autres textes ; annulation et validation accessibles au clavier, puis focus sur une carte voisine ou Ajouter.
- [x] `src/ui/styles.css` — ajuster cartes, espace de lecture, commandes et focus aux petits écrans sans masquer les états.
- [x] `src/ui/ConversationBlocks.test.tsx`, `src/ui/AppFlow.test.tsx`, `src/application/conversationReducer.test.ts` — tester les lignes de la matrice et les détails UX précisés ci-dessus, sans dupliquer les tests déjà probants sur les empreintes.

**Acceptance Criteria:**
- Given plusieurs échanges dont un ancien calculé, when la personne consulte le fil au clavier, then elle peut déplier et replier chaque ancienne carte, connaître son état et retrouver l’éditeur courant ouvert.
- Given un échange renseigné et d’autres échanges sans résultat, when la personne calcule cet échange, then seul son résultat change et le bilan reste soumis à sa propre action explicite.
- Given un résultat actuel et une modification qui touche l’historique ou l’artifact, when le fil est rendu, then chaque résultat dépendant et le bilan sont signalés périmés sans remplacer leurs textes ni lancer de calcul.

## Implementation Notes

- Le reducer, ses empreintes et les formules sont réutilisés sans modification. Les cartes gardent le résultat près de l’échange même lorsqu’elles sont repliées ; seuls les champs d’édition sont masqués.
- Les contenus facultatifs restent visibles dans l’éditeur ouvert sous un groupe accessible. Le focus après suppression vise le dépliage d’une carte ancienne voisine, ou « Ajouter un échange » si la voisine devient l’éditeur courant.
- Audit de la matrice : `ConversationBlocks.test.tsx` couvre fil, calcul local, vide, navigation, erreur et facteur Monde ; `AppFlow.test.tsx` couvre la péremption en chaîne et le bilan ; les tests existants du reducer couvrent aussi la suppression renseignée et les empreintes.
- Vérification : suite complète de 212 tests, lint et build verts ; après les dernières assertions, 27 tests ciblés verts et `git diff --check` vert.
- Réimplémentation après la revue 1 : les six lignes de la matrice sont couvertes par les tests exécutés. Après la revue 2, les aperçus sont bornés et les noms complets des unités sont du texte accessible ; 213 tests passent, ainsi que lint, build et `git diff --check`.

## Spec Change Log

- Revue 1 : les relecteurs ont trouvé dix écarts de présentation et d’accessibilité dus à une Code Map et des tâches trop générales : aperçus incomplets, unités fixes ou abrégées seules, dépliage non distinguable, actions sur carte compacte, options toujours ouvertes, avis cachés, libellés vagues et suppression sans confirmation. Les tâches précisent maintenant les décisions de `EXPERIENCE.md:53,67-69,107,116-118` et interdisent cet état connu comme mauvais. KEEP : conserver le reducer et les formules intacts, les calculs sur action explicite, la péremption en chaîne, le fil chronologique, le focus sur la nouvelle question et les tests de ces invariants.

## Review Triage Log

- Revue 2 `verification-gap` — résultat calculé d’une ancienne carte seulement présent dans le DOM, `medium`, route `patch` : les tests ne vérifient pas sa visibilité une fois la carte repliée ; une régression pourrait le masquer. Ajouter une assertion visible sur carbone et eau dans la carte repliée.
- Revue 2 `verification-gap` — noms complets des unités non vérifiés au rendu, `medium`, route `patch` : le test du formateur passerait même si le rendu perdait le nom accessible. Vérifier les deux valeurs rendues.
- Revue 2 `blind-hunter` — recommandations visibles avant bilan, `medium`, route `defer` : `hasCurrentImpact` rend déjà cette section après un seul calcul dans le code initial ; cette story ne l’a pas créé. Le bilan de 6.4 devra la réserver au total valide.
- Revue 2 `blind-hunter` — unités et précision fixes du bilan, `medium`, route `defer` : les trois lignes du bilan et `formatImpact` étaient identiques avant cette story ; le formatage transversal du bilan reste à traiter en 6.4.
- Revue 2 `blind-hunter` — durée de douche fixée en secondes, `medium`, route `defer` : le composant `Shower` préexistait et n’a pas changé ; adapter sa série d’unités avec le bilan.
- Revue 2 `blind-hunter` — `aria-label` sur un `span` générique, `medium`, route `patch` : l’élément n’a pas de rôle nommable fiable ; fournir le nom complet dans un texte accessible sans modifier la valeur visuelle.
- Revue 2 `blind-hunter` — aperçu non borné d’un long échange, `medium`, route `patch` : la carte repliée rend toute la question et toute la réponse, contrairement à son rôle compact ; borner les deux aperçus tout en gardant le texte complet au dépliage.
- Revue 2 `blind-hunter` — « Aucun texte saisi » malgré un contenu facultatif, `false` : ce libellé est propre à chacun des deux champs d’aperçu « Question » et « Réponse » ; il ne décrit pas l’échange entier. L’état de calcul reste affiché séparément.
- Revue 2 `blind-hunter` — groupe facultatif fermé avec contenu, `false` : le groupe est explicitement dépliable dans l’éditeur et sa fermeture initiale est l’interaction prescrite ; les textes ne sont pas perdus et restent accessibles au clavier.
- Revue 2 `blind-hunter` — confirmation sans focus initial ni Échap, `false` : la confirmation est un groupe local dans l’ordre de tabulation après « Supprimer », non un dialogue modal. Le clavier atteint « Annuler » et « Confirmer » ; l’exigence Échap concerne les dialogues d’import et de remplacement.
- Revue 2 `blind-hunter` — échanges bloquant le total sans liens, `medium`, route `defer` : la liste des numéros sans liens existait dans le code initial ; cette story n’a pas modifié ce flux du bilan.
- Revue 2 `edge-case-hunter` — aperçu long sur carte repliée, `medium`, route `patch` : même cause que le constat du blind hunter ; les paragraphes de la carte ne sont pas bornés.
- Revue 2 `edge-case-hunter` — « < 0,001 » avant arrondi, `false` : la valeur brute reste sous la plus petite quantité affichable ; la règle UX demande précisément cette notation pour une valeur sous le minimum de la plus petite unité.

- `blind-hunter` — aperçu question ou réponse seule, `medium` : `ConversationBlocks.tsx` choisit le premier champ non vide ; une carte contenant les deux ne montre jamais la réponse. Route `bad_spec`.
- `blind-hunter` — unités fixes, `medium` : les résultats utilisent toujours gCO₂e et L, malgré la règle de conversion de `EXPERIENCE.md:116`. Route `bad_spec`.
- `blind-hunter` — noms accessibles des unités, `medium` : aucun libellé développé n’accompagne gCO₂e et L, contrairement à `EXPERIENCE.md:118`. Route `bad_spec`.
- `blind-hunter` — noms identiques des dépliages, `medium` : chaque ancienne carte expose « Déplier cet échange », sans numéro pour distinguer les commandes, contrairement à `EXPERIENCE.md:107`. Route `bad_spec`.
- `blind-hunter` — actions sur carte repliée, `medium` : suppression et calcul restent visibles hors de l’éditeur, alors que `EXPERIENCE.md:67` réserve ces actions au contenu déplié. Route `bad_spec`.
- `blind-hunter` — contenus facultatifs toujours ouverts, `medium` : le `fieldset` regroupe mais ne se déplie pas et allonge l’éditeur courant ; `EXPERIENCE.md:68` prévoit « Ajouter des contenus facultatifs ». Route `bad_spec`.
- `blind-hunter` — refus de fichier masqué, `medium` : un ajout replie l’échange précédent et masque son message de refus dans l’éditeur. Route `bad_spec`.
- `blind-hunter` — avis d’import masqués, `medium` : les avertissements de citation et d’artifact sont dans le conteneur replié et disparaissent de la carte compacte. Route `bad_spec`.
- `blind-hunter` — libellé « Message », `medium` : l’éditeur ne nomme pas clairement la question de la personne ni la réponse du chatbot comme `EXPERIENCE.md:53` ; un échange partiel est ambigu. Route `bad_spec`.
- `blind-hunter` — suppression immédiate, `medium` : `removeBlock` retire un échange renseigné sans la confirmation prévue par `EXPERIENCE.md:107`. Route `bad_spec`.
- `verification-gap`, autre constat — refus de fichier replié, `medium` : le test d’import de fichier vérifie seulement l’éditeur ouvert ; l’explication disparaît si un autre échange est ajouté. Route `bad_spec`, même cause que le constat du blind hunter.
- `edge-case-hunter` — avis d’import ou de fichier repliés, `medium` : les avis restent dans `block-editor` masqué ; la carte peut annoncer « Estimation à jour » sans avertissement. Route `bad_spec`, même cause que les constats précédents.

## Verification

**Commands:**
- `npm test -- --run` — scénarios du fil et régression existante verts.
- `npm run lint` — types valides.
- `npm run build` — application compilable.
