// Configuration publique — AUCUN secret ici.
// supabaseUrl : « Project URL » du projet Supabase (Project Settings › API).
// supabaseKey : clé PUBLIQUE « anon » / « publishable » (conçue pour être dans le navigateur ;
//               la protection réelle est faite côté serveur par les règles RLS de supabase/schema.sql).
//               Ne JAMAIS mettre ici la clé « service_role » / « secret » ni le mot de passe de la base.
// Tant que supabaseUrl ou supabaseKey est vide, la plateforme tourne en MODE DÉMO (données locales au navigateur).
window.TRACKER_CONFIG = {
  supabaseUrl: "https://almvihcaavxtksyxahej.supabase.co",
  supabaseKey: "sb_publishable_uNYZ2umf0-1xG7upz81mUw_hrRTpDPB",
  allowDomains: ["calibraes.com"],
  admins: ["belkhodja.brahim@live.fr"],
  adminFirstNames: ["brahim"],   // une adresse @calibraes.com contenant ce prénom est administrateur
  pollSeconds: 45
};
