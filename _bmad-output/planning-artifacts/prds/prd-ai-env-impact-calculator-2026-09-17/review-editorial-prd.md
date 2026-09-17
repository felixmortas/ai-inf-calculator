# Relecture éditoriale du PRD

Ce document aide Felix et les responsables UX, architecture et développement à transformer les décisions produit en parcours et exigences réalisables.

Lecteurs : humains. Guide de style : Microsoft, appliqué au français. Modèle : **Strategic/Context (Pyramid)**. Passe structure suivie de la passe prose ; aucune modification du contenu produit ni du PRD exécutée.

Le ton factuel, le protagoniste Camille, les identifiants d’exigences et les conséquences vérifiables sont conservés. La structure part de la vision, développe les parcours et délimite le lancement avant les exigences. Elle remplit son rôle ; déplacer des sections ou renuméroter les exigences ne présenterait pas de gain net.

Comptage exact par `word_metrics.py` : **6109 mots** dans le document complet, titres et frontmatter inclus. Sections utiles à cette passe : UJ-1 360 mots, UJ-2 118, FR-19 241, FR-5 273, glossaire 191 et dépendances 345 (corps de sections).

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| structure | UJ-1 et UJ-2 : 478 mots de corps cumulés ; règles détaillées reprises dans les FR. | PRESERVE — conserver les deux parcours avant les exigences. | La narration permet au lecteur humain de comprendre les règles avant de les extraire. Les répétitions entre parcours et exigences ont une fonction différente. Impact : 0 mot. |
| prose | §4 — Résultat périmé : « résultat dont une entrée ou un paramètre dépendant a changé depuis le calcul. » | résultat dont une entrée ou un paramètre utilisé a changé depuis le calcul. | Clarifie le sens de la dépendance : le résultat dépend du paramètre. 13 → 13 mots (+0). |
| prose | FR-5 : « Le pays utilisateur est corrigible dans les paramètres avancés (FR-17). » | Le pays de l’utilisateur peut être corrigé dans les paramètres avancés (FR-17). | Remplace « corrigible », peu naturel dans ce contexte, par une action explicite. 10 → 12 mots (+2). |
| prose | D-3 : « fallback de saisie manuelle » | saisie manuelle en cas d’échec | Remplace un anglicisme par la condition concrète qui déclenche le repli. 4 → 5 mots (+1). |

Bilan : trois corrections de prose et une recommandation de conservation structurelle. Aucune coupe structurelle utile identifiée. Si les trois corrections sont acceptées, le document augmente de 3 mots : 6109 → 6112 mots (réduction : -0.049 %). Aucun objectif de longueur n’a été imposé. Les corrections conservent le parcours de lecture, les exemples et les critères d’acceptation ; aucune perte de contenu ou de contexte.
