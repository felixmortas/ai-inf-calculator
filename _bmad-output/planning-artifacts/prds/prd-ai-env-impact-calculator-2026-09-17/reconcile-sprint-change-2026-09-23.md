# Réconciliation — proposition de changement du 23 septembre 2026

Source : `../../sprint-change-proposal-2026-09-23.md` (`status: approved`). Cibles : `prd.md` et `addendum.md` du présent dossier, relus après mise à jour.

## Verdict

Les décisions produit principales sont reprises : accueil à deux voies, modèles ChatGPT et Mistral modifiables, import publié limité à Mistral, Worker et consentement, répartition des métriques, précision et unités, fil compact, accessibilité et conservation des calculs non arrondis. Aucun écart critique ou élevé constaté.

## Écarts résiduels

| Gravité | Source | Constat et suite |
| --- | --- | --- |
| Moyenne | Proposition §4.7, story 6.4 : « total incomplet explicite » | FR-13 explique pourquoi un total complet est indisponible si un échange est non calculé ou périmé, mais le PRD ne dit pas explicitement ce que le bilan affiche dans cet état. Préciser un état de bilan « total incomplet » avec les échanges à calculer, sans présenter de valeur partielle comme total valide. |
| Faible | Proposition §4.5 : « virgule française » | FR-22 fixe trois chiffres significatifs, les unités adaptatives et les cas limites, mais ne formule pas explicitement la virgule décimale française. Ajouter ce critère d’affichage ou le laisser gouverné par `EXPERIENCE.md` déjà désigné comme référence. |

Les autres points de la proposition concernent l’architecture, les SPEC, les epics, le code et la validation des données ; leur exécution ne peut pas être conclue de cette réconciliation limitée au PRD et à son addendum.

## Résolution

Les deux écarts ont été corrigés dans FR-13 et FR-22 après cette extraction. La revue qualité a également conduit à expliciter dans FR-25 le refus d’un lien non Mistral par le Worker en appel direct et à l’inclure dans la validation du lancement.
