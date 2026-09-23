# Validation UX — Empreinte IA

- DESIGN.md : `_bmad-output/planning-artifacts/ux-designs/ux-ao-env-impact-calculator-2026-09-23/DESIGN.md`
- EXPERIENCE.md : `_bmad-output/planning-artifacts/ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md`
- Date : 2026-09-23 18:30 UTC

## Synthèse

Les deux parcours principaux sont couverts. La revue initiale a trouvé des lacunes pour les contrôles d'import, les réglages, le total incomplet et l'accessibilité ; les spines et quatre maquettes ont été corrigées. Le point classé critique dans l'architecture concernait CorsProxy, remplacé depuis par le Worker d'import : le consentement doit afficher l'endpoint réellement configuré.

## Verdicts de la revue initiale

- **Couverture des parcours — adequate.** UJ-1 et UJ-2 présents ; le parcours de réglages et le recalcul du total ont été ajoutés.
- **Complétude des tokens — adequate.** Tokens nommés et résolus ; focus, états et contour interactif précisés.
- **Couverture des composants — thin.** La revue initiale relevait des composants absents ; consentement, prévisualisation, modèle et paramètres sont désormais décrits.
- **Couverture des états — thin.** La revue initiale relevait des états manquants ; import, paramètres et bilan incomplet sont désormais couverts.
- **Références visuelles — adequate.** Quatre maquettes ont été promues et liées aux sections pertinentes ; trois surfaces restent décrites par les spines seules, selon le choix de Felix.
- **Volume et précision — adequate.** Le tableau des écarts au produit existant est conservé comme note de migration explicite.
- **Discipline des sources — broken.** Le point critique initial provient de l’architecture CorsProxy antérieure. Le code et la spécification de migration confirment le Worker actuel ; le dialogue affiche l’endpoint configuré.
- **Adéquation de la forme — strong.** Sections canoniques et parcours nommés présents.

## Constats par gravité

### Critical (1)

- **Destination d’import** (Discipline des sources) : Le reviewer citait CorsProxy depuis AD-8. La migration implémentée utilise le Worker ; la source récente est ajoutée et la destination doit provenir de la configuration active. *État : résolu.*

### High (4)

- **Contraste des contrôles** (Accessibilité) : Le contour initial de Canopée claire était trop pâle. Un token interactif #5C7866 et ses usages ont été ajoutés aux spines et maquettes finales. *État : résolu.*
- **Annonce de la prévisualisation** (Accessibilité) : Annoncer seulement le nombre d’échanges et d’avertissements ; placer le focus sur le titre, sans aria-live sur tout le contenu. *État : résolu dans la spécification.*
- **Confirmation du remplacement** (Accessibilité) : Dialogue distinct avec focus initial sur conserver, Échap, fond inerte et restitution du focus. *État : résolu dans la spécification.*
- **Composants et états manquants** (Couverture) : Import, modèle, paramètres, total incomplet et recalcul ont été définis. *État : résolu.*

### Medium (3)

- **Rendu des unités** (Couverture et accessibilité) : Séries d’unités, seuils, noms vocaux et cas extrêmes ont été précisés ; la précision reste à vérifier sur données réelles. *État : hypothèse de précision ouverte.*
- **Maquettes des états secondaires** (Références visuelles) : Choix du modèle, réglages et péremption restent sans maquette dédiée. Felix a validé une construction depuis les spines. *État : accepté.*
- **Focus et annonces groupées** (Accessibilité) : Transitions entre étapes, import confirmé et péremption multiple ont maintenant un contrat de focus et d’annonce. *État : résolu dans la spécification.*

### Low (1)

- **Vocabulaire grand public** (Accessibilité) : Le parcours emploie « Document ou code généré » et explique les unités et termes techniques. *État : résolu.*

## Fichiers de revue

- `review-rubric.md`
- `review-accessibility.md`
