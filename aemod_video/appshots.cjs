// appshots.cjs — replay the real web app from the local mirror (Cesium + Esri tiles from the internet),
// hide the left panel, and save clean screenshots of a few app states for the "browser window" shots.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const S = process.env.AEMOD_SCRATCH || '/tmp/claude-0/-home-user-meo/fe7490d0-a7d8-574d-b458-b71ebd40b9c9/scratchpad';
const OUT = path.join(S, 'appshots'); fs.mkdirSync(OUT, { recursive: true });
const INDEX = path.join(S, 'mirror_index.html');
const only = process.argv[2] ? process.argv[2].split(',') : null;
const APP_URL = process.env.AEMOD_URL;               // the app's URL, e.g. http://host/~user/aemod/
if (!APP_URL) { console.error('set AEMOD_URL'); process.exit(2); }
const APP = new URL(APP_URL);

const CSS = `.panel{display:none!important}.cesium-viewer-toolbar,.readout,.cesium-infoBox,.cesium-selection-wrapper{display:none!important}
#replay{left:50%!important;width:min(760px,calc(100% - 80px))!important}`;

(async () => {
  const b = await chromium.launch({ headless: false, env: { ...process.env, DISPLAY: ':99' }, args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', '--window-size=1920,1180'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.25 });
  await ctx.route(APP.origin + '/**', async route => {
    const u = new URL(route.request().url());
    let f = null;
    if (u.pathname === APP.pathname || u.pathname === APP.pathname + 'index.html') f = INDEX;
    else if (u.pathname.startsWith(APP.pathname + 'data/')) f = path.join(S, 'data', path.basename(u.pathname));
    if (f && fs.existsSync(f)) return route.fulfill({ status: 200, body: fs.readFileSync(f), contentType: f.endsWith('.html') ? 'text/html; charset=utf-8' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
    console.log('missing', u.pathname); return route.fulfill({ status: 404, body: '' });
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto(APP_URL, { waitUntil: 'load', timeout: 120000 });
  await p.addStyleTag({ content: CSS });
  await p.waitForFunction(() => document.querySelector('#status') && /Sẵn sàng/.test(document.querySelector('#status').textContent), null, { timeout: 300000, polling: 500 });
  await p.evaluate(() => new Promise(res => { const o = Cesium.CesiumWidget.prototype.render; Cesium.CesiumWidget.prototype.render = function () { window.__w = this; return o.apply(this, arguments); }; const i = setInterval(() => { if (window.__w) { clearInterval(i); res(); } }, 50); }));
  await p.evaluate(() => { __w.useDefaultRenderLoop = false; const g = __w.scene.globe; g.tileCacheSize = 2000; Cesium.RequestScheduler.maximumRequestsPerServer = 48; });
  const pump = (ms) => p.evaluate(async ms => { const s = performance.now(); while (performance.now() - s < ms) { __w.render(); await new Promise(r => setTimeout(r, 30)); } }, ms);
  const settle = async (maxMs = 180000) => p.evaluate(async maxMs => { const s = performance.now(); let n = 0; while (performance.now() - s < maxMs) { __w.render(); n++; if (__w.scene.globe.tilesLoaded && n > 6) break; await new Promise(r => setTimeout(r, 40)); } for (let i = 0; i < 4; i++) { __w.render(); await new Promise(r => setTimeout(r, 60)); } return n; }, maxMs);
  const view = (lon, lat, h, hd, pt, range) => p.evaluate(([lon, lat, h, hd, pt, range]) => { const c = __w.scene.camera; c.lookAt(Cesium.Cartesian3.fromDegrees(lon, lat, h), new Cesium.HeadingPitchRange(Cesium.Math.toRadians(hd), Cesium.Math.toRadians(pt), range)); c.lookAtTransform(Cesium.Matrix4.IDENTITY); }, [lon, lat, h, hd, pt, range]);
  const sel = (id, v) => p.evaluate(([id, v]) => { const e = document.querySelector(id); e.value = v; e.dispatchEvent(new Event('change')); }, [id, v]);
  const click = (txt) => p.evaluate(t => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === t || x.textContent.includes(t)); b && b.click(); }, txt);
  const waitReady = () => p.waitForFunction(() => /Sẵn sàng|Phát lại/.test(document.querySelector('#status').textContent), null, { timeout: 120000, polling: 300 });
  const shot = async (name) => { const n = await settle(); await p.screenshot({ path: path.join(OUT, name + '.png') }); console.log('shot', name, 'renders', n); };
  const want = n => !only || only.includes(n);

  if (want('qn_tsp_3d')) { await view(107.36, 21.06, 0, 335, -38, 30000); await shot('qn_tsp_3d'); }
  if (want('qn_cols')) {
    await sel('#polSel', 'SO2'); await waitReady();
    await p.evaluate(() => { const c = document.querySelector('#colChk'); c.checked = true; c.dispatchEvent(new Event('change')); const e = document.querySelector('#exag'); e.value = 1; e.dispatchEvent(new Event('input')); });
    await view(107.35, 21.05, 0, 320, -40, 62000); await shot('qn_cols');
    await p.evaluate(() => { const c = document.querySelector('#colChk'); c.checked = false; c.dispatchEvent(new Event('change')); });
  }
  if (want('qn_replay')) {
    await sel('#polSel', 'SO2'); await waitReady();
    await click('Phát lại theo giờ'); await p.waitForFunction(() => /Phát lại/.test(document.querySelector('#status').textContent), null, { timeout: 120000 });
    await p.evaluate(() => { const f = document.querySelector('#frame'); f.value = 10; f.dispatchEvent(new Event('input')); });
    await p.waitForTimeout(1500);
    await view(107.35, 21.04, 0, 0, -62, 46000); await shot('qn_replay');
    await click('Phát lại theo giờ');
  }
  if (want('dt_2d') || want('dt_3d')) {
    await sel('#caseSel', '1'); await pump(3000); await waitReady();
    await sel('#polSel', 'NO2'); await waitReady();
    if (want('dt_3d')) {
      await p.evaluate(() => { const c = document.querySelector('#colChk'); c.checked = true; c.dispatchEvent(new Event('change')); const e = document.querySelector('#exag'); e.value = 1; e.dispatchEvent(new Event('input')); });
      await view(105.66, 10.45, 0, 20, -42, 110000); await shot('dt_3d');
      await p.evaluate(() => { const c = document.querySelector('#colChk'); c.checked = false; c.dispatchEvent(new Event('change')); });
    }
    if (want('dt_2d')) { await click('2D bản đồ'); await pump(2500); await p.evaluate(() => { const g = { w: 105.18, s: 10.03, e: 106.101, n: 10.95 }; __w.scene.camera.setView({ destination: Cesium.Rectangle.fromDegrees(g.w, g.s, g.e, g.n) }); }); await shot('dt_2d'); }
  }
  await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
