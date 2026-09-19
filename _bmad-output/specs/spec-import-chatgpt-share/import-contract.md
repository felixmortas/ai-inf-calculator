# Contrat d’import multi-fournisseur

## Frontière d’adaptateur

Le parcours commun ne connaît que des `ImportProvider` enregistrés : identifiant stable, libellé affichable, validation de lien, lecture publique bornée, extraction vers une séquence normalisée d’événements et règles de classement des traces. Il renvoie une prévisualisation commune : blocs candidats, contenus inaccessibles, événements non attribués et erreurs actionnables. Le regroupement en blocs, les notifications artifact/fichier, la confirmation de remplacement, les pièces jointes, les tokens et l’invalidation ne dépendent pas du fournisseur.

La V1 enregistre uniquement `chatgpt`. Son adaptateur possède la validation stricte, les chemins d’extraction et les classifications décrits ci-dessous. Claude, Gemini et Mistral ne sont ni affichés comme disponibles ni acceptés par validation en V1. Leur ajout ultérieur consiste à fournir leur adaptateur — avec ses limites publiques, CORS et formats spécifiques — puis ses jeux de tests ; il ne modifie pas le contrat d’événements normalisés ni le calcul environnemental.

## Parcours et états

L’interface ajoute une zone d’import avant les blocs : fournisseur sélectionné (ChatGPT seul en V1), champ URL, action « Analyser le lien », prévisualisation, avertissements et action « Remplacer les échanges par l’import ». Une confirmation est obligatoire si un bloc non vide existe. L’échec conserve intégralement les blocs présents. Après validation, les blocs importés sont des blocs ordinaires, éditables, supprimables et recalculables ; aucun calcul n’est lancé automatiquement.

Le navigateur valide exactement le schéma `https`, l’hôte `chatgpt.com`, le chemin `/share/<id>` alphanumérique avec tirets, sans port, identifiants, query ni fragment. Il limite la taille de réponse et le nombre de messages avant parsing. Il ne suit pas de lien, ne charge aucune ressource liée et ne manipule jamais le contenu distant avec `innerHTML`. Les échecs distinguables incluent URL invalide, accès/CORS refusé, HTTP non réussi, réponse trop grande et structure publique inconnue.

## Extraction publique

Le parseur lit seulement l’état conversationnel public présent dans la page de partage, notamment les structures JSON et le flux indexé React Router déjà constatés par l’étude. Il normalise du texte brut, déduplique sur un identifiant de message lorsqu’il existe et restitue l’ordre chronologique public. Un changement de structure n’est pas contourné : il produit l’état « format inconnu » et ne crée aucun bloc.

Les rôles `user`, `assistant` et `tool` sont gardés séparés jusqu’au regroupement. Les rôles inconnus, les événements qui arrivent sans utilisateur courant ou après la réponse finale d’un bloc sont signalés comme non attribués dans la prévisualisation, pas attribués arbitrairement.

## Règles de regroupement

| Événement public ordonné | Destination | Règle |
| --- | --- | --- |
| Message `user` non vide | Nouveau bloc, `Message` | Termine le bloc en attente sans réponse finale et signale son incomplet ; le texte est conservé tel quel. |
| `tool`: `The output of this plugin was redacted.` | `Raisonnement visible` du bloc en attente | Conserver le marqueur littéral : il atteste une trace mais pas son contenu. |
| `assistant`: `Réfléchi pendant ...` | `Raisonnement visible` du bloc en attente | Conserver la durée textuelle exposée publiquement. |
| Déclenchement/outillage, dont chemin `/mnt/data/...` | `Raisonnement visible` du bloc en attente | Conserver la trace ; ne pas tenter d’ouvrir le chemin. |
| Commande d’appel de skill, dont `bash -lc cat .../SKILL.md`, et code de script produit à sa suite | `Raisonnement visible` du bloc en attente | Conserver dans leur ordre avec séparateur de lignes ; aucun code n’est exécuté. |
| Première réponse assistant qui n’est pas reconnue comme trace ci-dessus | `Réponse finale` | Elle clôt le bloc ; les traces accumulées restent dans le même bloc. |
| Événement après cette réponse et avant le prochain `user` | Prévisualisation : non attribué | Prévenir ; ne pas le déplacer dans un bloc clos. |

Une réponse assistant finale peut contenir du Markdown et des citations de fichier ; elle est conservée comme texte brut. Les traces du même bloc sont jointes par `\n\n` dans leur ordre public. Les réponses/fichiers absents ne sont jamais remplacés par un texte déduit.

## Artifacts et fichiers cités

Une cible Markdown `sandbox:/mnt/data/...` dans une réponse finale est un artifact détecté. Le bloc affiche un statut accessible du type : « Artifact détecté : collez son contenu dans le champ Artifact optionnel pour le compter. » Il ne télécharge pas le lien et ne le compte pas tant que la personne n’a pas collé son contenu.

Une citation `filecite…L…` ou toute référence de fichier d’entrée fournie par le parseur est un fichier source non accessible. Le bloc concerné affiche : « Fichier source détecté : uploadez-le pour inclure son contenu dans les tokens d’entrée. » L’UI propose alors un champ d’upload multiple associé à ce bloc. Les citations dont le bloc d’origine est indéterminable restent dans les avertissements de prévisualisation.

## Pièces jointes locales et tokens

Chaque bloc possède une collection en mémoire de pièces jointes source, avec un identifiant, nom affichable, type MIME déclaratif, taille et texte extrait. Elle n’est jamais sérialisée ni conservée à la fermeture de page. Le champ accepte plusieurs fichiers ; la personne peut retirer chaque fichier et voir s’il est compté ou non.

Cette itération lit seulement des fichiers texte UTF-8 bornés (notamment `.txt`, `.md`, `.markdown`, `.json`, `.csv`, `.log`, `.py`, `.js`, `.ts`, `.html`, `.xml`, `.yaml`, `.yml`, ou MIME `text/*` / `application/json`). Un fichier vide compte zéro. Un binaire, un type non pris en charge, un texte illisible ou trop volumineux est explicitement exclu du calcul et invite la personne à coller un contenu pertinent dans `Message` ou `Artifact` ; il n’est jamais envoyé pour conversion.

Le texte de chaque pièce jointe admise est une entrée de conversation, distincte visuellement du `Message`, mais inclus dans le texte d’entrée canonique de ce bloc. Son contenu est tokenisé par le protocole Worker `o200k_base` existant, avec le fallback unique `mots / 0,75`. L’empreinte de tokenisation, l’historique préparé, l’empreinte d’impact et l’invalidation incluent la liste ordonnée des contenus de pièces jointes. Modifier, ajouter ou retirer une pièce jointe invalide ce bloc et les suivants affectés par l’historique, comme une modification de message ; elle ne modifie pas les artefacts ni les catalogues.

Le détail d’implémentation peut faire évoluer `TokenizationTexts` et la représentation canonique de l’historique, mais les pièces jointes ne doivent être comptées ni comme raisonnement, ni comme sortie, ni deux fois (à la fois comme message concaténé et champ séparé).

## Vérification

- Tester la validation d’URL, les refus réseau/CORS/HTTP, les limites et l’absence de mutation de la session sur échec ou annulation.
- Tester que le registre V1 n’expose que ChatGPT et que le parcours commun consomme des événements normalisés, sans branchement ChatGPT dans les blocs, tokens ou calculs.
- Tester les structures JSON publiques et React Router de l’étude, la conservation de l’ordre, la déduplication et le refus de structure inconnue.
- Tester le scénario fourni : marqueurs `tool` redacted, commande de skill, code, « Réfléchi pendant 6s » et chemin `/mnt/data/...` restent dans `Raisonnement visible`; la dernière réponse assistant devient `Réponse finale`.
- Tester la détection d’un lien artifact `sandbox:/mnt/data/...` et d’une citation `filecite`, avec messages accessibles, sans contenu inventé ni téléchargement.
- Tester l’upload texte local, la suppression, le refus de binaire/trop volumineux, la tokenisation Tiktoken et fallback, le non-double-comptage, l’historique et la péremption en cascade.
