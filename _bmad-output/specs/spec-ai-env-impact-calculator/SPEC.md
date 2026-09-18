---
id: SPEC-ai-env-impact-calculator
companions:
  - functional-contract.md
  - calculation-contract.md
  - ../../planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
sources:
  - ../../planning-artifacts/prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - ../../planning-artifacts/prds/prd-ai-env-impact-calculator-2026-09-17/addendum.md
---

> **Contrat canonique.** Cette SPEC et ses compagnons constituent le contrat complet, validé pour la préservation, à construire et tester.

# Calculateur d’empreinte environnementale de l’inférence des LLM

## Why

Le grand public manque d’un moyen compréhensible et respectueux de sa vie privée pour estimer l’empreinte d’une conversation avec un chatbot. La page publique française de `felixmortas.com` rend visibles des estimations d’énergie, d’eau et de carbone afin d’éclairer les usages et de faire retenir des pratiques plus sobres.

## Capabilities

- **CAP-1 — Configurer une conversation**
  - **intent:** La personne peut choisir un chatbot et un modèle applicables à toute sa conversation, dont la convention de modèle ChatGPT selon l’abonnement.
  - **success:** Les seuls modèles sélectionnables viennent du catalogue ; ChatGPT sans abonnement résout `gpt-5.6-luna` et avec abonnement `gpt-5.6-terra`.
- **CAP-2 — Saisir et reconstruire les échanges**
  - **intent:** La personne peut gérer les blocs d’une conversation, leurs textes et les versions complètes d’un artifact afin de calculer seulement le texte pertinent.
  - **success:** Les blocs entièrement vides sont ignorés ; l’historique et la dernière version d’artifact sont reconstruits dans l’ordre ; un artifact identique ajoute zéro token de sortie.
- **CAP-3 — Compter les tokens localement**
  - **intent:** Le calculateur peut compter chaque texte pris en charge sans l’envoyer hors du navigateur.
  - **success:** Tiktoken par défaut est employé, avec fallback `mots / 0,75` en cas d’échec ; texte vide et raisonnement non fourni comptent zéro.
- **CAP-4 — Estimer les impacts**
  - **intent:** La personne peut déclencher l’estimation par bloc ou pour la conversation et consulter énergie, eau, carbone et risque de sécheresse.
  - **success:** Les formules, unités, données de référence, replis Monde et limites du calcul suivent `calculation-contract.md`; le total additionne les résultats non arrondis à jour.
- **CAP-5 — Préserver la validité des résultats**
  - **intent:** La personne peut savoir quels résultats doivent être recalculés avant de consulter un total complet.
  - **success:** Une modification invalide exactement ses résultats dépendants ; aucun calcul n’est automatique ; un bloc renseigné non calculé ou périmé empêche le total.
- **CAP-6 — Ajuster la session et les références géographiques**
  - **intent:** La personne peut modifier les paramètres avancés de session, dont les pays d’hébergement et utilisateur, puis restaurer les références.
  - **success:** Les surcharges n’affectent jamais les catalogues ni le prompt système ; un changement de pays utilisateur ne périme que l’équivalence douche, tandis qu’un pays d’hébergement périme les impacts concernés.
- **CAP-7 — Expliquer les résultats**
  - **intent:** La personne peut interpréter les estimations grâce à une équivalence carbone en douche chaude et des conseils communs de sobriété.
  - **success:** L’incertitude et le périmètre usage hors Scope 3 sont visibles ; l’équivalence utilise exclusivement le carbone et le pays utilisateur indicatif et modifiable ; les cinq thèmes de bonnes pratiques sont accessibles après les résultats.

## Constraints

- Application monopage française, accessible au clavier et sur mobile, publiée statiquement à `/calculator/` sur GitHub Pages, sans compte ni serveur complémentaire.
- Les textes, résultats et choix ne quittent pas la session navigateur : aucun stockage durable, analytics, journal distant, contenu dans URL ni API de tokenisation.
- Le noyau fonctionnel pur, le Worker local de tokenisation, les catalogues immuables versionnés et la séparation des couches suivent l’architecture adoptée.
- Les calculs conservent Wh, gCO2e et L non arrondis ; aucune valeur invalide, donnée indispensable absente ou division indéfinie ne produit un résultat présenté comme calculé.
- Le risque de sécheresse est catégoriel, affiché seulement au total, non additif et non proportionnel au volume d’eau.

## Non-goals

- Compte, connexion, persistance de session, service serveur, clé API, tokenisation distante ou télémétrie.
- Estimation du raisonnement invisible, fourchette d’incertitude, Scope 3, fabrication/amortissement des équipements, eau de production électrique ou équivalence de volume d’eau.
- Traitement natif d’images, audio ou vidéo, plusieurs artifacts distincts dans un échange, déplacement des blocs ou conseils personnalisés.
- Import d’un lien de partage avant une étude de faisabilité compatible avec GitHub Pages et la confidentialité.

## Success signal

- Avant publication, les scénarios de référence couvrent premier échange, artifact modifié, suppression intermédiaire, bloc vide, péremption, recalcul du total, changements de modèle/pays, restauration, repli Monde et fermeture de session, avec invariants d’unités et de non-double-comptage vérifiés.
- Après lancement, Felix reçoit des retours positifs par e-mail ou LinkedIn sur la compréhension des résultats et des conseils.

## Assumptions

- Les contrôles minimaux de validité numérique et d’accessibilité décrits dans le PRD sont retenus ; leurs bornes et critères détaillés seront fixés avant développement.

## Open Questions - Answers

- Quelle segmentation des mots de fallback, granularité du diff d’artifact, arrondi d’affichage et bornes numériques seront retenus pour les jeux de test ? - Séparation des mots en fallback à partir des caractères non alphanumériques (exemples : ,?;.:/=+&(!)-_$^`% mais aussi les espaces et retours à la ligne). Granularité du diff d'artifact au choix. Arrondi avec 4 chiffres significatifs. Pas de bornes numériques pour le moment.
- Quand le catalogue complet avec calibration tarifaire datée, provenance et processus de mise à jour sera-t-il disponible ? - A la publication, pour le moment il y en a un avec des datas mockés.
- L’import par lien de partage est-il faisable sans serveur, avec un accès suffisamment complet et sans compromis de confidentialité ? - On verra dans un V2 du calculateur
- Quels textes français définitifs, limites éditoriales des conseils et détails responsive seront validés avant publication ? - Tous.
