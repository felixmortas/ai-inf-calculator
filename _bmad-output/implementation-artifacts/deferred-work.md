- source_spec: `_bmad-output/implementation-artifacts/spec-7-5-partager-son-resultat-sans-partager-sa-conversation.md`
  summary: `src/application/shareResult.ts` importe `formatQuantity` depuis `src/ui/quantityFormatter`, ce qui inverse le sens des couches.
  evidence: relevé par la revue ; le formateur vit dans `ui` alors que l'adaptateur de partage est dans `application`.
