# PRD Quality Review — Calculateur d’empreinte environnementale des LLM

## Overall verdict

Le PRD est suffisamment solide pour engager l’UX et l’architecture : le parcours de Camille, le calcul local et les dépendances entre échanges conduisent à des exigences vérifiables. Aucun blocage produit critique ou majeur n’est identifié ; quelques règles de présentation et renvois doivent être alignés avant de dériver les stories. Le catalogue et les décisions D-1 à D-6 sont correctement déclarés comme dépendances de réalisation, sans exiger artificiellement leur résolution pour finaliser le cadrage.

## Decision-readiness — strong

Les choix structurants sont explicites : page statique sans compte, abandon du tokenizer distant, cache intégral comme convention, prompt système fixé par catalogue, import conditionnel. Les décisions restantes ont un responsable et une échéance en §8. L’import n’est pas présenté comme une promesse de lancement et les règles de modèle ChatGPT sont attribuées au porteur du projet.

## Substance over theater — strong

Camille porte les décisions de saisie, d’artifact et d’agrégation ; aucune galerie de personas ne surcharge le document. Les NFR traitent des risques réels de ce produit, particulièrement la transmission des textes et l’affichage de calculs périmés. Aucun discours de nouveauté, volume de trafic ou certification artificielle n’est ajouté.

## Strategic coherence — strong

La proposition « comprendre une estimation puis retenir des gestes simples » relie parcours, équivalence douche et conseils communs. SM-1 reprend le signal qualitatif choisi par Felix, sans imposer un objectif quantitatif incompatible avec le cadrage personnel du lancement public. SM-C1 distingue à juste titre compréhension et exactitude scientifique, tout en restant explicitement une proposition.

## Done-ness clarity — adequate

Les FR ont des conséquences observables : comparaison des versions, exclusion des blocs vides, cache historique, invalidation en cascade et recalcul du total. D-2 délègue légitimement les détails du compteur et du diff, tandis que leurs invariants produit sont déjà écrits. Une transition d’état reste moins explicite pour les équivalences individuelles.

### Findings

- **[medium] Q-1 — Rafraîchissement des équivalences individuelles après changement de douche** (§5.3 FR-10/FR-12 ; §5.4 FR-17 ; §5.5 FR-5) — FR-17 invalide seulement les équivalences lorsque la référence douche change ; FR-12 précise la mise à jour de l’équivalence du total. L’action pour remettre à jour celles de chaque bloc sans recalcul inutile de son empreinte n’est pas explicitée. Deux implémentations pourraient conserver une équivalence périmée ou relancer l’ensemble du bloc. *Fix:* préciser quelle action existante rafraîchit les équivalences individuelles et comment elles sont présentées avant ce clic, en conservant les impacts encore valides et l’absence de calcul automatique.

## Scope honesty — strong

Le périmètre inclut le parcours manuel et distingue nettement import conditionnel, multi-artifact non prévu, compte et sauvegarde exclus. Les risques scientifiques sont nommés dans l’addendum et ne sont pas présentés comme une mesure. Les dépendances de données et de conception ne sont pas masquées. Aucune question produit bloquante ne ressort des hypothèses A-1 à A-3.

## Downstream usability — adequate

Le glossaire et les FR groupées permettent une extraction par sujet ; les deux UJ gardent Camille comme protagoniste. Les identifiants sont uniques et FR-9 est explicitement retirée : cette absence documentée n’appelle pas une renumérotation. Deux ajustements éditoriaux réduiraient les divergences entre extractions.

### Findings

- **[low] Q-2 — Une décision prise reste annoncée comme ouverte dans l’addendum** (addendum, « Référence de douche chaude » ; PRD NFR-6) — L’addendum indique « Le traitement d’un facteur nul […] reste à préciser », alors que NFR-6 impose déjà une durée non calculable et distingue zéro d’une donnée absente. *Fix:* remplacer la réserve sur le facteur nul par la règle NFR-6 ; ne garder ouverte que la précision d’affichage.
- **[low] Q-3 — Hypothèses A-2 et A-3 non repérées à leur point d’usage** (§9, FR-4, NFR-6 et NFR-7) — L’index des hypothèses contient A-2 et A-3, mais seule A-1 dispose d’un marqueur inline. Une extraction isolée de FR-4 peut prendre les conventions d’artifact pour une confirmation utilisateur intégrale. *Fix:* ajouter les renvois `[ASSUMPTION A-2]` et `[ASSUMPTION A-3]` aux passages correspondants sans changer leur contenu ni rouvrir le cadrage.

## Shape fit — strong

Les parcours précèdent les exigences et donnent une entrée adaptée à un outil grand public. Le volume provient des règles de calcul, des dépendances entre blocs et de l’édition avancée, non d’une structure de grande entreprise plaquée sur un site personnel. L’addendum reçoit les formules et constantes, ce qui permet à l’UX de travailler depuis le PRD sans ingérer le détail du moteur.

## Mechanical notes

- 23 FR présentes, identifiants FR-1 à FR-24 hormis FR-9 retirée explicitement ; pas de doublon observé.
- UJ-1 et UJ-2 ; NFR-1 à NFR-7 ; D-1 à D-6 ; hypothèses A-1 à A-3.
- `model_params` et `models_param` sont explicitement deux appellations de la même dépendance ; pas de catalogue supplémentaire à demander.
- Les liens relatifs vers l’addendum et les renvois d’exigences utilisés sont cohérents.
- Sévérités : 0 critical, 0 high, 1 medium, 2 low.
- Cette revue vérifie la qualité du cadrage et sa cohérence interne ; elle ne certifie pas la validité scientifique des hypothèses ni les politiques effectives des fournisseurs.
