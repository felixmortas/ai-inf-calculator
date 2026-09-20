---
title: 'Story 5.3 v2 — Documenter et vérifier la frontière multi-fournisseur'
type: 'feature'
created: '2026-09-20'
status: 'ready-for-dev'
route: 'dispatch'
version: 'v2-multi-provider'
supersedes_for_future_dispatch:
  - '_bmad-output/implementation-artifacts/spec-5-3-documenter-et-verifier-la-frontiere-d-import-distant.md'
depends_on:
  - '_bmad-output/implementation-artifacts/spec-5-4-ajouter-les-adaptateurs-de-partage-multi-fournisseur.md'
  - '_bmad-output/implementation-artifacts/spec-5-1-consentir-a-l-import-distant-multi-fournisseur-v2.md'
  - '_bmad-output/implementation-artifacts/spec-5-2-recuperer-un-partage-par-une-passerelle-tiers-bornee-multi-fournisseur-v2.md'
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/SPEC.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

## Périmètre

Remplacer pour le futur dispatch la documentation et les preuves d’intégration ChatGPT-only, sans toucher à leur trace V1. L’aide décrit les quatre adaptateurs, le tiers et les limites connues ; les tests traversent résolution, consentement, passerelle, extraction et prévisualisation pour chaque fournisseur.

## Dépendances

- Exécuter après 5.4, 5.1 v2 et 5.2 v2 : cette fiche ne redéfinit ni le registre, ni le consentement, ni le transport.
- Les fixtures minimisées de 5.4 sont les seules entrées de régression ; aucune conversation privée ou lecture réseau réelle n’est admise dans les tests.

## Tâches

- [ ] Généraliser l’aide d’import : URLs admises, fournisseur détecté, `corsproxy.io`, documents tiers, données exposées, incertitudes, consentement et alternative manuelle.
- [ ] Ajouter une matrice d’intégration paramétrée ChatGPT/Claude/Mistral/Gemini couvrant consentement, refus, changement d’URL/fournisseur, erreur proxy et succès sans donnée locale sortante.
- [ ] Pour Gemini, couvrir séparément redirection autorisée, hors allowlist et chaîne trop longue ; pour chaque adaptateur, couvrir état absent, format inconnu et dépassement de limite.
- [ ] Vérifier que tous les échecs sont atomiques, conservent les blocs présents et rendent l’import manuel accessible.

## Critères d’acceptation

- Given l’aide d’import, when une personne consulte un fournisseur, then elle trouve son format admis, ses limites/redirections connues, les données réellement exposées au tiers et l’alternative manuelle sans promesse non vérifiée.
- Given la matrice intégrée des quatre fournisseurs, when elle exécute consentement, refus, changement d’identité, indisponibilité et succès, then aucun trafic ne précède le consentement et aucun échec ne mute la session.
- Given une requête consentie de chaque fournisseur, when elle est inspectée, then seul l’`outboundCanonicalUrl` du `ResolvedShare` courant sort du calculateur ; aucune donnée locale ne l’accompagne.
- Given les fixtures de régression, when un adaptateur rencontre une dérive de structure, then seul ce fournisseur devient indisponible et les autres adaptateurs, les blocs et les calculs restent fonctionnels.

## Vérification

- `npm test -- --run src/ui/ConversationImport.test.tsx src/application/import/remoteGateway.test.ts src/application/import/*Share.test.ts`
- `npm run lint`
- `npm run build`
