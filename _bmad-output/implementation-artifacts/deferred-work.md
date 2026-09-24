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
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-choisir-son-parcours-et-son-modele-de-reference.md`
  summary: Vérifier que la publication Pages sert le calculateur au préfixe attendu sans remplacer le site racine.
  evidence: Le workflow antérieur à la story publie `dist` comme artefact ; il faut connaître la configuration de domaine et l’URL Pages effectives pour établir si ce chemin convient ou écrase le site racine.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-choisir-son-parcours-et-son-modele-de-reference.md`
  summary: Placer le focus initial du consentement d’import sur l’action conservatrice.
  evidence: Le dialogue existant place le focus sur « Continuer avec le Worker » ; le parcours d’import et ses dialogues relèvent de la story 6.3.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-choisir-son-parcours-et-son-modele-de-reference.md`
  summary: Rendre le fond inerte pendant le dialogue de consentement.
  evidence: Le dialogue préexistant expose `aria-modal` et piège Tab, mais ne rend pas les contrôles du fond inertes ; la story 6.3 couvre cette interaction.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-choisir-son-parcours-et-son-modele-de-reference.md`
  summary: Gérer le focus, Échap et la restitution du focus dans le dialogue de remplacement.
  evidence: Le dialogue de remplacement préexistant ne déplace pas le focus et n’isole pas les contrôles du fond ; la story 6.3 couvre cette confirmation.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-1-choisir-son-parcours-et-son-modele-de-reference.md`
  summary: Limiter l’annonce de la prévisualisation d’import aux nombres d’échanges et d’avertissements.
  evidence: Le conteneur `aria-live` préexistant comprend les messages entiers ; la story 6.3 prévoit un résumé annoncé et un focus sur le titre.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-suivre-les-echanges-et-leurs-estimations.md`
  summary: Réserver les recommandations au bilan valide.
  evidence: Leur affichage dès qu’un échange possède un impact actuel précédait la story 6.2 ; le bilan de 6.4 doit décider de leur emplacement.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-suivre-les-echanges-et-leurs-estimations.md`
  summary: Adapter les unités et la précision des trois métriques du bilan.
  evidence: Le bilan préexistant utilise des unités fixes et quatre chiffres significatifs, alors que les décisions UX demandent les séries adaptées et trois chiffres.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-suivre-les-echanges-et-leurs-estimations.md`
  summary: Adapter la durée de douche du bilan aux unités milliseconde, seconde, minute, heure et jour.
  evidence: Le composant de bilan préexistant affiche toujours des secondes ; la décision UX demande une unité choisie selon la valeur.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-2-suivre-les-echanges-et-leurs-estimations.md`
  summary: Lier chaque numéro d’échange bloquant le recalcul du total à sa carte.
  evidence: La liste préexistante nomme les échanges sans offrir le chemin de récupération prévu par EXPERIENCE.md.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-3-importer-un-partage-mistral-avec-consentement.md`
  summary: Vérifier sur lecteurs d’écran que le décompte de prévisualisation est annoncé avant le focus sur son titre.
  evidence: Le `role="status"` apparaît rempli avec la prévisualisation ; il faut un essai VoiceOver et NVDA pour établir si le déplacement immédiat du focus interrompt l’annonce.
- source_spec: `_bmad-output/implementation-artifacts/spec-6-3-importer-un-partage-mistral-avec-consentement.md`
  summary: Aligner les avertissements de contenu importé sur les noms des champs actuels.
  evidence: Les textes préexistants parlent d’« Artifact » et d’« uploader » alors que le formulaire affiche « Document ou code généré » et « Fichiers source locaux ».
- source_spec: `_bmad-output/implementation-artifacts/spec-6-3-importer-un-partage-mistral-avec-consentement.md`
  summary: Réexaminer les détails d’accessibilité omis dans le contexte de l’epic 6.
  evidence: Une modification déjà présente avant cette story a retiré la mention de `prefers-reduced-motion` et des cibles de focus après transition ; vérifier ces exigences dans la source UX avant toute mise à jour du contexte.
