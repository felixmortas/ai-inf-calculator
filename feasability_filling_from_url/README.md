# Extracteur de partage ChatGPT

Ce script autonome lit les données rendues publiquement par une URL de partage ChatGPT, sans cookie ni authentification. Il n’essaie jamais de contourner un accès protégé.

```sh
python3 extract_chatgpt_share.py 'https://chatgpt.com/share/6aae66d2-b4d0-83ed-b2ca-6de334f1a27d' --output-dir /private/tmp/chatgpt-share-check
```

La seule URL acceptée est `https://chatgpt.com/share/<id>`. Chaque requête possède un délai, un user-agent explicite et une limite de taille. Les ressources ne sont considérées que lorsqu’une URL figure dans le contenu conversationnel public : le HTML brut n’est pas exploré à la recherche d’URLs d’artifacts. Les hôtes locaux, adresses privées, loopback, link-local et réservées sont refusés ; les redirections ne sont jamais suivies et sont seulement inventoriées.

Le répertoire de sortie contient :

- `conversation.txt` : messages ordonnés et préfixés par leur rôle.
- `conversation.json` : messages, chemin du parseur retenu, avertissements et inventaire des ressources.
- `manifest.json` : inventaire indépendant des téléchargements, refus, références de fichiers et types non pris en charge.
- `resources/` : fichiers publiquement téléchargeables et transcriptions UTF-8 quand elles sont autorisées.

Les fichiers texte (notamment texte brut, Markdown et JSON) sont transcrits. Les PDF nécessitent facultativement `pypdf` (`python3 -m pip install pypdf`) ; un PDF scanné ou sans texte est signalé, jamais présenté comme certain. Les binaires, pages HTML applicatives, redirections de connexion et réponses 401/403 restent inventoriés sans contenu. L’exploration est aussi plafonnée à 25 ressources et 50 Mio de données conservées ; les éléments écartés par ces limites restent visibles dans le manifeste.

Une citation telle que `fileciteturn0file0L12-L18` identifie un fichier mentionné dans le partage, mais n’est pas une URL de téléchargement publique. Elle est donc inscrite dans `file_references` comme non accessible ; le script ne tente pas de deviner ni de contourner son accès.

Exécuter les tests sans accès réseau :

```sh
python3 -m unittest discover -s tests -v
```
