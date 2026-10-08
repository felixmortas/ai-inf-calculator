---
title: 'Internationaliser le site et choisir sa langue depuis l’accueil'
type: 'feature'
created: '2026-10-08'
status: 'done'
baseline_commit: '80b599d08472f4b292c61c9f96a402e829fbee8d'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Toute l’interface lit directement `fr` (`src/i18n/fr.ts`) et des textes, unités et formats français sont codés en dur ailleurs ; impossible d’ajouter une langue, ni de la choisir.

**Approach:** Introduire un registre unique de langues et un contexte React de messages ; migrer tous les textes visibles vers ce contexte ; ajouter sur l’accueil un bouton ouvrant un menu de langues. Le français reste la seule langue livrée : les autres fichiers `<code>.ts` seront fournis par un spécialiste.

## Boundaries & Constraints

**Always:** Liste des langues = un seul tableau dans `src/i18n/languages.ts` (`code`, `label` en autonyme, `intlLocale`, `messages`) ; ajouter une langue = créer `src/i18n/<code>.ts` + une ligne dans ce tableau, rien d’autre. Les fichiers de langue respectent le type `Messages` dérivé de `fr` (clés identiques, littéraux élargis à `string`) : une clé manquante échoue à `npm run lint`. Langue initiale : première langue du navigateur (`navigator.languages`, repli `navigator.language`) correspondant à un `code` du registre, sinon `fr`. Le choix reste en mémoire de session (SPEC.md : aucun stockage durable). `document.documentElement.lang` suit la langue. Nombres, unités, noms de pays (`Intl.DisplayNames`) suivent `intlLocale` ; calculs et données numériques inchangés. Bouton de langue : accueil uniquement, libellé visible = langue courante, `aria-haspopup`/`aria-expanded`, menu au clavier (Entrée/Espace ouvrent, flèches naviguent, Échap ferme et rend le focus au bouton), choix annoncé (`aria-current`/`role="menuitemradio"`), cible ≥ 44 × 44 px, reflow 320 px, ne s’ajoute pas aux deux boutons « Commencer » / « Méthodologie » dans leur ordre. Changer de langue ne réinitialise ni l’état de la conversation ni l’étape.

**Ask First:** Ajouter une dépendance.

**Never:** Ajouter react-i18next ou toute bibliothèque i18n (contexte React + objets typés suffisent, sans complexité ni poids supplémentaire) ; changer `goodPracticesBlogUrl` (même lien pour toutes les langues) ; créer `en.ts`/`es.ts` ; traduire du contenu ; stocker la langue (localStorage, cookie, URL) ; appel réseau ; chercher la langue par géolocalisation ; modifier formules, reducer, catalogues CSV ; afficher le bouton hors de l’accueil.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Navigateur supporté | `navigator.languages = ['xx-YY','yy-ZZ']`, registre {fr, yy} | Interface en `yy`, `<html lang="yy">` | N/A |
| Navigateur non supporté | Aucune langue du navigateur au registre | Interface en `fr` | N/A |
| Ouverture du menu | Clic ou Entrée sur le bouton | Liste des langues (autonymes), langue courante marquée | N/A |
| Choix d’une langue | Sélection de `yy` | Menu fermé, textes de l’accueil en `yy`, focus sur le bouton | N/A |
| Fermeture | Échap ou clic extérieur | Menu fermé, langue inchangée | N/A |
| Changement en cours de parcours | Retour à l’accueil depuis l’étape 2 après saisies, puis changement | Textes saisis et modèle conservés ; étapes suivantes dans la nouvelle langue | N/A |
| Une seule langue au registre | Registre = {fr} | Bouton affiché, menu à un seul choix | N/A |
| Méthodologie sans traduction | `docs/methodology/<code>.md` absent | Version française affichée | Repli silencieux |
| Résultat déjà calculé | Changement de langue | Valeurs et unités reformatées, valeurs numériques identiques | N/A |

</frozen-after-approval>

## Code Map

- `src/i18n/fr.ts` -- source du type `Messages` ; y déplacer les textes codés en dur (unités et pluriels de `quantityFormatter.ts`, « Monde », « très élevée », `resultLedPower`, titre de page).
- `src/i18n/languages.ts` (nouveau) -- registre, `defaultLanguage`, `detectLanguage(navigatorLanguages, registry)`.
- `src/i18n/I18nProvider.tsx` (nouveau) -- contexte `{ language, messages, locale, setLanguage }`, hook `useI18n()`, prop `languages` injectable en test, met à jour `document.documentElement.lang` et `document.title`.
- `src/main.tsx` -- envelopper `<App />` dans `I18nProvider`.
- `src/ui/App.tsx`, `ConversationConfiguration.tsx`, `ConversationBlocks.tsx`, `ResultSection.tsx`, `CalculationBar.tsx`, `Methodology.tsx` -- remplacer `import { fr }` par `useI18n()`.
- `src/ui/LanguageMenu.tsx` (nouveau) -- bouton + menu ; rendu dans `.start-paths` (App.tsx l. ~239) sous « Méthodologie ».
- `src/ui/quantityFormatter.ts` -- `formatQuantity(value, kind, messages, locale)` ; supprimer le `replace` du « s » pluriel (singulier/pluriel dans les messages).
- `src/domain/shareableResult.ts`, `src/application/shareResult.ts` -- `buildShareText(shareable, messages)` : le domaine ne lit plus `fr`.
- `src/data/modelCatalog.ts` (l. 117-150) -- libellés de pays calculés via `Intl.DisplayNames(locale)` à l’affichage ; codes ISO inchangés.
- `vite.config.ts` -- module virtuel `virtual:methodology-content` : table `{ code: html }` construite par glob de `docs/methodology/*.md` ; `docs/methodologie-empreinte-inference-llm.md` est renommé `docs/methodology/fr.md` (git mv) ; repli français.
- `src/ui/styles.css` -- styles bouton/menu (cf. `.start-paths` l. 22, 43).
- Tests existants à adapter : `AppFlow.test.tsx`, `ConversationBlocks.test.tsx`, `ConversationConfiguration.test.tsx`, `CalculationFailure.test.tsx`, `quantityFormatter.test.ts`, `shareableResult.test.ts`, `shareResult.test.ts` (rendre dans `I18nProvider`).

## Tasks & Acceptance

**Execution:**
- [x] `src/i18n/fr.ts`, `languages.ts`, `I18nProvider.tsx`, `main.tsx` -- type `Messages`, registre, contexte, `lang`/`title` -- socle (NFR-5)
- [x] Composants UI listés, `quantityFormatter.ts`, `shareableResult.ts`, `shareResult.ts`, `modelCatalog.ts` -- migrer vers messages et `intlLocale` ; aucun texte français restant hors `fr.ts` -- NFR-5
- [x] `docs/methodology/fr.md` (renommage), `vite.config.ts`, `Methodology.tsx`, liens dans `SPEC.md`, `calculation-contract.md`, `addendum.md` -- méthodologie par langue avec repli -- NFR-5
- [x] `src/ui/LanguageMenu.tsx`, `App.tsx`, `styles.css` -- bouton et menu accessibles sur l’accueil
- [x] `src/i18n/languages.test.ts` -- `detectLanguage` (préférence, région ignorée, repli) ; contrôle que chaque langue du registre a les mêmes clés que `fr`
- [x] `src/ui/LanguageMenu.test.tsx` -- tests d’UI avec langue factice `yy` injectée : scénarios de la matrice (ouverture clavier/souris, choix, Échap, focus, `aria-*`, `lang`, conservation de l’état, accueil seul, ordre des boutons, formats de nombres, repli méthodologie)
- [x] Tests existants -- adapter au provider ; aucune régression en français

**Acceptance Criteria:**
- Given le registre {fr, yy}, when j’ajoute une troisième entrée, then elle apparaît dans le menu sans autre modification de code.
- Given la langue `yy` choisie, when je parcours les trois étapes et le résultat, then aucun texte français ne subsiste.
- Given un clavier seul, when j’utilise le menu, then tout est atteignable et le focus n’est jamais perdu.
- Given `npm run lint` et `npm test`, when ils s’exécutent, then ils passent.

## Design Notes

`export type Messages = Widen<typeof fr>` avec `Widen<T>` : `string` pour les littéraux, fonctions et objets conservés récursivement. Les tests injectent `yy = { ...fr, startAction: 'Start-yy' }` plutôt que de créer `en.ts`.

## Verification

**Commands:**
- `npm run lint` -- expected: aucune erreur de type (clés de langue complètes)
- `npm test -- --run` -- expected: tous les tests passent
- `grep -rnE "[À-ÿ]" src/ui src/domain src/application --include=*.ts --include=*.tsx | grep -v test | grep -v "//"` -- expected: aucun texte visible

**Manual checks (if no CLI):**
- Sur l’accueil à 320 px : le bouton de langue ne déborde pas, le menu reste lisible, `<html lang>` change.

## Suggested Review Order

**Socle i18n**

- Registre unique et détection de la langue du navigateur.
  [`languages.ts:21`](../../src/i18n/languages.ts#L21)

- Contexte React : messages, locale, `lang` et titre de page.
  [`I18nProvider.tsx:18`](../../src/i18n/I18nProvider.tsx#L18)

**Migration des textes et formats**

- Unités et pluriels pilotés par les messages et la locale.
  [`quantityFormatter.ts:13`](../../src/ui/quantityFormatter.ts#L13)

- Noms de pays via `Intl.DisplayNames`, codes ISO inchangés.
  [`modelCatalog.ts:146`](../../src/data/modelCatalog.ts#L146)

- Le domaine ne lit plus `fr` : messages passés en argument.
  [`shareResult.ts:3`](../../src/application/shareResult.ts#L3)

**Méthodologie par langue**

- Module virtuel construit depuis `docs/methodology/*.md`, garde sur `fr.md`.
  [`vite.config.ts:9`](../../vite.config.ts#L9)

- Repli français, signalé par `lang="fr"`.
  [`Methodology.tsx:10`](../../src/ui/Methodology.tsx#L10)

**Bouton de langue**

- Menu accessible au clavier, rendu sur l’accueil uniquement.
  [`LanguageMenu.tsx:5`](../../src/ui/LanguageMenu.tsx#L5)

- Placement sous « Méthodologie ».
  [`App.tsx:249`](../../src/ui/App.tsx#L249)

**Tests**

- Scénarios de la matrice avec langue factice `yy`.
  [`LanguageMenu.test.tsx:1`](../../src/ui/LanguageMenu.test.tsx#L1)

- Détection et complétude des clés de langue.
  [`languages.test.ts:1`](../../src/i18n/languages.test.ts#L1)

- Libellés français des pays.
  [`countryLabels.test.ts:1`](../../src/data/countryLabels.test.ts#L1)
