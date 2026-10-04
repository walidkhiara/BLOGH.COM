/*
 * hero-3d.js — interactive 3D hero for Shopify themes.
 *
 * Renders either a merchant-supplied .glb model or a procedural chrome
 * mannequin, lit for dark backgrounds. Pointer moves parallax the scene,
 * the figure reacts when the CTA is hovered and pulses on cart updates.
 *
 * Loaded as an ES module; three.js comes from the jsDelivr CDN.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/environments/RoomEnvironment.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function chromeMaterial(accent) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(accent),
    metalness: 1,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.4
  });
}

/* A stylised figure assembled from primitives — stands in until the
 * merchant uploads their own .glb. Returns a group centred on the origin. */
function buildFigure(material) {
  const figure = new THREE.Group();
  const part = (geometry, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    figure.add(mesh);
    return mesh;
  };

  part(new THREE.SphereGeometry(0.42, 64, 64), 0, 1.95, 0).scale.set(1, 1.18, 0.92);
  part(new THREE.CylinderGeometry(0.16, 0.2, 0.26, 32), 0, 1.5, 0);
  const torso = part(new THREE.CapsuleGeometry(0.46, 0.62, 16, 48), 0, 0.92, 0);
  torso.scale.set(1, 1, 0.68);
  part(new THREE.CapsuleGeometry(0.3, 0.2, 12, 32), 0, 0.26, 0).scale.set(1, 1, 0.7);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.52, 1.28, 0);
    shoulder.rotation.z = side * 1.18;
    shoulder.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.48, 12, 32), material));
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.46, 12, 32), material);
    forearm.position.y = -0.62;
    shoulder.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 32), material);
    hand.position.y = -0.95;
    shoulder.add(hand);
    figure.add(shoulder);

    const leg = new THREE.Group();
    leg.position.set(side * 0.22, 0.1, 0);
    leg.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 12, 32), material));
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.46, 12, 32), material);
    shin.position.y = -0.62;
    leg.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.46), material);
    foot.position.set(0, -0.92, 0.08);
    leg.add(foot);
    figure.add(leg);
  }

  figure.position.y = -0.95;
  return figure;
}

/* The faint grid of licence keys / download tiles drifting behind the
 * figure — a digital-goods store has no physical product to show. */
function buildTiles(accent) {
  const tiles = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(0.46, 0.6);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accent),
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide
  });
  for (let i = 0; i < 14; i += 1) {
    const tile = new THREE.Mesh(geometry, material);
    const angle = (i / 14) * Math.PI * 2;
    tile.position.set(Math.cos(angle) * 3.2, -1 + Math.random() * 3, Math.sin(angle) * 3.2 - 1.5);
    tile.rotation.set(Math.random() * 0.4, -angle, Math.random() * 0.3);
    tile.userData.drift = 0.2 + Math.random() * 0.4;
    tiles.add(tile);
  }
  return tiles;
}

function init(root) {
  const canvas = root.querySelector('[data-hero-3d-canvas]');
  if (!canvas) return;

  const accent = root.dataset.accent || '#cfd4dc';
  const modelUrl = root.dataset.modelUrl || '';
  const autoSpin = root.dataset.autoSpin !== 'false';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.6, 7);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(new THREE.Color(accent), 2.4);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const stage = new THREE.Group();
  scene.add(stage);

  const material = chromeMaterial(accent);
  let figure = buildFigure(material);
  stage.add(figure);

  const tiles = buildTiles(accent);
  scene.add(tiles);

  if (modelUrl) {
    new GLTFLoader().load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 3.4 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        const centre = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
        model.position.sub(centre);
        stage.remove(figure);
        figure = model;
        stage.add(figure);
      },
      undefined,
      () => { /* keep the procedural figure if the upload fails to load */ }
    );
  }

  // Pointer parallax, eased toward the target each frame.
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  root.addEventListener('pointermove', (event) => {
    const rect = root.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  });
  root.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });

  // Reactions: lean in on CTA hover, pulse when something is added to cart.
  let excitement = 0;
  root.querySelectorAll('[data-hero-3d-cta]').forEach((cta) => {
    cta.addEventListener('pointerenter', () => { excitement = 1; });
    cta.addEventListener('pointerleave', () => { excitement = 0; });
  });
  let pulse = 0;
  const firePulse = () => { pulse = 1; };
  document.addEventListener('hero3d:pulse', firePulse);
  document.addEventListener('cart:updated', firePulse);
  document.addEventListener('cart:refresh', firePulse);
  if (window.Shopify && window.Shopify.designMode) firePulse();

  function resize() {
    const { clientWidth: width, clientHeight: height } = root;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(root);
  resize();

  // Only render while the hero is on screen.
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(root);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const elapsed = clock.getElapsedTime();
    const delta = Math.min(clock.getDelta(), 0.1);

    eased.x += (pointer.x - eased.x) * 0.06;
    eased.y += (pointer.y - eased.y) * 0.06;
    pulse = Math.max(0, pulse - delta * 1.2);

    const spin = autoSpin && !prefersReducedMotion ? elapsed * 0.18 : 0;
    stage.rotation.y = spin + eased.x * 0.55;
    stage.rotation.x = eased.y * 0.18;
    stage.position.y = prefersReducedMotion ? 0 : Math.sin(elapsed * 0.9) * 0.08;
    stage.scale.setScalar(1 + excitement * 0.04 + pulse * 0.12);

    camera.position.x = eased.x * 0.5;
    camera.position.y = 0.6 - eased.y * 0.3;
    camera.lookAt(0, 0.3, 0);

    tiles.rotation.y = -elapsed * 0.05;
    tiles.children.forEach((tile, index) => {
      tile.position.y += Math.sin(elapsed * tile.userData.drift + index) * 0.0012;
    });

    renderer.render(scene, camera);
  });

  root.classList.add('is-ready');
}

document.querySelectorAll('[data-hero-3d]').forEach(init);
document.addEventListener('shopify:section:load', (event) => {
  event.target.querySelectorAll('[data-hero-3d]').forEach(init);
});
