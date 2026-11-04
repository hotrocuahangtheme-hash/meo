// capture.cjs — crawl a website section and capture screenshots for the 3D video pipeline.
// Usage: node capture.cjs <startUrl> <outDir> [maxPages]
// Output: raw/NN_slug.png (as-is, 1920x1080), clean/NN_slug@2x.jpg (left sidebar hidden, 3840x2160),
//         full/NN_slug.jpg (left sidebar hidden, full page, 1920 wide), pages.json, batches.json, index.html
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const START = process.argv[2];
const OUT = path.resolve(process.argv[3] || 'capture_out');
const MAX = parseInt(process.argv[4] || '30', 10);
if (!START) { console.error('usage: node capture.cjs <startUrl> <outDir> [maxPages]'); process.exit(2); }
const PREFIX = (() => { const u = new URL(START); let p = u.pathname; if (!p.endsWith('/')) p = p.slice(0, p.lastIndexOf('/') + 1); return u.origin + p; })();
const SKIP_EXT = /\.(pdf|zip|rar|7z|gz|tgz|tar|nc|nc4|grib2?|grb2?|bin|exe|mp4|avi|mov|mkv|mp3|wav|png|jpe?g|gif|svg|webp|ico|css|js|json|xml|csv|txt|xlsx?|docx?|pptx?)$/i;
const SKIP_WORDS = /(logout|log-out|signout|sign-out|delete|remove|destroy|drop|reset|truncate)/i;
for (const d of ['raw', 'clean', 'full']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

function norm(href, base) {
  try {
    const u = new URL(href, base); u.hash = '';
    u.pathname = u.pathname.replace(/\/index\.(html?|php)$/i, '/');
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const s = u.toString();
    if (!s.startsWith(PREFIX) || SKIP_EXT.test(u.pathname) || SKIP_WORDS.test(s)) return null;
    return s;
  } catch { return null; }
}
function slugOf(url, i) {
  const u = new URL(url);
  let s = (u.pathname.slice(new URL(PREFIX).pathname.length) + (u.search || '')).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return String(i).padStart(2, '0') + '_' + ((s || 'home').slice(0, 48));
}

// In-page helpers (serialized into the page).
const HELPERS = `
window.__cssPath = function (el) {
  const sel = e => { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id;
    if (typeof e.className === 'string' && e.className.trim()) s += '.' + e.className.trim().split(/\\s+/).slice(0, 4).join('.'); return s; };
  const parts = []; let e = el; while (e && e !== document.body && parts.length < 6) { parts.unshift(sel(e)); e = e.parentElement; } return parts.join(' > ');
};`;

const OUTLINE_FN = () => {
  const P = window.__cssPath;
  const out = { title: document.title, url: location.href, docH: document.documentElement.scrollHeight, headings: [], links: [], blocks: [], widgets: [], controls: [] };
  document.querySelectorAll('h1,h2,h3,h4').forEach(h => { const t = (h.innerText || '').trim(); if (t) out.headings.push(h.tagName + ': ' + t.slice(0, 120)); });
  document.querySelectorAll('a[href]').forEach(a => { const t = (a.innerText || a.title || '').trim().replace(/\s+/g, ' '); out.links.push({ t: t.slice(0, 80), h: a.getAttribute('href') }); });
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (r.width * r.height < 30000) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const p = el.parentElement; if (p) { const pr = p.getBoundingClientRect(); if (Math.abs(pr.width - r.width) < 2 && Math.abs(pr.height - r.height) < 2) continue; }
    out.blocks.push({ path: P(el), x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), pos: cs.position,
      text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100) });
    if (out.blocks.length >= 250) break;
  }
  document.querySelectorAll('canvas, svg, iframe, video, img, .leaflet-container, .ol-viewport, .mapboxgl-map, .highcharts-container, .js-plotly-plot, [_echarts_instance_]').forEach(el => {
    const r = el.getBoundingClientRect(); if (r.width * r.height > 20000) out.widgets.push({ path: P(el), x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), src: el.getAttribute('src') || '' }); });
  document.querySelectorAll('select, input:not([type=hidden]), button, [role=tab], .nav-tabs a').forEach(el => {
    out.controls.push(el.tagName === 'SELECT'
      ? 'select[' + (el.name || el.id) + ']: ' + Array.from(el.options).map(o => o.text.trim()).slice(0, 40).join(' | ')
      : el.tagName.toLowerCase() + '[' + (el.type || el.getAttribute('role') || '') + ']: ' + ((el.innerText || el.value || el.placeholder || '').trim().slice(0, 60))); });
  out.controls = out.controls.slice(0, 150); out.links = out.links.slice(0, 250);
  return out;
};

// Hide the left sidebar (heuristic) and let the main content take the full width.
const HIDE_FN = () => {
  const P = window.__cssPath, vw = innerWidth, vh = innerHeight;
  const cands = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 100 || r.width > vw * 0.38 || r.left > 10 || r.height < vh * 0.45) continue;
    const name = (el.tagName + ' ' + el.id + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();
    const named = /side|menu|nav|left|drawer|aside|toc/.test(name) || el.tagName === 'ASIDE' || el.tagName === 'NAV';
    if (!named && el.querySelectorAll('a, button, li').length < 3) continue;
    cands.push(el);
  }
  const outer = cands.filter(c => !cands.some(o => o !== c && o.contains(c)));
  const hidden = []; let sw = 0;
  for (const el of outer) { const r = el.getBoundingClientRect(); sw = Math.max(sw, r.right); hidden.push({ path: P(el), w: Math.round(r.width), h: Math.round(r.height) }); }
  if (!hidden.length) return { sidebarWidth: 0, hidden };
  // Elements offset by the sidebar (measured before hiding).
  const fixes = [];
  for (const el of document.querySelectorAll('body, body *')) {
    if (outer.some(o => o === el || o.contains(el))) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none') continue;
    const ml = parseFloat(cs.marginLeft) || 0, pl = parseFloat(cs.paddingLeft) || 0, lf = parseFloat(cs.left);
    const r = el.getBoundingClientRect(), f = {};
    if (Math.abs(ml - sw) < 16) f['margin-left'] = '0px';
    if (pl >= sw - 16 && pl <= sw + 60) f['padding-left'] = Math.max(0, pl - sw) + 'px';
    if (/fixed|absolute|sticky/.test(cs.position) && Math.abs(lf - sw) < 16) f['left'] = '0px';
    if (/fixed|absolute|sticky/.test(cs.position) && Math.abs(r.width - (vw - sw)) < 40 && Math.abs(r.left - sw) < 40) f['width'] = '100%';
    if (Object.keys(f).length) fixes.push([el, f]);
  }
  for (const el of outer) {
    if (/fixed|absolute/.test(getComputedStyle(el).position)) continue; // out-of-flow sidebars are handled by the offset fixes
    const top = el.getBoundingClientRect().top;
    for (const s of Array.from(el.parentElement ? el.parentElement.children : [])) {
      if (s === el || outer.includes(s)) continue;
      const r = s.getBoundingClientRect();
      if (r.width > 0 && r.width < vw * 0.92 && Math.abs(r.top - top) < 60 && r.left >= sw - 20) fixes.push([s, { 'flex': '1 1 100%', 'max-width': '100%', 'width': '100%', 'margin-left': '0px', 'box-sizing': 'border-box' }]);
    }
  }
  for (const el of outer) el.style.setProperty('display', 'none', 'important');
  for (const [el, f] of fixes) for (const k in f) el.style.setProperty(k, f[k], 'important');
  window.dispatchEvent(new Event('resize'));
  return { sidebarWidth: Math.round(sw), hidden, fixed: fixes.length };
};

async function load(page, url) {
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); }
  catch (e) { try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); } catch (e2) { return 'ERR ' + e2.message.split('\n')[0]; } }
  await page.waitForTimeout(3000);
  await page.addScriptTag({ content: HELPERS }).catch(() => {});
  return 'ok';
}

(async () => {
  const browser = await chromium.launch();
  const ctx1 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, ignoreHTTPSErrors: true });
  const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
  const p1 = await ctx1.newPage(), p2 = await ctx2.newPage();
  const queue = [norm(START, START) || START], seen = new Set(queue), pages = [];
  while (queue.length && pages.length < MAX) {
    const url = queue.shift(), i = pages.length + 1, slug = slugOf(url, i);
    const rec = { i, url, slug };
    console.log(`[${i}] ${url}`);
    rec.status = await load(p1, url);
    if (rec.status !== 'ok') { pages.push(rec); continue; }
    rec.finalUrl = p1.url();
    rec.outline = await p1.evaluate(OUTLINE_FN).catch(e => ({ error: String(e) }));
    for (const l of (rec.outline.links || [])) { const n = norm(l.h, p1.url()); if (n && !seen.has(n)) { seen.add(n); queue.push(n); } }
    await p1.screenshot({ path: path.join(OUT, 'raw', slug + '.png') });
    rec.hide = await p1.evaluate(HIDE_FN).catch(e => ({ error: String(e) }));
    await p1.waitForTimeout(1500);
    const h = await p1.evaluate(() => document.documentElement.scrollHeight);
    await p1.screenshot({ path: path.join(OUT, 'full', slug + '.jpg'), type: 'jpeg', quality: 82, fullPage: h <= 9000,
      clip: h > 9000 ? { x: 0, y: 0, width: 1920, height: 9000 } : undefined });
    rec.status2 = await load(p2, url);
    if (rec.status2 === 'ok') {
      await p2.evaluate(HIDE_FN).catch(() => {});
      await p2.waitForTimeout(1500);
      await p2.screenshot({ path: path.join(OUT, 'clean', slug + '@2x.jpg'), type: 'jpeg', quality: 88 });
    }
    pages.push(rec);
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify({ start: START, prefix: PREFIX, capturedAt: new Date().toISOString(), pages, notVisited: queue }, null, 1));

  // Publish batches (<= 50 MB, <= 200 files each) for the Artifact tool.
  const files = ['pages.json'];
  for (const d of ['raw', 'clean', 'full']) for (const f of fs.readdirSync(path.join(OUT, d)).sort()) files.push(d + '/' + f);
  const batches = []; let cur = { files: [], bytes: 0 };
  for (const f of files) { const b = fs.statSync(path.join(OUT, f)).size;
    if (cur.files.length && (cur.bytes + b > 50e6 || cur.files.length >= 200)) { batches.push(cur); cur = { files: [], bytes: 0 }; }
    cur.files.push(f); cur.bytes += b; }
  if (cur.files.length) batches.push(cur);
  fs.writeFileSync(path.join(OUT, 'batches.json'), JSON.stringify(batches, null, 1));

  // Simple gallery page.
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cards = pages.map(p => `<article><h2>${esc(p.slug)}</h2><p class="u">${esc(p.url)} — ${esc(p.outline && p.outline.title)}</p>
<p>status: ${esc(p.status)} · sidebar hidden: ${esc(p.hide && p.hide.sidebarWidth)}px</p>
<div class="g"><figure><img loading="lazy" src="raw/${esc(p.slug)}.png" alt=""><figcaption>raw</figcaption></figure>
<figure><img loading="lazy" src="clean/${esc(p.slug)}@2x.jpg" alt=""><figcaption>clean @2x</figcaption></figure></div></article>`).join('\n');
  fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AEMOD capture</title><style>
:root{--bg:#f6f7f9;--fg:#15181d;--muted:#5b6370;--card:#fff;--line:#dde1e7}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1115;--fg:#e8eaee;--muted:#9aa3b0;--card:#171a20;--line:#2a2f38}}
:root[data-theme="dark"]{--bg:#0f1115;--fg:#e8eaee;--muted:#9aa3b0;--card:#171a20;--line:#2a2f38}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 Inter,system-ui,sans-serif;padding:24px 16px}
main{max-width:1200px;margin:0 auto}h1{font-size:22px;margin:0 0 16px}h2{font-size:16px;margin:0 0 4px}
article{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin:0 0 16px}
.u{color:var(--muted);word-break:break-all;margin:0 0 6px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
figure{margin:0}img{width:100%;height:auto;border:1px solid var(--line);border-radius:6px}figcaption{color:var(--muted);font-size:13px}
</style></head><body><main><h1>AEMOD capture — ${pages.length} trang</h1>${cards}</main></body></html>`);
  console.log(JSON.stringify({ pages: pages.length, notVisited: queue.length, batches: batches.map(b => ({ n: b.files.length, mb: +(b.bytes / 1e6).toFixed(1) })) }));
})().catch(e => { console.error(e); process.exit(1); });
