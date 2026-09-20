---
title: 'Story 5.1 v2 — Consentir à l’import distant multi-fournisseur'
type: 'feature'
created: '2026-09-20'
status: 'ready-for-dev'
route: 'dispatch'
version: 'v2-multi-provider'
supersedes_for_future_dispatch:
  - '_bmad-output/implementation-artifacts/spec-5-1-consentir-a-l-import-distant-avant-toute-requete.md'
depends_on:
  - '_bmad-output/implementation-artifacts/spec-5-4-ajouter-les-adaptateurs-de-partage-multi-fournisseur.md'
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

## Périmètre

Adapter le dialogue V1 sans effacer sa fiche `done` : après résolution d’une URL ChatGPT, Claude, Mistral ou Gemini, l’UI affiche le fournisseur et demande un consentement ponctuel pour le même `ResolvedShare`. L’autorisation est liée par identité à `policyVersion` et à l’origine proxy, consommée une fois, et reste distincte de la confirmation de remplacement des blocs.

## Dépendances

- Dépend de 5.4 pour la résolution, le fournisseur détecté et le `ResolvedShare` attesté.
- La reprise 5.2 est le seul consommateur réseau de l’autorisation ; aucun appel direct au fournisseur n’est admis depuis l’UI.
- Réutilise les composants, tests d’accessibilité et messages de consentement V1, en les généralisant sans logique de parsing dans React.

## Tâches

- [ ] Remplacer l’état de consentement URL-only par une capacité opaque liée au `ResolvedShare`, `policyVersion` et à la configuration proxy courantes.
- [ ] Afficher le fournisseur détecté, l’URL canonique sortante, `corsproxy.io`, les métadonnées possibles, les données locales exclues et les liens documentés.
- [ ] Invalider l’autorisation et toute réponse en attente après URL, fournisseur, adaptateur/politique, limites ou proxy modifiés ; conserver Annuler, `Escape` et l’import manuel sans trafic.
- [ ] Étendre les tests UI aux quatre fournisseurs, au focus, à l’unicité de « Continuer », à l’invalidation et à l’absence de mutation.

## Critères d’acceptation

- Given un `ResolvedShare` d’un adaptateur enregistré, when la personne demande l’analyse, then le dialogue s’ouvre avant tout effet réseau et nomme ce fournisseur.
- Given un consentement affiché, when la personne continue, then une seule capacité utilisable pour ce même `ResolvedShare`, `policyVersion` et proxy est remise à 5.2.
- Given refus, Annuler, `Escape`, import manuel ou changement d’identité/politique, when le dialogue se ferme ou devient périmé, then aucune requête ni mutation de session ne survient.
- Given une navigation clavier, when le dialogue s’ouvre, then le focus est contenu, restauré à la fermeture et les informations ne reposent pas sur la couleur.

## Vérification

- `npm test -- --run src/ui/ConversationImport.test.tsx`
- `npm run lint`
- `npm run build`
