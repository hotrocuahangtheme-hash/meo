// overlay.js — 2D compositor: draws the WebGL frame, then titles, captions, legend, HUD and labels
// in the web app's visual language (dark glass panels, teal accent #49cdb6, Saira / IBM Plex fonts).
import { clamp01, smooth, easeOut } from './geo.js';
import { QC_RAMP, ABS_RAMP, ramp } from './data.js';

export const C = { accent: '#49cdb6', ink: '#eaf1f5', muted: '#a7bac6', faint: '#7f95a3', warn: '#f0a150', bad: '#ff6b7e', panel: 'rgba(10,17,24,0.78)', line: 'rgba(140,170,195,0.22)' };
export const F = { disp: '"Saira Semi Condensed", "IBM Plex Sans", sans-serif', sans: '"IBM Plex Sans", sans-serif', mono: '"IBM Plex Mono", monospace' };

export const fmtVN = (v, d = 1) => { const s = v.toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return s.join(','); };

export class Overlay {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
    this.g = this.canvas.getContext('2d');
    this.u = Math.min(w, h) / 1080;            // unit scale (1 at 1080p)
    this.vertical = h > w;
  }
  begin(gl) { const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.drawImage(gl, 0, 0, this.w, this.h); }
  end() {}

  // ---------- primitives ----------
  font(weight, size, fam) { this.g.font = `${weight} ${Math.round(size * this.u)}px ${fam}`; }
  roundRect(x, y, w, h, r) { const g = this.g; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  panel(x, y, w, h, a = 1, r = 14) {
    const g = this.g, u = this.u; g.save(); g.globalAlpha = a;
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 30 * u; g.shadowOffsetY = 10 * u;
    this.roundRect(x, y, w, h, r * u); g.fillStyle = C.panel; g.fill();
    g.shadowColor = 'transparent'; g.lineWidth = 1.2 * u; g.strokeStyle = C.line; g.stroke(); g.restore();
  }
  text(s, x, y, { weight = 500, size = 24, fam = F.sans, color = C.ink, align = 'left', base = 'alphabetic', alpha = 1, spacing = 0, shadow = 0 } = {}) {
    const g = this.g; g.save(); g.globalAlpha *= alpha; this.font(weight, size, fam); g.fillStyle = color; g.textAlign = align; g.textBaseline = base;
    if (spacing) g.letterSpacing = `${spacing * this.u}px`;
    if (shadow) { g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = shadow * this.u; g.shadowOffsetY = shadow * 0.25 * this.u; }
    g.fillText(s, x, y); const w = g.measureText(s).width; g.restore(); return w;
  }
  measure(s, weight, size, fam, spacing = 0) { const g = this.g; g.save(); this.font(weight, size, fam); if (spacing) g.letterSpacing = `${spacing * this.u}px`; const w = g.measureText(s).width; g.restore(); return w; }
  vignette(a = 0.45) {
    const g = this.g, r = Math.hypot(this.w, this.h) / 2;
    const grd = g.createRadialGradient(this.w / 2, this.h / 2, r * 0.45, this.w / 2, this.h / 2, r);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, `rgba(0,0,0,${a})`);
    g.save(); g.fillStyle = grd; g.fillRect(0, 0, this.w, this.h); g.restore();
  }
  fade(a, color = '0,0,0') { if (a <= 0) return; const g = this.g; g.save(); g.fillStyle = `rgba(${color},${clamp01(a)})`; g.fillRect(0, 0, this.w, this.h); g.restore(); }
  gradientBand(top, a = 0.55) {   // dark band for readable text at top or bottom
    const g = this.g, h = this.h * 0.42;
    const grd = top ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, this.h, 0, this.h - h);
    grd.addColorStop(0, `rgba(4,8,12,${a})`); grd.addColorStop(1, 'rgba(4,8,12,0)');
    g.save(); g.fillStyle = grd; g.fillRect(0, top ? 0 : this.h - h, this.w, h); g.restore();
  }

  // brand line: ● AERMOD · LAN TRUYỀN Ô NHIỄM
  brand(x, y, a = 1, size = 15, label = 'AERMOD · LAN TRUYỀN Ô NHIỄM', align = 'left') {
    const g = this.g, u = this.u; g.save(); g.globalAlpha *= a;
    const w = this.measure(label, 600, size, F.sans, size * 0.16);
    const x0 = align === 'center' ? x - (w + 18 * u) / 2 : x;
    g.fillStyle = C.accent; g.shadowColor = C.accent; g.shadowBlur = 12 * u;
    g.beginPath(); g.arc(x0 + 5 * u, y - size * 0.36 * u, 5 * u, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    this.text(label, x0 + 18 * u, y, { weight: 600, size, color: C.accent, spacing: size * 0.16 });
    g.restore();
  }

  // Big title block with staged reveal. p in [0,1] (in), q in [0,1] (out).
  title({ kicker, title, sub, x, y, align = 'left', size = 72, p = 1, q = 0, maxW }) {
    const g = this.g, u = this.u, a = smooth(p) * (1 - smooth(q));
    if (a <= 0) return;
    const dy = (1 - easeOut(p)) * 28 * u - smooth(q) * 14 * u;
    if (kicker) this.brand(x, y - size * 1.05 * u + dy, a * smooth((p - 0.0) * 2), size * 0.22, kicker, align);
    const lines = Array.isArray(title) ? title : [title];
    lines.forEach((ln, i) => {
      const pi = clamp01((p - 0.12 - i * 0.12) * 2.2);
      this.text(ln, x, y + i * size * 1.08 * u + dy + (1 - easeOut(pi)) * 22 * u, { weight: 700, size, fam: F.disp, align, alpha: a * smooth(pi), shadow: 24, spacing: 0.5 });
    });
    if (sub) {
      const ps = clamp01((p - 0.35) * 2);
      const subs = Array.isArray(sub) ? sub : [sub];
      subs.forEach((s, i) => this.text(s, x, y + (lines.length - 1) * size * 1.08 * u + size * 0.62 * u + i * size * 0.5 * u + dy, { weight: 400, size: size * 0.34, color: C.muted, align, alpha: a * smooth(ps), shadow: 14 }));
    }
  }

  // Caption card: kicker (teal caps), title, body lines. anchor: 'bl' | 'tl' | 'tr' | 'br' | 'bc'
  caption({ kicker, title, body = [], chip, x, y, bottom, w, p = 1, q = 0, align = 'left' }) {
    const g = this.g, u = this.u, a = smooth(p) * (1 - smooth(q));
    if (a <= 0) return;
    const pad = 24 * u, tS = 34, bS = 21;
    const bodyH = body.length * bS * 1.45 * u;
    const h = pad * 2 + (kicker ? 26 * u : 0) + tS * 1.15 * u + (body.length ? 10 * u + bodyH : 0);
    if (bottom != null) y = bottom - h;
    const dx = (1 - easeOut(p)) * (align === 'right' ? 40 : -40) * u;
    const X = x + dx;
    g.save(); g.globalAlpha = a;
    this.panel(X, y, w, h, 1, 16);
    g.fillStyle = C.accent; this.roundRect(X, y + 18 * u, 4 * u, h - 36 * u, 2 * u); g.fill();
    let cy = y + pad;
    if (kicker) { this.text(kicker.toUpperCase(), X + pad, cy + 15 * u, { weight: 600, size: 15, color: C.accent, spacing: 2.4 }); cy += 26 * u; }
    this.text(title, X + pad, cy + tS * 0.9 * u, { weight: 600, size: tS, fam: F.disp }); cy += tS * 1.15 * u + 10 * u;
    body.forEach((b, i) => {
      const parts = Array.isArray(b) ? b : [[b, C.muted]];
      let bx = X + pad;
      for (const [s, col, mono] of parts) bx += this.text(s, bx, cy + bS * u + i * bS * 1.45 * u, { weight: mono ? 600 : 400, size: bS, color: col || C.muted, fam: mono ? F.mono : F.sans });
    });
    g.restore();
    return h;
  }

  // Legend like the app: "So với QCVN" gradient 0..200% (100% marked red) or log µg/m³ bar.
  legend({ x, y, w, p = 1, q = 0, mode = 'qcvn', title, vmin, vmax, levels }) {
    const g = this.g, u = this.u, a = smooth(p) * (1 - smooth(q)); if (a <= 0) return;
    const pad = 18 * u, h = 112 * u;
    g.save(); g.globalAlpha = a;
    this.panel(x, y, w, h, 1, 14);
    this.text((title || (mode === 'qcvn' ? 'So với QCVN' : 'Nồng độ (µg/m³)')).toUpperCase(), x + pad, y + pad + 12 * u, { weight: 600, size: 14, color: C.faint, spacing: 1.8 });
    const bx = x + pad, by = y + pad + 26 * u, bw = w - pad * 2, bh = 15 * u;
    const grd = g.createLinearGradient(bx, 0, bx + bw, 0);
    for (let i = 0; i <= 32; i++) { const t = i / 32, c = ramp(mode === 'qcvn' ? QC_RAMP : ABS_RAMP, t); grd.addColorStop(t, `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`); }
    this.roundRect(bx, by, bw, bh, 4 * u); g.fillStyle = grd; g.fill(); g.strokeStyle = C.line; g.lineWidth = 1 * u; g.stroke();
    const ticks = mode === 'qcvn' ? [10, 25, 50, 75, 100, 150, 200].map(pc => ({ t: pc / 200, s: pc + '%', thr: pc === 100 }))
      : (levels || []).map(v => ({ t: Math.log(v / vmin) / Math.log(vmax / vmin), s: v >= 100 ? v.toFixed(0) : v.toPrecision(2) }));
    ticks.forEach(k => {
      const tx = bx + bw * clamp01(k.t);
      g.fillStyle = k.thr ? C.bad : 'rgba(170,195,210,0.6)'; g.fillRect(tx - 0.75 * u, by + bh + 2 * u, 1.5 * u, (k.thr ? 8 : 5) * u);
      this.text(k.s, tx, by + bh + 26 * u, { weight: k.thr ? 600 : 500, size: 14, fam: F.mono, color: k.thr ? C.bad : C.muted, align: 'center' });
    });
    if (mode === 'qcvn') { this.text('0', bx, by + bh + 50 * u, { size: 14, color: C.faint, fam: F.mono }); this.text('≥200%', bx + bw, by + bh + 50 * u, { size: 14, color: C.faint, fam: F.mono, align: 'right' }); }
    g.restore();
  }

  // Anchored pin with leader line: screen point (sx, sy), label offset (ox, oy)
  pin(sx, sy, label, sub, { a = 1, ox = 60, oy = -90, color = C.accent, size = 22 } = {}) {
    if (a <= 0 || !isFinite(sx)) return;
    const g = this.g, u = this.u; g.save(); g.globalAlpha = a;
    const lx = sx + ox * u, ly = sy + oy * u;
    g.strokeStyle = 'rgba(234,241,245,0.85)'; g.lineWidth = 1.6 * u; g.beginPath(); g.moveTo(sx, sy); g.lineTo(lx, ly); g.lineTo(lx + (ox >= 0 ? 16 : -16) * u, ly); g.stroke();
    g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 14 * u; g.beginPath(); g.arc(sx, sy, 6 * u, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2 * u; g.beginPath(); g.arc(sx, sy, 11 * u, 0, Math.PI * 2); g.stroke();
    const tw = Math.max(this.measure(label, 600, size, F.disp), sub ? this.measure(sub, 400, size * 0.68, F.sans) : 0);
    const bw = tw + 30 * u, bh = (sub ? size * 2.05 : size * 1.5) * u;
    const bx = ox >= 0 ? lx + 16 * u : lx - 16 * u - bw, by = ly - bh / 2;
    this.panel(bx, by, bw, bh, 1, 10);
    this.text(label, bx + 15 * u, by + size * 1.05 * u, { weight: 600, size, fam: F.disp });
    if (sub) this.text(sub, bx + 15 * u, by + size * 1.72 * u, { weight: 400, size: size * 0.68, color: C.muted });
    g.restore();
  }

  // Small contour-label pill (app style)
  pill(sx, sy, s, a = 1, size = 15) {
    if (a <= 0 || !isFinite(sx)) return;
    const g = this.g, u = this.u; g.save(); g.globalAlpha = a;
    const w = this.measure(s, 600, size, F.mono) + 14 * u, h = size * 1.55 * u;
    this.roundRect(sx - w / 2, sy - h / 2, w, h, 5 * u); g.fillStyle = 'rgba(7,16,22,0.62)'; g.fill();
    this.text(s, sx, sy + size * 0.36 * u, { weight: 600, size, fam: F.mono, align: 'center', color: '#ffffff' });
    g.restore();
  }

  // Replay HUD (app's #replay bar): time, progress, wind arrow, met info
  hud({ x, y, w, p = 1, q = 0, time, frac, wd, ws, T, peak, unit = 'µg/m³', title }) {
    const g = this.g, u = this.u, a = smooth(p) * (1 - smooth(q)); if (a <= 0) return;
    const h = 92 * u; g.save(); g.globalAlpha = a;
    this.panel(x, y, w, h, 1, 16);
    const cy = y + h / 2;
    g.fillStyle = C.accent; g.beginPath(); g.arc(x + 46 * u, cy, 24 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#052521'; g.fillRect(x + 38 * u, cy - 10 * u, 6 * u, 20 * u); g.fillRect(x + 49 * u, cy - 10 * u, 6 * u, 20 * u);
    this.text(time, x + 86 * u, cy - 6 * u, { weight: 600, size: 24, fam: F.mono });
    if (title) this.text(title, x + 86 * u, cy + 22 * u, { weight: 400, size: 15, color: C.muted });
    const sx = x + 330 * u, sw = w - 330 * u - 300 * u;
    g.fillStyle = 'rgba(140,170,195,0.3)'; this.roundRect(sx, cy - 3 * u, sw, 6 * u, 3 * u); g.fill();
    g.fillStyle = C.accent; this.roundRect(sx, cy - 3 * u, sw * clamp01(frac), 6 * u, 3 * u); g.fill();
    g.beginPath(); g.arc(sx + sw * clamp01(frac), cy, 9 * u, 0, Math.PI * 2); g.fill();
    // wind arrow (points to where the wind blows)
    const wx = x + w - 262 * u;
    g.strokeStyle = C.line; g.lineWidth = 1.5 * u; g.beginPath(); g.arc(wx, cy, 26 * u, 0, Math.PI * 2); g.stroke();
    g.save(); g.translate(wx, cy); g.rotate(((wd + 180) % 360) * Math.PI / 180);
    g.fillStyle = C.accent; g.beginPath(); g.moveTo(0, -17 * u); g.lineTo(8 * u, 4 * u); g.lineTo(2.5 * u, 2 * u); g.lineTo(2.5 * u, 15 * u); g.lineTo(-2.5 * u, 15 * u); g.lineTo(-2.5 * u, 2 * u); g.lineTo(-8 * u, 4 * u); g.closePath(); g.fill(); g.restore();
    this.text(`${fmtVN(ws, 1)} m/s · ${Math.round(wd)}°`, x + w - 224 * u, cy - 6 * u, { weight: 500, size: 17, fam: F.mono });
    this.text(`${fmtVN(T, 1)}°C · đỉnh ${fmtVN(peak, 0)} ${unit}`, x + w - 224 * u, cy + 20 * u, { weight: 400, size: 15, fam: F.mono, color: C.muted });
    g.restore();
  }

  // Key/value card like the app's Cesium infoBox for a stack
  infoCard({ title, kicker, rows, x, y, w, p = 1, q = 0 }) {
    const g = this.g, u = this.u, a = smooth(p) * (1 - smooth(q)); if (a <= 0) return;
    const pad = 22 * u, rh = 34 * u, h = pad * 2 + 60 * u + rows.length * rh;
    const X = x + (1 - easeOut(p)) * 40 * u;
    g.save(); g.globalAlpha = a; this.panel(X, y, w, h, 1, 14);
    const grd = g.createLinearGradient(0, y, 0, y + 70 * u); grd.addColorStop(0, 'rgba(73,205,182,0.16)'); grd.addColorStop(1, 'rgba(73,205,182,0)');
    this.roundRect(X, y, w, 70 * u, 14 * u); g.fillStyle = grd; g.fill();
    if (kicker) this.text(kicker.toUpperCase(), X + pad, y + pad + 10 * u, { weight: 600, size: 14, color: C.accent, spacing: 2 });
    this.text(title, X + pad, y + pad + 44 * u, { weight: 600, size: 30, fam: F.disp });
    rows.forEach(([k, v], i) => {
      const ry = y + pad + 60 * u + i * rh + 24 * u;
      const pi = clamp01((p - 0.15 - i * 0.07) * 3);
      g.globalAlpha = a * smooth(pi);
      g.fillStyle = 'rgba(140,170,195,0.14)'; g.fillRect(X + pad, ry + 10 * u, w - pad * 2, 1 * u);
      this.text(k, X + pad, ry, { weight: 400, size: 18, color: C.muted });
      this.text(v, X + w - pad, ry, { weight: 600, size: 18, fam: F.mono, align: 'right' });
    });
    g.restore();
  }

  // Segmented control like the app (.seg buttons): items, active index (float allowed for animation)
  seg({ label, items, active, x, y, w, p = 1, q = 0 }) {
    const g = this.g, u = this.u, a = smooth(p) * (1 - smooth(q)); if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    if (label) this.text(label.toUpperCase(), x, y - 10 * u, { weight: 600, size: 13, color: C.faint, spacing: 1.6 });
    const h = 46 * u; this.panel(x, y, w, h, 1, 10);
    const n = items.length, bw = (w - 8 * u) / n;
    const ax = x + 4 * u + bw * active;
    this.roundRect(ax, y + 4 * u, bw, h - 8 * u, 7 * u); g.fillStyle = C.accent; g.shadowColor = 'rgba(73,205,182,0.45)'; g.shadowBlur = 14 * u; g.fill(); g.shadowBlur = 0;
    items.forEach((s, i) => {
      const on = Math.abs(active - i) < 0.5;
      this.text(s, x + 4 * u + bw * i + bw / 2, y + h / 2 + 7 * u, { weight: on ? 700 : 500, size: 18, align: 'center', color: on ? '#052521' : C.muted });
    });
    g.restore();
  }

  // centred end card
  endCard({ p = 1, q = 0, title, sub, credits = [], kicker }) {
    const u = this.u, cx = this.w / 2, cy = this.h * (this.vertical ? 0.42 : 0.44);
    const a = smooth(p) * (1 - smooth(q)); if (a <= 0) return;
    this.fade(0.55 * a, '4,8,12');
    this.title({ kicker, title, sub, x: cx, y: cy, align: 'center', size: this.vertical ? 96 : 104, p, q });
    credits.forEach((c, i) => this.text(c, cx, this.h * (this.vertical ? 0.70 : 0.80) + i * 30 * u, { size: 18, color: C.faint, align: 'center', alpha: a * smooth(clamp01((p - 0.4) * 2)) }));
  }
}
