---
title: 'Bloquer l’interface pendant le calcul global'
type: 'feature'
created: '2026-09-24'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-ao-env-impact-calculator-2026-09-23/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Pendant le calcul de tous les échanges, l’opération peut durer sans empêcher suffisamment les interactions avec la page, ce qui peut faire croire à un gel ou permettre des actions concurrentes.

**Approach:** Tant que le bilan est en état `pending`, rendre l’interface inactive, empêcher le défilement de la page et afficher un voile de progression avec un indicateur animé et un texte français accessible. Restaurer le comportement normal dès la fin ou l’échec du calcul.

</frozen-after-approval>

## Implementation Notes

La demande est une fonctionnalité autonome, sans migration, mutation de données ni effet externe. Le changement doit suivre le plan UX d’accessibilité : fond inerte pendant une opération bloquante, annonce de statut compréhensible, animation non nécessaire à la compréhension et respect de `prefers-reduced-motion`.

Le statut `state.summary?.status === 'pending'` dans `App` est la source unique de l’état bloquant. Appliquer l’inertie à la zone applicative interactive, superposer un voile fixe contenant un statut de progression, et verrouiller le défilement du document pendant ce statut en restaurant toute valeur précédente lors du nettoyage. Le voile est rendu comme frère de la zone inerte, couvre les interactions pointeur, et l’inertie exclut aussi les contrôles du parcours clavier. Le statut accessible annonce la progression ; le blocage et l’indicateur prennent fin lorsque le statut quitte `pending`, y compris si le calcul échoue.

Fichiers modifiés : `src/ui/App.tsx` détecte le statut global, rend le contenu inerte, verrouille puis restaure le débordement de la page, et déplace/restaure le focus clavier ; `src/ui/styles.css` définit le voile, le spinner et la réduction du mouvement ; `src/i18n/fr.ts` fournit l’annonce française. `ConversationImport.tsx` fournissait un précédent d’usage d’`inert`. Aucune migration, donnée persistante ni requête externe n’est impliquée.

## Review Triage Log

- Medium — la revue a demandé de déplacer puis restaurer le focus clavier ; corrigé dans `src/ui/App.tsx` avec un statut temporairement focalisable et le contrôle de lancement comme cible de retour.
- Medium — la revue a demandé des tests des transitions pending/résultat/échec ; différé dans `deferred-work.md`, car les consignes de session interdisent d’ajouter ou d’exécuter des tests sans demande explicite.
- Medium — la revue a demandé des tests du verrouillage/restauration du scroll ; différé dans `deferred-work.md` pour la même contrainte de session.
- False — le statut fournit déjà un texte français accessible décrivant le calcul de toute la conversation, avec `role="status"` et `aria-live="polite"`.
- False — les échecs existants quittent l’état `pending` et affichent le message `summaryUnavailable` ou `noExchangesForSummary` dans le fil.
- False — le voile est centré et le panneau est limité à la largeur disponible, avec retour à la ligne et marges mobiles ; la feuille conserve aussi le reflow existant.
- False — le verrouillage restaure les valeurs de débordement antérieures sans modifier la position de défilement.
