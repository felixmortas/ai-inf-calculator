# Epic 2 Context: Estimer l’impact d’un échange

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettre à une personne de déclencher volontairement le calcul d’un seul échange et d’en consulter une estimation locale, traçable et privée. L’évaluation doit compter uniquement les contenus fournis, reconstruire le contexte utile de la conversation et les versions d’artifact sans double comptage, puis produire des impacts individuels compréhensibles sans jamais transmettre ni conserver durablement les textes.

## Stories

- Story 2.1: Compter localement les textes d’un bloc
- Story 2.2: Reconstituer l’historique et les versions d’artifact
- Story 2.3: Calculer et afficher l’impact d’un bloc

## Requirements & Constraints

- Compter les messages, réponses finales, raisonnements visibles et artifacts fournis ; ne jamais inférer ni ajouter un raisonnement caché. Un champ vide vaut exactement zéro token.
- Exécuter le comptage intégralement dans le navigateur : aucune API, clé, CDN, analytics, journalisation distante, URL contenant les textes ou stockage persistant. La session, y compris textes, choix et résultats, disparaît à la fermeture de la page.
- Utiliser Tiktoken local par défaut. En cas d’erreur du tokenizer, estimer les tokens avec `nombre de mots / 0,75`, en séparant les mots par des caractères non alphanumériques. Le même compteur s’applique à toutes les catégories de texte.
- Un calcul individuel ne traite que le bloc demandé ; il ne lance ni le calcul des autres blocs ni un recalcul après modification. Il peut néanmoins s’appuyer sur les textes de blocs précédents, même si leurs impacts n’ont jamais été calculés.
- Construire l’historique d’un bloc à partir des messages, raisonnements visibles et réponses finales renseignés auparavant, sans inclure les textes du bloc courant. Inclure une seule fois la dernière version complète d’artifact disponible avant ce bloc.
- Le premier artifact non vide est compté intégralement en sortie. Pour une nouvelle version, ne compter en sortie que les passages ajoutés ou modifiés ; une version identique ajoute zéro token et un artifact vide ne supprime pas la dernière version connue. La granularité du diff reste à arrêter avant les jeux de test de référence.
- Ajouter une fois, au taux cache, le volume de prompt système donné par le catalogue du modèle, y compris au premier bloc. Cette valeur est masquée, non modifiable et ne doit exposer ni son texte ni son volume.
- Produire énergie, carbone et eau avec les formules et paramètres résolus, sans arrondir les valeurs de calcul ; les unités internes sont Wh, gCO2e et L. Bloquer explicitement tout résultat qui dépend d’une donnée indispensable manquante ou d’une valeur numérique invalide ; aucun `NaN` ou infini ne peut être affiché comme résultat.
- Présenter chaque impact comme une estimation unique, arrondie à quatre chiffres significatifs à l’affichage, avec une mention visible d’incertitude et du périmètre : usage uniquement, hors fabrication, amortissement et Scope 3.
- Tester le domaine et le Worker indépendamment de React et de l’UI, notamment premier échange, artifact modifié, artifact identique, champ vide, réponse du Worker périmée et fallback.

## Technical Decisions

- Conserver les responsabilités en couches : `ui` rend et émet des intentions, `application` orchestre les cas d’usage et les adaptateurs navigateur, `domain` contient les règles synchrones, pures et déterministes, et `workers` porte le protocole et l’implémentation de tokenisation. Le domaine n’importe ni React, ni Worker, ni `Intl`, ni catalogue concret.
- Isoler Tiktoken dans un Worker local typé, embarquant `js-tiktoken/lite` et les rangs `o200k_base`. Chaque demande et réponse porte un `requestId` et une empreinte associant texte et encodage ; le reducer ignore toute réponse qui ne correspond plus à la demande en attente. Une erreur structurée du Worker déclenche le fallback unique du domaine.
- Centraliser l’état de session dans un reducer React. Ses actions sont les seules mutations et une mutation ne déclenche jamais un calcul sans intention explicite. Conserver les catalogues de modèles et paramètres locaux, versionnés, validés avant build et immuables ; le prompt système provient exclusivement de ce catalogue.
- Employer des erreurs attendues sous forme d’union discriminée avec un `code` et un contexte non sensible. Les calculs ne sont pas arrondis avant la frontière d’affichage ; cette frontière formate les nombres via les mécanismes d’internationalisation.

## UX & Interaction Patterns

- Chaque bloc renseigné propose une action explicite « Calculer » ; la saisie ou la modification de texte n’exécute rien automatiquement.
- Afficher les résultats individuels avec des unités cohérentes et une explication accessible de leur nature estimative et de leurs limites. Les erreurs de blocage doivent être explicites plutôt qu’un résultat partiel ou inventé.
- Garantir une consultation et une action utilisables sur mobile et au clavier : libellés français explicites, focus visible, erreurs associées et états non distingués par la couleur seule.

## Cross-Story Dependencies

- Les blocs, leurs champs, leur ordre et le modèle commun sont fournis par l’Epic 1 ; les blocs entièrement vides ne contribuent ni à l’historique, ni au prompt système, ni aux impacts.
- Les résultats individuels non arrondis et leurs dépendances alimentent l’Epic 3, qui calcule tous les blocs, agrège uniquement des résultats à jour et gère leur péremption.
- Les catalogues de modèles, paramètres résolus et données environnementales mis à disposition par les Epics 1 et 4 conditionnent le calcul individuel ; une donnée requise indisponible bloque le résultat concerné.
