# Importer un partage ChatGPT

Le calculateur accepte uniquement un lien public strictement au format `https://chatgpt.com/share/<id>`. Il analyse une seule réponse publique dans le navigateur, puis affiche une prévisualisation avant toute modification de la conversation.

Si la session contient déjà un échange renseigné, le remplacement doit être confirmé. Annuler, une URL invalide, un refus CORS, une erreur réseau ou un format public inconnu ne modifient jamais les échanges ni leurs résultats.

Les limites CORS du navigateur peuvent empêcher la lecture de certains partages. Les artifacts `sandbox:/mnt/data/...` et les citations de fichiers sont signalés sans téléchargement : collez le contenu d’un artifact dans son champ correspondant.

Pour compter un fichier source cité, ajoutez-le au bloc concerné avec le champ « Fichiers source locaux ». Sont acceptés les textes UTF-8 de 5 Mio maximum : `.txt`, `.md`, `.markdown`, `.json`, `.csv`, `.log`, `.py`, `.js`, `.ts`, `.html`, `.xml`, `.yaml`, `.yml`, les types `text/*` et `application/json`. Le fichier est lu uniquement dans la mémoire de cette session de navigateur, n’est jamais envoyé ni conservé à la fermeture de la page. Pour les formats exclus, les fichiers illisibles ou plus volumineux, collez le contenu pertinent dans Message ou Artifact.
