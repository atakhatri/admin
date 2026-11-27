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

function seededRand(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
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
      const val = Math.min(
        255,
        Math.max(0, Math.round((n1 * 0.55 + n2 * 0.3 + n3 * 0.25) * 255 * contrast))
      );
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

function createTerrainAlbedoTexture(size = 256, maxAnisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Bright natural grass/moss texture (multiplied by terrain vertex colors)
  ctx.fillStyle = '#c8dcc0';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1600; i++) {
    const x = seededRand(i * 3.1) * size;
    const y = seededRand(i * 7.3) * size;
    const r = 1.4 + seededRand(i * 11.7) * 5.2;
    const tone = seededRand(i * 17.9);
    if (tone < 0.45) {
      ctx.fillStyle = 'rgba(72, 134, 62, 0.24)';
    } else if (tone < 0.8) {
      ctx.fillStyle = 'rgba(176, 214, 132, 0.22)';
    } else {
      ctx.fillStyle = 'rgba(110, 98, 72, 0.18)';
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine directional grass & soil strokes
  ctx.lineWidth = 1;
  for (let j = 0; j < 750; j++) {
    const x = seededRand(j * 5.9 + 90) * size;
    const y = seededRand(j * 9.1 + 40) * size;
    const len = 3 + seededRand(j * 13.3) * 6;
    ctx.strokeStyle =
      j % 3 === 0 ? 'rgba(54, 108, 48, 0.26)' : 'rgba(202, 228, 162, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (seededRand(j * 19.7) - 0.5) * 3, y - len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createWaterAlbedoTexture(size = 256, maxAnisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  // Tileable sunlit turquoise-sapphire water caustics & wind bands
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const w1 = Math.sin(u * 3 + Math.sin(v * 2) * 1.4) * 0.5 + 0.5;
      const w2 = Math.cos(v * 5 - u * 2 + Math.cos(u * 3)) * 0.5 + 0.5;
      const w3 = Math.sin((u + v) * 8) * 0.5 + 0.5;
      const caustic = Math.pow(w1 * 0.48 + w2 * 0.34 + w3 * 0.18, 1.35);
      const idx = (y * size + x) * 4;
      data[idx] = Math.round(28 + caustic * 92);
      data[idx + 1] = Math.round(134 + caustic * 92);
      data[idx + 2] = Math.round(192 + caustic * 60);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 7);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createFacadeAlbedoTexture(size = 256, maxAnisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Warm architectural plaster & stone courses (neutral bright for tinting)
  ctx.fillStyle = '#e8e2d8';
  ctx.fillRect(0, 0, size, size);

  // Subtle horizontal concrete/masonry panels
  const rows = 8;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const shade = 224 + Math.round((seededRand(r * 4.7) - 0.5) * 18);
    ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 10})`;
    ctx.fillRect(0, r * rowH, size, rowH - 1);
    ctx.fillStyle = 'rgba(70, 64, 56, 0.2)';
    ctx.fillRect(0, (r + 1) * rowH - 1.5, size, 1.5);
  }

  // Fine masonry grain
  for (let i = 0; i < 1200; i++) {
    const x = seededRand(i * 2.7 + 12) * size;
    const y = seededRand(i * 6.1 + 5) * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(65, 58, 50, 0.08)' : 'rgba(255, 252, 245, 0.1)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createFoliageTexture(size = 128, maxAnisotropy = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#b9dfb2';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 650; i++) {
    const x = seededRand(i * 4.3) * size;
    const y = seededRand(i * 8.9) * size;
    const r = 1.5 + seededRand(i * 12.1) * 4;
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(42, 98, 48, 0.35)'
        : i % 3 === 1
        ? 'rgba(130, 198, 102, 0.28)'
        : 'rgba(26, 72, 38, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
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

function createTerrainAndWater(maxAnisotropy, initialPreset) {
  const disposables = [];
  const group = new THREE.Group();

  const terrainGeo = new THREE.PlaneGeometry(180, 140, 68, 54);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);

  const colLakebed = new THREE.Color(0x1e5c6b);
  const colShore = new THREE.Color(0xab9c72);
  const colMeadow = new THREE.Color(0x379941);
  const colLushHill = new THREE.Color(0x237a35);
  const colHighRock = new THREE.Color(0x4d734f);
  const colSummit = new THREE.Color(0x687b72);
  const vCol = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i) - 24;
    const y = terrainHeightAt(x, z);
    posAttr.setZ(i, z);
    posAttr.setY(i, y);

    // Organic elevation-driven biome coloring
    const patch = (Math.sin(x * 0.17) * Math.cos(z * 0.19) + 1) * 0.5;
    if (y < -2.42) {
      vCol.copy(colLakebed);
    } else if (y < -1.85) {
      const t = (y + 2.42) / 0.57;
      vCol.copy(colShore).lerp(colMeadow, t * 0.85);
    } else if (y < 1.6) {
      const t = (y + 1.85) / 3.45;
      vCol.copy(colMeadow).lerp(colLushHill, Math.min(1, t * 0.72 + patch * 0.28));
    } else if (y < 4.5) {
      const t = (y - 1.6) / 2.9;
      vCol.copy(colLushHill).lerp(colHighRock, t);
    } else {
      const t = Math.min(1, (y - 4.5) / 3.5);
      vCol.copy(colHighRock).lerp(colSummit, t * 0.75);
    }
    colors[i * 3] = vCol.r;
    colors[i * 3 + 1] = vCol.g;
    colors[i * 3 + 2] = vCol.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
  disposables.push(terrainGeo);

  const terrainAlbedo = createTerrainAlbedoTexture(256, maxAnisotropy);
  const terrainBump = createProceduralNoiseTexture(128, 0.95, false);
  terrainBump.repeat.set(12, 10);
  terrainBump.anisotropy = maxAnisotropy;
  disposables.push(terrainAlbedo, terrainBump);

  const terrainMat = new THREE.MeshStandardMaterial({
    color: initialPreset.terrainTint ?? 0xffffff,
    vertexColors: true,
    map: terrainAlbedo,
    roughness: 0.88,
    metalness: 0.04,
    bumpMap: terrainBump,
    bumpScale: 0.42,
  });
  disposables.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Rich, saturated reflective water basin (offset cleanly above basin floor)
  const waterGeo = new THREE.CircleGeometry(37, 56);
  waterGeo.rotateX(-Math.PI / 2);
  disposables.push(waterGeo);

  const waterAlbedo = createWaterAlbedoTexture(256, maxAnisotropy);
  const waterBump = createProceduralNoiseTexture(128, 1.0, false);
  waterBump.repeat.set(9, 8);
  waterBump.anisotropy = maxAnisotropy;
  disposables.push(waterAlbedo, waterBump);

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: initialPreset.waterColor ?? 0x1688cf,
    map: waterAlbedo,
    emissive: 0x0a4468,
    emissiveIntensity: 0.28,
    roughness: 0.24,
    metalness: 0.05,
    clearcoat: 0.42,
    clearcoatRoughness: 0.18,
    reflectivity: 0.55,
    envMapIntensity: 0.42,
    bumpMap: waterBump,
    bumpScale: 0.26,
  });
  disposables.push(waterMat);

  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, -2.52, -8);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  return { group, terrainMat, waterMat, waterAlbedo, waterBump, disposables };
}

// Building placement coordinates (shared with forest generator to prevent overlapping trees)
const BUILDING_SITES = [
  { x: 18, z: -33, radius: 4.5 }, // Telemetry tower
  { x: -17.5, z: -23.5, radius: 5.0 }, // Coastal modernist villa
  { x: -24.5, z: -29.5, radius: 4.6 }, // Hillside gabled studio
  { x: -10.5, z: -37.0, radius: 4.8 }, // Terraced valley block
  { x: 12.2, z: -26.5, radius: 4.6 }, // Lakeside observatory pavilion
  { x: 24.0, z: -30.5, radius: 5.0 }, // Ridge research annex
  { x: 5.2, z: -40.5, radius: 4.5 }, // Far highland residence
];

function createForestTrees(maxAnisotropy) {
  const disposables = [];
  const forestGroup = new THREE.Group();

  // Collect grounded candidate tree coordinates on land outside the water basin & building pads
  const placements = [];
  for (let i = 0; i < 340 && placements.length < 92; i++) {
    const rx = seededRand(i * 11.3 + 7);
    const rz = seededRand(i * 19.7 + 13);
    const x = -46 + rx * 92;
    const z = -54 + rz * 44; // -54 to -10

    const distToWaterCenter = Math.hypot(x, z + 8);
    if (distToWaterCenter < 20.5) continue;

    const y = terrainHeightAt(x, z);
    if (y < -1.75) continue;

    // Keep immediate foreground camera lane open
    if (z > -16 && Math.abs(x) < 14) continue;

    // Keep clear of buildings and telemetry tower
    let blocked = false;
    for (let b = 0; b < BUILDING_SITES.length; b++) {
      const site = BUILDING_SITES[b];
      if (Math.hypot(x - site.x, z - site.z) < site.radius) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    // Minimum spacing between trees for natural clusters without clipping
    for (let p = 0; p < placements.length; p++) {
      if (Math.hypot(x - placements[p].x, z - placements[p].z) < 2.25) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    placements.push({
      x,
      y,
      z,
      scale: 0.78 + seededRand(i * 23.1) * 0.52,
      rotY: seededRand(i * 29.3) * Math.PI * 2,
      leanX: (seededRand(i * 31.7) - 0.5) * 0.08,
      leanZ: (seededRand(i * 37.9) - 0.5) * 0.08,
      tintPick: seededRand(i * 41.1),
    });
  }

  const count = placements.length;
  const foliageTex = createFoliageTexture(128, maxAnisotropy);
  const barkBump = createProceduralNoiseTexture(64, 0.9, false);
  disposables.push(foliageTex, barkBump);

  // Composite 4-part instanced conifer tree (trunk + 3 tiered foliage crowns)
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.24, 1.45, 7);
  const lowTierGeo = new THREE.ConeGeometry(1.18, 1.85, 8);
  const midTierGeo = new THREE.ConeGeometry(0.92, 1.65, 8);
  const topTierGeo = new THREE.ConeGeometry(0.62, 1.35, 7);
  disposables.push(trunkGeo, lowTierGeo, midTierGeo, topTierGeo);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x61422d,
    roughness: 0.94,
    metalness: 0.02,
    bumpMap: barkBump,
    bumpScale: 0.16,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: foliageTex,
    roughness: 0.78,
    metalness: 0.02,
    bumpMap: barkBump,
    bumpScale: 0.12,
  });
  disposables.push(trunkMat, foliageMat);

  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const lowMesh = new THREE.InstancedMesh(lowTierGeo, foliageMat, count);
  const midMesh = new THREE.InstancedMesh(midTierGeo, foliageMat, count);
  const topMesh = new THREE.InstancedMesh(topTierGeo, foliageMat, count);
  trunkMesh.castShadow = true;
  lowMesh.castShadow = true;
  midMesh.castShadow = true;

  const foliagePalette = [
    new THREE.Color(0x216e3a), // Deep pine
    new THREE.Color(0x2f8743), // Lush forest green
    new THREE.Color(0x3f994a), // Sunlit emerald
    new THREE.Color(0x267545), // Spruce teal-green
    new THREE.Color(0x4c913f), // Meadow olive-green
  ];
  const crownTint = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const tr = placements[i];
    const s = tr.scale;
    const baseY = tr.y - 0.18;

    _scratchEuler.set(tr.leanX, tr.rotY, tr.leanZ);
    _scratchQuat.setFromEuler(_scratchEuler);

    // 1. Trunk
    _scratchPos.set(tr.x, baseY + 0.72 * s, tr.z);
    _scratchScale.set(s, s, s);
    _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
    trunkMesh.setMatrixAt(i, _scratchMatrix);

    // 2. Lower tier
    _scratchPos.set(tr.x, baseY + 1.85 * s, tr.z);
    _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
    lowMesh.setMatrixAt(i, _scratchMatrix);

    // 3. Mid tier
    _scratchPos.set(tr.x, baseY + 2.85 * s, tr.z);
    _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
    midMesh.setMatrixAt(i, _scratchMatrix);

    // 4. Upper crown
    _scratchPos.set(tr.x, baseY + 3.72 * s, tr.z);
    _scratchMatrix.compose(_scratchPos, _scratchQuat, _scratchScale);
    topMesh.setMatrixAt(i, _scratchMatrix);

    const basePaletteCol =
      foliagePalette[Math.floor(tr.tintPick * foliagePalette.length) % foliagePalette.length];
    lowMesh.setColorAt(i, basePaletteCol);
    crownTint.copy(basePaletteCol).offsetHSL(0.008, 0.03, 0.04);
    midMesh.setColorAt(i, crownTint);
    crownTint.copy(basePaletteCol).offsetHSL(0.014, 0.05, 0.08);
    topMesh.setColorAt(i, crownTint);
  }

  for (const m of [trunkMesh, lowMesh, midMesh, topMesh]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    forestGroup.add(m);
  }

  return { group: forestGroup, disposables };
}

function createHillsideBuildings(maxAnisotropy, initialPreset) {
  const disposables = [];
  const buildingsGroup = new THREE.Group();

  const facadeTex = createFacadeAlbedoTexture(256, maxAnisotropy);
  const facadeBump = createProceduralNoiseTexture(128, 0.85, false);
  facadeBump.repeat.set(2, 2);
  disposables.push(facadeTex, facadeBump);

  const foundationMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.92,
    metalness: 0.06,
    bumpMap: facadeBump,
    bumpScale: 0.14,
  });
  const wallWarmMat = new THREE.MeshStandardMaterial({
    color: 0xe6d8c3,
    map: facadeTex,
    roughness: 0.82,
    metalness: 0.05,
    bumpMap: facadeBump,
    bumpScale: 0.12,
  });
  const wallTerracottaMat = new THREE.MeshStandardMaterial({
    color: 0xc97b5d,
    map: facadeTex,
    roughness: 0.84,
    metalness: 0.04,
    bumpMap: facadeBump,
    bumpScale: 0.14,
  });
  const wallSlateMat = new THREE.MeshStandardMaterial({
    color: 0xb6c7d4,
    map: facadeTex,
    roughness: 0.78,
    metalness: 0.1,
    bumpMap: facadeBump,
    bumpScale: 0.1,
  });
  const roofSlateMat = new THREE.MeshStandardMaterial({
    color: 0x35495c,
    roughness: 0.48,
    metalness: 0.34,
  });
  const roofClayMat = new THREE.MeshStandardMaterial({
    color: 0x9c4632,
    roughness: 0.56,
    metalness: 0.12,
  });
  const trimMetalMat = new THREE.MeshStandardMaterial({
    color: 0x7c8d9e,
    roughness: 0.32,
    metalness: 0.72,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd584,
    emissive: 0xff9a24,
    emissiveIntensity: initialPreset.windowGlow ?? 1.2,
    roughness: 0.16,
    metalness: 0.12,
  });

  disposables.push(
    foundationMat,
    wallWarmMat,
    wallTerracottaMat,
    wallSlateMat,
    roofSlateMat,
    roofClayMat,
    trimMetalMat,
    windowMat
  );

  // Shared geometries for composite buildings
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const gableGeo = new THREE.ConeGeometry(0.78, 1.0, 4);
  gableGeo.rotateY(Math.PI / 4);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 14);
  disposables.push(unitBoxGeo, gableGeo, cylGeo);

  const addPart = (parent, geo, mat, px, py, pz, sx, sy, sz, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.scale.set(sx, sy, sz);
    m.castShadow = cast;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  // 1. Left-mid coastal modernist villa / studio
  {
    const b = new THREE.Group();
    const x = -17.5;
    const z = -23.5;
    const gy = terrainHeightAt(x, z);
    addPart(b, unitBoxGeo, foundationMat, 0, -0.5, 0, 4.4, 2.0, 3.3, false);
    addPart(b, unitBoxGeo, wallWarmMat, 0, 1.35, 0, 4.0, 1.9, 2.9);
    addPart(b, unitBoxGeo, windowMat, 0, 1.45, 1.46, 3.2, 0.72, 0.08, false);
    addPart(b, unitBoxGeo, windowMat, 2.01, 1.45, 0, 0.08, 0.72, 1.9, false);
    addPart(b, unitBoxGeo, roofSlateMat, 0, 2.42, 0.15, 4.5, 0.24, 3.5);
    addPart(b, unitBoxGeo, wallSlateMat, -0.85, 3.05, -0.25, 1.9, 1.1, 1.8);
    addPart(b, unitBoxGeo, windowMat, -0.85, 3.08, 0.67, 1.35, 0.48, 0.07, false);
    addPart(b, unitBoxGeo, trimMetalMat, -0.85, 3.66, -0.25, 2.1, 0.14, 2.0);
    b.position.set(x, gy, z);
    b.rotation.y = 0.42;
    buildingsGroup.add(b);
  }

  // 2. Left-slope gabled hillside atelier
  {
    const b = new THREE.Group();
    const x = -24.5;
    const z = -29.5;
    const gy = terrainHeightAt(x, z);
    addPart(b, unitBoxGeo, foundationMat, 0, -0.55, 0, 3.5, 2.1, 3.1, false);
    addPart(b, unitBoxGeo, wallTerracottaMat, 0, 1.4, 0, 3.2, 2.0, 2.8);
    addPart(b, gableGeo, roofClayMat, 0, 3.15, 0, 3.55, 1.55, 3.15);
    addPart(b, unitBoxGeo, foundationMat, 0.9, 3.35, -0.5, 0.42, 1.25, 0.42);
    addPart(b, unitBoxGeo, windowMat, -0.75, 1.45, 1.42, 0.78, 0.72, 0.08, false);
    addPart(b, unitBoxGeo, windowMat, 0.75, 1.45, 1.42, 0.78, 0.72, 0.08, false);
    b.position.set(x, gy, z);
    b.rotation.y = 0.58;
    buildingsGroup.add(b);
  }

  // 3. Left-far terraced valley low-rise block
  {
    const b = new THREE.Group();
    const x = -10.5;
    const z = -37.0;
    const gy = terrainHeightAt(x, z);
    addPart(b, unitBoxGeo, foundationMat, 0, -0.6, 0, 4.8, 2.2, 3.2, false);
    addPart(b, unitBoxGeo, wallSlateMat, 0, 1.9, 0, 4.4, 3.0, 2.8);
    addPart(b, unitBoxGeo, windowMat, 0, 1.35, 1.42, 3.5, 0.42, 0.08, false);
    addPart(b, unitBoxGeo, windowMat, 0, 2.45, 1.42, 3.5, 0.42, 0.08, false);
    addPart(b, unitBoxGeo, roofSlateMat, 0, 3.5, 0, 4.7, 0.24, 3.1);
    addPart(b, unitBoxGeo, trimMetalMat, 1.1, 3.92, -0.3, 1.2, 0.65, 1.1);
    b.position.set(x, gy, z);
    b.rotation.y = 0.18;
    buildingsGroup.add(b);
  }

  // 4. Right-mid lakeside observatory pavilion
  {
    const b = new THREE.Group();
    const x = 12.2;
    const z = -26.5;
    const gy = terrainHeightAt(x, z);
    addPart(b, cylGeo, foundationMat, 0, -0.5, 0, 2.0, 2.0, 2.0, false);
    addPart(b, cylGeo, wallWarmMat, 0, 1.5, 0, 1.75, 2.2, 1.75);
    addPart(b, cylGeo, windowMat, 0, 1.85, 0, 1.79, 0.58, 1.79, false);
    addPart(b, cylGeo, roofSlateMat, 0, 2.75, 0, 2.15, 0.28, 2.15);
    addPart(b, cylGeo, trimMetalMat, 0, 3.22, 0, 0.85, 0.72, 0.85);
    b.position.set(x, gy, z);
    buildingsGroup.add(b);
  }

  // 5. Right-ridge research annex near telemetry tower
  {
    const b = new THREE.Group();
    const x = 24.0;
    const z = -30.5;
    const gy = terrainHeightAt(x, z);
    addPart(b, unitBoxGeo, foundationMat, 0, -0.6, 0, 4.6, 2.2, 3.4, false);
    addPart(b, unitBoxGeo, wallSlateMat, 0, 1.65, 0, 4.2, 2.5, 3.0);
    addPart(b, unitBoxGeo, wallTerracottaMat, -1.0, 3.4, -0.2, 2.0, 1.25, 2.2);
    addPart(b, unitBoxGeo, windowMat, 0.1, 1.8, 1.52, 3.3, 0.52, 0.08, false);
    addPart(b, unitBoxGeo, windowMat, -1.0, 3.45, 0.92, 1.45, 0.45, 0.08, false);
    addPart(b, unitBoxGeo, roofSlateMat, 0, 2.98, 0, 4.5, 0.2, 3.3);
    addPart(b, unitBoxGeo, trimMetalMat, -1.0, 4.12, -0.2, 2.2, 0.18, 2.4);
    b.position.set(x, gy, z);
    b.rotation.y = -0.45;
    buildingsGroup.add(b);
  }

  // 6. Far center-right ridge house
  {
    const b = new THREE.Group();
    const x = 5.2;
    const z = -40.5;
    const gy = terrainHeightAt(x, z);
    addPart(b, unitBoxGeo, foundationMat, 0, -0.55, 0, 3.4, 2.0, 2.8, false);
    addPart(b, unitBoxGeo, wallWarmMat, 0, 1.35, 0, 3.1, 1.9, 2.5);
    addPart(b, gableGeo, roofClayMat, 0, 3.05, 0, 3.4, 1.45, 2.85);
    addPart(b, unitBoxGeo, windowMat, -0.68, 1.4, 1.27, 0.72, 0.65, 0.08, false);
    addPart(b, unitBoxGeo, windowMat, 0.68, 1.4, 1.27, 0.72, 0.65, 0.08, false);
    b.position.set(x, gy, z);
    b.rotation.y = -0.22;
    buildingsGroup.add(b);
  }

  return { group: buildingsGroup, windowMat, disposables };
}

function createTelemetryTowerLandmark() {
  // Composite 8-part architectural weather & telemetry relay spire grounded on ridge
  const disposables = [];
  const tower = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x4b5c69,
    roughness: 0.86,
    metalness: 0.08,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x8ea6b8,
    roughness: 0.3,
    metalness: 0.76,
  });
  const radomeMat = new THREE.MeshStandardMaterial({
    color: 0xe6f2fc,
    roughness: 0.2,
    metalness: 0.12,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.1,
  });
  disposables.push(concreteMat, steelMat, radomeMat, beaconMat);

  // 1. Stepped foundation plinth (extends below y = 0 so it sits flush on ridge)
  const baseGeo = new THREE.BoxGeometry(2.6, 1.8, 2.6);
  const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
  baseMesh.position.y = 0.0;
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
    this.terrain = createTerrainAndWater(maxAniso, initialPreset);
    this.scene.add(this.terrain.group);
    this.disposables.push(...this.terrain.disposables);

    // Instanced composite forest trees grounded on surrounding hills
    this.forest = createForestTrees(maxAniso);
    this.scene.add(this.forest.group);
    this.disposables.push(...this.forest.disposables);

    // Composite hillside architectural buildings
    this.buildings = createHillsideBuildings(maxAniso, initialPreset);
    this.scene.add(this.buildings.group);
    this.disposables.push(...this.buildings.disposables);

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
    this.terrain.terrainMat.color.setHex(p.terrainTint ?? 0xffffff);
    this.terrain.waterMat.color.setHex(p.waterColor);
    if (this.buildings) {
      this.buildings.windowMat.emissiveIntensity = p.windowGlow ?? 1.0;
    }
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

    _scratchColor.setHex(p.terrainTint ?? 0xffffff);
    this.terrain.terrainMat.color.lerp(_scratchColor, colorRate);
    _scratchColor.setHex(p.waterColor);
    this.terrain.waterMat.color.lerp(_scratchColor, colorRate);
    this.terrain.waterBump.offset.x = (this.terrain.waterBump.offset.x + dt * 0.028) % 1;
    this.terrain.waterBump.offset.y = (this.terrain.waterBump.offset.y + dt * 0.016) % 1;
    this.terrain.waterAlbedo.offset.x = (this.terrain.waterAlbedo.offset.x - dt * 0.012 + 1) % 1;
    this.terrain.waterAlbedo.offset.y = (this.terrain.waterAlbedo.offset.y + dt * 0.009) % 1;
    if (this.buildings) {
      this.buildings.windowMat.emissiveIntensity = THREE.MathUtils.damp(
        this.buildings.windowMat.emissiveIntensity,
        p.windowGlow ?? 1.0,
        2.4,
        dt
      );
    }

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
