// Usage : npm i jsdom@24.1.3 (dans un dossier hors dépôt), puis : node tests/ui-test.js <chemin du dépôt>
// Tests headless de l'interface (jsdom) avec un faux Supabase en mémoire.
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const REPO = process.argv[2];
const rd = f => fs.readFileSync(path.join(REPO, f), 'utf8');
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fails++; };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

function fakeSupabase(db, session) {
  const rows = () => db.rows;
  function builder(table) {
    const q = { op: 'select', filters: [], payload: null };
    const b = {
      select() { return b; }, order() { return b; }, range() { return b; },
      eq(k, v) { q.filters.push([k, v]); return b; },
      maybeSingle() { q.single = true; return b; },
      insert(p) { q.op = 'insert'; q.payload = p; return b; },
      update(p) { q.op = 'update'; q.payload = p; return b; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); }
    };
    function match(r) { return q.filters.every(([k, v]) => r[k] === v); }
    function run() {
      db.calls.push(q.op);
      if (q.op === 'select') { const d = rows().filter(match).map(r => ({ ...r })); return { data: q.single ? (d[0] || null) : d, error: null }; }
      if (q.op === 'insert') {
        if (rows().some(r => r.col === q.payload.col && r.id === q.payload.id)) return { data: null, error: { code: '23505', message: 'dup' } };
        const r = { ...q.payload, deleted: false, version: 1, updated_by: session.user.email }; rows().push(r); return { data: [{ ...r }], error: null };
      }
      if (q.op === 'update') {
        const hit = rows().filter(match);
        hit.forEach(r => { Object.assign(r, q.payload); r.version++; r.updated_by = session.user.email; });
        return { data: hit.map(r => ({ ...r })), error: null };
      }
    }
    return b;
  }
  return {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session } }),
        signInWithPassword: async () => ({ error: { message: 'Invalid login credentials' } }),
        signOut: async () => ({}), updateUser: async () => ({ error: null })
      },
      from: builder,
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      storage: { from: () => ({ upload: async () => ({ error: null }), createSignedUrl: async () => ({ data: { signedUrl: 'about:blank' } }) }) }
    })
  };
}

async function boot({ live, email, members, rows }) {
  const db = { rows: rows || [], calls: [] };
  if (members) db.rows.push({ col: 'config', id: 'main', data: { launch: '2026-11-08', members }, deleted: false, version: 1, updated_by: 'x' });
  let html = rd('index.html').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    if (src.includes('supabase-js')) return '';
    let code = rd(src);
    if (src === 'config.js' && !live) code = code.replace(/supabaseUrl: "[^"]*"/, 'supabaseUrl: ""');
    return '<script>' + code.replace(/<\/script>/g, '<\\/script>') + '</script>';
  });
  const session = email ? { user: { email } } : null;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.github.io/calibra-algerac-tracker/',
    beforeParse(w) { w.supabase = fakeSupabase(db, session); w.scrollTo = () => {}; w.open = () => null; }
  });
  await tick(80);
  return { w: dom.window, d: dom.window.document, db };
}
const txt = d => d.getElementById('main').textContent;
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const change = (w, el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };

(async () => {
  // 1. Déconnecté : écran de connexion, choix de personne sans effet
  { const { w, d } = await boot({ live: true, email: null });
    ok(!!d.getElementById('lf'), 'déconnecté : formulaire de connexion affiché');
    const me = d.getElementById('me'); ok(me.disabled, 'déconnecté : menu Utilisateur désactivé');
    change(w, me, 'Karim'); await tick();
    ok(!!d.getElementById('lf') && !txt(d).includes('Tableau de bord'), 'déconnecté : choisir une personne ne montre PAS l’application');
    ok(d.getElementById('nav').children.length === 0, 'déconnecté : aucun onglet');
    w.localStorage.setItem('alg_me', 'Ali'); }

  // 2. Compte hors liste
  { const { d } = await boot({ live: true, email: 'pirate@gmail.com' });
    ok(txt(d).includes('Accès refusé') && !txt(d).includes('Tableau de bord'), 'compte hors liste : accès refusé, aucune donnée'); }

  // 3. Karim connecté et associé
  const members = { 'karim@calibraes.com': 'Karim', 'belkhodja.brahim@live.fr': 'Brahim' };
  { const { w, d, db } = await boot({ live: true, email: 'karim@calibraes.com', members });
    ok(txt(d).includes('Tableau de bord'), 'Karim : tableau de bord affiché');
    ok(d.getElementById('me').value === 'Karim' && d.getElementById('me').disabled, 'Karim : identité = compte, menu verrouillé');
    // KPI « En retard » -> Tâches filtré
    click(w, d.querySelector('[data-go="f:blocked"]')); await tick();
    ok(d.getElementById('fst') && d.getElementById('fst').value === 'blocked', 'tuile « Bloquées » → onglet Tâches filtré sur Bloqué');
    // onglet Tâches depuis le menu -> filtres remis à zéro
    click(w, d.querySelector('#nav [data-v="tasks"]')); await tick();
    ok(d.getElementById('fst').value === '' && /156 tâche\(s\)/.test(txt(d)), 'menu « Tâches » → filtres vidés (156 tâches)');
    // filtre phase via select
    change(w, d.getElementById('fph'), 'P1'); await tick();
    const nP1 = (txt(d).match(/(\d+) tâche\(s\)/) || [])[1];
    ok(+nP1 > 0 && +nP1 < 156, 'filtre Phase P1 → ' + nP1 + ' tâches');
    // tableau de bord -> clic ligne de phase
    click(w, d.querySelector('#nav [data-v="dash"]')); await tick();
    click(w, d.querySelector('[data-ph="P2"]')); await tick();
    ok(d.getElementById('fph').value === 'P2' && w.localStorage.getItem('alg_view') === 'tasks', 'clic phase P2 → Tâches filtrées P2 (vue mémorisée)');
    // Mes tâches
    click(w, d.querySelector('#nav [data-v="mine"]')); await tick();
    ok(txt(d).includes('Karim ·'), 'Mes tâches → tâches de Karim');
    // ouvrir une tâche et démarrer
    click(w, d.querySelector('[data-t]')); await tick();
    const id = d.querySelector('.drawer .mono').textContent.split(' ')[0];
    click(w, d.querySelector('[data-a="doing"]')); await tick(80);
    const r = db.rows.find(x => x.col === 'tasks' && x.id === id);
    ok(r && r.data.s === 'doing' && r.data.by === 'Karim', 'Karim démarre ' + id + ' → enregistré par « Karim »');
    // changement d'onglet ferme le tiroir
    click(w, d.querySelector('#nav [data-v="dates"]')); await tick();
    ok(d.getElementById('drawerHost').innerHTML === '', 'changement d’onglet → tiroir fermé');
    // conflit : quelqu'un modifie la tâche entre-temps
    r.version += 1; r.data = { s: 'blocked', note: 'autre', by: 'Brahim' }; r.updated_by = 'belkhodja.brahim@live.fr';
    click(w, d.querySelector('#nav [data-v="tasks"]')); await tick();
    w.eval('drawer=' + JSON.stringify(id) + ';render()'); await tick();
    ok(d.querySelector('[data-a="done"]').disabled, 'décision ' + id + ' (décideur Ali) : Karim ne peut pas la valider');
    click(w, d.querySelector('[data-a="block"]')); await tick();
    d.getElementById('breason').value = 'motif Karim';
    click(w, d.querySelector('[data-a="blockok"]')); await tick(80);
    ok(d.getElementById('toast').textContent.includes('Modifié par belkhodja.brahim@live.fr'), 'conflit → message « Modifié par … entre-temps »');
    ok(r.data.note === 'autre', 'conflit → la modification de l’autre n’est pas écrasée');
    // écran mot de passe : un rafraîchissement ne l'écrase pas
    click(w, d.getElementById('chpw')); await tick();
    w.eval('render()'); await tick();
    ok(!!d.getElementById('pf'), 'écran « mot de passe » non écrasé par un rafraîchissement'); }

  // 4. Compte autorisé mais non associé -> lecture seule
  { const { w, d, db } = await boot({ live: true, email: 'nabil@calibraes.com', members });
    w.localStorage.setItem('alg_me', 'Ali');
    click(w, d.querySelector('#nav [data-v="tasks"]')); await tick();
    click(w, d.querySelector('[data-t]')); await tick();
    const before = db.calls.filter(c => c !== 'select').length;
    click(w, d.querySelector('[data-a="doing"]')); await tick(80);
    ok(db.calls.filter(c => c !== 'select').length === before, 'compte non associé → aucune écriture');
    ok(d.getElementById('toast').textContent.includes('Lecture seule'), 'compte non associé → message lecture seule');
    ok(d.getElementById('me').value === '', 'compte non associé → ne peut pas se faire passer pour Ali'); }

  // 5. Mode démo : le menu Utilisateur fonctionne
  { const { w, d } = await boot({ live: false });
    const me = d.getElementById('me'); ok(!me.disabled, 'démo : menu Utilisateur actif');
    change(w, me, 'Nabil'); await tick();
    click(w, d.querySelector('#nav [data-v="mine"]')); await tick();
    ok(txt(d).includes('Nabil ·'), 'démo : Mes tâches de Nabil'); }

  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nTOUS LES TESTS PASSENT');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
