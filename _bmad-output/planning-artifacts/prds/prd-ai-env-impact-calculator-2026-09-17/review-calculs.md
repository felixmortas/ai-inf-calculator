# Relecture — cohérence des calculs

Date : 2026-09-18.

**Verdict : cohérent, sans défaut critique ou élevé ; finalisation possible avec une correction rédactionnelle et une précision technique suivie en D-2.**

- **Moyenne — température et énergie de douche :** les températures sont annoncées modifiables mais leur lien avec 0,0232 kWh/L n’est pas défini. Préciser ce contrat avant développement en D-2 ; employer la formule générale débit × énergie par litre. Aucun nouveau choix produit nécessaire pour commencer l’UX ou l’architecture.
- **Faible — phrase périmée :** l’addendum annonce encore le traitement du facteur carbone nul « à préciser », alors que NFR-6 exige déjà « non calculable ». Aligner le texte ; garder les arrondis dans D-2.

Équations, constantes, conversions, PUE unique, séparation des pays, historique en cache et versions d’artifact sont cohérents avec la source et les décisions finales. Aucune omission réelle bloquante relevée. Les D-1 à D-6 sont des travaux de conception/données explicites, pas des raisons de relancer l’entretien produit. Cette revue ne valide pas scientifiquement les données ou régressions sources.

Réconciliation détaillée : [reconcile-spec.md](reconcile-spec.md).
