# Réconciliation PRD et addendum

**Verdict : compatible sous réserve des écarts ci-dessous.** Aucune contradiction directe n'a été relevée entre la spine et le PRD/addendum. Les exigences de calcul local, de confidentialité, de catalogues versionnés, de session éphémère, de publication statique, de tokenisation avec repli, de deux pays distincts et d'internationalisation sont bien reprises.

## Élevée

- **Fraîcheur distincte des impacts et de l'équivalence douche — manquant.** AD-3 impose une empreinte aux « résultats » et indique que total et équivalences n'emploient que des résultats actuels, sans fixer les deux portées d'invalidation. Or FR-5, FR-10, FR-12 et FR-17 exigent qu'un changement du pays utilisateur ou des seuls paramètres de douche rende seulement l'équivalence périmée, tout en réutilisant les impacts (y compris pour recalculer le total). Sans invariant séparant `impactFingerprint` et `showerFingerprint`, le domaine et l'UI peuvent légitimement invalider/recalculer trop largement ou agréger un état incohérent.

## Moyenne

- **Indisponibilité des données indispensables — insuffisamment liée au flux de résultat.** La convention « aucun `NaN` ou infini » et AD-5 encadrent les données, mais ne fixent pas explicitement qu'une donnée modèle indispensable absente ou une valeur « Monde » elle-même absente bloque le résultat dépendant avec une erreur explicite (FR-23, NFR-6), plutôt que de produire un résultat partiel. Le contrat de sortie du domaine devrait distinguer valeur calculée, repli Monde signalé et indisponibilité bloquante.

## Faible

- **Déploiement hôte — détail opérationnel encore ouvert.** AD-1 rend le sous-projet Vite portable et le workflow précis est correctement différé. Lors de l'intégration dans le dépôt de `felixmortas.com`, il faudra néanmoins décider comment le build Vite rejoint l'artefact Pages : le déploiement actuel de sources statiques ne construit pas un projet Vite. GitHub Actions est une option autorisée par le contexte, mais ce n'est pas encore une décision de la spine.
