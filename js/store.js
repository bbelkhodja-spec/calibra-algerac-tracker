/* Store — couche de données de la plateforme ALGERAC.
 * Même interface que le prototype (collection().onSnapshot, doc().set/delete, collection().add)
 * Deux modes :
 *   - DEMO : données dans le navigateur (localStorage) — tant que config.clientId est vide.
 *   - LIVE : Microsoft (MSAL) + Microsoft Graph, fichiers JSON dans le dossier OneDrive partagé.
 * Un fichier JSON par collection : data/<collection>.json = { id: document }.
 * Écritures : lecture → modification → écriture avec If-Match (eTag) ; en cas de conflit (412) on relit et on rejoue.
 * Chaque écriture est tracée dans data/audit-AAAA-MM.json (qui, quand, quoi, avant → après).
 */
(function () {
  const CFG = window.TRACKER_CONFIG || {};
  const COLS = ['tasks', 'jalons', 'evidence', 'comments', 'clauses', 'config'];
  const SCOPES = ['User.Read', 'Files.ReadWrite.All'];
  const subs = {};            // col -> [cb]
  const cache = {};           // col -> {id: doc}
  const etags = {};           // col -> eTag
  COLS.forEach(c => { subs[c] = []; cache[c] = {}; });
  const Store = { mode: CFG.clientId ? 'live' : 'demo', account: null, email: '', lastSync: null, error: null };

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

  /* ---------------- LIVE backend (MSAL + Graph) ---------------- */
  let pca = null, driveId = null, folderId = null;
  const G = 'https://graph.microsoft.com/v1.0';
  async function token() {
    const req = { scopes: SCOPES, account: Store.account };
    try { return (await pca.acquireTokenSilent(req)).accessToken; }
    catch (e) { await pca.acquireTokenRedirect(req); throw e; }
  }
  async function gfetch(url, opt = {}) {
    const t = await token();
    opt.headers = Object.assign({ Authorization: 'Bearer ' + t }, opt.headers || {});
    const r = await fetch(url.startsWith('http') ? url : G + url, opt);
    return r;
  }
  const b64url = s => btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
  async function resolveFolder() {
    if (!CFG.shareUrl) throw { code: 'config', message: 'Lien de partage du dossier (shareUrl) manquant dans config.js.' };
    const r = await gfetch('/shares/u!' + b64url(CFG.shareUrl) + '/driveItem?$select=id,name,parentReference');
    if (!r.ok) throw { code: 'share_' + r.status, message: 'Accès au dossier partagé refusé (' + r.status + '). Le dossier ALGERAC-Tracker est-il partagé avec ce compte ?' };
    const it = await r.json();
    driveId = it.parentReference.driveId; folderId = it.id;
  }
  const pathUrl = p => '/drives/' + driveId + '/items/' + folderId + ':/' + p.split('/').map(encodeURIComponent).join('/') + ':';
  async function readJson(path) { // -> {data, eTag} | {data:null, eTag:null}
    const m = await gfetch(pathUrl(path) + '?$select=id,eTag,@microsoft.graph.downloadUrl');
    if (m.status === 404) return { data: null, eTag: null };
    if (!m.ok) throw { code: 'read_' + m.status, message: 'Lecture impossible : ' + path };
    const meta = await m.json();
    const c = meta['@microsoft.graph.downloadUrl'] ? await fetch(meta['@microsoft.graph.downloadUrl']) : await gfetch(pathUrl(path) + '/content');
    if (!c.ok) throw { code: 'read_' + c.status, message: 'Lecture impossible : ' + path };
    return { data: await c.json(), eTag: meta.eTag };
  }
  async function writeJson(path, data, eTag) {
    const headers = { 'Content-Type': 'application/json' };
    let url = pathUrl(path) + '/content';
    if (eTag) headers['If-Match'] = eTag; else url += '?@microsoft.graph.conflictBehavior=fail';
    const r = await gfetch(url, { method: 'PUT', headers, body: JSON.stringify(data, null, 1) });
    if (r.status === 412 || r.status === 409) return { conflict: true };
    if (!r.ok) throw { code: 'write_' + r.status, message: 'Écriture refusée (' + r.status + ')' + (r.status === 403 ? ' : ce compte a-t-il le droit « modification » sur le dossier ?' : '') };
    const j = await r.json(); return { eTag: j.eTag };
  }
  async function rmw(path, mutate) { // read-modify-write with retry on conflict
    for (let i = 0; i < 5; i++) {
      const cur = await readJson(path);
      const next = mutate(cur.data);
      const w = await writeJson(path, next, cur.eTag);
      if (!w.conflict) return { data: next, eTag: w.eTag };
      await new Promise(r => setTimeout(r, 300 + Math.random() * 700));
    }
    throw { code: 'conflict', message: 'Modification simultanée : réessayez.' };
  }
  const live = {
    async load() {
      await resolveFolder();
      for (const c of COLS) { const r = await readJson('data/' + c + '.json'); cache[c] = r.data || {}; etags[c] = r.eTag; }
      Store.lastSync = new Date();
    },
    async patch(col, id, value) {
      let before = null;
      const res = await rmw('data/' + col + '.json', d => { d = d || {}; before = d[id] || null; if (value === null) delete d[id]; else d[id] = value; return d; });
      cache[col] = res.data; etags[col] = res.eTag; emit(col);
      const month = new Date().toISOString().slice(0, 7);
      try { await rmw('data/audit-' + month + '.json', a => { a = Array.isArray(a) ? a : []; a.push({ at: new Date().toISOString(), email: Store.email, col, id, before, after: value }); return a; }); }
      catch (e) { console.warn('audit', e); }
    },
    async upload(taskId, file) {
      const safe = file.name.replace(/[\\/:*?"<>|#%]/g, '_');
      const path = 'evidence/' + taskId + '/' + new Date().toISOString().slice(0, 10) + '_' + safe;
      let item;
      if (file.size <= 4 * 1024 * 1024) {
        const r = await gfetch(pathUrl(path) + '/content?@microsoft.graph.conflictBehavior=rename', { method: 'PUT', body: file });
        if (!r.ok) throw { code: 'upload_' + r.status, message: 'Téléversement refusé (' + r.status + ')' };
        item = await r.json();
      } else {
        const s = await gfetch(pathUrl(path) + '/createUploadSession', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }) });
        if (!s.ok) throw { code: 'session_' + s.status, message: 'Session de téléversement refusée (' + s.status + ')' };
        const { uploadUrl } = await s.json();
        const CH = 320 * 1024 * 10;
        for (let off = 0; off < file.size; off += CH) {
          const end = Math.min(off + CH, file.size) - 1;
          const r = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': 'bytes ' + off + '-' + end + '/' + file.size }, body: file.slice(off, end + 1) });
          if (!r.ok && r.status !== 202) throw { code: 'chunk_' + r.status, message: 'Téléversement interrompu (' + r.status + ')' };
          if (r.status === 200 || r.status === 201) item = await r.json();
        }
      }
      return { itemId: item.id, webUrl: item.webUrl, name: item.name, size: item.size, path };
    },
    async poll() {
      for (const c of COLS) {
        const m = await gfetch(pathUrl('data/' + c + '.json') + '?$select=eTag');
        if (m.status === 404) continue;
        if (!m.ok) continue;
        const { eTag } = await m.json();
        if (eTag !== etags[c]) { const r = await readJson('data/' + c + '.json'); cache[c] = r.data || {}; etags[c] = r.eTag; emit(c); }
      }
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
  Store.signIn = () => pca.loginRedirect({ scopes: SCOPES, prompt: 'select_account' });
  Store.signOut = () => pca.logoutRedirect({ account: Store.account });

  Store.init = async function () {
    if (Store.mode === 'demo') { await demo.load(); return { ok: true }; }
    pca = new msal.PublicClientApplication({
      auth: { clientId: CFG.clientId, authority: 'https://login.microsoftonline.com/consumers', redirectUri: location.origin + location.pathname },
      cache: { cacheLocation: 'localStorage' }
    });
    await pca.initialize();
    const red = await pca.handleRedirectPromise();
    Store.account = (red && red.account) || pca.getAllAccounts()[0] || null;
    if (!Store.account) return { ok: false, reason: 'signin' };
    Store.email = (Store.account.username || '').toLowerCase();
    if (!Store.allowed(Store.email)) return { ok: false, reason: 'denied' };
    try { await live.load(); } catch (e) { Store.error = e; return { ok: false, reason: 'error', error: e }; }
    setInterval(() => live.poll().then(() => emit('_sync')).catch(e => console.warn(e)), (CFG.pollSeconds || 45) * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) live.poll().catch(() => {}); });
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
