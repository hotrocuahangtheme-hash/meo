// data.js — decode the app's u16 grids and build concentration overlays exactly like the web app
// (same colour ramps, % QCVN bands, alpha curve and marching-squares contours), optionally upsampled.

export const ABS_RAMP = [[0, [72, 198, 236]], [.28, [104, 112, 228]], [.5, [182, 84, 196]], [.7, [236, 74, 96]], [.86, [250, 158, 54]], [1, [255, 228, 120]]];
export const QC_RAMP = [[0, [74, 200, 236]], [.26, [92, 132, 238]], [.40, [156, 96, 220]], [.49, [226, 74, 140]], [.5, [236, 48, 62]], [.72, [250, 142, 50]], [1, [255, 224, 110]]];
const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
export function ramp(stops, t) {
  t = clamp01(t);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i], f = (t - a[0]) / ((b[0] - a[0]) || 1);
      return [a[1][0] + (b[1][0] - a[1][0]) * f, a[1][1] + (b[1][1] - a[1][1]) * f, a[1][2] + (b[1][2] - a[1][2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}
export const AVG = m => m.startsWith('1h') ? '1h' : m.startsWith('24h') ? '24h' : 'period';

export async function fetchU16(url) {
  const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status);
  return new Uint16Array(await r.arrayBuffer());
}
export function decode(raw, vmin, vmax, off = 0, n = raw.length - off) {
  const out = new Float32Array(n), k = Math.log(vmax / vmin) / 65534;
  for (let i = 0; i < n; i++) { const q = raw[off + i]; out[i] = q === 0 ? NaN : vmin * Math.exp((q - 1) * k); }
  return out;
}

export function absLevels(vmin, vmax) {
  const out = [];
  for (let e = Math.floor(Math.log10(vmin)); e <= Math.ceil(Math.log10(vmax)); e++)
    for (const m of [1, 2, 5]) { const v = m * Math.pow(10, e); if (v > vmin && v < vmax) out.push(v); }
  return out;
}
export const qcvnLevels = (limit, vmax) => [10, 25, 50, 75, 100, 150, 200].map(p => p / 100 * limit).filter(v => v < vmax && v > 0);

// Bilinear upsample in log space (NaN -> below threshold).
function upsample(grid, vals, f, vmin) {
  const { w, h } = grid, W = w * f, H = h * f, out = new Float32Array(W * H);
  const L = new Float32Array(w * h), floor = Math.log(vmin * 0.25);
  for (let i = 0; i < w * h; i++) L[i] = vals[i] > 0 ? Math.log(vals[i]) : floor;
  for (let Y = 0; Y < H; Y++) {
    const fy = Math.min(h - 1, Math.max(0, (Y + 0.5) / f - 0.5)), y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
    for (let X = 0; X < W; X++) {
      const fx = Math.min(w - 1, Math.max(0, (X + 0.5) / f - 0.5)), x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
      const v = (L[y0 * w + x0] * (1 - tx) + L[y0 * w + x1] * tx) * (1 - ty) + (L[y1 * w + x0] * (1 - tx) + L[y1 * w + x1] * tx) * ty;
      out[Y * W + X] = v <= floor + 1e-6 ? NaN : Math.exp(v);
    }
  }
  return { grid: { ...grid, w: W, h: H, dx: grid.dx / f }, vals: out };
}

// opts: { scale:'qcvn'|'abs', fill:'band'|'smooth', contour:true, limit, up:4, lineWidth }
export function buildOverlay(grid0, vals0, layer, opts) {
  const up = opts.up || 1;
  const { grid, vals } = up > 1 ? upsample(grid0, vals0, up, layer.vmin) : { grid: grid0, vals: vals0 };
  const { w, h } = grid;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const lim = opts.limit;
  const useQc = opts.scale !== 'abs' && lim;
  const bands = useQc ? qcvnLevels(lim, layer.vmax) : absLevels(layer.vmin, layer.vmax);
  const norm = v => useQc ? (v / lim) / 2 : Math.log(v / layer.vmin) / Math.log(layer.vmax / layer.vmin);
  const A0 = 0.07;
  const alphaOf = t => t < A0 ? 0 : Math.min(1, 0.86 * (t - A0) / 0.30);
  const RAMP = useQc ? QC_RAMP : ABS_RAMP;
  for (let i = 0; i < w * h; i++) {
    const v = vals[i], o = i * 4, good = v >= 0;
    const t = good ? norm(v) : 0, a = good ? alphaOf(t) : 0;
    let ct = t;
    if (good && opts.fill !== 'smooth') {
      let b = 0; while (b < bands.length && v >= bands[b]) b++;
      const lo = b > 0 ? bands[b - 1] : layer.vmin, hi = b < bands.length ? bands[b] : layer.vmax;
      ct = norm(Math.sqrt(Math.max(lo, layer.vmin) * hi));
    }
    const col = ramp(RAMP, ct);
    img.data[o] = col[0] | 0; img.data[o + 1] = col[1] | 0; img.data[o + 2] = col[2] | 0; img.data[o + 3] = Math.round(255 * a);
  }
  ctx.putImageData(img, 0, 0);
  const labels = [];
  if (opts.contour !== false && bands.length) {
    ctx.lineWidth = (opts.lineWidth || 0.9) * Math.max(1, up * 0.55); ctx.strokeStyle = 'rgba(255,255,255,.40)'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const at = (x, y) => { const v = vals[y * w + x]; return (v >= 0) ? v : -1e30; };
    const anchor = {}, best = {};
    const tx = layer.max_lon != null ? (layer.max_lon - grid.west) / grid.dx - 0.5 : w / 2;
    const ty = layer.max_lat != null ? (grid.north - layer.max_lat) / grid.dx - 0.5 : h / 2;
    for (const L of bands) {
      if (norm(L) < A0 + 0.01) continue;
      ctx.beginPath();
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
        let ci = 0; if (a > L) ci |= 8; if (b > L) ci |= 4; if (c > L) ci |= 2; if (d > L) ci |= 1;
        if (ci === 0 || ci === 15) continue;
        const ix = (p, q, va, vb) => { const t = (L - va) / ((vb - va) || 1); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
        const eT = () => ix([x, y], [x + 1, y], a, b), eR = () => ix([x + 1, y], [x + 1, y + 1], b, c), eB = () => ix([x, y + 1], [x + 1, y + 1], d, c), eL = () => ix([x, y], [x, y + 1], a, d);
        const seg = [];
        switch (ci) {
          case 1: case 14: seg.push(eL(), eB()); break;
          case 2: case 13: seg.push(eB(), eR()); break;
          case 3: case 12: seg.push(eL(), eR()); break;
          case 4: case 11: seg.push(eT(), eR()); break;
          case 6: case 9: seg.push(eT(), eB()); break;
          case 7: case 8: seg.push(eL(), eT()); break;
          case 5: seg.push(eL(), eT(), eB(), eR()); break;
          case 10: seg.push(eT(), eR(), eL(), eB()); break;
        }
        for (let s = 0; s < seg.length; s += 2) {
          ctx.moveTo(seg[s][0] + .5, seg[s][1] + .5); ctx.lineTo(seg[s + 1][0] + .5, seg[s + 1][1] + .5);
          const dd = (seg[s][0] - tx) ** 2 + (seg[s][1] - ty) ** 2;
          if (best[L] === undefined || dd < best[L]) { best[L] = dd; anchor[L] = seg[s]; }
        }
      }
      ctx.stroke();
    }
    const placed = [], minSep = 46 * up;
    for (let idx = bands.length - 1; idx >= 0; idx--) {
      const L = bands[idx], p = anchor[L];
      if (!p || norm(L) < A0 + 0.01) continue;
      if (placed.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < minSep)) continue;
      placed.push(p);
      labels.push({ lon: grid.west + grid.dx * (p[0] + 0.5), lat: grid.north - grid.dx * (p[1] + 0.5),
        txt: useQc ? (L / lim * 100).toFixed(0) + '%' : (L >= 100 ? L.toFixed(0) : L.toPrecision(2)), value: L });
    }
  }
  return { canvas: cv, labels, grid, bands, useQc };
}

// Column list like the app's buildColumns (step chosen to keep ~2200 columns).
export function buildColumnsData(grid, vals, layer, colorFn) {
  const step = Math.max(1, Math.ceil(Math.sqrt(grid.w * grid.h / 2200)));
  const out = [];
  for (let y = 0; y < grid.h; y += step) for (let x = 0; x < grid.w; x += step) {
    const v = vals[y * grid.w + x]; if (!(v > 0)) continue;
    const t = Math.log(v / layer.vmin) / Math.log(layer.vmax / layer.vmin); if (t < 0.04) continue;
    out.push({ lon: grid.west + grid.dx * (x + 0.5), lat: grid.north - grid.dx * (y + 0.5), t, v, col: colorFn(v) });
  }
  return { cols: out, step, cellDeg: grid.dx * step };
}
