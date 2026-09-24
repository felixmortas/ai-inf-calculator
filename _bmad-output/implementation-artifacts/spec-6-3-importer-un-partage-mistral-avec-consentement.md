---
title: '6.3 — Importer un partage Mistral avec consentement'
type: 'feature'
created: '2026-09-24'
status: 'done'
baseline_commit: 'e8785d06888e302528f1d66442c7f3c49bf94b10'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les dialogues d’import laissent le fond actif, placent le focus sur l’accord et annoncent tous les textes prévisualisés. Après import, « rapide » est choisi sans décision de la personne.

**Approach:** Achever le parcours d’import consenti : contrôle du lien et de la destination, dialogues accessibles, prévisualisation avant tout ajout, remplacement confirmé et choix explicite du mode Mistral avant calcul.

## Boundaries & Constraints

**Always:** N’accepter qu’un lien public Mistral canonique, vérifié localement avant consentement ou trafic. Montrer l’URL entière et l’endpoint Worker actif dans un consentement ponctuel lié aux deux ; seul `shareUrl` quitte le navigateur dans le `POST` borné. Garder la session intacte après refus, annulation, erreur, prévisualisation vide ou requête obsolète. Prévisualiser avant `blocksReplaced` ; exiger un second accord si le fil contient du texte. Préserver la saisie manuelle et le choix de modèle.

**Never:** Inférer le mode du texte ou présélectionner « rapide » après import. Envoyer blocs, fichiers, résultats ou paramètres ; calculer au chargement ou au remplacement ; réactiver un consentement consommé ; attester les garanties internes du Worker absent du dépôt.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Comportement attendu | Erreur |
|---|---|---|---|
| Lien refusé | URL non Mistral ou mal formée | Refus local, lien conservé, saisie manuelle possible | Aucune requête ni dialogue |
| Consentement | URL Mistral et endpoint admis | URL et endpoint entiers ; Annuler reçoit le focus ; fond inerte ; Tab contenu ; Échap ferme et rend le focus | Modification d’URL ou de configuration invalide l’accord |
| Récupération | Accord explicite et encore valide | Un seul `POST` avec `{shareUrl}` ; réponse bornée et extraite localement | Réseau, limite ou format inconnu ne changent pas le fil |
| Prévisualisation | Échanges extraits | Titres et avertissements parcourables ; seule la phrase de décompte est annoncée, puis focus sur le titre | Aucun échange exploitable : aucun ajout |
| Remplacement | Fil déjà renseigné | Dialogue distinct ; « Conserver ma conversation » reçoit le focus ; fond inerte, Échap et restitution du focus ; validation remplace atomiquement | Annulation conserve le fil |
| Modèle | Partage sans mode fiable | Choix explicite rapide ou réflexion avant l’accès au calcul ; modèle ensuite modifiable | Aucun mode déduit du contenu |

</frozen-after-approval>

## Code Map

- `src/application/import/registry.ts`, `shareAttestation.ts`, `mistralShare.ts` — registre Mistral, capacité opaque et canonicalisation à réutiliser ; conserver les adaptateurs isolés.
- `src/application/import/remoteGateway.ts`, `resolvedShareImport.ts` — consentement unique, endpoint allowlisté, `POST` limité à `shareUrl`, délai/volume bornés ; corriger seulement les écarts prouvés.
- `src/ui/ConversationImport.tsx` — parcours et `blocksReplaced` existent ; corriger isolation, focus des dialogues, annonce et demande obsolète.
- `src/ui/App.tsx`, `ConversationConfiguration.tsx` — `onImported` sélectionne « rapide » ; imposer un choix avant le fil, garder le choix direct d’un modèle valide.
- `src/i18n/fr.ts`, `src/ui/styles.css` — libellés du choix, de la confirmation, du décompte, et présentation accessible des URL et dialogues.
- `docs/importer-un-partage-chatgpt.md` — aide à aligner sur Mistral seul, endpoint réel, données et métadonnées traitées, incertitudes de conservation ; consigner la limite de vérification D-4 du Worker externe.
- `src/ui/ConversationImport.test.tsx`, `src/ui/AppFlow.test.tsx`, `src/application/import/registry.test.ts`, `remoteGateway.test.ts` — adapter les assertions anciennes et vérifier les frontières et scénarios de la matrice.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/ConversationImport.tsx`, `src/ui/styles.css`, `src/i18n/fr.ts` — rendre les dialogues distincts et modaux au clavier, isoler le fond, gérer Échap, focus initial et retour au déclencheur ; annoncer seulement les nombres et viser le titre de prévisualisation.
- [x] `src/ui/App.tsx`, `src/ui/ConversationConfiguration.tsx` — après import, demander le mode Mistral sans valeur confirmée par défaut ; empêcher l’accès au fil et au calcul tant que le choix manque, puis laisser changer le modèle.
- [x] `src/application/import/registry.ts`, `remoteGateway.ts` — vérifier et couvrir le refus local et en passerelle des autres fournisseurs, la liaison du consentement à l’URL/endpoint et le seul champ `shareUrl` ; corriger tout écart concret.
- [x] `docs/importer-un-partage-chatgpt.md` — décrire le seul parcours Mistral et les garanties vérifiables côté navigateur ; documenter les garanties internes du Worker à revoir pour D-4 avant publication.
- [x] `src/ui/ConversationImport.test.tsx`, `src/ui/AppFlow.test.tsx`, tests d’import applicatifs — couvrir la matrice, les requêtes obsolètes, la conservation du fil et les transitions au clavier.

**Acceptance Criteria:**
- Given un lien non Mistral ou un consentement annulé, when la personne utilise l’import, then aucune requête ne part et la saisie manuelle reste accessible.
- Given une prévisualisation et un fil renseigné, when la personne refuse ou accepte le remplacement, then le fil est respectivement conservé ou remplacé en une seule action, sans calcul automatique.
- Given un import Mistral sans mode attesté, when la personne arrive à la configuration, then elle choisit rapide ou réflexion avant de pouvoir calculer.

## Implementation Notes

- Les styles de dialogue existants servent aux portails modaux ; une règle spécifique rétablit les couleurs du dialogue de remplacement.
- Le registre et la passerelle refusaient déjà les autres fournisseurs, liaient le consentement à l’URL et à l’endpoint et limitaient le corps à `shareUrl` ; les tests existants confirment ces frontières.
- Le choix de mode est désormais obligatoire après import, même si la personne tente de changer de fournisseur avant la sélection.

## Spec Change Log

## Review Triage Log

| Source | Verdict et preuve | Route |
|---|---|---|
| Edge case — retour manuel | medium : `awaitingImportedMistralMode` persiste après retour accueil/import et bloque la sélection manuelle. | patch |
| Verification gap — fond de l’application | medium : les tests de dialogue montent le composant seul ; aucun ne vérifie `.app-shell` et son bouton retour. | patch |
| Verification gap — retour manuel | medium : même état persistant confirmé dans `App.tsx` ; le parcours manuel reprend le verrou. | patch, même cause que la première ligne |
| Blind — retour manuel | medium : `openSelection('home')` et `onManual` ne réinitialisent pas le verrou d’import. | patch, même cause |
| Blind — modèle affiché avant mode | medium : le sélecteur désactivé affiche encore `mistral-small` alors que le mode visible est vide. | patch |
| Blind — focus après requête | medium : le bouton d’accord disparaît avant la réponse ; une erreur laisse le focus sans destination définie. | patch |
| Blind — annonce du décompte | maybe-false : le texte du `role="status"` est monté avec la prévisualisation et le titre reçoit le focus ; il faut vérifier le comportement avec lecteurs d’écran réels pour établir une annonce manquée. | defer, risque moyen non vérifié |
| Blind — noms des champs dans les avertissements | low : les anciens textes `Artifact` et `uploadez` ne reprennent pas les intitulés actuels ; ces chaînes existaient avant cette story. | defer, antérieur |
| Blind — style de remplacement | low : `.import-consent`, plus tard dans la feuille, écrase la bordure et le fond de `.import-confirmation` sur le dialogue devenu commun aux deux classes. | patch |
| Blind — fermeture sur changement d’adaptateur | medium : l’effet ferme aussi la confirmation, mais `wasOpen` ne couvre que le consentement et ne rétablit pas le focus. | patch |
| Blind — contexte epic 6 | low : la réécriture antérieure à cette session a omis des détails de mouvement et de focus ; ce fichier était déjà modifié au départ. | defer, antérieur |
| Blind — suivi D-4 du Worker | false : la tâche de la spec porte sur la documentation de la limite, bien présente dans l’aide ; la spec interdit d’attester le Worker externe et ne demande pas sa vérification dans cette story. | rejet |

## Verification

**Commands:**
- `npm test -- --run` — scénarios d’import et régression verts.
- `npm run lint` — types valides.
- `npm run build` — application compilable.
- `git diff --check` — aucun défaut d’espacement.

**Résultats (2026-09-24) :** 24 fichiers de tests et 218 tests passés ; lint, build et contrôle d’espacement passés après corrections de revue.
