// Configuration publique — AUCUN secret ici.
// clientId : identifiant public de l'application Microsoft (à coller après l'enregistrement).
// shareUrl : lien de partage du dossier OneDrive « ALGERAC-Tracker » (lien « Personnes spécifiques »).
// Tant que clientId est vide, la plateforme tourne en MODE DÉMO (données locales au navigateur).
window.TRACKER_CONFIG = {
  clientId: "",
  shareUrl: "",
  allowDomains: ["calibraes.com"],
  admins: ["belkhodja.brahim@live.fr"],
  pollSeconds: 45
};
