// v2.js — "AERMOD 3D · trên trình duyệt · Đồng Tháp" (120 s; music v2 = 120 BPM, 1 bar = 2 s)
import * as THREE from 'three';
import { clamp01, smooth, smoother, easeOut, easeIn, lerp, range01, ecef } from '../geo.js';
import * as D from '../data.js';
import { fmtVN, C } from '../overlay.js';
import { buildDongthap, buildGlobe, overlayFor, setOverlay, project, loadJSON, sunENU, addLights, atmos, orbitPath, applyOrbit, windENU, win } from './common.js';

export async function setup(ctx) {
  const { OW, OH, vertical, camera, scene } = ctx;
  const meta = await loadJSON(`${ctx.ASSETS}/data/meta.json`);
  const T = await buildDongthap(ctx, meta, { smokePer: 40 });
  const r0 = T.layers[1].rect, m0 = 0.01;
  const globe = await buildGlobe(ctx, [{ west: r0.west + m0, east: r0.east - m0, south: r0.south + m0, north: r0.north - m0 }]);
  const sun = sunENU(140, 48);
  const sunW = new THREE.Vector3().addScaledVector(T.frame.e, sun.x).addScaledVector(T.frame.n, sun.y).addScaledVector(T.frame.u, sun.z);
  for (const m of [T.terr.mat, T.ctxPatch.mat]) { m.uniforms.sunDir.value.copy(sun); m.uniforms.resolution.value.set(OW, OH); }
  globe.mat.uniforms.sunDir.value.copy(sunW);
  addLights(ctx, T.frame, sun);
  const U = T.terr.mat.uniforms;
  const cA = meta.cases[1], cB = meta.cases[2];

  // overlays
  const ovA = await overlayFor(ctx, cA, 'NO2', '1h_max', { up: 3 });
  const ovB = await overlayFor(ctx, cB, 'NO2', '1h_max', { up: 3 });
  const ovAabs = await overlayFor(ctx, cA, 'NO2', '1h_max', { up: 3, scale: 'abs' });
  const ovAabsS = await overlayFor(ctx, cA, 'NO2', '1h_max', { up: 3, scale: 'abs', fill: 'smooth' });
  const LA = ovA.layer;
  const colData = D.buildColumnsData(cA.grid, ovA.vals, LA, v => D.ramp(D.QC_RAMP, (v / 200) / 2));
  const cols = ctx.W.makeColumns(T.frame, colData, {});

  // browser windows with real app screenshots (left panel hidden)
  scene.add(camera);
  const shotTex = async n => { const t = await ctx.W.loadTexture(`${ctx.ASSETS}/appshots/${n}.png`); t.anisotropy = 8; return t; };
  const [tA, tB, tC] = await Promise.all(['qn_tsp_3d', 'qn_replay', 'dt_2d'].map(shotTex));
  const TITLE = 'AERMOD — mô phỏng lan truyền ô nhiễm không khí (2D/3D)';
  const w0 = ctx.W.makeWindow(tA, TITLE, 14.5); camera.add(w0);
  const gal = [ctx.W.makeWindow(tA, TITLE, 16), ctx.W.makeWindow(tB, TITLE, 16), ctx.W.makeWindow(tC, TITLE, 16)];
  gal.forEach(g => camera.add(g));

  // camera path
  const VK = vertical ? 1.25 : 1;
  const keys = [
    { t: 0, lon: 106.3, lat: 15.6, hd: 0, p: -88, r: 2.5e7, rv: 1.0 },
    { t: 6, lon: 106.4, lat: 16.0, hd: 0, p: -86, r: 2.1e7, rv: 1.0 },
    { t: 8.5, lon: 107.0, lat: 19.2, hd: 350, p: -72, r: 5.2e6, rv: 1.0 },
    { t: 13, lon: 106.6, lat: 15.6, hd: 352, p: -64, r: 3.8e6, rv: 1.0 },
    { t: 18, lon: 106.0, lat: 11.9, hd: 355, p: -62, r: 1.7e6, rv: 1.0 },
    { t: 22, lon: 105.72, lat: 10.42, hd: 0, p: -60, r: 2.6e5 },
    { t: 25, lon: 105.66, lat: 10.42, hd: 10, p: -52, r: 9.5e4 },
    { t: 29.5, lon: 105.68, lat: 10.40, hd: 24, p: -44, r: 6.2e4 },
    { t: 34, lon: 105.745, lat: 10.31, hd: 38, p: -33, r: 2.0e4 },
    { t: 37.5, lon: 105.7525, lat: 10.3285, th: 12, hd: 52, p: -19, r: 3200, rv: 1.1 },
    { t: 40.5, lon: 105.752, lat: 10.33, hd: 40, p: -32, r: 9500 },
    { t: 44, lon: 105.70, lat: 10.40, hd: 0, p: -55, r: 4.6e4 },
    { t: 55, lon: 105.70, lat: 10.39, hd: 352, p: -56, r: 4.8e4 },
    { t: 58.5, lon: 105.73, lat: 10.38, hd: 340, p: -50, r: 4.6e4 },
    { t: 71, lon: 105.72, lat: 10.39, hd: 312, p: -48, r: 4.4e4 },
    { t: 76, lon: 105.73, lat: 10.35, hd: 285, p: -25, r: 3.7e4 },
    { t: 85, lon: 105.74, lat: 10.34, hd: 245, p: -20, r: 3.4e4 },
    { t: 90, lon: 105.66, lat: 10.45, hd: 300, p: -60, r: 1.5e5, fov: 40 },
    { t: 95, lon: 105.645, lat: 10.49, hd: 360, p: -89.5, r: 4.6e5, fov: 18 },
    { t: 112, lon: 105.645, lat: 10.49, hd: 360, p: -89.5, r: 4.9e5, fov: 18 },
    { t: 120, lon: 105.645, lat: 10.49, hd: 360, p: -89.5, r: 6.5e5, fov: 18 },
  ].map(k => ({ ...k, r: k.r * (vertical ? (k.rv || VK) : 1), fov: k.fov !== undefined ? (vertical ? k.fov * 1.55 : k.fov) : undefined }));
  const cam = orbitPath(keys);

  // arc Quảng Ninh -> Đồng Tháp
  const QN = { lon: 107.35, lat: 21.04 }, DT = { lon: 105.70, lat: 10.40 };
  const a0 = ecef(QN.lon, QN.lat, 0).normalize(), a1 = ecef(DT.lon, DT.lat, 0).normalize();
  const om = Math.acos(a0.dot(a1));
  const arcPts = Array.from({ length: 81 }, (_, i) => {
    const s = i / 80, v = a0.clone().multiplyScalar(Math.sin((1 - s) * om) / Math.sin(om)).add(a1.clone().multiplyScalar(Math.sin(s * om) / Math.sin(om)));
    return v.normalize().multiplyScalar(6371000 + 160000 * Math.sin(Math.PI * s));
  });
  const distKm = Math.round(om * 6371 / 10) * 10;
  const projW = (p) => { const q = p.clone().project(camera); return { x: (q.x * 0.5 + 0.5) * OW, y: (-q.y * 0.5 + 0.5) * OH, vis: q.z < 1 }; };

  const revealC = new THREE.Vector2(105.7544 - T.frame.lon0, 10.3282 - T.frame.lat0);
  const peakA = T.frame.toLocal(105.754429, 10.328224, 0);
  const stackPts = T.stacks.map(s => T.frame.toLocal(s.lon, s.lat, s.h));
  function setOvl(a, b, mix) { setOverlay(T.terr, T.frame, 'A', a); setOverlay(T.terr, T.frame, 'B', b); U.ovlMix.value = mix; }

  return {
    duration: 120,
    update(t) {
      const o = cam(t);
      camera.fov = o.fov !== undefined ? o.fov : (vertical ? 62 : 40);
      camera.updateProjectionMatrix();
      const cc = applyOrbit(ctx, o);
      atmos([T.terr.mat, T.ctxPatch.mat, globe.mat], cc.h);
      // overlay programme
      U.ovlOn.value = t > 24.5 && t < 112.5 ? 1 : 0;
      U.ovlAlpha.value = 0.82 - 0.22 * smooth(range01(t, 35, 37)) * (1 - smooth(range01(t, 40, 42))) - 0.14 * smooth(range01(t, 58, 60)) * (1 - smooth(range01(t, 70, 72)));
      U.ovlSplit.value = -1;
      const rr = smoother(range01(t, 25, 30.5)) * 0.75;
      U.reveal.value.set(revealC.x, revealC.y, t < 30.5 ? rr : 1e9, 0.08);
      let labels = ovA.labels, lblA = smooth(range01(t, 28, 30)), split = -1;
      if (t < 41) setOvl(ovA, ovB, 0);
      else if (t < 56.5) {
        setOvl(ovA, ovB, 0);
        split = 0.5 + 0.13 * Math.sin((t - 43) * 0.55) * smooth(range01(t, 43, 45)) * (1 - smooth(range01(t, 54, 56)));
        split = lerp(-0.02, split, smooth(range01(t, 41, 42.5)));
        labels = []; lblA = 0;
      } else if (t < 64) { const m = smooth(range01(t, 58.3, 59.8)); setOvl(ovA, ovAabs, m); labels = m < 0.5 ? ovA.labels : ovAabs.labels; lblA = Math.abs(m - 0.5) * 2; }
      else if (t < 71.5) { const m = smooth(range01(t, 64.5, 66)); setOvl(ovAabs, ovAabsS, m); labels = ovAabs.labels; lblA = 1 - m; }
      else { const m = smooth(range01(t, 71.5, 73)); setOvl(ovAabsS, ovA, m); labels = ovA.labels; lblA = smooth(range01(t, 72.5, 73.5)) * (1 - smooth(range01(t, 74, 75.5))) + smooth(range01(t, 92, 94)) * (1 - smooth(range01(t, 96, 97))); }
      if (split >= 0) U.ovlSplit.value = Math.max(0, split);
      // columns + exaggeration + 2D
      const grow = smooth(range01(t, 72.5, 77.5)) * (1 - smooth(range01(t, 88, 91)));
      const exag = 1 + 5 * smoother(range01(t, 79.5, 86.5));
      cols.set(grow, 2600, exag);
      U.ovlAlpha.value *= 1 - 0.4 * grow;
      // gallery dims the map
      const dim = smooth(range01(t, 96, 98)) * (1 - smooth(range01(t, 111, 113)));
      for (const m of [T.terr.mat, T.ctxPatch.mat, globe.mat]) m.uniforms.exposure.value = 1 - 0.62 * dim;
      // smoke
      T.smoke.mat.uniforms.opacity.value = smooth(range01(t, 30, 33)) * (1 - smooth(range01(t, 41, 43)));
      T.smoke.mat.uniforms.wind.value.copy(windENU(45, 3));
      T.smoke.mat.uniforms.time.value = 300 + t;
      T.chim.group.visible = t > 29 && t < 44;
      T.chim.lightMat.color.setRGB(1, 0.18, 0.18).multiplyScalar(0.25 + 0.75 * (Math.sin(t * 4.2) > 0.2 ? 1 : 0));
      // windows (camera space)
      const wo = smooth(range01(t, 0.3, 1.6)) * (1 - smooth(range01(t, 6.2, 7.6)));
      w0.userData.setOpacity(wo);
      if (wo > 0) {
        const fly = easeIn(range01(t, 6.0, 7.6));
        const d = vertical ? 30 : 22;
        w0.position.set(vertical ? 0 : lerp(1.0, 0, smooth(t / 6)), vertical ? 1.4 : 1.05, -lerp(d + 2, d, smooth(t / 6)) + fly * (d - 5));
        w0.rotation.set(lerp(0.06, 0.02, smooth(t / 6)), lerp(-0.42, -0.10, smooth(t / 6.5)), 0);
      }
      const go = smooth(range01(t, 96.5, 98.5)) * (1 - smooth(range01(t, 110.5, 112)));
      gal.forEach((g, i) => {
        g.userData.setOpacity(go * smooth(range01(t, 96.5 + i * 0.5, 98.2 + i * 0.5)));
        if (go <= 0) return;
        const vf = camera.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * camera.aspect);
        if (!vertical) {
          const D = 54 / (2 * Math.tan(hf)) / 0.86;            // row of three 16 m windows fills ~86% of the width
          const drift = (t - 104) * 0.35;
          g.position.set((i - 1) * 18.5 + drift, Math.sin(t * 0.8 + i * 1.7) * 0.35 + 1.2, -D - Math.abs(i - 1) * 3);
          g.rotation.set(0, (i - 1) * -0.28, 0);
        } else {
          const D = 33 / (2 * Math.tan(vf)) / 0.62;            // column of three windows inside the safe area
          const drift = (t - 104) * 0.18;
          g.position.set(Math.sin(t * 0.5 + i) * 0.3, (1 - i) * 10.6 - 1.5 + drift, -D - Math.abs(i - 1) * 2);
          g.rotation.set((i - 1) * 0.12, Math.sin(t * 0.4 + i) * 0.08, 0);
        }
      });
      return { camH: cc.h, labels, lblA: lblA * U.ovlOn.value, split, grow, exag, dim };
    },
    draw(t, o, st) {
      const u = o.u, Wd = o.w, Ht = o.h, W_ = C.warn, M_ = C.muted, I_ = C.ink;
      o.vignette(0.38);
      if (st.labels && st.lblA > 0.01) for (const L of st.labels) { const p = project(ctx, T.frame, T.frame.toLocal(L.lon, L.lat, 5)); if (p.vis) o.pill(p.x, p.y, L.txt, st.lblA * 0.95, vertical ? 17 : 15); }
      // ---------- 0–7: opening title ----------
      const tw = win(t, 0.9, 6.0, 1.4, 0.8);
      o.title({ kicker: 'AERMOD · LAN TRUYỀN Ô NHIỄM', title: vertical ? ['Bản đồ ô nhiễm', 'không khí 3D'] : 'Bản đồ ô nhiễm không khí 3D', sub: 'Mô phỏng AERMOD · ngay trên trình duyệt web',
        x: Wd / 2, y: vertical ? Ht * 0.17 : Ht * 0.86, align: 'center', size: vertical ? 84 : 66, p: tw.p, q: tw.q });
      // ---------- 9–23: arc QN -> ĐT ----------
      const aw = win(t, 9.2, 22.5, 0.8, 0.8);
      if (aw.on) {
        const a = smooth(aw.p) * (1 - smooth(aw.q)), prog = smoother(range01(t, 9.5, 14.5));
        const g = o.g; g.save(); g.globalAlpha = a;
        const pts = arcPts.slice(0, Math.max(2, Math.round(prog * 80) + 1)).map(projW);
        g.lineCap = 'round'; g.lineJoin = 'round';
        for (const [lw, col, blur] of [[10 * u, 'rgba(73,205,182,0.25)', 18 * u], [3.2 * u, '#9ff0e2', 8 * u]]) {
          g.strokeStyle = col; g.lineWidth = lw; g.shadowColor = '#49cdb6'; g.shadowBlur = blur; g.beginPath();
          pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
        }
        const head = pts[pts.length - 1]; g.fillStyle = '#ffffff'; g.shadowBlur = 20 * u; g.beginPath(); g.arc(head.x, head.y, 6 * u, 0, Math.PI * 2); g.fill();
        g.restore();
        const pq = projW(ecef(QN.lon, QN.lat, 0)), pd = projW(ecef(DT.lon, DT.lat, 0));
        o.pin(pq.x, pq.y, 'Quảng Ninh', '10 ống khói nhiệt điện', { a: a * smooth(range01(t, 9.5, 10.5)), ox: vertical ? 50 : 70, oy: -80 });
        o.pin(pd.x, pd.y, 'Đồng Tháp', '36 nguồn thải công nghiệp', { a: a * smooth(range01(t, 14, 15)), ox: vertical ? 50 : 70, oy: vertical ? -90 : 70 });
        const mid = projW(arcPts[40]);
        if (prog > 0.5) o.pill(mid.x + (vertical ? -10 : -30) * u, mid.y, `≈ ${fmtVN(distKm, 0)} km`, a * smooth(range01(t, 12, 13)), 20);
      }
      const capW = vertical ? Wd - 100 * u : 640 * u, capX = vertical ? 50 * u : 70 * u;
      const capTop = vertical ? Ht * 0.115 : null, capBottom = vertical ? null : Ht - 64 * u;
      const cap = (args, w0, w1) => { const w = win(t, w0, w1, 0.7, 0.5); if (w.on) o.caption({ ...args, x: capX, w: capW, y: capTop, bottom: capBottom, p: w.p, q: w.q }); };
      cap({ kicker: 'Các trường hợp mô phỏng', title: 'Quảng Ninh → Đồng Tháp', body: ['Cẩm Phả – Mông Dương · nhiệt điện than', 'Đồng Tháp · 2 kịch bản vận tốc khí thải'] }, 9.6, 23);
      // ---------- 25–40: Đồng Tháp ----------
      const sw0 = win(t, 24.5, 40.5, 1.0, 0.8);
      if (sw0.on) { const a = smooth(sw0.p) * (1 - smooth(sw0.q)); const g = o.g; g.save(); for (const sp of stackPts) { const p = project(ctx, T.frame, sp); if (!p.vis) continue; g.globalAlpha = a; g.fillStyle = '#ef5a6f'; g.shadowColor = '#ef5a6f'; g.shadowBlur = 10 * u; g.beginPath(); g.arc(p.x, p.y, 4.5 * u, 0, Math.PI * 2); g.fill(); } g.restore(); }
      cap({ kicker: 'Đồng Tháp · 2021–2023', title: '36 nguồn thải công nghiệp', body: ['Lò hơi, lò nung · ống khói cao 10–25,5 m', [['Kịch bản 1: ', M_], ['vận tốc khí thải ≤ 25 m/s', I_]]] }, 25.2, 33.3);
      const pk = win(t, 34.2, 40.4, 0.7, 0.5);
      if (pk.on) { const p = project(ctx, T.frame, peakA); if (p.vis) o.pin(p.x, p.y, 'Đỉnh NO₂ · 972,6 µg/m³', 'cụm nguồn thải Sa Đéc · cực đại 1 giờ', { a: smooth(pk.p) * (1 - smooth(pk.q)), ox: vertical ? -40 : 80, oy: -110, color: C.bad }); }
      const lgW = vertical ? Wd - 100 * u : 470 * u, lgX = vertical ? 50 * u : Wd - lgW - 70 * u, lgY = vertical ? Ht * 0.735 : Ht - 64 * u - 112 * u;
      const l1 = win(t, 27, 58.8, 0.8, 0.5); if (l1.on) o.legend({ x: lgX, y: lgY, w: lgW, p: l1.p, q: l1.q });
      // ---------- 41–56: split comparison ----------
      if (st.split >= 0) {
        const sx = st.split * Wd, a = smooth(range01(t, 41.5, 43)) * (1 - smooth(range01(t, 55.5, 56.5)));
        const g = o.g; g.save(); g.globalAlpha = a; g.fillStyle = '#ffffff'; g.shadowColor = '#49cdb6'; g.shadowBlur = 16 * u; g.fillRect(sx - 1.5 * u, 0, 3 * u, Ht);
        g.beginPath(); g.arc(sx, Ht * 0.5, 22 * u, 0, Math.PI * 2); g.fillStyle = '#49cdb6'; g.fill(); g.shadowBlur = 0;
        g.fillStyle = '#052521'; g.beginPath(); g.moveTo(sx - 12 * u, Ht * 0.5); g.lineTo(sx - 4 * u, Ht * 0.5 - 7 * u); g.lineTo(sx - 4 * u, Ht * 0.5 + 7 * u); g.fill();
        g.beginPath(); g.moveTo(sx + 12 * u, Ht * 0.5); g.lineTo(sx + 4 * u, Ht * 0.5 - 7 * u); g.lineTo(sx + 4 * u, Ht * 0.5 + 7 * u); g.fill();
        g.restore();
        const ty = vertical ? Ht * 0.575 : 70 * u;
        const bw = vertical ? Wd * 0.44 : 440 * u;
        const box = (x, k, t1, v, align) => { o.panel(x, ty, bw, (vertical ? 150 : 132) * u, a, 14);
          o.text(k, x + 20 * u, ty + 34 * u, { weight: 600, size: 14, color: C.accent, spacing: 2, alpha: a });
          o.text(t1, x + 20 * u, ty + 70 * u, { weight: 600, size: vertical ? 26 : 28, fam: '"Saira Semi Condensed", sans-serif', alpha: a });
          o.text(v, x + 20 * u, ty + 108 * u, { weight: 600, size: 22, fam: '"IBM Plex Mono", monospace', color: C.warn, alpha: a }); };
        box(vertical ? 30 * u : 60 * u, 'KỊCH BẢN 1', 'Vận tốc ≤ 25 m/s', 'NO₂ 1h: 972,6 µg/m³');
        box(vertical ? Wd - bw - 30 * u : Wd - bw - 60 * u, 'KỊCH BẢN 2', 'Vận tốc gốc 61–274 m/s', 'NO₂ 1h: 200,6 µg/m³');
      }
      cap({ kicker: 'So sánh kịch bản', title: 'Vận tốc khí thải đổi kết quả', body: ['4 ống khói có vận tốc phi thực tế (61–274 m/s)', [['Giới hạn 25 m/s → đỉnh NO₂ cao gấp ', M_], ['≈ 4,8 lần', C.warn, 1]]] }, 44, 55.6);
      // ---------- 57–71: display options ----------
      const ow = win(t, 57, 71.2, 0.7, 0.5);
      if (ow.on) {
        const sx = vertical ? 50 * u : Wd - 560 * u, sy = vertical ? Ht * 0.665 : 92 * u;
        const sw = vertical ? (Wd - 100 * u) * 0.48 : 230 * u;
        o.seg({ label: 'Thang màu', items: ['% QCVN', 'µg/m³'], active: smooth(range01(t, 58.3, 59.6)), x: sx, y: sy, w: sw, p: ow.p, q: ow.q });
        o.seg({ label: 'Kiểu tô', items: ['Theo dải', 'Mờ dần'], active: smooth(range01(t, 64.5, 65.8)), x: vertical ? sx + (Wd - 100 * u) * 0.52 : sx + 250 * u, y: sy, w: vertical ? (Wd - 100 * u) * 0.48 : 290 * u, p: ow.p, q: ow.q });
      }
      cap({ kicker: 'Tùy chọn hiển thị', title: 'Thang màu & kiểu tô', body: ['% QCVN hoặc µg/m³ (thang log)', 'Tô theo dải hoặc mờ dần'] }, 57.4, 71);
      const l2 = win(t, 58.8, 72.2, 0.6, 0.6); if (l2.on) o.legend({ x: lgX, y: lgY, w: lgW, p: l2.p, q: l2.q, mode: 'abs', vmin: LA.vmin, vmax: LA.vmax, levels: [0.1, 1, 10, 100], title: 'NO₂ (µg/m³)' });
      // ---------- 72–96: columns, exaggeration, 2D ----------
      const l3 = win(t, 72.2, 95.5, 0.6, 0.6); if (l3.on) o.legend({ x: lgX, y: lgY, w: lgW, p: l3.p, q: l3.q });
      cap({ kicker: 'Chế độ cột 3D', title: 'NO₂ · Cột theo nồng độ', body: [[['Phóng đại chiều cao  ', M_], [`×${fmtVN(st.exag || 1, 1)}`, C.warn, 1]], 'Màu theo % QCVN · cực đại 1 giờ'] }, 73, 88.6);
      const ew = win(t, 79.5, 88.4, 0.6, 0.5);
      if (ew.on) {
        const a = smooth(ew.p) * (1 - smooth(ew.q)), x = vertical ? 50 * u : Wd - 560 * u, y = vertical ? Ht * 0.665 : 92 * u, w = vertical ? Wd - 100 * u : 490 * u;
        o.panel(x, y, w, 70 * u, a, 12);
        o.text('PHÓNG ĐẠI CỘT 3D', x + 20 * u, y + 28 * u, { weight: 600, size: 13, color: C.faint, spacing: 1.6, alpha: a });
        o.text(`×${fmtVN(st.exag || 1, 1)}`, x + w - 20 * u, y + 28 * u, { weight: 600, size: 16, fam: '"IBM Plex Mono", monospace', color: C.accent, align: 'right', alpha: a });
        const g = o.g, sx0 = x + 20 * u, sw0 = w - 40 * u, f = ((st.exag || 1) - 1) / 7;
        g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(140,170,195,0.3)'; g.fillRect(sx0, y + 46 * u, sw0, 4 * u); g.fillStyle = C.accent; g.fillRect(sx0, y + 46 * u, sw0 * f, 4 * u);
        g.beginPath(); g.arc(sx0 + sw0 * f, y + 48 * u, 9 * u, 0, Math.PI * 2); g.fill(); g.restore();
      }
      const mw = win(t, 89.5, 96.2, 0.6, 0.5);
      if (mw.on) o.seg({ label: 'Chế độ hiển thị', items: ['3D địa hình', '2D bản đồ'], active: smooth(range01(t, 90.8, 91.8)), x: vertical ? 50 * u : Wd - 560 * u, y: vertical ? Ht * 0.665 : 92 * u, w: vertical ? Wd - 100 * u : 490 * u, p: mw.p, q: mw.q });
      cap({ kicker: 'Chế độ 2D', title: 'Bản đồ 2D', body: ['Chuyển qua lại 3D ↔ 2D', 'NO₂ · cực đại 1 giờ · % QCVN'] }, 89.8, 95.8);
      // ---------- 96–112: app gallery ----------
      const gw = win(t, 97.5, 110.8, 0.8, 0.6);
      if (gw.on) o.caption({ kicker: 'Ứng dụng web', title: 'Chạy ngay trên trình duyệt', body: ['Bản đồ 3D tương tác · CesiumJS', 'Chọn trường hợp, chất, chỉ tiêu · phát lại theo giờ'], x: capX, w: capW, y: vertical ? Ht * 0.115 : null, bottom: vertical ? null : Ht - 64 * u, p: gw.p, q: gw.q });
      // ---------- 112–120: end ----------
      const ec = win(t, 112.2, 125, 1.6, 1);
      if (ec.on) o.endCard({ p: ec.p, q: 0, kicker: 'AERMOD · LAN TRUYỀN Ô NHIỄM', title: 'AERMOD 3D', sub: vertical ? ['Mô phỏng lan truyền ô nhiễm', 'Quảng Ninh · Đồng Tháp'] : ['Mô phỏng lan truyền ô nhiễm không khí · Quảng Ninh · Đồng Tháp'], credits: [] });
      o.fade(1 - smooth(range01(t, 0, 1.0)));
      o.fade(smooth(range01(t, 118.6, 120)));
    },
  };
}
