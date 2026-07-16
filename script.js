import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ================================
// SCENE
// ================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x05040a, 120, 620);

// ================================
// CAMERA
// ================================

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

camera.position.set(0, 20, 120);
camera.lookAt(0, 0, 0);

// ================================
// RENDERER
// ================================

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
if ("outputColorSpace" in renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

document.body.appendChild(renderer.domElement);

// ================================
// LIGHTING
// ================================

const ambientLight = new THREE.AmbientLight(0x223355, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1200, 900, 1.5);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// ================================
// HERO INTRO (plays once, on load — not scroll-triggered)
// The hero is already fully visible the instant the page loads, so a
// "scroll into view" trigger doesn't apply to it the way it does to the
// cards further down. Instead it gets a one-time staggered entrance:
// eyebrow, then heading, then tagline, then the scroll cue, each
// overlapping slightly for a natural cascade rather than a hard sequence.
// ================================

function playHeroIntro() {
  const eyebrow = document.querySelector(".hero-content .eyebrow");
  const heading = document.querySelector(".hero-content h1");
  const tagline = document.querySelector(".hero-content .tagline");
  const cue = document.querySelector(".hero-content .scroll-cue");
  const targets = [eyebrow, heading, tagline, cue].filter(Boolean);
  if (!targets.length) return;

  if (prefersReducedMotion) {
    gsap.set(targets, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(targets, { opacity: 0, y: 30 });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.7 });
  if (heading) tl.to(heading, { opacity: 1, y: 0, duration: 0.9 }, "-=0.45");
  if (tagline) tl.to(tagline, { opacity: 1, y: 0, duration: 0.8 }, "-=0.5");
  if (cue) tl.to(cue, { opacity: 1, y: 0, duration: 0.6 }, "-=0.4");
}

// ================================
// LOADING MANAGER (drives the #loader overlay in index.html)
// ================================

const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, loaded, total) => {
  const pct = Math.round((loaded / total) * 100);
  const bar = document.getElementById("loader-progress");
  const label = document.getElementById("loader-percent");
  if (bar) bar.style.width = pct + "%";
  if (label) label.textContent = pct + "%";
};

loadingManager.onLoad = () => {
  const loader = document.getElementById("loader");
  if (loader) {
    gsap.to(loader, {
      opacity: 0,
      duration: 0.8,
      delay: 0.3,
      onComplete: () => loader.remove(),
    });
  }
  playHeroIntro();
  ScrollTrigger.refresh();
};

const textureLoader = new THREE.TextureLoader(loadingManager);

// ================================
// SUN (marked for bloom)
// ================================

const sunTexture = textureLoader.load("/img/sun1.png");
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(12, 64, 64),
  new THREE.MeshBasicMaterial({ map: sunTexture })
);
sun.position.set(0, 0, 0);
sun.userData.bloom = true;
scene.add(sun);

// ================================
// ORBIT RING HELPER
// Brighter + more opaque than before so orbit paths read clearly at a glance.
// ================================

function createOrbitRing(radius, opacity = 0.85, color = 0x9fb4d9) {
  const points = [];
  for (let i = 0; i <= 160; i++) {
    const angle = (i / 160) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(geometry, material);
}

// ================================
// MERCURY
// ================================

const mercuryOrbitRadius = 18;
const mercury = new THREE.Mesh(
  new THREE.SphereGeometry(2, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0x9c9c96, roughness: 1, metalness: 0.05 })
);
scene.add(mercury);
scene.add(createOrbitRing(mercuryOrbitRadius, 0.25));

// ================================
// VENUS
// ================================

const venusOrbitRadius = 25;
const venus = new THREE.Mesh(
  new THREE.SphereGeometry(4, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.9, metalness: 0.05 })
);
scene.add(venus);
scene.add(createOrbitRing(venusOrbitRadius, 0.25));

// ================================
// EARTH + ATMOSPHERE
// ================================

const earthOrbitRadius = 40;
const earthTexture = textureLoader.load("/img/earth.png");
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(5, 64, 64),
  new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.85, metalness: 0.05 })
);
earth.rotation.z = THREE.MathUtils.degToRad(23.4);
scene.add(earth);
scene.add(createOrbitRing(earthOrbitRadius, 0.25));

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(5.35, 64, 64),
  new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize( normalMatrix * normal );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow( 0.65 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 3.0 );
        gl_FragColor = vec4( 0.35, 0.65, 1.0, 1.0 ) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  })
);
earth.add(atmosphere);

// ================================
// MOON
// The orbit ring is added as a child of Earth so it travels with the
// planet instead of staying pinned to world-space origin.
// ================================

const moonTexture = textureLoader.load("/img/m.jpg");
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(2, 64, 64),
  new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 1, metalness: 0 })
);
scene.add(moon);

const moonOrbitRadius = 9;
earth.add(createOrbitRing(moonOrbitRadius, 0.25, 0x8899bb));

// ================================
// MARS
// ================================

const marsOrbitRadius = 56;
const mars = new THREE.Mesh(
  new THREE.SphereGeometry(3.5, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0xb5533c, roughness: 1 })
);
scene.add(mars);
scene.add(createOrbitRing(marsOrbitRadius, 0.25));

// ================================
// ASTEROID BELT
// ================================

const asteroidCount = 420;
const asteroidBelt = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.4, 0),
  new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1, flatShading: true }),
  asteroidCount
);
scene.add(asteroidBelt);

const asteroidData = [];
const dummy = new THREE.Object3D();

for (let i = 0; i < asteroidCount; i++) {
  asteroidData.push({
    radius: THREE.MathUtils.randFloat(68, 78),
    startAngle: Math.random() * Math.PI * 2,
    revolutions: THREE.MathUtils.randFloat(0.15, 0.5),
    y: THREE.MathUtils.randFloatSpread(3),
    scale: THREE.MathUtils.randFloat(0.3, 1.2),
    spin: THREE.MathUtils.randFloat(0.5, 2),
    // was previously read but never set — that made the idle drift term
    // resolve to NaN and effectively freeze the belt when not scrolling.
    idleFactor: THREE.MathUtils.randFloat(0.5, 1.5),
  });
}

function updateAsteroidBelt(p, idleTime) {
  for (let i = 0; i < asteroidCount; i++) {
    const a = asteroidData[i];
    const angle = a.startAngle + p * Math.PI * 2 * a.revolutions + idleTime * IDLE.asteroidBase * a.idleFactor;

    dummy.position.set(Math.cos(angle) * a.radius, a.y, Math.sin(angle) * a.radius);
    dummy.rotation.set(angle * a.spin, angle * a.spin * 0.6, 0);
    dummy.scale.setScalar(a.scale);
    dummy.updateMatrix();

    asteroidBelt.setMatrixAt(i, dummy.matrix);
  }
  asteroidBelt.instanceMatrix.needsUpdate = true;
}

// ================================
// JUPITER
// ================================

const jupiterOrbitRadius = 100;
const jupiter = new THREE.Mesh(
  new THREE.SphereGeometry(9, 64, 64),
  new THREE.MeshStandardMaterial({ color: 0xd8b98f, roughness: 0.8, metalness: 0.05 })
);
scene.add(jupiter);
scene.add(createOrbitRing(jupiterOrbitRadius, 0.25));

// ================================
// SATURN + RINGS
// ================================

const saturnOrbitRadius = 130;
const saturn = new THREE.Mesh(
  new THREE.SphereGeometry(6, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0xe0c28f, roughness: 0.8 })
);
scene.add(saturn);
scene.add(createOrbitRing(saturnOrbitRadius, 0.25));

const saturnRing = new THREE.Mesh(
  new THREE.RingGeometry(8.5, 13, 64),
  new THREE.MeshBasicMaterial({ color: 0xd8c39c, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
);
saturnRing.rotation.x = THREE.MathUtils.degToRad(75);
saturn.add(saturnRing);

// ================================
// URANUS
// Tilted almost onto its side, like the real planet.
// ================================

const uranusOrbitRadius = 155;
const uranus = new THREE.Mesh(
  new THREE.SphereGeometry(5, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0xace5ee, roughness: 0.6, metalness: 0.05 })
);
uranus.rotation.z = THREE.MathUtils.degToRad(97.8);
scene.add(uranus);
scene.add(createOrbitRing(uranusOrbitRadius, 0.25));

// ================================
// NEPTUNE
// ================================

const neptuneOrbitRadius = 175;
const neptune = new THREE.Mesh(
  new THREE.SphereGeometry(4.8, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0x3d5ef0, roughness: 0.7, metalness: 0.05 })
);
scene.add(neptune);
scene.add(createOrbitRing(neptuneOrbitRadius, 0.25));

// ================================
// STARS
// ================================

const starCount = 2500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPositions[i] = THREE.MathUtils.randFloatSpread(800);
  starPositions[i + 1] = THREE.MathUtils.randFloatSpread(800);
  starPositions[i + 2] = THREE.MathUtils.randFloatSpread(800);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.85 })
);
scene.add(stars);

// ================================
// NEBULA BACKDROP
// ================================

function createNebulaTexture(colorStops) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  colorStops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const nebulaColorSets = [
  [[0, "rgba(140,70,220,0.55)"], [0.4, "rgba(90,45,170,0.22)"], [1, "rgba(0,0,0,0)"]],
  [[0, "rgba(50,130,220,0.5)"], [0.4, "rgba(35,90,170,0.2)"], [1, "rgba(0,0,0,0)"]],
  [[0, "rgba(220,70,150,0.4)"], [0.4, "rgba(150,45,110,0.18)"], [1, "rgba(0,0,0,0)"]],
  [[0, "rgba(70,220,190,0.35)"], [0.4, "rgba(40,150,130,0.16)"], [1, "rgba(0,0,0,0)"]],
];

const nebulaGroup = new THREE.Group();
nebulaColorSets.forEach((stops, i) => {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createNebulaTexture(stops),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const scale = THREE.MathUtils.randFloat(450, 750);
  sprite.scale.set(scale, scale, 1);
  const angle = (i / nebulaColorSets.length) * Math.PI * 2 + Math.random();
  const dist = THREE.MathUtils.randFloat(360, 620);
  sprite.position.set(Math.cos(angle) * dist, THREE.MathUtils.randFloatSpread(160), Math.sin(angle) * dist);
  nebulaGroup.add(sprite);
});
scene.add(nebulaGroup);

// ================================
// SHOOTING STARS / COMETS
// ================================

function makeComet(repeatCount, offset) {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), material);
  mesh.userData.bloom = true;
  scene.add(mesh);

  const startRadius = 320;
  const angle = Math.random() * Math.PI * 2;
  const elevation = THREE.MathUtils.randFloatSpread(220);
  const start = new THREE.Vector3(Math.cos(angle) * startRadius, elevation, Math.sin(angle) * startRadius);
  const endAngle = angle + Math.PI + THREE.MathUtils.randFloatSpread(1);
  const end = new THREE.Vector3(
    Math.cos(endAngle) * startRadius,
    elevation - THREE.MathUtils.randFloatSpread(120),
    Math.sin(endAngle) * startRadius
  );

  return { mesh, material, start, end, repeatCount, offset };
}

const comets = [makeComet(3, 0.05), makeComet(4, 0.4), makeComet(5, 0.7)];

function updateComets(p) {
  comets.forEach((c) => {
    const phase = (((p * c.repeatCount + c.offset) % 1) + 1) % 1;
    c.mesh.position.copy(c.start).lerp(c.end, phase);
    c.material.opacity = Math.sin(phase * Math.PI) * 0.9;
  });
}

// ================================
// SELECTIVE BLOOM (Sun + comets)
// ================================

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.1, 0.55, 0.15);

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

const mixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv );
      }
    `,
  }),
  "baseTexture"
);
mixPass.needsSwap = true;

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(mixPass);

const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const materialCache = {};

function darkenNonBloomed(obj) {
  if (obj.isMesh && obj.userData.bloom !== true) {
    materialCache[obj.uuid] = obj.material;
    obj.material = darkMaterial;
  }
}
function restoreMaterial(obj) {
  if (materialCache[obj.uuid]) {
    obj.material = materialCache[obj.uuid];
    delete materialCache[obj.uuid];
  }
}
function renderWithSelectiveBloom() {
  scene.traverse(darkenNonBloomed);
  bloomComposer.render();
  scene.traverse(restoreMaterial);
  finalComposer.render();
}

// ================================
// SCROLL-DRIVEN CAMERA + MOOD
// One stage per content-section in index.html — 15 total. Keep both
// files in sync if you add/remove a section.
// ================================

const stages = [
  // 1. Hero — wide establishing shot
  { offset: new THREE.Vector3(0, 40, 180), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x101025), fog: new THREE.Color(0x030308) },
  // 2. Introduction (galaxy)
  { offset: new THREE.Vector3(0, 20, 120), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x223355), fog: new THREE.Color(0x05040a) },
  // 3. Size
  { offset: new THREE.Vector3(0, 70, 240), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x2a1a4a), fog: new THREE.Color(0x0a0518) },
  // 4. Shape
  { offset: new THREE.Vector3(90, 45, 90), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x1a3a46), fog: new THREE.Color(0x04100f) },
  // 5. Our Solar System — overview. Kept closer than Shape's wide shot so
  // the move into Mercury is one continuous zoom-in, not a zoom-out then
  // a hard zoom-in (which read as the camera going "front and back").
  { offset: new THREE.Vector3(0, 55, 150), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x33303a), fog: new THREE.Color(0x0a0a10) },
  // 6. Mercury
  { offset: new THREE.Vector3(0, 1.5, 10), getTarget: () => mercury.position.clone(), ambient: new THREE.Color(0x3a352e), fog: new THREE.Color(0x0c0a08) },
  // 7. Venus
  { offset: new THREE.Vector3(0, 2, 15), getTarget: () => venus.position.clone(), ambient: new THREE.Color(0x4a3a20), fog: new THREE.Color(0x120e08) },
  // 8. Earth
  { offset: new THREE.Vector3(0, 3, 16), getTarget: () => earth.position.clone(), ambient: new THREE.Color(0x0d4f5f), fog: new THREE.Color(0x021015) },
  // 9. Moon
  { offset: new THREE.Vector3(0, 2, 7), getTarget: () => moon.position.clone(), ambient: new THREE.Color(0x2a2a3e), fog: new THREE.Color(0x08080f) },
  // 10. Mars
  { offset: new THREE.Vector3(0, 2.5, 13), getTarget: () => mars.position.clone(), ambient: new THREE.Color(0x4a2018), fog: new THREE.Color(0x0f0503) },
  // 11. Jupiter
  { offset: new THREE.Vector3(0, 6, 42), getTarget: () => jupiter.position.clone(), ambient: new THREE.Color(0x4a3a24), fog: new THREE.Color(0x0f0a05) },
  // 12. Saturn
  { offset: new THREE.Vector3(0, 7, 40), getTarget: () => saturn.position.clone(), ambient: new THREE.Color(0x4a4020), fog: new THREE.Color(0x0f0d05) },
  // 13. Uranus
  { offset: new THREE.Vector3(0, 4, 28), getTarget: () => uranus.position.clone(), ambient: new THREE.Color(0x1e4a4c), fog: new THREE.Color(0x051010) },
  // 14. Neptune
  { offset: new THREE.Vector3(0, 4, 26), getTarget: () => neptune.position.clone(), ambient: new THREE.Color(0x14245a), fog: new THREE.Color(0x030614) },
  // 15. Closing CTA — pull all the way back to reveal the full system
  { offset: new THREE.Vector3(0, 140, 380), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x15152f), fog: new THREE.Color(0x03030a) },
];

// ================================
// SMOOTH SCROLL (Lenis)
// This is what actually smooths the scroll feel itself — everything
// above only smoothed how the camera reacted to scroll. Without this,
// raw wheel/trackpad ticks drive scrollTop directly and every animation
// riding on it inherits that choppiness, no matter how eased the camera
// math is downstream.
// Skipped for prefers-reduced-motion: forcing inertia on a user who's
// asked for less motion would work against their preference.
// ================================

let lenis = null;
if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  // Let Lenis own the easing curve; GSAP's own frame-skip compensation
  // would otherwise fight it under load.
  gsap.ticker.lagSmoothing(0);
}

const scrollState = { progress: 0 };

ScrollTrigger.create({
  trigger: document.body,
  start: "top top",
  end: "bottom bottom",
  // Lenis is now the single place scroll input gets smoothed, so this
  // tracks it directly with no extra tween lag on top — stacking a scrub
  // duration here again would just reintroduce the overshoot we already
  // fixed once (see the "front and back" fix above).
  scrub: true,
  onUpdate: (self) => {
    scrollState.progress = self.progress;
  },
});

const desiredCamPos = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const blendedAmbient = new THREE.Color();
const blendedFog = new THREE.Color();

// Smoothstep: eases speed down to zero at each stage waypoint and back up
// as it leaves. Without this the camera moved at constant speed straight
// through every stage, so planets never got a "held" moment on screen —
// it just swept past. This gives each one real dwell time.
function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

function getScrollBlend(p) {
  const clamped = THREE.MathUtils.clamp(p, 0, 1);
  const t = clamped * (stages.length - 1);
  const i = Math.min(Math.floor(t), stages.length - 2);
  const rawFrac = t - i;
  const frac = easeInOut(rawFrac);
  return { a: stages[i], b: stages[i + 1], frac };
}

// Radial blend: interpolate distance and direction separately instead of
// straight-line vector lerp. A straight line between two offset vectors
// can pass closer to (or farther from) the target than either endpoint,
// which is what produced the "zooms in and out" wobble. Lerping distance
// as a plain scalar guarantees it moves in one direction only.
const dirA = new THREE.Vector3();
const dirB = new THREE.Vector3();
const blendedDir = new THREE.Vector3();
function blendOffset(a, b, frac, out) {
  const distA = a.length();
  const distB = b.length();
  const dist = THREE.MathUtils.lerp(distA, distB, frac);
  dirA.copy(a).normalize();
  dirB.copy(b).normalize();
  blendedDir.copy(dirA).lerp(dirB, frac);
  if (blendedDir.lengthSq() < 1e-6) blendedDir.set(0, 0, 1);
  blendedDir.normalize();
  return out.copy(blendedDir).multiplyScalar(dist);
}

const blendedOffset = new THREE.Vector3();

function updateScrollCamera(blend) {
  const { a, b, frac } = blend;
  desiredTarget.copy(a.getTarget()).lerp(b.getTarget(), frac);
  const offset = blendOffset(a.offset, b.offset, frac, blendedOffset);
  desiredCamPos.copy(desiredTarget).add(offset);
  if (prefersReducedMotion) {
    camera.position.copy(desiredCamPos);
  } else {
    camera.position.lerp(desiredCamPos, 0.16);
  }
  camera.lookAt(desiredTarget);
}

function updateSceneMood(blend) {
  const { a, b, frac } = blend;
  blendedAmbient.copy(a.ambient).lerp(b.ambient, frac);
  blendedFog.copy(a.fog).lerp(b.fog, frac);
  ambientLight.color.copy(blendedAmbient);
  scene.fog.color.copy(blendedFog);
}

// ================================
// SUBTLE MOUSE PARALLAX (user input, not automatic)
// ================================

const mouse = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
});

// ================================
// SCROLL-SYNCED CARD REVEAL
// One GSAP timeline per card (was three separate ScrollTriggers doing
// almost the same job) — card fades/rises in, then its eyebrow, heading,
// and paragraphs stagger in right behind it. ".hero-content" is skipped
// here on purpose: it gets its own one-time load-in animation below
// instead of a scroll trigger, since it's already on screen at load with
// nothing to "scroll into view" from.
// ================================

document.querySelectorAll(".reveal:not(.hero-content)").forEach((card) => {
  const eyebrow = card.querySelector(".planet-eyebrow");
  const heading = card.querySelector("h1");
  const paragraphs = card.querySelectorAll("p");
  const stackLine = card.querySelector(".stack-line");
  const ctaLinks = card.querySelector(".cta-links");

  if (prefersReducedMotion) return; // element is already visible, nothing to animate

  gsap.set(card, { opacity: 0, y: 60 });
  if (eyebrow) gsap.set(eyebrow, { opacity: 0, y: 16 });
  if (heading) gsap.set(heading, { opacity: 0, y: 22 });
  if (paragraphs.length) gsap.set(paragraphs, { opacity: 0, y: 22 });
  if (stackLine) gsap.set(stackLine, { opacity: 0, y: 16 });
  if (ctaLinks) gsap.set(ctaLinks, { opacity: 0, y: 16 });

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    scrollTrigger: {
      trigger: card,
      start: "top 85%",
      toggleActions: "play none none reverse",
    },
  });

  tl.to(card, { opacity: 1, y: 0, duration: 0.9 });
  if (eyebrow) tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.5 }, "-=0.6");
  if (heading) tl.to(heading, { opacity: 1, y: 0, duration: 0.7 }, "-=0.45");
  if (paragraphs.length) tl.to(paragraphs, { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 }, "-=0.4");
  if (stackLine) tl.to(stackLine, { opacity: 1, y: 0, duration: 0.5 }, "-=0.35");
  if (ctaLinks) tl.to(ctaLinks, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3");
});

window.addEventListener("load", () => ScrollTrigger.refresh());

// ================================
// SCROLL-DRIVEN SCENE MOTION
// Every orbit/spin is p (scroll progress) PLUS a slow idleTime-based drift,
// so planets keep gently orbiting even when the user isn't scrolling.
// ================================

const mercuryStartAngle = 5.0;
const venusStartAngle = 0.4;
const earthStartAngle = 0;
const moonStartAngle = 1.1;
const marsStartAngle = 2.6;
const jupiterStartAngle = 1.7;
const saturnStartAngle = 4.2;
const uranusStartAngle = 3.1;
const neptuneStartAngle = 0.9;

// Idle drift rates (radians/sec), layered on top of the scroll-driven angle.
const IDLE = {
  sunSpin: 0.05,
  mercuryOrbit: 0.09,
  mercurySpin: 0.05,
  venusOrbit: 0.06,
  venusSpin: 0.04,
  earthOrbit: 0.04,
  earthSpin: 0.08,
  moonOrbit: 0.15,
  moonSpin: 0.05,
  marsOrbit: 0.025,
  marsSpin: 0.06,
  jupiterOrbit: 0.015,
  jupiterSpin: 0.09,
  saturnOrbit: 0.012,
  saturnSpin: 0.05,
  uranusOrbit: 0.008,
  uranusSpin: 0.04,
  neptuneOrbit: 0.006,
  neptuneSpin: 0.04,
  nebula: 0.01,
  asteroidBase: 0.015,
};

function updateOrbits(p, idleTime) {
  sun.rotation.y = p * Math.PI * 2 * 0.6 + idleTime * IDLE.sunSpin;

  const mercuryAngle = mercuryStartAngle + p * Math.PI * 2 * 2.0 + idleTime * IDLE.mercuryOrbit;
  mercury.position.set(Math.cos(mercuryAngle) * mercuryOrbitRadius, 0, Math.sin(mercuryAngle) * mercuryOrbitRadius);
  mercury.rotation.y = p * Math.PI * 2 * 0.6 + idleTime * IDLE.mercurySpin;

  const venusAngle = venusStartAngle + p * Math.PI * 2 * 1.2 + idleTime * IDLE.venusOrbit;
  venus.position.set(Math.cos(venusAngle) * venusOrbitRadius, 0, Math.sin(venusAngle) * venusOrbitRadius);
  venus.rotation.y = p * Math.PI * 2 * 0.8 + idleTime * IDLE.venusSpin;

  const earthAngle = earthStartAngle + p * Math.PI * 2 * 1.0 + idleTime * IDLE.earthOrbit;
  earth.position.set(Math.cos(earthAngle) * earthOrbitRadius, 0, Math.sin(earthAngle) * earthOrbitRadius);
  earth.rotation.y = p * Math.PI * 2 * 2.0 + idleTime * IDLE.earthSpin;

  const moonAngle = moonStartAngle + p * Math.PI * 2 * 1.8 + idleTime * IDLE.moonOrbit;
  moon.position.set(
    earth.position.x + Math.cos(moonAngle) * moonOrbitRadius,
    Math.sin(moonAngle) * 2,
    earth.position.z + Math.sin(moonAngle) * moonOrbitRadius
  );
  moon.rotation.y = p * Math.PI * 2 * 1.0 + idleTime * IDLE.moonSpin;

  const marsAngle = marsStartAngle + p * Math.PI * 2 * 0.5 + idleTime * IDLE.marsOrbit;
  mars.position.set(Math.cos(marsAngle) * marsOrbitRadius, 0, Math.sin(marsAngle) * marsOrbitRadius);
  mars.rotation.y = p * Math.PI * 2 * 1.5 + idleTime * IDLE.marsSpin;

  const jupiterAngle = jupiterStartAngle + p * Math.PI * 2 * 0.32 + idleTime * IDLE.jupiterOrbit;
  jupiter.position.set(Math.cos(jupiterAngle) * jupiterOrbitRadius, 0, Math.sin(jupiterAngle) * jupiterOrbitRadius);
  jupiter.rotation.y = p * Math.PI * 2 * 2.4 + idleTime * IDLE.jupiterSpin;

  const saturnAngle = saturnStartAngle + p * Math.PI * 2 * 0.22 + idleTime * IDLE.saturnOrbit;
  saturn.position.set(Math.cos(saturnAngle) * saturnOrbitRadius, 0, Math.sin(saturnAngle) * saturnOrbitRadius);
  saturn.rotation.y = p * Math.PI * 2 * 1.0 + idleTime * IDLE.saturnSpin;

  const uranusAngle = uranusStartAngle + p * Math.PI * 2 * 0.14 + idleTime * IDLE.uranusOrbit;
  uranus.position.set(Math.cos(uranusAngle) * uranusOrbitRadius, 0, Math.sin(uranusAngle) * uranusOrbitRadius);
  uranus.rotation.y = p * Math.PI * 2 * 0.8 + idleTime * IDLE.uranusSpin;

  const neptuneAngle = neptuneStartAngle + p * Math.PI * 2 * 0.1 + idleTime * IDLE.neptuneOrbit;
  neptune.position.set(Math.cos(neptuneAngle) * neptuneOrbitRadius, 0, Math.sin(neptuneAngle) * neptuneOrbitRadius);
  neptune.rotation.y = p * Math.PI * 2 * 0.8 + idleTime * IDLE.neptuneSpin;

  nebulaGroup.rotation.y = p * Math.PI * 0.2 + idleTime * IDLE.nebula;

  updateAsteroidBelt(p, idleTime);
  updateComets(p);
}

// ================================
// RENDER LOOP
// idleClock accumulates real elapsed seconds regardless of scrolling —
// this is what actually drives the "still orbiting while idle" motion.
// ================================

const clock = new THREE.Clock();
let idleClock = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  idleClock += delta;

  // scrollState.progress is already smoothed once by ScrollTrigger's
  // scrub above — that's the single source of truth for scroll easing now.
  const p = scrollState.progress;

  updateOrbits(p, idleClock);

  const blend = getScrollBlend(p);
  updateScrollCamera(blend);
  updateSceneMood(blend);

  if (!prefersReducedMotion) {
    camera.position.x += mouse.x * 1.5;
    camera.position.y += -mouse.y * 1.0;
  }
  camera.lookAt(desiredTarget);

  renderWithSelectiveBloom();
}

animate();

// ================================
// WINDOW RESIZE
// ================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  bloomComposer.setSize(window.innerWidth, window.innerHeight);
  finalComposer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});