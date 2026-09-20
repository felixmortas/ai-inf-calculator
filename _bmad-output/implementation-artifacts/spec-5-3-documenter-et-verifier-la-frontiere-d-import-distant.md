---
title: 'Documenter et vérifier la frontière d’import distant'
type: 'feature'
created: '2026-09-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '3948e865d3f5c28cfc8c154a4c80e5920961517b'
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-2-recuperer-un-partage-par-une-passerelle-tiers-bornee-2.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’application propose désormais l’import consenti via `corsproxy.io`, mais l’aide utilisateur ne décrit pas encore cette exception de confidentialité avec ses incertitudes. Les tests séparent l’interface mockée de la passerelle réelle et ne démontrent donc pas le parcours complet, de l’autorisation ponctuelle à l’extraction locale.

**Approach:** Documenter précisément l’exception et l’alternative manuelle, puis ajouter des tests d’intégration qui exercent les scénarios de consentement, annulation, changement d’URL, indisponibilité et succès contre la vraie chaîne d’import, sans élargir sa frontière réseau.

## Boundaries & Constraints

**Always:** Conserver `remoteGateway` comme unique accès réseau, `https://corsproxy.io/` comme unique origine, l’URL ChatGPT canonique comme seule donnée métier sortante et l’extraction du HTML exclusivement locale. L’aide doit citer la documentation, la politique de confidentialité et les conditions du fournisseur, expliquer l’URL, l’IP, l’agent utilisateur et les métadonnées possibles, ainsi que l’incertitude de traitement ou de conservation du contenu. Elle doit rappeler le consentement pour chaque requête, la revue nécessaire de cette exception et la disponibilité permanente de l’import manuel.

**Never:** Ne pas appeler directement `chatgpt.com`, envoyer les blocs, fichiers, résultats ou paramètres locaux, ajouter de persistance, modifier les règles de calcul ou promettre que CorsProxy ne traite ni ne conserve jamais la page. Ne pas faire dépendre l’import manuel de la disponibilité ou des politiques du tiers.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Succès consenti | URL ChatGPT valide, consentement courant et HTML public reconnu | Une seule requête GET vers CorsProxy transmet uniquement la destination validée ; les événements sont extraits localement et aucune session ne change avant confirmation de remplacement. | Les données locales ne figurent ni dans l’URL, ni le corps, ni les en-têtes applicatifs. |
| Refus, annulation ou URL modifiée | Dialogue ouvert ou import en vol, sans poursuite valide | Aucun appel réseau supplémentaire, aucune prévisualisation obsolète ni action reducer. | Le parcours manuel ferme le dialogue et laisse la session intacte. |
| Fournisseur indisponible | Consentement suivi d’une erreur réseau, HTTP ou délai | Une erreur compréhensible est affichée ; les données de session et l’alternative manuelle restent disponibles. | Aucun HTML partiel ni événement ne quitte la frontière. |
| Exception désactivée ou à revoir | Clé/configuration absente ou politique du proxy refusée | Le produit conserve l’import manuel et l’aide indique que le tiers peut être désactivé après revue. | L’erreur typée ne divulgue ni secret ni état local. |

</frozen-after-approval>

## Code Map

- `docs/importer-un-partage-chatgpt.md` -- aide d’import existante ; ajouter une section dédiée à l’exception CorsProxy, ses documents, données exposées, incertitudes, consentement ponctuel, revue et voie manuelle.
- `src/ui/ConversationImport.tsx` -- parcours de consentement et mutation différée ; le réutiliser sans changement de comportement pour l’intégration.
- `src/ui/ConversationImport.test.tsx` -- preuves UI déjà présentes avec fournisseur injecté ; compléter ou relayer avec une intégration réelle sans affaiblir les tests d’accessibilité existants.
- `src/application/import/remoteGateway.ts` -- unique frontière réseau, consentement à usage unique et requête GET minimisée ; injecter seulement le `fetcher` dans les tests, sans modifier son contrat.
- `src/application/import/chatgptShare.ts` -- composition passerelle puis extracteur local à couvrir dans le succès et les échecs intégrés.
- `src/application/import/remoteGateway.test.ts` -- garanties unitaires de destination, consentement, erreurs, délai et taille déjà établies ; les conserver comme tests de frontière.
- `src/application/conversationReducer.ts` -- actions de session à espionner pour démontrer qu’un échec d’import ne la modifie pas.

## Tasks & Acceptance

**Execution:**

- [x] `docs/importer-un-partage-chatgpt.md` -- documenter le tiers, ses liens, les données et métadonnées exposées, les limites et incertitudes, le consentement à chaque requête, la revue/désactivation et l’import manuel -- permettre une décision éclairée sans promesse invérifiable.
- [x] `src/ui/ConversationImport.test.tsx` et/ou un test d’intégration ciblé sous `src/application/import/` -- relier le dialogue à la vraie chaîne consentement → passerelle injectée → extracteur local et tester succès, refus/annulation, URL changée, indisponibilité et conservation de session -- prouver les propriétés de sécurité sur le parcours complet.

**Acceptance Criteria:**

- Given l’aide d’import, when la personne lit la section d’import distant, then elle peut identifier CorsProxy, ses documents, les données exposées, les incertitudes de traitement, le consentement ponctuel et la solution manuelle.
- Given les scénarios intégrés de consentement, annulation, changement d’URL, indisponibilité et succès, when ils sont exécutés, then le réseau ne démarre qu’après consentement et tout échec préserve la session.
- Given une requête consentie inspectée par ces tests, when elle quitte le calculateur, then seule l’URL ChatGPT validée est transmise et aucun état local ne l’accompagne.
- Given le proxy est indisponible, non configuré ou doit être désactivé, when l’import distant ne peut pas être utilisé, then l’aide et l’interface gardent le parcours manuel sans promesse de confidentialité absolue.

## Implementation Notes

- 2026-09-20 — L’aide documente l’exception CorsProxy, les données exposées et ses limites sans promesse de traitement ou de conservation. Elle conserve explicitement l’import manuel lorsque le tiers est indisponible, non configuré ou désactivé.
- 2026-09-20 — Les tests UI injectent `createRemoteGateway` dans la composition réelle avec `importChatGptShare`. Ils prouvent le consentement préalable, l’annulation et la voie manuelle sans trafic, l’invalidation après changement d’URL, le succès d’extraction locale, la minimisation de la requête et l’atomicité lors d’une indisponibilité.

## Spec Change Log

## Review Triage Log

- low — patch — L’aide disait que seule l’URL quittait le calculateur alors que la clé CorsProxy configurée figure aussi dans la requête ; elle distingue désormais la donnée métier de cette clé d’instance.
- medium — patch — La configuration absente ne traversait pas l’intégration UI ; un test injecte désormais une passerelle sans clé et vérifie l’absence de trafic et de mutation.
- medium — patch — Après un échec, le lien explicite vers l’import manuel disparaissait avec le dialogue ; l’état d’erreur conserve maintenant ce lien et les deux erreurs intégrées le couvrent.
- medium — patch — Le test de réponse obsolète observait l’absence de prévisualisation avant la fin démontrée de la chaîne ; sa synchronisation est renforcée pour attendre la résolution de l’import réel avant l’assertion.
- low — patch — La composition réelle s’arrêtait à la prévisualisation ; le test de succès confirme désormais le remplacement et son absence avant confirmation.
- false — Le statut `in-review` de la spec et `in-progress` dans le sprint ne divergent pas : le sprint suit le développement jusqu’à la conclusion de la revue, conformément aux notes de `sprint-status.yaml`.
- low — patch — Le cas limite a relevé la même omission de clé configurée dans l’aide ; la formulation corrigée précise désormais les deux catégories de données transmises.
- medium — patch — La revue des lacunes de vérification a confirmé que l’import obsolète devait être attendu jusqu’à sa résolution complète ; le test attend maintenant ce règlement avant de contrôler durablement l’UI.

## Design Notes

Les tests d’intégration complètent, sans les remplacer, les tests unitaires de `remoteGateway` : ils doivent vérifier le fil visible par la personne tout en gardant l’injection du transport pour éviter toute requête externe. Le test inspecte l’appel simulé à `fetch` plutôt que de reproduire ou contourner l’encodage de la passerelle.

## Verification

**Commands:**

- `npm test -- --run src/ui/ConversationImport.test.tsx src/application/import/remoteGateway.test.ts src/application/import/chatgptShare.test.ts` -- expected: consentement, échecs atomiques, minimisation et extraction locale passent ensemble.
- `npm run lint` -- expected: les tests et la documentation associée ne créent aucune erreur de type ou de lint.
- `npm run build` -- expected: le build statique Vite aboutit.
