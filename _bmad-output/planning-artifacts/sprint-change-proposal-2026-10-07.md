---
title: Proposition de changement de sprint — simplification du parcours grand public (audit UX)
status: applied-to-planning-docs
created: 2026-10-07
revised: 2026-10-07
change_scope: moderate
mode: batch
trigger: Audit UX de la calculatrice d’impact environnemental (2026-10-07)
sources:
  - prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md
  - ux-designs/ux-ao-env-impact-calculator-2026-09-23/DESIGN.md
  - ../specs/spec-ai-env-impact-calculator/SPEC.md
  - ../specs/spec-ai-env-impact-calculator/functional-contract.md
---

# Proposition de changement — parcours grand public simplifié

> **Révision après amendements de Felix.** Cinq décisions de Felix remplacent ou précisent des propositions de l’audit : un seul « Calculer » qui calcule et affiche tout ; « Mode avancé » sous le choix du modèle et « Mode expert » imbriqué dedans ; aucun tutoriel (seule la méthodologie subsiste) ; partage par un seul bouton via le partage système ; étape 3 sans nouvel écran. Le contenu ci-dessous reflète ces décisions.

## 1. Déclencheur et constat

Un audit UX du parcours livré (accueil → modèle → conversation → résultat) conclut que l’outil exige trop de vocabulaire technique et de décisions avant de montrer une valeur, et que le résultat est illisible pour un public non technique. L’audit relève 3 problèmes bloquants, 5 majeurs, 7 d’ergonomie/libellés et 6 points secondaires. Les constats sont vérifiables dans `src/i18n/fr.ts` (ex. `continueThreadAction: 'Valider'`, `applyParametersAction`, `calculateAction: 'Calculer l’impact de cet échange uniquement'`, `artifactLabel: 'Fichier généré'`, `sourcesLabel: 'Fichiers uploadés'`, `summaryLimits` avec « Scope 2 » et la faute « entraiment »).

Il n’y a pas de story en cours : le déclencheur est une nouvelle décision produit après livraison.

## 2. Analyse d’impact

| Périmètre | Impact |
|---|---|
| PRD | Modifié : vision, UJ-1, vocabulaire (Mode avancé, Mode expert), FR-5/6/12/14/15/16/17/18/22, FR-12 devenu le seul calcul, nouveaux FR-25 (comparaison du quotidien) et FR-26 (partage), NFR-1/NFR-8, dépendances D-1 à D-4. Les anciens FR-10, FR-11 et FR-13 n’existent plus. Formules, confidentialité et péremption inchangées. |
| EXPERIENCE | Modifié : décisions à reporter, architecture de l’information (étapes 1/3 à 3/3, résultat sous la conversation), voix, composants, états, interactions, flux UJ-1/2/4/5. |
| DESIGN | Modifié : composants (bouton Commencer, barre d’action collante, résultat « douche en grand », Mode avancé et Mode expert imbriqués, boutons de partage), typographie `metric-hero`, mise en page, « faire / éviter ». |
| SPEC et `functional-contract.md` | Modifié : CAP-4/5/6/7/8, nouvelles CAP-9 (partage) et CAP-10 (langage), contraintes, non-objectifs. |
| Epics | **Non modifiés.** Les epics 1 à 6 restent la trace des versions livrées. Un epic 7 est proposé au §5. |
| Architecture | Pas de changement de couche. Ajouts locaux : tirage injectable de la bonne pratique, paramètre « puissance de l’ampoule LED » (5 W par défaut), bouton de partage (Web Share, copie en repli). Aucun nouveau service applicatif. |
| Méthodologie / addendum / `calculation-contract.md` | **À mettre à jour (hors de cette passe)** : ajouter l’équivalence énergétique en durée d’ampoule LED (§8 de la méthodologie, source de vérité). |
| Maquettes statiques (`mockups/*.html`) | Obsolètes (accueil, fil, bilan). `DESIGN.md` et `EXPERIENCE.md` priment ; à régénérer lors de l’epic 7. |
| Code et tests | `App`, `ConversationConfiguration`, `ConversationBlocks`, `Methodology`, `fr.ts`, `styles.css`, formatage ; suppression du calcul par bloc et du recalcul du seul total ; nouvelle surface de partage. |

### Décisions de cadrage

1. **Un seul « Calculer »** : il calcule et affiche tout à chaque fois (cartes, total, résultat). Le calcul d’un seul bloc et le recalcul du seul total sont supprimés. Un résultat périmé est retiré ou marqué « à recalculer » jusqu’au prochain « Calculer ». Une modification n’en déclenche jamais.
2. **Mode avancé et Mode expert imbriqués**, repliés par défaut à l’étape 1/3 : le Mode avancé (sous le choix du modèle) contient pays de la personne, paramètres de douche et puissance de l’ampoule ; le Mode expert, dans le Mode avancé, contient pays d’hébergement, intensité carbone, paramètres du modèle, PUE, WUE et le reste. Plus de bouton « Appliquer » : les valeurs valides sont appliquées à « Continuer » ou « Calculer », sans calcul.
3. **Pas de tutoriel** : le bouton « ? » est remplacé par un lien libellé « Méthodologie ». La page de méthodologie a un « Retour » libellé en haut et un seul titre principal.
4. **Partage par un seul bouton « Partager »** : partage du système, avec copie en repli si indisponible. Le texte est prérempli : chatbot utilisé, nombre d’échanges, équivalence douche, valeurs principales avec unités, mention d’estimation, adresse de la page.. Le contenu de la conversation n’est jamais partagé.
5. **L’étape 3 n’est pas un nouvel écran** : le résultat apparaît sous la conversation, sur la page de l’étape 2, et reçoit le focus après « Calculer ». « Retour » depuis l’étape 2 mène à l’étape 1.
6. **L’ampoule LED est une comparaison énergétique** (5 W de référence, modifiable) : extension de FR-5, qui limitait la comparaison au carbone. L’eau reste sans comparaison. La phrase d’interprétation est neutre, sans jugement automatique de type « C’est très faible ».
7. **Une seule bonne pratique** au résultat, tirée au hasard et stable pour un même résultat, avec accès aux cinq.
8. **Pays de la personne déduit de la langue du navigateur**, sans géolocalisation, corrigeable dans le Mode avancé.
9. **Barre d’action collante** (« Continuer », « Calculer ») statique à fort zoom ou en hauteur réduite, pour ne pas masquer le focus.

### Points à surveiller

- **Vie privée du partage :** le texte de résultats transite par le moyen choisi par la personne, sur son action explicite. Le texte ne contient ni conversation ni paramètres de session, mais il nomme le chatbot et le nombre d’échanges. NFR-3 est clarifié en conséquence.
- **Données du résultat périmé :** sans recalcul partiel, tout changement de paramètre exige un nouveau « Calculer ». C’est plus simple, mais les anciens messages sur le « total incomplet » et les liens vers les cartes à recalculer disparaissent.
- **Phrase d’interprétation :** `EXPERIENCE.md` fait foi (« …100 conversations comme celle-ci ont un impact plus conséquent ») ; FR-25 la reprend.

## 3. Voie recommandée

**Ajustement direct avec un nouvel epic 7 ; portée modérée.** Le moteur de calcul, la tokenisation, l’historique et la fraîcheur des résultats ne changent pas. Le travail porte sur le parcours, les libellés, la hiérarchie du résultat, la suppression de deux modes de calcul et deux fonctions nouvelles (équivalence LED, partage). Une annulation ou une réduction de MVP n’est pas justifiée.

**Effort estimé :** moyen. **Risque :** moyen, concentré sur la barre collante et le focus, la déduction du pays, le partage sans fuite de contenu et la mise à jour de la méthodologie pour l’équivalence LED. Aucune date n’est déduite.

## 4. Propositions détaillées (appliquées)

- **PRD** : vision et UJ-1 (Commencer, trois étapes, résultat sous la conversation) ; vocabulaire ; FR-12 unique ; FR-14/18 corrigés (références à FR-13 supprimées) ; FR-15/17 (modes imbriqués, application automatique) ; FR-22 (états « à recalculer » et « ✓ ») ; FR-25 ; FR-26 ; NFR-8 ; D-1 à D-4.
- **EXPERIENCE / DESIGN / SPEC** : chaque décision ci-dessus y est reportée avec ses états, ses règles d’accessibilité et ses composants.
- **Coquilles corrigées** : « conscis », « denrière », « promett », « et et », « bouton p commencer », « A chaque ».

## 5. Passation

**Portée : modérée → Product Owner / Développeur.**

1. **Créer l’epic 7 « Parcours grand public simplifié »** avec les stories suggérées :
   - 7.1 Accueil « Commencer », indicateur d’étapes, lien « Méthodologie » libellé, « Retour » en haut et titre unique de la méthodologie.
   - 7.2 Étape « Votre IA » : modèle déduit, pays déduit, Mode avancé et Mode expert imbriqués, « Continuer » sans « Appliquer », lien discret de rétablissement.
   - 7.3 Conversation : libellés question/réponse, boutons icône + texte, placeholders neutres, état « ✓ » / « à recalculer », « Calculer » unique (suppression du calcul par bloc et du recalcul du total).
   - 7.4 Résultat sous la conversation : douche en grand, valeurs secondaires, équivalence LED, phrase d’interprétation, une bonne pratique, périmètre reformulé, focus au titre du résultat.
   - 7.5 Partage système (bouton unique) sans fuite de contenu.
2. **Mettre à jour** `docs/methodologie-empreinte-inference-llm.md` (§8), l’addendum du PRD et `calculation-contract.md` avec la formule LED avant la story 7.4.
3. **Valider les textes** (D-3, D-4) : multiplicateur « 100 conversations », phrase d’interprétation, texte de partage.
4. Régénérer ou retirer les maquettes obsolètes.

**Critères de réussite :** un utilisateur non technique atteint un résultat lisible en trois étapes sans ouvrir le Mode avancé ; une seule action de calcul existe ; aucune action n’a un libellé ambigu ni une icône seule ; aucun calcul automatique à l’édition ; aucun contenu de conversation dans le partage ; clavier, 320 px, zooms 200 % et 400 % préservés.
