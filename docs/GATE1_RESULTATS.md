# GATE 1 — Résultats

**Date : 05-11-2026** · **Décision : NON CONCLU** (ni GO ni NO-GO) — tests à deux utilisateurs non réalisés.
Détail et contexte : `docs/ETAT_PROJET.md`.

## Volet Microsoft (brief v2) — NO-GO
| # | Test | Résultat | Preuve |
|---|---|---|---|
| 1 | Enregistrement d'application pour comptes personnels | **Échec** : « Selected user account does not exist in tenant 'Microsoft Services' and cannot access the application '74658136-14ec-4630-ad9b-26e160ff0fc6' ». Un annuaire Azure (vérification par carte bancaire) serait requis. | Message relevé par Brahim, 05-11-2026 |
| 2–4 | Lecture/écriture, dépôt de fichiers, concurrence via OneDrive | Non exécutables | — |

Options présentées : (A) compte Azure gratuit avec vérification par carte ; (B) option de secours du brief. **Brahim a choisi B le 05-11-2026.**

## Volet Supabase (option de secours retenue)
| # | Test | Résultat | Preuve |
|---|---|---|---|
| 1 | Création du projet sans carte, connexion, refus des comptes hors liste | **Partiel OK** : projet Free créé ; visiteur non connecté = 0 donnée ; inscription libre refusée ; mauvais mot de passe refusé ; refus d'un compte hors liste vérifié en test automatique uniquement. | `tests/live-check.js`, `tests/ui-test.js` ; requêtes du 05-11-2026 (`signup_disabled`, réponses `[]`) |
| 2 | B lit et écrit, visible chez A < 60 s, ligne d'audit | **À faire** | — |
| 3 | B dépose un PDF de 10 Mo et un .docx, A les ouvre | **À faire** | — |
| 4 | Deux écritures simultanées : message, aucune perte | **À faire** (OK en test automatique avec fausse base) | `tests/ui-test.js` |

Pour conclure : faire les tests 2 à 4 avec Karim (`docs/GUIDE_MISE_EN_SERVICE.md`, étape 6), contrôler la table `audit`, puis remplacer « NON CONCLU » par GO ou NO-GO.
