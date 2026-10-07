---
title: '7.2 Choisir son IA et régler ses hypothèses sans se perdre'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: '5137a26498f6c7b744000596a5cba49aacf32dcf'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’étape 1/3 expose un menu « Modèle » brut, un pays déduit du fuseau horaire, des « Paramètres avancés » à plat et un bouton « Appliquer les paramètres » ; le grand public ne sait ni ce qui est estimé, ni quoi corriger.

**Approach:** Refondre `ConversationConfiguration` : « Modèle estimé : … » + « Modifier », pays de la personne déduit de la langue du navigateur (sinon Monde), « Mode avancé » replié contenant le « Mode expert » replié, validation en direct et application des valeurs par « Continuer » (sans « Appliquer », sans calcul), annonce unique des résultats « à recalculer ».

## Boundaries & Constraints

**Always:** Textes via `fr.ts`. Libellé visible sur toute action. Cibles ≥ 44 × 44 px. Unités indiquées. Message d’erreur lié au champ (`aria-describedby`), focus sur la première erreur (en dépliant la section qui la contient). Rien n’est stocké ni envoyé. Les textes saisis, le chatbot et le modèle survivent à « Rétablir les valeurs par défaut ». Le prompt système n’est jamais affiché.

**Ask First:** Toute modification des formules, de `conversationReducer.ts` ou de la structure des données du catalogue au-delà de l’ajout de `ledPowerW` aux paramètres de comparaison.

**Never:** Implémenter 7.3 (calcul unique, retrait du calcul par bloc, libellés des champs de conversation, « Calculer » collant), 7.4 (durée LED, résultat) ou 7.5. Géolocalisation, fuseau horaire ou appel réseau. Lien externe. Nouveau stockage.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pays déduit | `navigator.language` = `fr-FR` / `fr` / `en-XX` | FR / Monde / Monde, présenté « Pays estimé : … » + « Modifier » | N/A |
| Modèle | ChatGPT + abonnement | « Modèle estimé : … » ; « Modifier » révèle la liste des modèles du fournisseur | N/A |
| Valeurs valides | Débit modifié puis « Continuer » | Valeurs appliquées, étape 2/3, aucun calcul ; seule l’équivalence est « à recalculer » | N/A |
| Champ invalide | PUE = 0,9 (Mode expert replié) | « Continuer » `aria-disabled` + explication ; clic → Mode avancé et expert dépliés, focus sur PUE | Message lié au champ |
| Rétablir | Surcharges + textes saisis | Références rétablies, textes/chatbot/modèle conservés | N/A |
| Repli Monde | Facteur du pays d’hébergement absent | Signalé près du champ sans changer le pays | N/A |

</frozen-after-approval>

## Code Map

- `src/ui/ConversationConfiguration.tsx` -- à refondre : formulaire `apply` (l. 52-74) et `Parameter` ; `differences`, `invalidParameterFields`, `constantFields` à conserver.
- `src/ui/App.tsx` -- `configurationDispatch` (l. 113-123, annonce déplacée dans « Continuer »), barre collante (l. 254) ; applique via une ref vers la configuration.
- `src/data/modelCatalog.ts` -- `detectUserCountry` (l. 186, retirer fuseau) ; `ShowerParameters` + `defaultShowerParameters` (l. 9-10, ajouter `ledPowerW: 5`), `resolveImpactParameters` (validation `ledPowerW > 0`). `showerFingerprint` couvre déjà `resolved.shower` : une modif LED/douche ne périme que l’équivalence.
- `src/domain/modelSelection.test.ts` (l. 35-38) -- test de `detectUserCountry` à réécrire.
- `src/i18n/fr.ts` -- libellés, aides, explications PUE/WUE/tokens.
- `src/ui/styles.css` -- `.advanced-settings`, retrait du Mode expert, `.link-button`.
- `src/ui/ConversationConfiguration.test.tsx`, `ConversationBlocks.test.tsx` (l. 154-169, 431-488), `AppFlow.test.tsx` -- tests utilisant « Paramètres avancés », « Appliquer les paramètres », « Modèle ».

## Tasks & Acceptance

**Execution:**
- [x] `src/data/modelCatalog.ts` -- `detectUserCountry(language?)` : région de la langue, sinon `WORLD` ; `ledPowerW` (5 W) dans les paramètres de comparaison, surchargeable, > 0 -- AD-6
- [x] `src/domain/modelSelection.test.ts` -- cas `fr-FR`, `fr`, région inconnue, fuseau ignoré
- [x] `src/i18n/fr.ts` -- « Modèle estimé », « Modifier », « Pays estimé », libellés « Où vous vous trouvez… » / « Où est hébergée l’IA… », « Mode avancé », « Mode expert », LED, aides par champ expert, glossaire PUE/WUE/tokens, explication du blocage ; retirer « Appliquer les paramètres »
- [x] `src/ui/ConversationConfiguration.tsx` -- modèle estimé + « Modifier » ; Mode avancé (pays, douche, LED, « Rétablir » discret) contenant Mode expert (hébergement, carbone, paramètres, PUE, WUE, constantes) ; formulaire toujours monté ; validation en direct ; handle `collect()` (valide, déplie, focalise) ; repli « Monde » près du champ
- [x] `src/ui/App.tsx` -- « Continuer » applique les surcharges (si changées), annonce unique `recalculationNotice`, `aria-disabled` + explication si invalide ; plus de `parametersValidationFailed`
- [x] `src/ui/styles.css` -- retrait visible du Mode expert, lien « Rétablir », état désactivé non porté par la couleur seule
- [x] Tests -- chaque ligne de la matrice, absence d’« Appliquer », rétention des textes, annonce unique, focus sur la première erreur

**Acceptance Criteria:**
- Given l’étape 1/3, when elle s’affiche, then « Mode avancé » est replié sous le choix du modèle et « Mode expert » n’apparaît qu’à l’intérieur.
- Given des paramètres modifiés valides, when « Continuer » est activé, then ils sont appliqués sans calcul ni bouton « Appliquer » et une seule annonce signale les résultats « à recalculer ».
- Given un champ invalide, when la personne tente de continuer, then elle reste à l’étape 1, le message est lié au champ et le focus l’atteint.

## Design Notes

Validation en direct (événement du formulaire) pour que « Continuer » reflète l’état ; `aria-disabled` plutôt que `disabled` afin que la tentative de clic puisse déplacer le focus. Les listes déroulantes (chatbot, abonnement, modèle, pays) restent appliquées immédiatement comme aujourd’hui ; seuls les champs numériques sont un brouillon appliqué par « Continuer ». Les entrées du formulaire sont clés par `nom:valeur:version` pour ne pas remonter le formulaire (le focus des listes est conservé).

## Verification

**Commands:**
- `npm test -- --run` -- expected: tous les tests passent
- `npx tsc -b --noEmit` -- expected: aucune erreur
- `npm run build` -- expected: build réussi

**Manual checks (if no CLI):**
- Étape 1 au clavier et à 320 px : Modifier, Mode avancé, Mode expert, erreur sur PUE, Continuer.

## Suggested Review Order

**Point d’entrée : « Continuer » applique les réglages**

- « Continuer » collecte, bloque ou applique, sans calcul, avec une seule annonce.
  [`App.tsx:127`](../../src/ui/App.tsx#L127)

- Bouton `aria-disabled` et explication annoncée (`role="alert"`).
  [`App.tsx:264`](../../src/ui/App.tsx#L264)

**Formulaire de configuration**

- `collect()` valide, déplie les sections et focalise la première erreur.
  [`ConversationConfiguration.tsx:77`](../../src/ui/ConversationConfiguration.tsx#L77)

- Mode expert replié dans le Mode avancé.
  [`ConversationConfiguration.tsx:182`](../../src/ui/ConversationConfiguration.tsx#L182)

**Données**

- Pays déduit de la langue seule, sans fuseau horaire.
  [`modelCatalog.ts:176`](../../src/data/modelCatalog.ts#L176)

- Puissance LED surchargeable, strictement positive.
  [`modelCatalog.ts:10`](../../src/data/modelCatalog.ts#L10)

**Textes et style**

- Libellés, unités et aides par champ.
  [`fr.ts:45`](../../src/i18n/fr.ts#L45)

- État désactivé non porté par la couleur seule.
  [`styles.css:32`](../../src/ui/styles.css#L32)

**Tests**

- Une ligne de la matrice par test, dont la LED.
  [`ConversationConfiguration.test.tsx:165`](../../src/ui/ConversationConfiguration.test.tsx#L165)

- Validation de `ledPowerW` au niveau domaine.
  [`modelSelection.test.ts:58`](../../src/domain/modelSelection.test.ts#L58)
