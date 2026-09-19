---
title: 'Passerelle proxy tiers bornée et allowlistée'
type: 'feature'
created: '2026-09-19'
status: 'backlog'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/specs/spec-import-chatgpt-share/SPEC.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md'
---

## Intent

**Problème :** Une lecture directe d’un partage ChatGPT peut être bloquée par CORS. Contourner ce blocage sans frontière dédiée risquerait d’exfiltrer l’état local ou de disséminer une dépendance tierce dans le parseur et les calculs.

**Approche :** Créer `application/import/remoteGateway`, unique adaptateur réseau de l’import distant. Après consentement, il construit une requête bornée vers `corsproxy.io` depuis la seule URL ChatGPT validée, puis remet le HTML comme texte non exécutable à l’extracteur local existant.

## Boundaries & Constraints

**Always :** Allowlister exactement `https://corsproxy.io/`, configurer son mécanisme de clé API et l’autorisation de domaine sans considérer une clé embarquée comme un secret, et borner délai et octets lus. Conserver le parsing, les limites de messages, le regroupement et les calculs en local. Renvoyer des erreurs discriminées de consentement, politique/configuration, réseau, HTTP, délai, taille et format ; elles sont atomiques et conservent la session.

**Never :** Ne pas accepter un hôte, chemin de proxy, destination ou redirection issus de l’utilisateur. Ne pas transmettre bloc, fichier, résultat, catalogue, paramètre de calcul, état de reducer, cookie applicatif, jeton de session ni secret. Ne pas suivre de lien, artifact ou ressource citée, exécuter du HTML ou introduire une dépendance de domaine vers le fournisseur.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Demande autorisée | Consentement courant et URL ChatGPT validée | Requête construite seulement vers l’origine allowlistée | HTML borné passé comme texte au parseur local |
| Demande non autorisée | Consentement absent, annulé ou périmé | Aucun appel réseau | Erreur de consentement typée, session intacte |
| Entrée hostile | URL proxy/destination/chemin arbitraire ou URL ChatGPT invalide | Aucune construction de requête | Erreur de validation/politique |
| Défaillance tiers | Réseau, HTTP, délai, taille ou configuration | Aucun HTML partiel ni mutation | Erreur actionnable, parcours manuel proposé |
| HTML admis | Réponse dans les bornes | Extraction locale existante et prévisualisation | Format inconnu refusé atomiquement |

## Code Map

- `src/application/import/remoteGateway.ts` et types/tests associés -- nouvelle frontière réseau isolée et sa configuration non pilotable par l’entrée utilisateur.
- `src/application/import/chatgptShare.ts` -- conserver la validation et l’extraction locale ; extraire si nécessaire une frontière de parsing sans y loger l’accès proxy.
- `src/application/import/types.ts` -- étendre les unions d’erreurs sans casser le contrat générique des adaptateurs.
- `src/ui/ConversationImport.tsx` -- ne transmettre à la passerelle que le consentement courant et l’URL déjà validée.

## Tasks & Acceptance

**Execution :**

- [ ] Introduire la passerelle et sa configuration allowlistée `corsproxy.io`.
- [ ] Séparer le parsing local de l’effet réseau afin que le HTML soit traité comme texte borné.
- [ ] Faire transiter les échecs typés sans résultat partiel ni mutation de conversation.
- [ ] Écrire les tests de construction de requête, limites, non-transmission de données locales et erreurs.

**Acceptance Criteria :**

- Given un consentement courant et une URL validée, when le parcours lance l’import distant, then la passerelle appelle uniquement `https://corsproxy.io/` en construisant la destination depuis cette URL et rien d’autre.
- Given une absence de consentement, une annulation ou une URL modifiée, when une récupération est tentée, then aucune requête n’est lancée et une erreur typée préserve la session.
- Given une requête créée, when ses données sont inspectées, then aucun bloc, fichier, résultat, catalogue, paramètre, cookie applicatif ou jeton de session n’y est présent.
- Given une réponse trop lente, trop grande, HTTP invalide, réseau indisponible ou politique/configuration non valide, when la passerelle échoue, then elle renvoie une erreur actionnable sans HTML ni import partiel et la voie manuelle reste disponible.
- Given un HTML borné reçu, when il est analysé, then seul l’extracteur local le traite comme texte non exécutable, sans suivi de liens ni téléchargement d’artifact.

## Verification

- `npm test -- --run src/application/import` — passerelle, parseur local, erreurs et limites passent.
- `npm run lint` — TypeScript et lint passent sans erreur.
- `npm run build` — le build Vite aboutit.
