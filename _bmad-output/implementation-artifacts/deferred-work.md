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
- source_spec: `_bmad-output/implementation-artifacts/spec-5-2-recuperer-un-partage-par-une-passerelle-tiers-bornee.md`
  summary: Rétablir le dialogue 5.1 et le test UI de consentement qui remettra une capacité ponctuelle à la passerelle.
  evidence: La story 5.2 expose volontairement `consent-required` sans modifier l’UI, explicitement exclue par son intent gelé.
- source_spec: `_bmad-output/implementation-artifacts/spec-5-3-documenter-et-verifier-la-frontiere-d-import-distant-multi-fournisseur-v2.md`
  summary: Étendre les preuves de requête réelle de `remoteGateway` aux quatre fournisseurs et permettre à la passerelle d’attester la redirection Gemini autorisée.
  evidence: La passerelle ne teste une réussite réseau que pour ChatGPT et refuse Gemini avant `fetch`; ce comportement préexistant empêche une preuve intégrée de succès réseau pour les quatre fournisseurs.
