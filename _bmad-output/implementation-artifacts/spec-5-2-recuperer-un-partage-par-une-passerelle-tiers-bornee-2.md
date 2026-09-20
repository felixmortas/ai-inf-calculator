---
title: 'Finaliser la passerelle tiers bornée pour les imports ChatGPT'
type: 'bugfix'
created: '2026-09-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '0541174823ca3461631202f0ab1bc6dcfd16c167'
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/implementation-artifacts/spec-5-2-recuperer-un-partage-par-une-passerelle-tiers-bornee.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La première implémentation de la story 5.2 isole déjà CorsProxy et passe les vérifications ciblées, mais les corps de réponses HTTP refusées ne sont pas explicitement abandonnés et la passerelle dépend du module de l’adaptateur qu’elle alimente. Ces deux détails fragilisent la frontière réseau censée rester autonome et atomique.

**Approach:** Finaliser la passerelle sans modifier le flux de consentement 5.1 : déplacer les invariants partagés hors du cycle, abandonner de manière sûre tout corps de réponse non exploité et renforcer les tests qui prouvent cette absence de livraison partielle.

## Boundaries & Constraints

**Always:** Conserver comme seule destination distante `https://corsproxy.io/`, le GET sans données locales, l’autorisation ponctuelle liée à l’URL et l’extraction HTML exclusivement locale. Pour toute réponse HTTP non admise, annuler le corps avant de retourner l’erreur typée ; un échec de nettoyage ne doit jamais masquer l’erreur de configuration, politique ou HTTP. Les limites de 10 s et 2 MiB, ainsi que les messages non sensibles, restent inchangés.

**Never:** Ne pas appeler directement `chatgpt.com`, changer l’interface de consentement, le reducer, les blocs, les calculs, le registre V1, le format du parseur ou ajouter une persistance. Ne pas exposer de clé CorsProxy dans le dépôt, les tests, les messages ou les journaux.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Réponse proxy refusée | 401, 403 ou autre statut non-OK avec un corps | Le corps est annulé et aucun HTML ne quitte la passerelle. | Retourne respectivement `configuration`, `policy` ou `http`, même si `cancel()` échoue. |
| Réponse proxy admise | 200 et HTML dans les bornes | Seul le texte borné atteint l’extracteur local. | Les limites de délai et taille gardent leurs erreurs atomiques. |
| Construction des dépendances | Import de la passerelle ou de l’adaptateur | Les constantes de validation et limites sont partagées sans dépendance circulaire. | Aucun changement fonctionnel ni appel réseau supplémentaire. |

</frozen-after-approval>

## Code Map

- `src/application/import/remoteGateway.ts` -- frontière réseau à corriger : dépend actuellement de `chatgptShare.ts` et retourne les réponses HTTP non-OK sans annuler leur corps.
- `src/application/import/chatgptShare.ts` -- adaptateur HTML local ; conserver la composition passerelle puis extracteur, en remplaçant les imports d’invariants si nécessaire.
- `src/application/import/chatgptShareUrl.ts` -- nouveau module pur attendu pour le validateur canonique et les limites aujourd’hui partagés par les deux modules.
- `src/application/import/remoteGateway.test.ts` -- compléter les preuves d’annulation des corps 401, 403 et HTTP générique, y compris lorsque le nettoyage échoue.
- `src/application/import/chatgptShare.test.ts` -- garder la preuve de composition injectée et adapter seulement les imports publics déplacés.
- `src/application/import/types.ts` -- conserver l’union d’erreurs existante sans élargissement.

## Tasks & Acceptance

**Execution:**

- [x] `src/application/import/chatgptShareUrl.ts`, `src/application/import/remoteGateway.ts` et `src/application/import/chatgptShare.ts` -- extraire les invariants ChatGPT purs et annuler les corps non admis avant tout retour d’erreur -- rendre la frontière indépendante et sans réponse inutilisée.
- [x] `src/application/import/remoteGateway.test.ts` et `src/application/import/chatgptShare.test.ts` -- couvrir l’annulation et l’échec de nettoyage pour chaque statut non admis, puis préserver la composition locale -- verrouiller les résultats atomiques et l’absence de régression du parseur.

**Acceptance Criteria:**

- Given une réponse 401, 403 ou HTTP non-OK avec un corps, when `remoteGateway` la traite, then le corps est annulé une fois et aucun HTML ni événement n’est retourné.
- Given l’annulation d’un corps refusé échoue, when la passerelle termine, then elle retourne toujours l’erreur discriminée d’origine sans détail de nettoyage.
- Given les modules d’import sont chargés, when la passerelle emploie validation et limites, then ils n’importent plus l’un l’autre et les garanties CorsProxy existantes restent inchangées.

## Implementation Notes

- 2026-09-20 — Les limites et la validation canoniques vivent dans `chatgptShareUrl.ts`, module pur importé par l’adaptateur et la passerelle. Chaque statut HTTP non admis abandonne désormais son corps best-effort avant de construire son erreur typée ; le nettoyage ne peut pas remplacer cette erreur.

## Spec Change Log

## Review Triage Log

- medium — patch — La revue de la story 5.1 a relevé que les corps d’erreur HTTP de la passerelle n’étaient pas abandonnés ; cette reprise corrige cette fuite de ressource dans le périmètre réel de 5.2.
- low — patch — `chatgptShare.ts` ne réexporte plus ses invariants historiques ; aucun appel interne ne dépend de cet export, mais le conserver par réexport pur évite une rupture de consommateur sans recréer le cycle.
- low — patch — Seul le statut 403 est exercé jusqu’au résultat `ImportResult` ; paramétrer cette composition pour 401, 403 et HTTP générique verrouille l’absence d’événement pour toute erreur HTTP refusée.
- low — patch — Les assertions partielles de l’erreur de nettoyage ne verrouillent pas explicitement l’absence de détail de nettoyage ; comparer l’erreur complète préserve le contrat non sensible.
- false — La dépendance circulaire ne se produit plus : `remoteGateway.ts` importe seulement `chatgptShareUrl.ts`, tandis que `chatgptShare.ts` dépend de la passerelle ; le graphe observé et le build confirment ce sens unique. Un test textuel du graphe n’apporterait pas une défaillance utilisateur démontrée.
- medium — patch — `discardResponseBody` attend `cancel()`, qui peut ne jamais se résoudre ; dans ce cas l’erreur HTTP typée ne retourne jamais et le signal d’expiration ne peut interrompre cet await. L’annulation doit être déclenchée best-effort sans l’attendre, avec un test de promesse pendante.
- medium — carried patch — La lacune de nettoyage pendante est également relevée par la revue de vérification : les tests ne couvrent que l’annulation résolue ou rejetée, pas une annulation jamais résolue.

## Design Notes

Un module d’invariants pur garde l’adaptateur comme transformation déterministe `HTML → ImportResult` et la passerelle comme unique détenteur du transport. L’annulation best-effort est délibérément isolée : elle nettoie le flux sans transformer l’erreur métier déjà déterminée par le statut HTTP.

## Verification

**Commands:**

- `npm test -- --run src/application/import/remoteGateway.test.ts src/application/import/chatgptShare.test.ts` -- expected: annulation, erreurs atomiques et extraction locale passent.
- `npm run lint` -- expected: types et frontières de modules sont valides.
- `npm run build` -- expected: le build statique Vite aboutit.
