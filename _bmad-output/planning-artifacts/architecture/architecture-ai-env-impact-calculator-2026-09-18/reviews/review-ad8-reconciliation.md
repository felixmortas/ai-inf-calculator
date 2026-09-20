# Revue de réconciliation — AD-8 multi-fournisseur

**Sources contrôlées :** `sprint-change-proposal-2026-09-20.md` §2, §4.2 et contraintes connexes ; `ARCHITECTURE-SPINE.md` AD-8, convention Confidentialité et diagramme de séquence.

## Verdict

**PASS WITH MINOR FINDING.** AD-8 a bien remplacé la restriction ChatGPT par un contrat `ResolvedShare` immuable produit par un adaptateur validé du registre. Les invariants demandés sont conservés : consentement ponctuel lié à l'objet courant, affichage préalable du fournisseur et de `canonicalUrl` effectivement transmise, origine proxy `https://corsproxy.io/` strictement allowlistée, limites appliquées, absence de données locales sortantes, HTML borné et non exécutable, parsing local sans suivi ni téléchargement de ressources.

## Findings

### P2 — La borne sur la chaîne de redirections n'est pas explicite

La proposition impose que Gemini puisse suivre « au plus une chaîne de redirections » vers une destination explicitement allowlistée, ou échoue proprement. AD-8 dit que la passerelle ne suit que les redirections allowlistées et qu'elle applique `limits`, mais ne fixe pas explicitement une borne de nombre de sauts/chaînes ni ne dit que cette borne fait partie de `limits`.

**Risque :** deux implémentations conformes en apparence pourraient adopter des politiques de profondeur différentes ; une suite de redirections allowlistées pourrait ne pas être bornée de façon vérifiable.

**Correction proposée :** ajouter au contrat des adaptateurs que `limits` contient une profondeur maximale de redirection (et la définir à la valeur retenue), puis préciser que toute chaîne qui dépasse cette borne est refusée atomiquement, sans import partiel.

## Éléments réconciliés sans écart

- `remoteGateway` n'accepte que `ResolvedShare { providerId, canonicalUrl, limits }`, émis par un adaptateur validé du registre.
- L'adaptateur possède la validation/canonicalisation et la politique fournisseur : hôtes, chemins, requêtes admises, redirections et limites.
- Le consentement explicite, ponctuel et non pré-coché est invalidé par refus, annulation ou changement d'URL ; le diagramme le rattache au `ResolvedShare` courant.
- Le dialogue affiche le fournisseur détecté et `canonicalUrl`, explicitement identifiée comme l'URL effectivement transmise.
- La seule origine proxy de production est `https://corsproxy.io/`; aucune origine, chemin de proxy, destination ni redirection ne vient d'une entrée utilisateur.
- Seule l'URL canonique du fournisseur détecté peut sortir : blocs locaux, fichiers, résultats, cookies applicatifs, état, paramètres de calcul, jetons et secrets sont exclus.
- La réponse est limitée en taille et délai, traitée comme texte non exécutable et remise à l'extracteur local associé ; liens, artifacts et ressources ne sont ni suivis ni téléchargés.
