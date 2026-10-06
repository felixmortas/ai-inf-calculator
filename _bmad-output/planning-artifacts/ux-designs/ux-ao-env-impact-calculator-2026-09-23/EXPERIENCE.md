---
name: Empreinte IA — expérience conversationnelle
status: final
sources:
  - ../../prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - ../../epics.md
  - ../../architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
updated: 2026-09-23
---

## Foundation

Page web responsive, en français, sans compte, pour un public curieux et non technique. Le fil représente une conversation **déjà tenue** avec un chatbot : le calculateur guide la reconstruction et estime son impact ; il ne répond pas aux questions collées. Le système visuel est défini par [DESIGN.md](DESIGN.md). Pas de bibliothèque de composants imposée. Les textes saisis, leur tokenisation et les calculs restent locaux. L’accueil propose une seule action pour commencer par saisir ou copier/coller manuellement une conversation. La session n'est pas conservée après fermeture.


### Décisions à reporter dans le produit existant

| Parcours actuel | Décision UX de Felix |
|---|---|
| Configuration affichée avant toute saisie | Une action d’accueil mène au choix du chatbot et du modèle, puis à la saisie manuelle. |
| Modèle ChatGPT déduit de l'abonnement et non éditable | Valeur de référence préremplie, mais choix direct parmi les modèles ChatGPT du catalogue. |
| Électricité dans le résultat de chaque échange | Résultat d'échange limité au carbone et à l'eau ; électricité figure dans le bilan. |
| Valeurs en unités fixes | Unité adaptée à la quantité sur toutes les valeurs numériques affichées. |

## Information Architecture

| Surface | Accès | Besoin couvert |
|---|---|---|
| Accueil | Ouverture | Comprendre le rôle de l'outil et commencer une saisie manuelle. [Maquette](mockups/accueil.html). |
| Choix du chatbot et du modèle | Début de saisie manuelle ; édition depuis le fil | Fixer les hypothèses de toute la conversation, avec modèle prérempli et modifiable. |
| Fil de conversation | Après le choix du chatbot et du modèle | Saisir, relire, modifier, ajouter et supprimer les échanges. [Maquette](mockups/conversation.html). |
| Résultat d'échange | Dans la carte d'un échange après « Calculer cet échange » | Lire carbone et eau estimés ; voir la péremption si les données changent. [Maquette](mockups/conversation.html). |
| Bilan et conseils | Action « Tout calculer » depuis le fil | Lire les totaux et les conseils de sobriété. [Maquette](mockups/bilan.html). |
| Paramètres avancés | Depuis le fil et le bilan | Corriger pays de référence, pays de la personne et hypothèses mathématiques. |

Accueil, choix du chatbot et du modèle, fil et bilan forment une progression dans la même page ; un retour à l'étape précédente ne supprime pas les textes. Le fil reste l'ancre de navigation après le départ. La confirmation de suppression d’un échange est le seul dialogue modal du parcours. La [variante Canopée claire](.working/palettes-guide-calme.html) illustre l'accueil ; `DESIGN.md` et ce document priment sur cette exploration.

Le choix chatbot/modèle, les paramètres avancés et les états périmés sont spécifiés ici sans maquette dédiée, conformément au choix de Felix. Les maquettes promues couvrent l'accueil, le fil et le bilan ; les spines priment si une maquette montre un état illustratif incomplet.

## Voice and Tone

Le guide parle en phrases courtes et concrètes à l'accueil. Dans le fil, les libellés remplacent les messages du guide pour laisser dominer les textes de Camille.

| Situation | Texte indicatif | Éviter |
|---|---|---|
| Accueil | « Collez les messages de votre conversation. » | « Discutez avec nous » |
| Voie manuelle | « Quel chatbot avez-vous utilisé ? » | « Configurez votre fournisseur » |
| Champs | « Collez votre question », « Collez la réponse du chatbot » | « Prompt », « Output » seuls |
| Option | « Ajouter un raisonnement visible ou un artifact » | Donner l'impression que ces contenus sont obligatoires |
| Résultat | « Estimation pour cet échange » | « Impact exact » |
| Péremption | « Cet échange a changé. Recalculez son estimation. » | Un simple symbole ou une couleur |
| Bilan | « Calculer toute la conversation » | « Submit » ou « Envoyer » |

L'incertitude est mentionnée auprès des résultats : estimation de l'usage fondée sur des hypothèses, pas mesure directe de la requête réelle. Les recommandations parlent de gestes possibles, sans promettre un gain chiffré ni faire croire que masquer le raisonnement dans cet outil désactive le raisonnement du chatbot.

## Component Patterns

| Composant | Comportement |
|---|---|
| Guide prompt | Une seule invitation au départ. Disparaît comme guide actif après le choix ; les aides suivantes sont des libellés locaux. |
| Start choice | Une action visible mène au choix du chatbot et du modèle, puis à la saisie manuelle. |
| Exchange card | Les échanges antérieurs sont des cartes compactes ordonnées. Résumé de question et réponse, état du calcul et valeurs disponibles ; déplier révèle contenu, modification, suppression et calcul. |
| Exchange editor | Échange courant ouvert : question puis réponse ; raisonnement visible, artifact et fichiers source dans « Ajouter des contenus facultatifs ». Ajouter un échange ouvre un nouvel éditeur sans imposer de calcul préalable. |
| Metric pair | Après calcul explicite, affiche carbone et eau avec unités adaptées et indication « estimation ». Ne montre pas l'électricité ici. |
| Summary panel | Bouton « Calculer toute la conversation » accessible dans le fil. Affiche carbone, eau, électricité, équivalence douche et recommandations après calcul valide. |
| Button primary | L'action principale correspond à l'étape. Calculer un échange et tout calculer sont des actions distinctes, nommées explicitement. |
| Status message | Signale données invalides, calcul en cours, résultat périmé et facteurs de repli avec une action de suite lorsque possible. |
| Model selector | Après choix du chatbot, proposer un modèle du catalogue, modifiable directement, ChatGPT compris. Le chatbot et le modèle restent consultables et modifiables depuis le fil ; un changement signale les calculs devenus périmés. |
| Advanced settings | Panneau secondaire : pays d'hébergement, pays de la personne, hypothèses de calcul et action de restauration. Chaque champ explique son effet ; appliquer et restaurer ne lancent aucun calcul. |

Le chatbot et le modèle restent visibles dans l'en-tête du fil et peuvent être modifiés sans ouvrir les paramètres avancés. Le choix ChatGPT n'est plus limité à la déduction selon l'abonnement : le modèle proposé reste une convention visible et modifiable parmi les modèles du catalogue. Les fichiers source acceptés sont uniquement des textes locaux UTF-8 ; le traitement natif d'image, audio ou vidéo reste hors champ. Les changements qui affectent le calcul rendent les résultats concernés périmés ; ils ne lancent jamais un calcul automatiquement.

## State Patterns

| Surface / état | Traitement |
|---|---|
| Accueil | Une action pour commencer à saisir ou copier/coller la conversation ; aucun paramètre avancé avant le choix du chatbot et du modèle. |
| Fil sans échange | Inviter à coller la première question ; ne pas afficher un bilan chiffré. |
| Échange incomplet | Question seule ou réponse seule reste calculable à la demande ; nommer les champs effectivement pris en compte. Cette règle suit le souhait de calcul « à tout moment ». |
| Échange vide | Ne pas le compter dans le bilan ; « Tout calculer » explique s'il n'existe aucun échange renseigné. |
| Calcul en cours / erreur | État annoncé près de l'action et du résultat concerné ; conserver les textes. |
| Résultat périmé | Texte de péremption sur la carte touchée ; valeur ancienne retirée ou clairement non utilisable, bouton de recalcul. Le bilan ancien n'est plus présenté comme valide. |
| Bilan sans échange calculé / calcul incomplet | « Tout calculer » calcule les échanges renseignés ; « Recalculer le total » reste disponible mais explique les échanges non calculés ou périmés et offre des liens vers leurs cartes. Aucun total ancien n'est présenté comme actuel. |
| Facteur manquant / repli Monde | Expliquer l'indisponibilité ou le repli à côté du résultat concerné. |
| Paramètres invalides | Message lié au champ, focus vers la première erreur, calcul désactivé jusqu'à correction. |
| Paramètres initiaux / modifiés / restaurés | Distinguer valeurs de référence et surcharges de session. Après appliquer ou restaurer, annoncer une seule fois les résultats à recalculer ; ne pas relancer les calculs. |
| Pays de la personne non détecté | Afficher le pays de repli comme estimation et permettre une correction ; seul le comparatif douche dépend de ce choix. |

## Interaction Primitives

- Coller des textes dans des champs clairement étiquetés ; `Entrée` ajoute une ligne dans un champ multiligne, elle ne lance pas un calcul.
- Ajouter, déplier, modifier ou supprimer un échange sans perdre les autres. Le bouton de dépliage dit « Déplier l'échange N » ou « Replier l'échange N », porte `aria-expanded` et `aria-controls`, et garde le focus lors du dépliage. La suppression offre une confirmation si l'échange contient du texte. [ASSUMPTION]
- Calculer l'échange courant à tout moment après au moins un texte utile ; un échange vide garde « Calculer » indisponible avec explication. « Tout calculer » calcule les échanges renseignés puis le bilan. « Recalculer le total », dans le bilan, réutilise les résultats à jour ; si certains manquent ou sont périmés, il les désigne et renvoie à leur carte sans afficher de total incomplet.
- Après ajout, placer le focus sur la question du nouvel échange. Après suppression, rendre le focus à l'échange voisin ou à « Ajouter un échange ».
- Après un changement d'étape, placer le focus sur le nouveau titre.
- Garder les actions tactiles et clavier identiques ; aucune commande cachée au survol, aucun glisser-déposer nécessaire.

### Affichage des quantités

Les calculs gardent leurs valeurs non arrondies ; seule la présentation change. Après arrondi, choisir l'unité pour afficher une valeur dans `[0,001 ; 1 000[`, donc au plus deux zéros consécutifs après la virgule et trois chiffres avant elle. Séries autorisées : carbone µgCO₂e → mgCO₂e → gCO₂e → kgCO₂e → tCO₂e ; eau µL → mL → L → kL → ML ; électricité mWh → Wh → kWh → MWh → GWh ; durée de douche ms → s → min → h → j. Utiliser au plus trois chiffres significatifs, la virgule française et le regroupement des milliers dans l'unité maximale. Si l'arrondi donnerait 1 000, passer à l'unité suivante. Zéro reste « 0 » avec l'unité de base ; sous la plus petite unité, afficher « < 0,001 » avec cette unité. Si la valeur dépasse l'unité maximale, afficher un nombre groupé sans notation scientifique et expliciter sa grande taille. [ASSUMPTION : précision d'affichage et unités extrêmes à valider sur les données réelles avant livraison.]

Chaque unité abrégée possède un nom accessible complet, par exemple « milligrammes de dioxyde de carbone équivalent » ou « millilitres d'eau ». Une aide courte indique que l'unité change selon la valeur.

## Accessibility Floor

- Ordre de focus et de lecture identique à l'ordre visuel. Boutons et cartes dépliables ont nom, rôle et état (`aria-expanded`) explicites.
- Les messages de calcul et d'erreur sont annoncés sans relire tout le fil ; les résultats ne déplacent pas le focus de manière inattendue.
- La confirmation de remplacement suit les mêmes règles de dialogue. Le fond est inerte pendant ces dialogues, qui ne s'empilent jamais.
- Contrôles tactiles d'au moins 44 × 44 px ; focus visible via `{colors.focus}` ; reflow à 320 px et zoom à 200 % puis 400 % sans perte d'action.
- Les statuts ne reposent jamais seulement sur une couleur, un pictogramme ou un mouvement. Respect de `prefers-reduced-motion` ; aucune animation nécessaire à la compréhension.
- Les fichiers source et contenus facultatifs ont des libellés compréhensibles et des messages de refus qui expliquent la prochaine action.
- Les termes « artifact », « PUE », « WUE » et « tokens » ont une explication courte à la demande ; dans le parcours courant, « Document ou code généré (facultatif) » remplace « Artifact » seul.

## Inspiration & Anti-patterns

Le fil de chatbot inspire l'ordre chronologique et la proximité entre question, réponse et estimation. Le guide calme est retenu pour son rythme, Canopée claire pour son identité. L'interface évite les codes visuels de Claude relevés par Felix, les bulles qui feraient croire à une conversation avec le calculateur, les formulaires de paramètres présentés dès l'arrivée et les conseils personnalisés non calculés.

## Responsive & Platform

Sur mobile, une seule colonne : choix d'entrée, puis en-tête chatbot/modèle, cartes d'échanges compactes, éditeur courant et action de bilan. Le clavier logiciel ne masque pas le champ actif ni son libellé. Sur ordinateur, conserver la largeur de lecture de `{spacing.content-max}` ; les paramètres et le bilan peuvent s'ouvrir à proximité sans modifier l'ordre du fil. Aucun comportement ne dépend du survol. L'interface est une page web, sans navigation native mobile à reproduire.

## Key Flows

### UJ-1 — Camille évalue sa conversation au fil des échanges

1. Camille ouvre le calculateur sur son téléphone et choisit « Saisir un échange ».
2. Elle indique son chatbot et vérifie le modèle proposé ; elle peut en choisir un autre, y compris pour ChatGPT.
3. Elle colle sa question. Le champ de réponse suit directement ; raisonnement visible, artifact et fichiers restent facultatifs.
4. Elle colle la réponse et lance « Calculer cet échange ». **Climax :** une carte près du texte affiche une estimation lisible du carbone et de l'eau, avec unités adaptées ; Camille comprend le lien entre son échange et ces valeurs.
5. Elle ajoute un échange. Le premier devient une carte compacte dépliable, le nouveau champ de question reçoit le focus.
6. Elle peut calculer ce nouvel échange, puis lancer « Calculer toute la conversation ».
7. Le bilan présente carbone, eau, électricité, équivalence douche et recommandations.

Échec : un paramètre indispensable manque → le calcul explique le blocage près de l'action sans effacer les textes. Si Camille modifie un échange déjà calculé, le résultat et le bilan dépendants deviennent périmés jusqu'au recalcul explicite.

### UJ-2 — Camille corrige un échange déjà calculé

1. Camille déplie un échange ancien et corrige la réponse collée.
2. La carte indique « Résultat à recalculer » ; les échanges dépendants et le bilan ne présentent plus leurs anciennes valeurs comme actuelles.
3. Elle recalcule les échanges signalés, puis le total. **Climax :** les étiquettes de péremption disparaissent et les nouvelles unités restent cohérentes entre échange et bilan.

Échec : si une correction rend une donnée invalide, le texte reste éditable et le bilan attend sa résolution.

### UJ-4 — Camille ajuste les hypothèses et recalcule le bilan

1. Camille ouvre les paramètres avancés depuis le fil, corrige le pays d'hébergement et applique une hypothèse modifiée.
2. Un seul message annonce combien de résultats doivent être recalculés ; chaque carte concernée reste identifiable.
3. Elle restaure les valeurs de référence si son essai ne lui convient pas. Aucun calcul ne démarre seul.
4. Elle tente « Recalculer le total » : le bilan nomme les échanges encore non calculés ou périmés et la ramène à leurs cartes.
5. Elle calcule ces échanges, puis relance le total. **Climax :** le nouveau bilan présente les valeurs à jour et précise le pays retenu, sans faire passer le pays d'hébergement pour une localisation mesurée.

Échec : une valeur avancée invalide reste signalée près de son champ et bloque le calcul jusqu'à correction ou restauration.
