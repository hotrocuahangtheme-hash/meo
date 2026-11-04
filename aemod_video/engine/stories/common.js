// common.js — shared world building for the stories (Quảng Ninh and Đồng Tháp scenes on one globe).
import * as geo from '../geo.js';
import * as THREE from 'three';
import { EnuFrame, ecef, enuBasis } from '../geo.js';
import * as W from '../world.js';
import * as D from '../data.js';

export async function loadJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); }

export async function imageryLayer(base, name) {
  const [tex, ext] = await Promise.all([W.loadTexture(`${base}/img/${name}.jpg`), loadJSON(`${base}/img/${name}.json`)]);
  return { tex, rect: ext };
}

// Quảng Ninh scene: context patch (flat, z12) + DEM patch (z14/z16/z17 imagery) + chimneys/smoke.
export async function buildCampha(ctx, meta, opts = {}) {
  const { ASSETS, scene } = ctx;
  const c = meta.cases[0];
  const frame = new EnuFrame(107.35, 21.05);
  scene.add(frame.group);
  const [vn, l0, l1, l2, l3a, l3b] = await Promise.all(['vn', 'cp_l0', 'cp_l1', 'cp_l2', 'cp_l3a', 'cp_l3b'].map(n => imageryLayer(ASSETS, n)));
  const P = (L, parent) => ({ ...L, parent });
  // DEM
  const dem = c.dem;
  const arr = new Int16Array(await (await fetch(`${ASSETS}/data/${dem.file}`)).arrayBuffer());
  const demE = { west: dem.west, north: dem.north, east: dem.west + dem.dx * dem.w, south: dem.north - dem.dx * dem.h };
  const hAt = (lon, lat) => {
    if (lon < demE.west || lon > demE.east || lat < demE.south || lat > demE.north) return 0;
    let fx = (lon - dem.west) / dem.dx - 0.5, fy = (dem.north - lat) / dem.dx - 0.5;
    fx = Math.min(dem.w - 1, Math.max(0, fx)); fy = Math.min(dem.h - 1, Math.max(0, fy));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(dem.w - 1, x0 + 1), y1 = Math.min(dem.h - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    const v = (arr[y0 * dem.w + x0] * (1 - tx) + arr[y0 * dem.w + x1] * tx) * (1 - ty) + (arr[y1 * dem.w + x0] * (1 - tx) + arr[y1 * dem.w + x1] * tx) * ty;
    return Math.max(-2, v);
  };
  const ctxPatch = W.makePatch(frame, l0.rect, 200, 160, null, [P(vn, -1), P(l0, 0)], { lift: 0.5 });
  ctxPatch.mat.uniforms.hole0.value = W.relRect(frame, { west: demE.west + 0.002, east: demE.east - 0.002, south: demE.south + 0.002, north: demE.north - 0.002 });
  ctxPatch.mat.uniforms.holeCount.value = 1;
  const terr = W.makePatch(frame, demE, opts.demRes || 600, opts.demRes || 600, hAt, [P(vn, -1), P(l0, 0), P(l1, 1), P(l2, 2), P(l3a, 3), P(l3b, 3)], { exag: opts.exag || 1 });
  const stacks = c.stacks.map(s => ({ ...s, z: hAt(s.lon, s.lat) }));
  const chim = W.makeChimneys(frame, stacks, { radiusScale: 3.6 });
  const smoke = W.makeSmoke(frame, chim.tops, { perStack: opts.smokePer || 120, life: 420, rise: 120, size0: 10, size1: 150 });
  return { c, frame, hAt, demE, terr, ctxPatch, chim, smoke, stacks, layers: { vn, l0, l1, l2, l3a, l3b } };
}

export async function buildDongthap(ctx, meta, opts = {}) {
  const { ASSETS, scene } = ctx;
  const c = meta.cases[1];
  const frame = new EnuFrame(105.64, 10.49);
  scene.add(frame.group);
  const names = ['vn', 'dt_l0', 'dt_l1', 'dt_l2a', 'dt_l2b', 'dt_l2c', 'dt_l2d', 'dt_l2e'];
  const L = await Promise.all(names.map(n => imageryLayer(ASSETS, n)));
  const P = (X, parent) => ({ ...X, parent });
  const g = c.grid;
  const ext = { west: g.west, north: g.north, east: g.west + g.dx * g.w, south: g.north - g.dx * g.h };
  const ctxPatch = W.makePatch(frame, L[1].rect, 220, 210, null, [P(L[0], -1), P(L[1], 0)], { lift: 0.5 });
  ctxPatch.mat.uniforms.hole0.value = W.relRect(frame, { west: ext.west + 0.002, east: ext.east - 0.002, south: ext.south + 0.002, north: ext.north - 0.002 });
  ctxPatch.mat.uniforms.holeCount.value = 1;
  const terr = W.makePatch(frame, ext, 300, 300, null, [P(L[0], -1), P(L[1], 0), P(L[2], 1), P(L[3], 2), P(L[4], 2), P(L[5], 2), P(L[6], 2), P(L[7], 2)]);
  const stacks = c.stacks.map(s => ({ ...s, z: 0 }));
  const chim = W.makeChimneys(frame, stacks, { radiusScale: 3.0 });
  const smoke = W.makeSmoke(frame, chim.tops, { perStack: opts.smokePer || 26, life: 60, rise: 50, size0: 8, size1: 90 });
  return { c, frame, ext, terr, ctxPatch, chim, smoke, stacks, layers: L, hAt: () => 0 };
}

// Build an overlay texture for case c, pollutant/metric, with the app's options.
export async function overlayFor(ctx, c, pol, met, opts = {}) {
  const layer = c.layers[`${pol}_${met}`];
  const raw = await D.fetchU16(`${ctx.ASSETS}/data/${layer.file}`);
  const vals = D.decode(raw, layer.vmin, layer.vmax);
  const limit = (c.qcvn[pol] || {})[D.AVG(met)];
  const o = D.buildOverlay(c.grid, vals, layer, { scale: opts.scale || 'qcvn', fill: opts.fill || 'band', contour: opts.contour !== false, limit, up: opts.up || 4 });
  const tex = new THREE.CanvasTexture(o.canvas);
  tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 8;
  const g = c.grid;
  return { tex, rect: { west: g.west, north: g.north, east: g.west + g.dx * g.w, south: g.north - g.dx * g.h }, labels: o.labels, layer, vals, limit, pol, met };
}

export function setOverlay(patch, frame, which, ov) {
  const u = patch.mat.uniforms;
  u['ovl' + which].value = ov.tex; u['ovlRect' + which].value = W.relRect(frame, ov.rect);
}

// project a local ENU point to screen pixels
export function project(ctx, frame, v, out = {}) {
  const p = v.clone().applyMatrix4(frame.group.matrixWorld);
  const cam = ctx.camera; const q = p.clone().project(cam);
  const behind = p.clone().sub(cam.position).dot(cam.getWorldDirection(new THREE.Vector3())) < 0;
  out.x = (q.x * 0.5 + 0.5) * ctx.OW; out.y = (-q.y * 0.5 + 0.5) * ctx.OH; out.vis = !behind && q.z < 1 && Math.abs(q.x) < 1.2 && Math.abs(q.y) < 1.2;
  return out;
}

// sun direction in ENU (azimuth deg from north clockwise, elevation deg)
export function sunENU(az, el) { const a = az * Math.PI / 180, e = el * Math.PI / 180; return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), Math.sin(e)); }

// ---------------------------------------------------------------- globe + lights + atmosphere helpers
export async function buildGlobe(ctx, holes) {
  const [world, asia, vn, cp0, dt0] = await Promise.all(['world', 'asia', 'vn', 'cp_l0', 'dt_l0'].map(n => imageryLayer(ctx.ASSETS, n)));
  const g = W.makeGlobe([{ ...world, parent: -1 }, { ...asia, parent: 0 }, { ...vn, parent: 1 }, { ...cp0, parent: 2 }, { ...dt0, parent: 2 }], holes);
  g.mat.uniforms.fogDensity.value = 0;
  ctx.scene.add(g.mesh);
  return g;
}

export function addLights(ctx, frame, sun) {
  const amb = new THREE.HemisphereLight(0xe6eef6, 0x39402f, 2.4); ctx.scene.add(amb);
  const dl = new THREE.DirectionalLight(0xfff6ea, 3.0);
  const dirW = new THREE.Vector3().addScaledVector(frame.e, sun.x).addScaledVector(frame.n, sun.y).addScaledVector(frame.u, sun.z);
  dl.position.copy(frame.origin.clone().addScaledVector(dirW, 1e5)); dl.target.position.copy(frame.origin);
  ctx.scene.add(dl, dl.target);
  amb.position.copy(frame.u.clone().multiplyScalar(1e7));
  return { amb, dl };
}

// altitude-aware aerial perspective for a list of terrain materials
export function atmos(mats, camH, vertical) {
  const dens = 1 / (90000 + 22 * camH);
  for (const m of mats) m.uniforms.fogDensity.value = dens;
}

// Orbit-style camera path: keys {t, lon, lat, th, hd, p, r, fov?}; Hermite in time, log range.
export function orbitPath(keys) {
  const conv = keys.map(k => ({ t: k.t, lon: k.lon, lat: k.lat, h: Math.max(1, k.r), hd: k.hd, p: k.p, fov: k.fov, roll: k.th || 0, hold: k.hold }));
  const f = geo.cameraPath(conv);
  return t => { const o = f(t); return { lon: o.lon, lat: o.lat, th: o.roll || 0, hd: o.hd, p: o.p, r: o.h, fov: o.fov }; };
}

export function applyOrbit(ctx, o, rScale = 1) {
  const c = geo.orbit(o.lon, o.lat, o.th || 0, o.hd, o.p, o.r * rScale);
  geo.setCamera(ctx.camera, c.lon, c.lat, c.h, o.hd, o.p);
  return c;
}

export const windENU = (wd, ws) => { const a = (wd + 180) * Math.PI / 180; return new THREE.Vector2(Math.sin(a) * ws, Math.cos(a) * ws); };

// window helper for timed elements: returns {p, q, on}
export function win(t, t0, t1, fin = 0.6, fout = 0.5) {
  if (t < t0 || t > t1 + fout) return { p: 0, q: 1, on: false };
  return { p: Math.min(1, (t - t0) / fin), q: Math.max(0, (t - t1) / fout), on: true };
}
