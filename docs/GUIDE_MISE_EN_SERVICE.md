# Mise en service — Plateforme ALGERAC (pour Brahim, ~20 minutes)

Adresse de la plateforme : **https://bbelkhodja-spec.github.io/calibra-algerac-tracker/**
Tant que l'étape 4 n'est pas faite, elle tourne en **MODE DÉMO** (données locales à votre navigateur).

Hébergement des données : **Supabase**, offre gratuite (aucune carte bancaire), serveur en Europe (Francfort).
Rien ici ne demande de mot de passe ou de clé secrète dans le code. Toutes les connexions sont faites par vous.

> Décision du 05-11-2026 : l'enregistrement d'une application Microsoft exige désormais un annuaire Azure
> (vérification par carte bancaire). Option de secours du brief retenue par Brahim : Supabase.

---

## Étape 1 — Créer le compte et le projet Supabase (5 min)
1. Ouvrez **https://supabase.com** › **Start your project** › **Continue with GitHub** (compte `bbelkhodja-spec`) › autorisez.
2. Créez une organisation : nom `CALIBRA`, type *Company*, plan **Free**.
3. **New project** :
   - Name : `calibra-algerac`
   - Database Password : cliquez **Generate a password**, puis rangez-le dans votre gestionnaire de mots de passe. **Ne le donnez à personne, pas même à Claude** (la plateforme n'en a pas besoin).
   - Region : **Central EU (Frankfurt)**
   - **Create new project** (1 à 2 minutes de préparation).

## Étape 2 — Créer la base (1 min)
1. Menu de gauche › **SQL Editor** › **New query**.
2. Collez tout le contenu du fichier `supabase/schema.sql` du dépôt › **Run**.
3. Résultat attendu : « Success. No rows returned ».

## Étape 3 — Régler la connexion (3 min)
1. **Authentication › Sign In / Providers** (ou *Providers*) :
   - **Allow new users to sign up** : **désactivé** (seul l'administrateur crée les comptes).
   - Provider **Email** : activé.
2. **Authentication › URL Configuration** : *Site URL* = `https://bbelkhodja-spec.github.io/calibra-algerac-tracker/` › Save.
3. **Authentication › Users › Add user › Create new user**, pour chaque personne :
   - Email : l'adresse (belkhodja.brahim@live.fr, puis karim…@calibraes.com, etc.)
   - Password : un mot de passe provisoire (12 caractères minimum)
   - **Auto Confirm User** : coché › Create user.
   - Remettez le mot de passe provisoire **de vive voix**, jamais par e-mail. Chacun le change à la première connexion.

## Étape 4 — Activer le mode réel (1 min)
1. **Project Settings › API** (ou *API Keys*) : copiez
   - **Project URL** (`https://xxxx.supabase.co`) → `supabaseUrl`
   - la clé **anon / publishable** (publique) → `supabaseKey`
   - **Jamais** la clé `service_role` / `secret`.
2. Donnez ces deux valeurs à Claude, qui met à jour `config.js` sur GitHub.
   *(Ou vous-même : GitHub › `config.js` › crayon › collez les deux valeurs entre les guillemets › Commit.)*

## Étape 5 — Première connexion (2 min)
1. Ouvrez la plateforme › votre adresse + mot de passe › **Se connecter**.
2. **Changer mon mot de passe** (bas du menu).
3. Menu **Guide** › panneau **Équipe** : associez chaque nom à son adresse › **Enregistrer l'équipe**.
4. Menu **Dates ALGERAC** › vérifiez la date de démarrage (08-11-2026 par défaut).

## Étape 6 — Tests GATE 1 (10 min, avec Karim)
| # | Test | Résultat attendu |
|---|---|---|
| 1 | Un compte hors liste (ex. adresse personnelle créée pour le test) se connecte | « Accès refusé », aucune donnée |
| 2 | Karim passe une tâche à « Démarrer » | Visible chez vous en moins d'une minute ; ligne dans la table `audit` |
| 3 | Karim joint un PDF de 10 Mo et un .docx | Fichiers dans Supabase › Storage › evidence › n° de tâche ; vous pouvez les ouvrir |
| 4 | Vous et Karim modifiez la même tâche en même temps | Le second reçoit « Modifié par … entre-temps » ; aucune perte silencieuse (vérifier `audit`) |

Contrôle : Supabase › **Table Editor** › `docs` (données) et `audit` (journal, non modifiable).

---
**Bon à savoir**
- Offre gratuite : 500 Mo de base, 1 Go de fichiers, 50 Mo par fichier. Un projet **inactif 7 jours** est mis en pause (données conservées) : un clic sur *Restore project* dans Supabase le relance.
- **Retirer un utilisateur** : Authentication › Users › … › *Delete user* (ses traces dans le journal restent).
- **Sauvegarde** : bouton **Guide › Télécharger la sauvegarde** chaque semaine, à ranger dans OneDrive › Calibra › ALGERAC › RWP.
