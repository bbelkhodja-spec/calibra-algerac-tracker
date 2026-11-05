# Mise en service — Plateforme ALGERAC (pour Brahim, ~20 minutes)

Adresse de la plateforme : **https://bbelkhodja-spec.github.io/calibra-algerac-tracker/**
Tant que l'étape 3 n'est pas faite, elle tourne en **MODE DÉMO** (données locales à votre navigateur) : vous pouvez déjà tout essayer.

Rien ici ne demande de mot de passe ou de clé dans le code. Toutes les connexions et consentements sont faits par vous.

---

## Étape 0 — Mettre la plateforme en ligne sur GitHub (5 min)
*(Je n'ai pas pu créer le dépôt moi-même : l'accès GitHub de Claude est limité aux dépôts existants.)*

**Option A — PowerShell (si git et gh sont installés et gh connecté à votre compte GitHub) :**
```powershell
$RWP="C:\Users\BBelkhodja\OneDrive\Calibra\ALGERAC\RWP"; $P="C:\Users\BBelkhodja\CALIBRA-DEV\calibra-algerac-tracker"
Expand-Archive "$RWP\calibra-algerac-tracker.zip" -DestinationPath $P -Force
Set-Location $P; git init -b main; git add -A; git commit -m "Plateforme ALGERAC v1"
gh repo create calibra-algerac-tracker --public --source . --push
$U = gh api user --jq .login
gh api -X POST "repos/$U/calibra-algerac-tracker/pages" -f "source[branch]=main" -f "source[path]=/"
"Adresse : https://$U.github.io/calibra-algerac-tracker/"
```
**Option B — navigateur :** github.com › New repository › nom `calibra-algerac-tracker` › Public › Create. Puis « uploading an existing file » › glissez **tout le contenu** du zip décompressé › Commit. Puis Settings › Pages › Branch `main` / `/ (root)` › Save.

Attendez 1–2 minutes : la plateforme s'ouvre en mode démo. **Si votre identifiant GitHub n'est pas `bbelkhodja-spec`, remplacez-le dans l'adresse de l'étape 1.5.**

## Étape 1 — Enregistrer l'application chez Microsoft (5 min)
1. Ouvrez **https://entra.microsoft.com** et connectez-vous avec **belkhodja.brahim@live.fr**.
   - Si Microsoft demande de créer un annuaire / un compte Azure gratuit : acceptez l'option gratuite (pas d'abonnement payant nécessaire pour cet usage). *Si une carte bancaire est exigée, arrêtez et prévenez-moi.*
2. Menu **Applications › Inscriptions d'applications › Nouvelle inscription**.
3. Nom : `CALIBRA ALGERAC Tracker`.
4. Types de comptes pris en charge : **« Comptes Microsoft personnels uniquement »**.
5. URI de redirection : plateforme **« Application monopage (SPA) »**, valeur :
   `https://bbelkhodja-spec.github.io/calibra-algerac-tracker/`
6. Cliquez **Inscrire**.
7. Sur la page de l'application, copiez **« ID d'application (client) »** (format `xxxxxxxx-xxxx-…`). → c'est le **clientId**.
8. Menu **Autorisations de l'API › Ajouter une autorisation › Microsoft Graph › Autorisations déléguées** : cochez **User.Read** et **Files.ReadWrite.All** › Ajouter.

## Étape 2 — Créer et partager le dossier OneDrive (5 min)
1. Sur **https://onedrive.live.com** (compte belkhodja.brahim@live.fr), créez à la racine le dossier **`ALGERAC-Tracker`**.
2. Clic droit sur le dossier › **Partager** › réglage du lien : **« Personnes spécifiques »** + **« Peut modifier »**.
3. Ajoutez les adresses des membres (comptes Microsoft créés sur leur adresse @calibraes.com — voir étape 5). Vous pourrez en ajouter plus tard.
4. **Copier le lien** → c'est le **shareUrl**.

## Étape 3 — Activer le mode réel (1 min)
Donnez-moi (dans la conversation Claude) le **clientId** et le **shareUrl** : je mets à jour `config.js` sur GitHub.
*(Ou vous-même : GitHub › dépôt `calibra-algerac-tracker` › `config.js` › crayon › collez les deux valeurs entre les guillemets › Commit.)*

## Étape 4 — Première connexion (2 min)
1. Ouvrez la plateforme › **Se connecter avec Microsoft** › compte **belkhodja.brahim@live.fr** › acceptez les autorisations.
2. Menu **Guide** › panneau **Équipe** : saisissez l'adresse de chaque membre (Ali, Karim, Nabil, et la vôtre si vous utilisez aussi une adresse @calibraes.com) › **Enregistrer l'équipe**.
3. Menu **Dates ALGERAC** › vérifiez la date de démarrage (08-11-2026 par défaut).

## Étape 5 — Comptes de l'équipe (chaque membre, 3 min)
Envoyez-leur le fichier `GUIDE_EQUIPE.md`. Chaque membre :
1. crée un compte Microsoft gratuit sur **https://signup.live.com** avec **son adresse @calibraes.com** (« utiliser une adresse e-mail existante ») ;
2. vous communique que c'est fait → vous l'ajoutez au partage du dossier (étape 2.3) et au panneau Équipe (étape 4.2).

## Étape 6 — Tests de validation (10 min, avec un membre)
| # | Test | Résultat attendu |
|---|---|---|
| 1 | Un compte non @calibraes.com se connecte | « Accès refusé » |
| 2 | Karim passe une tâche à « Démarrer » | Visible chez vous en moins d'une minute |
| 3 | Karim joint un fichier Word de 10 Mo | Fichier présent dans OneDrive › ALGERAC-Tracker › evidence › n° de tâche |
| 4 | Vous et Karim modifiez la même tâche en même temps | Les deux modifications sont gardées ou un message « réessayez » ; jamais de perte silencieuse |
| 5 | Saisir « Réunion de clôture » = 10-06-2027 | P11-01 → 20-06-2027 ; P11-04 → 10-12-2027 |
| 6 | Ouvrir OneDrive › ALGERAC-Tracker › data | Fichiers `tasks.json`, `audit-AAAA-MM.json` (journal des modifications) |

Si le test 2 ou 3 échoue avec « Accès au dossier partagé refusé » : c'est la limite Microsoft identifiée (partage entre comptes personnels). Envoyez-moi le message exact ; l'alternative est prête dans le brief (connexion par code envoyé sur l'adresse @calibraes.com).

---
**Données :** tout est dans OneDrive › ALGERAC-Tracker (`data/*.json` + `evidence/`). Rien n'est stocké sur GitHub. Le bouton **Guide › Télécharger la sauvegarde** produit une copie complète (à ranger chaque semaine dans le dossier CALIBRA).
