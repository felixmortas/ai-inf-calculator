# Epic 5 Context: Importer un partage via un intermédiaire tiers consenti

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettre l’import d’un partage public ChatGPT, Claude, Mistral ou Gemini après consentement explicite, tout en préservant la confidentialité locale : seul l’`outboundCanonicalUrl` du `ResolvedShare` attesté peut être envoyé à `corsproxy.io`. La personne peut refuser cette exception sans effet sur sa session et poursuivre l’import manuel.

## Stories et ordre de livraison

1. Story 5.4 — Ajouter les adaptateurs de partage multi-fournisseur.
2. Story 5.1 v2 — Consentir à l’import distant multi-fournisseur.
3. Story 5.2 v2 — Récupérer un partage multi-fournisseur par une passerelle bornée.
4. Story 5.3 v2 — Documenter et vérifier la frontière multi-fournisseur.

Les identifiants Epic 5 restent stables ; cet ordre `5.4 → 5.1 → 5.2 → 5.3` prévaut pour le dispatch. Les fiches `done` ChatGPT constituent l’historique du lot V1 et ne sont pas des tâches à réouvrir.

## Requirements & Constraints

L’application reste une page statique compatible GitHub Pages, sans serveur complémentaire, compte, stockage durable, analytics ni journalisation distante. Les messages, réponses, raisonnements visibles, artifacts, fichiers locaux, calculs et paramètres restent dans la mémoire du navigateur par défaut.

Le registre statique fermé résout exclusivement les URLs publiques canoniques de ChatGPT, Claude, Mistral et Gemini. Lui seul produit un `ResolvedShare` opaque, immuable et attesté, associant l’adaptateur, `providerId`, `canonicalUrl`, limites et `policyVersion`. Avant chaque requête, la personne donne un consentement explicite, ponctuel, non pré-coché et à usage unique pour cette même identité et l’origine proxy. Refus, annulation, `Escape`, modification d’URL, de fournisseur, d’adaptateur/politique, de limites ou de configuration proxy invalident l’autorisation sans requête ni mutation. Une voie d’import manuel reste disponible à tout moment.

Le consentement explique le fournisseur, la finalité, l’URL qui sera transmise, les métadonnées susceptibles d’être reçues par le fournisseur — notamment l’adresse IP et l’agent utilisateur — ainsi que les données locales exclues. Il ne doit pas prétendre que le tiers ne traite jamais la page ou son contenu. Les contrôles sont utilisables au clavier, avec focus visible, libellés français explicites et comportement adapté aux petits écrans.

Les échecs de consentement, politique, réseau, HTTP, redirection, délai, taille, configuration ou format sont sans effet partiel : aucun HTML ou import partiel n’est appliqué, la session est conservée et le parcours manuel est proposé. L’aide présente le tiers, ses documents, les données exposées, les incertitudes et les règles propres à chaque fournisseur. Les tests prouvent l’absence de trafic avant consentement, après refus, annulation ou changement d’identité, ainsi que l’absence de données locales dans toute requête consentie des quatre fournisseurs.

## Technical Decisions

`application/import/remoteGateway` est l’unique frontière autorisée pour une requête d’import distant ; ni le domaine de calcul, ni l’interface, ni un extracteur n’appellent directement le réseau. Il ne reçoit que le `ResolvedShare` attesté et le consentement courant correspondant, puis retrouve l’adaptateur, ses limites et sa politique par identité ; ses erreurs sont une union discriminée avec un `code` et un contexte non sensible.

L’origine de production est strictement allowlistée à `https://corsproxy.io/`. Méthode, chemin, paramètres, encodage, en-têtes, cache, référent et `credentials: omit` sont figés ; seule `outboundCanonicalUrl` est encodée. Les hôtes, chemins, queries, URL finale, redirections et limites proviennent de la politique de l’adaptateur attesté. Gemini peut suivre uniquement une chaîne allowlistée et bornée, attestée par le proxy ; toute autre redirection échoue. La configuration de cette frontière reste isolée afin de pouvoir remplacer le fournisseur sans modifier le domaine, le parseur local ou l’interface de consentement.

La requête ne contient jamais de blocs, fichiers, résultats, catalogues, paramètres de calcul, état du reducer, cookies applicatifs, jetons de session ou secrets. La réponse HTML est soumise à des limites de délai et de taille, traitée localement comme texte non exécutable par l’extracteur existant, sans exécution, suivi de liens, téléchargement d’artifacts ou de ressources citées. Les actions du reducer restent les seules mutations de session.

L’autorisation est liée par identité au `ResolvedShare`, à `policyVersion` et au proxy courant ; elle ne peut pas être réutilisée. Les erreurs ou réponses qui ne satisfont pas les contrôles de frontière laissent l’état courant intact. La disponibilité du proxy ne conditionne ni l’import manuel/local ni les calculs d’impact déjà présents dans le navigateur.

## UX & Interaction Patterns

Pour une URL résolue, l’action d’analyse ouvre un dialogue de consentement accessible et déplace le focus vers lui. Le dialogue identifie le fournisseur, `corsproxy.io`, la politique applicable, l’URL canonique transmise, les métadonnées possibles et les données locales non envoyées. Il propose « Continuer avec corsproxy.io », « Annuler » et « Importer manuellement ». `Escape` et Annuler ferment le dialogue sans requête ; tout changement d’identité ou de politique impose de recommencer le consentement.

Le choix d’import manuel doit mener au parcours local plutôt que de bloquer l’utilisateur dans le dialogue. Les retours d’erreur restent compréhensibles, associés à l’action concernée et ne reposent pas uniquement sur la couleur ; ils rappellent que les données déjà saisies sont conservées dans la session.

## Cross-Story Dependencies

Story 5.4 fournit le registre, les quatre adaptateurs, `ResolvedShare`, politiques, limites et fixtures. Story 5.1 v2 établit le consentement ponctuel qui y est lié. Story 5.2 v2 fournit la frontière réseau, les erreurs, la minimisation et les redirections attestées. Story 5.3 v2 documente cette frontière et couvre le parcours intégré des quatre fournisseurs. L’import distant ne modifie pas les règles de calcul, de tokenisation ou de persistance de session.
