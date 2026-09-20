# Importer un partage ChatGPT

Le calculateur accepte uniquement un lien public strictement au format `https://chatgpt.com/share/<id>`. Il analyse une seule réponse publique dans le navigateur, puis affiche une prévisualisation avant toute modification de la conversation.

Si la session contient déjà un échange renseigné, le remplacement doit être confirmé. Annuler, une URL invalide, un refus CORS, une erreur réseau ou un format public inconnu ne modifient jamais les échanges ni leurs résultats.

Les limites CORS du navigateur peuvent empêcher la lecture de certains partages. Les artifacts `sandbox:/mnt/data/...` et les citations de fichiers sont signalés sans téléchargement : collez le contenu d’un artifact dans son champ correspondant.

## Import distant exceptionnel via corsproxy.io

Lorsqu’un partage public ne peut pas être lu directement par le navigateur, vous pouvez choisir, pour **une requête précise**, de le faire récupérer par le fournisseur tiers [corsproxy.io](https://corsproxy.io/). Cette exception est facultative : le dialogue affiche l’URL exacte qui sera transmise et ne lance aucune requête avant votre confirmation. Une modification de l’URL, un refus ou une annulation annule ce consentement ; il faut confirmer à nouveau pour une nouvelle requête.

La seule donnée métier transmise est l’URL publique ChatGPT validée, sous la forme `https://chatgpt.com/share/<id>`. La requête peut également comporter la clé de configuration CorsProxy de cette instance, utilisée par le fournisseur pour autoriser le service ; ce n’est ni une donnée de session ni un contenu de votre conversation. Le calculateur n’envoie pas vos blocs locaux, fichiers, résultats, paramètres de calcul, cookies applicatifs ou autres données de session. Comme pour toute requête web, le fournisseur peut aussi recevoir des métadonnées telles que votre adresse IP et votre agent utilisateur.

CorsProxy récupère la page publique pour la renvoyer au navigateur ; l’extraction des messages se fait ensuite localement, comme du texte non exécutable. Consultez sa [documentation](https://corsproxy.io/), sa [politique de confidentialité](https://corsproxy.io/privacy-policy) et ses [conditions de service](https://corsproxy.io/terms-of-service) avant d’accepter. Ces documents et cette aide décrivent l’exception, mais ne permettent pas de garantir comment le tiers traite ou conserve le contenu de la page : ne partagez donc pas un lien que vous ne souhaitez pas exposer à ce fournisseur.

Cette intégration est soumise à revue et peut être désactivée si la politique ou la disponibilité du tiers ne convient plus. Une erreur du proxy, une configuration absente ou son indisponibilité ne modifie pas votre session et ne bloque jamais l’import manuel : vous pouvez toujours recopier les messages et réponses dans les champs de conversation locaux.

Pour compter un fichier source cité, ajoutez-le au bloc concerné avec le champ « Fichiers source locaux ». Sont acceptés les textes UTF-8 de 5 Mio maximum : `.txt`, `.md`, `.markdown`, `.json`, `.csv`, `.log`, `.py`, `.js`, `.ts`, `.html`, `.xml`, `.yaml`, `.yml`, les types `text/*` et `application/json`. Le fichier est lu uniquement dans la mémoire de cette session de navigateur, n’est jamais envoyé ni conservé à la fermeture de la page. Pour les formats exclus, les fichiers illisibles ou plus volumineux, collez le contenu pertinent dans Message ou Artifact.
