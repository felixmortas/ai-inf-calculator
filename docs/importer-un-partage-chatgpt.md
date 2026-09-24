# Importer un partage Mistral

Le calculateur accepte uniquement les liens publics `https://chat.mistral.ai/chat/<UUID>`. L’UUID suit la forme `8-4-4-4-12` en chiffres hexadécimaux. Le navigateur refuse localement les autres fournisseurs, les ports, les paramètres de requête, les fragments et les URL mal formées, avant toute requête réseau. La saisie manuelle reste accessible.

## Consentement et prévisualisation

Le dialogue de consentement affiche l’URL canonique entière et l’endpoint Worker actif. L’accord est ponctuel et lié à ces deux valeurs ; une modification exige un nouvel accord. Après consentement, le navigateur envoie un seul `POST` à l’endpoint affiché, avec pour seul corps JSON `{ "shareUrl": "<URL canonique>" }`. Aucun bloc local, fichier, résultat, catalogue, paramètre de calcul, cookie applicatif ou jeton de session n’est envoyé dans cette requête.

En production, l’endpoint est `https://ai-inf-calculator-proxy.felix-mortas.workers.dev/v1/import-html`. Une build preview peut fournir `VITE_IMPORT_HTML_WORKER_URL` lors du build, sous la forme `https://<préfixe>-ai-inf-calculator-proxy.felix-mortas.workers.dev/v1/import-html`. Une autre destination désactive l’import distant.

Le Worker reçoit l’URL et peut recevoir des métadonnées réseau, notamment l’adresse IP et l’agent utilisateur. Il traite la page publique et peut suivre des redirections. Le navigateur borne sa lecture à 10 secondes et 2 Mio, vérifie qu’il reçoit un document HTML complet, puis extrait localement les échanges comme des données non exécutables. Une prévisualisation précède tout ajout au fil. Si le fil contient déjà du texte, un second dialogue demande confirmation avant le remplacement atomique. Aucun calcul ne démarre automatiquement. La personne choisit ensuite explicitement le mode Mistral rapide ou réflexion et peut encore changer de modèle.

Une URL invalide, un refus, une annulation, une erreur réseau, une réponse trop grande ou un format inconnu laissent le fil intact. Si la page ne contient aucun échange exploitable, aucun ajout n’a lieu.

## Limite de vérification avant publication (D-4)

Le code du Worker externe n’est pas présent dans ce dépôt. Ses garanties internes restent à vérifier avant publication : destinations et redirections réellement admises, délai et volume de récupération, journalisation, conservation de l’URL, de la page et des métadonnées réseau. Les contrôles du navigateur ci-dessus ne permettent pas d’attester ces points.

Pour compter un fichier source cité dans une conversation, ajoutez-le au bloc concerné avec « Fichiers source locaux ». Les textes UTF-8 de 5 Mio maximum sont lus uniquement dans la mémoire du navigateur. Pour les formats exclus ou les fichiers illisibles, collez le contenu pertinent dans « Question de la personne » ou « Document ou code généré ».
