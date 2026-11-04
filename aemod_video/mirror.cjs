// mirror.cjs — load a single-page web app, exercise its controls, and save every same-host response
// so the app can be replayed offline (Playwright page.route) in another container.
// Usage: node mirror.cjs <startUrl> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const START = process.argv[2];
const OUT = path.resolve(process.argv[3] || 'mirror_out');
const ORIGIN = new URL(START).origin;
fs.mkdirSync(path.join(OUT, 'mirror'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const reqs = [], external = {}, failed = [];
const saved = new Map();

function fileFor(u) {
  const url = new URL(u);
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  if (url.search) { const h = crypto.createHash('md5').update(url.search).digest('hex').slice(0, 10); const ext = path.extname(p); p = p.slice(0, p.length - ext.length) + '__q' + h + ext; }
  return 'mirror' + p.replace(/\.\.+/g, '_');
}

(async () => {
  const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (/error|warn/i.test(m.type())) fs.appendFileSync(path.join(OUT, 'console.log'), `[${m.type()}] ${m.text().slice(0, 500)}\n`); });
  page.on('requestfailed', r => failed.push({ url: r.url().slice(0, 300), err: (r.failure() || {}).errorText }));
  page.on('response', async r => {
    const u = r.url();
    try {
      if (u.startsWith(ORIGIN)) {
        if (saved.has(u)) return;
        const body = await r.body().catch(() => null);
        const rec = { url: u, status: r.status(), type: r.headers()['content-type'] || '', size: body ? body.length : -1, method: r.request().method() };
        if (body && r.status() < 400) { const f = fileFor(u); fs.mkdirSync(path.join(OUT, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), body); rec.file = f; }
        saved.set(u, rec); reqs.push(rec);
      } else {
        const h = new URL(u).host; external[h] = external[h] || { n: 0, status: {}, sample: u.slice(0, 200) };
        external[h].n++; external[h].status[r.status()] = (external[h].status[r.status()] || 0) + 1;
      }
    } catch (e) {}
  });
  const shot = async name => page.screenshot({ path: path.join(OUT, 'shots', name + '.jpg'), type: 'jpeg', quality: 85 }).catch(() => {});
  const settle = async (ms = 4000) => { await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(ms); };

  await page.goto(START, { waitUntil: 'load', timeout: 120000 });
  await settle(15000);
  await shot('00_after_load_15s');
  await page.waitForTimeout(20000);
  await shot('01_after_load_35s');
  fs.writeFileSync(path.join(OUT, 'dom_after_load.html'), await page.content());

  // Exercise every select combination.
  const opts = await page.evaluate(() => Array.from(document.querySelectorAll('select')).map(s => ({ id: s.id, name: s.name, options: Array.from(s.options).map(o => ({ v: o.value, t: o.text })) })));
  fs.writeFileSync(path.join(OUT, 'selects.json'), JSON.stringify(opts, null, 1));
  const byId = Object.fromEntries(opts.map(o => [o.id || o.name, o]));
  const cs = byId.caseSel, ps = byId.polSel, ms = byId.metSel;
  if (cs) for (const c of cs.options) {
    await page.selectOption('#caseSel', c.v).catch(() => {}); await settle(6000);
    await shot('case_' + c.v.replace(/\W+/g, '_'));
    if (ps) for (const p of ps.options) {
      await page.selectOption('#polSel', p.v).catch(() => {}); await settle(1500);
      if (ms) for (const m of ms.options) { await page.selectOption('#metSel', m.v).catch(() => {}); await settle(1500); }
    }
  }
  // Toggle the other UI controls so their data gets requested too.
  for (const name of ['µg/m³', 'Mờ dần', '2D bản đồ', '3D địa hình', '% QCVN', 'Theo dải']) {
    await page.getByRole('button', { name, exact: true }).first().click({ timeout: 5000 }).catch(() => {}); await settle(2500);
  }
  await page.evaluate(() => document.querySelectorAll('input[type=checkbox]').forEach(cb => cb.click())).catch(() => {}); await settle(4000);
  await shot('02_toggles');
  await page.evaluate(() => document.querySelectorAll('input[type=checkbox]').forEach(cb => cb.click())).catch(() => {}); await settle(2000);
  await page.getByRole('button', { name: /Phát lại theo giờ/ }).first().click({ timeout: 5000 }).catch(() => {});
  await settle(20000); await shot('03_replay');

  // Apache directory listings for every directory we touched (names only).
  const dirs = new Set();
  for (const r of reqs) { const u = new URL(r.url); let d = u.pathname.slice(0, u.pathname.lastIndexOf('/') + 1); while (d.length > 1) { dirs.add(d); d = d.slice(0, d.slice(0, -1).lastIndexOf('/') + 1); } }
  const listings = {};
  for (const d of dirs) {
    try { const res = await ctx.request.get(ORIGIN + d); const txt = await res.text();
      if (/Index of/i.test(txt)) { listings[d] = Array.from(txt.matchAll(/<a href="([^"?][^"]*)">[\s\S]*?<\/a>\s*([^<\n]*)/g)).map(m => (m[1] + '  ' + m[2].trim()).slice(0, 160)); fs.writeFileSync(path.join(OUT, 'listing_' + d.replace(/\W+/g, '_') + '.html'), txt); } } catch (e) {}
  }
  await browser.close();

  fs.writeFileSync(path.join(OUT, 'requests.json'), JSON.stringify({ start: START, sameHost: reqs, external, failed: failed.slice(0, 300), listings }, null, 1));
  const files = ['requests.json', 'selects.json', 'dom_after_load.html'];
  const walk = d => { for (const f of fs.readdirSync(path.join(OUT, d))) { const rel = d + '/' + f; fs.statSync(path.join(OUT, rel)).isDirectory() ? walk(rel) : files.push(rel); } };
  walk('mirror'); walk('shots');
  const batches = []; let cur = { files: [], bytes: 0 };
  for (const f of files) { const b = fs.statSync(path.join(OUT, f)).size;
    if (cur.files.length && (cur.bytes + b > 50e6 || cur.files.length >= 200)) { batches.push(cur); cur = { files: [], bytes: 0 }; }
    cur.files.push(f); cur.bytes += b; }
  if (cur.files.length) batches.push(cur);
  fs.writeFileSync(path.join(OUT, 'batches.json'), JSON.stringify(batches, null, 1));
  const total = reqs.reduce((a, r) => a + Math.max(0, r.size), 0);
  console.log(JSON.stringify({ sameHostFiles: reqs.length, sameHostMB: +(total / 1e6).toFixed(1), external: Object.fromEntries(Object.entries(external).map(([h, v]) => [h, v.status])), failed: failed.length, listings: Object.keys(listings), batches: batches.map(b => ({ n: b.files.length, mb: +(b.bytes / 1e6).toFixed(1) })) }));
})().catch(e => { console.error(e); process.exit(1); });
