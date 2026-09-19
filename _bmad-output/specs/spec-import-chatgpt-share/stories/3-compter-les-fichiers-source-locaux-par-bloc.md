---
title: 'Compter les fichiers source locaux par bloc'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_commit: '395ae22f50730dba55e528cfb99a1096943167e1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les fichiers source signalés ou possédés par la personne ne peuvent pas encore être ajoutés à un échange ; leur texte est donc absent des tokens, de l’historique et de l’impact local.

**Approach:** Associer à chaque bloc une liste transitoire de fichiers texte locaux acceptés, les lire strictement en UTF-8 dans le navigateur et les inclure une seule fois dans les entrées canoniques du calcul, sans altérer artifacts ni catalogues.

## Boundaries & Constraints

**Always:** Accepter plusieurs `.txt`, `.md`, `.markdown`, `.json`, `.csv`, `.log`, `.py`, `.js`, `.ts`, `.html`, `.xml`, `.yaml`, `.yml`, les MIME `text/*` et `application/json`. Conserver seulement en mémoire `{id, nom, type, taille, texte}` des fichiers admis. Les tokeniser avec `o200k_base` ou le fallback existant `mots / 0,75`; préserver leur ordre ; les compter comme entrée une seule fois. Ajouter, modifier ou retirer un fichier périme le bloc concerné et ses dépendants historiques, sans lancer de calcul.

**Never:** Envoyer un fichier à un tiers, le persister, conserver un `File`/Blob, télécharger un artifact, lire un fichier binaire/illisible/non pris en charge, ni concaténer une pièce jointe à la fois dans `Message` et dans une catégorie distincte. Ne pas modifier les règles de calcul environnemental, les artifacts ou le catalogue de modèles.

**Décision :** La limite par fichier local est fixée à **5 Mio**. Elle borne la mémoire et la tokenisation tout en couvrant des journaux et fichiers texte pratiques ; un dépassement est refusé avec l’alternative de collage.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Fichiers texte admis | Plusieurs fichiers admissibles, UTF-8 et sous la limite | Chaque fichier est listé, supprimable, en mémoire et son texte alimente l’entrée du bloc dans l’ordre choisi | Aucun envoi ni persistance |
| Fichier exclu | Type/extension non admis, octets UTF-8 invalides, vide ou taille excessive | Le fichier n’est pas ajouté ni compté | Statut accessible expliquant le refus et invitant à coller le contenu pertinent dans Message ou Artifact |
| Calcul et fraîcheur | Un fichier est ajouté ou retiré après un résultat | Empreintes, tokenisation, historique, impact et total reflètent exactement les textes admis ; le bloc et les suivants dépendants deviennent périmés | Les artifacts et catalogues restent inchangés |
</frozen-after-approval>

## Code Map

- `src/application/conversationReducer.ts` -- définit le bloc, les actions de session, les empreintes et la péremption ; ajouter les actions atomiques d’ajout/suppression et inclure les sources dans les frontières canoniques.
- `src/domain/tokenization.ts`, `src/workers/tokenization.worker.ts`, `src/workers/tokenizationProtocol.ts`, `src/application/tokenizationClient.ts` -- protocole `o200k_base`, empreintes et fallback à étendre pour les entrées source.
- `src/domain/conversationHistory.ts` et `src/ui/App.tsx` -- construisent l’historique et les trois catégories d’impact ; garantir une contribution source unique au bloc courant et aux entrées mises en cache précédentes.
- `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` -- champ multiple accessible, état compté/refusé et suppression par bloc, sans branchement fournisseur.
- `docs/importer-un-partage-chatgpt.md` -- documenter les formats admis, la session mémoire et le collage pour les formats exclus.
- `src/**/*.{test,tsx}` -- tests ciblés existants du reducer, de l’historique, de la tokenisation, du worker et de l’UI à compléter.

## Tasks & Acceptance

**Execution:**

- [x] `src/application/conversationReducer.ts` et `src/domain/conversationHistory.ts` -- modéliser les sources admises et leurs mutations, puis les propager dans les empreintes et l’historique -- préserver la fraîcheur en cascade sans toucher aux calculs.
- [x] `src/domain/tokenization.ts`, `src/workers/tokenization.worker.ts`, `src/workers/tokenizationProtocol.ts`, `src/application/tokenizationClient.ts`, `src/ui/App.tsx` -- étendre le texte d’entrée canonique et les catégories d’impact -- garantir `o200k_base`/fallback et l’absence de double comptage.
- [x] `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` -- lire localement les fichiers sélectionnés, valider type/taille/UTF-8, afficher les statuts et permettre le retrait -- rendre les refus accessibles et conserver la session éphémère.
- [x] `src/**/*.test.*` -- couvrir lecture, suppression, MIME/extensions/limites/UTF-8, tokenisation, empreintes, historique, `impactTexts`, absence de double comptage et péremption -- verrouiller le contrat CAP-4.
- [x] `docs/importer-un-partage-chatgpt.md` -- remplacer la mention générique par les formats, la confidentialité mémoire et l’alternative de collage -- rendre la limite compréhensible.

**Acceptance Criteria:**

- Given un bloc, when la personne ajoute plusieurs fichiers texte admis, then ils sont visibles, supprimables, strictement locaux et chacun contribue une fois aux tokens d’entrée et à l’impact du bloc.
- Given un fichier binaire, illisible, vide, non pris en charge ou trop volumineux, when il est sélectionné, then aucun texte ni métadonnée de fichier rejeté ne rejoint le bloc et un message accessible propose le collage manuel.
- Given un résultat d’impact courant et des échanges suivants calculés, when une source admise du bloc est ajoutée ou retirée, then ce bloc et les résultats dépendants deviennent périmés, sans calcul automatique ni modification des artifacts ou catalogues.
- Given le Worker indisponible, when un bloc possède des sources admises, then le fallback mots/0,75 les compte dans les mêmes frontières d’entrée sans les compter comme sortie ou raisonnement.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Evidence et route |
| --- | --- | --- |
| Validation défensive de `sourceAdded` | medium | Réel : le reducer accepte une charge arbitraire malgré la limite et les formats du contrat ; correction locale (`patch`). |
| Fichier composé d’espaces | false | Un fichier UTF-8 non vide n’est pas « vide » au sens du contrat et peut produire des tokens `o200k_base`. |
| Ordre entre sélections concurrentes | medium | Réel : les lectures asynchrones de deux sélections peuvent dispatcher dans l’ordre inverse ; le contrat impose l’ordre (`patch`). |
| Statut de refus conservé après suppression | false | Aucun réemploi atteignable du `blockId` n’est démontré : les identifiants sont générés et les statuts ne sont plus rendus sans bloc. |
| Source vide envoyée au Worker | false | Le reducer refuse déjà `text.length === 0`; aucun chemin de l’application ne fournit cette valeur au Worker. |
| Représentation Worker/fallback des sources | false | Les deux comptent les sources dans la même frontière ; le fallback est une estimation distincte, pas une seconde implémentation `o200k_base`. |
| Flux UI de sélection non couvert | medium | Réel et pré-vérifié : les tests n’exécutent pas `onChange`, ni le statut accessible, ni le retrait (`patch`). |
| Limite 5 Mio non testée au seuil | medium | Réel et pré-vérifié : seul le constant est testé ; ajouter les deux bornes (`patch`). |
| Bloc ne contenant que des sources (analyse edge) | high | Réel : `isIgnoredConversationBlock` ne consulte pas les sources, empêchant le calcul (`patch`). |
| Sélections concurrentes (analyse edge) | medium | Réel, même cause que l’entrée d’ordre concurrente ; correction groupée (`patch`). |
| Bloc uniquement source (claim edge) | high | Réel, même cause que l’entrée précédente ; correction groupée (`patch`). |

## Design Notes

La lecture doit valider la taille avant décodage et décoder UTF-8 en mode fatal afin de distinguer un texte illisible d’un texte contenant un caractère de remplacement. Les fichiers importés par la story 2 et les blocs créés manuellement démarrent avec une liste de sources vide.

## Verification

**Commands:**

- `npm test -- --run` -- attendu : toutes les suites existantes et les nouveaux cas passent.
- `npm run lint` -- attendu : TypeScript et les règles de lint passent sans erreur.
- `npm run build` -- attendu : le build Vite termine avec succès.
