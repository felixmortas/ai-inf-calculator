---
title: 'Story 5.2 v2 — Récupérer un partage multi-fournisseur par une passerelle bornée'
type: 'feature'
created: '2026-09-20'
status: 'done'
baseline_commit: 'b709a1c1f3d1f1697cf5e7dbf56a2aaa7c4463fd'
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

Généraliser `remoteGateway` sans modifier les fiches V1 : il accepte seulement un `ResolvedShare` attesté et le consentement exact correspondant, construit une requête totalement figée vers `https://corsproxy.io/`, puis remet du HTML borné à l’extracteur local associé. La seule destination encodée est `outboundCanonicalUrl`. Tant que CorsProxy ne peut pas attester une chaîne de redirection, un adaptateur dont la politique autorise un saut est refusé localement, avant toute requête ; un proxy maîtrisé remplacera ultérieurement cette règle.

## Dépendances

- Dépend de 5.4 pour retrouver l’adaptateur, ses limites et sa politique sans lire de champs contrôlés par l’appelant.
- Dépend de 5.1 v2 pour l’autorisation à usage unique ; 5.3 v2 exercera ensuite le parcours intégré.
- Préserve la frontière V1 : aucun bloc, fichier, résultat, catalogue, paramètre, cookie applicatif ou jeton de session ne rejoint la requête.

## Tâches

- [x] Remplacer les paramètres URL/consentement ChatGPT par `ResolvedShare` attesté et autorisation liée ; rejeter valeurs forgées, clonées ou périmées avant `fetch`.
- [x] Figer méthode, chemin, paramètres, encodage, en-têtes, cache, référent et `credentials: omit` ; n’encoder que `outboundCanonicalUrl`.
- [x] Appliquer les limites globales resserrées par l’adaptateur : URL, délai total, octets décodés, redirections et travail d’extraction.
- [x] Refuser avant `fetch` tout adaptateur dont la politique autorise une redirection tant que CorsProxy ne peut pas l’attester ; retourner des erreurs `consent`, politique/configuration, réseau, HTTP, redirection, délai, taille ou format, sans résultat partiel.

## Critères d’acceptation

- Given un `ResolvedShare` attesté et son consentement courant, when la passerelle importe, then elle appelle seulement `corsproxy.io` avec une requête figée dont seule `outboundCanonicalUrl` est la destination.
- Given une valeur forgée, clonée, périmée ou sans consentement correspondant, when un import est demandé, then aucun `fetch` ne part et l’erreur typée conserve la session.
- Given une politique de redirection par adaptateur, when elle autorise au moins un saut, then l’import est refusé atomiquement avant tout `fetch` tant que CorsProxy ne fournit pas d’attestation vérifiable.
- Given une réponse admise ou un échec réseau/HTTP/délai/taille/format, when le flux se termine, then seul l’extracteur local associé reçoit du texte borné ; aucun HTML partiel n’est appliqué.

## Vérification

- `npm test -- --run src/application/import/remoteGateway.test.ts src/application/import/*Share.test.ts`
- `npm run lint`
- `npm run build`

## Review Triage Log

| Verdict | Route | Evidence |
| --- | --- | --- |
| medium | intent_gap | `corsproxy.io` suit la destination côté serveur, mais son API documentée n’expose ni contrôle ni attestation de la chaîne de redirection ; la passerelle ne peut donc pas vérifier un saut aval contre l’allowlist. |
| medium | intent_gap | Gemini autorise un saut dans sa politique, mais toute réponse réussie est aujourd’hui refusée par prudence faute d’attestation ; la fiche ne désigne aucun protocole proxy permettant d’autoriser le cas attesté. |
| medium | patch | Le repli UI vers `importFromUrl` conservait une voie URL libre ; il est supprimé et l’absence d’adaptateur attesté produit une erreur de configuration. |
| high | patch | Les prédicats injectés pouvaient attester un objet forgé ; l’attestation est désormais contrôlée par un registre privé commun au registre et à la passerelle. |
| high | patch | Un `fetch` ou un flux qui ignore `AbortSignal` pouvait rester bloqué ; les deux attentes sont désormais bornées par une course avec le délai total. |
| medium | patch | L’annulation d’un corps trop grand pouvait bloquer la réponse d’erreur ; elle est maintenant best-effort sans attente. |
| medium | patch | Les tests de délai et de dépassement par flux ont été restaurés avec horloges simulées et corps sans `content-length`. |
| low | patch | Les tests d’interaction existants ne confirmaient pas le consentement ; ils le font désormais et fournissent une clé proxy de test. |
| medium | patch | Les parcours réussis des adaptateurs Claude, Mistral et Gemini, le mismatch fournisseur et l’usage unique ont une couverture dédiée. |
| medium | patch | Les réponses 401, 403, HTTP générique et les annulations de nettoyage sont à nouveau vérifiées comme erreurs atomiques. |

## Spec Change Log

- 2026-09-21 — Décision utilisateur : interdire temporairement l’import pour tout adaptateur dont la politique autorise une redirection, plutôt que de faire confiance à une chaîne non attestable par CorsProxy. **KEEP:** capacité attestée à usage unique, requête proxy minimisée, limites bornées et erreurs atomiques.
