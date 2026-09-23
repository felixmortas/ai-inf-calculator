---
id: SPEC-ai-env-impact-calculator
companions:
  - functional-contract.md
  - calculation-contract.md
  - ../../planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-ao-env-impact-calculator-2026-09-23/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md
sources:
  - ../../planning-artifacts/prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - ../../planning-artifacts/prds/prd-ai-env-impact-calculator-2026-09-17/addendum.md
  - ../../planning-artifacts/sprint-change-proposal-2026-09-23.md
---

> **Contrat canonique.** Cette SPEC et ses compagnons constituent le contrat complet, validé pour la préservation, à construire et tester.

# Calculateur d’empreinte environnementale de l’inférence des LLM

## Why

Le grand public manque d’un moyen compréhensible et respectueux de sa vie privée pour estimer l’empreinte d’une conversation déjà tenue avec un chatbot. La page publique française de `felixmortas.com` rend visibles des estimations d’énergie, d’eau et de carbone et des pratiques plus sobres. La conception Canopée claire du 23 septembre 2026 fixe le parcours de lancement après les epics 1 à 5.

## Capabilities

- **CAP-1 — Configurer une conversation**
  - **intent:** La personne choisit un chatbot et un modèle du catalogue pour toute sa conversation et peut corriger le modèle proposé.
  - **success:** ChatGPT propose `gpt-5.6-luna` sans abonnement et `gpt-5.6-terra` avec abonnement ; Mistral propose `mistral-small` en mode rapide et `mistral-large` en mode réflexion. Ces références sont signalées comme estimations modifiables ; tout modèle valide du chatbot reste sélectionnable.
- **CAP-2 — Saisir et reconstruire les échanges**
  - **intent:** La personne saisit, relit et corrige les échanges d’une conversation, leurs textes et les versions complètes d’un artifact.
  - **success:** Le fil ordonne les échanges, replie les anciens et garde l’éditeur courant ouvert ; au moins un texte suffit pour calculer un échange. Les blocs entièrement vides sont ignorés ; l’historique et la dernière version d’artifact sont reconstruits dans l’ordre ; un artifact identique ajoute zéro token de sortie.
- **CAP-3 — Compter les tokens localement**
  - **intent:** Le calculateur peut compter chaque texte pris en charge sans l’envoyer hors du navigateur.
  - **success:** Tiktoken par défaut est employé, avec fallback `mots / 0,75` en cas d’échec ; texte vide et raisonnement non fourni comptent zéro.
- **CAP-4 — Estimer les impacts**
  - **intent:** La personne déclenche le calcul d’un échange ou de toute la conversation et consulte les résultats à l’endroit adapté.
  - **success:** Après calcul explicite, chaque échange montre carbone et eau avec incertitude ; le bilan valide montre carbone, eau, électricité et risque de sécheresse. Les formules, données et replis suivent `calculation-contract.md` ; le total additionne les valeurs non arrondies à jour.
- **CAP-5 — Préserver la validité des résultats**
  - **intent:** La personne peut savoir quels résultats doivent être recalculés avant de consulter un total complet.
  - **success:** Toute modification invalide exactement les résultats dépendants et les signale par un texte ; aucun calcul n’est automatique et aucun total incomplet ou périmé n’est présenté comme actuel.
- **CAP-6 — Ajuster la session et les références géographiques**
  - **intent:** La personne peut modifier les paramètres avancés de session, dont les pays d’hébergement et utilisateur, puis restaurer les références.
  - **success:** Les surcharges n’affectent jamais les catalogues ni le prompt système ; appliquer ou restaurer ne calcule rien. Un changement du seul pays utilisateur ne périme que l’équivalence douche ; celui du pays d’hébergement périme les impacts concernés.
- **CAP-7 — Expliquer les résultats**
  - **intent:** La personne peut interpréter les estimations grâce à une équivalence carbone en douche chaude et des conseils communs de sobriété.
  - **success:** Le bilan présente incertitude, périmètre usage hors Scope 3, équivalence fondée sur le carbone et le pays utilisateur indicatif et modifiable, ainsi que cinq thèmes de bonnes pratiques.
- **CAP-8 — Entrer dans le parcours**
  - **intent:** La personne choisit dès l’accueil l’import Mistral ou la saisie manuelle et progresse jusqu’au bilan sans perdre ses textes.
  - **success:** Les deux voies sont visibles, import en premier ; la voie manuelle mène au choix du chatbot et du modèle, puis au fil. Les retours gardent les textes et le fil permet de modifier chatbot et modèle.
- **CAP-9 — Importer un partage Mistral**
  - **intent:** La personne reconstruit une conversation depuis un lien public Mistral avec contrôle sur l’envoi et l’ajout des échanges.
  - **success:** Un lien non Mistral est refusé localement sans requête ; un lien Mistral exige un consentement ponctuel montrant URL canonique et endpoint Worker actifs, puis une prévisualisation. Le remplacement d’une conversation contenant du texte demande une confirmation distincte ; refus, erreur et prévisualisation inexploitable conservent la session.

## Constraints

- Application monopage française, accessible au clavier et sur mobile, publiée statiquement à `/calculator/` sur GitHub Pages, sans compte ni serveur applicatif de calcul.
- Les textes, résultats et choix restent dans la session navigateur : aucun stockage durable, analytics, contenu dans URL ou API de tokenisation. Seule l’URL canonique d’un partage Mistral admis est envoyée à l’endpoint d’import HTML du Worker configuré, après consentement explicite ; aucun contenu local ni paramètre de calcul n’est transmis.
- La politique publiée refuse les liens ChatGPT, Claude et Gemini avant le consentement, à la passerelle et lors d’un appel direct au Worker, sans récupération du partage. L’endpoint reste soumis à l’allowlist ; la récupération est bornée et tout échec préserve la session. Le contrat réseau détaillé suit l’architecture adoptée.
- Les références de modèles sont centralisées ; les clés fournisseur Mistral et les facteurs de `mistral-small` et `mistral-large` doivent se résoudre avant publication. Si un import ne révèle pas fiablement le mode Mistral, la personne le choisit.
- Le noyau fonctionnel pur, le Worker local de tokenisation, les catalogues immuables versionnés et la séparation des couches suivent l’architecture adoptée.
- Les valeurs internes en Wh, gCO₂e et L restent non arrondies ; seul l’affichage choisit les unités et arrondit à trois chiffres significatifs au plus selon `EXPERIENCE.md`. Les totaux partent des valeurs internes ; zéro, sous-seuil, changement d’unité après arrondi et dépassement de l’unité maximale sont traités.
- Aucune valeur invalide, donnée indispensable absente ou division indéfinie ne produit un résultat présenté comme calculé.
- Le risque de sécheresse est catégoriel, affiché seulement au total, non additif et non proportionnel au volume d’eau.
- `DESIGN.md` et `EXPERIENCE.md` gouvernent l’expérience Canopée claire et priment sur les quatre maquettes statiques. Dialogues, annonces, focus, états textuels, cibles de 44 × 44 px, reflow à 320 px et zooms 200 % et 400 % suivent `EXPERIENCE.md`. Sa mention de CorsProxy décrit l’ancien état d’AD-8 ; l’architecture actualisée du 23 septembre fixe le Worker comme destination.

## Non-goals

- Compte, connexion, persistance de session, clé API, tokenisation distante ou télémétrie.
- Import publié d’un partage ChatGPT, Claude ou Gemini ; ces chatbots restent disponibles en saisie manuelle.
- Estimation du raisonnement invisible, fourchette d’incertitude, Scope 3, fabrication/amortissement des équipements, eau de production électrique ou équivalence de volume d’eau.
- Traitement natif d’images, audio ou vidéo, plusieurs artifacts distincts dans un échange, déplacement des blocs ou conseils personnalisés.

## Success signal

- Avant publication, démontrer les deux voies d’accueil ; choix direct des modèles ChatGPT et Mistral ; refus local et à la passerelle d’un lien non Mistral ; consentement avant réseau ; prévisualisation et remplacement confirmé ; calculs individuels et bilan ; péremption, restauration et repli Monde. Vérifier formules et unités sur des valeurs représentatives, focus et annonces, clavier, 320 px et zooms 200 % et 400 %.
- Après lancement, Felix reçoit des retours positifs par e-mail ou LinkedIn sur la compréhension des résultats et des conseils.

## Open Questions

- Les seuils et cas extrêmes du formatage définis dans `EXPERIENCE.md` sont-ils validés sur les données réelles avant livraison ?
- Les conditions de traitement, de métadonnées et de conservation du Worker sont-elles documentées et revues avant publication de l’import Mistral (D-4) ?
