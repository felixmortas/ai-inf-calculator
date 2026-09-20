---
title: 'Story 5.4 — Ajouter les adaptateurs de partage multi-fournisseur'
type: 'feature'
created: '2026-09-20'
status: 'done'
baseline_commit: 'c20ea08adae6bbef6691bc791cd34baff9eed9ae'
route: 'dispatch'
review_loop_iteration: 1
version: 'v2-multi-provider'
depends_on:
  - '_bmad-output/implementation-artifacts/spec-5-1-consentir-a-l-import-distant-avant-toute-requete.md'
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/SPEC.md'
  - '_bmad-output/specs/spec-import-chatgpt-share/import-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le calculateur ne possède aujourd’hui qu’un adaptateur de partage ChatGPT. Les fournisseurs supplémentaires doivent disposer d’un socle local testable avant que les stories 5.1 et 5.2 les raccordent au consentement et à la passerelle.

**Approach:** Livrer un registre fermé de quatre adaptateurs et leurs parseurs locaux, avec un `ResolvedShare` attesté créé exclusivement par le registre. Conserver l’import actif et la frontière réseau ChatGPT-only jusqu’aux stories de raccordement.

## Boundaries & Constraints

**Always:** Valider et canonicaliser hors réseau ; isoler les heuristiques HTML par fournisseur ; borner URL, taille, délai et nombre d’événements ; conserver l’ordre des messages textuels ; signaler sans lire les contenus inaccessibles ; geler les politiques de redirection. Gemini définit son unique saut autorisé et son allowlist pour consommation future.

**Never:** Ne pas exposer Claude, Mistral ou Gemini dans l’UI active ; ne pas modifier `ConversationImport`, le consentement, `remoteGateway`, les blocs, la tokenisation, les calculs ou l’historique ; ne pas effectuer de requête réseau, ni mettre en œuvre la redirection, dans cette story.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Résolution locale | URL canonique de l’un des quatre fournisseurs | Le registre retourne un `ResolvedShare` gelé et attesté | Aucune requête |
| URL refusée | Schéma, hôte, query, fragment, format ou longueur interdits | Erreur atomique ; rien n’est résolu | Parcours manuel disponible |
| Fixture textuelle | Deux tours textuels publics ordonnés | Deux événements normalisés dans le même ordre | N/A |
| Contenu inaccessible | Une pièce jointe ou partie non textuelle | Signalement sans lire ni inventer de texte | Le texte restant est déterministe |
| Borne | Plus d’événements que la limite injectée | Échec atomique `too-many-events` | Aucun résultat partiel |
| Politique Gemini | Politique consultée | Un saut allowlisté décrit, pas exécuté | Exécution reportée à 5.2 |

</frozen-after-approval>

## Code Map

- `src/application/import/types.ts` -- contrat commun, erreurs, événements et valeur attestée.
- `src/application/import/registry.ts` -- registre fermé, catalogue exhaustif et catalogue actif ChatGPT-only.
- `src/application/import/chatgptShare.ts`, `chatgptShareUrl.ts` -- adaptateur V1 distinct à préserver.
- `src/application/import/remoteGateway.ts`, `src/ui/ConversationImport.tsx` -- hors périmètre ; restent ChatGPT-only.
- `src/application/import/*.test.ts` -- tests unitaires et fixtures locales à étendre.

## Tasks & Acceptance

**Execution:**

- [x] `src/application/import/types.ts`, `registry.ts` -- définir le contrat, les limites et le `ResolvedShare` non forgeable ; garder le catalogue actif ChatGPT-only.
- [x] `src/application/import/claudeShare.ts`, `mistralShare.ts`, `geminiShare.ts`, `chatgptShare.ts` -- créer les validateurs et extracteurs locaux isolés, avec erreurs et bornes propres.
- [x] `src/application/import/providerSupport.ts` -- centraliser les invariants mécaniques de résultat et le signalement, sans partager les heuristiques HTML.
- [x] `src/application/import/fixtures/`, `src/application/import/*Share.test.ts` -- ajouter les fixtures HTML minimisées et les tests de registre, URL, ordre, contenu inaccessible, limites et politique Gemini.

**Acceptance Criteria:**

- Given une URL publique canonique de chacun des quatre fournisseurs, when le registre la résout, then il retourne le bon adaptateur et un `ResolvedShare` attesté sans accès réseau.
- Given une valeur `ResolvedShare` forgée ou clonée, when le registre ou un consommateur local la vérifie, then elle est refusée sans mutation ni requête.
- Given une fixture minimisée par fournisseur, when son extracteur local l’analyse, then il restitue deux rôles textuels ordonnés et signale les contenus inaccessibles sans les lire ni les inventer.
- Given une URL ou une limite refusée, when un adaptateur l’évalue, then il retourne une erreur atomique et aucune requête n’est initiée.
- Given Gemini, when sa politique est consultée, then elle décrit les cas autorisé, hors allowlist et trop long ; leur exécution relève de la passerelle ultérieure.
- Given l’interface active par défaut, when elle est rendue, then ChatGPT reste son seul choix jusqu’au raccordement des stories 5.1/5.2.

## Implementation Notes

## Spec Change Log

- 2026-09-20 — La revue a montré que l’exposition UI appelait un flux distant ChatGPT-only. La spec est resserrée sur le socle local choisi par l’utilisateur ; cela évite des choix inutilisables et reporte consentement, passerelle et redirection à 5.1/5.2. **KEEP:** registre fermé, attestation mémoire, adaptateurs isolés et tests locaux.

## Review Triage Log

| Finding | Verdict | Evidence |
| --- | --- | --- |
| UI: consentement limité à ChatGPT | high | L’ancien essai exposait des fournisseurs que `ConversationImport` ne pouvait consentir. |
| UI: adaptateurs distants non fonctionnels | high | L’ancien essai rendait des choix dont `importFromUrl` retournait `policy`. |
| Frontière non attestée | high | Le raccordement de la valeur attestée à la passerelle est reporté. |
| Redirection Gemini seulement déclarative | high | L’exécution est reportée ; la politique statique reste requise. |
| Contenus inaccessibles silencieux | medium | Le nouveau contrat doit fournir un signal testable. |
| Fixtures et couverture incomplètes | medium | Des fichiers de fixtures et les cas de limites sont exigés. |
| Limite URL ChatGPT annoncée | false | Aucun comportement contradictoire n’était établi par le diff précédent. |
| `maxEvents` non fini | medium | Les limites injectées devront être validées et testées. |
| Claude mixte texte/non-texte | medium | La matrice impose le signalement sans suppression silencieuse. |
| Trois scénarios Gemini | medium | Ils portent sur la politique statique ici, pas sur une redirection réseau. |
| Valeur forgée dans le flux UI | false | Le flux UI ne reçoit pas `ResolvedShare` dans ce socle. |
| Bornes des nouveaux extracteurs | medium | Une couverture paramétrée des trois extracteurs est requise. |
| Registre par défaut dans l’UI | high | Le catalogue actif doit rester ChatGPT-only et être couvert. |
| ChatGPT accepte une URL trop longue | medium | Corrigé : le validateur refuse désormais toute URL de plus de 2 048 caractères, avec test de non-requête. |
| Limites injectées non finies ou négatives | medium | Corrigé : les quatre extracteurs refusent atomiquement les limites non entières, non finies ou non positives. |
| Tours aux rôles non pris en charge non comptés | false | `maxEvents` borne les événements normalisés ; le HTML est déjà borné par taille avant l’extraction. |
| Tour exclusivement non textuel considéré comme succès | medium | Corrigé : un résultat ne réussit que s’il contient au moins un événement utilisateur ou assistant textuel. |
| Média imbriqué lu comme texte | high | Corrigé : la détection de contenu non textuel parcourt récursivement les valeurs JSON avant normalisation. |
| Attribut HTML préfixé reconnu par erreur | medium | Corrigé : la recherche impose une limite d’attribut à gauche et est couverte par test. |
| Premier état public malformé masque le suivant | medium | Corrigé : le parseur continue jusqu’au premier script JSON valide correspondant. |
| Politique Gemini sans graphe de sauts | false | La politique déclarative `maxRedirects: 1` et son allowlist décrivent les trois issues demandées ; son exécution reste explicitement reportée à 5.2. |
| Union d’événements non utilisée par le catalogue actif | false | Les adaptateurs ajoutés restent hors UI dans cette story ; leurs marqueurs `type: inaccessible-content` sont néanmoins présents et testés. |
| ChatGPT omettrait les limites injectées | false | Son adaptateur applique déjà `maxBytes` localement et transmet `maxEvents` à l’extracteur ; les limites invalides sont maintenant refusées. |
| Longueur URL ChatGPT (revue cas limite) | medium | Corrigé avec la même garde de 2 048 caractères et son test. |
| Média imbriqué (revue cas limite) | high | Corrigé par la détection récursive commune des médias et pièces jointes. |
| Claude sans texte | medium | Corrigé : Claude retourne `format-unknown` sans événement textuel. |
| Mistral sans texte | medium | Corrigé : Mistral retourne `format-unknown` sans événement textuel. |
| Gemini sans texte | medium | Corrigé : Gemini retourne `format-unknown` sans événement textuel. |
| Payloads des fixtures non vérifiés | medium | Corrigé : les tests vérifient maintenant rôles, textes exacts, ordre et texte vide du signal inaccessible. |

## Design Notes

Le registre distingue le catalogue exhaustif, utile aux stories suivantes, du catalogue actif consommé par l’interface actuelle. L’attestation est une capacité en mémoire : son identité, et non sa forme sérialisable, fait foi.

## Verification

**Commands:**

- `npm test -- --run src/application/import/registry.test.ts src/application/import/*Share.test.ts src/ui/ConversationImport.test.tsx` -- expected: tous les tests ciblés passent.
- `npm run lint` -- expected: aucune erreur TypeScript.
- `npm run build` -- expected: build Vite terminé avec succès.
