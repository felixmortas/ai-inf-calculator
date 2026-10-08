---
name: Empreinte IA — expérience conversationnelle
status: final
sources:
  - ../../prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - ../../epics.md
  - ../../architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
  - ../../sprint-change-proposal-2026-10-07.md
updated: 2026-10-07
---

## Foundation

Page web responsive, en français, sans compte, pour un public curieux et non technique. Le fil représente une conversation **déjà tenue** avec un chatbot : le calculateur guide la reconstruction et estime son impact ; il ne répond pas aux questions collées. Le système visuel est défini par [DESIGN.md](DESIGN.md). Pas de bibliothèque de composants imposée. Les textes saisis, leur tokenisation et les calculs restent locaux. La session n'est pas conservée après fermeture.

Principe directeur (audit du 2026-10-07) : dire à chaque instant ce que l'on fait et pourquoi, ne poser que des questions compréhensibles, montrer une valeur lisible avant les chiffres techniques. Chaque étape a **une seule action principale**, libellée, toujours visible.

### Décisions à reporter dans le produit existant

| Parcours actuel | Décision UX |
|---|---|
| Titre d'accueil et carte intermédiaire avec flèche muette | Une phrase, un bouton « Commencer ». Plus de carte intermédiaire ni de « ou ». |
| Paragraphe d'introduction de cinq lignes répété sur tous les écrans | Une seule phrase, affichée à l'accueil uniquement. |
| Configuration du modèle sans justification | « Étape 1/3 : Votre IA », avec la raison de la question. |
| « Valider » et « Appliquer les paramètres » concurrents | Un seul « Continuer » collant ; les paramètres valides sont appliqués automatiquement. |
| Paramètres avancés mélangés au choix du chatbot | « Mode avancé » replié sous le choix du modèle (paramètres compréhensibles) ; « Mode expert » replié à l'intérieur du Mode avancé (paramètres techniques). |
| « Calculer cet échange uniquement » et « Calculer toute la conversation » | Un seul « Calculer » : il calcule et affiche tout à chaque fois. Plus de calcul par échange ni de recalcul du seul total. |
| Bilan sur un écran séparé, dense, unités seules, cinq conseils en fin d'écran | Résultat sous la conversation, sur la même page : douche en grand, puis valeurs, comparaison LED, interprétation, une bonne pratique, bouton « Partager ». |
| Bouton « ? » menant à la méthodologie | Lien libellé « Méthodologie ». Pas de tutoriel ni d'aide pas à pas. |
| Boutons à icône seule | Icône et texte visibles partout. |

## Information Architecture

| Surface | Accès | Besoin couvert |
|---|---|---|
| Accueil | Ouverture | Comprendre en une phrase le rôle de l'outil et commencer. [Maquette](mockups/accueil.html) (à régénérer). |
| Étape 1/3 — Votre IA | « Commencer » ; « Changer d'IA » depuis le fil | Choisir chatbot et abonnement/mode ; modèle déduit modifiable ; pays de la personne déduit ; « Mode avancé » replié sous le choix du modèle, qui contient le « Mode expert » replié. |
| Étape 2/3 — Votre conversation | « Continuer » | Saisir, relire, modifier, ajouter et supprimer les questions / réponses. [Maquette](mockups/conversation.html) (à régénérer). |
| Carte question / réponse | Dans le fil de l'étape 2/3 ; valeurs affichées après « Calculer » | Lire carbone et eau estimés dans l'en-tête ; voir l'état d'actualité. |
| Étape 3/3 — Résultat | « Calculer », sans nouvel écran : section sous la conversation, sur la même page | Lire la douche en grand, les valeurs, la comparaison LED, l'interprétation, une bonne pratique ; partager. [Maquette](mockups/bilan.html) (à régénérer). |
| Mode avancé | Section repliable sous le choix du modèle, étape 1/3 | Corriger pays de l'utilisateur, paramètres douche et ampoule. |
| Mode expert | Section repliable à l'intérieur du Mode avancé | Corriger pays d'hébergement et hypothèses techniques. |
| Méthodologie | Lien libellé « Méthodologie », uniquement sur l'accueil, sous le bouton « Commencer » | Document de référence pour les curieux ; bouton « Retour » libellé tout en haut, au-dessus d'un seul titre principal. |

L'accueil et les trois étapes forment une progression dans la même page. L'étape 3/3 n'est pas un nouvel écran : le résultat apparaît sous la conversation après « Calculer » et reçoit le focus. Depuis l'étape 2/3, « Retour » mène à l'étape 1/3 ; un retour à l'étape précédente ne supprime pas les textes. Le bouton « Retour » est libellé, placé en haut à gauche, au-dessus du titre de l'écran. Le fil reste l'ancre de navigation après le départ. La confirmation de suppression d’une question / réponse est le seul dialogue modal du parcours. La [variante Canopée claire](.working/palettes-guide-calme.html) illustre l'accueil ; `DESIGN.md` et ce document priment sur cette exploration et sur les maquettes statiques.

L'indicateur de progression (« Étape 1/3 : Votre IA ») est textuel, ne repose pas seulement sur une barre colorée, et annonce l'étape au changement.

## Voice and Tone

Le guide parle en phrases courtes et concrètes. Il dit pourquoi une question est posée. Dans le fil, les libellés remplacent les messages du guide pour laisser dominer les textes de Camille. Pas de jargon : « échange » devient « question / réponse », « artifact » devient « fichier créé par l'IA », « Scope 2 » n'apparaît que dans la méthodologie.

| Situation | Texte indicatif | Éviter |
|---|---|---|
| Accueil | « Estimez l'énergie, le CO₂ et l'eau consommés par votre conversation avec une IA, comparés à une douche chaude. » | Un paragraphe de cinq lignes, « Discutez avec nous » |
| Action d'accueil | « Commencer » | Une flèche seule |
| Étape 1/3 | « Étape 1/3 : Votre IA » ; « Chaque IA consomme différemment, c'est pourquoi nous avons besoin de savoir laquelle vous utilisez. » | « Configurez votre fournisseur » |
| Modèle déduit | « Modèle estimé : gpt-6-luna » avec « Modifier » | « Sélectionnez un modèle » sans contexte |
| Localisation | « Où vous vous trouvez (pour la comparaison douche) » ; « Où est hébergée l'IA (pour le CO₂) » ; « Si vous ne savez pas, laissez la valeur par défaut. » | « Localisation » et « Localisation du modèle (hébergement) » côte à côte |
| Champs | « Collez ici votre message » (exemple de contenu), « Collez ici la réponse de l'IA » | « Saisissez ou collez… » sans exemple, « Prompt », « Output » |
| Options | « Réflexion affichée par l'IA (optionnel) », « Contenu du fichier créé par l'IA (optionnel) », « Fichiers que vous avez joints » | « Raisonnement visible », « Fichier généré », « Fichiers uploadés » |
| Ajout | « + Ajouter une question / réponse » | « + » seul |
| Calcul | « Calculer » | « Calculer l'impact de cet échange uniquement » |
| État à jour | « ✓ » | « Impact à jour » |
| Péremption | « à recalculer » (jusqu'au prochain « Calculer ») | Un simple symbole ou une couleur |
| Interprétation | « Une conversation pèse peu, mais ça s'additionne : 100 conversations comme celle-ci ont un impact plus conséquent. » | « C'est très faible » (jugement automatique) |
| Périmètre | « Ne compte que l'électricité des serveurs, pas la fabrication du matériel ni l'entraînement de l'IA. » | « Périmètre : usage uniquement côté serveur (Scope 2) » |
| Partage | « Partager » ; « Résultat copié. » (repli) | Promettre un partage de la conversation |

L'incertitude est mentionnée auprès des résultats : estimation de l'usage fondée sur des hypothèses, pas mesure directe de la requête réelle. Les recommandations parlent de gestes possibles, sans promettre un gain chiffré ni faire croire que masquer la réflexion dans cet outil désactive le raisonnement du chatbot.

## Component Patterns

| Composant | Comportement |
|---|---|
| Guide prompt | Une seule phrase, à l'accueil uniquement. Disparaît comme guide actif après « Commencer ». |
| Start button | Bouton « Commencer » à l'accueil. |
| Step indicator | Texte « Étape N/3 : titre » en tête des écrans 1 à 3 ; la phrase de justification suit le titre. |
| Back button | Bouton retour libellé, en haut à gauche, avant le titre ; conserve les textes. |
| Methodology link | Lien libellé « Méthodologie » sous « Commencer » sur l'accueil uniquement, ouvrant la page de méthodologie ; aucun bouton « ? » seul, aucun tutoriel. |
| Sticky action bar | L'action principale de l'étape (« Continuer », « Calculer ») est visible en bas de l'écran. Elle devient statique (non collante) à fort zoom ou en hauteur réduite et ne masque jamais le champ en focus. |
| Exchange card | Cartes compactes ordonnées. En-tête : numéro, aperçu de la question et de la réponse, état d'actualité, carbone et eau si l'estimation est à jour. Commandes texte « Déplier » / « Replier » ; déplier révèle contenu, modification, suppression. Pas d'action de calcul propre à la carte. |
| Exchange editor | Question puis réponse ; « Ajouter du contenu (optionnel) » regroupe réflexion affichée par l'IA, contenu du fichier créé par l'IA et fichiers joints. « + Ajouter une question / réponse » ouvre un nouvel éditeur sans imposer de calcul. |
| Result hero | Équivalence douche en grand (`metric-hero`), avec nom accessible complet de l'unité. |
| Result values | Carbone, eau, électricité en second plan, avec unités adaptées. |
| Everyday comparison | Durée d'ampoule LED 5W allumée et phrase d'interprétation ; la phrase est neutre. |
| Practice tip | Une bonne pratique tirée au hasard, stable pour un même résultat, avec « Voir toutes les bonnes pratiques ». |
| Result actions | Un seul bouton libellé « Partager ». |
| Button primary | Une action principale par étape, nommée explicitement. Aucune action concurrente de même poids. |
| Text link | « Rétablir les valeurs par défaut », « En savoir plus », « Modifier » : liens discrets, soulignés, cible de 44 × 44 px. |
| Status message | Signale données invalides, calcul en cours, résultat périmé et facteurs de repli avec une action de suite lorsque possible. L'état initial normal d'un champ ou d'un bloc vide n'est jamais présenté comme un avertissement. |
| Model selector | Modèle déduit affiché avec « Modifier » ; le choix direct d'un autre modèle du catalogue reste possible. Le chatbot et le modèle restent consultables et modifiables depuis le fil ; un changement signale les calculs devenus périmés. |
| Advanced mode | À l'étape 1/3, section repliée sous le choix du modèle : où vous vous trouvez (déduit de la langue du navigateur, avec « Modifier »), débit de douche, température de l'eau froide, température de l'eau pendant la douche, puissance de la LED. Contient le Mode expert. |
| Expert mode | Section repliée à l'intérieur du Mode avancé : où est hébergée l'IA, intensité carbone, paramètres totaux et activés, PUE, WUE, puis le reste. Chaque champ explique son effet ; valeurs arrondies à l'affichage ; pas de bouton « Appliquer ». |
| Share action | Ouvre le partage du système avec un texte prérempli ; à défaut, copie ce texte dans le presse-papiers (chatbot utilisé, nombre d'échanges, équivalence douche, valeurs principales avec unités, mention d'estimation, adresse de la page) ; jamais le contenu de la conversation. |

Le chatbot et le modèle restent visibles dans l'en-tête du fil et peuvent être modifiés sans ouvrir le Mode avancé ni le Mode expert. Les fichiers joints acceptés sont uniquement des textes locaux UTF-8 ; le traitement natif d'image, audio ou vidéo reste hors champ. Les changements qui affectent le calcul rendent les résultats concernés périmés ; ils ne lancent jamais un calcul automatiquement. Les valeurs de paramètres valides sont appliquées à « Continuer » ou « Calculer » ; cette application n'ajoute aucun calcul.

## State Patterns

| Surface / état | Traitement |
|---|---|
| Accueil | Une phrase et « Commencer » ; aucun paramètre avant l'étape 1/3. |
| Étape 1/3 | Titre, justification, choix chatbot et abonnement/mode ; modèle déduit avec « Modifier » ; « Mode avancé » replié sous le choix du modèle, contenant le « Mode expert » replié ; « Continuer » collant. |
| Fil sans question / réponse | Champs vides avec exemples d'aide neutres ; pas de message d'avertissement ; ne pas afficher de résultat chiffré. |
| Question / réponse incomplète | Question seule ou réponse seule reste calculable ; nommer les champs effectivement pris en compte. |
| Question / réponse vide | Ignorée sans avertissement alarmiste ; « Calculer » explique s'il n'existe aucune question / réponse renseignée. |
| Calcul en cours / erreur | État annoncé près de l'action et du résultat concerné ; conserver les textes ; l'interface reste verrouillée pendant le calcul. |
| Résultat non calculé | La section résultat n'existe pas tant que « Calculer » n'a pas abouti ; aucune valeur n'est montrée. |
| Estimation à jour | « ✓ » avec le pictogramme. |
| Résultat périmé | « à recalculer » sur la carte touchée et sur la section résultat ; valeur ancienne retirée ou clairement non utilisable ; partage indisponible. Le prochain « Calculer » recalcule et affiche tout. |
| Aucune question / réponse renseignée | « Calculer » est indisponible avec explication. Aucun total ancien n'est présenté comme actuel. |
| Facteur manquant / repli Monde | Expliquer l'indisponibilité ou le repli à côté du résultat concerné. |
| Paramètres invalides | Message lié au champ, focus vers la première erreur, « Continuer » et « Calculer » désactivés avec explication jusqu'à correction. |
| Paramètres initiaux / modifiés / restaurés | Distinguer valeurs de référence et surcharges de session. Après modification ou restauration, annoncer une seule fois les résultats à recalculer ; ne pas relancer les calculs. |
| Pays de la personne non déduit | Afficher le pays de repli comme estimation avec « Modifier » ; seul le comparatif douche en dépend. |
| Durée LED non calculable | Puissance de référence nulle : dire que la comparaison n'est pas calculable ; aucune durée infinie. |
| Partage | Bouton « Partager » proposé seulement avec un résultat valide et à jour ; retour textuel « Résultat copié. » en cas de copie, ou message d'échec avec action de suite. |

## Interaction Primitives

- Coller des textes dans des champs clairement étiquetés ; `Entrée` ajoute une ligne dans un champ multiligne, elle ne lance pas un calcul.
- Ajouter, déplier, modifier ou supprimer une question / réponse sans perdre les autres. Le bouton de dépliage dit « Déplier la question / réponse N » ou « Replier la question / réponse N », porte `aria-expanded` et `aria-controls`, et garde le focus lors du dépliage.
- « Calculer » traite toutes les questions / réponses renseignées et affiche tout à chaque fois (cartes, total, résultat) ; après le calcul, le focus va au titre du résultat, sous la conversation, sans changement d'écran ; il est indisponible, avec explication, tant qu'aucun texte utile n'existe.
- L'action principale collante reste accessible au clavier et sans survol. Elle ne couvre jamais le champ en focus : `scroll-padding` et passage en position statique à fort zoom, en hauteur réduite ou avec clavier logiciel ouvert.
- Après ajout, placer le focus sur la question de la nouvelle carte. Après suppression, rendre le focus à la carte voisine ou à « + Ajouter une question / réponse ».
- Après un changement d'étape, placer le focus sur le nouveau titre et annoncer « Étape N/3 ».
- Garder les actions tactiles et clavier identiques ; aucune commande cachée au survol, aucun glisser-déposer nécessaire.
- « Partager » utilise le partage du système lorsqu'il existe, sinon copie le texte dans le presse-papiers ; il ne place jamais de donnée de conversation dans l'adresse de la page.

### Affichage des quantités

Les calculs gardent leurs valeurs non arrondies ; seule la présentation change. Après arrondi, choisir l'unité pour afficher une valeur dans `[0,001 ; 1 000[`, donc au plus deux zéros consécutifs après la virgule et trois chiffres avant elle. Séries autorisées : carbone µgCO₂e → mgCO₂e → gCO₂e → kgCO₂e → tCO₂e ; eau µL → mL → L → kL → ML ; électricité mWh → Wh → kWh → MWh → GWh ; durée de douche ou d'ampoule ms → s → min → h → j. Utiliser au plus trois chiffres significatifs, la virgule française et le regroupement des milliers dans l'unité maximale. Si l'arrondi donnerait 1 000, passer à l'unité suivante. Zéro reste « 0 » avec l'unité de base ; sous la plus petite unité, afficher « < 0,001 » avec cette unité. Si la valeur dépasse l'unité maximale, afficher un nombre groupé sans notation scientifique et expliciter sa grande taille.

Chaque unité abrégée possède un nom accessible complet, par exemple « milligrammes de dioxyde de carbone équivalent » ou « millilitres d'eau ». Une aide courte indique que l'unité change selon la valeur.

## Accessibility Floor

- Ordre de focus et de lecture identique à l'ordre visuel. Boutons et cartes dépliables ont nom, rôle et état (`aria-expanded`) explicites.
- Toute commande, y compris avec icône, porte un libellé visible ; l'icône est décorative (`aria-hidden`).
- Les messages de calcul et d'erreur sont annoncés sans relire tout le fil ; les résultats ne déplacent pas le focus de manière inattendue.
- La confirmation de remplacement suit les mêmes règles de dialogue. Le fond est inerte pendant ces dialogues, qui ne s'empilent jamais.
- Contrôles tactiles d'au moins 44 × 44 px ; focus visible via `{colors.focus}` et jamais masqué par la barre collante ; reflow à 320 px et zoom à 200 % puis 400 % sans perte d'action.
- Les statuts ne reposent jamais seulement sur une couleur, un pictogramme ou un mouvement (« ✓ », « à recalculer »). Respect de `prefers-reduced-motion` ; aucune animation nécessaire à la compréhension.
- L'indicateur « Étape N/3 » est du texte, annoncé au changement d'étape.
- Les fichiers joints et contenus facultatifs ont des libellés compréhensibles et des messages de refus qui expliquent la prochaine action.
- Les termes « fichier créé par l'IA », « PUE », « WUE » et « tokens » ont une explication courte à la demande.

## Inspiration & Anti-patterns

Le fil de chatbot inspire l'ordre chronologique et la proximité entre question, réponse et estimation. Le guide calme est retenu pour son rythme, Canopée claire pour son identité. L'interface évite les codes visuels de Claude relevés par Felix, les bulles qui feraient croire à une conversation avec le calculateur, les formulaires de paramètres techniques présentés dès l'arrivée, les boutons à icône seule, deux boutons de calcul concurrents, les avertissements pour un état initial normal et les conseils personnalisés non calculés.

## Responsive & Platform

Sur mobile, une seule colonne : indicateur d'étape, puis contenu de l'étape (le résultat s'ajoute sous la conversation), et action principale collante en bas ; l'introduction n'occupe pas l'écran hors accueil. Le clavier logiciel ne masque pas le champ actif, son libellé ni l'action principale. Sur ordinateur, conserver la largeur de lecture de `{spacing.content-max}`. Aucun comportement ne dépend du survol. L'interface est une page web ; le bouton « Retour » en haut à gauche suit la convention mobile sans reproduire une navigation native.

## Key Flows

### UJ-1 — Camille évalue sa conversation en trois étapes

1. Camille ouvre le calculateur sur son téléphone, lit la phrase d'accueil et choisit « Commencer ».
2. À l'étape 1/3 « Votre IA », elle lit pourquoi on lui demande son IA, indique son chatbot et son abonnement ; le modèle estimé est déduit et modifiable. Son pays est déduit de la langue du navigateur. Elle active « Continuer ».
3. À l'étape 2/3 « Votre conversation », elle colle sa question puis la réponse de l'IA ; réflexion affichée, fichier créé par l'IA et fichiers joints restent optionnels.
4. Elle ajoute une question / réponse : la première devient une carte compacte dépliable, le nouveau champ de question reçoit le focus.
5. Elle active « Calculer ». **Climax :** sous sa conversation, sans nouvel écran, l'étape 3/3 montre en grand une durée de douche chaude équivalente, puis carbone, eau et électricité, une comparaison à une ampoule LED et une phrase d'interprétation ; chaque carte montre carbone et eau dans son en-tête avec « ✓ ».
6. Elle lit une bonne pratique, et utilise « Partager » si elle le souhaite.

Échec : un paramètre indispensable manque → le calcul explique le blocage près de l'action sans effacer les textes. Si Camille modifie une question / réponse déjà calculée, le résultat dépendant devient « à recalculer » jusqu'au prochain « Calculer ».

### UJ-2 — Camille corrige une question / réponse déjà calculée

1. Camille déplie une carte ancienne et corrige la réponse collée.
2. La carte indique « à recalculer » ; les cartes dépendantes et le résultat ne présentent plus leurs anciennes valeurs comme actuelles.
3. Elle active « Calculer ». **Climax :** les états « à recalculer » disparaissent et les unités restent cohérentes entre carte et résultat.

Échec : si une correction rend une donnée invalide, le texte reste éditable et le résultat attend sa résolution.

### UJ-4 — Camille ajuste les hypothèses et recalcule

1. Camille ouvre le Mode avancé ou expert, corrige où est hébergée l'IA ou ajuste la douche, puis continue ; les valeurs sont appliquées sans bouton dédié.
2. Un seul message annonce que les résultats sont à recalculer ; chaque carte concernée reste identifiable.
3. Elle rétablit les valeurs par défaut par le lien discret si son essai ne lui convient pas. Aucun calcul ne démarre seul.
4. Elle active « Calculer ». **Climax :** le résultat présente les valeurs à jour et précise le pays retenu, sans faire passer le pays d'hébergement pour une localisation mesurée.

Échec : une valeur invalide reste signalée près de son champ et bloque « Continuer » et « Calculer » jusqu'à correction ou restauration.

### UJ-5 — Camille se renseigne puis partage

1. Camille ouvre la méthodologie depuis l'accueil, sous « Commencer », seulement si elle est curieuse, puis revient à l'accueil grâce à « ← Retour » en haut à gauche.
2. Sous sa conversation, elle active « Partager ». **Climax :** le partage du système s'ouvre avec un texte prérempli (chatbot utilisé, nombre d'échanges, équivalence douche, valeurs principales avec unités, mention d'estimation, adresse de la page), sans aucun contenu de sa conversation.

Échec : si le partage n'est pas disponible, le texte est copié et « Résultat copié. » le confirme ; si la copie échoue, un message l'explique.
