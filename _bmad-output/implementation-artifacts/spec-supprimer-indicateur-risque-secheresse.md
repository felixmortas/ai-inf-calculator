---
title: 'Supprimer l’indicateur de risque de sécheresse'
type: 'refactor'
created: '2026-10-06'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’indicateur de risque de sécheresse ajoute un jeu de données, du calcul, de l’état et de l’interface à un outil dont les hypothèses de localisation des centres de données des fournisseurs de LLM sont principalement américaines. Il apporte peu à la comparaison entre modèles et alourdit l’application.

**Approach:** Supprimer les données de sécheresse et leur générateur, leurs calculs et leur transport dans l’état, leur affichage et les tests correspondants. Mettre à jour la documentation de référence et expliquer la décision dans `data/note-methodologique.md`.
</frozen-after-approval>

## Implementation Notes

- Retiré les données et leur script de génération, la résolution locale, leur transit dans le bilan, l’affichage et les tests associés.
- Mis à jour la note méthodologique, les contrats canoniques et la documentation UX/formules. Les mentions dans les documents BMAD datés sont des exigences et décisions historiques ; leur réconciliation documentaire reste à faire.
- Vérification par recherche textuelle : aucune référence fonctionnelle restante dans `src/`, `data/` hors note de décision, `docs/`, contrat canonique ou UX courante. Les artefacts BMAD historiques contiennent encore des références explicites. Tests automatisés non lancés.
- Réconciliation BMAD réalisée le 2026-10-06 : architecture, PRD, addendum, epics et UX actualisés ; les extraits et comptes rendus fidèles, propositions approuvées et stories déjà livrées portent désormais une note de statut historique/supersédé.

## Review Triage Log

- defer — L’architecture spine conserve l’ancien indicateur ; la mise à jour de la famille d’artefacts de planification est reportée et inscrite dans `deferred-work.md`.
- defer — Les epics et propositions de sprint décrivent encore l’indicateur ; ce sont des exigences datées à réconcilier avant réutilisation.
- patch — Reformulé la note des États-Unis comme hypothèse simplificatrice appliquée à la comparaison, sans prétendre que tous les pays d’hébergement configurables sont américains.
- patch — La note méthodologique reprend le motif fourni par l’utilisateur et précise en quoi l’indicateur ne différencie pas les modèles sous cette hypothèse.
- patch — Précisé dans les notes d’implémentation le périmètre de la recherche et les références restantes.
- defer — Les documents BMAD de planification sont qualifiés d’historiques dans les notes ; leurs règles doivent être marquées supersédées ou mises à jour avant de guider de nouveaux travaux.
- defer — La revue d’accessibilité conserve une recommandation relative à l’échelle de sécheresse ; elle appartient à la réconciliation documentaire BMAD.
- defer — Le PRD et ses extraits/addenda gardent des références au jeu de données ; ils sont couverts par la même réconciliation.
- defer — Les décisions d’architecture qui lient le pays d’hébergement à l’indicateur sont anciennes et incluses dans l’entrée de suivi.
