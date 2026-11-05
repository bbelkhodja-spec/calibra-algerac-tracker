// Configuration publique — AUCUN secret ici.
// supabaseUrl : « Project URL » du projet Supabase (Project Settings › API).
// supabaseKey : clé PUBLIQUE « anon » / « publishable » (conçue pour être dans le navigateur ;
//               la protection réelle est faite côté serveur par les règles RLS de supabase/schema.sql).
//               Ne JAMAIS mettre ici la clé « service_role » / « secret » ni le mot de passe de la base.
// Tant que supabaseUrl ou supabaseKey est vide, la plateforme tourne en MODE DÉMO (données locales au navigateur).
window.TRACKER_CONFIG = {
  supabaseUrl: "",
  supabaseKey: "",
  allowDomains: ["calibraes.com"],
  admins: ["belkhodja.brahim@live.fr"],
  pollSeconds: 45
};
