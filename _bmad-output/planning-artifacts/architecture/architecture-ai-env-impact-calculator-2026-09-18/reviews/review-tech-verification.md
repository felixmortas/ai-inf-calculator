# Revue — vérification technique

Périmètre : versions et faisabilité des technologies nommées dans `ARCHITECTURE-SPINE.md`, vérifiées le 18 septembre 2026. Aucun changement demandé au périmètre fonctionnel.

## Constats

| Sévérité | Constat | Action recommandée |
| --- | --- | --- |
| Mineure | `Vite 7.1.3` est une version existante, mais le paquet courant est `7.3.3`. La version figée est techniquement compatible avec le choix React/Vite ; elle n’est simplement plus la version courante. | Préférer `Vite 7.3.3` pour un nouveau sous-projet, ou remplacer les numéros de la spine par des majors minimales et verrouiller les versions exactes dans `package-lock.json`. |
| Aucune | React et React DOM `19.3.0` sont publiés et doivent être maintenus à la même version. | Conserver `19.3.0` pour les deux dépendances. |
| Aucune | TypeScript `7.0.2` et Vitest `5.0.1` existent. | Conserver ; verrouiller via le fichier de lock. |
| Aucune | `js-tiktoken 1.0.21` expose bien `js-tiktoken/lite` et `js-tiktoken/ranks/o200k_base`. L’import direct des rangs est local ; l’alternative CDN montrée par le paquet ne doit pas être employée. | Conserver AD-4. Tester que le bundle de production ne contient aucune requête vers `tiktoken.pages.dev`. |
| Aucune | Les Web Workers sont compatibles avec ce protocole : échanges par `postMessage`, données copiées, worker servi depuis la même origine. Vite produit et configure les bundles Worker. | Créer le worker avec l’URL de module Vite (`new Worker(new URL(..., import.meta.url), { type: 'module' })`) et garder le protocole typé prévu. |
| Aucune | Vite accepte `base: '/calculator/'`, ce qui rebased les actifs du build pour une publication au sous-chemin prévu. | Conserver cette base ; la vérifier sur l’URL finale `https://felixmortas.com/calculator/`. |
| À surveiller | La publication directe depuis une branche GitHub Pages ne construit pas Vite. Elle ne peut fonctionner que si le build est commité dans le dossier/branche publié. Pour agréger le site racine et `calculator/dist`, GitHub Actions est la voie native documentée. | À l’intégration, adopter un workflow Pages unique qui construit le site hôte et `calculator/`, puis déploie l’artefact combiné. Ce point est correctement différé dans la spine. |

## Sources

- [Vite — guide et exigences Node](https://vite.dev/guide/) ; [option `base`](https://vite.dev/config/shared-options) ; [options Worker](https://vite.dev/config/worker-options).
- [React 19.3.0](https://www.npmjs.com/package/react?activeTab=versions) et [React DOM 19.3.0](https://www.npmjs.com/package/react-dom?activeTab=versions).
- [TypeScript 7.0.2](https://www.npmjs.com/package/typescript), [Vitest 5.0.1](https://www.npmjs.com/package/vitest?activeTab=explore), [Vite 7.3.3](https://www.npmjs.com/package/vite?activeTab=versions).
- [`js-tiktoken` 1.0.21 et mode lite](https://www.npmjs.com/package/js-tiktoken?activeTab=versions).
- [MDN — Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).
- [GitHub Pages — sources de publication](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) et [workflow Pages personnalisé](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
