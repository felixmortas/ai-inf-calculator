# Revue adversariale — AD-8, import distant multi-fournisseur

## Verdict

**À corriger avant finalisation.** AD-8 fixe les bonnes frontières : un point de sortie réseau, consentement ponctuel, fournisseur détecté, URL canonique affichée, limites et parsing local. Mais le contrat laisse encore possibles des implémentations incompatibles qui seraient toutes défendables à sa lecture : un `ResolvedShare` fabriqué ou élargi, un consentement rejoué pour une autre politique, et une redirection suivie par le proxy hors du contrôle effectif du navigateur. Ces écarts mettent directement en cause l'allowlist et la minimisation.

## Bloquants

### B1 — `ResolvedShare` n'est pas une capacité attestant son émission par le registre

**Contournement plausible :** une équipe définit `type ResolvedShare = Readonly<{ providerId: string; canonicalUrl: string; limits: Limits }>` et laisse `remoteGateway.fetch(resolvedShare)` accepter toute valeur structurellement conforme. Une autre équipe construit cette valeur dans l'UI après avoir seulement reconnu un préfixe, ou clone une valeur reconnue en remplaçant `canonicalUrl` par `https://attacker.example/...` et `limits` par des bornes élevées. Les deux peuvent prétendre respecter « objet immuable » et « adaptateur validé » : l'immuabilité TypeScript/`Object.freeze` ne prouve ni l'origine ni l'intégrité de l'objet.

**Impact :** SSRF indirect via le proxy, sortie d'une URL non présentée à la personne, ou suppression des plafonds de réponse/extraction.

**À fixer dans AD-8 :** le registre doit être statique, fermé et détenu par `application/import`; seul lui crée un `ResolvedShare` opaque/branded et le signe en mémoire (identité `WeakSet` ou jeton non forgeable). La passerelle refuse toute valeur qui ne provient pas de cette fabrique, et récupère l'adaptateur et les limites par cette identité — jamais depuis des champs fournis par l'appelant. Les adaptateurs ne reçoivent aucune capacité réseau et ne peuvent pas s'enregistrer dynamiquement.

### B2 — La restriction des redirections ne peut pas être laissée au seul client quand `corsproxy.io` les suit

**Contournement plausible :** l'adaptateur Gemini admet `share.gemini.google/<id>` et déclare une destination finale allowlistée. La passerelle navigateur n'envoie pourtant qu'une requête à `corsproxy.io?url=…`; le proxy suit automatiquement une redirection 302 vers `https://evil.example/export` et renvoie le HTML. Le client n'observe que la réponse finale : `redirect: 'error'` protège la redirection HTTP entre le navigateur et le proxy, pas la chaîne proxy → fournisseur. Une autre implémentation refuse toutes les redirections côté navigateur. Toutes deux peuvent se dire conformes à « ne suit que les redirections explicitement allowlistées », mais l'une ne l'applique pas à l'endroit où elles surviennent.

**Impact :** l'allowlist de destination est contournée et le proxy est conduit à récupérer une ressource arbitraire ; une URL courte peut aussi aboutir à un domaine de connexion ou à une page non publique.

**À fixer dans AD-8 :** définir, par adaptateur, une politique de chaîne exécutable : hôte + port + chemin + requête canoniques pour l'URL initiale et chaque saut, nombre maximal de sauts, et URL finale admise. L'application doit soit utiliser un proxy qui applique et atteste cette politique côté serveur (URL finale et sauts retournés/contrôlables), soit désactiver les formats qui exigent une redirection. L'absence d'une telle attestation est un refus, pas un succès implicite.

### B3 — Le consentement n'est pas assez lié à l'objet attesté et à la requête réellement construite

**Contournement plausible :** l'UI affiche `providerId = Gemini` et `canonicalUrl = A`, puis remet à la passerelle un nouveau `ResolvedShare` de même URL mais d'une autre version de politique/adaptateur, d'autres redirections ou d'autres limites. Ou elle conserve un consentement associé par simple égalité de chaîne et le rejoue après changement du fournisseur sélectionné, de la configuration proxy ou de la politique. Ces implémentations respectent littéralement « lié au `ResolvedShare` courant » si « lié » signifie seulement `canonicalUrl` égal.

**Impact :** la personne consent à une représentation mais le réseau utilise une capacité/politique différente ; le caractère ponctuel devient rejouable.

**À fixer dans AD-8 :** le consentement est une capacité à usage unique, créée après affichage, liée par identité au même `ResolvedShare` attesté, à la version de politique et à l'origine proxy. La passerelle consomme atomiquement cette capacité avant toute requête. Toute modification d'entrée, de fournisseur, d'adaptateur/politique, de limites ou de configuration proxy l'invalide. Le contrat doit nommer `outboundCanonicalUrl` comme la valeur exacte encodée dans la requête au proxy et imposer que ce soit précisément celle affichée, plutôt qu'une URL « équivalente » ou re-canonicalisée après consentement.

## Importants

### I1 — Les limites ne définissent ni l'enveloppe ni le point d'application

**Implémentations divergentes :** un adaptateur fixe seulement `maxBytes` d'après `Content-Length`; un autre lit le flux mais applique le délai séparément à chaque redirection; un troisième borne le HTML mais laisse un parseur explorer un état JSON profondément imbriqué ou produire un nombre non borné de messages. Tous « appliquent `limits` » et remettent du « HTML borné », mais n'ont pas la même résistance à une réponse chunked/compressée, lente ou algorithmique.

**Impact :** consommation mémoire/CPU, import partiel ou délai sans fin pratique, avec une protection différente selon le fournisseur.

**À fixer dans AD-8 :** rendre les limites exigées et homogènes : délai total monotone depuis l'envoi, taille maximale des octets *décodés* effectivement lus (flux et absence de `Content-Length` inclus), nombre maximal de redirections, taille/longueur d'URL, et bornes d'extraction (événements, profondeur/nœuds/texte ou budget de travail). Définir que tout dépassement annule le flux, ne renvoie aucun bloc et est une erreur typée. Les limites de l'adaptateur ne doivent pouvoir que resserrer les plafonds globaux.

### I2 — L'allowlist de proxy est ambiguë au niveau de la requête, pas seulement de l'origine

**Contournement plausible :** une implémentation vérifie que l'URL de requête commence par `https://corsproxy.io/`, mais laisse l'adaptateur choisir un chemin, un paramètre (`url`, `callback`, `headers`) ou des options de proxy. Une autre utilise un endpoint à l'origine identique dont le contrat autorise des méthodes, en-têtes ou destinations différents. Elles conservent toutes l'« origine exactement » indiquée, mais seule l'une garde une destination et une requête déterministes.

**Impact :** surface proxy élargie, ajout de données à la requête ou capacité de contournement par une option du service tiers.

**À fixer dans AD-8 :** figer aussi le schéma complet de la requête proxy : méthode `GET`, chemin exact, ensemble fermé de paramètres et leur encodage, `credentials: omit`, cache désactivé, politique de référent explicite et aucun en-tête/corps issu de l'UI, du reducer ou d'un adaptateur. La destination doit être injectée uniquement depuis `ResolvedShare.outboundCanonicalUrl`; API key et mécanisme d'autorisation restent exclusivement dans la configuration de passerelle.

### I3 — « Aucun contenu local » exige une frontière de données vérifiable, y compris après la réponse

**Contournement plausible :** le gateway garde bien le corps vide, mais joint au proxy un en-tête de diagnostic contenant l'état du reducer, ou l'adaptateur incorpore des données locales dans une option/une query de la requête. À l'autre extrémité, un extracteur retourne un lien d'artifact ou du HTML à afficher, et l'UI le rend comme URL, image ou HTML brut : le navigateur suit alors une ressource citée par la page importée. Chaque module peut dire qu'il ne « télécharge » pas lui-même une ressource, tandis que les données locales ou une navigation ont quand même quitté l'application.

**Impact :** exfiltration de session ou chargements secondaires non consentis depuis du contenu distant.

**À fixer dans AD-8 :** définir le payload sortant comme une construction interne fermée — URL proxy déterministe + seuls paramètres de service nécessaires — et interdire explicitement tout header/corps/URL additionnel provenant de l'état applicatif. Définir la sortie de l'extracteur comme des valeurs textuelles et métadonnées primitives bornées, jamais HTML, URL, artefact ou nœud DOM. L'affichage traite ces chaînes comme texte et ne déclenche ni navigation, ni requête de sous-ressource, ni exécution.

## Vérifications de non-régression à exiger

- Une valeur `ResolvedShare` clonée, gelée ou construite hors registre est refusée avant `fetch`; modifier ses champs ou ses limites ne produit aucun trafic.
- Un consentement pour A ne fonctionne ni pour B, ni pour le même A avec un autre fournisseur, une autre version de politique, une autre origine proxy ou une autre capacité; il échoue aussi au second emploi.
- Pour chaque fournisseur, une redirection autorisée, une seconde redirection, une destination non allowlistée, un changement de chemin/query/port et une réponse proxy sans attestation de chaîne donnent zéro import.
- Corps sans `Content-Length`, réponse compressée, flux lent, dépassement de délai total et état HTML/JSON adversarial donnent une erreur atomique sans blocs partiels.
- L'inspection de la requête montre uniquement l'URL canonique affichée encodée dans le contrat proxy ; aucune donnée du reducer, bloc local, résultat, cookie ou secret n'est présente dans URL, corps ou en-têtes applicatifs.

## Rubrique de la décision AD-8

| Critère | État | Observation |
| --- | --- | --- |
| Une passerelle réseau unique | Partiel | Nom et emplacement sont fixés; l'objet d'entrée doit devenir non forgeable. |
| Consentement ponctuel et informé | Partiel | Affichage requis; liaison par identité, version de politique et consommation atomique à préciser. |
| Allowlist fournisseur et redirections | Non satisfait | La politique est décrite mais pas le composant qui l'applique sur les redirections suivies par le proxy. |
| Bornes homogènes | Partiel | Présence de `limits`; enveloppe, mesure et plafonds globaux insuffisamment définis. |
| Absence d'exfiltration locale | Partiel | Intention nette; contrat fermé de requête et de sortie parseur à rendre testables. |
| Remplacement futur du proxy | OK après corrections | Le confinement de configuration reste compatible avec une passerelle gérée qui applique les attestations requises. |
