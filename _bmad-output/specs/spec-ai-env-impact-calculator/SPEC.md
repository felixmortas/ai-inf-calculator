---
id: SPEC-ai-env-impact-calculator
companions:
  - functional-contract.md
  - calculation-contract.md
  - ../../planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/ux-designs/ux-ai-env-impact-calculator-2026-09-23/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-ai-env-impact-calculator-2026-09-23/EXPERIENCE.md
sources:
  - ../../../docs/methodology/fr.md
  - ../../planning-artifacts/prds/prd-ai-env-impact-calculator-2026-09-17/prd.md
  - ../../planning-artifacts/prds/prd-ai-env-impact-calculator-2026-09-17/addendum.md
  - ../../planning-artifacts/sprint-change-proposal-2026-09-23.md
  - ../../planning-artifacts/sprint-change-proposal-2026-10-07.md
---

> **Source de vérité méthodologique.** `docs/methodology/fr.md` est l’unique référence pour le périmètre, les données et les calculs d’impact. Cette SPEC et `calculation-contract.md` en déclinent les exigences produit sans la remplacer ; en cas d’écart, la méthodologie prévaut.

# Calculateur d’empreinte environnementale de l’inférence des LLM

## Why

Le grand public manque d’un moyen compréhensible et respectueux de sa vie privée pour estimer l’empreinte d’une conversation déjà tenue avec un chatbot. La page publique française de `felixmortas.com` rend visibles des estimations d’énergie, d’eau et de carbone et des pratiques plus sobres. La conception Canopée claire du 23 septembre 2026 fixe le parcours de lancement après les epics 1 à 5.

## Capabilities

- **CAP-1 — Configurer une conversation**
  - **intent:** La personne choisit son chatbot à la première étape, sait pourquoi on le lui demande, et peut corriger le modèle déduit pour toute sa conversation.
  - **success:** Les chatbot ne proposant pas de choisir le modèle proposent un modèle de référence en fonction du type d'abonnement ou du mode d'utilisation du chatbot. Ces références sont signalées comme estimations modifiables ; tout modèle valide du chatbot reste sélectionnable.
- **CAP-2 — Saisir et reconstruire les échanges**
  - **intent:** La personne saisit, relit et corrige les questions / réponses d’une conversation, leurs textes et les versions complètes du contenu du fichier créé par l’IA (artifact).
  - **success:** Le fil ordonne les échanges, replie les anciens et garde l’éditeur courant ouvert ; au moins un texte suffit pour calculer un échange. Un bloc vide ne s’affiche pas comme une erreur ; les blocs entièrement vides sont ignorés ; l’historique et la dernière version d’artifact sont reconstruits dans l’ordre ; un artifact identique ajoute zéro token de sortie.
- **CAP-3 — Compter les tokens localement**
  - **intent:** Le calculateur peut compter chaque texte pris en charge sans l’envoyer hors du navigateur.
  - **success:** Tiktoken par défaut est employé, avec fallback `mots / 0,75` en cas d’échec ; texte vide et raisonnement non fourni comptent zéro.
- **CAP-4 — Estimer les impacts**
  - **intent:** La personne déclenche un seul calcul pour toute la conversation et consulte les résultats à l’endroit adapté.
  - **success:** Après le bouton « Calculer », chaque question / réponse montre carbone et eau dans son en-tête ; le résultat valide montre carbone, eau et électricité, avec les limites et incertitudes qualitatives de la méthode. Aucun intervalle chiffré n’est produit. Les formules, données et replis suivent la méthodologie canonique ; le total additionne les valeurs non arrondies à jour.
- **CAP-5 — Préserver la validité des résultats**
  - **intent:** La personne peut savoir qu’un résultat est périmé et le remettre à jour par un seul « Calculer ».
  - **success:** Toute modification invalide exactement les résultats dépendants et les signale par le texte « à recalculer » ; aucun calcul n’est automatique, « Calculer » recalcule et affiche tout, et aucun résultat périmé ou partiel n’est présenté comme actuel.
- **CAP-6 — Ajuster la session et les références géographiques**
  - **intent:** La personne peut modifier, à la première étape, les paramètres compréhensibles (pays utilisateur, douche, ampoule) dans un « Mode avancé » replié sous le choix du modèle, et les paramètres techniques (dont le pays d’hébergement) dans un « Mode expert » replié à l’intérieur du Mode avancé, puis restaurer les références.
  - **success:** Les surcharges n’affectent jamais les catalogues ni le prompt système ; il n’existe pas de bouton « Appliquer » : les valeurs valides sont appliquées à « Continuer » ou « Calculer », sans calcul. Restaurer ne calcule rien. Un changement du seul pays utilisateur ne périme que l’équivalence douche ; celui du pays d’hébergement périme les impacts concernés.
- **CAP-7 — Expliquer les résultats**
  - **intent:** La personne peut interpréter les estimations grâce à une équivalence carbone en douche chaude, à une comparaison d’électricité en durée d’ampoule LED de 5W, à une phrase d’interprétation neutre et à un conseil de sobriété.
  - **success:** Le résultat présente d’abord la douche, puis carbone, eau et électricité, la comparaison LED et l’interprétation, les limites d’une estimation d’usage en langage courant (électricité des serveurs, hors fabrication et entraînement) avec détail à la demande, le pays utilisateur indicatif et modifiable, et une bonne pratique.
- **CAP-8 — Entrer dans le parcours**
  - **intent:** La personne accède au choix de son IA, puis saisit ou colle manuellement une conversation.
  - **success:** L’accueil propose une phrase et un seul bouton pour commencer ; un indicateur d'étape est visible ; un bouton de retour libellé en haut à gauche conserve les textes ; le fil permet de « Changer d’IA ». La troisième étape (résultat) s’affiche sous la conversation sur la même page, sans nouvel écran. Un lien libellé « Méthodologie » mène au document de référence ; il n’y a ni tutoriel ni aide pas à pas.
- **CAP-9 — Partager le résultat**
  - **intent:** La personne peut partager un texte de résultats par un bouton unique.
  - **success:** Un bouton « Partager » ouvre le partage du système, ou copie le texte à défaut, avec un texte prérempli (chatbot utilisé, nombre d'échanges de la conversation, équivalence douche, valeurs principales avec unités, mention d’estimation et adresse de la page), sans aucun contenu de conversation, sans donnée dans l’URL de la page, sans analytics.
- **CAP-10 — Parler un langage grand public**
  - **intent:** La personne comprend chaque libellé sans connaissance technique.
  - **success:** Remplacement du vocabulaire technique ; toute action a un libellé visible ; l’état d’actualité met en évidence un résultat à jour (« ✓ ») ou « à recalculer ».

## Constraints

- Application monopage française, accessible au clavier et sur mobile, publiée statiquement à `/ai-inf-calculator/` sur GitHub Pages, sans compte ni serveur applicatif de calcul.
- Les textes, résultats et choix restent dans la session navigateur : aucun stockage durable, analytics, contenu dans URL ou API de tokenisation. La tokenisation et les calculs restent locaux.
- Les références de modèles sont centralisées ; les clés fournisseur Mistral et les facteurs de `mistral-small` et `mistral-large` doivent se résoudre avant publication. La personne choisit le mode Mistral lors de la configuration manuelle.
- Le noyau fonctionnel pur, le Worker local de tokenisation, les catalogues immuables versionnés et la séparation des couches suivent l’architecture adoptée.
- Les valeurs internes en Wh, gCO₂e et L restent non arrondies ; seul l’affichage choisit les unités et arrondit à trois chiffres significatifs au plus selon `EXPERIENCE.md`. Les totaux partent des valeurs internes ; zéro, sous-seuil, changement d’unité après arrondi et dépassement de l’unité maximale sont traités.
- Aucune valeur invalide, donnée indispensable absente ou division indéfinie ne produit un résultat présenté comme calculé ; une puissance LED nulle rend la comparaison non calculable.
- Chaque étape a une seule action principale, toujours visible ; la barre d’action collante devient statique à fort zoom ou en hauteur réduite et ne masque jamais le focus.
- Le pays utilisateur est déduit de la langue du navigateur, sans géolocalisation ni serveur ; le tirage de la bonne pratique est local et injectable en test.
- `DESIGN.md` et `EXPERIENCE.md` gouvernent l’expérience Canopée claire et priment sur les trois maquettes statiques. Annonces, focus, états textuels, cibles de 44 × 44 px, reflow à 320 px et zooms 200 % et 400 % suivent `EXPERIENCE.md`.

## Non-goals

- Compte, connexion, persistance de session, clé API, tokenisation distante ou télémétrie.
- Estimation du raisonnement invisible, fourchette d’incertitude, Scope 3, fabrication/amortissement des équipements, eau de production électrique ou équivalence de volume d’eau.
- Traitement natif d’images, audio ou vidéo, plusieurs artifacts distincts dans un échange, déplacement des blocs ou conseils personnalisés.
- Partage du contenu de la conversation, tutoriel ou aide pas à pas, comparaison de l’eau, géolocalisation par le navigateur, calcul d’un seul échange ou recalcul du seul total.

## Success signal

- Avant publication, démontrer l’accueil, les étapes, l’absence de bouton « Appliquer », le résultat hiérarchisé avec comparaison LED, l'affichage d’une bonne pratique et le partage système sans contenu de conversation ; l’entrée manuelle ; choix direct des modèles ChatGPT et Mistral ; calcul unique et résultat sous la conversation ; péremption, restauration et le recours au facteur carbone Monde lorsque le facteur pays manque, selon la méthodologie. Vérifier formules et unités sur des valeurs représentatives, focus et annonces, clavier, 320 px et zooms 200 % et 400 %.
- Après lancement, Felix reçoit des retours positifs par e-mail ou LinkedIn sur la compréhension des résultats et des conseils.

## Open Questions

- Les seuils et cas extrêmes du formatage définis dans `EXPERIENCE.md` sont-ils validés sur les données réelles avant livraison ?
