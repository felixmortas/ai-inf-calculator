# Importer un partage ChatGPT

Le calculateur accepte uniquement un lien public strictement au format `https://chatgpt.com/share/<id>`. Il analyse une seule réponse publique dans le navigateur, puis affiche une prévisualisation avant toute modification de la conversation.

Si la session contient déjà un échange renseigné, le remplacement doit être confirmé. Annuler, une URL invalide, un refus CORS, une erreur réseau ou un format public inconnu ne modifient jamais les échanges ni leurs résultats.

Les limites CORS du navigateur peuvent empêcher la lecture de certains partages. Les artifacts `sandbox:/mnt/data/...` et les citations de fichiers sont signalés sans téléchargement : collez le contenu d’un artifact dans son champ correspondant. L’import de fichiers locaux est traité séparément ; ne supposez jamais qu’un fichier cité est accessible.
