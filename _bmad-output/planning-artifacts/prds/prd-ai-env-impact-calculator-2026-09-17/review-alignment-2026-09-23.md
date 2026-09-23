# Revue qualité du PRD — alignement du 23 septembre 2026

## Verdict général

**Adéquat, avec deux précisions utiles avant de dériver les critères de l’epic 6.** Le PRD et l’addendum reprennent les décisions approuvées : accueil à deux voies, modèles ChatGPT et Mistral modifiables, import publié limité à Mistral, Worker actif, répartition des indicateurs, unités adaptées et parcours accessible. Les formules et les valeurs internes non arrondies sont conservées. La frontière d’admission côté Worker et le statut des critères UX approuvés méritent toutefois d’être rendus moins ambigus pour la mise en œuvre et les tests.

## Decision-readiness — adequate

La thèse de lancement et les choix du 23 septembre sont explicites (§1, §3, FR-1/2/25, FR-10/22, NFR-2/3/7). Le périmètre exclut clairement les anciens importeurs du parcours publié (§3). D-1 à D-5 nomment les dépendances bloquantes et leurs échéances. Le PRD n’a pas à répéter l’historique des epics 1–5, présent dans la proposition de changement.

### Findings

- **medium** Frontière d’import encore formulée surtout côté navigateur (§FR-25, NFR-3, D-4, §7) — FR-25 exige un refus *local* et la liste de vérification cite le « refus local d’un lien non Mistral ». D-4 évoque bien la « restriction Mistral à la frontière publique », mais comme livrable documentaire. La proposition approuvée demande une politique effective à l’UI **et à la passerelle** ; une implémentation qui filtre seulement le navigateur pourrait donc paraître conforme aux critères produit. *Fix :* exiger explicitement le refus d’un `shareUrl` non Mistral par l’endpoint publié, y compris en appel direct, et ajouter cette vérification aux critères de lancement, sans prescrire son mécanisme.

## Substance over theater — strong

Les exigences sont spécifiques à ce produit : historique et versions d’artifact (FR-4/19), péremption des calculs (FR-13), références de modèles modifiables (FR-1/2), consentement à l’URL canonique et à l’endpoint actif (NFR-3), gestion des seuils d’unité (FR-22). L’addendum conserve les conventions et limites mathématiques utiles sans faire passer les estimations pour des mesures.

## Strategic coherence — adequate

Le parcours va d’une saisie ou d’un import explicite vers l’estimation par échange, puis le bilan et les conseils (§1–3, UJ-1/2, FR-6/22). L’import restreint à Mistral et la saisie manuelle ouverte aux autres fournisseurs suivent la décision approuvée. SM-1 reste un signal qualitatif de réception plutôt qu’une preuve d’exactitude ; le texte le reconnaît. Le PRD ne définit pas de contre-métrique explicite pour les effets indésirables possibles du nouveau parcours, alors que la rubrique en attend une lorsque des métriques de succès existent ; l’impact reste limité car les scénarios de validation couvrent déjà perte de texte, péremption et réseau.

### Findings

- **low** Signal de réussite sans contre-signal (§7, SM-1) — Les retours positifs par email ou LinkedIn n’observent ni abandon du parcours, ni compréhension erronée des estimations. *Fix :* si Felix souhaite suivre la réception du lancement, nommer au moins un signal qualitatif négatif à examiner dans les mêmes retours, par exemple incompréhension des résultats ou échec de l’import, sans inventer de cible chiffrée ni collecte nouvelle.

## Done-ness clarity — adequate

Les conséquences de FR-1/2, FR-10/13/22/25 et NFR-3/7 permettent de dériver les stories 6.1–6.4. Les seuils 320 px, 200/400 %, 44 × 44 px et trois chiffres significatifs sont vérifiables. D-1/D-2 réservent à juste titre la validation des données et des extrêmes avant livraison ; ces dépendances ne bloquent pas la rédaction des stories. La vérification explicite de la frontière Worker manque, comme noté ci-dessus.

## Scope honesty — adequate

La section §3 nomme inclusions et exclusions ; FR-25 distingue le parcours publié des adaptateurs historiques. D-1 à D-6 conservent les travaux non résolus avec responsable et échéance. L’hypothèse A-1 est indexée, mais son application à NFR-7 mêle une décision UX déjà approuvée et de véritables détails encore ouverts.

### Findings

- **low** Statut incertain des critères UX approuvés (§NFR-7, §9) — « [ASSUMPTION A-1] Ces critères concrétisent … les décisions UX du 23 septembre » peut laisser croire que les valeurs 320 px, 200/400 %, 44 × 44 px et le comportement des dialogues restent des hypothèses, alors qu’elles sont approuvées dans la proposition. *Fix :* réserver A-1 aux bornes de validation encore à fixer en NFR-6 et présenter les critères NFR-7 comme décisions UX, avec seulement les détails réellement ouverts en D-5.

## Downstream usability — adequate

Les FR-1 à FR-25 sont uniques, UJ-1/UJ-2 ont une protagoniste nommée et SM-1 est identifiable. Le vocabulaire définit les notions centrales. Le PRD cite `DESIGN.md` et `EXPERIENCE.md` comme contrats prévalant sur les maquettes (§NFR-1), mais sans chemin de fichier ; leur localisation est déductible de la proposition du 23 septembre, pas du PRD extrait seul.

### Findings

- **low** Références UX peu résolubles hors contexte (§FR-22, NFR-1, D-2/D-5) — Les noms `DESIGN.md` et `EXPERIENCE.md` sont génériques, tandis que les unités et plusieurs états de focus en dépendent. *Fix :* lier une fois les deux fichiers sous `ux-designs/ux-ao-env-impact-calculator-2026-09-23/`, puis garder les noms courts ailleurs.

## Shape fit — strong

Pour une page grand public destinée à alimenter UX, architecture et stories, les deux parcours de Camille portent les décisions importantes sans persona autonome superflue. Les FR sont groupées par capacité, les NFR couvrent les contraintes transverses et les mécanismes de calcul détaillés restent dans l’addendum. Le niveau de détail correspond au lancement public et à la migration UX modérée.

## Notes mécaniques

- FR-1 à FR-25 : identifiants uniques et sans trou, bien que l’ordre de lecture suive les capacités plutôt que la numérotation.
- UJ-1/UJ-2 et SM-1 : identifiants uniques ; Camille est nommée dans les deux parcours.
- `[ASSUMPTION A-1]` apparaît en NFR-6 et NFR-7 et est repris dans l’index §9 ; le problème est son périmètre, pas un défaut de renvoi.
- Aucun vestige de `corsproxy.io`, des quatre chiffres significatifs ou de l’import publié à quatre fournisseurs n’a été trouvé dans le PRD ou l’addendum.
- L’addendum conserve les équations et les valeurs internes non arrondies, en cohérence avec FR-22 et la proposition de changement.
