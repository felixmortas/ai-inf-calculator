---
title: 'Story 2.1 — Compter localement les textes d’un bloc'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
baseline_commit: '4e884c47f0b523405ee997230496ac9984d66441'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le calculateur sait recueillir les textes d’une conversation, mais ne possède pas encore de comptage de tokens local, fiable et résistant aux réponses asynchrones périmées. Sans ce socle, aucun impact individuel ne peut utiliser les contenus sans les envoyer hors du navigateur.

**Approach:** Introduire une tokenisation locale dans un Worker typé, fondée par défaut sur `js-tiktoken/lite` et `o200k_base`. Le domaine fournit l’empreinte canonique et le fallback déterministe ; le reducer ne retient une réponse que si elle correspond encore à la demande en attente.

## Boundaries & Constraints

**Always:** Compter seulement les quatre textes saisis d’un bloc ; un texte vide produit exactement zéro token et aucun raisonnement caché n’est déduit. Emballer Tiktoken et ses rangs localement, sans API, CDN, clé, télémetrie, journalisation, URL ou stockage durable. Chaque message du protocole porte un `requestId`, l’encodage et une empreinte texte+encodage. Une erreur structurée du Worker utilise le fallback `nombre de mots / 0,75`, où les séparateurs sont les caractères non alphanumériques. Le domaine reste pur, synchrone et indépendant de React et de Worker.

**Never:** Ne pas ajouter d’action ni de résultat de calcul visible dans l’UI (réservés à la story 2.3), ne pas recalculer automatiquement après une saisie, ne pas modifier le catalogue de modèles, les champs ou l’ordre des blocs, ni la configuration de base Vite `/ai-inf-calculator/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Tiktoken local | Texte non vide, encodage `o200k_base` | Le Worker renvoie le compte Tiktoken et recopie `requestId` et empreinte | Aucun accès réseau ni persistance |
| Texte vide | Chaîne vide pour un des champs | Le domaine retourne exactement `0` token | Ne pas appeler ni estimer un raisonnement caché |
| Échec Tiktoken | Réponse Worker structurée comme erreur | Le domaine compte les segments alphanumériques puis divise par `0,75` | Retourner un résultat de fallback déterministe |
| Réponse périmée | Le texte ou modèle a changé depuis l’envoi | Le reducer conserve l’état courant et ignore la réponse | Aucun résultat périmé ne devient exploitable |
</frozen-after-approval>

## Code Map

- `package.json` et `package-lock.json` -- ajouter et verrouiller `js-tiktoken`, seule dépendance nécessaire au tokenizer local.
- `src/domain/tokenization.ts` -- nouveau domaine pur : types de comptage, empreinte stable texte+encodage, détection du vide et fallback mots/`0,75`.
- `src/domain/tokenization.test.ts` -- couvrir domaine, texte vide, segmentation Unicode/alphanumérique et fallback sans React.
- `src/workers/tokenizationProtocol.ts` -- nouveau contrat discriminé et typé des requêtes/réponses Worker, incluant `requestId`, encodage, empreinte et erreur structurée.
- `src/workers/tokenization.worker.ts` -- nouveau module Worker local utilisant `js-tiktoken/lite` avec les rangs `o200k_base`; exposer un handler testable sans réseau ni journal.
- `src/workers/tokenization.worker.test.ts` -- vérifier contrat, succès Tiktoken et erreur structurée du Worker indépendamment du rendu.
- `src/application/conversationReducer.ts` -- étendre l’état et les actions pour suivre la demande de tokenisation d’un bloc et ignorer une réponse dont `requestId` ou empreinte ne correspond plus.
- `src/application/conversationReducer.test.ts` -- démontrer l’acceptation de la réponse courante et le rejet après modification, suppression ou réponse ancienne.
- `src/application/tokenizationClient.ts` -- nouvel adaptateur navigateur qui crée le module Worker et relaie le protocole au reducer ; aucune règle de fallback ni calcul métier ici.

## Tasks & Acceptance

**Execution:**

- [x] `package.json` et `package-lock.json` -- intégrer `js-tiktoken` pour un empaquetage local reproductible -- fournir le tokenizer imposé sans service tiers.
- [x] `src/domain/tokenization.ts` et son test -- définir les données de comptage, empreintes et fallback pur -- préserver déterminisme, confidentialité et testabilité.
- [x] `src/workers/tokenizationProtocol.ts`, `src/workers/tokenization.worker.ts` et test -- créer le protocole et le Worker module Tiktoken -- isoler l’asynchronisme et les erreurs structurées.
- [x] `src/application/tokenizationClient.ts` -- relier le Worker typé à l’application sans importer de règle métier dans l’UI -- permettre les demandes locales annulables par corrélation.
- [x] `src/application/conversationReducer.ts` et test -- gérer demandes/réponses par bloc et invalider les données non correspondantes -- empêcher tout calcul à partir d’une réponse périmée.

**Acceptance Criteria:**

- Given un texte de bloc renseigné, when une demande est exécutée, then `js-tiktoken/lite` et `o200k_base` sont utilisés par un Worker module local, sans requête externe.
- Given une demande, when le Worker répond, then le contrat typé contient le même `requestId`, l’encodage et l’empreinte calculée sur le texte demandé.
- Given une modification, une suppression ou une nouvelle demande pour le bloc, when une réponse antérieure revient, then le reducer l’ignore.
- Given une erreur de tokenisation, when le domaine reçoit l’erreur structurée, then il applique uniquement le fallback alphanumérique `mots / 0,75` ; une chaîne vide vaut `0`.
- Given les tests de domaine, Worker et reducer, when ils s’exécutent, then ils ne dépendent ni de React ni du rendu UI pour valider les règles de tokenisation.

## Implementation Notes

## Spec Change Log

## Review Triage Log

- medium — `TokenizationClient` n’était pas instancié : le build n’émettait pas le Worker, donc la capacité locale restait inatteignable. Corrigé par l’initialisation et la destruction sans action de calcul dans `App`.
- medium — Les erreurs de démarrage ou de message du Worker laissaient les requêtes en attente. Corrigé : le client suit ses requêtes et les transforme en erreurs structurées consommées par le reducer.
- false — Le signalement de fuite WASM n’est pas confirmé : `js-tiktoken/lite@1.0.21` est JavaScript pur et n’expose pas `free`. Le Worker appelle néanmoins `free` optionnellement dans un `finally` si une version future le fournit.
- medium — Le garde de protocole acceptait des comptes absents, négatifs ou non finis. Corrigé par une validation exhaustive des quatre comptes avant dispatch.
- medium — La construction et le dispatch d’une requête pouvaient diverger. Corrigé : une seule méthode client crée l’identifiant, l’empreinte, l’action reducer et le message Worker à partir des mêmes textes.
- medium — Les identifiants de requête n’étaient ni générés ni garantis distincts. Corrigé : le client les produit avec `crypto.randomUUID()` et conserve les requêtes sortantes par identifiant.
- low — L’ancienne empreinte FNV 32 bits pouvait entrer en collision et laisser passer une réponse obsolète. Corrigé par une représentation canonique exacte, transitoire et uniquement en mémoire.
- medium — Un succès Worker pouvait attribuer un compte non nul à un texte vide. Corrigé au Worker et vérifié au reducer, qui retombe sur le fallback si l’invariant est rompu.
- false — Le constat du chasseur de cas limites sur la libération mémoire recoupe le signalement WASM ci-dessus : l’API `free` n’existe pas dans la dépendance installée ; l’appel optionnel couvre une évolution compatible.
- medium — Le constat sur les comptes malformés est confirmé et recoupe la validation de protocole ci-dessus ; la réponse est désormais rejetée avant tout stockage dans l’état.
- medium — Le Worker recopiait une empreinte potentiellement falsifiée. Corrigé : il dérive l’empreinte de l’encodage et des textes effectivement comptés.

## Design Notes

Le fallback utilise une expression Unicode fondée sur les catégories lettres et nombres, afin que les mots accentués et les chiffres restent des segments, tout en traitant ponctuation, espaces et symboles comme séparateurs. L’empreinte est une représentation déterministe versionnée par encodage ; elle sert à corréler une réponse, pas à persister le texte.

Le Worker expose son traitement séparément de son branchement `message`, ce qui permet de tester son succès et son erreur dans Vitest sans disposer d’une implémentation Worker dans jsdom. L’adaptateur application reste la seule couche qui instancie `new Worker`.

## Verification

**Commands:**

- `npm test -- --run` -- expected: les suites existantes et nouvelles passent.
- `npm run lint` -- expected: TypeScript ne signale aucune erreur.
- `npm run build` -- expected: la production compile le Worker et ses rangs localement sous `/ai-inf-calculator/`.
