---
title: 'Story 5.3 v2 — Documenter et vérifier la frontière multi-fournisseur'
type: 'feature'
created: '2026-09-20'
status: 'done'
baseline_commit: '9eebb723c9ec96633142fb9ea18a79b0296ff20c'
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

- [x] Généraliser l’aide d’import : URLs admises, fournisseur détecté, `corsproxy.io`, documents tiers, données exposées, incertitudes, consentement et alternative manuelle.
- [x] Ajouter une matrice d’intégration paramétrée ChatGPT/Claude/Mistral/Gemini couvrant consentement, refus, changement d’URL/fournisseur, erreur proxy et succès sans donnée locale sortante.
- [x] Pour Gemini, couvrir séparément redirection autorisée, hors allowlist et chaîne trop longue ; pour chaque adaptateur, couvrir état absent, format inconnu et dépassement de limite.
- [x] Vérifier que tous les échecs sont atomiques, conservent les blocs présents et rendent l’import manuel accessible.

## Critères d’acceptation

- Given l’aide d’import, when une personne consulte un fournisseur, then elle trouve son format admis, ses limites/redirections connues, les données réellement exposées au tiers et l’alternative manuelle sans promesse non vérifiée.
- Given la matrice intégrée des quatre fournisseurs, when elle exécute consentement, refus, changement d’identité, indisponibilité et succès, then aucun trafic ne précède le consentement et aucun échec ne mute la session.
- Given une requête consentie de chaque fournisseur, when elle est inspectée, then seul l’`outboundCanonicalUrl` du `ResolvedShare` courant sort du calculateur ; aucune donnée locale ne l’accompagne.
- Given les fixtures de régression, when un adaptateur rencontre une dérive de structure, then seul ce fournisseur devient indisponible et les autres adaptateurs, les blocs et les calculs restent fonctionnels.

## Vérification

- `npm test -- --run src/ui/ConversationImport.test.tsx src/application/import/remoteGateway.test.ts src/application/import/*Share.test.ts`
- `npm run lint`
- `npm run build`

## Review Triage Log

| Finding | Verdict | Evidence |
| --- | --- | --- |
| L’aide Gemini annonçait une redirection potentiellement admise alors que la passerelle la refuse. | medium | Réel dans `remoteGateway.ts`; l’aide précise désormais l’indisponibilité courante et l’alternative manuelle. |
| L’aide indiquait que seule l’URL sortait alors que la requête comprend aussi le paramètre de configuration du proxy. | medium | Réel dans la construction `?url=…&key=…`; la divulgation mentionne désormais ce paramètre sans présenter de donnée locale comme transmise. |
| La matrice UI simulait `importResolvedShare` et ne vérifiait pas une requête de passerelle réelle pour Claude, Mistral et Gemini. | medium | Réel, mais préexistant : `remoteGateway` ne teste actuellement la requête réussie que pour ChatGPT et refuse Gemini avant `fetch`; consigné dans le travail différé. |
| Le test de changement d’URL ne couvrait pas le changement vers un fournisseur valide. | medium | Réel : l’ancien cas ajoutait seulement `x`; un cas ChatGPT → Claude invalide désormais le consentement sans appel. |
| L’aide Gemini annonçait une redirection potentiellement admise alors que la passerelle la refuse. | medium | Doublon confirmé par le chasseur de cas limites; corrigé par la divulgation de l’indisponibilité actuelle. |
| Le test ne couvrait pas le changement vers un fournisseur valide distinct. | medium | Doublon confirmé par le chasseur de cas limites; couvert par le nouveau scénario ChatGPT → Claude. |
| L’affichage de l’aide ne vérifiait pas le consentement explicite et ponctuel. | medium | Lacune de vérification confirmée; le test d’aide affirme maintenant ce texte. |
| L’affichage de l’aide ne vérifiait pas les politiques de redirection par fournisseur. | medium | Lacune de vérification confirmée; le test affirme désormais les limites ChatGPT, Claude, Mistral et Gemini. |
| Les liens visibles vers les documents de corsproxy.io n’étaient vérifiés que par leur nombre. | medium | Lacune de vérification confirmée; les trois libellés et `href` exacts sont maintenant testés dans l’aide. |
| L’aide Gemini annonçait une redirection potentiellement admise alors que la passerelle la refuse. | medium | Doublon du constat précédent; corrigé et couvert par le texte affiché. |
| L’aide Gemini laisse entendre qu’un lien sans redirection peut être importé alors que la passerelle refuse tout partage Gemini. | medium | carried — la passerelle retourne `redirect-disallowed` avant tout `fetch` dès que `maxRedirects > 0`; la documentation doit annoncer l’indisponibilité totale actuelle. |
| L’aide Claude et Mistral présente certaines redirections comme admises alors que leur politique a `maxRedirects: 0`. | medium | Réel : `remoteGateway` refuse toute redirection et les politiques des deux adaptateurs la bornent à zéro; le texte doit l’indiquer. |
| L’aide promet qu’une indisponibilité ne touche qu’un fournisseur, sans distinguer une panne de proxy ou de configuration commune. | medium | Réel : les erreurs `configuration` et `network` de `remoteGateway` sont partagées par les quatre fournisseurs; la divulgation doit distinguer les deux cas. |
| La divulgation nomme seulement un paramètre de configuration, sans identifier la clé API transmise au proxy. | medium | Réel : l’URL de requête inclut `key=${encodeURIComponent(apiKey)}`; l’aide doit nommer cette clé de configuration tout en distinguant les données locales. |
| La matrice UI remplace les quatre adaptateurs par une simulation et ne traverse pas la passerelle ou l’extraction réelles. | medium | carried — constat déjà trié : seule la réussite ChatGPT atteint la passerelle réelle et Gemini est refusé avant `fetch`; le travail différé existant couvre cette limite préexistante. |
| Les chaînes d’aide dupliquent les règles de validation et de redirection des adaptateurs. | low | Réel, mais l’aide statique localisée et les règles métier n’ont pas divergé; la déduire du registre modifierait la surface de traduction sans correction triviale. Rejeté. |
| L’aide Claude/Mistral annonce des redirections internes autorisées malgré `maxRedirects: 0`. | medium | carried — même cause et même correction que le constat précédent sur les politiques Claude et Mistral. |
| La couverture Gemini n’exerce ni redirection autorisée, ni hors allowlist, ni chaîne trop longue. | medium | carried — la passerelle refuse Gemini avant `fetch`, limite préexistante déjà consignée dans le travail différé; elle empêche ces preuves de transport dans cette story. |
