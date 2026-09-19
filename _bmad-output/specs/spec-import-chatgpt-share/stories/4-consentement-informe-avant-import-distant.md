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

**Approche :** Insérer, après validation du lien et avant toute récupération distante, un dialogue de consentement accessible, ponctuel et explicite. Il sépare strictement l’autorisation d’envoi de l’URL de la confirmation ultérieure de remplacement des blocs locaux.

## Boundaries & Constraints

**Always :** Identifier `corsproxy.io`, la récupération de la page publique, l’URL de partage envoyée et les métadonnées que le fournisseur peut recevoir, dont adresse IP et agent utilisateur. Dire que le calculateur n’envoie pas les blocs déjà saisis, fichiers locaux, résultats ni paramètres de calcul. Présenter « Continuer avec corsproxy.io », « Annuler » et « Importer manuellement », avec les liens vers documentation, politique et conditions. Ouvrir le dialogue avec son focus, conserver le parcours clavier et annoncer les erreurs.

**Never :** Ne pas pré-cocher, mémoriser ou réutiliser le consentement. Ne pas appeler `importFromUrl`, `remoteGateway` ni aucun effet réseau avant « Continuer ». Ne pas confondre ce consentement avec la confirmation de remplacement, ni modifier les blocs, calculs ou configuration de session par refus, annulation, `Escape` ou changement d’URL.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Lien valide | URL ChatGPT canonique, action d’analyse | Dialogue de consentement affiché avant toute requête | Session intacte |
| Autorisation explicite | Action « Continuer avec corsproxy.io » | Une unique demande d’import de cette URL devient autorisable | Le flux passe ensuite à la passerelle de story 5 |
| Refus ou fermeture | Annuler ou `Escape` | Dialogue fermé sans appel réseau | Formulaire et session conservés |
| URL modifiée | Saisie modifiée après ouverture ou consentement | Autorisation invalide ; nouvelle autorisation requise | Aucun résultat ou appel périmé n’est utilisé |
| Parcours manuel | Action « Importer manuellement » | Alternative locale accessible sans requête tiers | Le dialogue ne bloque pas la saisie manuelle |

## Code Map

- `src/ui/ConversationImport.tsx` -- introduire l’état de consentement, le dialogue et l’invalidation sur changement d’URL.
- `src/ui/App.tsx` -- conserver l’orchestration sans déclencher de récupération anticipée.
- `src/i18n/fr.ts` et `src/ui/styles.css` -- centraliser le texte fourni et le comportement accessible/responsif.
- `src/application/import/` -- ne recevoir le signal d’autorisation courante qu’après l’action explicite ; la passerelle est livrée dans la story 5.
- `src/ui/ConversationImport.test.tsx` et tests d’intégration associés -- verrouiller l’absence de requête et le focus clavier.

## Tasks & Acceptance

**Execution :**

- [ ] Ajouter le dialogue de consentement et ses états explicites dans le parcours d’import.
- [ ] Ajouter les messages français et liens fournisseur factuels, sans promesse de confidentialité non vérifiée.
- [ ] Invalider l’autorisation sur annulation, `Escape`, refus, erreur de validation et modification d’URL.
- [ ] Couvrir les actions clavier, le focus, la voie manuelle et l’absence d’appel avant consentement.

**Acceptance Criteria :**

- Given une URL de partage valide, when la personne demande son analyse, then le dialogue de consentement est affiché avant tout appel à l’import ou au réseau.
- Given le dialogue, when la personne consulte son contenu, then `corsproxy.io`, la finalité, l’URL transmise, l’IP et l’agent utilisateur potentiellement reçus, ainsi que l’exclusion des données locales sont explicités avec les liens fournisseur.
- Given le dialogue, when la personne refuse, annule, presse `Escape` ou modifie l’URL, then aucune requête n’est émise, aucune mutation de session ne survient et un nouveau consentement est requis pour une nouvelle URL.
- Given la personne choisit « Importer manuellement », when elle quitte le dialogue, then elle peut poursuivre ce parcours sans aucune requête à `corsproxy.io`.
- Given une session non vide, when l’import distant est ensuite prêt, then sa confirmation de remplacement reste une étape distincte et conserve l’atomicité existante.

## Verification

- `npm test -- --run src/ui/ConversationImport.test.tsx` — le dialogue, son focus, les refus et l’absence de requête passent.
- `npm run lint` — TypeScript et lint passent sans erreur.
- `npm run build` — le build Vite aboutit.
