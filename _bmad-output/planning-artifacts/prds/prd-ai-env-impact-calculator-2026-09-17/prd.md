---
title: Calculateur d’empreinte environnementale des LLM
status: final
created: 2026-09-17
updated: 2026-09-18
---

# PRD — Calculateur d’empreinte environnementale des LLM

## 1. Objet et vision

Une page de `felixmortas.com` permet au grand public de comprendre l’empreinte environnementale estimée d’un échange ou d’une conversation avec un chatbot IA. Une personne non technique colle ses textes, déclenche les calculs, consulte l’énergie, l’eau et le carbone estimés ainsi que le risque de sécheresse associé au pays d’hébergement retenu. Une équivalence carbone en durée de douche chaude l’aide à interpréter le résultat ; une liste commune de bonnes pratiques lui donne des gestes à retenir.

Le produit vise un lancement public, en français, sans compte, sur ordinateur et mobile. Le parcours courant garde le chatbot, le modèle et la conversation visibles ; les réglages mathématiques restent dans une section avancée discrète. Les conversations et les calculs restent dans le navigateur ; la session n’est pas sauvegardée après fermeture.

Ce PRD est destiné à Felix et aux responsables UX, architecture et développement. Il définit les capacités et comportements attendus. L’[addendum](addendum.md) rassemble les formules, constantes et contraintes techniques. La source initiale est `spec-formules-calculateur-empreinte-llm.md` à la racine ; les décisions recueillies auprès de Felix priment sur ses dispositions explicitement modifiées. Les identifiants d’exigences sont stables ; FR-9 a été retirée et n’est pas réutilisée.

## 2. Public et parcours

Le produit s’adresse à des personnes non techniques qui souhaitent connaître l’impact de leurs échanges avec un chatbot et retenir des pratiques simples. Camille représente ce besoin dans les deux parcours racontés et confirmés par Felix. Aucun autre rôle ni compte utilisateur n’est requis.

### UJ-1 — Camille évalue sa conversation au fil des échanges

**Contexte et entrée.** Camille, une personne non technique, souhaite connaître l’impact environnemental de sa conversation avec ChatGPT. Elle ouvre la page du calculateur sur `felixmortas.com` depuis son PC, sans créer de compte ni se connecter. Le produit est également utilisable sur mobile.

Camille ne dispose pas d’un abonnement payant : le calculateur retient `gpt-5.6-luna` pour tous ses échanges, selon la règle du projet fournie par Felix et décrite ci-dessous.

**Déroulement.**

1. Elle colle son premier message dans un champ dédié, puis la réponse finale dans un autre champ.
2. Elle colle le contenu de l’artifact, s’il y en a un, et le texte de toutes les étapes de raisonnement si elles sont visibles, dans les champs associés.
3. Elle déclenche le calcul du bloc et découvre les estimations de consommation électrique, de consommation d’eau et d’émissions carbone de ce premier échange, accompagnées d’un indicateur du risque de sécheresse associé au pays d’hébergement retenu pour le calcul. Celui-ci est prérempli avec le pays de référence du fournisseur ; Camille peut le modifier dans les paramètres avancés.
4. Après un deuxième échange dans la même conversation ChatGPT, elle ajoute un bloc dans le calculateur et y colle son nouveau message, la réponse, le raisonnement visible et l’artifact éventuel.
5. Elle colle la nouvelle version complète de l’artifact. Le calculateur détecte automatiquement les passages ajoutés ou modifiés par rapport à la version précédente et ne comptabilise que ceux-ci en tokens de sortie.
6. Elle peut lancer le calcul d’un bloc individuellement ou calculer tous les blocs et leur total en un clic. Elle peut aussi recalculer uniquement le total à partir des résultats déjà disponibles, sans relancer le calcul des blocs.

**Résultat.** Camille voit l’impact de chaque échange et le cumul de la conversation. Elle peut comparer les émissions carbone estimées à une durée de douche chaude. Cette équivalence utilise le facteur d’émission du pays où elle se trouve, déterminé séparément de celui retenu pour le modèle. La quantité d’eau ne fait pas l’objet d’une comparaison.

**Suite attendue.** Après consultation des résultats, Camille découvre une liste de bonnes pratiques simples et en retient les gestes à appliquer lors de ses prochaines utilisations (FR-6).

### UJ-2 — Camille évalue une conversation passée à partir de son lien

**Statut : conditionnel, soumis à une étude de faisabilité préalable.** L’accès programmatique au contenu d’une conversation partagée doit être vérifié avant d’engager cette fonctionnalité. Si cet accès n’est pas possible, l’import par lien ne sera pas proposé. Le parcours ci-dessous décrit le comportement souhaité en cas de faisabilité établie.

**Contexte et entrée.** Plus tard, Camille souhaite évaluer une conversation récente avec ChatGPT.

**Déroulement.** Elle copie l’URL de partage depuis ChatGPT et la colle dans le calculateur. Celui-ci remplit automatiquement les blocs et champs de la conversation.

**Résultat.** Camille consulte l’impact de chaque échange et celui de la conversation complète.

**Étude préalable :** accès programmatique, complétude des textes, abonnement utilisé et erreurs d’import seront examinés avant décision d’inclusion (D-4).

## 3. Périmètre du lancement

**Inclus :** saisie manuelle de blocs, ajout/modification/suppression, calcul individuel et global à la demande, total indépendant, historique et versions d’artifact, estimations et conseils, paramètres avancés réinitialisables, interface française compatible mobile et internationalisable.

**Catalogue :** les chatbots et modèles disponibles sont ceux du fichier fourni, nommé `model_params` puis `models_param` dans les échanges. Le nom exact sera aligné lors de l’intégration. Son contenu n’est pas un préalable à la finalisation du PRD.

**Conditionnel :** l’import par URL de partage (UJ-2) fera l’objet d’une étude de faisabilité. Il n’est pas promis au lancement. Si le contenu n’est pas accessible programmatiquement dans les contraintes retenues, cette fonction ne sera pas proposée.

**Exclusions :** compte, sauvegarde de conversation, tokenisation distante ou clé API, serveur complémentaire, estimation de raisonnement invisible, fourchettes d’incertitude, conseils personnalisés, comparaison de l’eau, calcul du Scope 3 ou de l’eau liée à l’électricité. Le traitement natif des images, fichiers audio et vidéos n’est pas défini : le parcours porte sur du texte collé. Le déplacement des blocs et le suivi de plusieurs artifacts distincts dans un même échange ne font pas partie des exigences de lancement.

## 4. Vocabulaire

- **Chatbot / fournisseur :** service utilisé par Camille et fournisseur auquel les données de référence sont rattachées.
- **Modèle :** modèle de référence choisi pour toute la conversation et issu du catalogue.
- **Bloc / échange :** un message, une réponse finale, un raisonnement visible éventuel et une version d’artifact éventuelle.
- **Artifact :** contenu produit suivi dans un champ distinct au fil de ses versions.
- **Token estimé :** unité approximée localement par le nombre de mots divisé par 0,7 par défaut.
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

#### FR-1 — Déterminer le modèle de référence pour ChatGPT

Le calculateur distingue l’utilisation de ChatGPT sans abonnement payant et avec abonnement payant. Il applique à tous les échanges de la conversation le modèle de référence suivant :

- Sans abonnement payant : `gpt-5.6-luna`.
- Avec abonnement payant : `gpt-5.6-terra`, retenu par Felix comme compromis entre Luna et Sol.

La correspondance sans abonnement → `gpt-5.6-luna` est une règle du projet fondée sur l’affirmation explicite de Felix. La correspondance avec abonnement → `gpt-5.6-terra` est une convention d’estimation choisie par Felix comme compromis entre Luna et Sol.

#### FR-2 — Choisir le modèle pour les autres fournisseurs

Pour les autres fournisseurs, notamment Claude et Gemini lorsqu’ils figurent dans le catalogue, la personne peut choisir le modèle indiqué dans le chatbot. Le fournisseur et le modèle sont définis pour toute la conversation, sans choix distinct par bloc.

Le catalogue `model_params`, qui sera fourni, détermine les chatbots et modèles proposés. Les choix de l’interface doivent correspondre à ce catalogue ; le PRD n’en impose pas une liste séparée. Les modèles absents ne sont pas proposés à la sélection. La fourniture et l’intégration du catalogue constituent une dépendance de réalisation, pas un préalable à la rédaction du PRD.

Ce catalogue, également nommé `models_param` par Felix, fournira le nombre de tokens du prompt système pour chaque modèle. Le nom exact du fichier sera aligné lors de sa fourniture ; ces deux appellations désignent ici la même dépendance.

#### FR-16 — Garder le chatbot, le modèle et la conversation visibles

L’interface principale présente systématiquement le nom du chatbot, le modèle sélectionné et la conversation de Camille, sans exiger l’ouverture des paramètres avancés. Le chatbot et le modèle s’appliquent à tous les blocs. Les autres paramètres de calcul sont regroupés dans les paramètres avancés.

### 5.2 Saisie et comptage

#### FR-14 — Ajouter, modifier et supprimer les blocs de conversation

Camille peut librement ajouter un bloc, modifier les textes d’un bloc existant et supprimer un bloc, y compris après avoir effectué des calculs.

**Conséquences vérifiables :**

- Un nouveau bloc peut recevoir un message, une réponse finale, un raisonnement visible et un artifact éventuel.
- Une modification rend périmés les résultats qui dépendent des données modifiées, selon FR-13.
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

#### FR-8 — Estimer les tokens à partir du nombre de mots

Le calculateur estime les tokens des textes comptabilisés en divisant leur nombre de mots par 0,7 par défaut. Ce coefficient est modifiable dans les paramètres avancés (FR-17). Cette convention, choisie par Felix, s’applique indépendamment du modèle sélectionné, sans tokenizer propre au modèle. Ce comptage est effectué exclusivement dans le navigateur, sans clé API ni envoi de données à OpenAI.

**Conséquences vérifiables :**

- Un texte compté à 70 mots correspond à une estimation de 100 tokens.
- Un texte vide contribue pour zéro token.
- Pour les versions successives d’un artifact, seuls les passages retenus par FR-4 sont comptés en sortie.
- Les volumes obtenus sont des estimations, et non des décomptes exacts du fournisseur.

La segmentation des mots, le traitement du code et l’arrondi seront fixés avant développement (D-2). Le même compteur doit s’appliquer à toutes les catégories de texte.

#### FR-4 — Détecter automatiquement les changements d’un artifact

Camille peut coller la version complète d’un artifact à chaque échange. Le calculateur la compare automatiquement à sa version précédente et comptabilise en sortie uniquement le texte ajouté ou modifié de la nouvelle version.

**Conséquences vérifiables :**

- Camille n’a pas à préparer elle-même la différence entre les versions.
- Les passages inchangés ne sont pas comptabilisés à nouveau en sortie.
- Deux versions identiques n’ajoutent aucun token de sortie au titre de l’artifact.
- Les passages supprimés ne produisent pas de tokens de sortie ; les passages de remplacement sont comptés dans leur nouvelle version.

La granularité de comparaison sera spécifiée par le responsable technique avant développement (D-2). Cette règle concerne les tokens de sortie ; pour l’historique d’entrée, seule la dernière version complète disponible avant l’échange est retenue, selon FR-19.

Le premier artifact est compté intégralement en sortie. [ASSUMPTION A-2] Un champ artifact vide signifie qu’aucune nouvelle version n’est fournie ; il ne supprime pas la dernière version disponible. Le parcours de lancement prévoit un artifact suivi au fil de ses versions.

#### FR-19 — Reconstituer automatiquement l’historique en cache

Pour calculer un bloc, le calculateur reprend automatiquement les échanges précédents de la conversation comme historique. Tous les tokens de cet historique sont comptabilisés au taux des tokens en cache, selon la convention de la spécification initiale confirmée par Felix.

**Conséquences vérifiables :**

- Camille n’a pas à recopier l’historique dans chaque nouveau bloc.
- Les messages, réponses finales et raisonnements fournis des blocs précédents contribuent à l’historique du bloc calculé.
- Les textes du bloc courant restent comptés dans leurs catégories d’entrée nouvelle et de sortie ; ils ne sont pas ajoutés à son propre historique.
- Pour l’artifact, l’historique inclut une seule fois la dernière version complète disponible avant le bloc courant. Les versions antérieures et leurs différences successives ne sont pas cumulées dans cet historique.
- Une nouvelle version produite dans le bloc courant intervient en sortie selon FR-4 ; elle devient la version complète de référence pour l’historique des échanges suivants.
- L’historique est établi à partir des textes précédents, sans imposer de calculer leurs impacts pour calculer individuellement le bloc courant.
- Le taux de cache de 100 % est une hypothèse du calculateur, pas une observation du fonctionnement réel du fournisseur.
- Le nombre de tokens du prompt système fourni par le catalogue pour le modèle sélectionné est ajouté une seule fois à l’historique de chaque bloc, y compris le premier. Il est compté au taux du cache et n’est pas reconverti depuis des mots.

#### FR-20 — Intégrer automatiquement le prompt système du modèle

Le calculateur utilise le nombre de tokens du prompt système associé au modèle dans le catalogue fourni. Camille n’a pas à connaître l’existence de ce prompt ni à fournir son contenu ou son volume pour utiliser le calculateur. Le parcours courant ne lui demande aucune information à ce sujet.

Cette donnée constitue une exception explicite à la règle du seul texte fourni (FR-3). Elle ne conduit pas à estimer du raisonnement non visible. Sa contribution au calcul suit FR-19.

**Conséquences vérifiables :**

- Le nombre de tokens du prompt système est fixé exclusivement par le catalogue pour le modèle sélectionné.
- Aucun champ, contrôle ou détail de résultat ne révèle cette donnée dans l’interface, y compris dans les paramètres avancés.
- La restauration des paramètres avancés ne modifie pas cette donnée du catalogue.
- Il s’agit d’une discrétion d’interface, et non d’une exigence de secret technique pour les données utilisées par le calcul local.

### 5.3 Calculs et validité des résultats

#### FR-24 — Calculer l’énergie, le carbone, l’eau et le risque de sécheresse

Pour chaque bloc renseigné, le calculateur distingue tokens d’entrée nouvelle, d’historique en cache et de sortie, puis applique les formules de la spécification source reprises dans l’addendum.

**Conséquences vérifiables :**

- Le taux énergétique de sortie dépend des paramètres totaux et activés du modèle selon les formules Ecologits adaptées ; aucun second multiplicateur de taille du modèle n’est ajouté.
- Les taux d’entrée et de cache proviennent des ratios tarifaires par modèle et fournisseur, avec date de calibration.
- Le PUE du pays/fournisseur est appliqué exactement une fois à l’énergie informatique ; le PUE générique Ecologits n’est pas ajouté.
- Le carbone et l’eau sont dérivés de cette même énergie datacenter. Les unités restent cohérentes : Wh, gCO₂e et litres ; les conversions d’affichage ne modifient pas les valeurs de calcul.
- L’eau représente uniquement l’eau consommée sur site, hors eau liée à la production électrique.
- Le risque de sécheresse est affiché à côté de l’eau selon le pays retenu. Il n’est ni sommé ni multiplié par le volume d’eau.
- Le total additionne les valeurs non arrondies des blocs valides ; les arrondis relèvent uniquement de l’affichage.
- Une mention visible précise que les résultats couvrent l’usage, hors fabrication et amortissement des équipements (Scope 3).

Les formules, constantes initiales, hypothèses et sources sont réunies dans [addendum.md](addendum.md). Les décisions du présent PRD priment sur la source initiale en cas de différence explicite.


#### FR-10 — Déclencher le calcul d’un bloc

Camille dispose d’une action de calcul sur chaque bloc de conversation. Le calcul des impacts est déclenché à sa demande ; une modification de champ ne lance pas automatiquement ce calcul. L’action individuelle calcule le résultat du bloc concerné sans déclencher le calcul des impacts des autres blocs.

Cette action actualise également l’équivalence douche de ce bloc avec les paramètres courants. Si seule cette équivalence est périmée, les impacts déjà valides peuvent être réutilisés. « Tout calculer » actualise les équivalences de tous les blocs ; « Recalculer le total » actualise uniquement celle du total. Une équivalence individuelle périmée est masquée et signalée comme à recalculer, même si l’équivalence du total est à jour.

Un bloc peut être calculé même si les blocs précédents n’ont pas encore de résultat : leur texte suffit à reconstituer son historique. Un résultat périmé est signalé comme à recalculer et n’est jamais présenté comme actuel.

#### FR-11 — Calculer tous les blocs et leur total en un clic

Camille peut déclencher une action unique qui calcule les impacts de tous les blocs renseignés de la conversation, puis fournit les résultats individuels et le total de la conversation. Les blocs entièrement vides sont ignorés.

#### FR-12 — Recalculer le total sans recalculer les blocs

Camille dispose d’une action distincte qui agrège les résultats de blocs déjà calculés, sans réexécuter leurs calculs d’impact. Elle obtient les totaux d’énergie, d’eau et de carbone, ainsi que l’équivalence carbone correspondante en durée de douche chaude.

Si seuls les paramètres de douche ont changé, cette action met à jour l’équivalence du total à partir du carbone encore valide, sans recalculer les impacts des blocs.

#### FR-13 — Exiger des résultats à jour avant d’afficher le total

Si une modification rend périmé le résultat d’un bloc, le calculateur identifie les blocs concernés et demande à Camille de les recalculer avant d’afficher le total. Les blocs suivants dépendant d’un historique ou d’une version d’artifact modifiés sont également concernés.

**Conséquences vérifiables :**

- Un total précédemment affiché cesse d’être présenté dès qu’un résultat dont il dépend est périmé.
- L’action de recalcul du total indique les blocs à recalculer et ne déclenche pas leur calcul implicitement.
- Camille peut recalculer les blocs concernés individuellement ou utiliser l’action de calcul de tous les blocs.
- Le total est de nouveau disponible uniquement à partir de résultats à jour ; il n’est pas affiché avec un simple avertissement de péremption.

Les blocs entièrement vides sont ignorés et ne bloquent pas l’affichage du total. Un bloc renseigné mais jamais calculé nécessite un calcul avant de pouvoir afficher un total complet ; il ne doit pas être assimilé silencieusement à un impact nul.

### 5.4 Réglages et données géographiques

#### FR-15 — Modifier le pays d’hébergement dans les paramètres avancés

Le calculateur utilise un pays d’hébergement de référence défini pour chaque fournisseur. Camille peut le modifier dans une section discrète intitulée « Paramètres avancés ». Le parcours courant ne nécessite pas d’ouvrir cette section.

**Conséquences vérifiables :**

- Sans intervention de Camille, le pays de référence du fournisseur est utilisé.
- Le pays choisi dans les paramètres avancés sert à sélectionner les facteurs environnementaux applicables et l’indicateur de risque de sécheresse pour le modèle.
- Ce pays est distinct du pays de l’utilisateur : modifier l’un ne modifie pas l’autre.
- Une modification du pays d’hébergement invalide les résultats des blocs concernés et le total ; Camille doit relancer les calculs selon FR-10 à FR-13.
- Le pays retenu est une hypothèse de calcul, et non une localisation mesurée de l’exécution réelle de la requête.

Le fournisseur et le modèle étant communs à toute la conversation, ce réglage s’applique à tous ses blocs.

**Dépendances de données :** pays de référence et facteurs disponibles par fournisseur. Un facteur manquant pour le pays choisi utilise la référence « Monde » (FR-23). Le détail de présentation de la section relève de la conception UX.

#### FR-17 — Permettre la modification de tous les paramètres mathématiques

Une section discrète « Paramètres avancés » permet de modifier les paramètres du modèle mathématique, à l’exception du nombre de tokens du prompt système, entièrement masqué et fixé par le catalogue (FR-20). Des valeurs par défaut permettent à Camille de suivre le parcours principal sans ouvrir cette section.

**Périmètre :** paramètres totaux et activés du modèle, constantes des formules d’énergie et de latence, hypothèses matérielles et de batch, ratios d’entrée et de cache, facteurs environnementaux et pays de référence, ainsi que les paramètres de conversion mots/tokens et de comparaison avec la douche. Les valeurs déjà définies dans ce PRD constituent les valeurs par défaut.

**Conséquences vérifiables :**

- Les paramètres s’appliquent à toute la conversation et ne sont pas configurés séparément pour chaque bloc.
- Toute modification invalide les résultats qui en dépendent, sans lancer automatiquement de calcul.
- Un changement limité à la référence de douche invalide les équivalences concernées sans invalider les impacts énergie, eau et carbone des blocs.
- Les noms, unités et valeurs des paramètres modifiables sont disponibles dans la section avancée. Le nombre de tokens du prompt système n’y apparaît pas.

Cette exigence remplace la restriction de la spécification source qui rendait certaines constantes internes non modifiables. Les contrôles minimaux sont définis dans NFR-6 ; les bornes supplémentaires seront arrêtées avant développement (D-2). Les formules restent celles du modèle retenu ; leur édition n’a pas été demandée.

#### FR-18 — Rétablir les paramètres par défaut

Camille dispose d’un bouton « Rétablir les valeurs par défaut » dans les paramètres avancés. Cette action annule les modifications de ces paramètres et rétablit les valeurs de référence applicables au chatbot et au modèle sélectionnés.

**Conséquences vérifiables :**

- Les textes et les blocs de conversation sont conservés.
- Le chatbot et le modèle sélectionnés restent inchangés.
- Les résultats dépendant de paramètres effectivement modifiés par la restauration sont invalidés selon FR-13 et FR-17.
- Aucun calcul n’est lancé automatiquement ; Camille utilise les actions de calcul existantes.

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

- La consommation électrique, la consommation d’eau et les émissions carbone sont affichées comme des estimations pour chaque bloc et pour le total.
- L’équivalence carbone en durée de douche reste elle aussi présentée comme une estimation.
- L’information sur l’incertitude est accessible dans le parcours courant, sans ouvrir les paramètres avancés.
- Aucun intervalle de confiance ni précision garantie n’est ajouté sans méthode définie.
- Le risque de sécheresse reste un indicateur catégoriel associé au pays retenu, et non une grandeur à sommer.

#### FR-5 — Comparer le carbone à une durée de douche chaude locale

Camille peut consulter une équivalence des émissions carbone estimées en durée de douche chaude. Le calculateur détecte automatiquement le pays où elle se trouve pour sélectionner le facteur d’émission de cette comparaison. Camille peut corriger manuellement ce pays.

**Conséquences vérifiables :**

- L’équivalence en durée de douche chaude porte uniquement sur le carbone, et non sur l’énergie ou le volume d’eau.
- Le volume d’eau estimé reste affiché sans équivalence comparative.
- Le pays de l’utilisateur et le pays d’hébergement retenu pour le modèle sont deux informations distinctes, pouvant avoir la même valeur géographique.
- Le facteur d’émission de la douche est sélectionné selon le pays de l’utilisateur ; celui du modèle reste sélectionné selon le pays d’hébergement retenu.
- Le pays détecté est consultable et modifiable ; une correction manuelle prend le pas sur la valeur détectée pour la comparaison.
- À conversation et paramètres du modèle inchangés, changer le pays de l’utilisateur modifie uniquement la référence de comparaison, pas l’empreinte estimée de la conversation.

**Référence par défaut confirmée :** douche chauffée à l’électricité, débit de 15 L/min, eau chauffée de 18 à 38 °C avec une consommation de 0,0232 kWh/L. La consommation de référence est donc de 0,348 kWh/min. Ses émissions par minute sont calculées avec le facteur d’émission du pays de l’utilisateur. Ces paramètres sont modifiables dans la section avancée (FR-17). Les formules et unités sont conservées dans [addendum.md](addendum.md#référence-de-douche-chaude).

Le pays de l’utilisateur peut être corrigé dans les paramètres avancés (FR-17). Une modification ne recalcule pas automatiquement les résultats. Les facteurs manquants utilisent « Monde » (FR-23). Si la détection échoue, la correction manuelle reste disponible ; aucune localisation certaine n’est affirmée.

#### FR-6 — Présenter des bonnes pratiques après les résultats

Après consultation des résultats, Camille accède à une liste de bonnes pratiques visant à réduire l’impact de ses usages. Cette liste est identique pour tous les utilisateurs, sans personnalisation ni mise en avant conditionnée par la conversation analysée. Le contenu initial demandé par Felix couvre :

- Choisir un petit modèle.
- Ne pas faire raisonner le modèle.
- Réduire le nombre de tokens en entrée et en sortie.
- Relancer une conversation le plus souvent possible pour supprimer l’historique.
- Éditer un message plutôt que d’en renvoyer un lorsque c’est possible.

Ces formulations recueillent l’intention produit ; les textes destinés au grand public seront rédigés avant publication (D-5). La liste doit pouvoir être enrichie avec d’autres bonnes pratiques ultérieurement.

**Conséquences vérifiables :**

- Les cinq thèmes sont accessibles à la personne après consultation de ses résultats.
- Le vocabulaire des conseils doit être compréhensible par une personne non technique, notamment pour expliquer les tokens en entrée et en sortie.
- L’absence de texte de raisonnement dans le calculateur ne doit pas être présentée comme une désactivation du raisonnement dans le chatbot : ce sont deux actions distinctes.

Les conseils seront contextualisés sans être personnalisés : conserver le contexte nécessaire, préciser les réglages effectivement disponibles et ne pas promettre une économie systématique par l’édition d’un message. Aucun gain chiffré n’est promis.

## 6. Exigences de qualité

### NFR-1 — Utilisation sur ordinateur et mobile

La page doit permettre la saisie des échanges, la consultation des résultats et des bonnes pratiques, ainsi que la correction du pays de l’utilisateur depuis un ordinateur ou un mobile. Les critères détaillés d’adaptation de l’interface restent à définir lors de la conception UX.

### NFR-2 — Compatibilité avec GitHub Pages

La page livrée doit être hébergeable sur GitHub Pages et s’intégrer au site existant `felixmortas.com`. Le choix du langage et des outils de développement est libre, sous réserve de respecter cette contrainte. Le contexte technique fourni par Felix est conservé dans [addendum.md](addendum.md#intégration-au-site-existant).

L’étude de faisabilité de l’import par lien devra tenir compte de cet hébergement. Aucun service serveur complémentaire n’est prévu.

### NFR-3 — Garder les conversations dans le navigateur

Les messages, réponses, raisonnements et artifacts restent dans le navigateur. Aucun contenu de conversation n’est transmis à un serveur, y compris par des services d’analyse, de journalisation ou de comptage des tokens. Le comptage, le calcul des impacts et la comparaison des versions d’artifacts sont réalisés localement. Aucune clé API ni service serveur complémentaire n’est requis pour ces opérations.

Le mécanisme de détection du pays et l’import conditionnel par lien devront respecter cette confidentialité. L’étude d’import doit examiner la faisabilité depuis la page hébergée sur GitHub Pages, sans serveur complémentaire.

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

[ASSUMPTION A-3] Les contrôles minimaux ci-dessous concrétisent les contraintes de calcul ; leurs bornes détaillées seront arrêtées en conception.

Les champs avancés indiquent leurs unités et les erreurs empêchant le calcul. Des valeurs non numériques, infinies ou hors domaine ne doivent pas produire un résultat présenté comme valide.

Les quantités physiques non négatives le restent ; les diviseurs sont strictement positifs, le PUE est au moins égal à 1 et les paramètres activés ne dépassent pas les paramètres totaux. Les coefficients de régression conservent leur domaine propre, notamment le coefficient exponentiel négatif prévu par la source.

Un facteur carbone nul est une valeur disponible, pas une absence à remplacer par « Monde ». Si la référence de douche a des émissions nulles, la durée équivalente est indiquée comme non calculable ; aucune division par zéro ni durée infinie n’est affichée.

Les données de catalogue indispensables manquantes ne sont pas inventées : le calcul concerné est bloqué avec un message explicite. Un facteur environnemental manquant suit d’abord le repli « Monde » de FR-23.


### NFR-7 — Rendre le parcours utilisable au clavier et sur petit écran

[ASSUMPTION A-3] Ces critères de base concrétisent l’usage grand public demandé et seront précisés lors de la conception UX.

Les champs possèdent des libellés explicites, les actions sont accessibles au clavier, le focus est visible et les erreurs sont associées aux champs concernés. Un résultat périmé ou un risque de sécheresse ne se distingue pas uniquement par sa couleur. Sur mobile, les actions de calcul, les résultats et la correction des champs restent accessibles sans dépendre du survol.

Ces critères concrétisent l’usage grand public sur ordinateur et mobile ; ils ne constituent pas une déclaration de certification d’accessibilité.


## 7. Réussite et validation du lancement

**SM-1 — Signal retenu par Felix :** recevoir des retours positifs par email ou sur LinkedIn. Felix apprécie directement ces retours ; aucun volume, échéance ni collecte automatisée n’est imposé. Ce signal concerne l’expérience globale, la compréhension des résultats et les conseils ; il ne prouve pas la justesse scientifique ni une baisse réelle des impacts.

**SM-C1 — Contre-indicateur proposé :** examiner aussi les retours signalant une difficulté d’utilisation ou une confusion entre estimation et mesure. [ASSUMPTION A-1] Proposition non bloquante à réexaminer par Felix lors des premiers retours, sans dispositif de suivi supplémentaire.

Avant publication, vérifier des scénarios représentatifs : premier échange ; ajout d’un deuxième échange avec artifact modifié ; suppression d’un bloc intermédiaire ; bloc vide ; résultat périmé refusé dans le total ; recalcul du seul total ; changement de modèle ou pays ; restauration des paramètres ; repli « Monde » ; fermeture et nouvelle ouverture. Les formules sont vérifiées sur des jeux chiffrés avec unités explicites et invariants : PUE appliqué une fois, séparation des deux pays et absence de double comptage des versions d’artifact. Les contrôles réseau doivent confirmer qu’aucun texte de conversation n’est transmis.

## 8. Dépendances et points à préciser

Le cadrage produit est établi. Les points ci-dessous relèvent de la conception ou de la fourniture des données ; ils ne nécessitent pas de nouveau choix produit pour commencer l’UX ou l’architecture. Une dépendance non satisfaite reste bloquante pour la fonction concernée avant mise en production.

| ID | Livrable ou décision restante | Responsable | À résoudre avant |
|---|---|---|---|
| D-1 | Fournir le catalogue, paramètres totaux/activés, tokens système, pays fournisseurs, facteurs, risques et valeurs « Monde » ; contrôler leur cohérence avec les modèles ChatGPT imposés. | Felix pour la fourniture ; responsable technique pour la validation | Intégration des données et publication |
| D-2 | Définir segmentation des mots, précision d’affichage, granularité du diff et bornes avancées ; spécifier le lien entre températures modifiables et énergie par litre de douche pour éviter des paramètres contradictoires ; fixer des exemples de référence sans modifier les règles produit. | Responsable technique | Développement du moteur et de ses tests |
| D-3 | Déterminer une détection du pays compatible avec une page statique et la confidentialité des textes ; saisie manuelle en cas d’échec, sans serveur complémentaire. | Responsable architecture | Développement de la localisation |
| D-4 | Étudier l’import par lien depuis le navigateur : accès, restrictions réseau, données présentes et compatibilité avec l’absence de serveur. | Responsable technique ; Felix pour la décision d’inclusion | Tout engagement de livraison de l’import |
| D-5 | Rédiger les textes français, les limites des conseils, les messages d’incertitude et l’état « non calculable » ; arrêter disposition responsive et précision des unités. | Responsable UX ; Felix pour la validation éditoriale | Publication |
| D-6 | Préparer la calibration des ratios tarifaires et la provenance datée des données ; choisir le processus de maintenance du catalogue. | Responsable technique ; Felix pour la maintenance | Publication, puis toute mise à jour de données |

Les intitulés « responsable technique », « responsable architecture » et « responsable UX » désignent des rôles à attribuer par Felix, pas des personnes déjà engagées.

## 9. Hypothèses de conception à suivre

- **A-1 — Contre-indicateur qualitatif :** proposé en §7 ; Felix peut le confirmer ou l’écarter lors des premiers retours. Il ne modifie aucune fonctionnalité.
- **A-2 — Artifact absent :** un champ vide n’efface pas une version précédente ; un seul artifact est suivi dans le parcours décrit. Le responsable UX et Felix réexamineront ce point si un besoin multi-artifact ou d’effacement explicite apparaît.
- **A-3 — Données numériques :** les règles minimales de validation de NFR-6 et les critères d’utilisabilité de NFR-7 concrétisent les contraintes exprimées. Leurs détails seront arrêtés pendant la conception, avant développement.

Les hypothèses scientifiques (cache intégral, ratios tarifaires, données de modèles, matériel et eau sur site) sont des conventions explicites dans l’addendum. Elles ne deviennent pas des observations du service réel.
