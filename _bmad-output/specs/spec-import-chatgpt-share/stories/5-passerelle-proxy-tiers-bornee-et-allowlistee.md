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

**Problème :** Une lecture directe d’un partage public peut être bloquée par CORS. Contourner ce blocage sans frontière dédiée risquerait d’exfiltrer l’état local ou de disséminer une dépendance tierce dans le parseur et les calculs.

**Approche :** Créer `application/import/remoteGateway`, unique adaptateur réseau de l’import distant. Après consentement consommable du même `ResolvedShare` attesté, il construit une requête entièrement figée vers `corsproxy.io` depuis son seul `outboundCanonicalUrl`, applique les limites et redirections de son adaptateur, puis remet le HTML comme texte non exécutable à cet extracteur local.

## Boundaries & Constraints

**Always :** Allowlister exactement `https://corsproxy.io/`, configurer son mécanisme de clé API et l’autorisation de domaine sans considérer une clé embarquée comme un secret, et figer méthode, chemin, paramètres, encodage, en-têtes, cache, référent et `credentials: omit`. Borner délai, octets décodés, redirections et extraction selon les plafonds globaux resserrés par l’adaptateur. Conserver parsing, regroupement et calculs en local. Renvoyer des erreurs discriminées de consentement, politique/configuration, réseau, HTTP, redirection, délai, taille et format ; elles sont atomiques et conservent la session.

**Never :** Ne pas accepter un hôte, chemin de proxy, destination, politique ni redirection issus de l’utilisateur ou d’un adaptateur non attesté. Ne pas accepter un `ResolvedShare` forgé ou cloné. Ne pas transmettre bloc, fichier, résultat, catalogue, paramètre de calcul, état de reducer, cookie applicatif, jeton de session ni secret. Ne pas suivre de lien, artifact ou ressource citée, exécuter du HTML ou introduire une dépendance de domaine vers le fournisseur.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Demande autorisée | Consentement courant et `ResolvedShare` attesté | Requête figée vers la seule origine allowlistée, avec `outboundCanonicalUrl` | HTML borné passé comme texte à son extracteur local |
| Demande non autorisée | Consentement absent, annulé ou périmé | Aucun appel réseau | Erreur de consentement typée, session intacte |
| Entrée hostile | Valeur forgée, URL proxy/destination/chemin arbitraire ou URL fournisseur invalide | Aucune construction de requête | Erreur de validation/politique |
| Redirection | Adaptateur autorisant un saut, notamment Gemini | Le proxy atteste chaque destination allowlistée et la chaîne bornée | `redirect-disallowed` ou erreur de limite, sans import |
| Défaillance tiers | Réseau, HTTP, délai, taille ou configuration | Aucun HTML partiel ni mutation | Erreur actionnable, parcours manuel proposé |
| HTML admis | Réponse dans les bornes | Extraction locale existante et prévisualisation | Format inconnu refusé atomiquement |

## Code Map

- `src/application/import/remoteGateway.ts` et types/tests associés -- nouvelle frontière réseau isolée et sa configuration non pilotable par l’entrée utilisateur.
- `src/application/import/*Share.ts` -- conserver, par adaptateur, validation et extraction locales ; aucun accès proxy dans ces extracteurs.
- `src/application/import/types.ts` -- porter `ResolvedShare`, consentement attesté, politiques, limites et union d’erreurs sans casser le contrat commun.
- `src/ui/ConversationImport.tsx` -- ne transmettre à la passerelle que le consentement courant et le `ResolvedShare` associé.

## Tasks & Acceptance

**Execution :**

- [ ] Introduire la passerelle et sa configuration allowlistée `corsproxy.io` consommant seulement un `ResolvedShare` attesté.
- [ ] Séparer le parsing local de l’effet réseau afin que le HTML soit traité comme texte borné par l’extracteur du fournisseur résolu.
- [ ] Faire transiter les échecs typés, dont redirection, sans résultat partiel ni mutation de conversation.
- [ ] Écrire les tests de valeur forgée/clonée, requête figée, limites et politiques par adaptateur, non-transmission de données locales et erreurs.

**Acceptance Criteria :**

- Given un consentement courant lié au même `ResolvedShare` attesté, when le parcours lance l’import distant, then la passerelle appelle uniquement `https://corsproxy.io/` avec une requête figée dont seule `outboundCanonicalUrl` est encodée.
- Given une valeur forgée/clonée, une absence de consentement, une annulation ou une identité/politique modifiée, when une récupération est tentée, then aucune requête n’est lancée et une erreur typée préserve la session.
- Given une requête créée, when ses données sont inspectées, then aucun bloc, fichier, résultat, catalogue, paramètre, cookie applicatif ou jeton de session n’y est présent.
- Given une réponse trop lente, trop grande, HTTP invalide, réseau indisponible ou politique/configuration non valide, when la passerelle échoue, then elle renvoie une erreur actionnable sans HTML ni import partiel et la voie manuelle reste disponible.
- Given un HTML borné reçu, when il est analysé, then seul l’extracteur local le traite comme texte non exécutable, sans suivi de liens ni téléchargement d’artifact.
- Given un adaptateur qui autorise une redirection, when le proxy ne peut pas attester une destination allowlistée dans la limite, then l’import échoue atomiquement avec une erreur de redirection.

## Verification

- `npm test -- --run src/application/import` — passerelle, parseur local, erreurs et limites passent.
- `npm run lint` — TypeScript et lint passent sans erreur.
- `npm run build` — le build Vite aboutit.
