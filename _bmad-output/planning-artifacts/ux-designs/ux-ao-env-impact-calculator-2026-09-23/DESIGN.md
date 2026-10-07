---
name: Empreinte IA — Canopée claire
description: Un guide calme pour comprendre l'impact d'une conversation avec un chatbot.
status: final
updated: 2026-10-07
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
  metric-hero: {fontFamily: 'system-ui, sans-serif', fontSize: 40px, fontWeight: '700', lineHeight: '1.1'}
  link: {fontFamily: 'system-ui, sans-serif', fontSize: 16px, fontWeight: '400', lineHeight: '1.5'}
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
  start-button: {background: '{colors.accent}', text: '{colors.on-accent}', radius: '{rounded.sm}'}
  step-indicator: {text: '{colors.ink-secondary}'}
  action-bar: {background: '{colors.surface-raised}', border: '{colors.border}'}
  result-hero: {background: '{colors.surface-soft}', text: '{colors.ink-primary}', radius: '{rounded.lg}'}
  text-link: {text: '{colors.accent}'}
  exchange-card: {background: '{colors.surface-raised}', border: '{colors.border}', radius: '{rounded.md}'}
  exchange-editor: {background: '{colors.surface-raised}', border: '{colors.border}', radius: '{rounded.lg}'}
  metric-pair: {background: '{colors.surface-soft}', text: '{colors.ink-primary}'}
  summary-panel: {background: '{colors.surface-raised}', border: '{colors.accent}'}
  share-button: {background: '{colors.surface-raised}', border: '{colors.border-interactive}', radius: '{rounded.sm}'}
  button-primary: {background: '{colors.accent}', text: '{colors.on-accent}', radius: '{rounded.sm}'}
  status-message: {warning-background: '{colors.warning-surface}', error-background: '{colors.error-surface}'}
  model-selector: {background: '{colors.surface-raised}', border: '{colors.border-interactive}', radius: '{rounded.sm}'}
  advanced-mode: {background: '{colors.surface-soft}', border: '{colors.border}', radius: '{rounded.md}'}
  expert-mode: {background: '{colors.surface-soft}', border: '{colors.border}', radius: '{rounded.md}'}
---

## Brand & Style

Canopée claire est un guide de lecture des effets d'une conversation. Son caractère est calme, accessible et écologiquement discret. Le guide intervient au départ en une phrase ; les questions et réponses de la personne occupent ensuite l'espace principal. Chaque écran ne met en avant qu'une seule action. L'ordre du fil emprunte aux chatbots leur familiarité, sans simuler une discussion avec le calculateur. « Empreinte IA » est un titre de travail visible dans les maquettes, pas un nom de marque validé. [ASSUMPTION]

Référence exploratoire : [variante 02, Canopée claire](.working/palettes-guide-calme.html). Ce document et `EXPERIENCE.md` priment sur la maquette en cas d'écart. L'identité évite l'ensemble crème, terracotta, empattements et symbole étoilé de la première exploration, que Felix associe trop à Claude.

## Colors

`{colors.surface-base}` porte la page, `{colors.surface-raised}` les choix et échanges, `{colors.surface-soft}` les résultats. `{colors.accent}` distingue les actions et la progression. `{colors.border}` sépare les régions décoratives ; `{colors.border-interactive}` délimite champs et contrôles sur fond blanc ou doux. Les états d'erreur et de péremption associent toujours un libellé à `{colors.error}` ou `{colors.warning}`. Le focus utilise `{colors.focus}`. Viser un contraste d'au moins 4,5:1 pour le texte courant et 3:1 pour les grandes lettres et indicateurs actifs. Contrastes contrôlés : texte principal sur fond 10,83:1, texte secondaire sur blanc 6,23:1, blanc sur accent 8,04:1, contour interactif sur blanc 4,85:1.

## Typography

La famille système sans empattements sert tous les rôles. `{typography.display}` est réservé à l'accueil ; `{typography.heading}` marque les étapes et le résultat ; `{typography.body}` porte les textes collés et les explications. `{typography.metric-hero}` est réservé à l'équivalence douche, en tête du résultat. `{typography.metric}` met les autres quantités en avant, toujours avec une unité. `{typography.link}` sert les actions secondaires, soulignées. À 200 % de zoom, les actions principales et les valeurs ne sont ni tronquées ni superposées.

## Layout & Spacing

Une colonne de lecture plafonne à `{spacing.content-max}` et conserve `{spacing.margin-mobile}` de marge sur téléphone. Les écarts suivent `{spacing.1}` à `{spacing.6}`. L'accueil se limite à une phrase d'introduction et au bouton « Commencer », sans carte intermédiaire ni défilement horizontal. Le lien « Méthodologie » se place sous le bouton « Commencer », centré, et n'apparaît que sur l'accueil (jamais en en-tête des autres écrans). L'indicateur d'étape et le bouton « Retour » libellé (en haut à gauche) précèdent le titre de chaque écran du parcours (étapes 1 et 2). Le résultat n'est pas un écran : il s'ajoute sous la conversation, sur la même page. Le texte d'introduction n'est pas répété hors de l'accueil. L'action principale de l'étape est portée par une barre en bas d'écran ; elle devient statique à fort zoom, en hauteur réduite ou avec clavier logiciel pour ne jamais masquer le focus. Dans le parcours, les échanges précédents se replient et l'éditeur courant reste proche du bas du fil. Les résultats par question / réponse restent dans l'en-tête de leur carte. Le résultat final se lit dans cet ordre : équivalence douche en grand, carbone/eau/électricité, comparaison LED et interprétation, une bonne pratique, puis le bouton « Partager ». Sur grand écran, le résultat peut occuper une zone latérale si l'ordre de lecture reste explicite. À 320 px et à 400 % de zoom, boutons, libellés et métriques passent à la ligne sans troncature ; les textes longs reviennent à la ligne dans leur conteneur, sans défilement horizontal global.

## Elevation & Depth

Les surfaces se séparent par leur teinte et une bordure `{colors.border}`. Une ombre très légère peut signaler la carte active. Les confirmations de suppression sont présentées dans une couche modale.

## Shapes

`{rounded.lg}` encadre l'éditeur courant et le résultat principal ; `{rounded.md}` les questions / réponses repliées et les modes avancé et expert ; `{rounded.sm}` les contrôles et boutons. Aucun avatar ni marque figurative n'est requis : un repère typographique suffit. Au focus, les contrôles affichent un anneau `{colors.focus}` distinct du contour normal. L'état désactivé garde son libellé lisible et une explication ; erreur et sélection ont une indication textuelle en plus de leur couleur.

## Components

| Composant | Règle visuelle |
|---|---|
| Guide prompt | Une phrase, règle `{colors.accent}` et fond `{colors.surface-base}` ; à l'accueil uniquement. Voir [accueil](mockups/accueil.html). |
| Start button | Bouton « Commencer » en `{colors.accent}` sous la phrase d'accueil. |
| Step indicator | Texte `{typography.label}` « Étape N/3 : titre » en `{colors.ink-secondary}`, au-dessus du titre ; pas de barre colorée seule. |
| Back button | Libellé, texte et icône, au-dessus du titre, en haut à gauche ; cible 44 × 44 px. |
| Action bar | Barre en `{colors.surface-raised}` avec bordure `{colors.border}` portant l'unique action principale (« Continuer », « Calculer ») ; statique à fort zoom ou hauteur réduite. |
| Exchange card | Carte compacte : numéro, aperçu, état textuel  et, si calculé, carbone et eau dans l'en-tête. Commande texte « Déplier » / « Replier ». Voir [conversation](mockups/conversation.html). |
| Exchange editor | Carte active avec question, réponse, puis options facultatives ; champs vides avec texte d'aide neutre ; actions après le contenu. |
| Metric pair | Deux valeurs en `{typography.metric.fontSize}` avec libellé et unité, dans l'en-tête de chaque carte. |
| Result hero | Fond `{colors.surface-soft}`, équivalence douche en `{typography.metric-hero.fontSize}` avec unité complète ; premier élément visuel du résultat. Voir [bilan](mockups/bilan.html). |
| Result values | Carbone, eau, électricité en `{typography.metric}`, nettement moins saillants que le Result hero. |
| Everyday comparison | Ampoule LED et phrase d'interprétation en `{typography.body}`, sans accent d'alerte. |
| Practice tip | Une seule bonne pratique, avec « Voir toutes les bonnes pratiques » en lien. |
| Share button | Un bouton à contour `{colors.border-interactive}` libellé « Partager », moins saillant que l'action principale ; icône décorative et texte visibles. |
| Text link | `{typography.link}` en `{colors.accent}`, souligné ; pas de contour de bouton. |
| Button primary | Une action principale par étape, fond `{colors.accent}` et texte `{colors.on-accent}`. Les actions secondaires sont des liens ou des boutons à contour `{colors.border-interactive}`. |
| Status message | Erreur et résultat périmé ont un texte explicite sur `{colors.error-surface}` ou `{colors.warning-surface}`. L'état à jour est positif et textuel ; un état initial normal n'utilise jamais ces surfaces. |
| Model selector | Modèle déduit affiché avec « Modifier » en lien ; contrôle à contour `{colors.border-interactive}` à l'ouverture ; présenté comme estimation modifiable. |
| Advanced mode | Groupe secondaire `{colors.surface-soft}`, replié par défaut, placé sous le choix du modèle ; libellés distincts, sans concurrence visuelle avec le fil. Il contient le Mode expert. |
| Expert mode | Sous-groupe replié par défaut, imbriqué dans le Mode avancé avec un retrait visible et son propre libellé de dépliage ; ne s'affiche jamais hors du Mode avancé. |

## Do's and Don'ts

| Faire | Éviter |
|---|---|
| Montrer les textes et résultats près des échanges. | Faire croire que le calculateur répond aux questions collées. |
| Adapter les unités à la taille des quantités. | Afficher de longues suites de zéros ou des nombres sans unité. |
| Donner des actions visibles et libellées ; associer icône et texte. | Cacher les actions derrière un survol ou une icône seule. |
| Afficher le résultat sous la conversation, sans nouvel écran. | Un écran de bilan séparé. |
| Mettre la douche en grand, puis les valeurs techniques. | Présenter carbone, eau et électricité au même niveau sans comparaison du quotidien. |
| Une action principale par étape, les autres en lien discret. | Deux boutons de calcul ou de validation concurrents. |
| Présenter un état initial normal de façon neutre. | Utiliser une surface d'erreur ou d'avertissement pour un champ vide. |
| Répéter l'introduction uniquement à l'accueil. | Un paragraphe de cinq lignes au-dessus de chaque écran. |
| Garder une identité propre à Canopée claire. | Réutiliser crème, terracotta, empattements et étoile de la première piste. |
