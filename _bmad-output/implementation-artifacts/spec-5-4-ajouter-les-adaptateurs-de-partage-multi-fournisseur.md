---
title: 'Story 5.4 — Ajouter les adaptateurs de partage multi-fournisseur'
type: 'feature'
created: '2026-09-20'
status: 'ready-for-dev'
route: 'dispatch'
version: 'v2-multi-provider'
depends_on:
  - '_bmad-output/implementation-artifacts/spec-5-1-consentir-a-l-import-distant-avant-toute-requete.md'
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/SPEC.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

## Périmètre

Étendre le socle ChatGPT V1, sans réécrire son historique, en livrant le registre fermé et les adaptateurs isolés `chatgpt`, `claude`, `mistral` et `gemini`. Le registre est seul habilité à résoudre une URL et à émettre un `ResolvedShare` opaque, immuable et attesté ; chaque adaptateur possède validation/canonicalisation, limites, politique de redirection, extraction locale et fixtures propres.

## Dépendances

- Réutilise les événements normalisés, la prévisualisation et l’extracteur ChatGPT existants comme contrat de sortie, sans mutualiser les heuristiques HTML.
- Précède les reprises 5.1, 5.2 et 5.3 : elles consomment le `ResolvedShare`, les politiques et les fixtures introduits ici.
- Ne modifie ni les blocs, ni la tokenisation, ni les calculs, ni l’historique de session.

## Tâches

- [ ] Définir le contrat `ImportProvider`, `ResolvedShare`, limites et erreurs communes ; rendre l’attestation non forgeable hors du registre.
- [ ] Ajouter les validateurs/canonicaliseurs et extracteurs locaux distincts Claude, Mistral et Gemini ; conserver ChatGPT comme adaptateur distinct.
- [ ] Définir les politiques statiques d’URL et de redirection : aucune redirection implicite ; Gemini autorise seulement sa chaîne allowlistée et bornée.
- [ ] Ajouter les fixtures HTML publiques minimisées et les tests unitaires du registre, de chaque adaptateur, de ses limites et de ses erreurs.

## Critères d’acceptation

- Given une URL publique de chacun des quatre fournisseurs, when le registre la résout, then il sélectionne le bon adaptateur et retourne un `ResolvedShare` attesté, ou une erreur sans requête.
- Given une valeur `ResolvedShare` forgée ou clonée, when elle est présentée à une frontière d’import, then elle est refusée sans accès réseau ni mutation.
- Given la fixture minimisée d’un fournisseur, when son extracteur l’analyse, then il restitue l’ordre des deux rôles textuels et signale les contenus non textuels/inaccessibles sans les lire ni les inventer.
- Given une URL, une query, un fragment, un hôte, un format, une redirection ou une limite refusés, when l’adaptateur les évalue, then il retourne une erreur typée atomique et laisse le parcours manuel disponible.
- Given Gemini, when une redirection est autorisée, hors allowlist ou trop longue, then les trois cas sont couverts par des tests distincts.

## Vérification

- `npm test -- --run src/application/import/registry.test.ts src/application/import/*Share.test.ts`
- `npm run lint`
- `npm run build`
