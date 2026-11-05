// Usage : npm i puppeteer-core@22.15.0 (hors dépôt, Chrome installé), puis : node tests/live-check.js [URL]
// Test du site RÉEL dans Chrome (profil vierge), sans compte.
const puppeteer = require('puppeteer-core');
const URL = process.argv[2] || 'https://bbelkhodja-spec.github.io/calibra-algerac-tracker/';
const OUT = require('os').tmpdir();
(async () => {
  const br = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-first-run'] });
  const p = await br.newPage(); await p.setViewport({ width: 1280, height: 800 });
  const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
  p.on('requestfailed', r => logs.push('REQFAIL: ' + r.url() + ' ' + (r.failure() || {}).errorText));
  await p.goto(URL + '?nocache=' + Date.now(), { waitUntil: 'networkidle0' });
  const state = async label => {
    const s = await p.evaluate(() => ({
      mode: window.Store && Store.mode, gated: typeof gated !== 'undefined' ? gated : 'n/a',
      login: !!document.getElementById('lf'), nav: document.getElementById('nav').children.length,
      meDisabled: document.getElementById('me').disabled, main: document.getElementById('main').innerText.slice(0, 160).replace(/\n/g, ' | '),
      foot: document.querySelector('.side-foot').innerText.replace(/\n/g, ' | ')
    }));
    console.log(label, JSON.stringify(s));
  };
  await state('1-chargement   ');
  await p.screenshot({ path: OUT + '/live1.png' });
  // tenter de choisir un utilisateur
  await p.evaluate(() => { const m = document.getElementById('me'); m.disabled = false; m.value = 'Ali'; m.dispatchEvent(new Event('change', { bubbles: true })); });
  await new Promise(r => setTimeout(r, 500));
  await state('2-choix Ali    ');
  // mauvais mot de passe
  await p.reload({ waitUntil: 'networkidle0' });
  if (await p.$('#lem')) {
    await p.type('#lem', 'karim@calibraes.com'); await p.type('#lpw', 'mauvais-mot-de-passe');
    await p.click('#lf button[type=submit]'); await new Promise(r => setTimeout(r, 2500));
    console.log('3-mauvais mdp   ', await p.$eval('#lerr', e => e.textContent));
  }
  await p.screenshot({ path: OUT + '/live2.png' });
  console.log('--- console / erreurs ---\n' + logs.join('\n'));
  await br.close();
})().catch(e => { console.error(e); process.exit(2); });
