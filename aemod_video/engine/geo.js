// geo.js — WGS84 / ECEF / ENU helpers and a Cesium-style camera (lon, lat, height, heading, pitch, roll).
import * as THREE from 'three';

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const WGS_A = 6378137.0, WGS_E2 = 6.69437999014e-3, WGS_B = WGS_A * Math.sqrt(1 - WGS_E2);

export function ecef(lon, lat, h = 0) {
  const lo = lon * D2R, la = lat * D2R, s = Math.sin(la), c = Math.cos(la);
  const N = WGS_A / Math.sqrt(1 - WGS_E2 * s * s);
  return new THREE.Vector3((N + h) * c * Math.cos(lo), (N + h) * c * Math.sin(lo), (N * (1 - WGS_E2) + h) * s);
}

// ENU basis vectors at lon/lat (geodetic).
export function enuBasis(lon, lat) {
  const lo = lon * D2R, la = lat * D2R;
  const e = new THREE.Vector3(-Math.sin(lo), Math.cos(lo), 0);
  const n = new THREE.Vector3(-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la));
  const u = new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la));
  return { e, n, u };
}

// A local frame (Object3D) whose children use ENU metres (x=east, y=north, z=up) around (lon0, lat0, 0).
export class EnuFrame {
  constructor(lon0, lat0) {
    this.lon0 = lon0; this.lat0 = lat0;
    this.origin = ecef(lon0, lat0, 0);
    const { e, n, u } = enuBasis(lon0, lat0);
    this.e = e; this.n = n; this.u = u;
    this.group = new THREE.Group();
    const m = new THREE.Matrix4().makeBasis(e, n, u); m.setPosition(this.origin);
    this.group.matrixAutoUpdate = false; this.group.matrix.copy(m); this.group.matrixWorldNeedsUpdate = true;
  }
  // geodetic -> local ENU metres (exact, includes Earth curvature)
  toLocal(lon, lat, h = 0, out = new THREE.Vector3()) {
    const p = ecef(lon, lat, h).sub(this.origin);
    return out.set(p.dot(this.e), p.dot(this.n), p.dot(this.u));
  }
}

// Place a camera like Cesium's setView: heading from north clockwise, pitch (negative = looking down), roll.
export function setCamera(cam, lon, lat, h, headingDeg, pitchDeg, rollDeg = 0) {
  const pos = ecef(lon, lat, h);
  const { e, n, u } = enuBasis(lon, lat);
  const hd = headingDeg * D2R, pt = pitchDeg * D2R, rl = rollDeg * D2R;
  const fwdH = e.clone().multiplyScalar(Math.sin(hd)).add(n.clone().multiplyScalar(Math.cos(hd)));
  const dir = fwdH.clone().multiplyScalar(Math.cos(pt)).add(u.clone().multiplyScalar(Math.sin(pt))).normalize();
  let up = fwdH.clone().multiplyScalar(-Math.sin(pt)).add(u.clone().multiplyScalar(Math.cos(pt))).normalize();
  if (rl) up.applyAxisAngle(dir, -rl);
  cam.position.copy(pos);
  cam.up.copy(up);
  cam.lookAt(pos.clone().add(dir));
  cam.updateMatrixWorld(true);
  return { pos, dir, up };
}

// Destination for looking at a target point from a given range (like Cesium lookAt with HeadingPitchRange).
export function orbit(targetLon, targetLat, targetH, headingDeg, pitchDeg, range) {
  // camera offset in target's ENU: opposite of view direction
  const hd = headingDeg * D2R, pt = pitchDeg * D2R;
  const dE = Math.sin(hd) * Math.cos(pt), dN = Math.cos(hd) * Math.cos(pt), dU = Math.sin(pt);
  const t = ecef(targetLon, targetLat, targetH);
  const { e, n, u } = enuBasis(targetLon, targetLat);
  const camPos = t.clone().sub(e.clone().multiplyScalar(dE * range)).sub(n.clone().multiplyScalar(dN * range)).sub(u.clone().multiplyScalar(dU * range));
  return ecefToLlh(camPos);
}

export function ecefToLlh(p) {
  // Bowring's method
  const x = p.x, y = p.y, z = p.z;
  const lon = Math.atan2(y, x);
  const pr = Math.hypot(x, y);
  const ep2 = (WGS_A * WGS_A - WGS_B * WGS_B) / (WGS_B * WGS_B);
  const th = Math.atan2(z * WGS_A, pr * WGS_B);
  const lat = Math.atan2(z + ep2 * WGS_B * Math.sin(th) ** 3, pr - WGS_E2 * WGS_A * Math.cos(th) ** 3);
  const s = Math.sin(lat), N = WGS_A / Math.sqrt(1 - WGS_E2 * s * s);
  const h = pr / Math.cos(lat) - N;
  return { lon: lon * R2D, lat: lat * R2D, h };
}

// ---- easing & interpolation ----
export const clamp01 = t => t < 0 ? 0 : t > 1 ? 1 : t;
export const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smoother = t => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = t => Math.pow(clamp01(t), 3);
export const lerp = (a, b, t) => a + (b - a) * t;
export const range01 = (t, a, b) => clamp01((t - a) / (b - a));

// Smooth camera path through keys [{t, lon, lat, h, hd, p, roll?, fov?}] — monotone cubic in time with
// Catmull-Rom tangents; altitude is interpolated in log space; 'hold' keys get zero velocity.
export function cameraPath(keys) {
  const K = keys.map(k => ({ ...k, lh: Math.log(Math.max(1, k.h)), roll: k.roll || 0 }));
  // unwrap heading
  for (let i = 1; i < K.length; i++) { while (K[i].hd - K[i - 1].hd > 180) K[i].hd -= 360; while (K[i].hd - K[i - 1].hd < -180) K[i].hd += 360; }
  const fields = ['lon', 'lat', 'lh', 'hd', 'p', 'roll', 'fov'];
  const tang = (i, f) => {
    if (K[i].hold || i === 0 || i === K.length - 1) return 0;
    const a = K[i - 1], b = K[i + 1];
    if (a[f] === undefined || b[f] === undefined) return 0;
    return (b[f] - a[f]) / (b.t - a.t);
  };
  return t => {
    if (t <= K[0].t) return fromKey(K[0]);
    if (t >= K[K.length - 1].t) return fromKey(K[K.length - 1]);
    let i = 0; while (i < K.length - 2 && t > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], dt = b.t - a.t, s = (t - a.t) / dt;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    const o = {};
    for (const f of fields) {
      if (a[f] === undefined) continue;
      const bf = b[f] === undefined ? a[f] : b[f];
      o[f] = h00 * a[f] + h10 * dt * tang(i, f) + h01 * bf + h11 * dt * tang(i + 1, f);
    }
    o.h = Math.exp(o.lh);
    return o;
  };
  function fromKey(k) { return { lon: k.lon, lat: k.lat, h: k.h, hd: k.hd, p: k.p, roll: k.roll, fov: k.fov }; }
}
