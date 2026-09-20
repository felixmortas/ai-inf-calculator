# Epic 5 Context: Importer un partage via un intermédiaire tiers consenti

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettre l’import d’un partage ChatGPT public lorsque la personne y consent explicitement, tout en préservant le principe de confidentialité locale : seul le lien canonique validé peut être envoyé à `corsproxy.io`, avant toute requête. La personne doit pouvoir comprendre cette exception, la refuser sans effet sur sa session et continuer avec l’import manuel.

## Stories

- Story 5.1: Consentir à l’import distant avant toute requête
- Story 5.2: Récupérer un partage par une passerelle tiers bornée
- Story 5.3: Documenter et vérifier la frontière d’import distant

## Requirements & Constraints

L’application reste une page statique compatible GitHub Pages, sans serveur complémentaire, compte, stockage durable, analytics ni journalisation distante. Les messages, réponses, raisonnements visibles, artifacts, fichiers locaux, calculs et paramètres restent dans la mémoire du navigateur par défaut.

L’exception d’import est limitée à une URL de partage ChatGPT publique et canonique déjà validée. Avant chaque requête, la personne doit donner un consentement explicite, ponctuel et non pré-coché pour l’URL courante. Le refus, l’annulation, `Escape` ou la modification de l’URL invalide cette autorisation : aucune requête ni mutation de session ne doit avoir lieu. Une voie d’import manuel reste disponible à tout moment, sans requête au tiers.

Le consentement explique le fournisseur, la finalité, l’URL qui sera transmise, les métadonnées susceptibles d’être reçues par le fournisseur — notamment l’adresse IP et l’agent utilisateur — ainsi que les données locales exclues. Il ne doit pas prétendre que le tiers ne traite jamais la page ou son contenu. Les contrôles sont utilisables au clavier, avec focus visible, libellés français explicites et comportement adapté aux petits écrans.

Les échecs de consentement, de politique, réseau, HTTP, délai, taille, configuration ou format sont sans effet partiel : aucun HTML ou import partiel n’est appliqué, la session est conservée et le parcours manuel est proposé. L’aide doit présenter le tiers, ses documents, les données exposées et les incertitudes, et maintenir la solution manuelle si l’exception doit être désactivée. Les tests doivent prouver l’absence de trafic avant consentement, après refus, annulation ou changement d’URL, ainsi que l’absence de données locales dans toute requête consentie.

## Technical Decisions

`application/import/remoteGateway` est l’unique frontière autorisée pour une requête d’import distant ; ni le domaine de calcul ni l’interface ne doivent appeler directement le réseau. Il ne reçoit que l’URL ChatGPT validée et le consentement courant ; ses erreurs attendues sont typées, sous forme d’union discriminée avec un `code` et un contexte non sensible.

L’origine de production est strictement allowlistée à `https://corsproxy.io/`. Aucune origine, chemin de proxy ou redirection ne provient d’une entrée utilisateur. La configuration de cette frontière doit rester isolée afin de pouvoir remplacer le fournisseur sans modifier le domaine, le parseur local ou l’interface de consentement. Une éventuelle clé dans une application statique n’est pas un secret ; la protection dépend aussi de l’autorisation de domaine, des plafonds fournisseur, de la validation et des limites applicatives.

La requête ne contient jamais de blocs, fichiers, résultats, catalogues, paramètres de calcul, état du reducer, cookies applicatifs, jetons de session ou secrets. La réponse HTML est soumise à des limites de délai et de taille, traitée localement comme texte non exécutable par l’extracteur existant, sans exécution, suivi de liens, téléchargement d’artifacts ou de ressources citées. Les actions du reducer restent les seules mutations de session.

L’autorisation est liée à une URL précise et ne doit pas être réutilisée pour une nouvelle saisie. Les erreurs ou réponses qui ne satisfont pas les contrôles de frontière doivent laisser l’état courant intact. La disponibilité du proxy ne conditionne ni l’import manuel/local ni les calculs d’impact déjà présents dans le navigateur.

## UX & Interaction Patterns

Pour une URL valide, l’action d’analyse ouvre d’abord un dialogue de consentement accessible et déplace le focus vers lui. Le dialogue identifie `corsproxy.io`, explique qu’il récupère la page publique, affiche l’URL transmise, les métadonnées possibles et les données locales non envoyées. Il propose « Continuer avec corsproxy.io », « Annuler » et un lien « Importer manuellement ». `Escape` et Annuler ferment le dialogue sans requête ; changer l’URL impose de recommencer le consentement.

Le choix d’import manuel doit mener au parcours local plutôt que de bloquer l’utilisateur dans le dialogue. Les retours d’erreur restent compréhensibles, associés à l’action concernée et ne reposent pas uniquement sur la couleur ; ils rappellent que les données déjà saisies sont conservées dans la session.

## Cross-Story Dependencies

Story 5.1 établit l’autorisation ponctuelle et le parcours alternatif que Story 5.2 doit obligatoirement vérifier avant toute requête. Story 5.2 fournit la frontière, les erreurs et les garanties de minimisation que Story 5.3 documente et couvre par des tests d’intégration. L’import distant réutilise le validateur d’URL ChatGPT et l’extracteur local existants ; il ne modifie pas les règles de calcul, de tokenisation ou de persistance de session.
