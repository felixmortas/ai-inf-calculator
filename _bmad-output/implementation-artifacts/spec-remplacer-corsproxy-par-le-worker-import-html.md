---
title: 'Remplacer CorsProxy par le Worker d’import HTML'
type: 'feature'
created: '2026-09-23'
status: 'done'
baseline_commit: '0747fb8585dfbf02267119bf3b57a3b43e3beac1'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="intention validée par la personne — modification réservée à celle-ci">

## Intent

**Problème :** L’import des partages ChatGPT, Claude, Mistral et Gemini dépend encore de corsproxy.io, de sa clé côté navigateur et d’une règle qui bloque Gemini. Le nouveau Worker a un contrat différent et accepte les quatre fournisseurs.

**Approche :** Envoyer uniquement l’URL canonique attestée à `POST /v1/import-html` du Worker, puis conserver l’extraction et la prévisualisation locales. Mettre en accord les formats acceptés, le consentement, l’aide et les vérifications avec le contrat fourni.

## Boundaries & Constraints

**Toujours :** consentement ponctuel avant réseau ; une seule URL de partage initiale validée ; corps JSON `{ "shareUrl": string }` ; aucune donnée de session ni cookie ; HTML complet seulement ; limites locales de 10 secondes et 2 Mio ; échec sans mutation et import manuel disponible. Production : `https://ai-inf-calculator-proxy.felix-mortas.workers.dev/v1/import-html`. Une preview utilise un hôte concret correspondant à `*-ai-inf-calculator-proxy.felix-mortas.workers.dev`, fourni au build ; aucune URL preview n’est inventée.

**Jamais :** clé API CorsProxy, récupération directe du fournisseur par le navigateur, affirmation que les redirections sont contrôlées par le calculateur, déploiement du Worker ou modification de son code.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Résultat attendu | Erreur |
|---|---|---|---|
| Partage valide | UUID ChatGPT, Claude ou Mistral ; ID Gemini de 12 caractères alphanumériques ; consentement courant | Un POST JSON au Worker choisi ; HTML vers l’extracteur local | Aucune |
| URL hors contrat | Forme, hôte, port, query, fragment ou ID invalide | Aucun consentement exploitable ni requête | URL invalide |
| Refus du Worker | HTTP 4xx/5xx, limite de débit, erreur réseau ou corps invalide | Session conservée, import manuel proposé | Erreur typée, sans HTML partiel |
| Réponse bornée | Corps trop grand ou délai dépassé | Pas de prévisualisation | Taille ou délai |

</frozen-after-approval>

## Code Map

- `src/application/import/remoteGateway.ts` — frontière réseau et capacité de consentement ; remplacer GET, clé et blocage Gemini ; préserver lecture bornée.
- `src/application/import/{chatgptShareUrl,claudeShare,mistralShare,geminiShare}.ts` — validateurs actuellement plus permissifs que le Worker ; aligner les IDs et la politique de redirection déclarée.
- `src/ui/ConversationImport.tsx`, `src/i18n/fr.ts` — dialogue, aide, liens et nom du relais ; préserver le comportement de consentement.
- `docs/importer-un-partage-chatgpt.md` — aide publique actuellement propre à CorsProxy et ChatGPT.
- `src/application/import/*.test.ts`, `src/ui/*.test.tsx` — fixtures anciennes, attentes GET/CorsProxy et blocage Gemini.

## Tasks & Acceptance

**Execution:**
- [x] `src/application/import/remoteGateway.ts` — utiliser l’endpoint Worker et la configuration de preview validée, sans secret ; mapper les échecs HTTP et conserver les protections locales.
- [x] `src/application/import/{chatgptShareUrl,claudeShare,mistralShare,geminiShare}.ts` — harmoniser les URL initiales avec les quatre modèles versionnés du Worker.
- [x] `src/i18n/fr.ts`, `src/ui/ConversationImport.tsx`, `docs/importer-un-partage-chatgpt.md` — expliquer le Worker, les redirections automatiques et les données transmises ; enlever les références CorsProxy.
- [x] `src/application/import/*.test.ts`, `src/ui/*.test.tsx` — couvrir quatre fournisseurs, requête minimale, consentement, erreurs, limites et flux manuel.

**Acceptance Criteria:**
- Given un lien valide et un consentement courant, when l’import démarre, then le navigateur poste seulement son URL canonique au Worker configuré.
- Given un refus, une annulation, une erreur ou une réponse devenue obsolète, when le parcours se termine, then la session reste inchangée et l’import manuel reste accessible.
- Given une build preview configurée avec un hôte Worker autorisé, when l’import démarre, then le consentement et la requête désignent ce même hôte.

## Implementation Notes

- La production utilise l’endpoint fixe ; `VITE_IMPORT_HTML_WORKER_URL` accepte uniquement une URL preview concrète correspondant au domaine autorisé. Le consentement mémorise cet endpoint et devient inutilisable si la configuration change.
- La requête POST ne contient que `shareUrl` dans son JSON. La lecture HTML conserve les bornes locales et refuse un corps non HTML ou apparemment incomplet ; le Worker reste responsable du suivi des redirections et de sa propre politique de sécurité.
- Les fixtures des quatre fournisseurs ont été alignées sur les modèles canoniques du Worker. Le délai de test Vitest est passé à 15 secondes pour stabiliser la suite UI sous charge.
- Vérification : `npm run build` réussi ; `npm test -- --run` réussi (22 fichiers, 200 tests).
- Revue : le cas des commentaires HTML a été corrigé. Les couches « Blind Hunter » et « Verification Gap » n’ont pas pu s’exécuter car leur quota d’usage était atteint ; aucune tâche fonctionnelle n’a été différée.

## Spec Change Log

## Review Triage Log

- `low` — `src/application/import/remoteGateway.ts:184` : le contrôle des bornes rejetait un HTML valide avec commentaire avant le doctype ou après `</html>`. Reproduit par le motif de validation ; corrigé en autorisant ces commentaires et le BOM, avec un test dédié.

## Verification

**Commands:**
- `npm test -- --run` — suite verte.
- `npm run build` — compilation et build verts.
