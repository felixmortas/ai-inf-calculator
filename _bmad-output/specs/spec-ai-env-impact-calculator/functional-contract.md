# Contrat fonctionnel

## Conversation et tokens

Un bloc contient message, réponse finale, raisonnement visible et artifact optionnel. Les champs composés d’espaces sont vides. Un bloc n’est ignoré que si ses quatre champs sont vides : il ne contribue ni à l’historique, ni au prompt système, ni aux impacts.

Pour chaque bloc renseigné, l’entrée nouvelle est son message ; la sortie est son raisonnement visible, sa réponse et la différence ajoutée ou modifiée de l’artifact. Le premier artifact complet est compté ; un artifact vide ne supprime pas la dernière version mémorisée. L’historique reprend les messages, raisonnements et réponses précédents, une seule dernière version complète d’artifact, et les tokens de prompt système catalogués au taux cache, y compris pour le premier bloc. Les résultats antérieurs n’ont pas besoin d’être calculés pour reconstruire cet historique.

## Calcul explicite et fraîcheur

Le calcul individuel ne calcule que le bloc demandé. « Tout calculer » traite tous les blocs renseignés et le total. « Recalculer le total » agrège les impacts valides existants sans recalculer les blocs ; il peut actualiser l’équivalence douche seule.

Ajouter, modifier ou supprimer un bloc renseigné invalide son résultat et ceux des blocs suivants affectés par l’historique ou l’artifact ; ajouter ou supprimer un bloc vide ne le fait pas. Changer un paramètre d’impact, le modèle ou le pays d’hébergement invalide les impacts concernés. Changer uniquement les paramètres ou le pays de douche invalide seulement l’équivalence. Une valeur périmée est masquée et signalée ; le total est indisponible tant qu’un bloc renseigné n’est pas calculé et à jour.

## Paramètres et données

Les réglages avancés sont communs à la conversation et modifient temporairement paramètres modèle, constantes d’énergie et latence, hypothèses matérielles et batch, ratios, facteurs environnementaux, pays, conversion mots/tokens et référence douche. Ils affichent noms, unités et valeurs ; les équations restent fixes. Les tokens de prompt système sont uniquement catalogués, masqués et non modifiables. La restauration conserve textes, chatbot et modèle, rétablit les références applicables et ne calcule rien.

Les facteurs manquants utilisent leur valeur « Monde » du même facteur, en le signalant. Une valeur Monde manquante, une donnée modèle ou tarifaire indispensable absente, ou un paramètre invalide bloque seulement le résultat dépendant. Zéro est une valeur carbone valide, mais une douche à émissions nulles rend l’équivalence non calculable.

## Présentation

Les résultats sont des estimations uniques : incertitude, hypothèses et périmètre usage hors fabrication/amortissement/Scope 3 restent visibles dans le parcours courant. L’eau est exclusivement l’eau sur site. Après calcul explicite, chaque échange affiche carbone et eau près de ses textes ; le bilan valide affiche carbone, eau, électricité, risque de sécheresse, équivalence douche et conseils. Le risque de sécheresse dépend du pays d’hébergement ; il n’est ni affiché par échange, ni agrégé.

Le pays utilisateur est proposé localement de façon indicative, visible et corrigeable ; il ne sert qu’au facteur carbone de la douche électrique de référence. Le pays d’hébergement est distinct, prérempli par le fournisseur et alimente énergie, carbone, eau et risque. La liste de conseils, non personnalisée, couvre : petit modèle ; éviter de faire raisonner ; moins de tokens entrants et sortants ; relancer une conversation pour supprimer l’historique ; éditer un message lorsque pertinent. Ses textes ne promettent aucun gain chiffré.

## Exigences UX minimales

L’accueil montre deux voies, import Mistral puis saisie manuelle. La voie manuelle ouvre le choix du chatbot et du modèle, puis un fil chronologique : anciens échanges en cartes dépliables, échange courant en éditeur ouvert. Les retours d’étape conservent les textes. Chatbot et modèle restent visibles et modifiables depuis le fil. Un modèle ChatGPT ou Mistral prérempli est une estimation modifiable ; si le mode d’un import Mistral n’est pas fiable, la personne le choisit.

L’import publié accepte uniquement un lien public Mistral. La validation locale et la passerelle refusent les autres fournisseurs sans requête. Avant chaque récupération, un dialogue montre intégralement l’URL canonique et l’endpoint Worker configuré ; seul un consentement explicite autorise le `POST` borné à `shareUrl`. Les échanges et avertissements sont prévisualisés avant ajout ; un fil contenant du texte exige une confirmation distincte avant remplacement. Refus, annulation, changement d’URL ou de configuration, échec et prévisualisation inexploitable préservent le fil ; la saisie manuelle reste accessible.

Les messages français restent séparés des règles métier. Les dialogues rendent le fond inerte, placent initialement le focus sur l’action conservatrice, le retiennent, se ferment avec Échap et restituent le focus au déclencheur. La prévisualisation annonce seulement les comptes d’échanges et d’avertissements, puis place le focus sur son titre ; l’ajout d’un échange place le focus sur sa question. Les erreurs, replis et péremptions ont un texte. Les actions restent accessibles au clavier et sans survol, avec cibles de 44 × 44 px, reflow à 320 px et zooms 200 % et 400 %. `DESIGN.md` et `EXPERIENCE.md` adoptés dans la SPEC portent le détail visuel et comportemental.
