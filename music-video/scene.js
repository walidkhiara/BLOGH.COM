/*
 * scene.js — stylised 3D dancer for the music video.
 *
 * Everything on screen is a pure function of time: window.renderFrame(t)
 * poses the character, moves the camera and lights for second t, then draws.
 * That keeps renders frame-exact and repeatable, so render.mjs can step
 * through the clip one frame at a time.
 *
 * Motion is timed to a fixed tempo (BPM below) so music added later can be
 * cut to the same grid.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const BPM = 120;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const W = 1920;
const H = 1080;

/* ---------- helpers ---------- */

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- renderer / stage ---------- */

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const bg = new THREE.Color('#07060d');
scene.background = bg;
scene.fog = new THREE.Fog(bg, 9, 26);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 80);

/* floor: glossy dark stage with a glowing ring under the dancer */
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(30, 96),
  new THREE.MeshStandardMaterial({ color: '#0d0c16', roughness: 0.28, metalness: 0.6 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const ringMat = new THREE.MeshBasicMaterial({ color: '#ff3d9a', transparent: true, opacity: 0.9 });
const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.32, 128), ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.003;
scene.add(ring);

const ring2Mat = new THREE.MeshBasicMaterial({ color: '#33e1ff', transparent: true, opacity: 0.5 });
const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.43, 128), ring2Mat);
ring2.rotation.x = -Math.PI / 2;
ring2.position.y = 0.002;
scene.add(ring2);

/* backdrop: a curved wall of light bars that flash with the beat */
const bars = [];
for (let i = 0; i < 24; i++) {
  const a = (i / 24 - 0.5) * Math.PI * 1.1;
  const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff3d9a' : '#33e1ff', transparent: true });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 6, 0.08), mat);
  bar.position.set(Math.sin(a) * 9, 3, -Math.cos(a) * 9);
  scene.add(bar);
  bars.push(bar);
}

/* a big glowing disc behind the stage */
const sunTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#ffd36e');
  grad.addColorStop(0.55, '#ff3d9a');
  grad.addColorStop(1, '#7b2cff');
  g.fillStyle = grad;
  g.beginPath(); g.arc(256, 256, 250, 0, TAU); g.fill();
  /* retro slits across the lower half */
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) g.fillRect(0, 300 + i * 30, 512, 4 + i * 2.2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
})();
const sun = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false }));
sun.position.set(0, 3.6, -14);
scene.add(sun);

/* volumetric-looking beams from above */
const beams = [];
for (let i = 0; i < 4; i++) {
  const mat = new THREE.MeshBasicMaterial({
    color: i % 2 ? '#ff3d9a' : '#33e1ff', transparent: true, opacity: 0.04,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const geo = new THREE.ConeGeometry(1.6, 9, 48, 1, true);
  geo.translate(0, -4.5, 0);
  const beam = new THREE.Mesh(geo, mat);
  beam.position.set((i - 1.5) * 2.6, 8.5, -2.5);
  scene.add(beam);
  beams.push(beam);
}

/* floating dust */
const dustCount = 900;
const dustGeo = new THREE.BufferGeometry();
const dustBase = new Float32Array(dustCount * 3);
const r = rng(7);
for (let i = 0; i < dustCount; i++) {
  dustBase[i * 3] = (r() - 0.5) * 18;
  dustBase[i * 3 + 1] = r() * 7;
  dustBase[i * 3 + 2] = (r() - 0.5) * 18;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustBase.slice(), 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
  color: '#ffd6f0', size: 0.025, transparent: true, opacity: 0.6, depthWrite: false,
  blending: THREE.AdditiveBlending
}));
scene.add(dust);

/* lights */
scene.add(new THREE.HemisphereLight('#7d7aff', '#120a14', 0.35));

const key = new THREE.SpotLight('#fff1e6', 26, 20, 0.45, 0.6, 1.6);
key.position.set(2.5, 6, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004;
scene.add(key, key.target);

const rimPink = new THREE.SpotLight('#ff3d9a', 70, 18, 0.6, 0.5, 1.5);
rimPink.position.set(-4, 4, -3);
scene.add(rimPink, rimPink.target);

const rimCyan = new THREE.SpotLight('#33e1ff', 70, 18, 0.6, 0.5, 1.5);
rimCyan.position.set(4, 3.5, -3);
scene.add(rimCyan, rimCyan.target);

const fill = new THREE.PointLight('#ffb3d9', 4, 8, 2);
fill.position.set(-1.5, 1.6, 2.5);
scene.add(fill);

/* ---------- character ---------- */

/* Anime look: cel shading (three hard light bands) plus an ink outline made
 * by drawing each mesh again, back faces only, pushed out along its normals. */
const toonRamp = (() => {
  const data = new Uint8Array([70, 70, 70, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

function mat(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp });
}

const inkMat = new THREE.MeshBasicMaterial({ color: '#120c10', side: THREE.BackSide });
inkMat.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\n  transformed += normalize(objectNormal) * 0.0055;'
  );
};

function inkOutlines(root) {
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.noInk) meshes.push(o); });
  for (const m of meshes) {
    const ink = new THREE.Mesh(m.geometry, inkMat);
    ink.userData.noInk = true;
    ink.castShadow = false;
    m.add(ink);
  }
}

/* hair curls are scattered with a fixed seed so every render matches */
function buildCharacter(look) {
  const s = look.height;
  const b = look.build;
  const skin = mat(look.skin);
  const hair = mat(look.hair);
  const top = mat(look.top);
  const pants = mat(look.pants);
  const shoes = mat(look.shoes);
  const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const iris = mat(look.eyes);
  const black = new THREE.MeshBasicMaterial({ color: '#0b0708' });
  const lips = mat(look.lips);
  const frames = mat(look.glasses ?? '#111111');

  const add = (parent, geo, material, x = 0, y = 0, z = 0, ink = true) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.userData.noInk = !ink; // flat anime faces: no self-shadowing, only cel bands
    parent.add(m);
    return m;
  };
  const joint = (parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  /* a limb segment hanging down from its joint */
  const limb = (parent, len, rTop, rBot, material) => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, len, 32, 1);
    geo.translate(0, -len / 2, 0);
    const m = add(parent, geo, material);
    add(parent, new THREE.SphereGeometry(rTop, 32, 16), material);
    return m;
  };
  /* turned profiles give the torso and pelvis a body shape, not a ball */
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r * b, y)), 64);

  const root = new THREE.Group();
  root.scale.setScalar(s);
  const hips = joint(root, 0, 0.98, 0);
  add(hips, lathe([[0, -0.13], [0.1, -0.12], [0.165, -0.05], [0.175, 0.02], [0.16, 0.09], [0.15, 0.12], [0, 0.12]]), pants)
    .scale.set(1, 1, 0.76);

  const spine = joint(hips, 0, 0.06, 0);
  const chest = joint(spine, 0, 0.26, 0);
  /* slim build with broad shoulders, fitted tee */
  add(chest, lathe([[0, -0.3], [0.15, -0.29], [0.15, -0.15], [0.165, -0.02], [0.195, 0.12], [0.215, 0.21], [0.19, 0.27], [0.1, 0.31], [0, 0.32]]), top)
    .scale.set(1, 1, 0.64);
  add(chest, new THREE.TorusGeometry(0.06, 0.01, 8, 32), top, 0, 0.3, 0, false).rotation.x = Math.PI / 2; // collar

  const neck = joint(chest, 0, 0.3, 0);
  add(neck, new THREE.CylinderGeometry(0.058, 0.066, 0.13, 24), skin, 0, 0.04, 0);

  const head = joint(neck, 0, 0.1, 0);
  head.scale.setScalar(1.18); // anime proportions: bigger head
  const skull = add(head, new THREE.SphereGeometry(0.16, 64, 48), skin, 0, 0.14, -0.005);
  skull.scale.set(0.92, 1.05, 0.98);
  /* tapered jaw toward a defined chin */
  const jaw = add(head, new THREE.SphereGeometry(0.1, 48, 32), skin, 0, 0.07, 0.03);
  jaw.scale.set(1.1, 0.95, 1.0);
  add(head, new THREE.SphereGeometry(0.03, 24, 16), skin, 0, 0.012, 0.08, false).scale.set(1.1, 0.8, 0.9); // chin
  add(head, new THREE.ConeGeometry(0.014, 0.04, 16), skin, 0, 0.115, 0.163, false).rotation.x = 0.6; // nose
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.03, 24, 16), skin, sx * 0.148, 0.125, 0).scale.set(0.5, 1, 0.8);

  const eyes = [];
  for (const sx of [-1, 1]) {
    /* big anime eyes: white almond, tall dark iris, two catchlights */
    const eye = joint(head, sx * 0.06, 0.155, 0.13);
    eye.rotation.y = sx * 0.25;
    const ball = add(eye, new THREE.SphereGeometry(0.034, 32, 24), white, 0, 0, 0, false);
    ball.scale.set(1.15, 0.85, 0.6);
    const ir = add(eye, new THREE.SphereGeometry(0.022, 32, 24), iris, 0, -0.002, 0.012, false);
    ir.scale.set(0.85, 1.15, 0.6);
    add(eye, new THREE.SphereGeometry(0.011, 16, 12), black, 0, -0.002, 0.021, false).scale.set(0.9, 1.2, 0.5);
    add(eye, new THREE.SphereGeometry(0.0065, 12, 8), white, sx * -0.007, 0.008, 0.026, false);
    add(eye, new THREE.SphereGeometry(0.003, 8, 8), white, sx * 0.006, -0.01, 0.025, false);
    /* upper lash line, then the lid that drops for blinks */
    const lash = add(eye, new THREE.CapsuleGeometry(0.0045, 0.06, 4, 12), black, 0, 0.026, 0.008, false);
    lash.rotation.z = Math.PI / 2 + sx * -0.12;
    const lid = add(eye, new THREE.SphereGeometry(0.037, 32, 16, 0, TAU, 0, Math.PI / 2), skin, 0, 0, 0, false);
    lid.scale.set(1.15, 0.85, 0.62);
    const brow = add(head, new THREE.CapsuleGeometry(0.011, 0.05, 4, 12), hair, sx * 0.063, 0.205, 0.148, false);
    brow.rotation.z = Math.PI / 2 - sx * 0.08;
    eyes.push({ eye, lid, brow, sx });
  }

  /* glasses: thick dark rounded-square frames */
  if (look.glasses) {
    const rim = (() => {
      const shape = new THREE.Shape();
      const rr = (p, w, h, r) => {
        p.moveTo(-w + r, -h); p.lineTo(w - r, -h); p.quadraticCurveTo(w, -h, w, -h + r);
        p.lineTo(w, h - r); p.quadraticCurveTo(w, h, w - r, h); p.lineTo(-w + r, h);
        p.quadraticCurveTo(-w, h, -w, h - r); p.lineTo(-w, -h + r); p.quadraticCurveTo(-w, -h, -w + r, -h);
      };
      rr(shape, 0.05, 0.039, 0.02);
      const hole = new THREE.Path();
      rr(hole, 0.041, 0.03, 0.014);
      shape.holes.push(hole);
      return new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, curveSegments: 12 });
    })();
    const specs = joint(head, 0, 0.152, 0.168);
    for (const sx of [-1, 1]) {
      const r = add(specs, rim, frames, sx * 0.058, 0, 0, false);
      r.rotation.y = sx * 0.2;
      const arm = add(specs, new THREE.BoxGeometry(0.008, 0.008, 0.17), frames, sx * 0.112, 0.018, -0.09, false);
      arm.rotation.y = sx * -0.06;
    }
    add(specs, new THREE.BoxGeometry(0.03, 0.008, 0.008), frames, 0, 0.012, 0.012, false);
  }

  const mouth = joint(head, 0, 0.068, 0.148);
  const upperLip = add(mouth, new THREE.CapsuleGeometry(0.004, 0.044, 4, 12), mat('#5a2a24'), 0, 0, 0, false);
  upperLip.rotation.z = Math.PI / 2;
  const lowerLip = add(mouth, new THREE.CapsuleGeometry(0.006, 0.028, 4, 12), lips, 0, -0.012, -0.002, false);
  lowerLip.rotation.z = Math.PI / 2;
  const mouthInside = add(mouth, new THREE.SphereGeometry(0.02, 16, 12), mat('#4a1a1c'), 0, -0.006, -0.006, false);
  mouthInside.scale.set(1.2, 0.2, 0.5);

  /* curly hair: a base cap plus a cloud of curl clumps over the top */
  const cap = add(head, new THREE.SphereGeometry(0.172, 48, 32, 0, TAU, 0, Math.PI * 0.55), hair, 0, 0.15, -0.012);
  cap.scale.set(0.98, 1.08, 1.03);
  cap.rotation.x = -0.5;
  const hairSwing = joint(head, 0, 0.2, -0.02);
  const curl = rng(11);
  const curlGeo = new THREE.IcosahedronGeometry(1, 2);
  const volume = look.hairVolume ?? 1;
  for (let i = 0; i < 170; i++) {
    /* points on the upper/back part of an ellipsoid around the skull */
    const u = curl() * TAU;
    const v = Math.acos(lerp(1, -0.25, curl()));
    let x = Math.sin(v) * Math.sin(u);
    let y = Math.cos(v);
    let z = Math.sin(v) * Math.cos(u);
    if (z > 0.55 && y < 0.55) continue; // keep the face clear
    const rad = 0.175 + 0.035 * volume * curl();
    const c = add(hairSwing, curlGeo, hair, x * rad * 1.12, y * rad * 0.95 - 0.03 + 0.02 * volume, z * rad - 0.02);
    c.scale.setScalar(0.03 + 0.022 * curl() * volume);
    c.rotation.set(curl() * 3, curl() * 3, curl() * 3);
  }
  /* a few curls falling onto the forehead */
  for (let i = 0; i < 6; i++) {
    const c = add(hairSwing, curlGeo, hair, (i - 2.5) * 0.04, 0.03 + 0.012 * Math.sin(i * 2), 0.14 - Math.abs(i - 2.5) * 0.012);
    c.scale.setScalar(0.028 + 0.006 * (i % 2));
  }

  const arms = [];
  for (const sx of [-1, 1]) {
    const shoulder = joint(chest, sx * 0.24 * b, 0.2, 0);
    add(shoulder, new THREE.SphereGeometry(0.072 * b, 32, 24), top);
    limb(shoulder, 0.29, 0.054 * b, 0.045 * b, skin);
    /* short sleeve over the top of the upper arm */
    add(shoulder, new THREE.CylinderGeometry(0.068 * b, 0.064 * b, 0.13, 32), top, 0, -0.06, 0);
    const elbow = joint(shoulder, 0, -0.29, 0);
    limb(elbow, 0.26, 0.044 * b, 0.034, skin);
    const wrist = joint(elbow, 0, -0.26, 0);
    const hand = add(wrist, new THREE.SphereGeometry(0.046, 32, 24), skin, 0, -0.05, 0);
    hand.scale.set(0.75, 1.2, 0.5);
    add(wrist, new THREE.CapsuleGeometry(0.013, 0.03, 4, 8), skin, sx * -0.035, -0.035, 0.012).rotation.z = sx * 0.6; // thumb
    arms.push({ shoulder, elbow, wrist, sx });
  }

  const legs = [];
  for (const sx of [-1, 1]) {
    /* loose sweatpants, gathered at the ankle */
    const thigh = joint(hips, sx * 0.095 * b, -0.02, 0);
    limb(thigh, 0.44, 0.09 * b, 0.075 * b, pants);
    const knee = joint(thigh, 0, -0.44, 0);
    limb(knee, 0.4, 0.075 * b, 0.068, pants);
    add(knee, new THREE.CylinderGeometry(0.05, 0.052, 0.04, 24), pants, 0, -0.41, 0);
    const ankle = joint(knee, 0, -0.42, 0);
    const shoe = add(ankle, new THREE.CapsuleGeometry(0.05, 0.12, 8, 24), shoes, 0, -0.03, 0.05);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.1, 1, 0.8);
    add(ankle, new THREE.BoxGeometry(0.11, 0.02, 0.24), mat('#3a3a3a'), 0, -0.07, 0.05);
    legs.push({ thigh, knee, ankle, sx });
  }

  inkOutlines(root);
  return { root, hips, spine, chest, neck, head, eyes, mouth, lowerLip, mouthInside, hairSwing, arms, legs };
}

const look = await (await fetch('./likeness.json')).json();
const C = buildCharacter(look);
scene.add(C.root);

/* ---------- choreography ---------- */

/* Each move returns joint angles for beat phase p (beats since move start). */
const moves = {
  /* groove: knee bounce, shoulder roll, arms loose */
  groove(p) {
    const k = Math.abs(Math.sin(p * Math.PI));
    return {
      hipsY: -0.05 * k, hipsRotY: 0.18 * Math.sin(p * Math.PI / 2), hipsRotZ: 0.05 * Math.sin(p * Math.PI),
      chestRotZ: -0.08 * Math.sin(p * Math.PI), chestRotX: 0.06 * k,
      headRotX: -0.12 * k + 0.05, headRotZ: 0.06 * Math.sin(p * Math.PI / 2),
      arm: [
        { x: 0.25 + 0.35 * k, z: -0.25, elbow: -1.2 - 0.3 * k },
        { x: 0.25 + 0.35 * (1 - k), z: 0.25, elbow: -1.2 - 0.3 * (1 - k) }
      ],
      leg: [{ x: -0.3 * k, knee: 0.6 * k }, { x: -0.3 * k, knee: 0.6 * k }]
    };
  },
  /* step-touch side to side with claps on 2 and 4 */
  step(p) {
    const side = Math.sin(p * Math.PI / 2);
    const k = Math.abs(Math.sin(p * Math.PI));
    const clap = Math.pow(Math.abs(Math.cos(p * Math.PI / 2)), 6);
    return {
      hipsX: 0.22 * side, hipsY: -0.06 * k, hipsRotY: -0.25 * side, hipsRotZ: 0.08 * side,
      chestRotZ: -0.1 * side, chestRotX: 0.05, headRotZ: 0.12 * side, headRotX: -0.05,
      arm: [
        { x: 0.9 + 0.4 * clap, z: -0.35 + 0.55 * clap, elbow: -1.4 },
        { x: 0.9 + 0.4 * clap, z: 0.35 - 0.55 * clap, elbow: -1.4 }
      ],
      leg: [
        { x: -0.15 * k, z: -0.12 * Math.max(0, side), knee: 0.45 * k },
        { x: -0.15 * k, z: -0.12 * Math.max(0, side), knee: 0.45 * k }
      ]
    };
  },
  /* arms up, wave overhead, hips sway: the chorus move */
  hype(p) {
    const sway = Math.sin(p * Math.PI / 2);
    const k = Math.abs(Math.sin(p * Math.PI));
    return {
      hipsX: 0.08 * sway, hipsY: -0.07 * k + 0.02, hipsRotY: 0.15 * sway, hipsRotZ: 0.1 * sway,
      chestRotZ: -0.14 * sway, chestRotX: -0.12, headRotX: -0.25 + 0.15 * k, headRotZ: 0.1 * sway,
      arm: [
        { x: 2.8 + 0.2 * sway, z: -0.3 - 0.3 * Math.sin(p * Math.PI), elbow: -0.25 },
        { x: 2.8 - 0.2 * sway, z: 0.3 + 0.3 * Math.sin(p * Math.PI), elbow: -0.25 }
      ],
      leg: [{ x: -0.2 * k, knee: 0.45 * k }, { x: -0.2 * k, knee: 0.45 * k }]
    };
  },
  /* body wave rolling up from knees to head */
  wave(p) {
    const ph = p * Math.PI / 2;
    return {
      hipsX: 0, hipsY: -0.04 - 0.04 * Math.sin(ph), hipsRotY: 0.3, hipsRotZ: 0,
      hipsRotX: 0.15 * Math.sin(ph), chestRotX: -0.25 * Math.sin(ph - 0.9), chestRotZ: 0,
      headRotX: 0.3 * Math.sin(ph - 1.8), headRotZ: 0,
      arm: [
        { x: 1.3 + 0.5 * Math.sin(ph - 1.2), z: -1.0, elbow: -0.6 + 0.5 * Math.sin(ph - 2.0) },
        { x: 0.3, z: 0.2, elbow: -1.9 }
      ],
      leg: [{ x: -0.3 - 0.3 * Math.sin(ph), knee: 0.6 + 0.6 * Math.sin(ph) }, { x: -0.3 - 0.3 * Math.sin(ph), knee: 0.6 + 0.6 * Math.sin(ph) }]
    };
  },
  /* full turn over one bar, arms tucked then open */
  spin(p) {
    const k = smooth(p / 4);
    const open = Math.sin(clamp(p / 4) * Math.PI);
    return {
      hipsY: -0.04 * Math.abs(Math.sin(p * Math.PI)), hipsRotY: TAU * k,
      chestRotX: -0.05, headRotX: -0.1,
      arm: [
        { x: 1.0 + 0.6 * open, z: -0.6 - 0.8 * open, elbow: -1.6 + 1.3 * open },
        { x: 1.0 + 0.6 * open, z: 0.6 + 0.8 * open, elbow: -1.6 + 1.3 * open }
      ],
      leg: [{ x: -0.1, knee: 0.25 }, { x: 0.2 * open, z: -0.1, knee: 0.5 * open }]
    };
  },
  /* the opening pose and the final pose */
  pose(p) {
    const k = smooth(p / 2);
    return {
      hipsY: -0.02, hipsRotY: lerp(0, 0.35, k), hipsRotZ: 0.06,
      chestRotZ: -0.05, chestRotX: -0.04, headRotX: lerp(0.35, -0.05, k), headRotZ: -0.12,
      arm: [{ x: 0.1, z: -0.15, elbow: -0.3 }, { x: lerp(0.1, 2.4, k), z: 0.5, elbow: lerp(-0.3, -1.6, k) }],
      leg: [{ x: 0, knee: 0.05 }, { x: 0.15, z: -0.12, knee: 0.3 }]
    };
  }
};

/* the clip, bar by bar: [startBar, move] */
const TIMELINE = [
  [0, 'pose'], [2, 'groove'], [6, 'step'], [10, 'wave'], [12, 'spin'], [13, 'hype'],
  [17, 'groove'], [19, 'step'], [21, 'wave'], [23, 'spin'], [24, 'hype'], [28, 'step'],
  [30, 'pose']
];
export const LENGTH_BARS = 32;
export const DURATION = LENGTH_BARS * BAR;

function poseAt(t) {
  const bar = t / BAR;
  let i = 0;
  while (i + 1 < TIMELINE.length && TIMELINE[i + 1][0] <= bar) i++;
  const [start, name] = TIMELINE[i];
  const cur = moves[name]((bar - start) * 4);
  /* blend into the next move over the last half beat */
  const next = TIMELINE[i + 1];
  if (next) {
    const toNext = (next[0] - bar) * 4;
    if (toNext < 0.5) {
      const nxt = moves[next[1]](0);
      return blendPose(cur, nxt, smooth(1 - toNext / 0.5));
    }
  }
  /* blend in from the previous move over the first half beat */
  if (i > 0) {
    const since = (bar - start) * 4;
    if (since < 0.5) {
      const [pStart, pName] = TIMELINE[i - 1];
      const prev = moves[pName]((start - pStart) * 4);
      return blendPose(prev, cur, smooth(0.5 + since));
    }
  }
  return cur;
}

function blendPose(a, b, k) {
  const out = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (key === 'arm' || key === 'leg') {
      out[key] = [0, 1].map((j) => {
        const pa = a[key]?.[j] ?? {};
        const pb = b[key]?.[j] ?? {};
        const o = {};
        for (const kk of new Set([...Object.keys(pa), ...Object.keys(pb)])) o[kk] = lerp(pa[kk] ?? 0, pb[kk] ?? 0, k);
        return o;
      });
    } else {
      let va = a[key] ?? 0;
      let vb = b[key] ?? 0;
      /* spins end at a full turn: unwrap so the blend does not spin back */
      if (key === 'hipsRotY') va = ((va + Math.PI) % TAU + TAU) % TAU - Math.PI;
      out[key] = lerp(va, vb, k);
    }
  }
  return out;
}

function applyPose(P, t) {
  C.hips.position.set(P.hipsX ?? 0, 0.98 + (P.hipsY ?? 0), 0);
  C.hips.rotation.set(P.hipsRotX ?? 0, P.hipsRotY ?? 0, P.hipsRotZ ?? 0);
  C.chest.rotation.set(P.chestRotX ?? 0, -(P.hipsRotY ?? 0) * 0.15, P.chestRotZ ?? 0);
  C.head.rotation.set(P.headRotX ?? 0, -(P.hipsRotY ?? 0) * 0.1, P.headRotZ ?? 0);

  C.arms.forEach((a, j) => {
    const p = P.arm?.[j] ?? {};
    /* x lifts the arm forward/up, z swings it out to the side */
    a.shoulder.rotation.set(-(p.x ?? 0), 0, (p.z ?? 0) + a.sx * 0.12);
    a.elbow.rotation.set(p.elbow ?? 0, 0, 0);
    a.wrist.rotation.set(0.2, 0, a.sx * 0.1);
  });

  C.legs.forEach((l, j) => {
    const p = P.leg?.[j] ?? {};
    const knee = Math.max(0, p.knee ?? 0);
    l.thigh.rotation.set((p.x ?? 0), 0, (p.z ?? 0) * l.sx);
    l.knee.rotation.set(knee, 0, 0);
    /* keep feet roughly flat on the floor */
    l.ankle.rotation.set(-(p.x ?? 0) - knee + (P.hipsRotX ?? 0) * -1, 0, 0);
  });
  /* plant the lowest foot on the floor */
  C.root.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let low = Infinity;
  for (const l of C.legs) { l.ankle.getWorldPosition(v); low = Math.min(low, v.y); }
  C.root.position.y -= low - 0.085 * look.height;

  /* face: blink, sing, look at camera */
  const blinkT = (t % 3.7);
  const blink = blinkT < 0.14 ? Math.sin((blinkT / 0.14) * Math.PI) : 0;
  for (const e of C.eyes) {
    e.lid.rotation.x = lerp(-2.3, -0.15, blink);
    e.brow.position.y = 0.205 + 0.008 * Math.abs(Math.sin(t * Math.PI * 2 / BEAT / 2));
  }
  const sing = 0.5 + 0.5 * Math.sin(t * 9.1) * Math.sin(t * 3.3 + 1);
  C.lowerLip.position.y = -0.012 - 0.018 * sing;
  C.mouthInside.scale.y = 0.2 + 1.3 * sing;
  C.hairSwing.rotation.x = 0.12 * Math.sin(t * TAU / BEAT - 0.6);
  C.hairSwing.rotation.z = -0.1 * Math.sin(t * TAU / (BEAT * 2) - 0.8) - (P.hipsRotZ ?? 0) * 0.6;
}

/* ---------- cinematography ---------- */

/* shots: [startBar, fn(u, t) -> {pos, look, fov}], u = 0..1 through the shot */
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOTS = [
  [0, (u) => ({ pos: v3(0, 1.0 + 0.3 * u, lerp(9, 5.5, smooth(u))), look: v3(0, 1.0, 0), fov: 32 })],
  [4, (u) => ({ pos: v3(lerp(-1.0, 1.0, u), 1.85, 1.9), look: v3(0, 1.72, 0), fov: 30 })],
  [6, (u) => ({ pos: orbit(4.6, 1.1, -0.6 + 0.9 * u), look: v3(0, 0.95, 0), fov: 36 })],
  [10, (u) => ({ pos: v3(0.5, 0.25, lerp(3.4, 2.8, u)), look: v3(0, 1.2, 0), fov: 40 })],
  [12, (u) => ({ pos: v3(0, 4.8, 0.4), look: v3(0, 0.6, 0), fov: 38 })],
  [13, (u) => ({ pos: orbit(5.2, 1.4, 0.4 - 1.1 * u), look: v3(0, 1.1, 0), fov: 34 })],
  [17, (u) => ({ pos: v3(lerp(0.8, -0.5, u), 1.85, 1.8), look: v3(0, 1.72, 0), fov: 28 })],
  [19, (u) => ({ pos: v3(lerp(-4.5, 4.5, u), 0.9, 3.6), look: v3(0, 0.95, 0), fov: 36 })],
  [21, (u) => ({ pos: orbit(2.4, 0.6, 2.4 + 0.5 * u), look: v3(0, 1.0, 0), fov: 42 })],
  [23, (u) => ({ pos: v3(0, 4.8, 0.4), look: v3(0, 0.6, 0), fov: 38 })],
  [24, (u) => ({ pos: orbit(lerp(6.5, 4.0, u), lerp(0.4, 2.0, u), -0.4 + 1.4 * u), look: v3(0, 1.1, 0), fov: 34 })],
  [28, (u) => ({ pos: v3(lerp(1.2, -1.2, u), 1.25, 2.3), look: v3(0, 1.2, 0), fov: 34 })],
  [30, (u) => ({ pos: v3(0, 1.3, lerp(4.0, 8.5, smooth(u))), look: v3(0, 1.05, 0), fov: 32 })]
];

function orbit(rad, y, a) { return v3(Math.sin(a) * rad, y, Math.cos(a) * rad); }

function shotAt(t) {
  const bar = t / BAR;
  let i = 0;
  while (i + 1 < SHOTS.length && SHOTS[i + 1][0] <= bar) i++;
  const start = SHOTS[i][0];
  const end = SHOTS[i + 1]?.[0] ?? LENGTH_BARS;
  return { index: i, ...SHOTS[i][1]((bar - start) / (end - start), t) };
}

/* ---------- frame ---------- */

window.renderFrame = (t) => {
  const P = poseAt(t);
  C.root.position.set(0, 0, 0);
  applyPose(P, t);

  const beat = t / BEAT;
  const kick = Math.exp(-((beat % 1) * BEAT) * 9); // decays after each beat
  const bar = t / BAR;
  const chorus = (bar >= 13 && bar < 17) || (bar >= 24 && bar < 28);

  const shot = shotAt(t);
  /* handheld drift plus a small punch-in on the kick */
  const wob = v3(Math.sin(t * 1.3) * 0.03, Math.sin(t * 1.7 + 1) * 0.02, 0);
  camera.position.copy(shot.pos).add(wob);
  camera.fov = shot.fov - kick * (chorus ? 1.6 : 0.6);
  camera.updateProjectionMatrix();
  camera.lookAt(shot.look);

  key.target.position.set(0, 1.1, 0);
  rimPink.target.position.set(0, 1.3, 0);
  rimCyan.target.position.set(0, 1.3, 0);
  rimPink.intensity = 50 + 60 * kick * (chorus ? 1.5 : 1);
  rimCyan.intensity = 50 + 60 * Math.exp(-(((beat + 0.5) % 1) * BEAT) * 9);
  rimPink.position.set(Math.sin(t * 0.7) * 4.5, 4, -3);
  rimCyan.position.set(-Math.sin(t * 0.7) * 4.5, 3.5, -3);

  ringMat.opacity = 0.35 + 0.65 * kick;
  ring.scale.setScalar(1 + 0.08 * kick);
  ring2.rotation.z = t * 0.2;
  sun.scale.setScalar(1 + 0.025 * kick);
  sun.material.opacity = 0.75 + 0.25 * kick;

  bars.forEach((b, i) => {
    const wave = Math.sin(i * 0.6 - t * 6);
    const lit = chorus ? 0.25 + 0.75 * Math.max(0, wave) : 0.12 + 0.5 * kick * (i % 4 === Math.floor(beat) % 4 ? 1 : 0.2);
    b.material.opacity = lit;
    b.scale.y = chorus ? 0.6 + 0.4 * Math.max(0, wave) : 1;
  });
  beams.forEach((b, i) => {
    b.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.35;
    b.rotation.x = Math.cos(t * 0.6 + i) * 0.2;
    b.material.opacity = (chorus ? 0.055 : 0.03) + 0.03 * kick;
  });

  const pos = dustGeo.attributes.position.array;
  for (let i = 0; i < dustCount; i++) {
    pos[i * 3] = dustBase[i * 3] + Math.sin(t * 0.3 + i) * 0.3;
    pos[i * 3 + 1] = (dustBase[i * 3 + 1] + t * 0.08) % 7;
    pos[i * 3 + 2] = dustBase[i * 3 + 2] + Math.cos(t * 0.25 + i * 1.3) * 0.3;
  }
  dustGeo.attributes.position.needsUpdate = true;

  renderer.toneMappingExposure = 1.0 + 0.12 * kick;
  renderer.render(scene, camera);
  return shot.index;
};

window.clipInfo = { BPM, DURATION, fps: 30 };
window.renderFrame(0);
window.sceneReady = true;
