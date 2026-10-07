---
title: '7.5 Partager son résultat sans partager sa conversation'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '6a0bab0b56214173150b3770b887eb5cf7c5f2e3'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La section « Résultat » (7.4) ne peut pas être envoyée à quelqu’un : la personne recopie à la main des valeurs, au risque d’y glisser du contenu de sa conversation.

**Approach:** Ajouter dans la section Résultat un unique bouton « Partager », visible seulement pour un résultat valide et à jour. Il produit, par une fonction pure sur une projection fermée `ShareableResult`, un texte sans aucun contenu de conversation, envoyé au partage du système ou, à défaut, copié dans le presse-papiers, avec un retour textuel.

## Boundaries & Constraints

**Always:** Textes via `fr.ts`. Projection `ShareableResult` fermée : chatbot (`state.provider`), nombre d’échanges (blocs non ignorés), équivalence douche, carbone/eau/électricité formatés avec unités (`formatQuantity`, version accessible en clair), mention « Estimation fondée sur des hypothèses, pas sur une mesure. », adresse de la page = `origin + pathname` (ni requête ni fragment). La fonction de texte ne reçoit que cette projection ; un adaptateur `application` construit la projection depuis l’état et appelle `navigator.share({ text })`, sinon `navigator.clipboard.writeText`. Annuler le partage (`AbortError`) n’est ni une erreur ni un message. Succès de copie : « Résultat copié. » (texte, `role="status"`). Échec de copie : message d’explication + action de suite (texte sélectionnable à copier à la main). Bouton : contour `border-interactive`, pictogramme décoratif (`aria-hidden`) + libellé « Partager » visibles, moins saillant que « Calculer », cible ≥ 44 × 44 px, reflow 320 px, aucun statut par la couleur seule. Partage déclenché uniquement par le clic.

**Ask First:** Modifier formules, moteur, empreintes du reducer ou la forme du résultat de 7.4 ; ajouter une dépendance.

**Never:** Inclure message, réponse, raisonnement, artifact, nom de fichier, paramètre de session (pays, LED, PUE…), modèle précis, ni résultat encodé dans le texte ou l’URL. Appel réseau, analytics, stockage durable. Plusieurs boutons de partage. Autoriser le partage d’un résultat périmé. Bouton ou action de partage ailleurs que dans la section Résultat.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Résultat à jour | `isSummaryCurrent` et douche à jour | Bouton « Partager » après le lien des bonnes pratiques | N/A |
| Sans résultat / périmé / erreur de calcul | Aucun résultat, résultat « à recalculer » ou calcul en erreur | Aucun bouton | N/A |
| Partage système | `navigator.share` présent | Ouvre le partage avec le texte ; aucun message de succès requis | `AbortError` ignoré ; autre erreur → repli copie |
| Repli copie | Pas de `navigator.share`, presse-papiers disponible | Texte copié ; « Résultat copié. » annoncé | N/A |
| Copie impossible | Presse-papiers absent ou refusé | Message d’échec + zone texte en lecture seule sélectionnée avec consigne « Copiez ce texte à la main. » | Aucune exception non gérée |
| Douche non calculable | Équivalence `unavailable` | Texte sans ligne douche, autres valeurs présentes | N/A |
| Marqueurs de contenu | Conversation contenant `SECRET-MSG`, `SECRET-REP`, nom de fichier, URL avec `?x=1#y` | Texte sans aucun marqueur ; adresse sans requête ni fragment | N/A |
| Résultat devenu périmé après clic | Message de succès affiché puis texte modifié | Bouton et message retirés | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/ResultSection.tsx` -- ajouter le bouton après `result-link` (l. ~64), dans la branche `current` seulement ; `current` et `shower` y sont déjà calculés ; état local du retour (`useState`) réinitialisé quand `current` devient faux.
- `src/domain/shareableResult.ts` (nouveau) -- type `ShareableResult` et `buildShareText(shareable)` pures, sans accès à `window`.
- `src/application/shareResult.ts` (nouveau) -- `toShareableResult(state, location)` et `shareResult(text, env)` (env injectable : `share`, `writeText`) retournant `'shared' | 'copied' | 'cancelled' | 'failed'`.
- `src/domain/showerEquivalence.ts`, `src/ui/quantityFormatter.ts` -- réutilisés tels quels (`formatQuantity(…).accessible`) ; `isIgnoredConversationBlock` pour compter les échanges.
- `src/i18n/fr.ts` -- clés partage (bouton, texte, « Résultat copié. », échec, consigne) à côté de `result*` (l. 110-126).
- `src/ui/styles.css` -- classe `share-button` (contour, plus discrète que `.primary-action`, cible 44 px, `white-space: normal` à 320 px ; cf. `.result-link` l. 214 et 229).
- Tests : `shareableResult.test.ts`, `shareResult.test.ts`, `ResultSection`/`AppFlow.test.tsx` (existants à compléter).
- Dette 7.4 liée : `deferred-work.md` (statut « Calcul en cours… » non annoncé) — hors périmètre.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/shareableResult.ts` + test -- projection fermée et texte pur ; test avec marqueurs identifiables dans la conversation (aucun ne ressort), URL sans requête ni fragment, cas douche indisponible -- FR-26, AD-10, NFR-3
- [x] `src/application/shareResult.ts` + test -- projection depuis l’état, partage système, repli copie, annulation, échec ; environnement injecté, aucun `fetch` -- AD-10
- [x] `src/i18n/fr.ts`, `src/ui/styles.css` -- textes et style du bouton -- UX-DR27, UX-DR30
- [x] `src/ui/ResultSection.tsx` -- bouton, retour `role="status"`, repli manuel, retrait quand le résultat n’est plus à jour -- UX-DR26, UX-DR27
- [x] Tests d’interface -- chaque ligne de la matrice ; ordre de lecture ; absence de bouton avant calcul et en erreur ; aucun appel réseau ni écriture `localStorage`/`sessionStorage` -- NFR-7
- [x] Scénarios de validation de l’epic 7 (AC final de `epics.md`, l. 1044-1046) : compléter `AppFlow.test.tsx` pour les scénarios encore non couverts, et lister dans le rapport ceux qui relèvent d’une vérification manuelle (zoom 200 %/400 %, 320 px)

**Acceptance Criteria:**
- Given un résultat à jour, when la section est parcourue au clavier, then « Partager » est atteignable, son focus n’est pas masqué par la barre collante et son nom accessible est « Partager ».
- Given un clic sur « Partager », when il s’exécute, then ni requête réseau ni écriture de stockage n’a lieu et rien n’est déclenché au rendu.

## Spec Change Log

## Design Notes

Texte indicatif (ordre et contenu fixes ; formulation finale dans `fr.ts`) :

```
Ma conversation avec {chatbot} ({n} échange(s)) : environ {douche} de douche chaude.
Carbone : {c} · Eau : {e} · Électricité : {w}
Estimation fondée sur des hypothèses, pas sur une mesure.
{origin}{pathname}
```

Le texte est calculé au clic depuis l’état courant, jamais mémorisé. `navigator.share` est testé par présence ; un `canShare` absent n’empêche pas l’appel.

## Verification

**Commands:**
- `npm test -- --run` -- expected: tous les tests passent
- `npx tsc -b --noEmit` -- expected: aucune erreur
- `npm run build` -- expected: build réussi

**Manual checks (if no CLI):**
- Calculer, puis « Partager » avec et sans partage système (désactiver `navigator.share`) ; vérifier le texte collé, l’annonce « Résultat copié. », puis modifier un texte et constater le retrait du bouton ; contrôler 320 px et zoom 400 %.

## Suggested Review Order

**Projection fermée et texte pur**

- Point d'entrée : le texte partagé ne dépend que de la projection fermée.
  [`shareableResult.ts:16`](../../src/domain/shareableResult.ts#L16)

- Construction de la projection depuis l'état (`origin + pathname` seulement).
  [`shareResult.ts:13`](../../src/application/shareResult.ts#L13)

- Partage système, repli presse-papiers, annulation ignorée.
  [`shareResult.ts:55`](../../src/application/shareResult.ts#L55)

**Interface**

- Bouton unique, retour textuel, garde contre double clic et résultat périmé.
  [`ResultSection.tsx:40`](../../src/ui/ResultSection.tsx#L40)

- Rendu du bouton après le lien des bonnes pratiques.
  [`ResultSection.tsx:97`](../../src/ui/ResultSection.tsx#L97)

- Style du bouton, plus discret que « Calculer ».
  [`styles.css:216`](../../src/ui/styles.css#L216)

- Textes de partage.
  [`fr.ts:127`](../../src/i18n/fr.ts#L127)

**Tests**

- Scénarios d'interface du partage.
  [`AppFlow.test.tsx:178`](../../src/ui/AppFlow.test.tsx#L178)
