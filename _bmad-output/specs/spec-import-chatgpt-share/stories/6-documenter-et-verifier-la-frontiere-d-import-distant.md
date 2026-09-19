---
title: 'Documenter et vérifier la frontière d’import distant'
type: 'feature'
created: '2026-09-19'
status: 'backlog'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/specs/spec-import-chatgpt-share/SPEC.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-09-19.md'
---

## Intent

**Problème :** Une exception de confidentialité ne peut pas rester implicite dans le code : la personne doit pouvoir comprendre le tiers, les limites réellement connues et son alternative locale, tandis que les tests doivent empêcher une régression d’exfiltration.

**Approche :** Mettre à jour l’aide utilisateur avec les faits vérifiés sur `corsproxy.io` et compléter la couverture d’intégration de la frontière : consentement, requête minimale, parsing local, échec atomique et continuité du parcours manuel.

## Boundaries & Constraints

**Always :** Citer la documentation, la politique de confidentialité et les conditions de `corsproxy.io`. Déclarer que le tiers reçoit au minimum l’URL de partage et peut recevoir IP, agent utilisateur, horodatages et compteurs de requêtes ; ses conditions permettent le traitement du contenu proxyé nécessaire au service. Documenter l’absence de transmission par le calculateur des blocs, fichiers, résultats et paramètres locaux, sans conclure que le tiers ne traite ni ne conserve jamais la page. Rappeler le consentement par requête et la revue D-4 avant publication.

**Never :** Ne pas présenter une supposition comme garantie fournisseur, masquer l’alternative manuelle, ni vérifier seulement le succès nominal. Ne pas élargir les données admises par la passerelle au prétexte de la documentation ou des tests.

## Tasks & Acceptance

**Execution :**

- [ ] Mettre à jour `docs/importer-un-partage-chatgpt.md` avec le consentement, les données transmises, les liens tiers et le parcours manuel.
- [ ] Ajouter les tests d’intégration du parcours consentement → passerelle → parsing local et de ses erreurs.
- [ ] Vérifier l’absence de transmission des données locales et la conservation de la session à chaque défaillance.
- [ ] Documenter la revue à chaque publication et la possibilité de désactiver l’exception si le fournisseur change.

**Acceptance Criteria :**

- Given l’aide d’import, when une personne lit la section distante, then elle trouve le fournisseur, les liens vers ses documents, les données réellement exposées, les incertitudes de traitement et l’alternative manuelle.
- Given la couverture d’intégration, when consentement, annulation, changement d’URL, indisponibilité et succès sont exercés, then les appels réseau ne surviennent qu’après consentement et les échecs préservent la session.
- Given une demande distante consentie, when son contenu est vérifié, then seule l’URL ChatGPT validée quitte le calculateur ; fichiers, blocs, résultats et paramètres locaux restent absents de la requête.
- Given le fournisseur devient indisponible ou sa politique doit être revue, when la fonction ne peut être activée, then l’aide et le produit maintiennent l’import manuel sans promesse non vérifiée.

## Verification

- `npm test -- --run src/ui src/application/import` — parcours intégrés et invariants de frontière passent.
- `npm run lint` — TypeScript et lint passent sans erreur.
- `npm run build` — le build Vite aboutit.
