---
id: SPEC-import-chatgpt-share
companions:
  - import-contract.md
  - ../spec-ai-env-impact-calculator/SPEC.md
  - ../spec-ai-env-impact-calculator/functional-contract.md
  - ../../planning-artifacts/architecture/architecture-ai-env-impact-calculator-2026-09-18/ARCHITECTURE-SPINE.md
sources:
  - ../../../feasability_filling_from_url/README.md
  - ../../../feasability_filling_from_url/chatgpt-share-output/conversation.json
---

> **Contrat canonique.** Cette SPEC et ses compagnons constituent le contrat complet, validé pour la préservation, à construire et tester. Elle complète le calculateur existant ; l’import distant est une exception limitée au parcours local par défaut, activée uniquement après consentement explicite.

# Importer une conversation partagée

## Why

La saisie manuelle d’une conversation est longue et oublie facilement les traces visibles de raisonnement, d’outils et d’artifacts qui influencent le calcul. Une personne qui possède un lien public ChatGPT doit pouvoir préremplir fidèlement les échanges calculables, y compris lorsque CORS impose une récupération via un tiers, tout en gardant le calculateur statique, local par défaut et honnête sur les données communiquées ainsi que sur ce que le partage ne rend pas accessible.

## Capabilities

- **CAP-1 — Importer un partage public**
  - **intent:** La personne peut fournir une URL de partage ChatGPT canonique pour obtenir sa conversation publique dans le calculateur.
  - **success:** Seule `https://chatgpt.com/share/<id>` est acceptée ; après le consentement requis pour la voie distante, une lecture réussie crée une prévisualisation importable. Tout refus de consentement, réseau, politique, délai, taille ou format est expliqué sans importer de données partielles comme certaines.
- **CAP-2 — Reconstituer les échanges visibles**
  - **intent:** Le calculateur convertit les messages publics ordonnés en blocs existants en séparant message, raisonnement visible et réponse finale.
  - **success:** Chaque texte utilisateur devient `Message` ; les traces reconnues entre ce message et la réponse assistant terminale sont concaténées dans `Raisonnement visible`, et cette réponse va dans `Réponse finale`, conformément aux règles de `import-contract.md`.
- **CAP-3 — Rendre visibles les contenus non récupérables**
  - **intent:** La personne est avertie lorsqu’un partage référence un artifact ou des fichiers source dont le texte ne peut pas être importé.
  - **success:** Chaque artifact `sandbox:/mnt/data/...` détecté affiche une invitation à coller son contenu ; chaque citation de fichier d’entrée détectée affiche une invitation à l’uploader, sans prétendre avoir lu l’un ou l’autre.
- **CAP-4 — Compter les pièces jointes source localement**
  - **intent:** La personne peut ajouter à un échange les fichiers texte qu’elle avait fournis au chatbot, afin que leur contenu compte comme entrée.
  - **success:** Les fichiers pris en charge sont lus, conservés et tokenisés exclusivement dans le navigateur avec le Worker Tiktoken/fallback existant ; leurs tokens entrent dans l’historique et l’impact de l’échange sans double comptage.
- **CAP-5 — Préparer l’extension aux fournisseurs**
  - **intent:** Le calculateur sépare le parcours commun d’import des adaptateurs propres à ChatGPT, Claude, Gemini ou Mistral.
  - **success:** La V1 ne distribue et ne sélectionne que l’adaptateur ChatGPT ; un fournisseur futur peut déclarer validation d’URL, lecture, extraction et règles de classement sans modifier les blocs, la tokenisation, les avertissements de contenus inaccessibles ni le parcours commun.
- **CAP-6 — Consentir à l’exception d’import distant**
  - **intent:** La personne peut décider en connaissance de cause si l’URL de son partage public est transmise à l’intermédiaire tiers nécessaire à sa récupération.
  - **success:** Avant chaque requête distante, l’interface identifie `corsproxy.io`, sa finalité, l’URL envoyée et les métadonnées de requête qu’il peut recevoir ; l’action « Continuer avec corsproxy.io » est explicite et non pré-cochée. Refus, annulation, `Escape` ou changement d’URL ne déclenchent aucune requête et la voie manuelle reste disponible.

## Constraints

- Publication statique GitHub Pages, sans compte ni serveur détenu par le projet. La seule voie proxy de production est `https://corsproxy.io/`, allowlistée et transitoire ; elle ne peut être appelée qu’après consentement ponctuel pour l’URL ChatGPT déjà validée. Son mécanisme de clé API et d’autorisation de domaine est configuré hors entrée utilisateur ; une clé embarquée n’est pas considérée comme un secret.
- Par défaut, l’URL, le HTML public, les messages extraits et les fichiers restent seulement en mémoire de la session, sans stockage durable, analytics, journal distant ni contenu en URL. L’exception distante transmet uniquement l’URL canonique au proxy ; aucun bloc local, fichier, résultat, catalogue, paramètre de calcul, cookie applicatif ou jeton de session ne lui est transmis.
- Le fournisseur peut recevoir l’URL, l’adresse IP, l’agent utilisateur et des métadonnées de requête. Ses politiques peuvent impliquer le traitement de la page récupérée : le produit ne promet ni absence de traitement ni absence de conservation sans engagement vérifié. Une évolution de ses documents déclenche la revue D-4 et peut désactiver cette voie.
- Le parseur n’exécute aucun code, ne rend aucun HTML distant, accepte un volume borné, conserve l’ordre public et n’invente jamais un contenu redacted, un fichier cité ou un artifact inaccessible.
- L’ajout de pièces jointes étend les dépendances de tokenisation, d’historique et de fraîcheur sans modifier les règles de calcul ni la séparation domaine pur / application / UI / Worker.
- Un contrat d’adaptateur isole les particularités de partage et de parsing par fournisseur ; aucun `if` dépendant de ChatGPT ne doit se répandre dans le reducer, le domaine de calcul ou l’UI des blocs.

## Non-goals

- Contourner des protections d’accès, une authentification ou des droits de téléchargement de ChatGPT, ni récupérer le raisonnement invisible ou le contenu non public. La passerelle consentie ne suit aucune URL, artifact ou ressource citée.
- Livrer un adaptateur Claude, Gemini ou Mistral dans la V1, exporter une conversation, synchroniser la session, ni télécharger ou lire automatiquement un artifact.
- Garantir l’extraction de PDF, DOCX, images, audio, vidéo ou binaire : seuls les formats que le navigateur peut lire comme texte UTF-8 sont comptés dans cette itération.

## Success signal

- Sur les deux liens de faisabilité, l’import reconstitue les messages utilisateur, les réponses finales et les traces visibles dans le bon échange ; il signale la citation de fichier d’entrée et l’artifact sans en inventer le contenu.
- Une personne peut refuser la voie distante sans requête, ou consentir puis importer, compléter par upload/collage ce qui manque et lancer les mêmes calculs locaux qu’après une saisie manuelle. Seule l’URL validée est communiquée à `corsproxy.io`; aucun contenu ou état local ne l’est.

## Assumptions

- L’import remplace les blocs de session après une confirmation explicite, car cette opération modifie une saisie éphémère existante.

## Open Questions

- Quels formats non textuels (PDF, DOCX, image, audio) doivent recevoir un extracteur strictement local dans une itération ultérieure ?
