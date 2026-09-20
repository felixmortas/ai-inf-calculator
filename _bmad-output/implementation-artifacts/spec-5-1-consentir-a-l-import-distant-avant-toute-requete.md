---
title: 'Consentir à l’import distant avant toute requête'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '460c4eab07726efe3525685e2566844fcacd30fc'
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’analyse d’un lien de partage appelle aujourd’hui l’adaptateur d’import dès que l’URL est validée. La personne ne peut donc pas décider en connaissance de cause si son URL doit être communiquée à l’intermédiaire tiers prévu pour contourner CORS.

**Approach:** Intercaler un dialogue de consentement ponctuel, accessible et lié à l’URL courante entre la validation et tout appel d’import. Le dialogue explique l’exception de confidentialité, permet de continuer, d’annuler ou de choisir l’alternative manuelle, sans confondre cette décision avec le remplacement ultérieur des blocs.

## Boundaries & Constraints

**Always:** Après validation d’une URL ChatGPT canonique, afficher un dialogue avant tout appel à `importFromUrl` ou effet réseau. Le dialogue identifie `corsproxy.io`, la récupération de la page publique, l’URL exacte transmise, les métadonnées possibles (dont adresse IP et agent utilisateur), et précise que les blocs locaux, fichiers, résultats et paramètres de calcul ne sont pas envoyés par le calculateur. Proposer « Continuer avec corsproxy.io », « Annuler » et « Importer manuellement », ainsi que les liens officiels vers la documentation, la politique de confidentialité et les conditions. Ouvrir le dialogue avec le focus, le fermer avec `Escape` ou Annuler sans effet, et invalider l’autorisation avec toute modification d’URL ou de fournisseur.

**Never:** Ne pas pré-cocher, persister ou réutiliser le consentement. Ne pas créer la passerelle `remoteGateway`, changer l’adaptateur d’extraction, ses limites, le reducer, les calculs ou les blocs. Ne pas envoyer une requête, modifier la session, afficher une prévisualisation ou remplacer des blocs avant l’action explicite « Continuer ». Conserver la confirmation de remplacement existante comme étape séparée.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Analyse d’un lien valide | URL ChatGPT validée, clic sur « Analyser le lien » | Le dialogue de consentement s’ouvre et l’adaptateur n’est pas appelé. | État de session inchangé. |
| Consentement explicite | Dialogue ouvert pour l’URL courante, clic sur « Continuer avec corsproxy.io » | L’import démarre une fois et poursuit vers la prévisualisation existante. | Les erreurs d’import existantes restent visibles sans mutation de session. |
| Refus ou fermeture | Dialogue ouvert, Annuler ou `Escape` | Le dialogue se ferme sans appel d’import ni prévisualisation. | Le formulaire et les données existantes sont conservés. |
| URL ou fournisseur modifié | Dialogue ouvert ou résultat d’import en attente | Le consentement et les résultats associés sont invalidés ; une nouvelle analyse exige un nouveau consentement. | Toute réponse asynchrone périmée est ignorée. |
| Alternative manuelle | Dialogue ouvert, clic sur « Importer manuellement » | Le dialogue se ferme et le parcours de saisie manuelle reste immédiatement utilisable, sans appel tiers. | Aucune mutation de session. |

</frozen-after-approval>

## Code Map

- `src/ui/ConversationImport.tsx` -- point d’entrée du parcours : séparer validation, ouverture du consentement et import après consentement ; réutiliser `analysisVersion` pour invalider les opérations périmées et préserver la confirmation de remplacement.
- `src/i18n/fr.ts` -- ajouter les libellés français, le contenu factuel de consentement et les trois URLs officielles du fournisseur sous forme de messages centralisés.
- `src/ui/styles.css` -- fournir une présentation de dialogue lisible, responsive et compatible avec le focus visible global, sans modifier les styles des blocs ou des calculs.
- `src/ui/ConversationImport.test.tsx` -- compléter les tests d’interface avec l’absence d’appel avant consentement, Annuler, `Escape`, changement d’URL, focus, parcours manuel et maintien de l’étape distincte de remplacement.
- `src/application/import/chatgptShare.ts` -- ne pas modifier dans cette story : son appel direct et son remplacement par `remoteGateway` relèvent de la story 5.2.

## Tasks & Acceptance

**Execution:**

- [x] `src/ui/ConversationImport.tsx` -- ajouter l’état et le dialogue de consentement, avec focus initial, fermeture clavier et invalidation par changement de saisie ou fournisseur -- garantir l’absence d’import prématuré.
- [x] `src/i18n/fr.ts` et `src/ui/styles.css` -- centraliser le texte de transparence et les liens `corsproxy.io`, puis styliser le dialogue pour le clavier et les petits écrans -- conserver une interface française accessible.
- [x] `src/ui/ConversationImport.test.tsx` -- couvrir le chemin consentement, les refus et invalidations, le parcours manuel et la séparation d’avec la confirmation de remplacement -- verrouiller les garanties sans test réseau réel.

**Acceptance Criteria:**

- Given une URL ChatGPT canonique valide, when la personne demande son analyse, then un dialogue de consentement apparaît avant tout appel d’import ou effet réseau.
- Given ce dialogue, when la personne lit les informations, then `corsproxy.io`, la finalité, l’URL transmise, les métadonnées possibles, les données locales exclues et les liens fournisseur sont accessibles en français.
- Given le dialogue ouvert, when la personne annule, presse `Escape`, choisit le parcours manuel ou modifie l’URL, then aucune requête ni mutation de session ne survient et une nouvelle URL demande un nouveau consentement.
- Given un consentement explicite pour l’URL courante, when la personne continue, then l’import existant démarre seulement à ce moment et la confirmation de remplacement demeure une étape distincte si des blocs existent.

## Implementation Notes

- Le consentement est conservé localement avec l’URL, le fournisseur et la version d’analyse qui l’ont ouvert ; un changement de saisie ou de fournisseur invalide ce triplet et réactive l’action d’analyse si une requête était en attente.
- Les liens externes du dialogue utilisent `target="_blank"` et `rel="noreferrer"`. La passerelle distante reste hors du périmètre de cette story.

## Spec Change Log

- 2026-09-20 — La revue a constaté que les tâches d’interface étaient marquées terminées alors qu’aucun de leurs fichiers n’était modifié : elles repassent à faire. État à éviter : appeler le fournisseur réel sans capacité de consentement, ce qui retourne `consent-required` et bloque l’import. À préserver lors de la ré-implémentation : la passerelle existante reste hors de cette story ; l’UI crée une capacité ponctuelle pour l’URL validée et la transmet au fournisseur, sans modifier l’extraction ni le transport.

## Review Triage Log

- high — bad_spec — Le diff ne modifie pas `ConversationImport.tsx` : l’action d’analyse appelle encore `importFromUrl(url)` sans ouvrir de dialogue ni transmettre de consentement ; la passerelle réelle répond donc `consent-required`. La tâche marquée terminée ne reflétait pas le travail restant.
- medium — carried bad_spec — Aucun message de consentement ni lien CorsProxy n’est ajouté à `fr.ts`, contrairement à la tâche marquée terminée ; le dialogue ne peut pas informer la personne en français.
- medium — carried bad_spec — Aucun style de dialogue n’est ajouté à `styles.css` ; l’interface de consentement demandée n’existe pas.
- high — carried bad_spec — Les tests de `ConversationImport` n’exercent pas l’ouverture, le refus, Escape, l’invalidation, le focus ou la transmission de la capacité ; les mocks existants masquent le blocage du fournisseur réel.
- medium — bad_spec — L’alternative « Importer manuellement » est absente du composant, alors que l’intention la rend visible et actionnable.
- high — carried bad_spec — Aucun état de consentement lié à `analysisVersion` n’est introduit : un changement d’URL ou de fournisseur ne peut invalider ce consentement ni rejeter son résultat associé.
- low — defer — L’absence de variable de build `VITE_CORSPROXY_API_KEY` dépend du déploiement et relève de la story de passerelle ; elle ne modifie pas le parcours de consentement UI.
- medium — defer — Le type public `consent?: unknown` du fournisseur est introduit par la passerelle, pas par cette story ; sa frontière typée doit être traitée dans la story 5.2.
- medium — defer — Le contrôle d’expiration après la résolution de `fetch` concerne `remoteGateway.ts`, une frontière réseau hors du périmètre de cette story.
- low — defer — Le cycle de modules entre `remoteGateway.ts` et `chatgptShare.ts` est une dette de découpage de la passerelle, sans effet sur le dialogue de consentement.
- high — carried bad_spec — Les tests UI injectent un fournisseur qui ignore le second argument ; ils ne démontrent pas que la capacité créée pour l’URL courante atteint le fournisseur ChatGPT réel, dont le parcours reste bloqué.

- high — intent_gap — Le dialogue affirme que `corsproxy.io` récupérera la page, mais le seul adaptateur disponible effectue encore une requête directe vers `chatgpt.com` après le consentement. Le destinataire et les conditions annoncés ne correspondent donc pas au trafic réel ; l’intention ne précise pas si cette story doit bloquer l’import jusqu’à la passerelle 5.2 ou élargir son périmètre pour l’implémenter.
- medium — intent_gap — « Importer manuellement » ferme le dialogue et replace le focus sur le champ URL, sans indiquer ni atteindre un parcours de saisie locale. Le produit ne définit pas le comportement attendu de cette alternative dans cette interface ; ce choix est visible pour la personne.
- medium — patch — Le dialogue portant `aria-modal="true"` ne contient pas le focus et les contrôles de fond restent accessibles au clavier. La responsabilité est créée par ce dialogue ; un piège de focus et son test constituent une correction locale.
- low — patch — Annuler ou `Escape` retire l’élément actuellement focalisé sans restaurer le focus sur son déclencheur. Un retour au bouton d’analyse est une correction d’accessibilité directe et localisée.

- low — defer — Les corps d’erreur HTTP non annulés dans `remoteGateway.ts` relèvent de la frontière réseau de la story 5.2, non créée ni modifiée par ce dialogue.
- medium — defer — Une exception de lecture de configuration de la passerelle est hors du périmètre UI de cette story et doit être traitée avec les erreurs atomiques de 5.2.
- low — defer — La normalisation de la clé CorsProxy est une préoccupation de passerelle 5.2, sans incidence sur le consentement affiché.
- false — Le registre V1 est statique et ne propose que ChatGPT ; aucun autre fournisseur utilisateur ne peut donc atteindre la fabrique de capacité ChatGPT.
- medium — carried defer — La frontière publique `unknown` du consentement est introduite par 5.2 et reste une dette de typage de cette story, déjà consignée ; le dialogue transmet néanmoins la capacité opaque sans la reconstruire.
- false — Le test UI espionne désormais `createRemoteGatewayConsent` et vérifie que son objet exact atteint le fournisseur ; les tests de passerelle prouvent séparément que cette capacité est reconnue, sans requête réseau réelle.
- false — L’absence de trafic avant consentement est vérifiée au niveau de l’unique frontière UI vers le fournisseur ; l’appel réseau est isolé et couvert par les tests de passerelle de 5.2.
- false — Le lien manuel conserve sa navigation vers `#conversation-title`, rendant la section de saisie locale immédiatement visible ; la restitution du focus sur l’action d’analyse est volontaire pour Annuler et Escape, les seuls cas spécifiés de fermeture.
- false — URL et fournisseur appellent la même invalidation qui incrémente `analysisVersion` ; le test de réponse URL périmée couvre ce mécanisme et le test de changement de fournisseur couvre la fermeture du consentement.
- medium — patch — Le verrou contre le double clic n’était pas exercé ; un test avec promesse différée et deux clics immédiats vérifie désormais un seul appel.
- medium — patch — La capacité exacte créée par la fabrique n’était pas verrouillée côté UI ; le test l’espionne désormais avant de vérifier sa transmission à `importFromUrl`.
- low — patch — Les trois destinations officielles n’étaient pas vérifiées ; le test verrouille désormais leurs `href` ainsi que `target` et `rel`.
- medium — patch — Deux activations rapides de « Continuer avec corsproxy.io » peuvent appeler deux fois `importFromUrl` avant le rerendu qui efface le consentement. Un verrou synchrone local doit garantir une seule requête par consentement.
- false — La possibilité qu’un rerendu remplace un fournisseur par une autre implémentation sous le même identifiant n’est pas atteignable dans le produit V1 : le registre est statique et seul ChatGPT est fourni. La prop de test n’établit pas un parcours utilisateur réel.
- medium — intent_gap — Les tests n’exercent pas le transport de production ni sa concordance avec le tiers affiché, car ce transport direct préexistant est précisément incompatible avec l’information de consentement. La couverture ne peut être définie honnêtement avant la décision de dépendance entre les stories 5.1 et 5.2.
- medium — patch — La revue de cas limites confirme par traçage que `Tab` ou `Shift+Tab` quitte le dialogue. Cela recoupe le défaut de frontière clavier ci-dessus ; la même correction et le même test le couvrent.
- low — patch — La revue de cas limites confirme que la fermeture par Annuler ou `Escape` laisse le focus sur un nœud supprimé. Cela recoupe le défaut de restitution du focus ci-dessus ; la même correction le couvre.

## Design Notes

Le consentement reste un état local de l’interface plutôt qu’une action du reducer : il n’est ni durable ni nécessaire aux calculs. `analysisVersion` reste l’unique mécanisme de rejet des réponses asynchrones périmées ; l’invalidation du consentement suit donc la même frontière que l’invalidation de prévisualisation existante.

## Verification

**Commands:**

- `npm test -- --run src/ui/ConversationImport.test.tsx` -- expected: les scénarios de consentement et le parcours d’import existant passent.
- `npm run lint` -- expected: TypeScript et les règles de lint passent sans erreur.
- `npm run build` -- expected: le build Vite statique aboutit.
