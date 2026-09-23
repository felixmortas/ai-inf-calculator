---
title: 'Story 2.3 — Calculer et afficher l’impact d’un bloc'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
baseline_commit: 'edec3dc5a5293d210047fcad4afb006874e034a0'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Après le comptage local et la reconstruction de l’historique, aucun parcours ne transforme encore un échange renseigné en estimation d’énergie, de carbone et d’eau. La personne ne peut donc ni déclencher ce calcul ciblé ni en consulter le résultat.

**Approach:** Ajouter un calcul individuel explicite, entièrement local, qui prépare et tokenise toutes les catégories du seul bloc visé, applique le domaine pur aux paramètres résolus disponibles, puis présente un résultat non arrondi en interne et formaté dans l’interface.

**Decision:** Des valeurs PUE et WUE locales ont été ajoutées aux catalogues; le parcours doit donc produire des résultats chiffrés à partir de ces références, et non seulement un état de blocage.

**Decision:** Le nouveau catalogue `provider_country.csv` associe chaque fournisseur à son pays d’hébergement de référence. Les catalogues PUE et WUE portent désormais leurs champs de provenance, version et date; ils sont les seules données environnementales utilisées pour les résultats de cette story.

## Boundaries & Constraints

**Always:** Exclure un bloc entièrement vide et ne calculer que le bloc demandé; reconstruire son historique même si les blocs antérieurs ne possèdent aucun résultat. Tokeniser avec le même Worker/fallback le message courant, les catégories historiques, la référence artifact et la contribution artifact; intégrer exactement une fois les tokens système du catalogue au cache sans les exposer. Le domaine pur reçoit ses données et retourne soit des impacts finis en Wh, gCO2e et L non arrondis, soit une erreur discriminée explicite. Appliquer une fois le PUE à l’énergie informatique; dériver ensuite carbone et eau de cette même énergie. L’UI affiche énergie, carbone et eau à quatre chiffres significatifs, avec unités, incertitude et périmètre usage uniquement, hors fabrication, amortissement et Scope 3.

**Never:** Ne jamais transmettre, journaliser, persister ou mettre les textes dans une URL. Ne jamais inventer une valeur de catalogue, afficher `NaN`/infini ou un résultat partiel. Ne jamais déclencher le calcul d’un autre bloc, ni recalculer automatiquement après une édition ou un changement de modèle. Ne pas afficher le risque de sécheresse individuel, les réglages avancés, le calcul global ou l’équivalence douche, qui relèvent de stories ultérieures.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Calcul ciblé | Bloc renseigné, données résolues valides | Le seul bloc demandé obtient énergie, carbone et eau à partir de ses entrées, cache et sortie | Aucun autre état de résultat n’est créé |
| Historique sans impacts | Bloc ultérieur avec prédécesseurs non calculés | Les textes antérieurs et la dernière référence artifact participent au cache | Le calcul peut aboutir indépendamment des résultats précédents |
| Donnée ou nombre invalide | Catalogue incomplet, valeur manquante, négative, non finie ou hors domaine | Aucun impact n’est conservé ni affiché | Une erreur de blocage française, associée au bloc, explique la donnée indisponible/invalide |
| Édition ultérieure | Texte ou modèle modifié après une action | Le résultat existant est retiré ou signalé périmé sans nouvelle requête | Une nouvelle action explicite reste nécessaire |
</frozen-after-approval>

## Code Map

- `src/domain/impact.ts` -- nouveau domaine synchrone et indépendant des catalogues concrets; valide les paramètres et applique les formules énergie/carbone/eau sans arrondi.
- `src/domain/impact.test.ts` -- jeux chiffrés, PUE appliqué une fois, validation des bornes et erreurs sans résultat non fini.
- `src/domain/conversationHistory.ts` -- réutiliser `prepareConversationHistory` pour les textes antérieurs, l’artifact et le prompt système opaque; ne pas modifier ses règles de diff.
- `src/domain/tokenization.ts` et `src/application/tokenizationClient.ts` -- étendre les contrats/orchestration pour tokeniser les catégories dérivées en local, sans contourner le Worker ni son fallback.
- `src/data/modelCatalog.ts` et `data/clean/models_params.csv` -- enrichir la lecture typée et immuable des paramètres modèle existants; ne pas fabriquer les données environnementales absentes.
- `src/application/conversationReducer.ts` -- ajouter l’intention explicite, l’état d’attente/résultat/erreur individuel et son invalidation; conserver le reducer comme seule mutation de session.
- `src/ui/App.tsx`, `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` -- orchestrer le client, offrir « Calculer » accessible et afficher résultat/erreur/incertitude, sans logique métier dans React.
- `src/application/conversationReducer.test.ts` et `src/ui/ConversationBlocks.test.tsx` -- couvrir ciblage, péremption, absence de calcul automatique et restitution accessible.

## Tasks & Acceptance

**Execution:**

- [x] `src/domain/impact.ts`, `src/domain/impact.test.ts` -- définir les contrats, validations et formules pures des trois impacts -- garantir des résultats exacts, finis et non arrondis hors React et catalogue concret.
- [x] `src/data/modelCatalog.ts` et données de référence disponibles -- typer, valider, dater et geler les paramètres nécessaires au calcul -- bloquer explicitement les dépendances manquantes au lieu de les remplacer.
- [x] `src/application/conversationReducer.ts`, `src/application/tokenizationClient.ts` et leurs tests -- orchestrer une demande par bloc avec ses textes reconstruits et invalider sans effet secondaire -- respecter le Worker, les réponses périmées et l’action explicite.
- [x] `src/ui/App.tsx`, `src/ui/ConversationBlocks.tsx`, `src/i18n/fr.ts`, `src/ui/styles.css` et tests UI -- proposer l’action, les états d’attente/blocage/résultat et le formatage français -- rendre les unités et limites lisibles au clavier et sur mobile.

**Acceptance Criteria:**

- Given un bloc renseigné et toutes les données indispensables, when « Calculer » est activé, then le résultat individuel expose énergie, carbone et eau avec les valeurs internes non arrondies et les valeurs affichées à quatre chiffres significatifs.
- Given une version artifact modifiée et des prédécesseurs jamais calculés, when le bloc courant est calculé, then seules les catégories reconstruites et tokenisées contribuent selon les formules, sans calcul implicite des prédécesseurs.
- Given une donnée indispensable absente ou invalide, when le calcul est demandé, then le bloc affiche une explication de blocage et aucun résultat environnemental calculé.
- Given un résultat puis une modification de texte ou de modèle, when l’état est mis à jour, then aucune requête ni aucun recalcul automatique ne démarre et le résultat ne reste pas présenté comme courant.

## Implementation Notes

- Le client de tokenisation compte séparément chaque texte dérivé de l’historique dans le Worker; si le Worker est indisponible, le fallback du domaine calcule les mêmes catégories localement.
- Les paramètres PUE/WUE exigent leurs métadonnées de catalogue. Le facteur carbone existant reste validé par son fichier de métadonnées compagnon.

## Review Triage Log

- low — Les lignes existantes de `models_params.csv` n’ont pas de date de consolidation; cette métadonnée n’influe pas sur un calcul individuel et sa correction exige de compléter la donnée source, donc elle est rejetée dans cette story.
- low — La validation de format de `consolidation_date` recoupe la métadonnée absente précédente; elle n’affecte pas l’usage quotidien et ne justifie pas d’inventer une date.
- false — Les ratios tarifaires ne possèdent pas de borne maximale dans le contrat mathématique; seules leurs valeurs finies et non négatives sont nécessaires au calcul.
- false — `maximumSignificantDigits: 4` arrondit bien à quatre chiffres significatifs; l’absence de zéros de remplissage ne modifie pas la précision de l’estimation.
- false — `TokenizationClient` installe déjà des handlers `onerror` et `onmessageerror`, qui appliquent le fallback à toutes les requêtes en attente.
- false — Une action `impactBlocked` périmée est refusée par l’empreinte courante; l’appel sans état pending est requis pour signaler immédiatement un catalogue indisponible.
- low — La variante `empty-block` n’est pas atteignable depuis l’UI, qui masque volontairement l’action pour un bloc ignoré; ce code mort n’a pas de conséquence utilisateur et sa suppression n’améliore pas le parcours.
- low — Les catalogues statiques malformés sont soit bloqués explicitement à la résolution, soit échouent bruyamment au chargement; un validateur CSV générique ajouterait une surface hors du besoin individuel.
- patch — Le test PUE ne vérifiait pas l’eau; il vérifie désormais que le doublement du PUE double aussi `waterL`.
- patch — La tokenisation des catégories dérivées n’était pas vérifiée; `impactTexts` et son test couvrent message, historique, référence et contribution artifact.
- patch — Un prompt système fractionnaire pouvait atteindre `prepareConversationHistory`; le parseur de modèle exige maintenant un entier sûr.
- low — Un Worker silencieux sans erreur pourrait laisser une action pending; aucune durée d’expiration n’est définie par l’intention et les échecs Worker signalés appliquent déjà le fallback, donc l’ajout d’un timeout est rejeté.
- false — Une donnée numérique invalide dans un catalogue statique doit empêcher son chargement plutôt que produire une estimation; ce comportement est plus sûr qu’un résultat partiel.
- patch — Une résolution impact arrivée après une mutation n’était pas testée; le reducer vérifie maintenant le rejet après édition, suppression et changement de modèle.
- patch — L’arrondi et le message d’erreur étaient non testés; les tests UI couvrent maintenant quatre chiffres significatifs et l’alerte de blocage.

## Design Notes

Les constantes et ratios sont passés au domaine sous forme de paramètres résolus : celui-ci peut être vérifié sur des exemples numériques sans connaître les CSV, et l’application reste responsable de l’absence de données. Le Worker doit compter les textes dérivés de l’historique au lieu de réutiliser les seuls quatre comptes déjà disponibles pour le bloc courant.

## Verification

**Commands:**

- `npm test -- --run` -- expected: les domaines, reducer, Worker et UI passent, y compris les résultats bloqués et les réponses périmées.
- `npm run lint` -- expected: TypeScript et ESLint ne signalent aucune erreur.
- `npm run build` -- expected: Vite produit le calculateur avec la base `/ai-inf-calculator/`.
