---
title: 'Récupérer un partage par une passerelle tiers bornée'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '460c4eab07726efe3525685e2566844fcacd30fc'
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’adaptateur ChatGPT appelle directement `chatgpt.com`, ce qui ne fonctionne pas de façon fiable depuis le navigateur et contredit le tiers présenté dans le consentement. Il n’existe pas de frontière qui limite explicitement les données et la destination d’un import distant.

**Approach:** Créer `remoteGateway`, unique composant habilité à récupérer une page publique consentie. Il construira une requête GET vers l’origine fixe `https://corsproxy.io/` à partir de la seule URL ChatGPT canonique, retournera du HTML borné ou une erreur typée, puis laissera l’extracteur local existant analyser ce texte sans l’exécuter.

## Boundaries & Constraints

**Always:** N’accepter qu’une URL déjà validée par `validateChatGptShareUrl` et un consentement explicite lié à cette même URL ; autrement ne jamais appeler `fetch`. Construire l’URL proxy avec `?url=${encodeURIComponent(url)}` depuis la constante allowlistée, sans chemin, origine, redirection ou paramètre de proxy issu de l’utilisateur. N’envoyer aucun corps, en-tête applicatif, cookie, jeton, état de reducer, bloc, fichier, résultat, catalogue ou paramètre de calcul ; utiliser `GET`, `credentials: 'omit'`, `redirect: 'error'`, `cache: 'no-store'` et `referrerPolicy: 'no-referrer'`. Garder les bornes actuelles (10 s, 2 MiB) et retourner des erreurs discriminées, atomiques et non sensibles pour consentement, validation/politique/configuration, réseau, HTTP, délai et taille. Le HTML admis reste une chaîne traitée seulement par `extractChatGptShareEvents`.

**Never:** Ne jamais conserver, réutiliser ou synthétiser le consentement ; ne jamais effectuer de repli vers `chatgpt.com` ou une autre passerelle ; ne jamais exécuter, injecter dans le DOM, suivre des liens ou télécharger une ressource de la page distante. Ne pas modifier le reducer, les calculs, les blocs, le parseur public, ni la confirmation de remplacement. Ne pas réintroduire dans cette story l’interface de consentement 5.1 : elle utilisera l’API de la passerelle une fois restaurée.

**Decision:** La production reçoit une clé CorsProxy publique au build dans `VITE_CORSPROXY_API_KEY`; le domaine GitHub Pages est autorisé dans le tableau de bord CorsProxy. La clé ne doit jamais être ajoutée au dépôt, à la spec, aux tests, aux journaux ou aux messages d’erreur. Une absence de variable reste une erreur explicite `configuration` sans trafic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Récupération consentie | URL canonique et preuve de consentement pour cette URL | Un seul GET vers `https://corsproxy.io/?url=<URL encodée>` ; seul le HTML borné est retourné au parseur local. | Aucun état de session n’est reçu ni muté. |
| Consentement absent ou périmé | Absence de preuve, ou URL différente | Zéro appel réseau. | Résultat `consent-required`, événements vides. |
| URL ou configuration refusée | URL non canonique ou clé/configuration indisponible | Zéro appel réseau. | Erreur typée `invalid-url` ou `configuration`/`policy`, sans valeur sensible. |
| Échec de transport | Réseau, HTTP, timeout ou réponse > 2 MiB | Aucun HTML ni événement partiel n’est livré. | Erreur existante appropriée, corps abandonné si nécessaire. |
| HTML admis | Texte borné renvoyé par la passerelle | L’extracteur ChatGPT local produit les événements normalisés ou son erreur de format. | Aucune exécution ni chargement lié. |

</frozen-after-approval>

## Code Map

- `src/application/import/remoteGateway.ts` -- nouveau périmètre réseau fermé : constante CorsProxy, construction de l’URL, contrôle du consentement, configuration et lecture bornée.
- `src/application/import/remoteGateway.test.ts` -- preuves unitaires de destination unique, encodage, absence de trafic sans consentement/configuration, options `fetch`, limites et erreurs atomiques.
- `src/application/import/chatgptShare.ts` -- conserver `validateChatGptShareUrl` et `extractChatGptShareEvents` ; déléguer la récupération à la passerelle puis conserver l’extraction locale, sans appel direct à ChatGPT.
- `src/application/import/types.ts` -- étendre l’union `ImportErrorCode` pour représenter sans ambiguïté l’absence/péremption de consentement et la politique/configuration.
- `src/application/import/chatgptShare.test.ts` -- adapter les attentes de transport direct en tests d’intégration de l’adaptateur avec une passerelle injectée, en préservant les tests du parseur.
- `src/ui/ConversationImport.tsx` -- ne pas modifier dans cette story : l’UI de consentement 5.1, retirée du travail précédent, devra appeler la nouvelle API avec son autorisation ponctuelle.

## Tasks & Acceptance

**Execution:**

- [x] `src/application/import/remoteGateway.ts` et `src/application/import/remoteGateway.test.ts` -- créer la passerelle CorsProxy à destination immuable, avec consentement lié à l’URL, configuration, délai, lecture 2 MiB et erreurs atomiques -- isoler tout trafic distant et prouver la minimisation des données.
- [x] `src/application/import/chatgptShare.ts`, `src/application/import/types.ts` et leurs tests -- déplacer le transport hors de l’adaptateur et composer passerelle + extracteur local ; enrichir les erreurs typées sans changer le comportement du parseur -- supprimer toute requête directe à ChatGPT.
- [x] `src/application/import/registry.ts` et tests ciblés si nécessaires -- exposer le parcours ChatGPT via la nouvelle frontière sans donner à l’UI l’accès direct à `fetch` -- maintenir le registre V1 statique.

**Acceptance Criteria:**

- Given un consentement courant et une URL ChatGPT validée, when l’import distant démarre, then seul `remoteGateway` appelle l’origine fixe `https://corsproxy.io/` avec une destination dérivée uniquement de cette URL.
- Given une absence de consentement, une annulation représentée par son absence, ou une URL modifiée, when la passerelle est appelée, then aucune requête n’est lancée, une erreur typée est renvoyée et la session ne peut pas être touchée.
- Given une requête inspectée, when elle part vers CorsProxy, then elle ne contient ni état local ni cookies, jetons, corps ou données de calcul.
- Given un échec réseau, HTTP, délai, taille, politique ou configuration, when la passerelle échoue, then aucun HTML partiel ni événement importable n’est produit.
- Given un HTML borné reçu, when l’adaptateur l’interprète, then seul l’extracteur local existant le lit comme texte non exécutable et le registre ne propose toujours que ChatGPT.

## Implementation Notes

- La preuve de consentement sera une valeur explicite et éphémère passée à la passerelle, dont l’URL doit correspondre exactement à l’URL validée. Son format interne relève de l’implémentation ; aucun état React ou reducer ne traverse cette frontière.
- La clé de CorsProxy, si retenue, est un paramètre de build public et ne sera jamais écrite dans le dépôt, les tests, les messages d’erreur ou le journal applicatif.

## Spec Change Log

## Review Triage Log

- medium — defer — L’UI par défaut ne fournit pas encore le consentement et l’import affiche donc `consent-required`; c’est réel, mais le bloc gelé exclut expressément la réintroduction de l’UI 5.1 et la décrit comme son prochain consommateur.
- medium — patch — Une même preuve `{ url }` peut déclencher plusieurs requêtes; la passerelle doit consommer cette capacité au premier emploi pour respecter le consentement ponctuel.
- false — La conversion de `unknown` en type de consentement ne peut pas authentifier une action utilisateur dans une SPA; la frontière doit exiger une capacité interne, et le parcours 5.1 reste responsable de l’action explicite.
- medium — patch — Une réponse dont `Content-Length` dépasse la borne quitte la lecture sans annuler son corps; elle doit être annulée avant de retourner l’erreur de taille.
- medium — patch — Une réponse 401 de CorsProxy indique une clé absente ou invalide selon la documentation fournisseur et doit être distinguée en `configuration`, sans HTML.
- false — La clé est nécessairement un paramètre de l’API CorsProxy choisie et la décision gelée la qualifie explicitement de publique; elle n’est ni un jeton de session ni une donnée locale.
- false — Une requête déjà envoyée avec le consentement de l’URL alors courante ne peut pas être annulée rétroactivement par un changement ultérieur; l’invalidation de résultat est assurée par l’UI 5.1.
- medium — patch — Le délai pendant `reader.read()` n’est plus exercé; le test doit prouver l’erreur `timeout` atomique quand un corps en flux est interrompu par le signal.
- medium — defer — Les tests UI injectent tous un fournisseur factice et ne couvrent pas l’enchaînement de consentement par défaut; cette couverture appartient au rétablissement de l’UI 5.1 explicitement hors scope.
- medium — patch — Si `reader.cancel()` rejette après franchissement de taille, l’erreur est aujourd’hui classée `network`; ignorer cet échec de nettoyage et conserver `response-too-large`.
- false — La remarque sur la clé dans l’URL duplique une contrainte explicitement acceptée par la décision gelée et par l’API CorsProxy.
- medium — defer — Le flux UI par défaut sans consentement est effectivement bloqué; la dépendance est enregistrée pour la story 5.1 que le scope gelé exclut.
- medium — patch — La lacune de test du délai de lecture recoupe le cas de flux interrompu; elle doit être rétablie dans les tests de passerelle.

## Design Notes

La séparation conserve l’adaptateur comme une conversion déterministe `HTML → ImportResult`. La passerelle est le seul endroit où un futur fournisseur pourra être remplacé, tandis que les limitations de lecture restent testables indépendamment des formats de page. L’interface actuelle ne sera pas raccordée à une requête non consentie : le travail 5.1 doit fournir l’autorisation avant l’intégration visuelle.

## Verification

**Commands:**

- `npm test -- --run src/application/import/remoteGateway.test.ts src/application/import/chatgptShare.test.ts` -- expected: destination, minimisation, erreurs et extraction locale sont couverts.
- `npm run lint` -- expected: TypeScript valide les frontières et les unions d’erreur.
- `npm run build` -- expected: build Vite statique aboutit sans dépendance serveur.
