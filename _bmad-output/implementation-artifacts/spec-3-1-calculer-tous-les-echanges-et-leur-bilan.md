---
title: 'Story 3.1 — Calculer tous les échanges et leur bilan'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'abfbb4ebf68122fb49e4f42805f167b7f0bc8c10'
context:
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’application calcule aujourd’hui un seul échange, sans action globale, total ni indicateur de sécheresse. Une conversation comportant plusieurs échanges ne fournit donc pas le bilan cohérent attendu.

**Approach:** Ajouter une action explicite « Tout calculer » qui traite séquentiellement les blocs renseignés, réemploie le calcul individuel local existant, puis dérive un bilan global brut et son risque de sécheresse associé au pays du fournisseur.

## Boundaries & Constraints

**Always:** Ignorer les quatre-champs vides après `trim`; calculer dans l’ordre des blocs; conserver les valeurs internes non arrondies en Wh, gCO2e et L; appliquer le PUE exactement une fois via `calculateImpact`; produire carbone et eau depuis la même énergie datacenter; garder le risque catégoriel, non additif et visible seulement au total; rester entièrement en mémoire dans le navigateur; fournir des libellés français accessibles et une mention visible d’incertitude/hors Scope 3.

**Never:** Ne pas sommer des valeurs formatées, attribuer un impact aux blocs ignorés, afficher une équivalence comparative d’eau, utiliser une API ou un stockage durable, ni introduire le recalcul du seul total ou la politique complète de péremption de la story 3.2.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Calcul global | Plusieurs blocs renseignés, éventuellement des blocs vides | Chaque bloc renseigné est lancé et résolu dans l’ordre; total des trois valeurs brutes et risque pays affichés | Les vides sont absents du flux et du total |
| Aucun échange | Aucun bloc, ou tous les blocs sont blancs | Aucun calcul ni bilan; invitation à saisir un échange | Message accessible, sans valeur nulle implicite |
| Donnée/résultat impossible | Paramètres locaux ou calcul individuel invalides | Le bloc conserve son blocage explicite; aucun bilan trompeur n’est affiché | Ne pas remplacer la donnée par zéro |
| Risque absent | Pays fournisseur sans niveau exploitable | Le bilan indique explicitement l’indisponibilité du risque, sans l’inventer | Les impacts énergie/eau/carbone restent affichables |

</frozen-after-approval>

## Code Map

- `src/domain/impact.ts` -- calcul pur individuel et contrôle des valeurs finies; réutiliser sans modifier ses formules.
- `src/domain/impact.test.ts` -- invariants PUE unique et valeurs brutes à préserver.
- `src/domain/conversationHistory.ts` -- construit, pour chaque `blockId`, les textes dépendant des échanges précédents et des versions d’artifact.
- `src/application/tokenizationClient.ts` -- tokenise localement et asynchronement les catégories d’un impact; une orchestration globale doit attendre chaque fin avant le bloc suivant.
- `src/application/conversationReducer.ts` -- source unique des blocs et impacts indexés par `blockId`; étendre l’état/actions de bilan sans casser la protection par empreinte des réponses anciennes.
- `src/data/modelCatalog.ts` -- résout modèle, pays fournisseur et facteurs locaux; étendre la résolution ou exporter le nécessaire pour le risque du catalogue `data/clean/country_drought_risk.csv`.
- `src/ui/App.tsx` -- orchestre `calculate`; extraire ou généraliser ce chemin pour un calcul global séquentiel et la publication du total.
- `src/ui/ConversationBlocks.tsx` et `src/i18n/fr.ts` -- emplacements du bouton, résultats individuels et nouveaux textes de bilan accessibles.
- `src/application/conversationReducer.test.ts`, `src/ui/ConversationBlocks.test.tsx` -- tests d’état et de parcours à enrichir.

## Tasks & Acceptance

**Execution:**

- [x] `src/domain/impactAggregation.ts` et son test -- créer un agrégateur pur qui accepte seulement des impacts finis non négatifs, somme les trois grandeurs sans arrondi et distingue une liste vide/invalide; éviter toute règle UI dans le domaine.
- [x] `src/data/modelCatalog.ts` et tests associés -- exposer le pays d’hébergement résolu et un niveau de risque local du CSV, en distinguant clairement l’absence de donnée d’un niveau réel; ne muter aucun catalogue.
- [x] `src/application/conversationReducer.ts` et `conversationReducer.test.ts` -- modéliser le cycle du bilan global (demande, résultat ou indisponibilité) et l’effacer lorsqu’un calcul/une conversation change; ne jamais accepter de résultat qui ne correspond plus à l’empreinte courante.
- [x] `src/ui/App.tsx` -- factoriser le calcul d’un bloc pour que « Tout calculer » filtre les blocs ignorés et attende l’achèvement de chacun dans leur ordre, puis agrège les résultats valides et associe le risque du pays; conserver Worker et fallback locaux.
- [x] `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` et tests UI -- ajouter l’action globale, son état d’avancement, l’invitation sans bloc et le panneau total énergie/eau/carbone/risque, au clavier et sans couleur seule; garder l’eau individuelle sans équivalence.

**Acceptance Criteria:**

- Given une conversation avec des blocs renseignés et blancs, when la personne déclenche « Tout calculer », then seuls les blocs renseignés sont calculés dans l’ordre et chacun affiche énergie, carbone et eau.
- Given un calcul global terminé sans blocage, when le bilan est rendu, then ses valeurs correspondent à la somme des `ImpactResult` bruts et seul l’affichage applique le formatage.
- Given l’énergie datacenter d’un bloc, when carbone et eau sont produits, then ils réutilisent cette énergie après un unique PUE et l’eau ne couvre que le site.
- Given un bilan disponible, when son risque de sécheresse est rendu, then il est le niveau local du pays d’hébergement, catégoriel, non proportionnel et absent des panneaux individuels.
- Given aucun bloc renseigné, when « Tout calculer » est activé, then un message invite à saisir un échange et aucun bilan environnemental n’apparaît.
- Given le parcours complet, when les calculs sont effectués ou échouent, then ni textes ni résultats ne quittent le navigateur et aucun stockage durable n’est appelé.

## Implementation Notes

- Ajout de `aggregateImpacts`, agrégateur de domaine pur qui conserve les flottants bruts et rejette les collections vides ou invalides.
- L’état `summary` est borné par l’empreinte de conversation; l’orchestration globale emploie un instantané et attend chaque bloc renseigné avant l’agrégation.
- Le niveau de sécheresse est lu localement depuis `country_drought_risk.csv`; « No Data » et les pays absents sont rendus explicitement indisponibles.
- Audit de la matrice complété par un test UI dédié au risque indisponible.

## Spec Change Log

## Review Triage Log

- edge-case-hunter — **medium, defer** — un Worker qui ne renvoie ni message ni erreur peut laisser une demande en attente; le client sans délai de repli existe avant cette story et une politique de délai dépasse son intention.
- blind-hunter — **medium, defer** — ajouter un bloc vide efface actuellement un bilan via l’invalidation générale; la règle de non-péremption des blocs vides est explicitement livrée par la story 3.2.
- blind-hunter — **medium, defer** — l’empreinte inclut les blocs vides; le même contrat de fraîcheur des blocs vides relève de la story 3.2.
- blind-hunter — **medium, patch** — un calcul individuel pendant le bilan global supprimait son état `pending`, ce qui rejetait la résolution finale; les boutons individuels sont désormais désactivés pendant ce calcul.
- blind-hunter — **false** — deux clics utilisateur discrets ne lancent pas durablement deux flux: React publie l’état `pending` et le bouton natif devient désactivé avant l’interaction suivante; aucune voie atteignable n’a été montrée.
- blind-hunter — **low, rejected** — le libellé et le bouton désactivé indiquent déjà un calcul global en cours; la spec ne demande ni compteur ni nom de bloc courant et leur ajout ne corrigerait pas une défaillance démontrée.
- blind-hunter — **false** — le parseur CSV ne reçoit aujourd’hui que les quatre pays simples de `provider_country.csv`; aucun fournisseur courant ne peut atteindre un nom pays avec virgule.
- blind-hunter — **false** — la session ne possède ni surcharge ni catalogue mutable dans cette story; l’empreinte actuelle couvre les seules dépendances utilisables, et les extensions de paramètres appartiennent à l’epic 4.
- blind-hunter — **medium, patch** — le test UI n’exerçait qu’un bloc renseigné; il couvre désormais deux blocs, leurs deux résultats et un total issu de leur somme.
- verification-gap — **medium, patch** — même lacune de vérification multi-échanges; corrigée par le scénario UI à deux échanges.
- verification-gap — **low, patch** — le test catalogue ne couvrait que ChatGPT; il couvre aussi Mistral AI → Switzerland → `Medium - High (0.6-0.8)`.

## Design Notes

Le calcul global doit être une séquence asynchrone explicite : pour chaque bloc non ignoré, préparer l’historique depuis le même instantané de conversation, attendre le comptage et la résolution, puis poursuivre. Une agrégation ne doit être tentée qu’après l’ensemble de cette séquence et uniquement à partir d’objets `ImpactResult` bruts associés à l’empreinte active.

## Verification

**Commands:**

- `npm test -- --run` -- expected: la suite Vitest passe, incluant agrégation, reducer et UI multi-blocs.
- `npm run lint` -- expected: TypeScript/ESLint ne signale aucune erreur.
- `npm run build` -- expected: le build Vite statique réussit sans dépendance réseau.
