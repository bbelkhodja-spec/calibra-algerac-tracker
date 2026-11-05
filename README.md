# CALIBRA — Suivi de l'accréditation ALGERAC (ISO/IEC 17020)

Plateforme web statique (GitHub Pages) + connexion Microsoft (MSAL) + données dans un dossier OneDrive partagé (Microsoft Graph).

- `index.html`, `js/app.js` : interface (tableau de bord, tâches, pièces du dossier, questionnaire FOR 04-1, dates ALGERAC, preuves).
- `js/data.js` : plan d'accréditation (156 tâches, 112 clauses FOR 04-1, 15 jalons ALGERAC).
- `js/store.js` : couche de données (mode démo local / mode réel OneDrive).
- `config.js` : configuration **publique** (aucun secret). `clientId` vide = mode démo.
- `vendor/` : MSAL.js 3.28.1 (Microsoft, licence MIT).
- `docs/` : guides de mise en service et d'utilisation.

**Aucune donnée n'est stockée dans ce dépôt.** Les données sont dans OneDrive › ALGERAC-Tracker.
