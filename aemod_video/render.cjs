// render.cjs — renders a story to JPEG frames with Chromium (headful on Xvfb, Mesa llvmpipe via ANGLE/GL).
// node render.cjs --story v1 --w 1920 --h 1080 --out DIR [--from 0] [--to N] [--frames a,b,c] [--workers 1] [--fps 30]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, execSync } = require('child_process');

const A = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => { if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']); return acc; }, []));
const SCRATCH = process.env.AEMOD_SCRATCH || '/tmp/claude-0/-home-user-meo/fe7490d0-a7d8-574d-b458-b71ebd40b9c9/scratchpad';
const ROOTS = {
  '/engine/': path.join(__dirname, 'engine'),
  '/three/': path.join(SCRATCH, 'vid/node_modules/three'),
  '/fonts/': path.join(SCRATCH, 'vid/node_modules/@fontsource'),
  '/assets/': SCRATCH,
};
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      const root = Object.keys(ROOTS).find(k => u.startsWith(k));
      if (!root) { r.writeHead(404); return r.end(); }
      const f = path.join(ROOTS[root], u.slice(root.length));
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=3600' }); r.end(d); });
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

function ensureXvfb() {
  try { execSync('xdpyinfo -display :99 >/dev/null 2>&1'); return; } catch (e) {}
  try { execSync('pgrep -f "Xvfb :99"'); return; } catch (e) {}
  spawn('Xvfb', [':99', '-screen', '0', '1920x1920x24', '-nolisten', 'tcp'], { detached: true, stdio: 'ignore' }).unref();
  execSync('sleep 2');
}

(async () => {
  ensureXvfb();
  const srv = await serve();
  const port = srv.address().port;
  const W = +(A.w || 1920), H = +(A.h || 1080), FPS = +(A.fps || 30);
  const out = A.out; fs.mkdirSync(out, { recursive: true });
  const workers = +(A.workers || 1);
  const url = `http://127.0.0.1:${port}/engine/index.html?story=${A.story}&w=${W}&h=${H}&fps=${FPS}` + (A.q ? '&' + A.q : '');
  const launch = async () => {
    const b = await chromium.launch({ headless: false, env: { ...process.env, DISPLAY: ':99' },
      args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu', `--window-size=${W},${H + 100}`, '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
    const p = await b.newPage({ viewport: { width: W, height: H } });
    p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('[page]', m.text().slice(0, 300)); });
    p.on('pageerror', e => console.log('[pageerror]', e.message));
    await p.goto(url);
    await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000, polling: 500 });
    const err = await p.evaluate(() => window.__error); if (err) throw new Error(err);
    return { b, p };
  };
  let frames;
  const first = await launch();
  const dur = await first.p.evaluate(() => window.__duration);
  if (A.frames) frames = A.frames.split(',').map(Number);
  else { const from = +(A.from || 0), to = +(A.to || Math.round(dur * FPS)); frames = []; for (let f = from; f < to; f += +(A.step || 1)) frames.push(f); }
  if (!A.force) frames = frames.filter(f => !fs.existsSync(path.join(out, `f${String(f).padStart(5, '0')}.jpg`)));
  console.log(`story ${A.story} ${W}x${H} duration ${dur}s, ${frames.length} frames to render, workers ${workers}`);
  const chunks = Array.from({ length: workers }, (_, k) => frames.slice(Math.floor(k * frames.length / workers), Math.floor((k + 1) * frames.length / workers)));
  const t0 = Date.now(); let done = 0;
  await Promise.all(chunks.map(async (list, k) => {
    const inst = k === 0 ? first : await launch();
    for (const f of list) {
      const s = Date.now();
      const url = await inst.p.evaluate(f => window.renderFrame(f), f);
      fs.writeFileSync(path.join(out, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
      done++;
      if (done % 25 === 0 || list.length < 30) console.log(`[w${k}] frame ${f} ${Date.now() - s} ms | ${done}/${frames.length} | avg ${((Date.now() - t0) / done / 1000).toFixed(2)} s/frame`);
    }
    await inst.b.close();
  }));
  srv.close();
  console.log(`done ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
