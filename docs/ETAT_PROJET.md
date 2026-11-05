# État du projet — Plateforme de suivi de l'accréditation ALGERAC

**Arrêt au 05-11-2026** · Rédigé par Claude Code (superviseur) pour Brahim (Responsable QHSE) et l'équipe de revue.
Statut : **plateforme en ligne en mode réel, GATE 1 non conclu** (les tests à deux utilisateurs n'ont pas encore été faits).

---

## 1. Liens

| Élément | Adresse |
|---|---|
| Plateforme | https://bbelkhodja-spec.github.io/calibra-algerac-tracker/ |
| Dépôt GitHub (public, code seul) | https://github.com/bbelkhodja-spec/calibra-algerac-tracker |
| Projet Supabase | `calibra-algerac` · référence `almvihcaavxtksyxahej` · région Central EU (Frankfurt) · offre Free |
| Console Supabase | https://supabase.com/dashboard/project/almvihcaavxtksyxahej |
| Version affichée en bas du menu | `20261105-5` (commit `73156d0`) |

## 2. Chronologie et décisions

| Date | Décision / événement | Par |
|---|---|---|
| 04-11-2026 | Brief v2 : GitHub Pages + MSAL + OneDrive (compte Microsoft personnel). | Brahim |
| 04-11-2026 | Réponses définitives (`REPONSE_SESSION_CODE.md`) : utiliser la plateforme déjà construite (zip), compte A = belkhodja.brahim@live.fr, B = Karim, dépôt public. MSAL 3.28.1 accepté. | Brahim |
| 05-11-2026 | GitHub CLI installé, connexion `bbelkhodja-spec`, dépôt public créé, Pages activé (mode démo vérifié). | Claude |
| 05-11-2026 | **Échec test GATE 1 n°1 (Microsoft)** : l'enregistrement de l'application est refusé à un compte personnel sans annuaire (« Selected user account does not exist in tenant 'Microsoft Services' »). Créer un annuaire impose un compte Azure avec vérification par carte bancaire. | Constat |
| 05-11-2026 | **Brahim abandonne Microsoft** et retient l'option de secours du brief. | Brahim |
| 05-11-2026 | **Supabase choisi plutôt que Firebase** : depuis fin 2024, le stockage de fichiers Firebase exige le plan payant (carte bancaire), ce qui reproduisait le blocage Microsoft. Supabase Free : aucune carte. | Claude |
| 05-11-2026 | Connexion **e-mail + mot de passe**, comptes créés par l'administrateur, inscription libre désactivée. (L'envoi d'e-mails intégré à Supabase ne sert qu'aux membres de l'organisation Supabase : pas de lien magique / code par e-mail sans serveur d'envoi propre.) | Claude |
| 05-11-2026 | Projet Supabase créé, `schema.sql` appliqué, 4 comptes équipe créés, clé publique mise dans `config.js`. | Brahim / Claude |
| 05-11-2026 | Correctifs contrôle d'accès et navigation après retours de Brahim (voir §6). | Claude |

Écarts au brief v2 assumés : MSAL/OneDrive remplacés par Supabase ; données hors OneDrive ; pas de `config.json` dans un dossier OneDrive (l'équipe est en base, `config.js` contient la configuration publique).

## 3. Architecture livrée

- **Front-end** : SPA statique sans compilation (`index.html`, `js/app.js`, `js/data.js`, `js/store.js`, `config.js`), servie par GitHub Pages. Les scripts portent un numéro de version (`?v=…`) pour que chaque mise à jour soit chargée d'office.
- **Bibliothèque** : supabase-js **2.45.4** servie depuis `vendor/` (aucun script externe ; seule ressource tierce restante : polices Google Fonts).
- **Données** : table `docs` (une ligne par tâche / clause / jalon / preuve / commentaire / config), colonnes `col, id, data, deleted, version, updated_by, updated_at`.
- **Modifications simultanées** : mise à jour conditionnée à la version connue ; si la ligne a changé entre-temps → rien n'est écrasé, la fiche est rechargée, message « Modifié par X entre-temps ».
- **Journal d'audit** (ISO/IEC 17020 §8.4) : table `audit` alimentée par déclencheur serveur à chaque écriture (qui, quand, avant → après), aucune règle de modification ni de suppression.
- **Aucune suppression physique** : « Retirer » = `deleted:true` + trace.
- **Preuves** : espace privé `evidence` (Supabase Storage), 50 Mo max par fichier, tous formats, ni remplacement ni effacement possibles ; ouverture par lien signé valable 10 min.
- **Temps réel** : abonnement Realtime sur `docs` + relecture complète toutes les 45 s et au retour sur l'onglet.
- **Contrôle d'accès (serveur, RLS)** : lecture/écriture seulement pour une adresse `@calibraes.com` ou `belkhodja.brahim@live.fr` ; la configuration (équipe, date de démarrage) n'est modifiable que par l'administrateur (`belkhodja.brahim@live.fr` ou adresse `@calibraes.com` contenant le prénom « brahim »).
- **Identité dans l'application** : uniquement le compte connecté. Nom de l'équipe = association enregistrée dans Guide › Équipe, sinon prénom reconnu dans l'adresse (ex. `karim.x@` → Karim). Compte autorisé non associé = lecture seule.
- **Règle de décision** : une tâche « Décision » ne peut être validée que par son décideur ou par Ali (contrôle dans l'interface).

## 4. Secrets et sécurité

- Aucun secret dans le dépôt. `config.js` contient l'URL du projet et la **clé publique** Supabase (`sb_publishable_…`), conçue pour être exposée ; la protection est assurée par les règles RLS.
- Ne jamais publier : la clé `service_role` / secret, le mot de passe de la base, les mots de passe des utilisateurs, une clé d'accès personnelle `sbp_…`.
- Documents internes exclus du dépôt par `.gitignore` : brief, prototype, ancien `ALGERAC_suivi_data.js`, fichier Excel.
- Vérifié de l'extérieur le 05-11-2026 : visiteur non connecté → 0 donnée (docs, audit, fichiers) ; inscription libre refusée (« signup_disabled ») ; mauvais mot de passe refusé.

## 5. Tests réalisés

| Test | Résultat |
|---|---|
| `tests/ui-test.js` (jsdom + fausse base, 31 scénarios : déconnexion, refus, filtres et onglets, identité, lecture seule, conflit, décision réservée, équipe d'Ali) | **31/31 OK** |
| `tests/live-check.js` (site réel dans Chrome, sans compte) : écran de connexion, forcer un utilisateur, mauvais mot de passe, erreurs JavaScript | **OK** |
| Tests avec de vrais comptes sur la vraie base (GATE 1 n°2 à 4, recette §9) | **Non faits** |

Limite : les tests automatiques remplacent Supabase par une fausse base ; le dépôt de fichiers et la synchronisation réelle n'ont pas encore été exercés.

## 6. Problèmes rencontrés et corrections (05-11-2026)

1. **Écran figé après déconnexion** : le menu « Utilisateur » restait actif sur l'écran de connexion et réaffichait l'application sans données. → Aucun rendu tant que l'accès n'est pas validé ; menu supprimé en mode réel. Le navigateur de Brahim a ensuite gardé l'ancienne version en cache (10 min) → numéros de version sur les scripts.
2. **Faille** : tout compte autorisé pouvait modifier la fiche Équipe (se déclarer « Ali »). → Règle serveur : configuration réservée à l'administrateur.
3. **Lecture seule pour tous** : aucune équipe enregistrée et administrateur limité à l'adresse live.fr. → Identité déduite du prénom ; adresse @calibraes.com de Brahim administrateur.
4. **Panneau Équipe invisible** sans explication pour un non-administrateur. → Message indiquant l'adresse connectée.
5. Onglets / filtres : un clic de menu remet les filtres à zéro, ferme le tiroir ; clic de phase mémorisé.

## 7. Points ouverts (à reprendre)

| # | Point | Action |
|---|---|---|
| 1 | **Ali (adresse @calibraes.com sans son prénom)** : « ne s'enregistre pas » — étape exacte non connue (création du compte, enregistrement de l'équipe, connexion ou lecture seule). Le scénario rejoué en test fonctionne. | Obtenir le message exact, ou diagnostiquer en base avec une clé d'accès Supabase. |
| 2 | **`schema.sql` à relancer** dans Supabase (règles « configuration = administrateur » et administrateur @calibraes.com). Non confirmé. | SQL Editor › coller le fichier › Run (relançable sans perte). |
| 3 | **Clé d'accès Supabase** (`SUPABASE_ACCESS_TOKEN`, variable d'environnement utilisateur Windows) pour que l'équipe dev administre la base sans solliciter Brahim. Supabase CLI 2.54.11 testé : la connexion interactive ne fonctionne pas sans terminal, d'où la clé. | Brahim crée la clé (dashboard › Account › Access tokens) et la pose lui-même ; jamais dans la conversation ni dans git. |
| 4 | **GATE 1 tests n°2 à 4** avec Karim, puis `docs/GATE1_RESULTATS.md` (GO / NO-GO). | Voir `docs/GUIDE_MISE_EN_SERVICE.md` étape 6. |
| 5 | Règle de décision et droits fins appliqués **dans l'interface seulement** ; le serveur vérifie l'appartenance à l'équipe, pas le décideur. | Si exigé : déplacer la règle dans une fonction SQL. |
| 6 | Le plan (156 tâches, prénoms, rôles) est dans `js/data.js`, donc public. | Si non souhaité : charger le plan depuis la base. |
| 7 | Fonctions du brief §6 non encore livrées : export Excel, panneau d'intégrité (22 contrôles), recette §9 complète. | Phase de construction, après GO. |
| 8 | Offre gratuite : projet en pause après 7 jours sans activité (données conservées, *Restore project*). Polices Google Fonts = seule ressource tierce. | Accepter ou héberger les polices. |
| 9 | Invitations par e-mail (pour que Brahim n'ait plus à créer les mots de passe) : nécessite un serveur d'envoi (SMTP calibraes.com). | Décision Brahim. |

## 8. Ce que l'assistant ne fait pas (règles)
Créer des comptes pour de vraies personnes, choisir ou saisir des mots de passe, effectuer les connexions et consentements à la place de Brahim, publier un secret.

## 9. Historique des commits

| Commit | Date | Objet |
|---|---|---|
| `753d650` | 05-11-2026 | Plateforme v1 (zip d'origine, MSAL/OneDrive, mode démo) |
| `15e3b48` | 05-11-2026 | Passage à Supabase |
| `d94d932` | 05-11-2026 | Activation du mode réel (clé publique) |
| `ad5927b` | 05-11-2026 | Correctifs contrôle d'accès et navigation |
| `01ac907` | 05-11-2026 | Versions anti-cache, menu Utilisateur masqué, déconnexion locale |
| `b20ee03` | 05-11-2026 | Identité par prénom, administrateur @calibraes.com |
| `73156d0` | 05-11-2026 | Explication panneau Équipe |
