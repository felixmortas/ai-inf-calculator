---
title: Calculateur d’empreinte environnementale des LLM
status: final
created: 2026-09-17
updated: 2026-10-07
---

# PRD — Calculateur d’empreinte environnementale des LLM

## 1. Objet et vision

Une page de `felixmortas.com` permet au grand public de comprendre l’empreinte environnementale estimée d’une conversation avec un chatbot IA. L’accueil est concis et le parcours linéaire en trois étapes ; la dernière, le résultat, s’affiche sous la conversation sans nouvel écran. La personne saisit ou colle ses questions et réponses, déclenche un seul calcul, puis lit l'impact carbone, eau et électricité ainsi qu'une comparaison du quotidien, une phrase d’interprétation, une bonne pratique et un bouton de partage. Le carbone et l’eau estimés restent visibles près de chaque question / réponse.

Le produit vise un lancement public, en français, sans compte, sur ordinateur et mobile. Le fil affiche le chatbot et le modèle, directement modifiables ; les paramètres compréhensibles par tous (pays de la personne, douche) restent accessibles dans un « Mode avancé » replié sous le choix du modèle, et les réglages mathématiques dans un « Mode expert » replié à l’intérieur du Mode avancé. Les textes, leur tokenisation et les calculs restent dans le navigateur. La session n’est pas sauvegardée après fermeture.

Ce PRD est destiné à Felix et aux responsables UX, architecture et développement. Il définit les capacités et comportements attendus. L’[addendum](addendum.md) rassemble les formules, constantes et contraintes techniques. La source initiale est `spec-formules-calculateur-empreinte-llm.md` à la racine ; les décisions recueillies auprès de Felix priment sur ses dispositions explicitement modifiées. Les identifiants d’exigences sont stables.

### Évolution du périmètre — 2026-10-06

L’indicateur de risque de sécheresse et son jeu de données sont retirés. Pour comparer les modèles, la méthode retient l’hypothèse simplificatrice que les centres de données des fournisseurs de LLM se trouvent aux États-Unis ; selon cette hypothèse, une donnée nationale de sécheresse ne différencie pas utilement les modèles et ajoute une charge de données et d’interface. Le pays d’hébergement reste configurable pour les facteurs d’énergie, de carbone et d’eau. Le contrat de référence à suivre est `_bmad-output/specs/spec-ai-env-impact-calculator/SPEC.md` et ses contrats compagnons.

## 2. Public et parcours

Le produit s’adresse à des personnes non techniques qui souhaitent connaître l’impact de leurs échanges avec un chatbot et retenir des pratiques simples. Camille représente ce besoin dans les deux parcours racontés et confirmés par Felix. Aucun autre rôle ni compte utilisateur n’est requis.

### UJ-1 — Camille évalue sa conversation au fil des échanges

**Contexte et entrée.** Camille, une personne non technique, souhaite connaître l’impact environnemental de sa conversation avec ChatGPT. Elle ouvre la page du calculateur sur `felixmortas.com` depuis son PC, sans créer de compte ni se connecter. Le produit est également utilisable sur mobile.

Camille lit une phrase d’accueil et choisit de commencer. À chaque étape, une phrase explique pourquoi les réglages sont importants. La première étape indique ChatGPT et le type d’abonnement gratuit avec un modèle de référence déduit. Une action discrète permet de modifier le modèle. Camille peut choisir directement un autre chatbot et/ou modèle du catalogue pour toute la conversation. Son pays, déduit de la langue du navigateur, est affiché avec une action « Modifier » ; les paramètres de la douche restent modifiables dans le Mode avancé, replié sous le choix du modèle. Elle active « Continuer ».

**Déroulement.**

1. À la prochaine étape, elle colle sa première question dans un champ dédié, puis la réponse de l’IA dans un autre champ. Les champs vides montrent un texte d’aide neutre et aucun avertissement.
2. Elle colle, si elle existe, la réflexion affichée par l’IA et le contenu du fichier créé par l’IA, dans les champs facultatifs associés, et joint éventuellement des fichiers texte importés.
3. Elle ajoute une question / réponse à l'aide d'un bouton : la précédente se replie, le nouvel éditeur s’ouvre et le focus va sur sa question. Elle y colle la question, la réponse et éventuellement la réflexion affichée et le contenu du fichier créé par l’IA.
4. Elle colle la nouvelle version complète du contenu du fichier créé par l’IA. Le calculateur détecte automatiquement les passages ajoutés ou modifiés par rapport à la version précédente et ne comptabilise que ceux-ci en tokens de sortie.
5. Elle active « Calculer », l’unique bouton de calcul. Toutes les questions / réponses renseignées sont prises en compte, et tout est calculé et affiché à chaque fois. Le carbone et l’eau estimés sont affichés dans l’en-tête de chaque carte question/réponse, avec unité adaptée. Une modification de texte ou de paramètre ne lance jamais de calcul.
6. Le pays d’hébergement est prérempli avec le pays de référence du fournisseur ; Camille peut le modifier dans le Mode expert, replié dans le Mode avancé.

**Résultat.** Sous sa conversation, sur la même page, Camille voit d’abord, en grand, l’équivalence carbone en durée de douche chaude, calculée avec le facteur d’émission du pays où elle se trouve. Viennent ensuite le carbone, l’eau et l’électricité, une comparaison du quotidien, une phrase d’interprétation, une bonne pratique, et un bouton pour partager. La quantité d’eau ne fait pas l’objet d’une comparaison.

**Suite attendue.** Après consultation des résultats, Camille découvre une bonne pratique simple, peut toutes les consulter et en retient les gestes à appliquer lors de ses prochaines utilisations (FR-6).

## 3. Périmètre du lancement

**Inclus :** accueil à une phrase et un bouton pour commencer, indicateur de toutes les étapes, saisie ou copier/coller manuel pour les chatbots du catalogue, ajout/modification/suppression de questions / réponses, fichiers texte locaux, un seul calcul explicite qui calcule et affiche tout, historique et versions d’artifact, résultat hiérarchisé (douche, valeurs, comparaison LED, interprétation), une bonne pratique aléatoire, partage d’un texte de résultats par le partage système (un seul bouton), méthodologie détaillée (sans tutoriel), Mode avancé replié sous le choix du modèle et Mode expert replié dans le Mode avancé, réinitialisables, interface française compatible mobile et internationalisable.

**Catalogue :** les chatbots et modèles disponibles, avec la tarification par type de tokens sont ceux du fichier fourni, nommé `models_params`.

**Exclusions :** compte, sauvegarde de conversation, tokenisation distante ou clé API, serveur complémentaire, estimation de raisonnement invisible, fourchettes d’incertitude, conseils personnalisés, comparaison de l’eau, partage du contenu de la conversation, géolocalisation par le navigateur, calcul du Scope 3 ou de l’eau liée à l’électricité. Le traitement natif des images, fichiers audio et vidéos n’est pas défini : le parcours porte sur du texte collé. Le déplacement des blocs et le suivi de plusieurs artifacts distincts dans un même échange ne font pas partie des exigences de lancement.

## 4. Vocabulaire

- **Chatbot / fournisseur :** service utilisé par Camille et fournisseur auquel les données de référence sont rattachées.
- **Modèle :** modèle de référence choisi pour toute la conversation et issu du catalogue.
- **Bloc / échange :** un message, une réponse finale, un raisonnement visible éventuel et une version d’artifact éventuelle. Dans l’interface, il s’appelle « Question / Réponse » ; « échange » et « bloc » restent des termes internes.
- **Réflexion affichée par l’IA :** libellé grand public du raisonnement visible, facultatif.
- **Contenu du fichier créé par l’IA :** libellé grand public de l’artifact, champ texte facultatif.
- **Fichiers joints :** fichiers texte locaux de la personne (et non « uploadés »).
- **Mode avancé :** section repliée sous le choix du modèle qui regroupe les paramètres compréhensibles (pays de la personne, douche, ampoule LED).
- **Mode expert :** section repliée à l’intérieur du Mode avancé qui regroupe les paramètres techniques.
- **Comparaison du quotidien :** équivalence qui rend une quantité lisible.
- **Artifact :** contenu produit suivi dans un champ distinct au fil de ses versions.
- **Token estimé :** unité calculée avec le Tokenizer d'OpenAI par défaut, ou bien approximée localement par le nombre de mots divisé par 0,75 en fallback.
- **Historique :** échanges antérieurs, dernière version complète d’artifact et tokens du prompt système ; convention de cache à 100 %.
- **Résultat périmé :** résultat dont une entrée ou un paramètre utilisé a changé depuis le calcul.
- **Pays d’hébergement :** pays de référence du fournisseur, modifiable ; ce n’est pas une localisation mesurée de la requête.
- **Pays utilisateur :** pays détecté puis corrigeable, utilisé pour la référence de douche.
- **PUE :** coefficient transformant l’énergie informatique en énergie datacenter.
- **WUE :** consommation d’eau sur site par kWh, selon la convention de la source.
- **Facteur d’émission :** quantité de gCO₂e par kWh d’électricité.

## 5. Exigences fonctionnelles

### 5.1 Accès, chatbot et modèle

#### FR-7 — Utiliser le calculateur sans compte

La personne accède au calculateur depuis une page de `felixmortas.com` et peut réaliser le parcours de saisie et consulter les résultats sans inscription ni connexion.

#### FR-1 — Proposer un modèle de référence modifiable pour les chatbots ne permettant pas de choisir son modèle

Le calculateur distingue l’utilisation de certains chatbot sans et avec abonnement payant, ou dans un mode rapide ou de réflexion. Il propose un modèle de référence pour toute la conversation, explicitement présenté comme une convention modifiable :

La personne peut remplacer directement ce modèle par tout autre modèle valide du catalogue. Le calculateur ne prétend pas connaître le modèle réellement utilisé. Les correspondances sont des conventions d’estimation choisies par Felix.

#### FR-2 — Choisir le modèle pour tout fournisseur

Pour tout fournisseur, la personne peut choisir directement un modèle valide de son catalogue. Le fournisseur et le modèle sont définis pour toute la conversation, sans choix distinct par bloc. Pour les chatbot ne permettant pas de choisir son modèle, la personne se voit proposée un modèle pour chaque mode ou type d'abonnement ; ces références sont modifiables. Les correspondances de modes et abonnement sont maintenues dans une table locale unique, facile à modifier.

Le catalogue `models_params` détermine les chatbots et modèles proposés. Les modèles absents ne sont pas proposés à la sélection. Ce catalogue fournit également le nombre de tokens du prompt système pour chaque modèle. Un changement de chatbot, de mode ou de modèle signale les résultats devenus périmés sans déclencher de calcul.

#### FR-16 — Guider en trois étapes et garder le chatbot, le modèle et la conversation visibles

Le parcours indique sa progression en trois étapes (Votre IA, Votre conversation, Résultat) et justifie chaque question posée avant le résultat, notamment le choix de l’IA. La troisième étape est une section affichée sous la conversation, sans nouvel écran. Après le choix, l’en-tête du fil présente le chatbot et le modèle sélectionné, consultables et modifiables par une action libellée sans ouvrir le Mode expert. Le modèle de référence est déduit et affiché avec une action discrète pour modifier. Le chatbot et le modèle s’appliquent à toutes les questions / réponses. Les anciennes questions / réponses sont des cartes chronologiques compactes et dépliables ; l’éditeur courant reste ouvert. Un retour à l’étape précédente, par un bouton libellé placé en haut à gauche de l’écran, conserve les textes. Les paramètres compréhensibles sont dans le Mode avancé et les paramètres techniques dans le Mode expert.

### 5.2 Saisie et comptage

#### FR-14 — Ajouter, modifier et supprimer les blocs de conversation

Camille peut librement ajouter un bloc, modifier les textes d’un bloc existant et supprimer un bloc, y compris après avoir effectué des calculs.

**Conséquences vérifiables :**

- Un nouveau bloc peut recevoir un message, une réponse finale, un raisonnement visible et un artifact éventuel.
- Une modification rend périmés les résultats qui dépendent des données modifiées, selon FR-12.
- La suppression retire le bloc et son résultat de la conversation ; son impact ne doit plus contribuer au total.
- Les résultats des blocs suivants sont invalidés lorsqu’ils dépendent de l’historique ou des versions d’artifacts changés par l’ajout, la modification ou la suppression.
- Toute modification des blocs renseignés de la conversation invalide le total précédent ; ajouter ou supprimer un bloc entièrement vide est sans effet sur les résultats. Aucun calcul d’impact ni recalcul du total n’est déclenché automatiquement.

La réorganisation des blocs par déplacement n’a pas été demandée et reste hors des exigences confirmées à ce stade.

#### FR-21 — Ignorer les blocs entièrement vides

Un bloc dont tous les champs de texte sont vides ne représente aucun échange à calculer. Il est exclu du calcul global et du total, sans demander à Camille de le remplir ou de le supprimer.

**Conséquences vérifiables :**

- Le message, la réponse, le raisonnement et l’artifact doivent tous être vides pour que le bloc soit ignoré.
- Un bloc ignoré n’ajoute ni tokens, ni contribution de prompt système, ni impact environnemental.
- Il n’altère pas l’historique des échanges renseignés ni la dernière version d’artifact disponible.
- Dès qu’un texte est fourni dans ce bloc, il relève à nouveau des règles de calcul et de mise à jour des résultats.

Les champs composés seulement d’espaces sont traités comme vides. Si aucun bloc n’est renseigné, le calculateur invite à saisir un échange et ne présente pas un résultat environnemental comme calculé.

#### FR-3 — Compter uniquement le texte fourni

Le calculateur comptabilise les textes fournis pour la conversation, auxquels s’ajoute le nombre de tokens du prompt système fourni par modèle dans le catalogue (FR-20). Il n’estime ni ne reconstitue de raisonnement non visible.

**Conséquences vérifiables :**

- Un champ de raisonnement vide contribue pour zéro token aux tokens de sortie.
- Un texte de raisonnement fourni est comptabilisé selon la conversion locale (FR-8).
- Aucun volume forfaitaire de tokens de raisonnement n’est ajouté pour compenser un contenu absent.

Cette règle définit le périmètre du calcul ; elle n’affirme pas que le chatbot n’a effectué aucun raisonnement lorsque ce champ est vide. La règle spécifique de différence entre versions d’un artifact reste applicable.

#### FR-8 — Estimer les tokens à partir de tiktoken par défaut et du nombre de mots en fallback

Le calculateur calcule les tokens des textes comptabilisés en utilisant le tokenizer Tiktoken d'OpenAI par défaut. En fallback il estime les tokens des textes en divisant leur nombre de mots par un coefficient modifiable dans le Mode expert (FR-17). Cette convention, choisie par Felix, s’applique indépendamment du modèle sélectionné, sans tokenizer propre au modèle. Ce calcul ou comptage est effectué exclusivement dans le navigateur, sans clé API ni envoi de données à OpenAI.

**Conséquences vérifiables :**

- Un texte est converti en tokens via Tiktoken par défaut.
- Si échec de Tiktoken, un fallback est utilisé avec une règle qu'un texte compté à x mots correspond à une estimation de y tokens.
- Un texte vide contribue pour zéro token.
- Pour les versions successives d’un artifact, seuls les passages retenus par FR-4 sont comptés en sortie.

#### FR-4 — Détecter automatiquement les changements d’un artifact

Camille peut coller la version complète d’un artifact à chaque échange. Le calculateur la compare automatiquement à sa version précédente et comptabilise en sortie uniquement le texte ajouté ou modifié de la nouvelle version.

**Conséquences vérifiables :**

- Camille n’a pas à préparer elle-même la différence entre les versions.
- Les passages inchangés ne sont pas comptabilisés à nouveau en sortie.
- Deux versions identiques n’ajoutent aucun token de sortie au titre de l’artifact.
- Les passages supprimés ne produisent pas de tokens de sortie ; les passages de remplacement sont comptés dans leur nouvelle version.

La granularité de comparaison sera spécifiée par le responsable technique avant développement (D-1). Cette règle concerne les tokens de sortie ; pour l’historique d’entrée, seule la dernière version complète disponible avant l’échange est retenue, selon FR-19.

Le premier artifact est compté intégralement en sortie. Un champ artifact vide signifie qu’aucune nouvelle version n’est fournie ; il ne supprime pas la dernière version disponible. Le parcours de lancement prévoit un artifact suivi au fil de ses versions.

#### FR-19 — Reconstituer automatiquement l’historique en cache

Pour calculer un bloc, le calculateur reprend automatiquement les échanges précédents de la conversation comme historique. Tous les tokens de cet historique sont comptabilisés au taux des tokens en cache.

**Conséquences vérifiables :**

- Camille n’a pas à recopier l’historique dans chaque nouveau bloc.
- Les messages, réponses finales et raisonnements fournis des blocs précédents contribuent à l’historique du bloc calculé.
- Les textes du bloc courant restent comptés dans leurs catégories d’entrée nouvelle et de sortie ; ils ne sont pas ajoutés à son propre historique.
- Pour l’artifact, l’historique inclut une seule fois la dernière version complète disponible avant le bloc courant. Les versions antérieures et leurs différences successives ne sont pas cumulées dans cet historique.
- Une nouvelle version produite dans le bloc courant intervient en sortie selon FR-4 ; elle devient la version complète de référence pour l’historique des échanges suivants.
- L’historique est établi à partir des textes précédents, sans dépendre de résultats d’impact antérieurs.
- Le nombre de tokens du prompt système fourni par le catalogue pour le modèle sélectionné est ajouté une seule fois à l’historique de chaque bloc, y compris le premier. Il est compté au taux du cache et n’est pas reconverti depuis des mots.

#### FR-20 — Intégrer automatiquement le prompt système du modèle

Le calculateur utilise le nombre de tokens du prompt système associé au modèle dans le catalogue fourni. Camille n’a pas à connaître l’existence de ce prompt ni à fournir son contenu ou son volume pour utiliser le calculateur.

Cette donnée constitue une exception explicite à la règle du seul texte fourni (FR-3). Elle ne conduit pas à estimer du raisonnement non visible. Sa contribution au calcul suit FR-19.

**Conséquences vérifiables :**

- Le nombre de tokens du prompt système est fixé exclusivement par le catalogue pour le modèle sélectionné.
- Aucun champ, contrôle ou détail de résultat ne révèle cette donnée dans l’interface, y compris dans le Mode expert.
- La restauration des paramètres ne modifie pas cette donnée du catalogue.

### 5.3 Calculs et validité des résultats

#### FR-24 — Calculer l’énergie, le carbone et l’eau

Pour chaque bloc renseigné, le calculateur distingue tokens d’entrée nouvelle, d’historique en cache et de sortie, puis applique les formules de la spécification source reprises dans l’addendum.

**Conséquences vérifiables :**

- Le taux énergétique de sortie dépend des paramètres totaux et activés du modèle selon les formules Ecologits adaptées ; aucun second multiplicateur de taille du modèle n’est ajouté.
- Les taux d’entrée et de cache proviennent des ratios tarifaires par modèle et fournisseur, avec date de calibration, calculés à partir des tarifs fournis dans `models_params`.
- Le PUE du pays/fournisseur est appliqué exactement une fois à l’énergie informatique ; le PUE générique Ecologits n’est pas ajouté.
- Le carbone et l’eau sont dérivés de cette même énergie datacenter. Les unités restent cohérentes : Wh, gCO₂e et litres ; les conversions d’affichage ne modifient pas les valeurs de calcul.
- L’eau représente uniquement l’eau consommée sur site, hors eau liée à la production électrique.
- Le total additionne les valeurs non arrondies des blocs valides ; les arrondis relèvent uniquement de l’affichage.
- Une mention visible précise que les résultats couvrent l’usage, hors fabrication et amortissement des équipements (Scope 3).

Les formules, constantes initiales, hypothèses et sources sont réunies dans [addendum.md](addendum.md). Les décisions du présent PRD priment sur la source initiale en cas de différence explicite.

#### FR-12 — Calculer tous les blocs et leur total avec un seul bouton

Camille dispose d’un seul bouton principal « Calculer », toujours visible. Il n’existe ni calcul individuel d’un bloc, ni recalcul du seul total : chaque action calcule les impacts de tous les blocs renseignés puis affiche tout ensemble — résultats individuels dans l’en-tête des cartes, total et résultat sous la conversation, sur la même page. Les blocs entièrement vides sont ignorés.

**Conséquences vérifiables :**

- Une modification de texte ou de paramètre ne lance jamais de calcul.
- Une modification qui rend périmé un résultat le retire ou le marque « à recalculer » jusqu’au prochain « Calculer » ; aucun résultat ancien, partiel ou incomplet n’est présenté comme actuel.
- Le calcul ne dépend d’aucun résultat antérieur : le même clic traite tous les blocs renseignés.
- Le partage (FR-26) n’est proposé que lorsque le résultat est valide et à jour.
- Si aucun bloc n’est renseigné ou si un paramètre est invalide, « Calculer » est indisponible avec une explication.

### 5.4 Réglages et données géographiques

#### FR-15 — Modifier le pays d’hébergement dans le Mode expert

Le calculateur utilise un pays d’hébergement de référence défini pour chaque fournisseur. Camille peut le modifier dans le « Mode expert », replié dans le Mode avancé, sous le libellé lié à l'hébergement de l'IA ; la valeur par défaut est présentée comme une hypothèse. Le parcours courant ne nécessite pas d’ouvrir cette section.

**Conséquences vérifiables :**

- Sans intervention de Camille, le pays de référence du fournisseur est utilisé.
- Le pays choisi dans le Mode expert sert à sélectionner les facteurs environnementaux applicables au modèle : PUE, intensité carbone et WUE.
- Ce pays est distinct du pays de l’utilisateur : modifier l’un ne modifie pas l’autre.
- Une modification du pays d’hébergement invalide les résultats des blocs concernés et le total ; Camille doit relancer les calculs selon FR-12.

Le fournisseur et le modèle étant communs à toute la conversation, ce réglage s’applique à tous ses blocs.

**Dépendances de données :** pays de référence et facteurs disponibles par fournisseur. Un facteur manquant pour le pays choisi utilise la référence « Monde » (FR-23). Le détail de présentation de la section relève de la conception UX.

#### FR-17 — Permettre la modification de tous les paramètres mathématiques

Les paramètres sont répartis en deux niveaux imbriqués, tous deux repliés par défaut sur la première étape. Le « Mode avancé », dépliable sous le choix du modèle, contient les paramètres compréhensibles par tous : où se trouve la personne (pour la comparaison douche), puissance de la comparaison (ampoule LED), débit de la douche, température de l’eau froide du réseau et température de l’eau pendant la douche. Le « Mode expert », dépliable à l’intérieur du Mode avancé, contient tous les autres paramètres modifiables, dans cet ordre : pays d’hébergement du modèle, intensité carbone du pays d’hébergement, paramètres totaux, paramètres activés à l’inférence, PUE, WUE, puis tout le reste. Le nombre de tokens du prompt système n’est pas modifiable et reste entièrement masqué, fixé par le catalogue (FR-20). Des valeurs par défaut permettent à Camille de suivre le parcours principal sans ouvrir le Mode avancé.

**Conséquences vérifiables :**

- Les paramètres s’appliquent à toute la conversation et ne sont pas configurés séparément pour chaque bloc.
- Il n’existe pas de bouton spécifique pour appliquer les paramètres : les valeurs valides sont appliquées automatiquement lorsque Camille continue ou calcule.
- Toute modification invalide les résultats qui en dépendent, sans lancer automatiquement de calcul.
- Un changement limité à la référence de douche invalide l’équivalence du bilan sans invalider les impacts énergie, eau et carbone des blocs.
- Les noms, unités et valeurs des paramètres modifiables sont disponibles dans le Mode avancé et le Mode expert. Le nombre de tokens du prompt système n’y apparaît pas.

Les contrôles minimaux sont définis dans NFR-6 ; les bornes supplémentaires seront arrêtées avant développement (D-1). Les formules restent celles du modèle retenu.

#### FR-18 — Rétablir les paramètres par défaut

Camille dispose d’un lien discret pour rétablir les valeurs par défaut dans le Mode avancé, y compris son Mode expert. Cette action annule les modifications de ces paramètres et rétablit les valeurs de référence applicables au chatbot et au modèle sélectionnés.

**Conséquences vérifiables :**

- Les textes et les blocs de conversation sont conservés.
- Le chatbot et le modèle sélectionnés restent inchangés.
- Les résultats dépendant de paramètres effectivement modifiés par la restauration sont invalidés selon FR-12 et FR-17.
- Aucun calcul n’est lancé automatiquement ; Camille utilise « Calculer ».

#### FR-23 — Utiliser la référence « Monde » en cas de facteur manquant

Si un facteur environnemental est absent pour le pays retenu, le calculateur utilise sa valeur de référence « Monde ». Ce cas est considéré comme exceptionnel par Felix.

**Conséquences vérifiables :**

- Le repli concerne le facteur manquant ; il ne remplace pas les autres données disponibles pour le pays choisi.
- L’utilisation de « Monde » est signalée avec le résultat concerné, sans modifier silencieusement le pays choisi par Camille.
- La même règle s’applique au facteur d’émission de la comparaison avec la douche s’il manque pour le pays utilisateur.
- La valeur « Monde » provient des données de référence ; elle n’est ni inventée ni remplacée par zéro.

**Dépendance :** les données de référence doivent fournir les valeurs « Monde » nécessaires. Si la valeur de repli elle-même manque, aucun résultat numérique dépendant de cette valeur ne peut être présenté comme calculé.

### 5.5 Résultats et pédagogie

#### FR-22 — Afficher une estimation unique et signaler son incertitude

Chaque résultat numérique est présenté sous la forme d’une valeur estimée unique, sans fourchette ni marge d’erreur chiffrée. Une mention visible avec les résultats explique que les valeurs sont incertaines et reposent sur des hypothèses de calcul, et non sur une mesure de la requête réelle.

**Conséquences vérifiables :**

- Chaque échange affiche le carbone et l’eau estimés près de ses textes. Le résultat valide présente l’équivalence douche, le bilan carbone, eau et électricité, la comparaison avec une utilisation du quotidien, une phrase d’interprétation et une bonne pratique. Les valeurs techniques sont en second plan.
- Le périmètre est formulé sans jargon : « Ne compte que l’électricité des serveurs, pas la fabrication du matériel ni l’entraînement de l’IA », avec le détail (Scope 2, Scope 3) dans un « En savoir plus ».
- L’état « à recalculer » d’un résultat périmé est textuel et visuel ; un résultat à jour porte un indicateur « ✓ » accompagné d’un texte accessible.
- L’équivalence carbone en durée de douche, affichée uniquement dans le résultat, reste présentée comme une estimation.
- L’information sur l’incertitude est accessible dans le parcours courant, sans ouvrir le Mode expert.
- Aucun intervalle de confiance ni précision garantie n’est ajouté sans méthode définie.
- Les valeurs internes d’énergie, d’eau et de carbone restent non arrondies par échange et pour le total. Seul l’affichage adapte l’unité et utilise au plus trois chiffres significatifs, une virgule décimale française et le groupement des milliers selon `EXPERIENCE.md` : carbone de µgCO₂e à tCO₂e, eau de µL à ML, électricité de mWh à GWh et durée de douche de ms à j. Zéro, valeur sous la plus petite unité, changement d’unité après arrondi et dépassement de l’unité maximale sont traités explicitement ; les unités abrégées ont un nom accessible complet.

#### FR-5 — Comparer le carbone à une durée de douche chaude locale

Camille consulte une équivalence des émissions carbone estimées en durée de douche chaude. Le calculateur déduit automatiquement le pays où elle se trouve pour sélectionner le facteur d’émission de cette comparaison. Camille peut corriger manuellement ce pays.

**Conséquences vérifiables :**

- L’équivalence en durée de douche chaude porte uniquement sur le carbone, et non sur l’énergie ou le volume d’eau. La comparaison à un usage du quotidien de FR-25 porte, elle, sur l’électricité.
- Le volume d’eau estimé reste affiché sans équivalence comparative.
- Le pays de l’utilisateur et le pays d’hébergement retenu pour le modèle sont deux informations distinctes, pouvant avoir la même valeur géographique.
- Le facteur d’émission de la douche est sélectionné selon le pays de l’utilisateur ; celui du modèle reste sélectionné selon le pays d’hébergement retenu.
- Le pays détecté est consultable et modifiable ; une correction manuelle prend le pas sur la valeur détectée pour la comparaison.
- À conversation et paramètres du modèle inchangés, changer le pays de l’utilisateur modifie uniquement la référence de comparaison, pas l’empreinte estimée de la conversation.

**Référence par défaut confirmée :** douche chauffée à l’électricité, débit de 15 L/min, eau chauffée de 18 à 38 °C avec une consommation de 0,0232 kWh/L. La consommation de référence est donc de 0,348 kWh/min. Ses émissions par minute sont calculées avec le facteur d’émission du pays de l’utilisateur. Ces paramètres sont modifiables dans le Mode avancé (FR-17). Les formules et unités sont conservées dans [addendum.md](addendum.md#référence-de-douche-chaude).

Le pays de l’utilisateur est corrigeable dans le Mode avancé de la première étape (FR-17). Une modification ne recalcule pas automatiquement les résultats. Les facteurs manquants utilisent « Monde » (FR-23). Si la détection échoue, la correction manuelle reste disponible ; aucune localisation certaine n’est affirmée.

#### FR-6 — Présenter des bonnes pratiques après les résultats

Dans le résultat, Camille voit une bonne pratique, tirée localement parmi la liste, et garde l’accès à toutes les autres par un bouton menant à une autre page. La liste est identique pour tous les utilisateurs, sans personnalisation.

**Conséquences vérifiables :**

- Une bonne pratique est visible dans le résultat ; les cinq thèmes sont accessibles à la personne après consultation de ses résultats.
- Le tirage aléatoire est injectable dans les tests pour rester vérifiable.
- Le vocabulaire des conseils doit être compréhensible par une personne non technique, notamment pour expliquer les tokens en entrée et en sortie.
- L’absence de texte de raisonnement dans le calculateur ne doit pas être présentée comme une désactivation du raisonnement dans le chatbot : ce sont deux actions distinctes.

Les conseils seront contextualisés sans être personnalisés : conserver le contexte nécessaire, préciser les réglages effectivement disponibles et ne pas promettre une économie systématique par l’édition d’un message. Aucun gain chiffré n’est promis.

### 5.6 Lisibilité et partage

#### FR-25 — Rendre le résultat lisible par une comparaison du quotidien

Le résultat présente l’électricité estimée sous forme d’une durée d’ampoule LED de 5W allumée, et une phrase d’interprétation qui montre que l’effet s’additionne, par exemple « Une conversation pèse peu, mais ça s'additionne : 100 conversations comme celle-ci ont un impact plus conséquent. » (formulation de référence : `EXPERIENCE.md`).

**Conséquences vérifiables :**

- La puissance de l’ampoule LED de référence est de 5W et constitue un paramètre documenté, modifiable dans le Mode avancé, avec une valeur par défaut à valider (D-4). Une puissance nulle rend la durée non calculable ; aucune division par zéro n’est affichée.
- L’équivalence LED est calculée à partir de l’électricité non arrondie ; seul l’affichage arrondit et adapte l’unité (FR-22).
- La phrase d’interprétation est neutre : elle ne qualifie pas automatiquement la valeur de « faible » ou « élevée », ne promet aucun gain et ne présente pas l’estimation comme une mesure. Le multiplicateur « 100 conversations » est une convention d’illustration affichée comme telle.
- Aucune comparaison n’est proposée pour l’eau (FR-5).

#### FR-26 — Partager le résultat sans transmettre la conversation

Le résultat propose un seul bouton « Partager » qui ouvre le partage du système lorsqu’il est disponible, avec un texte prérempli : chatbot utilisé, nombre d'échanges de la conversation, équivalence douche, valeurs principales avec unités, mention d’estimation et adresse de la page. Si le partage du système n’est pas disponible, le bouton copie ce texte dans le presse-papiers.

**Conséquences vérifiables :**

- Le texte partagé ne contient aucun message, réponse, raisonnement, contenu de fichier, nom de fichier ni paramètre de session ; le chatbot et le nombre d’échanges sont les seules informations sur la conversation.
- L’adresse partagée est celle de la page, sans contenu de conversation ni résultat encodé. Le texte transite seulement par le moyen choisi par la personne, sur son action explicite ; la page n’ajoute ni analytics ni appel réseau (NFR-3).
- Un retour textuel confirme la copie ou signale l’échec avec une action de suite ; il ne dépend pas seulement de la couleur.
- Le partage n’est proposé que lorsqu’un résultat valide et à jour est affiché.

## 6. Exigences de qualité

### NFR-1 — Utilisation sur ordinateur et mobile

La page permet la saisie des échanges, la consultation des résultats et des bonnes pratiques, ainsi que la correction du pays de l’utilisateur depuis un ordinateur ou un mobile. L’accueil propose une phrase d’introduction et un seul bouton pour commencer à saisir les messages de sa conversation. Chaque étape a une seule action principale, toujours visible, devenue statique à fort zoom (NFR-7). Le fil et le bilan suivent [DESIGN.md](../../ux-designs/ux-ai-env-impact-calculator-2026-09-23/DESIGN.md) et [EXPERIENCE.md](../../ux-designs/ux-ai-env-impact-calculator-2026-09-23/EXPERIENCE.md) du 23 septembre 2026 ; ces documents priment sur les quatre maquettes statiques en cas d’écart.

### NFR-2 — Compatibilité avec GitHub Pages

La page livrée doit être hébergeable sur GitHub Pages et s’intégrer au site existant `felixmortas.com`. Le choix du langage et des outils de développement est libre, sous réserve de respecter cette contrainte. Le contexte technique fourni par Felix est conservé dans [addendum.md](addendum.md#intégration-au-site-existant).

La page reste hébergeable statiquement. La tokenisation et les calculs de conversation sont effectués localement ; aucun endpoint d’import distant n’est utilisé.

### NFR-3 — Garder les conversations dans le navigateur

Par défaut, les messages, réponses, raisonnements, artifacts, fichiers locaux, calculs, tokenisation et comparaisons restent dans le navigateur, en mémoire de session, sans analytics ni journal distant. Le comptage, le calcul des impacts et la comparaison des versions d’artifacts sont réalisés localement.


### NFR-4 — Ne pas conserver la session après fermeture

Le calculateur ne conserve pas durablement les textes, résultats ou choix de la session. À la fermeture de la page, la session est perdue ; une nouvelle ouverture commence sans conversation.

### NFR-5 — Livrer en français et faciliter l’internationalisation

L’interface, les messages de validation, les explications et les bonnes pratiques sont proposés en français au lancement. La conception permet d’ajouter d’autres langues sans réécrire les règles de calcul.

**Conséquences vérifiables :**

- Les textes destinés aux utilisateurs peuvent être traduits indépendamment des calculs.
- La présentation des nombres, unités et durées peut être adaptée à la langue retenue.
- Les calculs et les données numériques de référence restent indépendants de la langue d’affichage.
- Aucune traduction supplémentaire ni sélection de langue n’est exigée pour la première version.

### NFR-6 — Refuser les paramètres invalides et préserver la cohérence

Les champs avancés indiquent leurs unités et les erreurs empêchant le calcul. Des valeurs non numériques, infinies ou hors domaine ne doivent pas produire un résultat présenté comme valide.

### NFR-7 — Rendre le parcours utilisable au clavier et sur petit écran

Ces critères appliquent les décisions UX approuvées le 23 septembre 2026.

Les champs possèdent des libellés explicites, les actions sont accessibles au clavier, le focus est visible et les erreurs sont associées aux champs concernés. Les états périmés, les erreurs et les facteurs de repli portent un texte et ne dépendent pas seulement de la couleur. Le parcours reste utilisable à 320 px, aux zooms 200 % et 400 %, avec des cibles d’au moins 44 × 44 px et sans commande réservée au survol. Après ajout d’un échange, le focus va à la nouvelle question. Les annonces de péremption restent concises.

Ces critères concrétisent l’usage grand public sur ordinateur et mobile ; ils ne constituent pas une déclaration de certification d’accessibilité.


### NFR-8 — Employer un langage et des libellés grand public

Aucun jargon d’apprentissage automatique ou de comptabilité carbone ne figure dans le parcours principal. Les libellés suivent `EXPERIENCE.md`. Toute action porte un libellé visible, y compris avec une icône. Un état initial normal, comme un bloc vide, ne s’affiche pas comme un avertissement. Les champs vides montrent un exemple de ce qu’il faut coller.

## 7. Réussite et validation du lancement

**SM-1 — Signal retenu par Felix :** recevoir des retours positifs par email ou sur LinkedIn. Felix apprécie directement ces retours ; aucun volume, échéance ni collecte automatisée n’est imposé. Ce signal concerne l’expérience globale, la compréhension des résultats et les conseils ; il ne prouve pas la justesse scientifique ni une baisse réelle des impacts.

Avant publication, vérifier des scénarios représentatifs : l’accueil et « Commencer » ; l’indicateur d’étapes ; le Mode avancé et le Mode expert imbriqué ; la comparaison douche et usage du quotidien, la phrase d’interprétation, le tirage d’une bonne pratique et le partage système sans contenu de conversation ; choix de modèle ChatGPT et des modes Mistral ; premier échange ; ajout d’un deuxième échange avec artifact modifié ; suppression d’un bloc intermédiaire ; bloc vide ; résultat périmé retiré jusqu’au prochain « Calculer » ; changement de modèle ou pays ; restauration des paramètres ; repli « Monde » ; fermeture et nouvelle ouverture. Vérifier également les unités et seuils sur des valeurs représentatives, le clavier, 320 px et les zooms 200 % et 400 %. Les formules sont vérifiées sur des jeux chiffrés avec unités explicites et invariants : PUE appliqué une fois, séparation des deux pays et absence de double comptage des versions d’artifact.

## 8. Dépendances et points à préciser

Le cadrage produit est établi. Les points ci-dessous relèvent de la conception ou de la fourniture des données ; ils ne nécessitent pas de nouveau choix produit pour commencer l’UX ou l’architecture. Une dépendance non satisfaite reste bloquante pour la fonction concernée avant mise en production.

| ID | Livrable ou décision restante | Responsable | À résoudre avant |
|---|---|---|---|
| D-1 | Conserver segmentation des mots, granularité du diff et bornes avancées ; spécifier le lien entre températures modifiables et énergie par litre de douche ; valider sur des données représentatives les seuils, extrêmes et changements d’unité après arrondi du contrat d’affichage `EXPERIENCE.md`, sans modifier les valeurs internes ni les formules. | Responsable technique | Livraison de l’affichage de l’epic 6 |
| D-2 | Déterminer la déduction du pays à partir de la langue du navigateur, compatible avec une page statique et la confidentialité des textes ; table langue-région vers pays, valeur de repli et correction manuelle, sans serveur ni géolocalisation. | Responsable architecture | Développement de la localisation |
| D-3 | Rédiger et valider les textes français (dont l’accueil en une phrase, et le texte de périmètre sans jargon), les limites des conseils, les messages d’incertitude et l’état « non calculable » ; appliquer les spines `DESIGN.md` et `EXPERIENCE.md` et vérifier l’affichage adapté des unités sur des exemples réels. | Responsable UX ; Felix pour la validation éditoriale | Publication |
| D-4 | Valider le multiplicateur d’illustration « 100 conversations », la formule de la phrase d’interprétation et le texte de partage. | Responsable technique ; Felix pour la validation éditoriale | Livraison du résultat de l’epic 7 |

Les intitulés « responsable technique », « responsable architecture » et « responsable UX » désignent des rôles à attribuer à Felix.
