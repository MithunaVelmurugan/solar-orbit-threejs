import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

gsap.registerPlugin(ScrollTrigger);

// ================================
// SCENE
// ================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x05040a, 120, 520);

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

const pointLight = new THREE.PointLight(0xffffff, 1200, 700, 1.5);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// ================================
// TEXTURE LOADER
// ================================

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
// ================================

function createOrbitRing(radius, opacity = 0.5) {
  const points = [];
  for (let i = 0; i <= 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity });
  return new THREE.Line(geometry, material);
}

// ================================
// VENUS
// ================================

const venusOrbitRadius = 25;
const venus = new THREE.Mesh(
  new THREE.SphereGeometry(4, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.9, metalness: 0.05 })
);
scene.add(venus);
scene.add(createOrbitRing(venusOrbitRadius, 0.3));

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
scene.add(createOrbitRing(earthOrbitRadius, 0.5));

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
// ================================

const moonTexture = textureLoader.load("/img/m.jpg");
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(2, 64, 64),
  new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 1, metalness: 0 })
);
scene.add(moon);

const moonOrbitRadius = 9;

// ================================
// MARS
// ================================

const marsOrbitRadius = 56;
const mars = new THREE.Mesh(
  new THREE.SphereGeometry(3.5, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0xb5533c, roughness: 1 })
);
scene.add(mars);
scene.add(createOrbitRing(marsOrbitRadius, 0.3));

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
  });
}

function updateAsteroidBelt(p) {
  for (let i = 0; i < asteroidCount; i++) {
    const a = asteroidData[i];
    const angle = a.startAngle + p * Math.PI * 2 * a.revolutions;

    dummy.position.set(Math.cos(angle) * a.radius, a.y, Math.sin(angle) * a.radius);
    dummy.rotation.set(angle * a.spin, angle * a.spin * 0.6, 0);
    dummy.scale.setScalar(a.scale);
    dummy.updateMatrix();

    asteroidBelt.setMatrixAt(i, dummy.matrix);
  }
  asteroidBelt.instanceMatrix.needsUpdate = true;
}

// ================================
// SATURN + RINGS
// ================================

const saturnOrbitRadius = 96;
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
// STARS
// ================================

const starCount = 2500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPositions[i] = THREE.MathUtils.randFloatSpread(700);
  starPositions[i + 1] = THREE.MathUtils.randFloatSpread(700);
  starPositions[i + 2] = THREE.MathUtils.randFloatSpread(700);
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
  const dist = THREE.MathUtils.randFloat(360, 560);
  sprite.position.set(Math.cos(angle) * dist, THREE.MathUtils.randFloatSpread(160), Math.sin(angle) * dist);
  nebulaGroup.add(sprite);
});
scene.add(nebulaGroup);

// ================================
// SHOOTING STARS / COMETS
// position + opacity are a pure function of scroll progress — they only
// move while you scroll, and hold still the instant you stop.
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
// ================================

const stages = [
  // Hero — wide establishing shot
  { offset: new THREE.Vector3(0, 40, 180), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x101025), fog: new THREE.Color(0x030308) },
  { offset: new THREE.Vector3(0, 20, 120), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x223355), fog: new THREE.Color(0x05040a) },
  { offset: new THREE.Vector3(0, 70, 240), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x2a1a4a), fog: new THREE.Color(0x0a0518) },
  { offset: new THREE.Vector3(90, 45, 90), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x1a3a46), fog: new THREE.Color(0x04100f) },
  { offset: new THREE.Vector3(0, 20, 120), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x33303a), fog: new THREE.Color(0x0a0a10) },
  { offset: new THREE.Vector3(0, 3, 16), getTarget: () => earth.position.clone(), ambient: new THREE.Color(0x0d4f5f), fog: new THREE.Color(0x021015) },
  { offset: new THREE.Vector3(0, 2, 7), getTarget: () => moon.position.clone(), ambient: new THREE.Color(0x2a2a3e), fog: new THREE.Color(0x08080f) },
  // Closing CTA — pull all the way back to reveal the full system
  { offset: new THREE.Vector3(0, 120, 320), getTarget: () => new THREE.Vector3(0, 0, 0), ambient: new THREE.Color(0x15152f), fog: new THREE.Color(0x03030a) },
];

const scrollState = { progress: 0 };

ScrollTrigger.create({
  trigger: document.body,
  start: "top top",
  end: "bottom bottom",
  scrub: 1,
  onUpdate: (self) => {
    scrollState.progress = self.progress;
  },
});

const desiredCamPos = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const blendedAmbient = new THREE.Color();
const blendedFog = new THREE.Color();

function getScrollBlend(p) {
  const t = p * (stages.length - 1);
  const i = Math.min(Math.floor(t), stages.length - 2);
  const frac = t - i;
  return { a: stages[i], b: stages[i + 1], frac };
}

function updateScrollCamera(blend) {
  const { a, b, frac } = blend;
  desiredTarget.copy(a.getTarget()).lerp(b.getTarget(), frac);
  const offset = a.offset.clone().lerp(b.offset, frac);
  desiredCamPos.copy(desiredTarget).add(offset);
  if (prefersReducedMotion) {
    camera.position.copy(desiredCamPos);
  } else {
    // gentle easing toward the scroll-derived position, not independent motion
    camera.position.lerp(desiredCamPos, 0.12);
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

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ================================
// SCROLL-SYNCED CARD REVEAL
// fromTo + toggleActions correctly handles content that's already in the
// viewport on first load (the old onEnter-callback approach didn't fire
// retroactively, which is why some cards stayed invisible).
// ================================

document.querySelectorAll(".reveal").forEach((card) => {
  gsap.fromTo(
    card,
    { opacity: 0, y: 60 },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: card,
        start: "top 88%",
        toggleActions: "play none none reverse",
      },
    }
  );

  const heading = card.querySelector("h1");
  const paragraphs = card.querySelectorAll("p");

  if (heading) {
    gsap.fromTo(
      heading,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none reverse" },
      }
    );
  }

  if (paragraphs.length) {
    gsap.fromTo(
      paragraphs,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.12,
        delay: 0.25,
        ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none reverse" },
      }
    );
  }
});

// Recalculate trigger positions once everything (fonts/images) has settled
window.addEventListener("load", () => ScrollTrigger.refresh());

// ================================
// SCROLL-DRIVEN SCENE MOTION
// Every orbit/spin below is a direct function of scroll progress `p`,
// not of elapsed time — nothing moves unless the user scrolls.
// ================================

const venusStartAngle = 0.4;
const earthStartAngle = 0;
const moonStartAngle = 1.1;
const marsStartAngle = 2.6;
const saturnStartAngle = 4.2;

function updateOrbits(p) {
  sun.rotation.y = p * Math.PI * 2 * 0.6;

  const venusAngle = venusStartAngle + p * Math.PI * 2 * 1.2;
  venus.position.set(Math.cos(venusAngle) * venusOrbitRadius, 0, Math.sin(venusAngle) * venusOrbitRadius);
  venus.rotation.y = p * Math.PI * 2 * 0.8;

  const earthAngle = earthStartAngle + p * Math.PI * 2 * 1.0;
  earth.position.set(Math.cos(earthAngle) * earthOrbitRadius, 0, Math.sin(earthAngle) * earthOrbitRadius);
  earth.rotation.y = p * Math.PI * 2 * 2.0;

  // Kept deliberately slow — this is the body the camera ends up parked
  // closest to, so a high multiplier here reads as a glitch rather than motion.
  const moonAngle = moonStartAngle + p * Math.PI * 2 * 1.8;
  moon.position.set(
    earth.position.x + Math.cos(moonAngle) * moonOrbitRadius,
    Math.sin(moonAngle) * 2,
    earth.position.z + Math.sin(moonAngle) * moonOrbitRadius
  );
  moon.rotation.y = p * Math.PI * 2 * 1.0;

  const marsAngle = marsStartAngle + p * Math.PI * 2 * 0.5;
  mars.position.set(Math.cos(marsAngle) * marsOrbitRadius, 0, Math.sin(marsAngle) * marsOrbitRadius);
  mars.rotation.y = p * Math.PI * 2 * 1.5;

  const saturnAngle = saturnStartAngle + p * Math.PI * 2 * 0.22;
  saturn.position.set(Math.cos(saturnAngle) * saturnOrbitRadius, 0, Math.sin(saturnAngle) * saturnOrbitRadius);
  saturn.rotation.y = p * Math.PI * 2 * 1.0;

  nebulaGroup.rotation.y = p * Math.PI * 0.2;

  updateAsteroidBelt(p);
  updateComets(p);
}

// ================================
// RENDER LOOP
// requestAnimationFrame is still used to draw frames (required for the
// composer / bloom pipeline and for the camera's easing), but every value
// it reads is derived from scrollState.progress — nothing advances on its
// own while the page is idle.
// ================================

// Smoothed scroll value: eases toward scrollState.progress instead of
// snapping to it every tick, so orbits/camera glide rather than stutter.
// It still only moves in response to scroll — it settles to a stop, it
// doesn't drift on its own.
let smoothedProgress = 0;

function animate() {
  requestAnimationFrame(animate);

  smoothedProgress += (scrollState.progress - smoothedProgress) * 0.08;
  const p = smoothedProgress;

  updateOrbits(p);

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