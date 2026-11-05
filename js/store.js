/* Store — couche de données de la plateforme ALGERAC.
 * Même interface que le prototype (collection().onSnapshot, doc().set/delete, collection().add).
 * Deux modes :
 *   - DEMO : données dans le navigateur (localStorage) — tant que supabaseUrl / supabaseKey sont vides.
 *   - LIVE : Supabase (connexion e-mail + mot de passe, base PostgreSQL protégée par RLS, stockage des preuves).
 * Une ligne par document : table docs (col, id, data, version, deleted).
 * Écritures : mise à jour conditionnée à la version connue ; si quelqu'un a modifié entre-temps,
 *   rien n'est écrasé : la fiche est rechargée et l'utilisateur est prévenu (« Modifié par X entre-temps »).
 * Journal d'audit : écrit par le serveur (déclencheur SQL) à chaque écriture, non modifiable.
 * Aucune suppression physique : « supprimer » = deleted:true (+ trace dans le journal).
 */
(function () {
  const CFG = window.TRACKER_CONFIG || {};
  const COLS = ['tasks', 'jalons', 'evidence', 'comments', 'clauses', 'config'];
  const BUCKET = 'evidence';
  const subs = {};            // col -> [cb]
  const cache = {};           // col -> {id: data}   (documents actifs)
  const meta = {};            // col -> {id: {version, deleted, by}}
  COLS.forEach(c => { subs[c] = []; cache[c] = {}; meta[c] = {}; });
  const Store = { mode: (CFG.supabaseUrl && CFG.supabaseKey) ? 'live' : 'demo', email: '', lastSync: null, error: null };

  const snap = col => ({
    docs: Object.entries(cache[col] || {}).map(([id, d]) => ({ id, exists: true, data: () => d })),
    metadata: { fromCache: false, hasPendingWrites: false }
  });
  const emit = col => (subs[col] || []).forEach(cb => { try { cb(snap(col)); } catch (e) { console.error(e); } });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* ---------------- DEMO backend ---------------- */
  const demo = {
    key: c => 'algerac_demo_' + c,
    async load() { COLS.forEach(c => { try { cache[c] = JSON.parse(localStorage.getItem(demo.key(c)) || '{}'); } catch (e) { cache[c] = {}; } }); },
    async patch(col, id, value) {
      if (value === null) delete cache[col][id]; else cache[col][id] = value;
      try { localStorage.setItem(demo.key(col), JSON.stringify(cache[col])); } catch (e) {}
      emit(col);
    },
    async upload() { throw { code: 'demo', message: 'Téléversement indisponible en mode démo : utilisez un lien.' }; },
    async poll() {}
  };

  /* ---------------- LIVE backend (Supabase) ---------------- */
  let sb = null;
  const errMsg = (e, what) => ({ code: (e && (e.code || e.status)) || 'err', message: what + ((e && e.message) ? ' : ' + e.message : '') });

  // Applique une ligne venant du serveur ; renvoie true si le cache a changé.
  function apply(row) {
    if (!row || !COLS.includes(row.col)) return false;
    const m = meta[row.col][row.id];
    if (m && m.version > row.version) return false;             // ligne plus ancienne que celle connue
    if (m && m.version === row.version && m.deleted === row.deleted) return false;
    meta[row.col][row.id] = { version: row.version, deleted: row.deleted, by: row.updated_by };
    if (row.deleted) delete cache[row.col][row.id]; else cache[row.col][row.id] = row.data;
    return true;
  }
  async function fetchAll() {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('docs').select('col,id,data,deleted,version,updated_by').order('col').order('id').range(from, from + 999);
      if (error) throw errMsg(error, 'Lecture des données impossible');
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return rows;
  }
  async function conflict(col, id) {
    const { data } = await sb.from('docs').select('col,id,data,deleted,version,updated_by').eq('col', col).eq('id', id).maybeSingle();
    if (data) { meta[col][id] = null; apply(data); }
    emit(col);
    const who = (data && data.updated_by) || 'un autre utilisateur';
    throw { code: 'conflict', message: 'Modifié par ' + who + ' entre-temps : la fiche a été rechargée, refaites votre modification.' };
  }

  const live = {
    async load() {
      const rows = await fetchAll();
      COLS.forEach(c => { cache[c] = {}; meta[c] = {}; });
      rows.forEach(apply);
      Store.lastSync = new Date();
    },
    async patch(col, id, value) {
      const m = meta[col][id];
      let res;
      if (!m) {
        if (value === null) return;
        res = await sb.from('docs').insert({ col, id, data: value }).select('col,id,data,deleted,version,updated_by');
        if (res.error) { if (res.error.code === '23505') return conflict(col, id); throw errMsg(res.error, 'Écriture refusée'); }
      } else {
        const upd = value === null ? { deleted: true } : { data: value, deleted: false };
        res = await sb.from('docs').update(upd).eq('col', col).eq('id', id).eq('version', m.version).select('col,id,data,deleted,version,updated_by');
        if (res.error) throw errMsg(res.error, 'Écriture refusée');
        if (!res.data.length) return conflict(col, id);
      }
      apply(res.data[0]); emit(col);
    },
    async upload(taskId, file) {
      const clean = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-() ]/g, '_');
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
      const path = taskId + '/' + stamp + '_' + clean;
      const { error } = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (error) throw errMsg(error, 'Téléversement refusé');
      return { itemId: path, webUrl: '', name: file.name, size: file.size, path };
    },
    async poll() {
      const rows = await fetchAll();
      const changed = new Set();
      rows.forEach(r => { if (apply(r)) changed.add(r.col); });
      changed.forEach(emit);
      Store.lastSync = new Date();
    }
  };

  const B = Store.mode === 'live' ? live : demo;

  /* ---------------- Auth (live) ---------------- */
  Store.allowed = email => {
    const e = (email || '').toLowerCase();
    if ((CFG.admins || []).map(x => x.toLowerCase()).includes(e)) return true;
    return (CFG.allowDomains || []).some(d => e.endsWith('@' + d.toLowerCase()));
  };
  Store.isAdmin = () => (CFG.admins || []).map(x => x.toLowerCase()).includes(Store.email);
  Store.signIn = async (email, password) => {
    const { error } = await sb.auth.signInWithPassword({ email: (email || '').trim(), password: password || '' });
    if (error) return error.message === 'Invalid login credentials' ? 'Adresse ou mot de passe incorrect.' : error.message;
    location.reload(); return null;
  };
  Store.signOut = async () => { try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {} try { Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k)); } catch (e) {} location.reload(); };
  Store.changePassword = async password => {
    const { error } = await sb.auth.updateUser({ password });
    return error ? error.message : null;
  };
  Store.openFile = async path => {
    const win = window.open('', '_blank');
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 600);
    if (error) { if (win) win.close(); throw errMsg(error, 'Ouverture impossible'); }
    if (win) win.location = data.signedUrl; else location.href = data.signedUrl;
  };

  Store.init = async function () {
    if (Store.mode === 'demo') { await demo.load(); return { ok: true }; }
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { ok: false, reason: 'signin' };
    Store.email = (session.user.email || '').toLowerCase();
    if (!Store.allowed(Store.email)) return { ok: false, reason: 'denied' };
    try { await live.load(); } catch (e) { Store.error = e; return { ok: false, reason: 'error', error: e }; }
    sb.channel('docs').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, p => {
      if (apply(p.new)) { emit(p.new.col); Store.lastSync = new Date(); emit('_sync'); }
    }).subscribe();
    setInterval(() => live.poll().then(() => emit('_sync')).catch(e => console.warn(e)), (CFG.pollSeconds || 45) * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) live.poll().then(() => emit('_sync')).catch(() => {}); });
    return { ok: true };
  };

  /* ---------------- prototype-compatible API ---------------- */
  Store.collection = col => ({
    onSnapshot(cb) { (subs[col] = subs[col] || []).push(cb); setTimeout(() => cb(snap(col)), 0); return () => { subs[col] = subs[col].filter(x => x !== cb); }; },
    doc(id) { return Store.doc(col + '/' + id); },
    async add(data) { const id = uid(); await B.patch(col, id, data); return { id }; }
  });
  Store.doc = path => {
    const [col, id] = path.split('/');
    return {
      async set(data) { await B.patch(col, id, data); },
      async delete() { await B.patch(col, id, null); },
      onSnapshot(cb) {
        const w = s => { const d = (cache[col] || {})[id]; cb({ id, exists: !!d, data: () => d }); };
        (subs[col] = subs[col] || []).push(w); setTimeout(() => w(), 0); return () => {};
      }
    };
  };
  Store.upload = (taskId, file) => B.upload(taskId, file);
  Store.onSync = cb => subs._sync = [cb];
  window.Store = Store;
})();
