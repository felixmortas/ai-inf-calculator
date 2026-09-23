# Revue des spécifications UX — Empreinte IA

## Verdict d'ensemble

Les deux parcours principaux, l'identité Canopée claire et la distinction entre résultat d'échange et bilan sont suffisamment clairs pour orienter une maquette. Le contrat reste incomplet pour implémenter l'import consenti, les réglages et certains recalculs sans inventer des comportements. Une incohérence sur le destinataire de l'URL d'import doit être corrigée avant de produire le texte de consentement.

## 1. Couverture des parcours — adequate

Vérification : les deux parcours nommés du PRD, `UJ-1 — Camille évalue sa conversation au fil des échanges` et `UJ-2 — Camille évalue une conversation passée à partir de son lien`, sont repris mot pour mot avec protagoniste, étapes numérotées, moment de réussite et échec. `UJ-3` ajoute le cas de correction. Les exigences de parcours liées aux paramètres, à leur restauration et au recalcul du seul total n'ont pas de séquence complète.

### Constats

- **[medium]** Le chemin « ouvrir les paramètres avancés → corriger le pays ou une hypothèse → restaurer les valeurs → constater quels résultats sont périmés » n'est pas parcouru, bien que `FR-15`, `FR-17` et `FR-18` en dépendent ([EXPERIENCE.md](EXPERIENCE.md), Information Architecture, Interaction Primitives et Key Flows). *Correction :* ajouter un court parcours de Camille couvrant modification, restauration, focus et effet sur les résultats.
- **[medium]** « Recalculer le total » est mentionné sans définir l'emplacement de l'action, sa disponibilité ni le chemin quand un échange est manquant ou périmé (`FR-12` et `FR-13` ; [EXPERIENCE.md](EXPERIENCE.md), lignes 87 et 95). *Correction :* ajouter les conditions d'activation, le retour en cas de blocage et le chemin vers les échanges à recalculer.

## 2. Complétude des tokens — adequate

Vérification : tous les tokens de couleur sont des codes hexadécimaux, les rôles typographiques, rayons et espacements sont définis, et les références `{path.to.token}` des deux documents se résolvent. Aucun mode sombre n'est demandé. Les cibles de contraste texte et indicateurs sont énoncées, avec vérification reportée à l'implémentation.

### Constats

- **[low]** Les états visuels de focus, d'erreur, de désactivation et de sélection des principaux contrôles restent à déduire malgré les tokens disponibles ([DESIGN.md](DESIGN.md), Components). *Correction :* préciser au moins leur traitement pour les cartes de choix, champs, cartes dépliables et boutons, avec les paires de couleur à vérifier.

## 3. Couverture des composants — thin

Vérification : les huit composants nommés dans les deux tables correspondent entre eux et aux huit objets `components` du frontmatter. Des éléments essentiels apparaissent ailleurs dans les documents sans contrat visuel et comportemental dédié.

### Constats

- **[high]** Le consentement d'import, la prévisualisation, le choix chatbot/modèle et les paramètres avancés sont des surfaces de l'architecture d'information, mais aucun composant commun aux deux tables ne décrit leur anatomie et leurs actions ([EXPERIENCE.md](EXPERIENCE.md), lignes 32–38 ; [DESIGN.md](DESIGN.md), Components). *Correction :* ajouter des composants nommés et identiques dans les deux spines, avec structure visuelle, contrôles, transitions et traitement des erreurs.
- **[medium]** L'éditeur promet des « fichiers source » alors que le PRD limite le lancement au texte collé et exclut le traitement natif des fichiers ([EXPERIENCE.md](EXPERIENCE.md), lignes 65, 111 et 127 ; PRD, section 3). *Correction :* préciser s'il s'agit de texte provenant de fichiers et son mode de collage, ou retirer cette affordance des spécifications UX.

## 4. Couverture des états — thin

Vérification des huit surfaces d'Information Architecture : l'accueil, le lien invalide, le consentement ouvert, l'import en cours ou échoué, la prévisualisation, le fil vide, les résultats périmés et les paramètres invalides ont une règle. Les états de plusieurs surfaces ne sont pas fermés.

### Constats

- **[high]** Les paramètres avancés ne définissent ni l'état initial et modifié, ni la restauration, ni le cas de pays détecté indisponible ; le bilan ne définit pas son état quand certains échanges n'ont jamais été calculés ([EXPERIENCE.md](EXPERIENCE.md), State Patterns, lignes 75–89). *Correction :* ajouter les états, les libellés et les actions de reprise par surface, notamment le refus du total incomplet.
- **[medium]** L'import ne distingue pas explicitement hors ligne, expiration du consentement après changement d'URL, prévisualisation vide ou invalide et retour du focus après fermeture ([EXPERIENCE.md](EXPERIENCE.md), lignes 79–82 et 108). *Correction :* documenter les issues atomiques et le point de reprise pour chacun ; aligner la gestion du focus sur les transitions réelles.
- **[medium]** La règle d'échange incomplet reste marquée `[ASSUMPTION]`, alors que la disponibilité de « Calculer cet échange » dépend directement de cette décision ([EXPERIENCE.md](EXPERIENCE.md), lignes 84 et 95). *Correction :* arrêter les combinaisons de champs calculables, puis écrire l'état désactivé et son explication accessible.

## 5. Couverture des références visuelles — adequate

Vérification : `mockups/` et `wireframes/` n'existent pas encore ; `imports/` est vide. La variante choisie `.working/palettes-guide-calme.html` est liée dans les deux spines et explicitement décrite comme exploration de l'accueil. `.working/directions-mobile.html` contient les trois premières pistes, mais la décision de les écarter est consignée dans le memlog. La primauté des spines est dite.

### Constats

- **[medium]** Seul l'accueil possède une référence visuelle : ni le fil mobile, ni le bilan, ni le consentement n'ont de maquette alors que leur disposition et leur hiérarchie portent les décisions UX principales ([DESIGN.md](DESIGN.md), Brand & Style ; [EXPERIENCE.md](EXPERIENCE.md), Information Architecture). *Correction :* produire les maquettes clés prévues à Finalize, les placer dans `mockups/` et les lier au passage pertinent.

## 6. Volume et précision — adequate

Vérification : les tableaux sont compacts et les tokens évitent l'accumulation de valeurs de pixels dans le corps. La plupart des paragraphes servent à arbitrer des choix. Certaines lignes reprennent le suivi du projet plutôt qu'une règle d'expérience.

### Constats

- **[low]** Le tableau « Décisions à reporter dans le produit existant » répète des règles déjà présentes dans les sections de comportement et mélange état actuel et contrat futur ([EXPERIENCE.md](EXPERIENCE.md), lignes 17–25). *Correction :* conserver le suivi dans le memlog ou une note de migration, puis laisser dans la spine les règles finales seules.

## 7. Discipline d'héritage — broken

Vérification : les trois chemins `sources` de la frontmatter d'EXPERIENCE.md se résolvent ; les noms `UJ-1` et `UJ-2` sont identiques au PRD. Les huit noms de composants et les références de tokens correspondent entre les spines. Le contrat d'import, en revanche, contredit une donnée déterminante de la source architecturale.

### Constats

- **[critical]** Le consentement promet l'envoi de l'URL à un « Worker » ([EXPERIENCE.md](EXPERIENCE.md), lignes 32 et 138), alors que l'architecture exige l'affichage explicite de l'origine tierce `https://corsproxy.io/` et de l'URL canonique transmise (architecture, AD-8). Cette formulation peut faire approuver une destination trompeuse. *Correction :* nommer l'origine proxy réelle et la destination exacte dans le dialogue, ainsi que les données transmises, et garder le libellé synchronisé avec la configuration effective.
- **[medium]** La règle de formats « unités supérieures si nécessaire » n'est pas assez déterministe pour l'eau après `m³` et pour les très petites ou grandes valeurs des autres mesures ([EXPERIENCE.md](EXPERIENCE.md), ligne 102). *Correction :* préciser l'échelle d'unités autorisées et le comportement lorsque la plage `[0,001 ; 1 000[` est impossible à respecter, y compris pour l'équivalence douche.

## 8. Adéquation de la forme — strong

Vérification : DESIGN.md suit l'ordre canonique de Brand & Style à Do's and Don'ts. EXPERIENCE.md contient Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor et Key Flows. Inspiration & Anti-patterns et Responsive & Platform sont présents à bon escient pour l'exploration visuelle et le web mobile/ordinateur.

### Constats

Aucun écart structurel.

## Notes mécaniques

- Références sources vérifiées : PRD, epics et architecture présents aux chemins relatifs indiqués.
- Références de tokens vérifiées : aucune référence non résolue relevée.
- Noms des huit composants existants cohérents entre frontmatter, DESIGN.md.Components et EXPERIENCE.md.Component Patterns.
- Aucune figure Mermaid à vérifier.
- Décompte : 1 critique, 2 élevés, 7 moyens, 2 faibles.
