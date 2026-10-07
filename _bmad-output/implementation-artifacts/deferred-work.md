- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-calculer-tous-les-echanges-et-leur-bilan.md`
  summary: Définir le délai de repli lorsque le Worker de tokenisation ne répond jamais.
  evidence: Le client local peut rester en attente sans erreur; le mécanisme existe avant cette story et nécessite une politique de délai à définir.

- source_spec: `_bmad-output/implementation-artifacts/spec-7-1-commencer-simplement-et-se-reperer-dans-le-parcours.md`
  summary: Porter « Calculer » dans la barre d’action collante de l’étape 2/3 et désactiver « Continuer » si un paramètre est invalide.
  evidence: La barre collante ne couvre que « Continuer » à l’étape 1 ; « Calculer » relève de 7.3 et la validation des paramètres de 7.2.
- source_spec: `_bmad-output/implementation-artifacts/spec-7-1-commencer-simplement-et-se-reperer-dans-le-parcours.md`
  summary: Revoir la hiérarchie des titres de la méthodologie (décalage +2 donne h3/h4 sous le h1).
  evidence: `vite.config.ts` décale les titres du Markdown de 2 niveaux, ce qui saute des niveaux sous le nouveau h1.
