- source_spec: `_bmad-output/implementation-artifacts/spec-7-3-saisir-sa-conversation-et-la-calculer-d-un-seul-clic.md`
  summary: Élaguer le code `no-exchanges` (et textes `empty-block`) devenu inatteignable depuis l'interface dans le reducer et `summaryFingerprint`.
  evidence: `calculateAll` retourne silencieusement sans blocs renseignés ; plus aucun dispatch ni texte associé.
- source_spec: `_bmad-output/implementation-artifacts/spec-7-4-lire-un-resultat-clair-sous-la-conversation.md`
  summary: Le sélecteur `.result-section button` (retour de focus 'summary' dans App.tsx) ne correspond plus à rien ; la logique fromSummary est morte.
  evidence: La section Résultat n'a plus de bouton de modification, seulement un lien externe.

- source_spec: `_bmad-output/implementation-artifacts/spec-7-5-partager-son-resultat-sans-partager-sa-conversation.md`
  summary: `src/application/shareResult.ts` importe `formatQuantity` depuis `src/ui/quantityFormatter`, ce qui inverse le sens des couches.
  evidence: relevé par la revue ; le formateur vit dans `ui` alors que l'adaptateur de partage est dans `application`.

- source_spec: `_bmad-output/implementation-artifacts/spec-refonte-da-canopee-epuree.md`
  summary: Remplacer le chevron texte `⌄` de `.optional-contents > summary::after` par l'icône SVG `chev`, et vérifier le contraste de `--ink-2` sur `--muted`/`--tint`.
  evidence: les autres chevrons sont passés en SVG ; contraste jamais calculé ni testé.
