# Revue rubric — spine d’architecture, 23 septembre 2026

**Verdict : corrections ciblées avant clôture.** Les décisions de la proposition approuvée et de l’UX finale sont couvertes. Le lint déterministe passe avec zéro constat. Trois écarts de cohérence restent dans le spine ; aucun ne remet en cause la stratégie Worker ou le périmètre Mistral.

## Constats

### Élevé — version de Vite contraire au projet réel

- **Preuve :** `ARCHITECTURE-SPINE.md:114` fixe Vite `7.3.3`, tandis que `package.json` fixe `8.3.0` et que le projet est déjà brownfield. [La fiche npm de Vite](https://www.npmjs.com/package/vite?activeTab=versions) confirme l’existence de ces deux versions et `8.3.0` comme version publiée actuelle.
- **Risque :** deux builders peuvent appliquer des conventions et diagnostiquer des problèmes sur des versions majeures différentes. Le spine ne ratifie pas ici le code qu’il gouverne.
- **Suite :** **autofix** — reporter `8.3.0` dans le tableau Stack ; conserver l’exigence de publication de AD-1.

### Moyen — le diagramme de dépendances contredit AD-2

- **Preuve :** `ARCHITECTURE-SPINE.md:31-37` dessine `DOMAIN --> APP` et `CATALOG --> APP` sans légende indiquant un flux de données ; `AD-2` (`:48-52`) impose les dépendances dirigées vers le noyau.
- **Risque :** un builder peut lire ces flèches comme des imports du domaine ou des catalogues vers `application`, ce qui inverse la règle.
- **Suite :** **autofix** — orienter le diagramme comme les dépendances de code, ou étiqueter explicitement les flèches inverses comme retours de données. Une seule convention de flèche rendrait la règle vérifiable.

### Moyen — propriété des empreintes non ratifiée par le code existant

- **Preuve :** `AD-3` (`:58`) attribue au domaine la production de `impactFingerprint` et `showerFingerprint`, mais les fonctions sont actuellement dans `src/application/conversationReducer.ts:187-221` et importent catalogue et résolution de paramètres. La règle de `AD-2` interdit précisément l’import d’un fichier de données par `domain`.
- **Risque :** la story 6.2 pourrait déplacer ces fonctions vers `domain` pour suivre AD-3, alors que la structure actuelle et AD-2 exigeraient une injection de données ou une séparation supplémentaire. Deux implémentations raisonnables divergent sur cette frontière.
- **Suite :** **discuter puis amender** — préciser si `application` construit les empreintes à partir de fonctions pures du domaine, ou décider explicitement une migration du calcul canonique avec ses données injectées. Conserver les mêmes dépendances de fraîcheur dans les deux cas.

## Contrôles positifs et portée

- `AD-8` fixe l’admission Mistral à la validation et à `remoteGateway`, l’identité attestée du partage, le consentement lié à l’URL et à l’endpoint actif, le `POST {shareUrl}`, la réponse HTML bornée et la prévisualisation sans mutation. Il reflète la proposition de sprint et distingue le navigateur du Worker.
- `AD-5` couvre les références Mistral, la normalisation des clés fournisseur et la sélection directe des modèles ; `AD-3` et `AD-9` couvrent la progression de session, le calcul explicite, la fraîcheur, les métriques par surface et les unités adaptées.
- Le déploiement GitHub Pages est décidé dans `AD-1` ; l’exploitation interne du Worker et le workflow d’intégration précis ont des conditions de reprise dans `Deferred`. Les dimensions opérationnelles ne sont pas silencieuses.
- La revue juge le contrat d’architecture, pas l’achèvement des stories 6.1–6.4. Le code actuel expose encore quatre fournisseurs ; c’est la migration demandée par la proposition, et non une contradiction du contrat cible.

## Vérification

`uv run .agents/skills/bmad-architecture/scripts/lint_spine.py --workspace _bmad-output/planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18` → `ok: true`, `total_findings: 0`.
