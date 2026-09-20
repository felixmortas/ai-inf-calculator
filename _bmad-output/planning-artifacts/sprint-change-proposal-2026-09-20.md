---
title: Proposition de changement de sprint — import des partages Claude, Mistral et Gemini
status: approved
created: 2026-09-20
approved: 2026-09-20
change_scope: moderate
mode: batch
---

# Proposition de changement de sprint — import multi-fournisseur

## 1. Synthèse du problème

L’import distant d’une conversation partagée est fonctionnel pour ChatGPT. Felix souhaite accepter aussi les liens publics Claude, Mistral et Gemini afin de remplir automatiquement les blocs de conversation.

Ce n’est pas une extension des calculs : le catalogue gère déjà ces fournisseurs et le PRD les cite dans sa vision. C’est une extension de la frontière d’import : le registre, le validateur d’URL, le consentement, la passerelle, l’extracteur HTML, les messages et les tests supposent actuellement tous un fournisseur ChatGPT unique.

### Preuves

- `src/application/import/registry.ts` n’enregistre que `chatGptShareProvider`.
- `remoteGateway.ts` et `chatgptShareUrl.ts` n’acceptent que `https://chatgpt.com/share/<id>`.
- `chatgptShare.ts` associe le parseur, les erreurs et le `providerId` à ChatGPT.
- L’epic 5, AD-8 et NFR-3 limitent explicitement l’exception distante à une URL ChatGPT.
- Les fournisseurs proposent des partages publics : Gemini = `https://share.gemini.google/<id>`, Mistral = `https://chat.mistral.ai/chat/<id>`, Claude = `https://claude.ai/share/<id>`.

## 2. Analyse d’impact

| Domaine | Impact | Décision proposée |
| --- | --- | --- |
| Epic 5 | Direct | Étendre les stories 5.1–5.3 et ajouter une story d’adaptateurs par fournisseur. |
| Epics 1–4 | Aucun impact fonctionnel | Ne pas modifier. Le modèle reste sélectionnable par la personne après import. |
| PRD | Incohérence rédactionnelle | La vision couvre déjà les quatre fournisseurs, mais UJ-2, NFR-3 et D-4 disent ChatGPT uniquement. Corriger ces références sans changer le périmètre MVP. |
| Architecture | Direct | Généraliser AD-8 de « URL ChatGPT » à une allowlist de fournisseurs et de formats canoniques, tout en gardant une seule passerelle et le parsing local. |
| UX | Direct, aucun document UX existant | Sélection/détection du fournisseur, messages d’erreur précis, consentement affichant le fournisseur et l’URL courante. |
| Code, tests, aide | Direct | Un parseur et des fixtures par fournisseur, plus des tests de sécurité communs. |

### Risques et contraintes

- Les structures HTML et états embarqués sont propres à chaque fournisseur et peuvent changer sans préavis : ne pas réutiliser le parseur ChatGPT par heuristique.
- Gemini utilise un lien court qui peut rediriger ; la passerelle actuelle refuse les redirections. La validation doit autoriser le format public officiel, puis la passerelle doit suivre au plus une chaîne de redirections dont la destination est contrôlée par une allowlist explicite — ou refuser proprement.
- Les pages partagées peuvent contenir artifacts, images ou fichiers. L’import reste textuel : aucun téléchargement, exécution ou suivi de ressource.
- Le consentement et la minimisation restent identiques : seule l’URL canonique du fournisseur détecté peut sortir vers `corsproxy.io`; aucun bloc local, résultat, fichier, cookie applicatif ou paramètre ne sort.

## 3. Évaluation des options

| Option | Effort | Risque | Décision |
| --- | --- | --- | --- |
| Étendre directement le parseur ChatGPT | Faible | Élevé : fragilité et confusion des formats | Rejetée |
| Créer un epic séparé par fournisseur | Élevé | Moyen : duplication de consentement/passerelle | Non retenue |
| **Ajouter un registre d’adaptateurs et une story multi-fournisseur dans l’epic 5** | Moyen | Moyen, isolé par adaptateur et fixtures | **Retenue** |
| Conserver ChatGPT seul | Nul | Perte de la capacité attendue | Rejetée |

**Approche recommandée : ajustement direct, de portée modérée.** Elle respecte le MVP annoncé et ne justifie ni rollback ni replanification des calculs. Les trois stories actuelles de l’epic 5 sont en `review` : elles doivent être repassées en backlog/review correctif avant leur clôture, car leurs critères d’acceptation deviennent multi-fournisseur.

Estimation : moyenne (un contrat commun, trois validateurs, trois extracteurs et fixtures publiques, adaptation UX/tests). Risque : moyen, réduit par l’isolation stricte des parseurs, les limites par fournisseur et le fallback manuel.

## 4. Propositions détaillées de changements

### 4.1 PRD — cohérence, sans modification de périmètre

**Section : UJ-2 — Contexte et déroulement**

**Ancien :** « Camille souhaite évaluer une conversation récente avec ChatGPT. Elle copie l’URL de partage depuis ChatGPT… »

**Nouveau :** « Camille souhaite évaluer une conversation récente avec ChatGPT, Claude, Mistral ou Gemini. Elle copie l’URL publique de partage depuis ce chatbot ; le calculateur reconnaît le fournisseur, demande le consentement requis avant la récupération distante, puis remplit les blocs textuels de la conversation. »

**Section : NFR-3 et D-4**

**Ancien :** l’exception distante et sa documentation portent sur « l’URL canonique d’un partage ChatGPT ».

**Nouveau :** remplacer cette expression par « l’URL canonique validée d’un partage ChatGPT, Claude, Mistral ou Gemini », avec une allowlist de formats, d’hôtes et de redirections documentée par fournisseur.

**Rationale :** le périmètre et le MVP ne changent pas ; cette modification supprime la contradiction entre la vision et les exigences exécutables.

### 4.2 Architecture — AD-8 et diagramme de séquence

**Ancien :** `remoteGateway` accepte uniquement une URL publique ChatGPT déjà validée.

**Nouveau :** `remoteGateway` reçoit un `ResolvedShare` immuable `{ providerId, canonicalUrl, limits }` issu du registre. Seuls les adaptateurs du registre valident et canoniqualisent une URL. La passerelle n’effectue une requête qu’après consentement lié à ce `ResolvedShare`, applique ses limites, et ne suit que les redirections explicitement autorisées pour ce fournisseur. Elle remet un HTML borné au parseur local associé.

**Rationale :** l’allowlist devient testable, les règles communes ne sont pas dupliquées et aucun parseur n’acquiert de capacité réseau.

**Mise à jour du diagramme :** `URL → registre/validateur fournisseur → consentement fournisseur+URL → remoteGateway → corsproxy.io → extracteur fournisseur local → aperçu`. La note de confidentialité reste inchangée.

### 4.3 Epic 5 — remplacer les occurrences ChatGPT-only

**Story 5.1 — section Critères d’acceptation**

**Ancien :** « Given une URL ChatGPT canonique valide… »

**Nouveau :** « Given une URL de partage canonique valide pour ChatGPT, Claude, Mistral ou Gemini, When je demande son analyse, Then un dialogue accessible identifie le fournisseur, `corsproxy.io`, l’URL transmise, les métadonnées possibles, les données locales exclues et l’alternative manuelle avant toute requête. »

**Story 5.2 — section Critères d’acceptation**

**Ancien :** `remoteGateway` construit la destination depuis une URL ChatGPT seule.

**Nouveau :** `remoteGateway` construit la destination depuis le seul `ResolvedShare` validé ; hôtes, chemins, requêtes admises, redirections et limites sont définis dans le registre par fournisseur. Toute URL non canonique, redirection hors allowlist ou réponse dépassant ses limites est refusée sans import partiel.

**Story 5.3 — section Critères d’acceptation**

**Ancien :** seule l’URL ChatGPT validée quitte le calculateur.

**Nouveau :** seule l’URL canonique validée du fournisseur identifié quitte le calculateur ; les tests d’intégration parcourent les quatre fournisseurs et vérifient l’absence de données locales dans chaque requête.

### 4.4 Nouvelle Story 5.4 — Ajouter les adaptateurs de partage multi-fournisseur

**Story :**

> En tant que visiteuse, je veux importer une conversation publique ChatGPT, Claude, Mistral ou Gemini depuis son lien de partage, afin que mes échanges textuels deviennent des blocs calculables sans recopie.

**Critères d’acceptation :**

1. Chaque fournisseur a un adaptateur distinct : validateur/canonicaliseur, limites, extracteur local et fixtures HTML publiques minimisées.
2. Le registre expose les quatre fournisseurs ; un lien valide sélectionne automatiquement le fournisseur avant consentement.
3. Chaque adaptateur préserve l’ordre des messages, ignore les rôles et contenus non textuels non pris en charge, et retourne `format-unknown` plutôt que d’inventer des messages.
4. Chaque format invalide, URL authentifiée, hôte ressemblant, query/fragment non admis ou redirection non allowlistée échoue sans requête ou import partiel.
5. Les tests couvrent au minimum une conversation à deux rôles, un artifact/non-texte ignoré, absence d’état public, dépassement de limites, révocation du consentement et changement d’URL pour chaque fournisseur.
6. Un changement de structure détecté sur un échantillon de régression désactive seulement l’import du fournisseur touché et maintient le parcours manuel.

### 4.5 UX et messages

- Remplacer « Seul un lien public ChatGPT… » par la liste des quatre fournisseurs et leurs formats acceptés.
- Le dialogue de consentement nomme dynamiquement le fournisseur détecté et affiche l’URL canonique exacte.
- Ajouter l’état « format de partage reconnu, mais import momentanément indisponible » avec l’alternative de saisie manuelle.
- Ne pas modifier le dialogue de remplacement des blocs : il intervient après l’import, séparément du consentement réseau.

### 4.6 Plan de tests et documentation

- Fixtures anonymisées/minimisées, sans conversation privée, une par fournisseur et par variante de structure supportée.
- Tests unitaires des validateurs/canonicaliseurs, du registre, de chaque extracteur et de leurs limites.
- Tests d’intégration : consentement, refus, `Escape`, changement d’URL ou fournisseur, erreur proxy, redirection et réussite pour les quatre fournisseurs.
- Mettre à jour l’aide d’import avec les formats pris en charge, le périmètre textuel, le tiers `corsproxy.io`, et le fallback manuel.

## 5. Handoff d’implémentation

**Classification : modérée.** Aucun replan fondamental ni changement de calcul n’est requis, mais les stories de l’epic en cours doivent être corrigées et testées avant clôture.

1. **PO / planification :** appliquer les modifications 4.1 et 4.3, créer la story 5.4, remettre les stories 5.1–5.3 à l’état à corriger et synchroniser `sprint-status.yaml`.
2. **Architecte :** appliquer 4.2, en particulier le contrat `ResolvedShare`, les allowlists de redirection et les limites par fournisseur.
3. **Développeur :** implémenter les adaptateurs un à un avec fixtures et tests ; conserver le parsing local, le fallback manuel et l’atomicité de session.
4. **Felix :** a fourni les URL publiques de référence pour Mistral, Claude et Gemini ; elles servent à établir les validateurs, redirections et fixtures de régression. Les fixtures versionnées doivent être minimisées/anonymisées et ne pas dépendre durablement de ces pages publiques.

### Critères de succès

- Les quatre URL de partage validées importent uniquement les échanges textuels publics, dans l’ordre.
- Une URL inconnue, invalide, modifiée ou non consentie ne génère aucune requête.
- Aucune donnée locale ne rejoint `corsproxy.io` ; les limites et erreurs restent atomiques.
- Une rupture chez un fournisseur ne casse ni ChatGPT, ni les calculs, ni l’import manuel.

## 6. État de la checklist

- [x] Déclencheur, problème et preuves identifiés.
- [x] Impact sur l’epic courant et les epics futurs évalué.
- [x] PRD, architecture, UX implicite, code, tests et documentation analysés.
- [x] Options comparées ; ajustement direct retenu.
- [x] Propositions avant/après et handoff préparés.
- [x] Échantillons publics de référence fournis pour Claude, Mistral et Gemini ; chaque format doit avoir une fixture de régression.
- [x] Approbation explicite de Felix le 20 septembre 2026 ; statut de sprint synchronisé.
