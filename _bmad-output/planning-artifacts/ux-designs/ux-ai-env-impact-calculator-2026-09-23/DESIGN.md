---
name: Empreinte IA — Canopée épurée
description: Un guide calme, épuré à la manière des chatbots, pour comprendre l'impact d'une conversation avec une IA.
status: final
updated: 2026-10-08
colors:
  surface-base: '#FFFFFF'
  surface-raised: '#FFFFFF'
  surface-muted: '#F4F4F4'
  ink-primary: '#0D0D0D'
  ink-secondary: '#5F6B66'
  accent: '#0B7A5E'
  accent-brand: '#10A37F'
  accent-tint: '#E6F6F1'
  on-accent: '#FFFFFF'
  outline-field: '#8A8A8A'
  carbon-ink: '#333333'
  carbon-surface: '#ECEEED'
  water-brand: '#4A90E2'
  water-ink: '#1F5FA8'
  water-surface: '#E8F1FC'
  power-brand: '#F5A623'
  power-ink: '#8A5A00'
  power-surface: '#FFF3DC'
  error: '#9D3030'
  error-surface: '#FFF1F1'
  warning: '#704900'
  warning-surface: '#FFF7DF'
  focus: '#184BB2'
typography:
  display: {fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Text", Roboto, sans-serif', fontSize: 36px, fontWeight: '700', lineHeight: '1.1'}
  heading: {fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Text", Roboto, sans-serif', fontSize: 26px, fontWeight: '700', lineHeight: '1.2'}
  body: {fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Text", Roboto, sans-serif', fontSize: 16px, fontWeight: '400', lineHeight: '1.5'}
  label: {fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Text", Roboto, sans-serif', fontSize: 14px, fontWeight: '600', lineHeight: '1.35'}
  metric: {fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Text", Roboto, sans-serif', fontSize: 24px, fontWeight: '600', lineHeight: '1.2'}
  metric-hero: {fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Text", Roboto, sans-serif', fontSize: 48px, fontWeight: '700', lineHeight: '1.05'}
  link: {fontFamily: 'Inter, system-ui, -apple-system, "SF Pro Text", Roboto, sans-serif', fontSize: 16px, fontWeight: '500', lineHeight: '1.5'}
rounded:
  sm: 12px
  md: 16px
  lg: 24px
  pill: 999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  margin-mobile: 16px
  content-max: 760px
elevation:
  card: '0 4px 12px rgba(0,0,0,0.05)'
  active: '0 6px 20px rgba(0,0,0,0.08)'
  action-bar: '0 -4px 16px rgba(0,0,0,0.06)'
components:
  guide-prompt: {background: '{colors.surface-base}', text: '{colors.ink-primary}', accent-rule: '{colors.accent-brand}'}
  start-button: {background: '{colors.accent}', text: '{colors.on-accent}', radius: '{rounded.pill}'}
  language-pill: {background: '{colors.surface-muted}', text: '{colors.ink-primary}', radius: '{rounded.pill}'}
  step-indicator: {text: '{colors.ink-secondary}'}
  action-bar: {background: '{colors.surface-raised}', shadow: '{elevation.action-bar}'}
  result-hero: {background: '{colors.accent-tint}', text: '{colors.ink-primary}', radius: '{rounded.lg}'}
  comparison-hero: {background: '{colors.accent-tint}', text: '{colors.ink-primary}', radius: '{rounded.lg}'}
  text-link: {text: '{colors.accent}'}
  exchange-card: {background: '{colors.surface-raised}', shadow: '{elevation.card}', radius: '{rounded.md}'}
  exchange-editor: {background: '{colors.surface-raised}', shadow: '{elevation.active}', radius: '{rounded.lg}'}
  question-field: {background: '{colors.surface-muted}', outline: '{colors.outline-field}', radius: '{rounded.lg}'}
  answer-field: {background: '{colors.surface-raised}', shadow: '{elevation.card}', outline: '{colors.outline-field}', radius: '{rounded.lg}'}
  metric-badge: {background: '{colors.carbon-surface}', text: '{colors.carbon-ink}', radius: '{rounded.pill}'}
  metric-card: {background: '{colors.surface-raised}', shadow: '{elevation.card}', radius: '{rounded.md}'}
  share-button: {background: '{colors.surface-muted}', text: '{colors.ink-primary}', radius: '{rounded.pill}'}
  button-primary: {background: '{colors.accent}', text: '{colors.on-accent}', radius: '{rounded.pill}'}
  practice-tip: {background: '{colors.accent-tint}', text: '{colors.ink-primary}', accent-rule: '{colors.accent-brand}', radius: '{rounded.sm}'}
  status-message: {warning-background: '{colors.warning-surface}', error-background: '{colors.error-surface}'}
  model-selector: {background: '{colors.surface-muted}', outline: '{colors.outline-field}', radius: '{rounded.pill}'}
  advanced-mode: {background: '{colors.surface-muted}', radius: '{rounded.md}'}
  expert-mode: {background: '{colors.surface-raised}', radius: '{rounded.md}'}
  field-input: {background: '{colors.surface-muted}', outline: '{colors.outline-field}', radius: '{rounded.sm}'}
---

## Brand & Style

Canopée épurée est un guide de lecture des effets d'une conversation. Son caractère est calme, accessible et familier : la sobriété d'un chatbot (blanc, grands arrondis, ombres douces, aucune bordure décorative) portée par un seul accent vert émeraude. Le guide intervient au départ en une phrase ; les questions et réponses de la personne occupent ensuite l'espace principal. Chaque écran ne met en avant qu'une seule action. L'ordre du fil emprunte aux chatbots leur familiarité, sans simuler une discussion avec le calculateur. « Empreinte IA » est un titre de travail visible dans les maquettes, pas un nom de marque validé. [ASSUMPTION]

La touche environnementale tient en deux gestes discrets : des icônes au trait aux courbes organiques (feuille, goutte, éclair arrondi, ampoule à tige végétale) et des aplats doux évoquant la forêt, l'océan et la terre. Aucun dégradé vif, aucune texture, aucune illustration décorative.

Référence exploratoire : [accueil](mockups/accueil.html), [conversation](mockups/conversation.html), [bilan](mockups/bilan.html), régénérées d'après l'audit UI/DA du 2026-10-08. Ce document et `EXPERIENCE.md` priment sur les maquettes en cas d'écart.

## Colors

`{colors.surface-base}` (blanc pur) porte la page et les cartes ; `{colors.surface-muted}` porte champs, bulle de question, sélecteurs et boutons secondaires. `{colors.accent}` est l'émeraude d'action : fond des boutons principaux, liens et texte coloré. `{colors.accent-brand}` (`#10A37F`, vert ChatGPT) n'atteint que 3,2:1 sur blanc : il sert uniquement aux éléments graphiques non textuels (règle d'accent, icônes de remplissage, indicateur actif), jamais au texte ni derrière du texte blanc. `{colors.accent-tint}` teinte la zone héros du résultat et le callout de bonne pratique.

Couleurs de données : chaque quantité a un aplat pastel `*-surface` et une encre `*-ink` pour le texte et le trait des icônes. Carbone : `{colors.carbon-ink}` sur `{colors.carbon-surface}`. Eau : `{colors.water-ink}` sur `{colors.water-surface}` (`{colors.water-brand}` en remplissage décoratif d'icône). Électricité : `{colors.power-ink}` sur `{colors.power-surface}` (`{colors.power-brand}` en remplissage décoratif). Les ambres et bleus d'origine de l'audit (`#F5A623`, `#4A90E2`) sont trop clairs pour du texte ou du trait seul ; ils restent des remplissages. Le nom et l'unité de la quantité sont toujours écrits : la couleur n'est jamais le seul signe.

Pas de bordure grise dure. Les cartes se séparent par `{elevation.card}`. Exception d'accessibilité : les champs de saisie et sélecteurs gardent un contour fin `{colors.outline-field}` (voir Shapes), car le gris `#F4F4F4` sur blanc ne fait que 1,1:1. Les états d'erreur et de péremption associent toujours un libellé à `{colors.error}` ou `{colors.warning}`. Le focus utilise `{colors.focus}`.

Contrastes contrôlés : texte principal sur blanc 19,4:1, texte secondaire sur blanc 5,55:1 et sur `#F4F4F4` 5,05:1, blanc sur `{colors.accent}` 5,3:1, `{colors.accent}` sur `{colors.accent-tint}` 5,4:1 (texte), carbone 10,8:1, eau 5,65:1, électricité 5,4:1 sur leurs aplats, contour de champ `#8A8A8A` sur blanc 3,45:1, focus sur blanc 7,8:1.

## Typography

La famille `Inter`, avec repli sur la police système (`system-ui`, SF Pro, Roboto), sert tous les rôles ; si Inter n'est pas chargée, le repli ne change pas la hiérarchie. `{typography.display}` est réservé à l'accueil ; `{typography.heading}` marque les étapes et le résultat ; `{typography.body}` porte les textes collés et les explications. `{typography.metric-hero}` est réservé à l'équivalence douche, en tête du résultat. `{typography.metric}` met les autres quantités en avant, toujours avec une unité. `{typography.link}` sert les actions secondaires, soulignées. La hiérarchie passe par la graisse (600 à 700) et la taille, non par des bordures. À 200 % de zoom, les actions principales et les valeurs ne sont ni tronquées ni superposées.

## Layout & Spacing

Une colonne de lecture plafonne à `{spacing.content-max}` et conserve `{spacing.margin-mobile}` de marge sur téléphone. Les écarts suivent `{spacing.1}` à `{spacing.6}`, avec des espaces généreux entre cartes (`{spacing.5}`). L'accueil se limite à une phrase d'introduction et au bouton « Commencer », sans carte intermédiaire ni défilement horizontal. Le lien « Méthodologie » se place sous le bouton « Commencer », centré, et n'apparaît que sur l'accueil (jamais en en-tête des autres écrans). L'indicateur d'étape et le bouton « Retour » libellé (en haut à gauche) précèdent le titre de chaque écran du parcours (étapes 1 et 2). Le résultat n'est pas un écran : il s'ajoute sous la conversation, sur la même page. Le texte d'introduction n'est pas répété hors de l'accueil. L'action principale de l'étape est portée par une barre en bas d'écran ; elle devient statique à fort zoom, en hauteur réduite ou avec clavier logiciel pour ne jamais masquer le focus. Dans le parcours, les échanges précédents se replient et l'éditeur courant reste proche du bas du fil. Les résultats par question / réponse restent dans l'en-tête de leur carte, sous forme de badges. Le résultat final se lit dans cet ordre : équivalence douche en grand, carbone/eau/électricité en cartes, comparaison LED et interprétation, une bonne pratique, puis le bouton « Partager ». Sur grand écran, le résultat peut occuper une zone latérale si l'ordre de lecture reste explicite. À 320 px et à 400 % de zoom, boutons, libellés et métriques passent à la ligne sans troncature ; les textes longs reviennent à la ligne dans leur conteneur, sans défilement horizontal global.

## Elevation & Depth

La profondeur remplace les bordures. `{elevation.card}` (`0 4px 12px rgba(0,0,0,0.05)`) sépare les cartes du fond blanc ; `{elevation.active}` signale l'éditeur courant ; `{elevation.action-bar}` détache la barre d'action collante. L'ombre est décorative : aucune information ne repose sur elle. Les confirmations de suppression sont présentées dans une couche modale sur un voile neutre.

## Shapes

Arrondis généreux, façon chatbot. `{rounded.lg}` (24 px) encadre l'éditeur courant, les champs de question et de réponse et le résultat principal ; `{rounded.md}` (16 px) les cartes de question / réponse repliées, les cartes de métriques et les modes avancé et expert ; `{rounded.sm}` (12 px) les champs numériques et le callout ; `{rounded.pill}` les boutons, badges, sélecteurs et pastilles de langue. Aucun avatar ni marque figurative n'est requis : un repère typographique suffit.

Champs : fond `{colors.surface-muted}` et contour fin de 1 px `{colors.outline-field}`, sans cadre épais. C'est la seule bordure maintenue, pour que la limite d'un champ reste perceptible (3:1) comme l'exige `EXPERIENCE.md` (Accessibility Floor, contrôles identifiables). Au focus, un anneau de 3 px `{colors.focus}` avec décalage de 2 px remplace le contour. L'état désactivé garde son libellé lisible et une explication ; erreur et sélection ont une indication textuelle en plus de leur couleur.

Iconographie : icônes au trait de 1,75 px, 24 px, extrémités et jonctions arrondies, courbes organiques (feuille pour le carbone, goutte pour l'eau, éclair aux angles arrondis pour l'électricité, ampoule à tige feuillue pour la LED, pomme de douche à gouttes pour l'équivalence). Elles utilisent l'encre `*-ink` de leur quantité sur un disque pastel `*-surface`. Toujours associées à un texte visible et `aria-hidden`.

## Components

| Composant | Règle visuelle |
|---|---|
| Guide prompt | Un gros titre `{typography.display}` qui dit qu'il s'agit d'un calculateur, sans nom de marque au-dessus, puis une phrase en `{typography.body}` agrandie, fond `{colors.surface-base}`, règle `{colors.accent-brand}` ; à l'accueil uniquement. Voir [accueil](mockups/accueil.html). |
| Start button | Bouton « Commencer » pilule, grand, `{colors.accent}` et texte `{colors.on-accent}`, ombre douce ; point focal de l'accueil. |
| Language pill | Pastille minimale `{colors.surface-muted}`, `{rounded.pill}`, icône de globe au trait, libellé « Langue » et langue courante, flèche minimaliste ; placée sous le lien « Méthodologie ». Remplace les gros boutons empilés. Voir [accueil](mockups/accueil.html). |
| Step indicator | Texte `{typography.label}` « Étape N/3 : titre » en `{colors.ink-secondary}`, au-dessus du titre ; pas de barre colorée seule. |
| Back button | Libellé, texte et icône, au-dessus du titre, en haut à gauche ; cible 44 × 44 px. |
| Action bar | Barre blanche avec `{elevation.action-bar}`, sans bordure, portant l'unique action principale (« Continuer », « Calculer ») ; statique à fort zoom ou hauteur réduite. |
| Exchange card | Carte compacte `{rounded.md}` avec ombre `{elevation.card}` : numéro seul stylisé en pastille ronde `{colors.accent-tint}` (sans libellé), aperçu question et réponse sur deux lignes séparées, état textuel et, si calculé, badges carbone et eau dans l'en-tête. Commande texte « Voir détails » / « Masquer les détails ». Badges sans mot de libellé : icône, valeur, unité. Voir [conversation](mockups/conversation.html). |
| Exchange editor | Carte active `{rounded.lg}` avec `{elevation.active}` ; champ de question puis champ de réponse, puis options facultatives ; textes d'aide neutres ; actions après le contenu. Le bouton « Supprimer » est un lien-texte avec icône de corbeille au trait, en `{colors.error}`, séparé des autres actions ; il ouvre la confirmation modale. Même traitement dans la carte dépliée. |
| Question field | Bulle de question de la personne : fond `{colors.surface-muted}`, alignée à droite, largeur max 85 %, `{rounded.lg}`. Libellé visible « Votre message ». C'est un champ de saisie, non un message du calculateur. |
| Answer field | Champ de réponse de l'IA : fond blanc avec `{elevation.card}`, aligné à gauche, `{rounded.lg}`. Libellé visible « Réponse de l'IA ». Aucune bulle ne représente le calculateur. |
| Field input | Champs numériques et listes des modes avancé et expert : pilule ou `{rounded.sm}`, fond `{colors.surface-muted}`, flèche de liste minimaliste, libellé au-dessus ; jamais une case de formulaire HTML brute. |
| Metric badge | Étiquette pilule `*-surface` avec icône, valeur et unité en `*-ink` (par ex. carbone « 11,6 mgCO₂e »). Utilisée dans l'en-tête des cartes. Voir [conversation](mockups/conversation.html). |
| Result hero | Fond `{colors.accent-tint}`, `{rounded.lg}`, icône de douche, équivalence douche en `{typography.metric-hero}` avec unité complète ; premier des deux héros du résultat. Jumeau exact du Comparison hero : même fond, rayon, marges, taille de valeur et de libellé. Voir [bilan](mockups/bilan.html). |
| Metric card | Une carte par quantité (carbone, eau, électricité) : disque d'icône, libellé, valeur en `{typography.metric}` et unité, couleurs de données. Nettement moins saillante que le Result hero. |
| Comparison hero | Deuxième héros du résultat, placé juste sous le Result hero : fond `{colors.accent-tint}`, `{rounded.lg}`, icône d'ampoule dans un disque blanc, durée d'ampoule LED en `{typography.metric-hero}` avec unité complète. Mêmes fond, rayon, marges, tailles et poids que le Result hero ; aucun des deux n'est plus saillant. Sous les deux héros, la phrase d'interprétation en `{typography.body}` et `{colors.ink-secondary}`, sans accent d'alerte. |
| Practice tip | Callout `{colors.accent-tint}` avec bordure gauche épaisse (4 px) `{colors.accent-brand}`, `{rounded.sm}` ; une seule bonne pratique, avec « Voir toutes les bonnes pratiques » en lien. |
| Share button | Pilule `{colors.surface-muted}`, texte `{colors.ink-primary}`, libellé « Partager » ; moins saillant que l'action principale ; icône décorative et texte visibles. |
| Text link | `{typography.link}` en `{colors.accent}`, souligné ; pas de contour de bouton. |
| Button primary | Une action principale par étape, pilule `{colors.accent}` et texte `{colors.on-accent}`. Les actions secondaires sont des liens ou des pilules `{colors.surface-muted}`. |
| Status message | Erreur et résultat périmé ont un texte explicite sur `{colors.error-surface}` ou `{colors.warning-surface}`, `{rounded.sm}`. L'état à jour est positif et textuel ; un état initial normal n'utilise jamais ces surfaces. |
| Model selector | Modèle déduit affiché avec « Modifier » en lien ; sélecteur pilule `{colors.surface-muted}` avec contour fin et flèche minimaliste ; présenté comme estimation modifiable. |
| Advanced mode | Groupe secondaire `{colors.surface-muted}` sans bordure, replié par défaut, placé sous le choix du modèle ; libellés distincts, sans concurrence visuelle avec le fil. Il contient le Mode expert. |
| Expert mode | Sous-groupe blanc `{colors.surface-raised}` à ombre légère, replié par défaut, imbriqué dans le Mode avancé avec un retrait visible et son propre libellé de dépliage ; ne s'affiche jamais hors du Mode avancé. |

## Do's and Don'ts

| Faire | Éviter |
|---|---|
| Fond blanc, séparer par les ombres douces et l'espace. | Fonds beiges ou verts pâles, bordures grises dures sur les cartes. |
| Pilules et grands arrondis pour boutons, badges et sélecteurs. | Boutons rectangulaires à coins peu arrondis. |
| Émeraude `{colors.accent}` pour l'action ; `{colors.accent-brand}` pour le graphique seulement. | Texte blanc sur `#10A37F`, ou texte `#10A37F` sur blanc (contraste 3,2:1). |
| Badges pastel avec nom, valeur et unité écrits. | Distinguer carbone, eau et électricité par la seule couleur. |
| Aplats doux évoquant forêt, océan et terre. | Dégradés vifs, textures, illustrations décoratives. |
| Icônes au trait organiques, associées à un texte visible. | Icônes géométriques ou industrielles, icône seule. |
| Montrer les textes et résultats près des échanges. | Faire croire que le calculateur répond aux questions collées (aucune bulle du calculateur). |
| Adapter les unités à la taille des quantités. | Afficher de longues suites de zéros ou des nombres sans unité. |
| Afficher le résultat sous la conversation, sans nouvel écran. | Un écran de bilan séparé. |
| Mettre la douche et l'ampoule LED en grand, avec un traitement identique, puis les valeurs techniques en cartes plus discrètes. | Rétrograder l'ampoule LED en carte neutre, ou présenter carbone, eau et électricité au même niveau sans comparaison du quotidien. |
| Une action principale par étape, les autres en lien discret. | Deux boutons de calcul ou de validation concurrents. |
| Garder un contour fin sur les champs de saisie. | Supprimer toute limite visible d'un champ (1,1:1). |
| Présenter un état initial normal de façon neutre. | Utiliser une surface d'erreur ou d'avertissement pour un champ vide. |
| Répéter l'introduction uniquement à l'accueil. | Un paragraphe de cinq lignes au-dessus de chaque écran. |
| Garder une identité propre à Canopée épurée. | Réutiliser crème, terracotta, empattements et étoile de la première piste. |
