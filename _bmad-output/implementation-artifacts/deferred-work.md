- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-calculer-tous-les-echanges-et-leur-bilan.md`
  summary: Définir le délai de repli lorsque le Worker de tokenisation ne répond jamais.
  evidence: Le client local peut rester en attente sans erreur; le mécanisme existe avant cette story et nécessite une politique de délai à définir.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-calculer-tous-les-echanges-et-leur-bilan.md`
  summary: Préserver les impacts et le bilan lors de l’ajout ou de la suppression d’un bloc entièrement vide.
  evidence: L’invalidation générale et l’empreinte actuelle font disparaître le bilan; ce comportement est couvert explicitement par la story 3.2.
- source_spec: `_bmad-output/specs/spec-import-chatgpt-share/stories/1-socle-d-import-extensible-et-adaptateur-chatgpt-v1.md`
  summary: Aligner le validateur du prototype Python de faisabilité sur l’URL canonique sans slash final.
  evidence: Écart préexistant dans un outil d’étude non utilisé par l’adaptateur de production.
- source_spec: `_bmad-output/specs/spec-import-chatgpt-share/stories/1-socle-d-import-extensible-et-adaptateur-chatgpt-v1.md`
  summary: Retirer et prévenir le fichier Python bytecode du prototype de faisabilité.
  evidence: Artefact généré préexistant parmi les fichiers non suivis, hors surface applicative de la story.
