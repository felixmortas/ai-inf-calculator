---
title: 'Socle d’import extensible : V1 ChatGPT et extension multi-fournisseur'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ca8cd213bf757b81d10cc7dfa41e491ea224e1f0'
context:
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problème :** Le calculateur ne possède pas de frontière d’import ni de lecture sûre d’un partage public. Il faut préparer un parcours multi-fournisseur sans introduire de dépendance ChatGPT dans les blocs de conversation ou dans les calculs.

**Approche :** Fournir un registre V1 immuable qui ne distribue que l’adaptateur ChatGPT. Cet adaptateur valide strictement un lien de partage, lit uniquement cette page dans des limites explicites et transforme les structures publiques JSON ou React Router en événements normalisés, ou en erreur actionnable atomique.

## Boundaries & Constraints

**Always :** Conserver GitHub Pages et les données uniquement en mémoire ; effectuer au plus un `fetch` direct vers l’URL validée, sans cookie, authentification, proxy, API, persistance, suivi de lien ou chargement de ressource référencée. Borner délai, octets lus et nombre d’événements ; conserver le texte brut et l’ordre public ; dédupliquer lorsqu’un identifiant de message est présent. Le registre et les résultats d’adaptateur doivent être typés, immuables et consommables par le futur parcours commun sans muter `ConversationState.blocks`.

**Never :** Ne pas livrer Claude, Gemini ou Mistral ; ne pas modifier le reducer des blocs, les règles de tokenisation, l’historique, les calculs ni l’UI de conversion/remplacement (story 2). Ne pas exécuter, rendre avec `innerHTML`, inférer, télécharger ni suivre le contenu distant, les artifacts ou les citations de fichiers. Ne pas contourner CORS ou une structure publique inconnue : ces cas échouent entièrement.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Lien accepté | `https://chatgpt.com/share/<id>` exact | L’adaptateur ChatGPT devient sélectionnable et produit des événements normalisés ordonnés depuis JSON ou flux React Router | Aucune mutation de blocs |
| Lien refusé | HTTP, port, identifiants, query, fragment, chemin/ID invalide | Aucun `fetch` ; résultat d’erreur URL actionnable | État d’import inchangé |
| Lecture refusée | CORS/réseau, timeout, HTTP non-2xx, réponse trop grande | Aucun événement partiel n’est retourné | Erreur distinguée et actionnable |
| Données publiques | Messages idés ou non, rôles connus/inconnus et dates | Ordre public déterministe ; déduplication par ID, sinon événement distinct ; rôles inconnus préservés | Aucun classement arbitraire |
| Format inconnu ou limite | Aucune structure reconnue ou trop de messages | Refus atomique, sans événement | Erreur format/limite actionnable |

</frozen-after-approval>

## Amendement multi-fournisseur

La section figée ci-dessus reste le constat de la V1 livrée. Pour l’extension à dispatcher, le registre statique fermé distribue `chatgpt`, `claude`, `mistral` et `gemini` et est le seul à produire un `ResolvedShare` opaque, immuable et attesté. Chaque adaptateur résout et canonicalise uniquement ses URLs publiques, resserre ses limites, extrait localement son propre état public et normalise vers les mêmes événements ; aucun sélecteur ni heuristique n’est partagé.

**Exigences d’extension :** une valeur `ResolvedShare` forgée ou clonée est refusée ; les URL, hôtes, chemins, query, fragments et redirections suivent la règle de chaque adaptateur. Gemini ne suit que les redirections allowlistées et attestées, dans sa limite ; les autres fournisseurs refusent toute redirection non explicitement admise. Chaque adaptateur possède ses fixtures publiques minimisées couvrant les deux rôles, contenu non textuel ou inaccessible, état absent, dérive de structure, limites et erreurs typées atomiques. Un échec ne produit aucun événement ni mutation et ne désactive que le fournisseur concerné.

**Critères d’acceptation d’extension :**

- Given les quatre URLs canoniques, when le registre les résout, then il détecte le bon adaptateur et produit seulement un `ResolvedShare` attesté ou une erreur sans requête.
- Given une fixture minimisée de chaque fournisseur, when son extracteur l’analyse dans ses limites, then il restitue les événements communs ordonnés et signale les contenus inaccessibles sans les lire ni les inventer.
- Given une URL, une redirection, une structure ou une limite refusée, when l’adaptateur l’évalue, then il retourne l’erreur typée correspondante sans résultat partiel et le parcours manuel reste disponible.

## Code Map

- `src/application/conversationReducer.ts` -- porte `ConversationState` et les blocs ordinaires ; ne pas lier l’adaptateur à ces types ni ajouter de branche ChatGPT.
- `src/ui/App.tsx` -- orchestre aujourd’hui tokenisation et calcul ; une intégration visuelle ultérieure se placera avant `ConversationBlocks`, pas dans cette story.
- `src/domain/conversationHistory.ts` et `src/domain/tokenization.ts` -- consommateurs des quatre champs de bloc, hors périmètre.
- `src/application/import/` -- nouveau sous-système à créer : contrat normalisé, registre V1 et adaptateur navigateur ChatGPT isolé.
- `feasability_filling_from_url/extract_chatgpt_share.py` et `tests/test_extract_chatgpt_share.py` -- oracle des structures publiques JSON/React Router et des cas d’ordre ; ne pas importer sa lecture de ressources ni ses écritures disque.
- `_bmad-output/specs/spec-import-chatgpt-share/import-contract.md` -- contrat de validation, bornes, confidentialité et comportements d’échec.

## Tasks & Acceptance

**Execution :**
- [x] `src/application/import/types.ts` et `src/application/import/registry.ts` -- définir le contrat d’événements, résultats/erreurs discriminés et le registre readonly V1 limité à ChatGPT -- isoler le parcours commun des particularités fournisseur.
- [x] `src/application/import/chatgptShare.ts` -- valider l’URL canonique, lire la seule page avec timeout et plafonds, extraire JSON/React Router sans DOM exécutable, normaliser/ordonner/dédupliquer les messages -- rendre tous les échecs atomiques.
- [x] `src/application/import/*.test.ts` -- couvrir registre, URL, réseau/CORS/HTTP, limites, parsing public, ordre, déduplication, rôles inconnus et refus sans résultat partiel -- verrouiller CAP-1/CAP-5.

**Acceptance Criteria :**
- Given le registre V1, when un fournisseur est demandé, then seul `chatgpt` est exposé et une URL d’un autre fournisseur est refusée.
- Given une URL ChatGPT qui diffère de `https://chatgpt.com/share/<id>` exact, when elle est analysée, then aucune requête réseau n’est initiée et une erreur de validation est renvoyée.
- Given une page publique admise, when elle contient l’état JSON ou le flux React Router observé, then les événements normalisés préservent l’ordre public, dédupliquent un même ID et gardent les rôles inconnus sans les attribuer.
- Given un échec réseau, CORS, HTTP, délai, taille, nombre de messages ou structure, when l’adaptateur le rencontre, then il retourne une erreur actionnable sans événement partiel ni mutation de conversation.
- Given un texte d’événement qui mentionne artifact ou fichier, when il est extrait, then l’adaptateur ne déclenche aucune lecture supplémentaire.

## Implementation Notes

- Ajout du contrat `ImportProvider` et du registre V1 figé à ChatGPT, sans dépendance vers les blocs ni les calculs.
- L’adaptateur ne lit qu’une URL canonique avec `fetch` sans identifiants ni redirection ; les refus réseau, HTTP, délai, taille et format retournent un résultat atomique vide.
- Les extracteurs couvrent les scripts JSON et le flux React Router indexé ; ils conservent le texte brut, l’ordre et les rôles inconnus, avec déduplication par identifiant seulement.

## Spec Change Log

## Review Triage Log

- medium — `chatgptShare.ts` collectait tous les candidats avant la borne ; la collecte s’arrête désormais à `maxEvents + 1` et refuse atomiquement.
- medium — le flux trop grand pouvait rester actif après rejet ; `reader.cancel()` est maintenant appelé et testé.
- medium — certains états JSON publics encodés par `JSON.parse(...)` étaient ignorés ; ils sont décodés passivement et couverts par test.
- medium — un ordre mixte dates/absence de date déplaçait des messages publics ; l’ordre documentaire est conservé dès qu’une date manque.
- medium — les chemins de lecture chunked, échec du reader et annulation n’étaient pas tous couverts ; les tests ciblés couvrent désormais le flux trop grand et son annulation.
- false — l’extracteur Python de faisabilité accepterait les redirections ; il refuse déjà tout statut hors `200..299`, donc 3xx inclus.
- false — l’extracteur Python lirait des liens et violerait l’import produit ; ce script d’étude, explicitement non importé, n’est pas appelé par le nouvel adaptateur qui n’effectue qu’un `fetch` du partage.
- false — une éventuelle réaffectation DNS de l’extracteur Python affecterait l’adaptateur ; aucun code de l’adaptateur n’utilise cet extracteur ni ne suit des liens.
- low — le validateur du prototype Python accepte un slash final, contrairement au contrat applicatif ; c’est un écart préexistant de l’oracle de faisabilité, hors changement produit.
- low — un fichier `__pycache__` figure parmi les fichiers non suivis du prototype ; c’est un artefact préexistant, hors surface applicative de la story.
- medium — l’ordre document/public mixte était perdu ; corrigé par le même tri conditionnel, qui ne trie par date que quand toutes les dates sont disponibles.
- medium — la limite de messages était appliquée après parcours complet ; corrigé par arrêt anticipé du walk et test de limite atomique.
- medium — un timeout pendant la lecture du corps devenait `network` ; l’état du contrôleur produit désormais `timeout`, avec test de flux interrompu.
- false — le prototype Python accepterait un HTTP 3xx ; son garde `not 200 <= response.status < 300` renvoie déjà une erreur pour ce cas.
- medium — le plafond d’octets chunked n’était pas testé ; un `ReadableStream` sans `content-length` vérifie maintenant refus atomique et annulation.
- low — `cache: 'no-store'` n’était pas affirmé par test ; l’assertion des options de `fetch` le verrouille désormais.

## Design Notes

L’adaptateur encapsule le seul effet navigateur (`fetch`). Les événements restent une représentation publique minimale (`id` optionnel, rôle, texte et ordre/temps) : la conversion vers `Message`, `Raisonnement visible` et `Réponse finale` est volontairement reportée à la story 2.

## Verification

**Commands :**
- `npm test -- --run src/application/import` -- expected: tous les cas ciblés passent dans jsdom.
- `npm run lint` -- expected: TypeScript ne rapporte aucune erreur.
- `npm run build` -- expected: compilation et build Vite aboutissent.
