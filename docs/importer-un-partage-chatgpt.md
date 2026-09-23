# Importer une conversation partagée

Le calculateur accepte les liens publics aux formats suivants :

- ChatGPT : `https://chatgpt.com/share/<UUID>`
- Claude : `https://claude.ai/share/<UUID>`
- Mistral : `https://chat.mistral.ai/chat/<UUID>`
- Gemini : `https://share.gemini.google/<ID>` où l’ID comporte exactement 12 caractères alphanumériques.

Les URL doivent être exactement sous ces formes, sans port, paramètre de requête ni fragment. Un UUID suit la forme `8-4-4-4-12` en chiffres hexadécimaux. L’analyse locale du lien précède toute requête réseau.

## Import distant via le Worker

Après votre consentement explicite pour ce lien précis, le navigateur envoie un seul `POST` à l’endpoint d’import HTML du Worker du projet. Le corps JSON contient uniquement `{ "shareUrl": "<URL canonique>" }`. En production, l’endpoint est `https://proxy-felix.felix-mortas.workers.dev/v1/import-html`. Une build preview peut utiliser un hôte Worker preview concret fourni lors du build ; le dialogue affiche toujours l’endpoint effectivement utilisé.

Pour une build preview, fournissez l’endpoint réel dans `VITE_IMPORT_HTML_WORKER_URL` lors du build. Il doit suivre la forme `https://<préfixe>-proxy-felix.felix-mortas.workers.dev/v1/import-html` ; une valeur hors de ce contrat désactive l’import distant.

Le Worker récupère la page publique et gère automatiquement les éventuelles redirections du fournisseur. Le calculateur ne contrôle pas ces redirections. Le Worker reçoit l’URL de partage et peut recevoir des métadonnées réseau, notamment votre adresse IP et votre agent utilisateur. Il traite le contenu de la page pour fournir le service. Aucun bloc local, fichier, résultat, paramètre de calcul, cookie applicatif ou jeton de session n’est envoyé.

Le navigateur lit seulement une page HTML complète, avec une limite de 2 Mio et un délai de 10 secondes, puis extrait les échanges localement comme des données non exécutables. Une prévisualisation est affichée avant tout remplacement. Si la session contient déjà des échanges, le remplacement demande une confirmation supplémentaire.

Une URL invalide, un refus, une annulation, une erreur réseau, un dépassement de limite ou un format inconnu ne modifient jamais la session. Vous pouvez toujours saisir les échanges manuellement.

Pour compter un fichier source cité, ajoutez-le au bloc concerné avec le champ « Fichiers source locaux ». Les textes UTF-8 de 5 Mio maximum sont lus uniquement dans la mémoire du navigateur. Pour les formats exclus ou les fichiers illisibles, collez le contenu pertinent dans Message ou Artifact.
