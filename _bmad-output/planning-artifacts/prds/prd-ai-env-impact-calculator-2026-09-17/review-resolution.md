# Clôture des relectures — 2026-09-18

Les deux relectures demandées par Felix ne relèvent aucun défaut critique ou majeur empêchant de commencer l’UX et l’architecture. Les dépendances de données et les détails de conception restent explicitement à résoudre avant le développement ou la publication des fonctions concernées.

## Réconciliation et qualité

| Constat | Traitement |
|---|---|
| Actualisation des équivalences douche individuelles après changement de paramètres | FR-10 précise les trois actions et le masquage des équivalences périmées. Le calcul du total ne rafraîchit pas implicitement les équivalences individuelles. |
| Températures avancées et énergie de chauffage par litre | D-2 et l’addendum imposent de définir leur relation avant développement ; 0,0232 kWh/L reste la référence pour une élévation de 20 °C. Responsable : technique. |
| Facteur d’émission nul encore annoncé ouvert dans l’addendum | Harmonisé avec NFR-6 : équivalence non calculable, sans division par zéro. |
| Hypothèses A-2 et A-3 sans marqueur dans le corps | Marqueurs ajoutés et reliés à l’index des hypothèses. |

Les formules et les conventions finales sont couvertes par [reconcile-spec.md](reconcile-spec.md). Les écarts volontaires à la spécification initiale sont explicités dans le PRD et l’addendum : saisie textuelle centrale, artifacts, paramètres avancés, prompt système fourni par catalogue et conversion locale.

## Hypothèses et dépendances différées

- A-1 : contre-indicateur qualitatif proposé, à revoir par Felix lors des premiers retours.
- A-2 : un artifact suivi et conservation de sa version précédente en cas de champ vide ; à revoir par Felix et le responsable UX si un autre usage apparaît.
- A-3 : contrôles numériques et utilisabilité de base à détailler pendant la conception.
- D-1 à D-6 : responsables et échéances présents dans le PRD. La fourniture du catalogue ne bloque pas la finalisation du document. L’import par lien reste soumis à sa propre étude.

## Vérifications documentaires

Liens locaux, unicité des identifiants, références croisées, index des hypothèses et dépendances vérifiés. L’identifiant retiré FR-9 reste réservé. L’exemple arithmétique de l’addendum et les conversions Wh/kWh, gCO₂e et litres ont été recalculés. Aucune implémentation applicative n’a été produite ni testée dans cette étape de rédaction.

## Relecture éditoriale

Les passes structure puis prose ont conservé l’organisation du PRD et de l’addendum. Six retouches de vocabulaire ont été appliquées pour préciser les paramètres utilisés, la correction du pays, la saisie manuelle en cas d’échec, les modifications de session, la recherche du risque de sécheresse et le recalcul des totaux. Aucune décision ni équation n’a changé.

## Rapports

- [Qualité globale](review-rubric.md)
- [Cohérence des calculs](review-calculs.md)
- [Réconciliation de la source](reconcile-spec.md)
- [Relecture éditoriale du PRD](review-editorial-prd.md)
- [Relecture éditoriale de l’addendum](review-editorial-addendum.md)

Les constats des rapports décrivent leur version de lecture ; le présent document consigne les corrections et reports appliqués ensuite.
