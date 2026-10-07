# Contrat fonctionnel

## Conversation et tokens

Un bloc contient message, réponse finale, raisonnement visible et artifact optionnel. Les champs composés d’espaces sont vides. Un bloc n’est ignoré que si ses quatre champs sont vides : il ne contribue ni à l’historique, ni au prompt système, ni aux impacts.

Pour chaque bloc renseigné, l’entrée nouvelle est son message ; la sortie est son raisonnement visible, sa réponse et la différence ajoutée ou modifiée de l’artifact. Le premier artifact complet est compté ; un artifact vide ne supprime pas la dernière version mémorisée. L’historique reprend les messages, raisonnements et réponses précédents, une seule dernière version complète d’artifact, et les tokens de prompt système catalogués au taux cache, y compris pour le premier bloc. Les résultats antérieurs n’ont pas besoin d’être calculés pour reconstruire cet historique.

## Calcul explicite et fraîcheur

Le bouton unique « Calculer » traite tous les blocs renseignés et le total, et affiche tout à chaque fois : il n’existe ni calcul d’un seul bloc ni recalcul du seul total. Aucun calcul ne démarre à l’édition ou à l’application d’un paramètre.

Ajouter, modifier ou supprimer un bloc renseigné invalide son résultat et ceux des blocs suivants affectés par l’historique ou l’artifact ; ajouter ou supprimer un bloc vide ne le fait pas. Changer un paramètre d’impact, le modèle ou le pays d’hébergement invalide les impacts concernés. Changer uniquement les paramètres ou le pays de douche invalide seulement l’équivalence. Une valeur périmée est masquée et signalée « à recalculer » jusqu’au prochain « Calculer » ; le résultat et le partage sont indisponibles tant qu’un bloc renseigné n’est pas calculé et à jour.

## Paramètres et données

Les réglages sont communs à la conversation et répartis en « Mode avancé » (pays utilisateur, débit, température de l'eau du réseau, températures de douche, puissance de l'ampoule), replié sous le choix du modèle, et « Mode expert », replié à l’intérieur du Mode avancé. Ils modifient temporairement paramètres modèle, hypothèses matérielles et batch, ratios, facteurs environnementaux, pays, conversion mots/tokens et référence douche. Ils affichent noms, unités et valeurs ; les équations restent fixes. Les valeurs valides sont appliquées à « Continuer » ou « Calculer » sans bouton « Appliquer » et sans calcul. Les tokens de prompt système sont uniquement catalogués, masqués et non modifiables. La restauration conserve textes, chatbot et modèle, rétablit les références applicables et ne calcule rien.

Les facteurs manquants utilisent leur valeur « Monde » du même facteur, en le signalant. Une valeur Monde manquante, une donnée modèle ou tarifaire indispensable absente, ou un paramètre invalide bloque seulement le résultat dépendant. Zéro est une valeur carbone valide, mais une douche à émissions nulles rend l’équivalence non calculable.

## Présentation

Les résultats sont des estimations uniques : incertitude, hypothèses et périmètre usage hors fabrication/amortissement/Scope 3 restent visibles dans le parcours courant. L’eau est exclusivement l’eau sur site. Après calcul explicite, chaque question / réponse affiche carbone et eau dans son en-tête ; le résultat valide affiche l’équivalence douche, carbone, eau et électricité, une comparaison en durée d’ampoule LED, une phrase d’interprétation neutre, une bonne pratique et un bouton « Partager », sous la conversation et sur la même page. Le partage ouvre le partage du système (ou copie le texte à défaut) avec un texte prérempli (chatbot utilisé, nombre d’échanges, équivalence douche, valeurs principales avec unités, mention d’estimation, adresse de la page) et ne transmet jamais le contenu de la conversation.

Le pays utilisateur est déduit localement de la langue du navigateur, de façon indicative, visible et corrigeable ; il ne sert qu’au facteur carbone de la douche électrique de référence. Le pays d’hébergement est distinct, prérempli par le fournisseur et alimente énergie, carbone et eau. La liste de conseils ne promet aucun gain chiffré.

## Exigences UX minimales

L’accueil propose une phrase et un bouton pour commencer. Il ouvre la première étape (chatbot, modèle déduit modifiable, pays déduit, Mode avancé replié sous le choix du modèle, contenant le Mode expert replié), puis la seconde étape : anciennes questions / réponses en cartes dépliables, courante en éditeur ouvert ; le résultat s’affiche ensuite sous la conversation, sans nouvel écran. Un lien « Méthodologie » libellé remplace toute aide ou tutoriel. Une seule action principale collante par étape. Les retours d’étape conservent les textes. Chatbot et modèle restent visibles et modifiables depuis le fil. Un modèle ChatGPT ou Mistral prérempli est une estimation modifiable.


Un bloc vide n’est pas présenté comme un avertissement. Les messages français restent séparés des règles métier. La confirmation de suppression rend le fond inerte, place le focus sur l’action conservatrice, le retient, se ferme avec Échap et restitue le focus au déclencheur ; l’ajout d’un échange place le focus sur sa question. Les erreurs, replis et péremptions ont un texte. Les actions restent accessibles au clavier et sans survol, avec cibles de 44 × 44 px, reflow à 320 px et zooms 200 % et 400 %. `DESIGN.md` et `EXPERIENCE.md` adoptés dans la SPEC portent le détail visuel et comportemental.
