---
title: 'Consentement informé avant import distant'
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

**Problème :** L’analyse actuelle d’un lien peut engager une lecture distante sans que la personne ait reçu l’information nécessaire sur l’intermédiaire tiers et les données visibles par lui.

**Approche :** Insérer, après résolution par l’adaptateur et avant toute récupération distante, un dialogue de consentement accessible, ponctuel et explicite. Il autorise une seule utilisation du même `ResolvedShare` attesté, sépare strictement l’envoi de son `outboundCanonicalUrl` de la confirmation ultérieure de remplacement des blocs locaux, et ne dépend pas d’un fournisseur dans l’UI.

## Boundaries & Constraints

**Always :** Identifier `corsproxy.io`, le fournisseur détecté, la récupération de sa page publique, l’URL canonique envoyée et les métadonnées que le tiers peut recevoir, dont adresse IP et agent utilisateur. Dire que le calculateur n’envoie pas les blocs déjà saisis, fichiers locaux, résultats ni paramètres de calcul. Lier le consentement par identité au `ResolvedShare`, à `policyVersion` et à l’origine proxy ; le consommer avant trafic. Présenter « Continuer avec corsproxy.io », « Annuler » et « Importer manuellement », avec les liens documentés. Ouvrir le dialogue avec son focus, conserver le parcours clavier et annoncer les erreurs.

**Never :** Ne pas pré-cocher, mémoriser ou réutiliser le consentement. Ne pas appeler `remoteGateway` ni aucun effet réseau avant « Continuer », ni construire une autorisation depuis des champs contrôlés par l’appelant. Ne pas confondre ce consentement avec la confirmation de remplacement, ni modifier les blocs, calculs ou configuration de session par refus, annulation, `Escape`, changement d’URL, fournisseur, adaptateur/politique, limites ou configuration proxy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Lien valide | URL canonique résolue pour un fournisseur admis | Dialogue de consentement affiché avant toute requête | Session intacte |
| Autorisation explicite | Action « Continuer avec corsproxy.io » | Une unique demande du même `ResolvedShare` devient autorisable | Le flux passe ensuite à la passerelle de story 5 |
| Refus ou fermeture | Annuler ou `Escape` | Dialogue fermé sans appel réseau | Formulaire et session conservés |
| Identité modifiée | URL, fournisseur, politique, limites ou proxy modifiés | Autorisation invalide ; nouvelle résolution et autorisation requises | Aucun résultat ou appel périmé n’est utilisé |
| Parcours manuel | Action « Importer manuellement » | Alternative locale accessible sans requête tiers | Le dialogue ne bloque pas la saisie manuelle |

## Code Map

- `src/ui/ConversationImport.tsx` -- introduire l’état de consentement, le dialogue et l’invalidation sur changement d’identité du `ResolvedShare`.
- `src/ui/App.tsx` -- conserver l’orchestration sans déclencher de récupération anticipée.
- `src/i18n/fr.ts` et `src/ui/styles.css` -- centraliser le texte fourni et le comportement accessible/responsif.
- `src/application/import/` -- exposer une autorisation opaque liée au `ResolvedShare` courant ; la passerelle est livrée dans la story 5.
- `src/ui/ConversationImport.test.tsx` et tests d’intégration associés -- verrouiller l’absence de requête et le focus clavier.

## Tasks & Acceptance

**Execution :**

- [ ] Ajouter le dialogue de consentement et ses états explicites dans le parcours d’import.
- [ ] Ajouter les messages français et liens fournisseur factuels, sans promesse de confidentialité non vérifiée.
- [ ] Invalider l’autorisation sur annulation, `Escape`, refus, erreur de validation et toute variation d’identité ou de politique du `ResolvedShare`.
- [ ] Couvrir les actions clavier, le focus, la voie manuelle et l’absence d’appel avant consentement.

**Acceptance Criteria :**

- Given une URL de partage valide pour un adaptateur enregistré, when la personne demande son analyse, then le dialogue de consentement est affiché avant tout appel réseau.
- Given le dialogue, when la personne consulte son contenu, then `corsproxy.io`, le fournisseur détecté, la finalité, l’URL canonique transmise, l’IP et l’agent utilisateur potentiellement reçus, ainsi que l’exclusion des données locales sont explicités.
- Given le dialogue, when la personne refuse, annule, presse `Escape` ou change l’identité, la politique ou les limites du `ResolvedShare`, then aucune requête n’est émise, aucune mutation de session ne survient et une nouvelle résolution/autorisation est requise.
- Given la personne choisit « Importer manuellement », when elle quitte le dialogue, then elle peut poursuivre ce parcours sans aucune requête à `corsproxy.io`.
- Given une session non vide, when l’import distant est ensuite prêt, then sa confirmation de remplacement reste une étape distincte et conserve l’atomicité existante.

## Verification

- `npm test -- --run src/ui/ConversationImport.test.tsx` — le dialogue, son focus, les refus et l’absence de requête passent.
- `npm run lint` — TypeScript et lint passent sans erreur.
- `npm run build` — le build Vite aboutit.
