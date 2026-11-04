// main.js — boots the renderer, loads a story module and exposes window.renderFrame(f) -> JPEG data URL.
import * as THREE from 'three';
import * as geo from './geo.js';
import * as W from './world.js';
import * as D from './data.js';
import { Overlay } from './overlay.js';

const P = new URLSearchParams(location.search);
const STORY = P.get('story') || 'test';
const OW = +P.get('w') || 1920, OH = +P.get('h') || 1080;
const FPS = +P.get('fps') || 30;
const ASSETS = P.get('assets') || '/assets';

async function boot() {
  const fams = ['600 40px "Saira Semi Condensed"', '700 40px "Saira Semi Condensed"', '500 40px "Saira Semi Condensed"', '400 20px "IBM Plex Sans"', '500 20px "IBM Plex Sans"', '600 20px "IBM Plex Sans"', '700 20px "IBM Plex Sans"', '500 20px "IBM Plex Mono"', '600 20px "IBM Plex Mono"', '400 20px "IBM Plex Mono"'];
  await Promise.all(fams.map(f => document.fonts.load(f, 'Ảnh hưởng ô nhiễm Đồng Tháp Quảng Ninh µg/m³ 0123456789')));

  const renderer = new THREE.WebGLRenderer({ antialias: P.get('aa') !== '0', logarithmicDepthBuffer: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(OW, OH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false;
  document.body.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(40, OW / OH, 1, 6e7);
  const scene = new THREE.Scene();
  const sky = W.makeSky();
  const overlay = new Overlay(OW, OH);
  const ctx = { THREE, renderer, scene, camera, geo, W, D, overlay, ASSETS, OW, OH, FPS, vertical: OH > OW, aspect: OW / OH, params: P };
  const story = await import(`./stories/${STORY}.js`);
  const S = await story.setup(ctx);
  window.__duration = S.duration;
  window.__info = { renderer: renderer.getContext().getParameter(renderer.getContext().VERSION) };

  window.renderFrame = async (f, quality = 0.93) => {
    const t = f / FPS;
    const st = await S.update(t) || {};
    camera.aspect = OW / OH; camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    renderer.setRenderTarget(null); renderer.clear(true, true, true);
    const camH = st.camH != null ? st.camH : geo.ecefToLlh(camera.position).h;
    sky.update(camera, camH);
    renderer.render(sky.scene, sky.cam);
    renderer.clearDepth();
    renderer.render(scene, camera);
    overlay.begin(renderer.domElement);
    if (S.draw) S.draw(t, overlay, st);
    overlay.end();
    return overlay.canvas.toDataURL('image/jpeg', quality);
  };
  window.__ready = true;
}
boot().catch(e => { window.__error = String(e && e.stack || e); console.error(e); });
