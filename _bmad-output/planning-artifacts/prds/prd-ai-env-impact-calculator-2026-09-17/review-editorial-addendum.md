# Relecture éditoriale de l’addendum

Ce document aide les responsables de conception et de développement à retrouver les formules, unités, hypothèses et décisions nécessaires au moteur de calcul.

Lecture humaine ; guide Microsoft ; modèle **Reference/Database**. Structure examinée avant la prose. Le ton technique, les identifiants de variables, les équations et les références aux décisions sont conservés. Aucune modification mathématique proposée.

Mesure exacte par `python3 .agents/skills/bmad-review/scripts/word_metrics.py` : **2 095 mots**. Sections : intégration 73 ; comptage 56 ; douche 307 ; introduction au contrat 67 ; données 206 ; tokens 250 ; énergie IT 271 ; calibration 192 ; énergie/carbone/eau/sécheresse 182 ; total et exemple 138 ; limites 283. Aucun objectif de longueur imposé.

| Pass | Original Text | Revised Text | Changes |
|---|---|---|---|
| structure | § Total et exemple d’unités — 138 mots | PRESERVE — conserver les sommes et l’exemple chiffré dans cette section. | L’exemple relie les unités et permet de vérifier le calcul ; il ne constitue pas une répétition à supprimer. Impact : 0 mot. La structure existante convient à une référence consultée par rubrique ; aucun déplacement nécessaire. |
| prose | Une modification avancée de ratio est une surcharge de session ; la restauration reprend les valeurs de référence du modèle. | Un ratio modifié dans les paramètres avancés s’applique à la session ; la restauration reprend les valeurs de référence du modèle. | Remplace « surcharge », ambigu pour un lecteur humain, par le comportement concret. Aucune modification de la portée de session. |
| prose | La source annonce un lookup pays/fournisseur mais décrit une table de risque par pays ; le contrat de données devra préciser cette résolution sans inventer une granularité par datacenter. | La source prévoit une recherche par pays et fournisseur, mais décrit une table de risque par pays ; le contrat de données devra préciser la correspondance sans inventer une granularité par datacenter. | Rend explicite l’écart à résoudre et évite deux termes techniques peu précis dans la prose ; la fonction dans le bloc de code reste inchangée. |
| prose | Leur recalcul seul réutilise les résultats existants, sans réexécuter l’estimation des blocs. | Recalculer uniquement les totaux réutilise les résultats existants, sans réexécuter l’estimation des blocs. | Identifie directement l’action au lieu du pronom « leur ». Aucun changement de déclenchement ou de dépendance. |

**Bilan :** quatre recommandations, dont une conservation structurelle et trois retouches locales. Aucune coupe structurelle ; réduction structurelle : **0 mot, 0 %** des 2 095 mots. Les retouches de prose allongent légèrement les phrases pour expliciter leur sens, sans objectif de réduction. Aucun exemple, tableau, repère ou formule sacrifié. Les corrections déjà apportées au facteur nul et au lien température/énergie ne nécessitent pas de nouvelle intervention.
