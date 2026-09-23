# Revue technique — mise à jour du 23 septembre 2026

## Verdict

Révision nécessaire avant clôture : un fait de stack est erroné et le document doit signaler plus nettement que la politique Mistral seul est un contrat cible de l'epic 6, encore absent du code actuel. Le contrat réseau navigateur ↔ Worker est, pour le reste, fidèle à la passerelle existante et à la proposition approuvée.

## Constats

1. **Moyen — Vite 7.3.3 est périmé.** La table `Stack` du spine indique 7.3.3 ; `package.json` et `package-lock.json` fixent tous deux **Vite 8.3.0**. Corriger la table. Les autres versions de cette table correspondent au lockfile (`react`/`react-dom` 19.3.0, TypeScript 7.0.2, `js-tiktoken` 1.0.21, Vitest 5.0.1).
2. **Moyen — AD-8 décrit une règle cible, pas l'état exécutable présent.** `src/application/import/registry.ts` publie toujours les quatre adaptateurs via `importProviders = allImportProviders` et `resolveShare` les atteste tous ; `src/application/import/remoteGateway.ts` ne filtre pas Mistral et accepte tout fournisseur attesté. La proposition approuvée place cette restriction dans l'epic 6.3. Garder la règle comme invariant à livrer, mais indiquer explicitement dans le spine ou le handoff que les frontières UI, registre et passerelle doivent encore être migrées et testées avant publication. Le marquage `[ADOPTED]` signifie décision approuvée, pas fonctionnalité déjà présente.
3. **Faible — Le contrat Worker ne doit pas être présenté comme vérifié côté serveur.** Le navigateur impose aujourd'hui `POST` JSON avec le seul `shareUrl`, `credentials: omit`, `redirect: error`, `cache: no-store`, `referrerPolicy: no-referrer`, endpoint de production ou preview allowlistée, consentement ponctuel, délai de 10 s, lecture de 2 Mio et HTML complet. Ces points sont vérifiables dans `remoteGateway.ts` et la SPEC de remplacement de CorsProxy. Le dépôt ne contient pas le code du Worker ni sa configuration déployée : traitement, rétention, plafonds, CORS et suivi des redirections côté Worker restent à vérifier séparément. Le paragraphe `Deferred` le reconnaît correctement ; conserver cette distinction.

## Contrôle du contrat navigateur

`remoteGateway.ts` fixe l'endpoint de production à `https://ai-inf-calculator-proxy.felix-mortas.workers.dev/v1/import-html` et permet uniquement un hôte de preview correspondant au motif allowlisté. Le consentement mémorise l'identité de `ResolvedShare` et l'endpoint, puis se consomme une fois. La passerelle refuse les réponses non HTML ou apparemment incomplètes et lit le corps avec un plafond. Le diagramme AD-8 suit ce flux. Les garanties sur la récupération du site de partage après réception par le Worker ne sont pas établies par ce code.

## Sources locales

- `ARCHITECTURE-SPINE.md` (version examinée le 23 septembre 2026)
- `package.json`, `package-lock.json`
- `src/application/import/registry.ts`, `src/application/import/remoteGateway.ts`
- `sprint-change-proposal-2026-09-23.md`
- `spec-remplacer-corsproxy-par-le-worker-import-html.md`
