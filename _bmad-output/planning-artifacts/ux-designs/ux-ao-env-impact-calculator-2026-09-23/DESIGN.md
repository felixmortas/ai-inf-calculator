---
name: Empreinte IA — Canopée claire
description: Un guide calme pour comprendre l'impact d'une conversation avec un chatbot.
status: final
updated: 2026-09-23
colors:
  surface-base: '#EFF4E8'
  surface-raised: '#FFFFFF'
  surface-soft: '#F5F8F0'
  ink-primary: '#203B32'
  ink-secondary: '#4E665A'
  accent: '#245A40'
  on-accent: '#FFFFFF'
  border: '#C7D7C7'
  border-interactive: '#5C7866'
  error: '#9D3030'
  error-surface: '#FFF1F1'
  warning: '#704900'
  warning-surface: '#FFF7DF'
  focus: '#184BB2'
typography:
  display: {fontFamily: 'system-ui, sans-serif', fontSize: 30px, fontWeight: '700', lineHeight: '1.15'}
  heading: {fontFamily: 'system-ui, sans-serif', fontSize: 22px, fontWeight: '700', lineHeight: '1.25'}
  body: {fontFamily: 'system-ui, sans-serif', fontSize: 16px, fontWeight: '400', lineHeight: '1.5'}
  label: {fontFamily: 'system-ui, sans-serif', fontSize: 14px, fontWeight: '700', lineHeight: '1.35'}
  metric: {fontFamily: 'system-ui, sans-serif', fontSize: 24px, fontWeight: '700', lineHeight: '1.2'}
rounded:
  sm: 8px
  md: 14px
  lg: 20px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  margin-mobile: 16px
  content-max: 760px
components:
  guide-prompt: {background: '{colors.surface-base}', text: '{colors.ink-primary}', accent-rule: '{colors.accent}'}
  start-choice: {background: '{colors.surface-raised}', border: '{colors.border}', radius: '{rounded.lg}'}
  exchange-card: {background: '{colors.surface-raised}', border: '{colors.border}', radius: '{rounded.md}'}
  exchange-editor: {background: '{colors.surface-raised}', border: '{colors.border}', radius: '{rounded.lg}'}
  metric-pair: {background: '{colors.surface-soft}', text: '{colors.ink-primary}'}
  summary-panel: {background: '{colors.surface-raised}', border: '{colors.accent}'}
  button-primary: {background: '{colors.accent}', text: '{colors.on-accent}', radius: '{rounded.sm}'}
  status-message: {warning-background: '{colors.warning-surface}', error-background: '{colors.error-surface}'}
  import-consent: {background: '{colors.surface-raised}', border: '{colors.border-interactive}', radius: '{rounded.md}'}
  import-preview: {background: '{colors.surface-raised}', border: '{colors.border}', radius: '{rounded.md}'}
  model-selector: {background: '{colors.surface-raised}', border: '{colors.border-interactive}', radius: '{rounded.sm}'}
  advanced-settings: {background: '{colors.surface-soft}', border: '{colors.border}', radius: '{rounded.md}'}
---

## Brand & Style

Canopée claire est un guide de lecture des effets d'une conversation. Son caractère est calme, accessible et écologiquement discret. Le guide intervient au départ ; les échanges de la personne occupent ensuite l'espace principal. L'ordre du fil emprunte aux chatbots leur familiarité, sans simuler une discussion avec le calculateur. « Empreinte IA » est un titre de travail visible dans les maquettes, pas un nom de marque validé. [ASSUMPTION]

Référence exploratoire : [variante 02, Canopée claire](.working/palettes-guide-calme.html). Ce document et `EXPERIENCE.md` priment sur la maquette en cas d'écart. L'identité évite l'ensemble crème, terracotta, empattements et symbole étoilé de la première exploration, que Felix associe trop à Claude.

## Colors

`{colors.surface-base}` porte la page, `{colors.surface-raised}` les choix et échanges, `{colors.surface-soft}` les résultats. `{colors.accent}` distingue les actions et la progression. `{colors.border}` sépare les régions décoratives ; `{colors.border-interactive}` délimite champs et contrôles sur fond blanc ou doux. Les états d'erreur et de péremption associent toujours un libellé à `{colors.error}` ou `{colors.warning}`. Le focus utilise `{colors.focus}`. Viser un contraste d'au moins 4,5:1 pour le texte courant et 3:1 pour les grandes lettres et indicateurs actifs. Contrastes contrôlés : texte principal sur fond 10,83:1, texte secondaire sur blanc 6,23:1, blanc sur accent 8,04:1, contour interactif sur blanc 4,85:1.

## Typography

La famille système sans empattements sert tous les rôles. `{typography.display}` est réservé à l'accueil ; `{typography.heading}` marque les étapes et le bilan ; `{typography.body}` porte les textes collés et les explications. `{typography.metric}` met les quantités en avant, toujours avec une unité. À 200 % de zoom, les actions principales et les valeurs ne sont ni tronquées ni superposées.

## Layout & Spacing

Une colonne de lecture plafonne à `{spacing.content-max}` et conserve `{spacing.margin-mobile}` de marge sur téléphone. Les écarts suivent `{spacing.1}` à `{spacing.6}`. L'accueil montre l'import Mistral et la saisie manuelle sans défilement horizontal. Dans le parcours, les échanges précédents se replient et l'éditeur courant reste proche du bas du fil. Les résultats restent près de l'échange qu'ils décrivent. Sur grand écran, le bilan peut occuper une zone latérale si l'ordre de lecture reste explicite. À 320 px et à 400 % de zoom, boutons, libellés et métriques passent à la ligne sans troncature ; les URL longues reviennent à la ligne dans leur conteneur, sans défilement horizontal global.

## Elevation & Depth

Les surfaces se séparent par leur teinte et une bordure `{colors.border}`. Une ombre très légère peut signaler la carte active. Le consentement d'import forme la seule couche modale.

## Shapes

`{rounded.lg}` encadre les deux choix d'accueil et l'éditeur courant ; `{rounded.md}` les échanges repliés et le bilan ; `{rounded.sm}` les contrôles. Aucun avatar ni marque figurative n'est requis : un repère typographique suffit. Au focus, les contrôles affichent un anneau `{colors.focus}` distinct du contour normal. L'état désactivé garde son libellé lisible et une explication ; erreur et sélection ont une indication textuelle en plus de leur couleur.

## Components

| Composant | Règle visuelle |
|---|---|
| Guide prompt | Phrase courte, règle `{colors.accent}` et fond `{colors.surface-base}` ; une seule demande visible à l'accueil. Voir [accueil](mockups/accueil.html). |
| Start choice | Deux cartes accessibles, import Mistral en premier et saisie manuelle entièrement visible. Voir [accueil](mockups/accueil.html). |
| Exchange card | Carte compacte : numéro, aperçu, état textuel et, si calculé, carbone et eau. Dépliage dans la page. Voir [conversation](mockups/conversation.html). |
| Exchange editor | Carte active avec question, réponse, puis options facultatives ; actions après le contenu. Voir [conversation](mockups/conversation.html). |
| Metric pair | Deux valeurs en `{typography.metric.fontSize}` avec libellé et unité, par échange. |
| Summary panel | Bilan séparé : carbone, eau, électricité, risque de sécheresse, équivalence douche et recommandations. Voir [bilan](mockups/bilan.html). |
| Button primary | Une action principale par étape, fond `{colors.accent}` et texte `{colors.on-accent}`. |
| Status message | Erreur et résultat périmé ont un texte explicite sur `{colors.error-surface}` ou `{colors.warning-surface}`. |
| Import consent | Panneau clair à contour `{colors.border-interactive}` ; URL et destination complètes, sans ellipse ; actions consentir/annuler distinctes. Voir [import](mockups/import.html). |
| Import preview | Liste d'échanges sous titres numérotés ; avertissements hors du contenu des échanges, avec texte et non couleur seule. Voir [import](mockups/import.html). |
| Model selector | Contrôle visible à contour `{colors.border-interactive}` ; modèle prérempli clairement présenté comme estimation modifiable. |
| Advanced settings | Groupe secondaire `{colors.surface-soft}` ; sections et libellés distincts, sans concurrence visuelle avec le fil. |

## Do's and Don'ts

| Faire | Éviter |
|---|---|
| Montrer les textes et résultats près des échanges. | Faire croire que le calculateur répond aux questions collées. |
| Adapter les unités à la taille des quantités. | Afficher de longues suites de zéros ou des nombres sans unité. |
| Donner des actions visibles et libellées. | Cacher les actions derrière un survol ou une icône seule. |
| Garder une identité propre à Canopée claire. | Réutiliser crème, terracotta, empattements et étoile de la première piste. |
