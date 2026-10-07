- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-calculer-tous-les-echanges-et-leur-bilan.md`
  summary: Définir le délai de repli lorsque le Worker de tokenisation ne répond jamais.
  evidence: Le client local peut rester en attente sans erreur; le mécanisme existe avant cette story et nécessite une politique de délai à définir.

- source_spec: `_bmad-output/implementation-artifacts/spec-7-1-commencer-simplement-et-se-reperer-dans-le-parcours.md`
  summary: Porter « Calculer » dans la barre d’action collante de l’étape 2/3 et désactiver « Continuer » si un paramètre est invalide.
  evidence: La barre collante ne couvre que « Continuer » à l’étape 1 ; « Calculer » relève de 7.3 et la validation des paramètres de 7.2.
- source_spec: `_bmad-output/implementation-artifacts/spec-7-1-commencer-simplement-et-se-reperer-dans-le-parcours.md`
  summary: Revoir la hiérarchie des titres de la méthodologie (décalage +2 donne h3/h4 sous le h1).
  evidence: `vite.config.ts` décale les titres du Markdown de 2 niveaux, ce qui saute des niveaux sous le nouveau h1.

- source_spec: `_bmad-output/implementation-artifacts/spec-7-2-choisir-son-ia-et-regler-ses-hypotheses-sans-se-perdre.md`
  summary: Retirer l'action morte `parametersValidationFailed` et le drapeau `parameterValidationInvalid` (reducer, ConversationBlocks) devenus inatteignables depuis l'UI.
  evidence: Seul le dispatch de l'ancien « Appliquer » les utilisait ; la spec interdit de toucher `conversationReducer.ts` dans la 7.2.
- source_spec: `_bmad-output/implementation-artifacts/spec-7-2-choisir-son-ia-et-regler-ses-hypotheses-sans-se-perdre.md`
  summary: Les saisies numériques non appliquées sont perdues quand le modèle, le chatbot ou le pays d'hébergement change (clé `formKey`).
  evidence: Relevé par deux relecteurs ; comportement hérité de la conception « brouillon appliqué par Continuer ».
- source_spec: `_bmad-output/implementation-artifacts/spec-7-2-choisir-son-ia-et-regler-ses-hypotheses-sans-se-perdre.md`
  summary: `ledPowerW` n'a pas encore de consommateur (équivalence LED à brancher en 7.4).
  evidence: Aucune référence dans le domaine d'équivalence ; la durée LED est hors périmètre de la 7.2.

- source_spec: `_bmad-output/implementation-artifacts/spec-7-3-saisir-sa-conversation-et-la-calculer-d-un-seul-clic.md`
  summary: Élaguer le code `no-exchanges` (et textes `empty-block`) devenu inatteignable depuis l'interface dans le reducer et `summaryFingerprint`.
  evidence: `calculateAll` retourne silencieusement sans blocs renseignés ; plus aucun dispatch ni texte associé.
- source_spec: `_bmad-output/implementation-artifacts/spec-7-3-saisir-sa-conversation-et-la-calculer-d-un-seul-clic.md`
  summary: Le statut « Calcul en cours… » de la barre collante est dans `.app-shell` rendu inerte pendant le calcul, donc non annoncé ; seul l'overlay annonce.
  evidence: rapport d'implémentation 7.3 et revue ; à traiter avec la section résultat de 7.4.
