# Epic 4 Context: Ajuster les hypothèses et comprendre les résultats

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Permettre à la personne d’adapter en session les hypothèses qui déterminent les résultats, de revenir aux références sans perdre sa conversation, puis de comprendre le carbone par une équivalence de douche locale et des conseils de sobriété. Les résultats doivent rester traçables : une modification ne déclenche jamais de calcul, mais rend périmés exactement les résultats qui en dépendent.

## Stories

- Story 4.1: Choisir le pays d’hébergement et gérer les données manquantes
- Story 4.2: Personnaliser et restaurer les paramètres de calcul
- Story 4.3: Interpréter le carbone par une durée de douche locale
- Story 4.4: Découvrir des bonnes pratiques de sobriété

## Requirements & Constraints

Le pays d’hébergement par défaut est défini par le fournisseur et le modèle sélectionnés. L’utilisateur peut le modifier dans les paramètres avancés ; il s’applique à toute la conversation pour l’énergie, le carbone, l’eau et le risque de sécheresse. Il est strictement distinct du pays utilisateur, lequel ne sert qu’à l’équivalence douche. Tout changement d’hébergement rend périmés les impacts et totaux dépendants sans recalcul automatique.

Une donnée environnementale manquante pour un pays utilise uniquement la valeur « Monde » du même facteur, et ce repli doit être signalé avec le résultat concerné sans modifier le pays choisi. Une valeur numérique zéro est valide. Si ni la valeur pays ni le repli Monde, une donnée catalogue indispensable, ou une surcharge valide ne sont disponibles, bloquer le résultat dépendant avec un message explicite et ne rien inventer.

Les paramètres avancés sont globaux à la conversation, temporaires et affichent noms et unités. Ils couvrent les paramètres modèle, énergie et latence, matériel, batch, ratios de tokens, facteurs environnementaux, conversion mots/tokens et référence douche ; les tokens de prompt système restent exclusivement issus du catalogue, invisibles et non modifiables. Toute valeur invalide bloque le résultat dépendant : non numérique, infinie, hors domaine, diviseur non positif, PUE inférieur à 1 ou paramètres actifs supérieurs aux paramètres totaux. Rétablir les valeurs par défaut restaure les références du chatbot et modèle courants, mais conserve textes, blocs, chatbot et modèle.

L’équivalence douche porte uniquement sur le carbone, reste une estimation et n’est pas une comparaison du volume d’eau. Le pays utilisateur est proposé sans donnée externe par table locale fuseau IANA-vers-pays, puis locale navigateur, sinon Monde ; il est indicatif, visible et corrigeable. Les émissions par minute nulles rendent la durée non calculable, sans division par zéro ni infini.

Les conseils suivent les résultats, sont identiques pour tous, non personnalisés et extensibles. Ils couvrent petit modèle, réduction du raisonnement, tokens entrants et sortants, relance d’une conversation et édition d’un message lorsque pertinent. Leur formulation est accessible, ne confond pas raisonnement affiché et activation du raisonnement du chatbot, et ne promet aucun gain chiffré ou systématique. L’interface et les erreurs sont en français, accessibles au clavier et sur petit écran, avec focus visible et états périmés/non calculables non signalés seulement par la couleur.

## Technical Decisions

Conserver les catalogues locaux versionnés, datés, validés avant build et associés à leur provenance ; ils restent immuables. Une fonction de domaine unique résout les paramètres selon une clé normalisée, la valeur du pays choisi, le repli Monde du même facteur, puis une surcharge de session autorisée, en retournant aussi le statut de repli ou d’indisponibilité. Les pays utilisent des codes ISO 3166-1 alpha-2.

Le domaine est synchrone, déterministe et indépendant de React, du navigateur et des fichiers catalogue ; l’application assemble les cas d’usage et le reducer React est le seul propriétaire des mutations de session. Les surcharges construisent une vue de paramètres résolus en mémoire, sans muter les catalogues ni persister la session. Les résultats utilisent des empreintes canoniques : `impactFingerprint` inclut les paramètres d’impact résolus ; `showerFingerprint` ajoute pays utilisateur et paramètres douche. Ainsi, un changement douche ne périme que les équivalences. Les calculs conservent les valeurs non arrondies en Wh, gCO2e et L ; l’affichage seul les formate.

Tous les textes utilisateur passent par des catalogues de messages typés ; `fr-FR` est la locale initiale et `Intl` sert au formatage. Les identifiants, unités internes, formules, données et empreintes sont indépendants de la langue.

## UX & Interaction Patterns

La section « Paramètres avancés » est discrète afin que le parcours principal reste utilisable avec les références. Elle permet de consulter, modifier et rétablir les paramètres, avec unités, validations associées aux champs et explications lorsqu’un résultat est bloqué ou utilise Monde. Le pays utilisateur est explicitement présenté comme indicatif. Les résultats affichent l’incertitude des hypothèses, leur état périmé et les conseils accessibles après eux.

## Cross-Story Dependencies

Les stories 4.1 et 4.2 fournissent les paramètres résolus et la péremption sélective utilisés par les calculs de l’epic 3. La story 4.3 dépend d’un carbone valide de bloc ou de total, mais ses changements ne doivent pas invalider les impacts. La story 4.4 dépend seulement de résultats consultables et ne personnalise pas son contenu à la conversation.
