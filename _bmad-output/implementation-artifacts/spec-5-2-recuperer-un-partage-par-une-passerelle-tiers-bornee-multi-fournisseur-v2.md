---
title: 'Story 5.2 v2 — Récupérer un partage multi-fournisseur par une passerelle bornée'
type: 'feature'
created: '2026-09-20'
status: 'ready-for-dev'
route: 'dispatch'
version: 'v2-multi-provider'
supersedes_for_future_dispatch:
  - '_bmad-output/implementation-artifacts/spec-5-2-recuperer-un-partage-par-une-passerelle-tiers-bornee.md'
  - '_bmad-output/implementation-artifacts/spec-5-2-recuperer-un-partage-par-une-passerelle-tiers-bornee-2.md'
depends_on:
  - '_bmad-output/implementation-artifacts/spec-5-4-ajouter-les-adaptateurs-de-partage-multi-fournisseur.md'
  - '_bmad-output/implementation-artifacts/spec-5-1-consentir-a-l-import-distant-multi-fournisseur-v2.md'
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

## Périmètre

Généraliser `remoteGateway` sans modifier les fiches V1 : il accepte seulement un `ResolvedShare` attesté et le consentement exact correspondant, construit une requête totalement figée vers `https://corsproxy.io/`, puis remet du HTML borné à l’extracteur local associé. La seule destination encodée est `outboundCanonicalUrl`.

## Dépendances

- Dépend de 5.4 pour retrouver l’adaptateur, ses limites et sa politique sans lire de champs contrôlés par l’appelant.
- Dépend de 5.1 v2 pour l’autorisation à usage unique ; 5.3 v2 exercera ensuite le parcours intégré.
- Préserve la frontière V1 : aucun bloc, fichier, résultat, catalogue, paramètre, cookie applicatif ou jeton de session ne rejoint la requête.

## Tâches

- [ ] Remplacer les paramètres URL/consentement ChatGPT par `ResolvedShare` attesté et autorisation liée ; rejeter valeurs forgées, clonées ou périmées avant `fetch`.
- [ ] Figer méthode, chemin, paramètres, encodage, en-têtes, cache, référent et `credentials: omit` ; n’encoder que `outboundCanonicalUrl`.
- [ ] Appliquer les limites globales resserrées par l’adaptateur : URL, délai total, octets décodés, redirections et travail d’extraction.
- [ ] Vérifier/attester par le proxy chaque redirection permise ; retourner des erreurs `consent`, politique/configuration, réseau, HTTP, redirection, délai, taille ou format, sans résultat partiel.

## Critères d’acceptation

- Given un `ResolvedShare` attesté et son consentement courant, when la passerelle importe, then elle appelle seulement `corsproxy.io` avec une requête figée dont seule `outboundCanonicalUrl` est la destination.
- Given une valeur forgée, clonée, périmée ou sans consentement correspondant, when un import est demandé, then aucun `fetch` ne part et l’erreur typée conserve la session.
- Given une politique de redirection par adaptateur, when un saut est autorisé, refusé ou dépasse la limite, then le proxy atteste le saut admis ou l’import échoue atomiquement.
- Given une réponse admise ou un échec réseau/HTTP/délai/taille/format, when le flux se termine, then seul l’extracteur local associé reçoit du texte borné ; aucun HTML partiel n’est appliqué.

## Vérification

- `npm test -- --run src/application/import/remoteGateway.test.ts src/application/import/*Share.test.ts`
- `npm run lint`
- `npm run build`
