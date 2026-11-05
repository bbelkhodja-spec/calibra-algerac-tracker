# CALIBRA — Suivi de l'accréditation ALGERAC (ISO/IEC 17020)

Plateforme web statique (GitHub Pages) + base de données et stockage **Supabase** (connexion e-mail + mot de passe, règles d'accès côté serveur).

- `index.html`, `js/app.js` : interface (tableau de bord, tâches, pièces du dossier, questionnaire FOR 04-1, dates ALGERAC, preuves).
- `js/data.js` : plan d'accréditation (156 tâches, 112 clauses FOR 04-1, 15 jalons ALGERAC).
- `js/store.js` : couche de données (mode démo local / mode réel Supabase).
- `config.js` : configuration **publique** (aucun secret). Champs vides = mode démo.
- `supabase/schema.sql` : tables, journal d'audit, règles d'accès (RLS), espace de stockage des preuves.
- `vendor/` : supabase-js 2.45.4 (licence MIT), servi depuis ce dépôt (aucun script tiers externe).
- `docs/` : guides de mise en service et d'utilisation.

**Aucune donnée n'est stockée dans ce dépôt.**
