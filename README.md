# Calculateur d'empreinte environnementale de l'inférence des LLM

Application web monopage, en français (11 langues d'interface), qui estime l'**énergie, le carbone et l'eau** d'une conversation déjà tenue avec un chatbot (ChatGPT, Mistral…), puis aide à l'interpréter : équivalence en durée de douche chaude, en durée d'ampoule LED, et conseil de sobriété.

Publiée statiquement sur GitHub Pages : <https://felixmortas.com/ai-inf-calculator/>

## Principes

- **Respect de la vie privée** : aucun compte, serveur de calcul, stockage durable, analytics ni contenu dans l'URL. Les textes saisis restent dans le navigateur ; la tokenisation (Tiktoken, dans un Web Worker) et les calculs sont locaux.
- **Un seul calcul** : la personne configure son chatbot, saisit ou colle les échanges (questions, réponses, raisonnement, versions d'artifacts), puis clique sur « Calculer ». Toute modification rend les résultats « à recalculer ».
- **Estimation, pas mesure** : le résultat est un ordre de grandeur de l'empreinte d'usage (hors fabrication, entraînement, réseau et terminaux), sans fourchette chiffrée.
- **Partage sans contenu** : le bouton « Partager » n'envoie qu'un texte de synthèse (chatbot, nombre d'échanges, valeurs, mention d'estimation), jamais la conversation.

## Parcours

1. **Accueil** : une phrase et un bouton pour commencer.
2. **Configuration** : choix du chatbot et du modèle déduit (modifiable), « Mode avancé » (pays utilisateur, douche, ampoule) et « Mode expert » (paramètres techniques, pays d'hébergement).
3. **Conversation** : saisie des échanges ; le résultat s'affiche en dessous, sur la même page.

## Méthode de calcul

Pour chaque échange, l'énergie est calculée à partir des tokens (nouvelle entrée, historique en cache, sortie) et de taux par token propres au modèle, puis multipliée par le PUE du centre de données. Le carbone et l'eau en découlent via l'intensité carbone (`EF`) et le WUE du pays d'hébergement. Le total additionne les valeurs non arrondies.

- Énergie de sortie : modèle physique d'Ecologits ; énergie d'entrée et de cache : dérivée des rapports de prix des API.
- Documents de référence : [`docs/methodology/fr.md`](docs/methodology/fr.md) (source de vérité, traduite dans `docs/methodology/*.md`) et le [contrat de calcul](_bmad-output/specs/spec-ai-env-impact-calculator/calculation-contract.md).

## Stack

React 19, TypeScript, Vite, Vitest + Testing Library, `js-tiktoken`, `marked` (rendu de la méthodologie à la compilation). Node `>= 22.22.2`.

## Démarrage

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests (Vitest)
npm run lint     # vérification des types (tsc -b)
npm run build    # build de production dans dist/
```

L'application est servie sous `/ai-inf-calculator/` (voir `vite.config.ts`). Le déploiement est automatique vers GitHub Pages à chaque push sur `main` (`.github/workflows/deploy.yml`).

## Structure

```
src/
  domain/        noyau fonctionnel pur (impacts, tokens, équivalences, sélection de modèle, partage)
  application/   état et orchestration (réducteur de conversation, client de tokenisation, partage)
  data/          catalogue de modèles et facteurs, chargés depuis data/clean/*.csv
  workers/       Web Worker de tokenisation locale
  ui/            composants React et styles
  i18n/          traductions de l'interface
docs/methodology/  méthodologie d'estimation (une version par langue)
data/            données sources et consolidées, scripts associés
_bmad-output/    documents de cadrage (PRD, architecture, UX, SPEC, epics)
```

## Documents de cadrage

- [SPEC](_bmad-output/specs/spec-ai-env-impact-calculator/SPEC.md) et ses contrats [fonctionnel](_bmad-output/specs/spec-ai-env-impact-calculator/functional-contract.md) et [de calcul](_bmad-output/specs/spec-ai-env-impact-calculator/calculation-contract.md)
- [PRD](_bmad-output/planning-artifacts/prds/prd-ai-env-impact-calculator-2026-09-17/prd.md)
- [Architecture](_bmad-output/planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md)
- UX : [DESIGN](_bmad-output/planning-artifacts/ux-designs/ux-ai-env-impact-calculator-2026-09-23/DESIGN.md) et [EXPERIENCE](_bmad-output/planning-artifacts/ux-designs/ux-ai-env-impact-calculator-2026-09-23/EXPERIENCE.md)
- [Epics](_bmad-output/planning-artifacts/epics.md)

## Accessibilité

Navigation au clavier, cibles de 44 × 44 px, reflow à 320 px et zooms 200 % / 400 % pris en charge (voir `EXPERIENCE.md`).

## Licence

Distribué sous licence MIT, voir [LICENSE](LICENSE).
