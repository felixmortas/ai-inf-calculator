---
title: 'Story 5.1 v2 — Consentir à l’import distant multi-fournisseur'
type: 'feature'
created: '2026-09-20'
status: 'done'
baseline_commit: 'c2cd21ac21d6edd43252d41380184447d53729ac'
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

- [x] Remplacer l’état de consentement URL-only par une capacité opaque liée au `ResolvedShare`, `policyVersion` et à la configuration proxy courantes.
- [x] Afficher le fournisseur détecté, l’URL canonique sortante, `corsproxy.io`, les métadonnées possibles, les données locales exclues et les liens documentés.
- [x] Invalider l’autorisation et toute réponse en attente après URL, fournisseur, adaptateur/politique, limites ou proxy modifiés ; conserver Annuler, `Escape` et l’import manuel sans trafic.
- [x] Étendre les tests UI aux quatre fournisseurs, au focus, à l’unicité de « Continuer », à l’invalidation et à l’absence de mutation.

## Critères d’acceptation

- Given un `ResolvedShare` d’un adaptateur enregistré, when la personne demande l’analyse, then le dialogue s’ouvre avant tout effet réseau et nomme ce fournisseur.
- Given un consentement affiché, when la personne continue, then une seule capacité utilisable pour ce même `ResolvedShare`, `policyVersion` et proxy est remise à 5.2.
- Given refus, Annuler, `Escape`, import manuel ou changement d’identité/politique, when le dialogue se ferme ou devient périmé, then aucune requête ni mutation de session ne survient.
- Given une navigation clavier, when le dialogue s’ouvre, then le focus est contenu, restauré à la fermeture et les informations ne reposent pas sur la couleur.

## Vérification

- `npm test -- --run src/ui/ConversationImport.test.tsx`
- `npm run lint`
- `npm run build`

## Review Triage Log

| Finding | Verdict | Evidence and route |
| --- | --- | --- |
| `resolvedShareAttestation.ts` exports the minting helper | medium / patch | The helper lets any application module manufacture an attested value, contradicting the registry-only identity contract. Move the attestation set and minting operation back into the registry; only its predicate is needed by the consent boundary. |
| `createRemoteGatewayConsent` accepts a raw URL | medium / patch | The legacy overload canonicalises a URL outside the active closed registry and hard-codes ChatGPT policy. Remove it and migrate the in-repository callers/tests to a share resolved by the registry. |
| Non-ChatGPT dialogs promise a retrieval that their current providers refuse | low / rejected | The reviewed behavior is reachable, but this delivery order expressly reserves the network consumer for story 5.2; this story is required to offer consent for all four providers before that consumer exists. The current error keeps the session unchanged and manual import available. |
| Consent survives changed provider/resolver configuration | high / patch | React can receive new `providers` or `resolve` props while the dialog is open; no dependency invalidates the pending capability. Invalidate pending consent whenever either identity source changes. |
| Arbitrary multi-provider test injection no longer works | low / rejected | The prop is documented as test injection and production uses the closed registry. Restoring a dynamic provider resolver would weaken the required closed-registry path without a user-facing need. |
| Edge: provider/resolver props change with a dialog open | high / patch | This is the same stale-capability defect above: a prop update leaves the old `ResolvedShare` consumable. Cover it with a UI regression test. |
| Edge: singleton injected provider can receive a different resolved provider | false | The singleton fallback exists only for the test adapter and its `importFromUrl` does not select or redirect a real registered provider; the published path has all four providers and requires a matching ID. |
| Gateway attestation boundary has no direct test | medium / patch | Existing tests exercise only the legacy string overload. Add resolved, forged and cloned share tests, including no fetch on rejection. |
| `chatgptShare.test.ts` asserts the old single-provider registry | medium / patch | The assertion conflicts with this diff's deliberate four-provider activation and fails in the normal suite; update it to the registered-provider expectation. |
| Global `Symbol.for` WeakSet can be mutated to forge a resolved share | medium / patch | Confirmé : tout module peut récupérer le `WeakSet` global et y ajouter un clone avant de créer le consentement. Garder l’attestation privée au registre et ne rendre accessible que son prédicat. |
| Edge hunter: global attestation allows forged consent | medium / patch | Confirmé à la même frontière : la clé `Symbol.for` rend le `WeakSet` inscriptible depuis un code applicatif quelconque, donc l’identité n’est plus réservée au registre. |
| Singleton injected provider can differ from the resolved provider | false / carried | Le repli singleton est limité à l’injection de test et le chemin publié utilise le registre fermé avec les quatre identifiants correspondants ; aucun fournisseur réel différent n’est sélectionné dans le produit. |
| Detected provider remains announced after provider or resolver change | low / patch | Confirmé : `invalidateAnalysis` ferme le dialogue mais ne réinitialise pas `detectedProvider`, laissant une annonce périmée dans l’interface. |
| Configuration invalidation removes focus without restoring it | medium / patch | Confirmé : le dialogue est démonté par l’effet de changement de props sans passer par `closeConsent`, contrairement à Annuler et Escape. Restaurer le focus sur le bouton d’analyse. |
| Non-ChatGPT dialog promises a retrieval that current providers refuse | low / rejected / carried | Comportement atteignable mais ordre de livraison imposé : la story 5.2 est le consommateur réseau futur ; 5.1 doit recueillir le consentement des quatre fournisseurs, et l’erreur actuelle conserve session et parcours manuel. |
| Existing gateway still applies the ChatGPT policy to all inputs | false | La passerelle n’est pas le consommateur multi-fournisseur de cette story : le flux UI appelle l’adaptateur résolu, et les adaptateurs non ChatGPT refusent avant tout trafic jusqu’à 5.2. Aucun partage non ChatGPT n’atteint cette validation existante. |
| Default non-ChatGPT UI flow is not tested through Continue | low / patch | Confirmé : les tests ouvrent les quatre dialogues mais ne vérifient pas que Continuer appelle l’adaptateur enregistré correspondant, sans mutation ni trafic. |
| In-flight result after provider or resolver change lacks a dedicated regression | false | Le même `invalidateAnalysis` incrémente `analysisVersion` et la garde après `await` écarte déjà réponse, erreur et mutation ; le mécanisme est couvert par le test de réponse URL périmée. |
| Verification gap: no end-to-end Continue assertion for Claude, Mistral and Gemini | low / patch | Confirmé par le relevé de tests : ajouter les trois flux UI par défaut, avec leur erreur de politique et l’absence de mutation/trafic. |
