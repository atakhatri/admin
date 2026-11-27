import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { terrainHeightAt } from './atmospherePresets';

// Pre-allocated scratch helpers (zero GC allocations inside render loop)
const _scratchMatrix = new THREE.Matrix4();
const _scratchPos = new THREE.Vector3();
const _scratchQuat = new THREE.Quaternion();
const _scratchScale = new THREE.Vector3();
const _scratchEuler = new THREE.Euler();
const _scratchColor = new THREE.Color();
const _scratchColorB = new THREE.Color();
const _lookTarget = new THREE.Vector3(0, 1.8, -28);

function detectSoftwareWebGL() {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      supported: true,
      isSoftwareGl: /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu),
    };
  } catch (_err) {
    return { supported: false, isSoftwareGl: true };
  }
}

function createProceduralNoiseTexture(size = 128, contrast = 1.0, isColor = false) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  // Tileable multi-octave value wave pattern (zero external files)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const n1 = Math.sin(u * 2 + Math.cos(v * 2)) * 0.5 + 0.5;
      const n2 = Math.sin(u * 5 - v * 3) * 0.25 + 0.25;
      const n3 = Math.cos(u * 9 + v * 7) * 0.15 + 0.15;
      const val = Math.min(255, Math.max(0, Math.round((n1 * 0.55 + n2 * 0.3 + n3 * 0.25) * 255 * contrast)));
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = isColor ? Math.min(255, Math.round(val * 1.08)) : val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  return tex;
}

function createSkyDome(initialPreset) {
  const geometry = new THREE.SphereGeometry(140, 28, 20);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(initialPreset.skyTop) },
      uHorizonColor: { value: new THREE.Color(initialPreset.skyHorizon) },
      uGlowColor: { value: new THREE.Color(initialPreset.glowColor) },
      uGlowDir: { value: new THREE.Vector3(0.24, 0.28, -0.92).normalize() },
      uGlowStrength: { value: initialPreset.glowStrength ?? 0.28 },
      uFlash: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGlowColor;
      uniform vec3 uGlowDir;
      uniform float uGlowStrength;
      uniform float uFlash;
      varying vec3 vWorldDir;
      void main() {
        float h = clamp(vWorldDir.y * 1.15 + 0.14, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.72));
        float sunDot = max(dot(normalize(vWorldDir), uGlowDir), 0.0);
        float halo = pow(sunDot, 5.5) * uGlowStrength;
        float core = pow(sunDot, 42.0) * uGlowStrength * 0.65;
        col += uGlowColor * (halo + core);
        col += vec3(0.65, 0.85, 1.0) * uFlash * 0.42;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, geometry, material };
}

function createTerrainAndWater(maxAnisotropy) {
  const disposables = [];
  const group = new THREE.Group();

  const terrainGeo = new THREE.PlaneGeometry(180, 140, 56, 44);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i) - 24;
    posAttr.setZ(i, z);
    posAttr.setY(i, terrainHeightAt(x, z));
  }
  terrainGeo.computeVertexNormals();
  disposables.push(terrainGeo);

  const terrainBump = createProceduralNoiseTexture(128, 0.9, false);
  terrainBump.repeat.set(8, 8);
  terrainBump.anisotropy = maxAnisotropy;
  disposables.push(terrainBump);

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x0f222d,
    roughness: 0.9,
    metalness: 0.06,
    bumpMap: terrainBump,
    bumpScale: 0.35,
  });
  disposables.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Calm reflective water basin (offset cleanly above basin floor to avoid Z-fighting)
  const waterGeo = new THREE.CircleGeometry(36, 48);
  waterGeo.rotateX(-Math.PI / 2);
  disposables.push(waterGeo);

  const waterBump = createProceduralNoiseTexture(128, 1.0, false);
  waterBump.repeat.set(6, 6);
  waterBump.anisotropy = maxAnisotropy;
  disposables.push(waterBump);

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x081d2b,
    roughness: 0.16,
    metalness: 0.65,
    bumpMap: waterBump,
    bumpScale: 0.08,
  });
  disposables.push(waterMat);

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, -2.55, -8);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  return { group, waterMat, waterBump, disposables };
}

function createTelemetryTowerLandmark() {
  // Composite 8-part architectural weather & telemetry relay spire grounded on ridge
  const disposables = [];
  const tower = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x263845,
    roughness: 0.88,
    metalness: 0.08,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x6f8799,
    roughness: 0.32,
    metalness: 0.78,
  });
  const radomeMat = new THREE.MeshStandardMaterial({
    color: 0xcfe4f5,
    roughness: 0.18,
    metalness: 0.15,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.1,
  });
  disposables.push(concreteMat, steelMat, radomeMat, beaconMat);

  // 1. Stepped foundation plinth (bottom-center pivoted at y = 0)
  const baseGeo = new THREE.BoxGeometry(2.6, 0.9, 2.6);
  const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
  baseMesh.position.y = 0.45;
  tower.add(baseMesh);

  // 2. Upper pedestal collar
  const collarGeo = new THREE.CylinderGeometry(0.9, 1.15, 0.7, 8);
  const collarMesh = new THREE.Mesh(collarGeo, concreteMat);
  collarMesh.position.y = 1.2;
  tower.add(collarMesh);

  // 3. Primary tapered steel mast
  const mastGeo = new THREE.CylinderGeometry(0.18, 0.42, 7.6, 12);
  const mastMesh = new THREE.Mesh(mastGeo, steelMat);
  mastMesh.position.y = 5.3;
  mastMesh.castShadow = true;
  tower.add(mastMesh);

  // 4 & 5. Structural cross-ring collars
  const ringGeo = new THREE.TorusGeometry(0.72, 0.06, 8, 20);
  const ringLow = new THREE.Mesh(ringGeo, steelMat);
  ringLow.rotation.x = Math.PI / 2;
  ringLow.position.y = 4.6;
  tower.add(ringLow);

  const ringHigh = new THREE.Mesh(ringGeo, steelMat);
  ringHigh.rotation.x = Math.PI / 2;
  ringHigh.scale.setScalar(0.75);
  ringHigh.position.y = 7.1;
  tower.add(ringHigh);

  // 6. Sculpted weather radar dome (LatheGeometry silhouette)
  const domePoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.65, 0.15),
    new THREE.Vector2(0.78, 0.55),
    new THREE.Vector2(0.55, 1.05),
    new THREE.Vector2(0.0, 1.25),
  ];
  const domeGeo = new THREE.LatheGeometry(domePoints, 18);
  const domeMesh = new THREE.Mesh(domeGeo, radomeMat);
  domeMesh.position.set(0, 8.7, 0);
  tower.add(domeMesh);

  // 7. Side telemetry dish boom
  const boomGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8);
  const boomMesh = new THREE.Mesh(boomGeo, steelMat);
  boomMesh.rotation.z = Math.PI / 2;
  boomMesh.position.set(0.85, 6.2, 0);
  tower.add(boomMesh);

  // 8. Top aviation/telemetry beacon
  const beaconGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  beaconMesh.position.y = 10.1;
  tower.add(beaconMesh);

  disposables.push(baseGeo, collarGeo, mastGeo, ringGeo, domeGeo, boomGeo, beaconGeo);

  // Ground flush on distant right ridge in the vista
  const tx = 18;
  const tz = -33;
  const groundY = terrainHeightAt(tx, tz);
  tower.position.set(tx, groundY - 0.15, tz);
  tower.rotation.y = -0.35;

  return { group: tower, beaconMat, disposables };
}

function createCloudBanks(initialPreset) {
  const disposables = [];
  const cloudRoot = new THREE.Group();

  const puffGeo = new THREE.IcosahedronGeometry(1, 2);
  disposables.push(puffGeo);

  const cloudMatPrimary = new THREE.MeshStandardMaterial({
    color: initialPreset.cloudColor,
    emissive: initialPreset.cloudEmissive,
    emissiveIntensity: 0.45,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });
  const cloudMatAccent = new THREE.MeshStandardMaterial({
    color: initialPreset.cloudColor,
    emissive: initialPreset.cloudEmissive,
    emissiveIntensity: 0.3,
    roughness: 0.72,
    metalness: 0.04,
    flatShading: true,
  });
  disposables.push(cloudMatPrimary, cloudMatAccent);

  // 8 composite cloud clusters (each 6-7 layered puffs across primary + secondary + crown scales)
  const clusterSpecs = [
    { x: -24, y: 12.2, z: -26, s: 2.35, speed: 0.65 },
    { x: -11, y: 13.8, z: -34, s: 2.85, speed: 0.52 },
    { x: 4, y: 12.6, z: -29, s: 2.55, speed: 0.72 },
    { x: 19, y: 13.4, z: -38, s: 3.1, speed: 0.48 },
    { x: -28, y: 10.8, z: -44, s: 3.3, speed: 0.42 },
    { x: -2, y: 15.0, z: -46, s: 3.4, speed: 0.38 },
    { x: 28, y: 11.6, z: -27, s: 2.4, speed: 0.68 },
    { x: 13, y: 10.6, z: -20, s: 1.9, speed: 0.8 },
  ];

  const puffOffsets = [
    { dx: 0, dy: 0, dz: 0, sx: 2.4, sy: 1.15, sz: 1.6, accent: false },
    { dx: -1.7, dy: -0.25, dz: 0.25, sx: 1.75, sy: 0.95, sz: 1.35, accent: false },
    { dx: 1.85, dy: -0.2, dz: -0.2, sx: 1.85, sy: 1.0, sz: 1.4, accent: false },
    { dx: -0.7, dy: 0.75, dz: -0.15, sx: 1.45, sy: 1.05, sz: 1.15, accent: true },
    { dx: 0.85, dy: 0.85, dz: 0.15, sx: 1.35, sy: 0.95, sz: 1.1, accent: true },
    { dx: 0.1, dy: 1.35, dz: -0.1, sx: 1.05, sy: 0.75, sz: 0.9, accent: true },
    { dx: -2.7, dy: -0.5, dz: -0.15, sx: 1.15, sy: 0.65, sz: 1.0, accent: false },
  ];

  const clusters = clusterSpecs.map((spec, idx) => {
    const cluster = new THREE.Group();
    for (let p = 0; p < puffOffsets.length; p++) {
      const o = puffOffsets[p];
      const mesh = new THREE.Mesh(puffGeo, o.accent ? cloudMatAccent : cloudMatPrimary);
      mesh.position.set(o.dx, o.dy, o.dz);
      mesh.scale.set(o.sx, o.sy, o.sz);
      mesh.rotation.set(0.2 * p, 0.5 * idx + p, 0.15 * p);
      cluster.add(mesh);
    }
    cluster.position.set(spec.x, spec.y, spec.z);
    cluster.scale.setScalar(spec.s);
    cloudRoot.add(cluster);

    return {
      group: cluster,
      baseY: spec.y,
      baseScale: spec.s,
      speed: spec.speed,
      phase: idx * 1.15,
    };
  });

  return { cloudRoot, clusters, cloudMatPrimary, cloudMatAccent, disposables };
}

function createInstancedParticles(count = 260) {
  const geometry = new THREE.BoxGeometry(0.055, 0.95, 0.055);
  const material = new THREE.MeshBasicMaterial({
    color: 0xd0edff,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;

  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: (Math.random() - 0.5) * 64,
      y: Math.random() * 26 - 2,
      z: -4 - Math.random() * 44,
      speedFactor: 0.78 + Math.random() * 0.48,
      phase: Math.random() * Math.PI * 2,
      scale: 0.75 + Math.random() * 0.55,
    });
  }

  return { mesh, particles, geometry, material };
}

function createLightningRig() {
  // 11 main segments + 5 forked branch segments = 16 line segments (32 vertices)
  const positions = new Float32Array(32 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xeaf8ff,
    transparent: true,
    opacity: 0,
  });
  const line = new THREE.LineSegments(geometry, material);
  line.frustumCulled = false;

  const flashLight = new THREE.PointLight(0xa8e4ff, 0, 130, 1.3);
  flashLight.position.set(-4, 14, -26);

  function rebuildBolt(originX, originZ) {
    const arr = geometry.attributes.position.array;
    let x = originX;
    let y = 14.0;
    let z = originZ;
    let forkX = x;
    let forkY = y;
    let forkZ = z;
    let ptr = 0;

    for (let i = 0; i < 11; i++) {
      const nx = x + (Math.random() - 0.5) * 2.5;
      const ny = y - 1.5;
      const nz = z + (Math.random() - 0.5) * 0.9;
      arr[ptr++] = x;
      arr[ptr++] = y;
      arr[ptr++] = z;
      arr[ptr++] = nx;
      arr[ptr++] = ny;
      arr[ptr++] = nz;
      if (i === 3) {
        forkX = nx;
        forkY = ny;
        forkZ = nz;
      }
      x = nx;
      y = ny;
      z = nz;
    }

    const forkDir = Math.random() > 0.5 ? 1 : -1;
    let bx = forkX;
    let by = forkY;
    let bz = forkZ;
    for (let j = 0; j < 5; j++) {
      const nbx = bx + forkDir * (0.7 + Math.random() * 1.1);
      const nby = by - (1.1 + Math.random() * 0.5);
      const nbz = bz + (Math.random() - 0.5) * 0.6;
      arr[ptr++] = bx;
      arr[ptr++] = by;
      arr[ptr++] = bz;
      arr[ptr++] = nbx;
      arr[ptr++] = nby;
      arr[ptr++] = nbz;
      bx = nbx;
      by = nby;
      bz = nbz;
    }

    geometry.attributes.position.needsUpdate = true;
    flashLight.position.set(originX, 13, originZ + 4);
  }

  rebuildBolt(-6, -30);

  return { line, flashLight, geometry, material, rebuildBolt };
}

export class WeatherAtmosphereEngine {
  constructor(mountEl, initialPreset, options = {}) {
    this.mountEl = mountEl;
    this.disposed = false;
    this.frameId = 0;
    this.paused = Boolean(options.paused);
    this.reducedMotion = Boolean(options.reducedMotion);
    this.targetPreset = initialPreset;
    this.pointerX = 0;
    this.pointerY = 0;
    this.camOffsetX = 0;
    this.camOffsetY = 0;
    this.lightningTimer = 2.6;
    this.lightningStrength = 0;
    this.renderBusy = false;
    this.renderDirty = false;
    this.disposables = [];

    const probe = detectSoftwareWebGL();
    if (!probe.supported) {
      throw new Error('WebGL unavailable');
    }
    this.isSoftwareGl = probe.isSoftwareGl;

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(initialPreset.fogColor);
    this.scene.fog = new THREE.FogExp2(initialPreset.fogColor, initialPreset.fogDensity);

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.5, 240);
    this.camera.position.set(0, 3.8, 12.5);
    this.camera.lookAt(_lookTarget);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = initialPreset.exposure;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    mountEl.appendChild(this.renderer.domElement);

    // Mandatory studio environment reflection map on every device
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Warm/cool 3-point atmospheric lighting rig
    this.hemiLight = new THREE.HemisphereLight(
      initialPreset.hemiSky,
      initialPreset.hemiGround,
      initialPreset.hemiIntensity
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(initialPreset.keyColor, initialPreset.keyIntensity);
    this.keyLight.position.set(16, 28, 14);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.left = -36;
      this.keyLight.shadow.camera.right = 36;
      this.keyLight.shadow.camera.top = 36;
      this.keyLight.shadow.camera.bottom = -36;
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 90;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(initialPreset.rimColor, initialPreset.rimIntensity);
    this.rimLight.position.set(-22, 14, -36);
    this.scene.add(this.rimLight);

    // Sky dome
    this.sky = createSkyDome(initialPreset);
    this.scene.add(this.sky.mesh);
    this.disposables.push(this.sky.geometry, this.sky.material);

    // Terrain & reflective water
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.terrain = createTerrainAndWater(maxAniso);
    this.scene.add(this.terrain.group);
    this.disposables.push(...this.terrain.disposables);

    // Composite telemetry tower landmark on ridge
    this.landmark = createTelemetryTowerLandmark();
    this.scene.add(this.landmark.group);
    this.disposables.push(...this.landmark.disposables);

    // Composite cloud formations
    this.clouds = createCloudBanks(initialPreset);
    this.scene.add(this.clouds.cloudRoot);
    this.disposables.push(...this.clouds.disposables);

    // Instanced rain / snow / ambient particles
    this.particleRig = createInstancedParticles(260);
    this.scene.add(this.particleRig.mesh);
    this.disposables.push(this.particleRig.geometry, this.particleRig.material);

    // Procedural storm lightning rig
    this.lightning = createLightningRig();
    this.scene.add(this.lightning.line);
    this.scene.add(this.lightning.flashLight);
    this.disposables.push(this.lightning.geometry, this.lightning.material);

    // Pre-warm shaders on GPU only (skip on software WebGL)
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTime = performance.now();
    this.elapsed = 0;

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleContextLost = this.handleContextLost.bind(this);
    this.handleContextRestored = this.handleContextRestored.bind(this);
    this.tick = this.tick.bind(this);

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    // Populate initial particle matrices before first render
    this.updateScene(0.016);

    if (this.paused || this.reducedMotion) {
      this.requestRender();
    } else {
      this.tick();
    }
  }

  setTargetPreset(nextPreset) {
    this.targetPreset = nextPreset;
    if (this.paused || this.reducedMotion) {
      this.applyImmediatePreset(nextPreset);
      this.requestRender();
    }
  }

  setPaused(paused) {
    const next = Boolean(paused);
    if (this.paused === next) return;
    this.paused = next;
    this.cancelScheduledFrame();
    if (this.paused || this.reducedMotion) {
      this.requestRender();
    } else {
      this.lastTime = performance.now();
      this.tick();
    }
  }

  triggerLightning() {
    const originX = (Math.random() - 0.5) * 32;
    const originZ = -24 - Math.random() * 18;
    this.lightning.rebuildBolt(originX, originZ);
    this.lightningStrength = 1.0;
    this.lightningTimer = 3.2 + Math.random() * 4.5;
    if (this.paused || this.reducedMotion) {
      this.updateScene(0.016);
      this.requestRender();
    }
  }

  applyImmediatePreset(p) {
    this.scene.fog.color.setHex(p.fogColor);
    this.scene.fog.density = p.fogDensity;
    this.scene.background.setHex(p.fogColor);
    this.sky.material.uniforms.uTopColor.value.setHex(p.skyTop);
    this.sky.material.uniforms.uHorizonColor.value.setHex(p.skyHorizon);
    this.sky.material.uniforms.uGlowColor.value.setHex(p.glowColor);
    this.sky.material.uniforms.uGlowStrength.value = p.glowStrength ?? 0.28;
    this.keyLight.color.setHex(p.keyColor);
    this.keyLight.intensity = p.keyIntensity;
    this.hemiLight.color.setHex(p.hemiSky);
    this.hemiLight.groundColor.setHex(p.hemiGround);
    this.hemiLight.intensity = p.hemiIntensity;
    this.rimLight.color.setHex(p.rimColor);
    this.rimLight.intensity = p.rimIntensity;
    this.clouds.cloudMatPrimary.color.setHex(p.cloudColor);
    this.clouds.cloudMatPrimary.emissive.setHex(p.cloudEmissive);
    this.clouds.cloudMatAccent.color.setHex(p.cloudColor);
    this.clouds.cloudMatAccent.emissive.setHex(p.cloudEmissive);
    this.terrain.waterMat.color.setHex(p.waterColor);
    this.particleRig.material.color.setHex(p.particleColor);
    this.particleRig.material.opacity = p.particleOpacity;
    this.renderer.toneMappingExposure = p.exposure;
  }

  handleResize() {
    if (this.disposed) return;
    const width = this.mountEl.clientWidth || window.innerWidth;
    const height = this.mountEl.clientHeight || window.innerHeight;
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.paused || this.reducedMotion) {
      this.requestRender();
    }
  }

  handlePointerMove(e) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.pointerX = (e.clientX / w - 0.5) * 2;
    this.pointerY = (e.clientY / h - 0.5) * 2;
  }

  handleContextLost(e) {
    e.preventDefault();
    this.cancelScheduledFrame();
  }

  handleContextRestored() {
    if (!this.disposed) {
      this.lastTime = performance.now();
      if (this.paused || this.reducedMotion) {
        this.requestRender();
      } else {
        this.tick();
      }
    }
  }

  cancelScheduledFrame() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    }
  }

  afterDraw(cb) {
    if (this.disposed) return;
    const gl = this.renderer.getContext();
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  requestRender() {
    if (this.disposed) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      this.renderer.render(this.scene, this.camera);
      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty && !this.disposed) {
          this.requestRender();
        }
      };
      if (this.isSoftwareGl) {
        this.afterDraw(done);
      } else {
        done();
      }
    });
  }

  updateScene(dt) {
    const p = this.targetPreset;
    const colorRate = 1 - Math.exp(-2.8 * dt);
    this.elapsed += dt;

    // Smoothly damp colors, lighting, fog, and exposure
    _scratchColor.setHex(p.fogColor);
    this.scene.fog.color.lerp(_scratchColor, colorRate);
    this.scene.background.lerp(_scratchColor, colorRate);
    this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, p.fogDensity, 2.5, dt);

    _scratchColor.setHex(p.skyTop);
    this.sky.material.uniforms.uTopColor.value.lerp(_scratchColor, colorRate);
    _scratchColor.setHex(p.skyHorizon);
    this.sky.material.uniforms.uHorizonColor.value.lerp(_scratchColor, colorRate);
    _scratchColor.setHex(p.glowColor);
    this.sky.material.uniforms.uGlowColor.value.lerp(_scratchColor, colorRate);
    this.sky.material.uniforms.uGlowStrength.value = THREE.MathUtils.damp(
      this.sky.material.uniforms.uGlowStrength.value,
      p.glowStrength ?? 0.28,
      2.5,
      dt
    );

    _scratchColor.setHex(p.keyColor);
    this.keyLight.color.lerp(_scratchColor, colorRate);
    this.keyLight.intensity = THREE.MathUtils.damp(this.keyLight.intensity, p.keyIntensity, 2.5, dt);

    _scratchColor.setHex(p.hemiSky);
    _scratchColorB.setHex(p.hemiGround);
    this.hemiLight.color.lerp(_scratchColor, colorRate);
    this.hemiLight.groundColor.lerp(_scratchColorB, colorRate);
    this.hemiLight.intensity = THREE.MathUtils.damp(this.hemiLight.intensity, p.hemiIntensity, 2.5, dt);

    _scratchColor.setHex(p.rimColor);
    this.rimLight.color.lerp(_scratchColor, colorRate);
    this.rimLight.intensity = THREE.MathUtils.damp(this.rimLight.intensity, p.rimIntensity, 2.5, dt);

    _scratchColor.setHex(p.cloudColor);
    _scratchColorB.setHex(p.cloudEmissive);
    this.clouds.cloudMatPrimary.color.lerp(_scratchColor, colorRate);
    this.clouds.cloudMatPrimary.emissive.lerp(_scratchColorB, colorRate);
    this.clouds.cloudMatAccent.color.lerp(_scratchColor, colorRate);
    this.clouds.cloudMatAccent.emissive.lerp(_scratchColorB, colorRate);

    _scratchColor.setHex(p.waterColor);
    this.terrain.waterMat.color.lerp(_scratchColor, colorRate);
    this.terrain.waterBump.offset.x = (this.terrain.waterBump.offset.x + dt * 0.03) % 1;
    this.terrain.waterBump.offset.y = (this.terrain.waterBump.offset.y + dt * 0.018) % 1;

    _scratchColor.setHex(p.particleColor);
    this.particleRig.material.color.lerp(_scratchColor, colorRate);
    this.particleRig.material.opacity = THREE.MathUtils.damp(
      this.particleRig.material.opacity,
      p.particleOpacity,
      3.0,
      dt
    );
    this.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.renderer.toneMappingExposure,
      p.exposure,
      2.2,
      dt
    );

    // Drift composite cloud formations
    for (let i = 0; i < this.clouds.clusters.length; i++) {
      const c = this.clouds.clusters[i];
      c.group.position.x += p.cloudDriftSpeed * c.speed * dt;
      if (c.group.position.x > 40) {
        c.group.position.x = -40;
      }
      const targetY = c.baseY + p.cloudElevation + Math.sin(this.elapsed * 0.35 + c.phase) * 0.3;
      c.group.position.y = THREE.MathUtils.damp(c.group.position.y, targetY, 2.0, dt);
      const targetScale = c.baseScale * p.cloudScale;
      const nextScale = THREE.MathUtils.damp(c.group.scale.x, targetScale, 2.0, dt);
      c.group.scale.setScalar(nextScale);
    }

    // Update instanced particles (rain streaks / snowflakes / ambient motes) with zero allocations
    const { mesh, particles } = this.particleRig;
    const mode = p.particleMode;
    const tilt = mode === 'rain' ? p.windTilt : 0;

    for (let i = 0; i < particles.length; i++) {
      const pt = particles[i];
      if (mode === 'rain') {
        pt.y -= p.particleSpeed * pt.speedFactor * dt;
        pt.x += p.particleSpeed * tilt * pt.speedFactor * dt;
        if (pt.y < -3) {
          pt.y = 22 + Math.random() * 4;
          pt.x = (Math.random() - 0.5) * 64;
        }
        _scratchPos.set(pt.x, pt.y, pt.z);
        _scratchEuler.set(0, 0, -tilt);
        _scratchQuat.setFromEuler(_scratchEuler);
        _scratchScale.set(0.65, 1.35 * pt.scale, 0.65);
      } else if (mode === 'snow') {
        pt.y -= p.particleSpeed * pt.speedFactor * dt;
        pt.x += Math.sin(this.elapsed * 1.1 + pt.phase) * 1.15 * dt;
        if (pt.y < -3) {
          pt.y = 22 + Math.random() * 3;
          pt.x = (Math.random() - 0.5) * 64;
        }
        _scratchPos.set(pt.x, pt.y, pt.z);
        _scratchEuler.set(this.elapsed + pt.phase, this.elapsed * 0.7, pt.phase);
        _scratchQuat.setFromEuler(_scratchEuler);
        const s = 2.6 * pt.scale;
        _scratchScale.set(s, 0.16 * s, s);
      } else {
        // Gentle drifting atmospheric motes
        pt.y += Math.sin(this.elapsed * 0.6 + pt.phase) * 0.35 * dt;
        pt.x += Math.cos(this.elapsed * 0.4 + pt.phase) * 0.45 * dt;
        if (pt.y > 23) pt.y = 0;
        if (pt.y < -2) pt.y = 20;
        _scratchPos.set(pt.x, pt.y, pt.z);
        _scratchQuat.identity();
        const s = 1.65 * pt.scale;
        _scratchScale.set(s, 0.12 * s, s);
      }
      _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
      mesh.setMatrixAt(i, _scratchMatrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Storm lightning simulation
    if (p.lightningEnabled) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        const originX = (Math.random() - 0.5) * 34;
        const originZ = -24 - Math.random() * 18;
        this.lightning.rebuildBolt(originX, originZ);
        this.lightningStrength = 0.95;
        this.lightningTimer = 3.8 + Math.random() * 5.2;
      }
    }
    if (this.lightningStrength > 0.001) {
      this.lightningStrength = Math.max(0, this.lightningStrength - dt * 4.4);
      this.lightning.material.opacity = Math.min(1, this.lightningStrength * 1.2);
      this.lightning.flashLight.intensity = this.lightningStrength * 65;
      this.sky.material.uniforms.uFlash.value = this.lightningStrength;
    } else {
      this.lightning.material.opacity = 0;
      this.lightning.flashLight.intensity = 0;
      this.sky.material.uniforms.uFlash.value = 0;
    }

    // Damped pointer parallax camera motion
    const targetCamX = this.pointerX * 2.1 + Math.sin(this.elapsed * 0.14) * 0.45;
    const targetCamY = -this.pointerY * 0.95 + Math.cos(this.elapsed * 0.18) * 0.22;
    this.camOffsetX = THREE.MathUtils.damp(this.camOffsetX, targetCamX, 3.2, dt);
    this.camOffsetY = THREE.MathUtils.damp(this.camOffsetY, targetCamY, 3.2, dt);

    this.camera.position.set(this.camOffsetX, 3.8 + this.camOffsetY, 12.5);
    this.camera.lookAt(_lookTarget);
  }

  tick() {
    if (this.disposed || this.paused || this.reducedMotion) return;
    const now = performance.now();
    const dt = Math.min(0.08, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.updateScene(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  dispose() {
    this.disposed = true;
    this.cancelScheduledFrame();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    for (const item of this.disposables) {
      if (item && typeof item.dispose === 'function') {
        item.dispose();
      }
    }
    if (this.envRenderTarget) {
      this.envRenderTarget.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.mountEl) {
      this.mountEl.removeChild(this.renderer.domElement);
    }
  }
}
