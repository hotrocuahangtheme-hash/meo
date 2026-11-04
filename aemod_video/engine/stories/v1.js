// v1.js — "AERMOD 3D · Cẩm Phả – Mông Dương" (120 s; music v1 = 96 BPM, 1 bar = 2.5 s)
import * as THREE from 'three';
import { clamp01, smooth, smoother, easeOut, lerp, range01 } from '../geo.js';
import * as D from '../data.js';
import { fmtVN, C } from '../overlay.js';
import { buildCampha, buildGlobe, overlayFor, setOverlay, project, loadJSON, sunENU, addLights, atmos, orbitPath, applyOrbit, windENU, win } from './common.js';

export async function setup(ctx) {
  const { OW, OH, vertical } = ctx;
  const meta = await loadJSON(`${ctx.ASSETS}/data/meta.json`);
  const Q = await buildCampha(ctx, meta, { smokePer: 110 });
  const g0 = Q.layers.l0.rect, m0 = 0.01;
  const globe = await buildGlobe(ctx, [{ west: g0.west + m0, east: g0.east - m0, south: g0.south + m0, north: g0.north - m0 }]);
  const sun = sunENU(150, 40);
  const sunW = new THREE.Vector3().addScaledVector(Q.frame.e, sun.x).addScaledVector(Q.frame.n, sun.y).addScaledVector(Q.frame.u, sun.z);
  for (const m of [Q.terr.mat, Q.ctxPatch.mat]) { m.uniforms.sunDir.value.copy(sun); m.uniforms.resolution.value.set(OW, OH); }
  globe.mat.uniforms.sunDir.value.copy(sunW);
  addLights(ctx, Q.frame, sun);
  const U = Q.terr.mat.uniforms;
  const c = Q.c;

  // ---- overlays (built exactly like the app: % QCVN bands + contours) ----
  const ov = {
    TSP: await overlayFor(ctx, c, 'TSP', '1h_max'),
    SO2: await overlayFor(ctx, c, 'SO2', '1h_max'),
    NO2: await overlayFor(ctx, c, 'NO2', '1h_max'),
    NO2p: await overlayFor(ctx, c, 'NO2', 'period'),
    SO2p99: await overlayFor(ctx, c, 'SO2', '1h_p99'),
    SO2d: await overlayFor(ctx, c, 'SO2', '24h_max'),
  };
  const lim = (pol, met) => c.qcvn[pol][D.AVG(met)];

  // ---- hourly replay (SO2, 26–29/12/2018) ----
  const A = c.anim, AL = A.layers.SO2;
  const animRaw = await D.fetchU16(`${ctx.ASSETS}/data/${AL.file}`);
  const nA = A.grid.w * A.grid.h;
  const animCache = new Map();
  const animOverlay = k => {
    k = Math.max(0, Math.min(A.times.length - 1, k));
    if (animCache.has(k)) return animCache.get(k);
    const vals = D.decode(animRaw, AL.vmin, AL.vmax, k * nA, nA);
    const o = D.buildOverlay(A.grid, vals, { vmin: AL.vmin, vmax: AL.vmax }, { scale: 'abs', fill: 'band', limit: lim('SO2', '1h_max'), up: 6 });
    const tex = new THREE.CanvasTexture(o.canvas); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
    const g = A.grid;
    const r = { tex, labels: o.labels, rect: { west: g.west, north: g.north, east: g.west + g.dx * g.w, south: g.north - g.dx * g.h } };
    animCache.set(k, r);
    if (animCache.size > 6) { const first = animCache.keys().next().value; animCache.get(first).tex.dispose(); animCache.delete(first); }
    return r;
  };

  // ---- camera path (orbit keys: target lon/lat/height, heading, pitch, range) ----
  const VK = vertical ? 1.25 : 1;      // vertical frames show less width -> pull back a little
  const keys = [
    { t: 0, lon: 106.2, lat: 18.6, hd: 8, p: -52, r: 3.3e6 },
    { t: 5, lon: 107.1, lat: 20.6, hd: 2, p: -70, r: 6.0e5 },
    { t: 10, lon: 107.33, lat: 21.0, hd: 345, p: -60, r: 9.0e4 },
    { t: 14.5, lon: 107.35, lat: 21.04, hd: 330, p: -45, r: 3.6e4 },
    { t: 19.5, lon: 107.352, lat: 21.06, hd: 318, p: -33, r: 1.65e4 },
    { t: 24.5, lon: 107.3485, lat: 21.0742, th: 130, hd: 250, p: -12, r: 1750, rv: 1.1 },
    { t: 30, lon: 107.3490, lat: 21.0745, th: 130, hd: 206, p: -8, r: 1350, rv: 1.1 },
    { t: 34, lon: 107.35, lat: 21.06, hd: 205, p: -33, r: 1.5e4 },
    { t: 39, lon: 107.346, lat: 21.065, hd: 190, p: -43, r: 2.7e4 },
    { t: 44, lon: 107.3363, lat: 21.0955, th: 300, hd: 334, p: -23, r: 6800, rv: 1.15 },
    { t: 50, lon: 107.3363, lat: 21.0955, th: 300, hd: 302, p: -20, r: 5800, rv: 1.15 },
    { t: 56, lon: 107.35, lat: 21.05, hd: 62, p: -47, r: 3.2e4 },
    { t: 63, lon: 107.36, lat: 21.05, hd: 22, p: -52, r: 3.4e4 },
    { t: 70, lon: 107.35, lat: 21.06, hd: 340, p: -40, r: 2.8e4 },
    { t: 75.5, lon: 107.345, lat: 21.07, hd: 322, p: -31, r: 1.9e4 },
    { t: 81, lon: 107.345, lat: 21.045, hd: 205, p: -27, r: 1.5e4 },
    { t: 86.5, lon: 107.3485, lat: 21.0159, th: 200, hd: 215, p: -22, r: 7500, rv: 1.15 },
    { t: 91, lon: 107.35, lat: 21.06, hd: 222, p: -38, r: 2.4e4 },
    { t: 95.5, lon: 107.305, lat: 21.035, hd: 205, p: -50, r: 2.3e4 },
    { t: 108.5, lon: 107.30, lat: 21.03, hd: 168, p: -55, r: 2.45e4 },
    { t: 114.5, lon: 107.3, lat: 20.97, hd: 152, p: -70, r: 1.3e5 },
    { t: 120, lon: 107.2, lat: 20.85, hd: 150, p: -78, r: 3.2e5 },
  ].map(k => ({ ...k, r: k.r * (vertical ? (k.rv || VK) : 1) }));
  const cam = orbitPath(keys);

  const MD = Q.chim.tops[8], CP = Q.chim.tops[1], S10 = Q.chim.tops[9];
  const peak = Q.frame.toLocal(107.336259, 21.095513, 303);
  const peakP99 = Q.frame.toLocal(107.341946, 21.090017, Q.hAt(107.341946, 21.090017) + 5);
  const peak24 = Q.frame.toLocal(107.34848, 21.015881, Q.hAt(107.34848, 21.015881) + 5);
  const revealC = new THREE.Vector2(107.3485 - Q.frame.lon0, 21.074 - Q.frame.lat0);
  let st = {};

  function setOvl(a, b, mix) { setOverlay(Q.terr, Q.frame, 'A', a); setOverlay(Q.terr, Q.frame, 'B', b); U.ovlMix.value = mix; }

  return {
    duration: 120,
    async update(t) {
      const o = cam(t);
      ctx.camera.fov = vertical ? 62 : 40;
      const cc = applyOrbit(ctx, o);
      const camH = cc.h;
      atmos([Q.terr.mat, Q.ctxPatch.mat, globe.mat], camH);
      // smoke & lights
      let wind = windENU(60, 4.2), smokeOp = smooth(range01(t, 11, 15)) * (1 - smooth(range01(t, 68, 72)));
      // overlay programme
      U.ovlOn.value = t > 30.5 ? 1 : 0;
      U.ovlAlpha.value = 0.82;
      U.ovlSplit.value = -1;
      const rr = smoother(range01(t, 31, 37)) * 0.42;
      U.reveal.value.set(revealC.x, revealC.y, t < 37 ? rr : 1e9, 0.06);
      let labels = ov.TSP.labels, lblA = smooth(range01(t, 35, 37));
      let hour = -1;
      if (t < 51) { setOvl(ov.TSP, ov.SO2, 0); }
      else if (t < 57) { const m = smooth(range01(t, 51, 53)); setOvl(ov.TSP, ov.SO2, m); labels = m < 0.5 ? ov.TSP.labels : ov.SO2.labels; lblA = Math.abs(m - 0.5) * 2; }
      else if (t < 63) { const m = smooth(range01(t, 57, 59)); setOvl(ov.SO2, ov.NO2, m); labels = m < 0.5 ? ov.SO2.labels : ov.NO2.labels; lblA = Math.abs(m - 0.5) * 2; }
      else if (t < 69.5) { const m = smooth(range01(t, 63, 65)); setOvl(ov.NO2, ov.NO2p, m); labels = m < 0.5 ? ov.NO2.labels : ov.NO2p.labels; lblA = Math.abs(m - 0.5) * 2; }
      else if (t < 79.5) { const m = smooth(range01(t, 69.5, 71.5)); setOvl(ov.NO2p, ov.SO2p99, m); labels = m < 0.5 ? ov.NO2p.labels : ov.SO2p99.labels; lblA = Math.abs(m - 0.5) * 2; }
      else if (t < 91.5) { const m = smooth(range01(t, 79.5, 81.5)); setOvl(ov.SO2p99, ov.SO2d, m); labels = m < 0.5 ? ov.SO2p99.labels : ov.SO2d.labels; lblA = Math.abs(m - 0.5) * 2; }
      else if (t < 109.5) {
        const f = clamp01((t - 92) / 16) * (A.times.length - 1);
        hour = Math.floor(f);
        const a = animOverlay(hour), b = animOverlay(Math.min(A.times.length - 1, hour + 1));
        const fade = smooth(range01(t, 91.5, 93));
        setOvl(fade < 1 ? ov.SO2d : a, a, fade);
        if (fade >= 1) { setOverlay(Q.terr, Q.frame, 'A', a); setOverlay(Q.terr, Q.frame, 'B', b); U.ovlMix.value = f - hour; }
        labels = a.labels; lblA = smooth(range01(t, 93, 94)) * 0.9;
        const w = A.wind[hour]; wind = windENU(w.wd, w.ws); smokeOp = 0.85 * smooth(range01(t, 92, 94));
      } else { setOvl(animOverlay(A.times.length - 1), animOverlay(A.times.length - 1), 0); U.ovlAlpha.value = 0.82 * (1 - smooth(range01(t, 110, 113))); labels = []; }
      // columns
      Q.smoke.mat.uniforms.opacity.value = smokeOp;
      Q.smoke.mat.uniforms.wind.value.copy(wind);
      Q.smoke.mat.uniforms.time.value = 300 + t;
      Q.chim.lightMat.color.setRGB(1, 0.18, 0.18).multiplyScalar(0.25 + 0.75 * (Math.sin(t * 4.2) > 0.2 ? 1 : 0));
      st = { camH, t, hour, labels, lblA: lblA * (U.ovlOn.value) };
      return st;
    },
    draw(t, o, st) {
      const u = o.u, Wd = o.w, Ht = o.h;
      o.vignette(0.38);
      // contour labels
      if (st.labels && st.lblA > 0.01) for (const L of st.labels) {
        const p = project(ctx, Q.frame, Q.frame.toLocal(L.lon, L.lat, Q.hAt(L.lon, L.lat) + 5));
        if (p.vis) o.pill(p.x, p.y, L.txt, st.lblA * 0.95, vertical ? 17 : 15);
      }
      // ---------- 0–10 s: title ----------
      o.gradientBand(false, 0.35 * (1 - smooth(range01(t, 9, 11))));
      const tw = win(t, 0.8, 8.2, 1.6, 1.0);
      o.title({ kicker: 'AERMOD · LAN TRUYỀN Ô NHIỄM', title: vertical ? ['Mô phỏng', 'lan truyền', 'ô nhiễm', 'không khí 3D'] : ['Mô phỏng lan truyền', 'ô nhiễm không khí 3D'],
        sub: 'Cẩm Phả – Mông Dương · Quảng Ninh', x: Wd / 2, y: vertical ? Ht * 0.34 : Ht * 0.43, align: 'center', size: vertical ? 92 : 92, p: tw.p, q: tw.q });
      // layout
      const capW = vertical ? Wd - 100 * u : 640 * u, capX = vertical ? 50 * u : 70 * u;
      const capTop = vertical ? Ht * 0.115 : null, capBottom = vertical ? null : Ht - 64 * u;
      const cap = (args, w0, w1) => { const w = win(t, w0, w1, 0.7, 0.5); if (w.on) o.caption({ ...args, x: capX, w: capW, y: capTop, bottom: capBottom, p: w.p, q: w.q }); };
      // ---------- 11–19.5: study area ----------
      cap({ kicker: 'Khu vực nghiên cứu', title: 'Cẩm Phả – Mông Dương', body: ['Bản đồ 3D: địa hình + ảnh vệ tinh', '3 nhà máy nhiệt điện · 10 ống khói'] }, 11, 19.3);
      // pins on the two plants
      const pw = win(t, 15, 23.5, 0.8, 0.6);
      if (pw.on) {
        const a = smooth(pw.p) * (1 - smooth(pw.q));
        const p1 = project(ctx, Q.frame, MD), p2 = project(ctx, Q.frame, CP);
        if (p1.vis) o.pin(p1.x, p1.y, 'NMNĐ Mông Dương I & II', '6 ống khói · cao 200–208 m', { a, ox: vertical ? -40 : 70, oy: -110 });
        if (p2.vis) o.pin(p2.x, p2.y, 'NMNĐ Cẩm Phả', '4 ống khói · cao 155 m', { a, ox: vertical ? 40 : 80, oy: vertical ? 120 : 90 });
      }
      // ---------- 21.5–30: stack info (app's infobox data) ----------
      const iw = win(t, 21.8, 30.2, 0.8, 0.5);
      if (iw.on) {
        const p3 = project(ctx, Q.frame, S10);
        if (p3.vis && iw.q < 0.5) o.pin(p3.x, p3.y, 'S10', null, { a: smooth(iw.p) * (1 - smooth(iw.q)), ox: vertical ? 40 : -60, oy: -70, size: 20 });
        o.infoCard({ kicker: 'Ống khói S10 · Mông Dương II', title: 'Thông số nguồn thải', x: vertical ? 50 * u : Wd - 560 * u, y: vertical ? Ht * 0.555 : Ht * 0.17, w: vertical ? Wd - 100 * u : 490 * u, p: iw.p, q: iw.q,
          rows: [['Chiều cao', '208 m'], ['Đường kính', '2,5 m'], ['Vận tốc khí thải', '41,0 m/s'], ['Nhiệt độ khí thải', '131 °C'], ['Phát thải SO₂', '794,5 g/s'], ['Phát thải NO₂', '500,6 g/s'], ['Phát thải TSP', '262,8 g/s']] });
      }
      // ---------- 33–49: TSP result ----------
      const W_ = C.warn, M_ = C.muted, I_ = C.ink;
      cap({ kicker: 'Kết quả AERMOD', title: 'TSP · Cực đại 1 giờ', body: [[['Đỉnh mô phỏng  ', M_], ['1.313,6 µg/m³', W_, 1]], [['QCVN (1 giờ)  ', M_], ['300 µg/m³', I_, 1]], 'Giai đoạn mô phỏng 2018–2020'] }, 33.5, 49.3);
      const kw = win(t, 41.5, 50, 0.8, 0.6);
      if (kw.on) { const pp = project(ctx, Q.frame, peak); if (pp.vis) o.pin(pp.x, pp.y, 'Điểm cực đại · đồi cao 303 m', 'cách ống khói Mông Dương ~2,7 km', { a: smooth(kw.p) * (1 - smooth(kw.q)), ox: vertical ? -30 : 90, oy: -120, color: C.bad }); }
      // ---------- 50–69.5: pollutant / metric switching ----------
      const sw = win(t, 50.2, 69.3, 0.7, 0.5);
      if (sw.on) {
        const act = smooth(range01(t, 51, 53)) + smooth(range01(t, 57, 59));
        const sx = vertical ? 50 * u : Wd - 560 * u, sy = vertical ? Ht * 0.665 : 70 * u + 22 * u;
        o.seg({ label: 'Chất', items: ['TSP', 'SO₂', 'NO₂'], active: act, x: sx, y: sy, w: vertical ? (Wd - 100 * u) * 0.48 : 230 * u, p: sw.p, q: sw.q });
        o.seg({ label: 'Chỉ tiêu', items: ['Cực đại 1 giờ', 'TB giai đoạn'], active: smooth(range01(t, 63, 65)), x: vertical ? sx + (Wd - 100 * u) * 0.52 : sx + 250 * u, y: sy, w: vertical ? (Wd - 100 * u) * 0.48 : 290 * u, p: sw.p, q: sw.q });
      }
      cap({ kicker: 'Đổi chất ô nhiễm', title: 'SO₂ · Cực đại 1 giờ', body: [[['Đỉnh mô phỏng  ', M_], ['3.362,1 µg/m³', W_, 1]], [['QCVN (1 giờ)  ', M_], ['350 µg/m³', I_, 1]]] }, 51.6, 56.8);
      cap({ kicker: 'Đổi chất ô nhiễm', title: 'NO₂ · Cực đại 1 giờ', body: [[['Đỉnh mô phỏng  ', M_], ['4.692,6 µg/m³', W_, 1]], [['QCVN (1 giờ)  ', M_], ['200 µg/m³', I_, 1]]] }, 57.6, 62.8);
      cap({ kicker: 'Đổi chỉ tiêu', title: 'NO₂ · Trung bình 2018–2020', body: [[['Đỉnh mô phỏng  ', M_], ['36,8 µg/m³', W_, 1]], [['QCVN (năm)  ', M_], ['40 µg/m³', I_, 1], ['  ≈ 92%', C.warn, 1]]] }, 63.6, 69.3);
      // ---------- 69.5–91.5: SO₂ metrics (P99 1 h, max 24 h) ----------
      const sw2 = win(t, 69.6, 91.3, 0.7, 0.5);
      if (sw2.on) {
        const sx = vertical ? 50 * u : Wd - 560 * u, sy = vertical ? Ht * 0.665 : 70 * u + 22 * u;
        o.seg({ label: 'Chất', items: ['TSP', 'SO₂', 'NO₂'], active: 2 - smooth(range01(t, 69.5, 71.5)), x: sx, y: sy, w: vertical ? (Wd - 100 * u) * 0.48 : 230 * u, p: sw2.p, q: sw2.q });
        o.seg({ label: 'Chỉ tiêu', items: ['P99 1 giờ', 'Cực đại 24 giờ'], active: smooth(range01(t, 79.5, 81.5)), x: vertical ? sx + (Wd - 100 * u) * 0.52 : sx + 250 * u, y: sy, w: vertical ? (Wd - 100 * u) * 0.48 : 290 * u, p: sw2.p, q: sw2.q });
      }
      cap({ kicker: 'Đổi chỉ tiêu', title: 'SO₂ · Phân vị 99 – 1 giờ', body: [[['Đỉnh mô phỏng  ', M_], ['582,0 µg/m³', W_, 1]], [['QCVN (1 giờ)  ', M_], ['350 µg/m³', I_, 1]]] }, 71.6, 79.3);
      cap({ kicker: 'Đổi chỉ tiêu', title: 'SO₂ · Cực đại 24 giờ', body: [[['Đỉnh mô phỏng  ', M_], ['421,3 µg/m³', W_, 1]], [['QCVN (24 giờ)  ', M_], ['125 µg/m³', I_, 1]]] }, 81.6, 91.3);
      const k1 = win(t, 73.5, 79.3, 0.7, 0.5);
      if (k1.on) { const pp = project(ctx, Q.frame, peakP99); if (pp.vis) o.pin(pp.x, pp.y, 'Đỉnh P99 · 582,0 µg/m³', 'đồi ~270 m phía bắc Mông Dương', { a: smooth(k1.p) * (1 - smooth(k1.q)), ox: vertical ? -30 : 90, oy: -110, color: C.bad }); }
      const k2 = win(t, 83.6, 91.0, 0.7, 0.5);
      if (k2.on) { const pp = project(ctx, Q.frame, peak24); if (pp.vis) o.pin(pp.x, pp.y, 'Đỉnh 24 giờ · 421,3 µg/m³', 'đồi ~200 m, cách NMNĐ Cẩm Phả ~1,3 km', { a: smooth(k2.p) * (1 - smooth(k2.q)), ox: vertical ? -30 : 90, oy: -110, color: C.bad }); }
      // ---------- legend ----------
      const lgW = vertical ? Wd - 100 * u : 470 * u;
      const lw = win(t, 34, 89.5, 0.8, 0.6), lw2 = win(t, 93, 109.3, 0.8, 0.6);
      if (lw.on) o.legend({ x: vertical ? 50 * u : Wd - lgW - 70 * u, y: vertical ? Ht * 0.735 : Ht - 64 * u - 112 * u, w: lgW, p: lw.p, q: lw.q });
      // ---------- 92–109.5: hourly replay ----------
      if (lw2.on) o.legend({ x: vertical ? 50 * u : Wd - lgW - 70 * u, y: vertical ? Ht * 0.735 : 64 * u, w: lgW, p: lw2.p, q: lw2.q, mode: 'abs', vmin: AL.vmin, vmax: AL.vmax, levels: [0.1, 1, 10, 100], title: 'SO₂ (µg/m³)' });
      const rw = win(t, 92.5, 109.3, 0.8, 0.6);
      if (rw.on) {
        o.caption({ kicker: 'Phát lại theo giờ', title: 'Đợt gió mùa đông bắc', body: ['26–29/12/2018 · SO₂ · nồng độ từng giờ (µg/m³)', 'Mô phỏng AERMOD theo từng giờ'], x: capX, w: vertical ? capW : 560 * u, y: vertical ? Ht * 0.115 : 64 * u, p: rw.p, q: rw.q });
        const k = Math.max(0, st.hour), w = A.wind[k], tm = A.times[k];
        const [dd, hh] = tm.split(' ');
        const [yy, mo, da] = dd.split('-');
        o.hud({ x: vertical ? 40 * u : (Wd - 1180 * u) / 2, y: vertical ? Ht * 0.615 : Ht - 64 * u - 92 * u, w: vertical ? Wd - 80 * u : 1180 * u, p: rw.p, q: rw.q,
          time: `${da}/${mo}/${yy} ${hh}h`, title: 'giờ địa phương', frac: k / (A.times.length - 1), wd: w.wd, ws: w.ws, T: w.T, peak: AL.hourly_max[k] });
      }
      // ---------- 110.5–120: end card ----------
      const ew = win(t, 110.5, 125, 1.6, 1);
      if (ew.on) o.endCard({ p: ew.p, q: 0, kicker: 'AERMOD · LAN TRUYỀN Ô NHIỄM', title: 'AERMOD 3D', sub: vertical ? ['Mô phỏng lan truyền ô nhiễm', 'Cẩm Phả – Mông Dương · Quảng Ninh'] : ['Mô phỏng lan truyền ô nhiễm không khí · Cẩm Phả – Mông Dương, Quảng Ninh'], credits: [] });
      // fades
      o.fade(1 - smooth(range01(t, 0, 1.2)));
      o.fade(smooth(range01(t, 118.6, 120)));
    },
  };
}
