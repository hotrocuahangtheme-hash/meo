// world.js — scene objects: globe, terrain patches with multi-level imagery + concentration overlay,
// sky/atmosphere, chimneys, smoke plumes and 3D concentration columns.
import * as THREE from 'three';
import { ecef, enuBasis, WGS_A } from './geo.js';

const LOGDEPTH_V = `#include <common>\n#include <logdepthbuf_pars_vertex>\n`;
const LOGDEPTH_F = `#include <common>\n#include <logdepthbuf_pars_fragment>\n`;

export async function loadTexture(url, { mip = true, aniso = 8 } = {}) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = aniso; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ sky / atmosphere (fullscreen)
export function makeSky() {
  const mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
      camPos: { value: new THREE.Vector3() }, camUp: { value: new THREE.Vector3(0, 0, 1) }, camH: { value: 1000 },
      sunDir: { value: new THREE.Vector3(1, 0, 0) }, horizon: { value: new THREE.Color(0xc9d6df) }, zenith: { value: new THREE.Color(0x3d6e9e) },
    },
    vertexShader: `varying vec2 vNdc; void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform mat4 invProj; uniform mat4 camWorld; uniform vec3 camPos; uniform vec3 camUp; uniform float camH;
      uniform vec3 sunDir; uniform vec3 horizon; uniform vec3 zenith; varying vec2 vNdc;
      void main(){
        vec4 v = invProj * vec4(vNdc, -1.0, 1.0); v /= v.w;
        vec3 dir = normalize((camWorld * vec4(v.xyz, 0.0)).xyz);
        float el = dot(dir, normalize(camUp));
        // low-altitude sky gradient
        vec3 sky = mix(horizon, zenith, pow(clamp(el, 0.0, 1.0), 0.55));
        sky = mix(sky, horizon * 0.92, smoothstep(0.02, -0.15, el));
        float sunAmt = pow(max(dot(dir, sunDir), 0.0), 64.0);
        sky += vec3(1.0, 0.92, 0.75) * sunAmt * 0.35;
        // space + atmospheric rim at high altitude
        float R = 6371000.0;
        vec3 o = camPos; float b = dot(o, dir); float c = dot(o, o) - R * R;
        float d = sqrt(max(dot(o, o) - b * b, 0.0));          // closest distance of ray to Earth centre
        float rim = (b < 0.0) ? exp(-max(d - R, 0.0) / 55000.0) : 0.0;
        vec3 sd = floor(dir * 900.0); float hs = fract(sin(dot(sd, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float star = step(0.9993, hs) * (0.5 + 0.5 * fract(hs * 97.0));
        vec3 space = vec3(0.012, 0.016, 0.03) + vec3(0.35, 0.6, 1.0) * rim * 0.9 + vec3(star);
        float a = smoothstep(25000.0, 450000.0, camH);
        gl_FragColor = vec4(mix(sky, space, a), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1000;
  const scene = new THREE.Scene(); scene.add(mesh);
  const cam = new THREE.Camera();
  return {
    scene, cam, mat,
    update(camera, camH) {
      mat.uniforms.invProj.value.copy(camera.projectionMatrixInverse);
      mat.uniforms.camWorld.value.copy(camera.matrixWorld);
      mat.uniforms.camPos.value.copy(camera.position);
      mat.uniforms.camUp.value.copy(camera.position).normalize();
      mat.uniforms.camH.value = camH;
    },
  };
}

// ------------------------------------------------------------------ shared terrain shader
const TERRAIN_VS = LOGDEPTH_V + `
  attribute vec2 ll;           // lon/lat relative to frame origin (deg)
  varying vec2 vLL; varying vec3 vNormal; varying vec3 vView; varying float vH;
  uniform float curvH;
  void main(){
    vLL = ll; vNormal = normalize(normal); vH = position.z;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
    #include <logdepthbuf_vertex>
  }`;


// Fragment shader generated per patch: layers[i] = {parent}; a child layer is shown only where its parent
// is magnified (fewer than ~1 texel per screen pixel), so every distance uses the coarsest sharp-enough level.
function terrainFS(parents) {
  const N = parents.length;
  let decl = '', body = '';
  for (let i = 0; i < 8; i++) decl += `uniform sampler2D img${i}; uniform vec4 rect${i}; uniform vec2 size${i};\n`;
  for (let i = 0; i < N; i++) body += `vec2 uv${i} = ruv(rect${i}); float tp${i} = max(abs(dFdx(uv${i}.x * size${i}.x)) + abs(dFdy(uv${i}.x * size${i}.x)), abs(dFdx(uv${i}.y * size${i}.y)) + abs(dFdy(uv${i}.y * size${i}.y)));\n`;
  for (let i = 0; i < N; i++) {
    const par = parents[i];
    const need = par < 0 ? '1.0' : `(1.0 - smoothstep(0.9, 1.7, tp${par}))`;
    const feather = par < 0 ? '0.002' : '0.06';
    body += `{ float w = inside(uv${i}, ${feather}) * ${need}; if (w > 0.0) c = mix(c, texture2D(img${i}, uv${i}).rgb, w); }\n`;
  }
  return LOGDEPTH_F + decl + `
  uniform sampler2D ovlA, ovlB; uniform vec4 ovlRectA, ovlRectB; uniform float ovlMix, ovlAlpha, ovlSplit, ovlOn;
  uniform vec4 reveal; uniform vec4 hole0, hole1; uniform int holeCount;
  uniform vec3 sunDir; uniform float shade; uniform vec3 fogColor; uniform float fogDensity; uniform float exposure; uniform float sat;
  uniform vec2 resolution; uniform float latScale;
  varying vec2 vLL; varying vec3 vNormal; varying vec3 vView; varying float vH;
  vec2 ruv(vec4 r){ return vec2((vLL.x - r.x) / (r.z - r.x), (vLL.y - r.y) / (r.w - r.y)); }
  float inside(vec2 uv, float f){ vec2 a = smoothstep(vec2(0.0), vec2(f), uv) * smoothstep(vec2(0.0), vec2(f), 1.0 - uv); return a.x * a.y; }
  bool inHole(vec4 r){ return vLL.x > r.x && vLL.x < r.z && vLL.y > r.y && vLL.y < r.w; }
  vec4 ovl(sampler2D t, vec4 r){ vec2 uv = ruv(r); if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0); return texture2D(t, uv); }
  void main(){
    #include <logdepthbuf_fragment>
    if (holeCount > 0 && inHole(hole0)) discard;
    if (holeCount > 1 && inHole(hole1)) discard;
    vec3 c = vec3(0.09, 0.14, 0.11);
    ` + body + `
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, sat) * exposure;
    c = pow(max(c, 0.0), vec3(1.08)) * 1.06;
    float lam = clamp(dot(normalize(vNormal), normalize(sunDir)), 0.0, 1.0);
    c *= mix(1.0, 0.55 + 0.75 * lam, shade);
    if (ovlOn > 0.5) {
      vec4 a = ovl(ovlA, ovlRectA), b = ovl(ovlB, ovlRectB);
      vec4 o = mix(a, b, ovlMix);
      if (ovlSplit >= 0.0) o = (gl_FragCoord.x / resolution.x < ovlSplit) ? a : b;
      float rv = 1.0;
      if (reveal.z < 1e5) { vec2 d = (vLL - reveal.xy) * vec2(latScale, 1.0); rv = 1.0 - smoothstep(reveal.z - reveal.w, reveal.z, length(d)); }
      vec3 oc = pow(o.rgb, vec3(2.2));
      c = mix(c, oc, clamp(o.a * ovlAlpha * rv, 0.0, 1.0));
    }
    float dist = length(vView);
    float fog = 1.0 - exp(-dist * fogDensity);
    c = mix(c, fogColor, clamp(fog, 0.0, 0.45));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }`;
}

function terrainMaterial(parents = [-1]) {
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); blank.needsUpdate = true;
  const u = {
    imgCount: { value: 0 },
    ovlA: { value: blank }, ovlB: { value: blank }, ovlRectA: { value: new THREE.Vector4(0, 0, 1, 1) }, ovlRectB: { value: new THREE.Vector4(0, 0, 1, 1) },
    ovlMix: { value: 0 }, ovlAlpha: { value: 0.8 }, ovlSplit: { value: -1 }, ovlOn: { value: 0 },
    reveal: { value: new THREE.Vector4(0, 0, 1e9, 0.01) },
    hole0: { value: new THREE.Vector4() }, hole1: { value: new THREE.Vector4() }, holeCount: { value: 0 },
    sunDir: { value: new THREE.Vector3(0.4, -0.3, 0.85).normalize() }, shade: { value: 0.35 },
    fogColor: { value: new THREE.Color(0xc9d6df).convertSRGBToLinear() }, fogDensity: { value: 1 / 90000 },
    exposure: { value: 1.0 }, sat: { value: 1.3 }, resolution: { value: new THREE.Vector2(1920, 1080) }, latScale: { value: 1 },
    curvH: { value: 0 },
  };
  for (let i = 0; i < 8; i++) { u['img' + i] = { value: blank }; u['rect' + i] = { value: new THREE.Vector4() }; u['size' + i] = { value: new THREE.Vector2(1, 1) }; }
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: TERRAIN_VS, fragmentShader: terrainFS(parents), extensions: { derivatives: true } });
}

// A terrain patch in an ENU frame. heightFn(lon,lat) -> metres.
export function makePatch(frame, ext, nx, ny, heightFn, layers, opts = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(nx * ny * 3), ll = new Float32Array(nx * ny * 2);
  const v = new THREE.Vector3();
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const lon = ext.west + (ext.east - ext.west) * i / (nx - 1);
    const lat = ext.north - (ext.north - ext.south) * j / (ny - 1);
    const h = heightFn ? heightFn(lon, lat) : 0;
    frame.toLocal(lon, lat, h * (opts.exag || 1), v);
    const k = j * nx + i;
    pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z + (opts.lift || 0);
    ll[k * 2] = lon - frame.lon0; ll[k * 2 + 1] = lat - frame.lat0;
  }
  const idx = new Uint32Array((nx - 1) * (ny - 1) * 6); let p = 0;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('ll', new THREE.BufferAttribute(ll, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const mat = terrainMaterial(layers.map(L => L.parent === undefined ? -1 : L.parent));
  setLayers(mat, frame, layers);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  frame.group.add(mesh);
  mat.uniforms.latScale.value = Math.cos(frame.lat0 * Math.PI / 180);
  return { mesh, mat };
}

export function relRect(frame, r) { return new THREE.Vector4(r.west - frame.lon0, r.south - frame.lat0, r.east - frame.lon0, r.north - frame.lat0); }

export function setLayers(mat, frame, layers) {
  layers.forEach((L, i) => { mat.uniforms['img' + i].value = L.tex; mat.uniforms['rect' + i].value = relRect(frame, L.rect); mat.uniforms['size' + i].value.set(L.tex.image.width, L.tex.image.height); });
  mat.uniforms.imgCount.value = layers.length;
}

// ------------------------------------------------------------------ globe (ellipsoid) in ECEF
export function makeGlobe(layers, holes = []) {
  const nLon = 361, nLat = 177;
  const pos = new Float32Array(nLon * nLat * 3), ll = new Float32Array(nLon * nLat * 2), nor = new Float32Array(nLon * nLat * 3);
  for (let j = 0; j < nLat; j++) for (let i = 0; i < nLon; i++) {
    const lon = -180 + i, lat = 88 - j;
    const p = ecef(lon, lat, 0), k = j * nLon + i;
    pos.set([p.x, p.y, p.z], k * 3); ll.set([lon, lat], k * 2);
    const u = enuBasis(lon, lat).u; nor.set([u.x, u.y, u.z], k * 3);
  }
  const idx = []; for (let j = 0; j < nLat - 1; j++) for (let i = 0; i < nLon - 1; i++) { const a = j * nLon + i, b = a + 1, c = a + nLon, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('ll', new THREE.BufferAttribute(ll, 2)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(idx);
  const mat = terrainMaterial(layers.map(L => L.parent === undefined ? -1 : L.parent));
  const fakeFrame = { lon0: 0, lat0: 0 };
  setLayers(mat, fakeFrame, layers);
  holes.slice(0, 2).forEach((h, i) => { mat.uniforms['hole' + i].value = relRect(fakeFrame, h); });
  mat.uniforms.holeCount.value = Math.min(2, holes.length);
  mat.uniforms.shade.value = 0.35;
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  return { mesh, mat };
}

// ------------------------------------------------------------------ chimneys
function bandTexture() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d7dadd'; g.fillRect(0, 0, 8, 256);
  for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#f2f2f2' : '#c8473f'; g.fillRect(0, k * 13, 8, 13); }
  g.fillStyle = '#3a3f44'; g.fillRect(0, 0, 8, 3);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function makeChimneys(frame, stacks, opts = {}) {
  const group = new THREE.Group(); frame.group.add(group);
  const tex = bandTexture();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.0, emissive: 0x30353a });
  const tops = [];
  const scaleR = opts.radiusScale || 1;
  for (const s of stacks) {
    const h = s.h || 30, r = Math.max(1.5, (s.d || 2) / 2) * scaleR;
    const g = new THREE.CylinderGeometry(r * 1.0, r * 1.45, h, 24, 1, false);
    g.rotateX(Math.PI / 2); // y-up -> z-up
    // remap uv so the band texture runs top->bottom
    const base = frame.toLocal(s.lon, s.lat, s.z || 0);
    const m = new THREE.Mesh(g, mat);
    m.position.set(base.x, base.y, base.z + h / 2);
    group.add(m);
    tops.push(new THREE.Vector3(base.x, base.y, base.z + h));
  }
  // aviation lights
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
  const lights = tops.map(p => { const l = new THREE.Mesh(new THREE.SphereGeometry(2.2 * scaleR, 10, 8), lightMat); l.position.copy(p).add(new THREE.Vector3(0, 0, 1.5)); group.add(l); return l; });
  return { group, tops, lights, lightMat };
}

// ------------------------------------------------------------------ smoke plumes (instanced billboards)
export function makeSmoke(frame, tops, opts = {}) {
  const perStack = opts.perStack || 90;
  const n = tops.length * perStack;
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index; geo.setAttribute('position', quad.getAttribute('position')); geo.setAttribute('uv', quad.getAttribute('uv'));
  const seed = new Float32Array(n), top = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const s = Math.floor(i / perStack); seed[i] = (i % perStack) / perStack + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.0; top.set([tops[s].x, tops[s].y, tops[s].z], i * 3); }
  geo.setAttribute('seed', new THREE.InstancedBufferAttribute(seed, 1));
  geo.setAttribute('top', new THREE.InstancedBufferAttribute(top, 3));
  geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: { value: 0 }, wind: { value: new THREE.Vector2(3, 0) }, life: { value: opts.life || 70 }, rise: { value: opts.rise || 110 },
      size0: { value: opts.size0 || 10 }, size1: { value: opts.size1 || 160 }, opacity: { value: 0 }, sunDir: { value: new THREE.Vector3(0.4, -0.3, 0.85) },
      tint: { value: new THREE.Color(0xe9edf0) } },
    vertexShader: LOGDEPTH_V + `
      attribute float seed; attribute vec3 top; uniform float time, life, rise, size0, size1; uniform vec2 wind;
      varying vec2 vUv; varying float vA; varying float vSeed;
      float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
      void main(){
        float age = mod(time + seed * life, life);
        float k = age / life;
        float s = seed * 91.7;
        vec2 jitter = vec2(h1(s) - 0.5, h1(s + 3.1) - 0.5);
        float spread = 3.0 + 85.0 * pow(k, 0.8);
        vec3 p = top + vec3(wind * age, rise * (1.0 - exp(-age / 22.0)) + 25.0 * k);
        p.xy += jitter * spread * 2.0;
        p.z += (h1(s + 7.7) - 0.5) * spread;
        float size = mix(size0, size1, pow(k, 0.65)) * (0.7 + 0.6 * h1(s + 1.3));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float rot = h1(s + 9.1) * 6.2831 + age * 0.05;
        vec2 c = position.xy; c = vec2(c.x * cos(rot) - c.y * sin(rot), c.x * sin(rot) + c.y * cos(rot));
        mv.xy += c * size;
        vUv = uv; vSeed = s;
        vA = smoothstep(0.0, 0.006, k) * (1.0 - smoothstep(0.3, 1.0, k));
        gl_Position = projectionMatrix * mv;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: LOGDEPTH_F + `
      uniform float opacity; uniform vec3 tint; varying vec2 vUv; varying float vA; varying float vSeed;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + vSeed) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        #include <logdepthbuf_fragment>
        vec2 q = vUv - 0.5; float r = length(q) * 2.0;
        float n = noise(vUv * 4.0) * 0.6 + noise(vUv * 9.0) * 0.4;
        float a = smoothstep(1.0, 0.25, r + (n - 0.5) * 0.55) * vA * opacity;
        if (a < 0.003) discard;
        vec3 col = tint * (0.82 + 0.25 * (1.0 - vUv.y));
        gl_FragColor = vec4(col, a * 0.24);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 10;
  frame.group.add(mesh);
  return { mesh, mat };
}

// ------------------------------------------------------------------ 3D columns (instanced)
export function makeColumns(frame, data, opts = {}) {
  const { cols, cellDeg } = data;
  const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0, 0.5);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0.88 });
  const mesh = new THREE.InstancedMesh(g, mat, cols.length);
  mesh.frustumCulled = false;
  const cellX = cellDeg * 111320 * Math.cos(frame.lat0 * Math.PI / 180) * 0.92, cellY = cellDeg * 110540 * 0.92;
  const base = cols.map(c => frame.toLocal(c.lon, c.lat, opts.heightFn ? opts.heightFn(c.lon, c.lat) : 0));
  const color = new THREE.Color();
  cols.forEach((c, i) => { color.setRGB(c.col[0] / 255, c.col[1] / 255, c.col[2] / 255, THREE.SRGBColorSpace); mesh.setColorAt(i, color); });
  const m = new THREE.Matrix4();
  const api = {
    mesh, mat, cols, base,
    set(grow, maxH, exag = 1) {
      cols.forEach((c, i) => {
        const delay = (1 - c.t) * 0.5;               // tall columns rise first
        const gi = Math.max(0, Math.min(1, (grow - delay) / 0.5));
        const e = gi * gi * (3 - 2 * gi);
        const hgt = Math.max(0.01, c.t * maxH * exag * e);
        m.makeScale(cellX, cellY, hgt); m.setPosition(base[i].x, base[i].y, base[i].z);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = grow > 0.001;
    },
  };
  frame.group.add(mesh);
  api.set(0, 2600);
  return api;
}

// ------------------------------------------------------------------ browser window (for app screenshots)
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
export function makeWindow(tex, title, width = 16) {
  const aspect = tex.image.height / tex.image.width;
  const W = width, H = width * aspect, bar = width * 0.045, pad = width * 0.006;
  const g = new THREE.Group();
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x0d151c, transparent: true, toneMapped: false });
  const frame = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W + pad * 2, H + bar + pad * 2, width * 0.018)), frameMat);
  frame.position.set(0, bar / 2, -0.02); g.add(frame);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x49cdb6, transparent: true, opacity: 0.18, toneMapped: false });
  const glow = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(W + pad * 2 + width * 0.012, H + bar + pad * 2 + width * 0.012, width * 0.022)), glowMat);
  glow.position.set(0, bar / 2, -0.04); g.add(glow);
  // title bar texture
  const c = document.createElement('canvas'); c.width = 2048; c.height = Math.round(2048 * bar / W); const x = c.getContext('2d');
  x.fillStyle = '#0d151c'; x.fillRect(0, 0, c.width, c.height);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(40 + i * 34, c.height / 2, 10, 0, Math.PI * 2); x.fill(); });
  x.fillStyle = '#1a2630'; const tw = 900, tx = (c.width - tw) / 2; x.beginPath(); x.roundRect(tx, c.height * 0.2, tw, c.height * 0.6, 14); x.fill();
  x.fillStyle = '#a7bac6'; x.font = `500 ${Math.round(c.height * 0.34)}px "IBM Plex Sans"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(title, c.width / 2, c.height / 2 + 1);
  const barTex = new THREE.CanvasTexture(c); barTex.colorSpace = THREE.SRGBColorSpace;
  const barMat = new THREE.MeshBasicMaterial({ map: barTex, transparent: true, toneMapped: false });
  const barMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, bar), barMat); barMesh.position.set(0, H / 2 + bar / 2, 0); g.add(barMesh);
  const scrMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(W, H), scrMat); g.add(scr);
  g.userData.mats = [frameMat, glowMat, barMat, scrMat];
  g.userData.setOpacity = a => { frameMat.opacity = a; glowMat.opacity = 0.18 * a; barMat.opacity = a; scrMat.opacity = a; g.visible = a > 0.003; };
  g.traverse(o => { o.renderOrder = 50; });
  return g;
}
