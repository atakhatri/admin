export const ATMOSPHERE_MODES = [
  { id: 'live', label: 'Live' },
  { id: 'storm', label: 'Storm' },
  { id: 'rain', label: 'Rain' },
  { id: 'cloudy', label: 'Cloudy' },
  { id: 'clear', label: 'Clear' },
  { id: 'snow', label: 'Snow' },
];

export function terrainHeightAt(x, z) {
  // Deterministic layered hills with a calm central basin for the reflective water plane
  const dist = Math.hypot(x, z + 6);
  const basinMask = Math.min(1, Math.max(0, (dist - 16) / 26));
  const ridgeA = Math.sin(x * 0.065 + 0.5) * Math.cos(z * 0.055 - 0.3) * 5.2;
  const ridgeB = Math.sin(x * 0.14 - z * 0.11) * 1.9;
  const farPeak = Math.max(0, -z - 22) * 0.14;
  return -3.2 + basinMask * (ridgeA + ridgeB + farPeak + 3.4);
}

const BASE_PRESETS = {
  storm: {
    label: 'Storm',
    skyTop: 0x05111b,
    skyHorizon: 0x0f2736,
    glowColor: 0x38bdf8,
    fogColor: 0x0a1c28,
    fogDensity: 0.017,
    keyColor: 0x9ec5e8,
    keyIntensity: 1.15,
    hemiSky: 0x355c78,
    hemiGround: 0x09161f,
    hemiIntensity: 0.9,
    rimColor: 0x5cc8ff,
    rimIntensity: 0.95,
    cloudColor: 0x203242,
    cloudEmissive: 0x0a1a28,
    cloudScale: 1.18,
    cloudElevation: 0.0,
    cloudDriftSpeed: 1.35,
    particleMode: 'rain',
    particleSpeed: 28,
    particleOpacity: 0.58,
    particleColor: 0xbfe6ff,
    lightningEnabled: true,
    waterColor: 0x071a26,
    exposure: 1.05,
  },
  rain: {
    label: 'Rain',
    skyTop: 0x0a1d2d,
    skyHorizon: 0x1c3a4d,
    glowColor: 0x7dd3fc,
    fogColor: 0x132b3b,
    fogDensity: 0.016,
    keyColor: 0xc2d9ea,
    keyIntensity: 1.25,
    hemiSky: 0x4c7491,
    hemiGround: 0x0e1d26,
    hemiIntensity: 0.95,
    rimColor: 0x7dd3fc,
    rimIntensity: 0.75,
    cloudColor: 0x31495c,
    cloudEmissive: 0x0e1d29,
    cloudScale: 1.08,
    cloudElevation: 0.5,
    cloudDriftSpeed: 1.05,
    particleMode: 'rain',
    particleSpeed: 22,
    particleOpacity: 0.45,
    particleColor: 0xd0edff,
    lightningEnabled: false,
    waterColor: 0x0a2130,
    exposure: 1.08,
  },
  cloudy: {
    label: 'Cloudy',
    skyTop: 0x102438,
    skyHorizon: 0x2e4c63,
    glowColor: 0xfde68a,
    fogColor: 0x1c3448,
    fogDensity: 0.0135,
    keyColor: 0xffe4bd,
    keyIntensity: 1.45,
    hemiSky: 0x6c90ad,
    hemiGround: 0x15242d,
    hemiIntensity: 1.05,
    rimColor: 0x93c5fd,
    rimIntensity: 0.65,
    cloudColor: 0x5c7386,
    cloudEmissive: 0x162430,
    cloudScale: 1.02,
    cloudElevation: 1.4,
    cloudDriftSpeed: 0.65,
    particleMode: 'ambient',
    particleSpeed: 1.4,
    particleOpacity: 0.28,
    particleColor: 0xe2f1ff,
    lightningEnabled: false,
    waterColor: 0x102a3c,
    exposure: 1.1,
  },
  fog: {
    label: 'Mist',
    skyTop: 0x162936,
    skyHorizon: 0x3f5b6b,
    glowColor: 0xcbd5e1,
    fogColor: 0x273f4d,
    fogDensity: 0.024,
    keyColor: 0xe2e8f0,
    keyIntensity: 1.15,
    hemiSky: 0x7c97a8,
    hemiGround: 0x16242c,
    hemiIntensity: 1.05,
    rimColor: 0xbae6fd,
    rimIntensity: 0.55,
    cloudColor: 0x647b8c,
    cloudEmissive: 0x1c2c38,
    cloudScale: 1.12,
    cloudElevation: -1.1,
    cloudDriftSpeed: 0.42,
    particleMode: 'ambient',
    particleSpeed: 0.9,
    particleOpacity: 0.34,
    particleColor: 0xdbeafe,
    lightningEnabled: false,
    waterColor: 0x152c3a,
    exposure: 1.06,
  },
  clear: {
    label: 'Clear',
    skyTop: 0x2684e5,
    skyHorizon: 0xa6e1ff,
    glowColor: 0xfff5c4,
    glowStrength: 0.72,
    fogColor: 0x72c2f0,
    fogDensity: 0.0062,
    keyColor: 0xfff7e0,
    keyIntensity: 2.85,
    hemiSky: 0xd6f2ff,
    hemiGround: 0x2d5e78,
    hemiIntensity: 1.55,
    rimColor: 0xfff3b0,
    rimIntensity: 1.15,
    cloudColor: 0xf7fbff,
    cloudEmissive: 0x7ab4df,
    cloudScale: 0.5,
    cloudElevation: 5.4,
    cloudDriftSpeed: 0.42,
    particleMode: 'ambient',
    particleSpeed: 1.1,
    particleOpacity: 0.32,
    particleColor: 0xfffbeb,
    lightningEnabled: false,
    waterColor: 0x2278b4,
    exposure: 1.34,
  },
  snow: {
    label: 'Snow',
    skyTop: 0x122436,
    skyHorizon: 0x3b5870,
    glowColor: 0xe0f2fe,
    fogColor: 0x253e52,
    fogDensity: 0.0165,
    keyColor: 0xeef6ff,
    keyIntensity: 1.5,
    hemiSky: 0x9cc0dc,
    hemiGround: 0x243440,
    hemiIntensity: 1.15,
    rimColor: 0xbae6fd,
    rimIntensity: 0.75,
    cloudColor: 0x7b93a6,
    cloudEmissive: 0x223442,
    cloudScale: 1.05,
    cloudElevation: 0.9,
    cloudDriftSpeed: 0.75,
    particleMode: 'snow',
    particleSpeed: 4.8,
    particleOpacity: 0.78,
    particleColor: 0xf8fafc,
    lightningEnabled: false,
    waterColor: 0x163145,
    exposure: 1.12,
  },
};

export function getAtmospherePreset({
  conditionCategory = 'storm',
  isDaytime = false,
  windKph = 14,
  cloudCover = 75,
} = {}) {
  const key = BASE_PRESETS[conditionCategory] ? conditionCategory : 'storm';
  const base = BASE_PRESETS[key];

  const safeWind = Number.isFinite(windKph) ? Math.min(60, Math.max(2, windKph)) : 14;
  const windFactor = 0.65 + (safeWind / 24) * 0.75;
  const safeCloud = Number.isFinite(cloudCover) ? Math.min(100, Math.max(0, cloudCover)) : 75;
  const cloudBoost = 0.85 + (safeCloud / 100) * 0.3;

  // Apply cool nocturnal calibration when clear/cloudy at night
  const isNightClear = !isDaytime && (key === 'clear' || key === 'cloudy');
  return {
    ...base,
    conditionCategory: key,
    isDaytime: Boolean(isDaytime),
    skyTop: isNightClear ? 0x050e1c : base.skyTop,
    skyHorizon: isNightClear ? 0x112942 : base.skyHorizon,
    glowColor: isNightClear ? 0x93c5fd : base.glowColor,
    glowStrength: isNightClear ? 0.22 : (base.glowStrength ?? 0.28),
    fogColor: isNightClear ? 0x0b1d30 : base.fogColor,
    keyColor: isNightClear ? 0xb8d4f5 : base.keyColor,
    keyIntensity: isNightClear ? base.keyIntensity * 0.72 : base.keyIntensity,
    cloudDriftSpeed: Number((base.cloudDriftSpeed * windFactor).toFixed(2)),
    cloudScale: Number((base.cloudScale * cloudBoost).toFixed(2)),
    windTilt: Number(((safeWind / 45) * 0.24).toFixed(3)),
  };
}

export function resolveAtmosphereState({ weather, overrideMode = 'live' } = {}) {
  if (overrideMode && overrideMode !== 'live' && BASE_PRESETS[overrideMode]) {
    const isDayDefault = overrideMode === 'clear' || overrideMode === 'cloudy';
    const windByMode =
      overrideMode === 'storm' ? 32 : overrideMode === 'rain' ? 20 : overrideMode === 'snow' ? 14 : 10;
    const preset = getAtmospherePreset({
      conditionCategory: overrideMode,
      isDaytime: isDayDefault,
      windKph: windByMode,
      cloudCover: overrideMode === 'clear' ? 25 : 85,
    });
    return {
      mode: overrideMode,
      source: 'preview',
      preset,
    };
  }

  if (weather && weather.conditionCategory) {
    const preset = getAtmospherePreset({
      conditionCategory: weather.conditionCategory,
      isDaytime: weather.isDaytime,
      windKph: weather.windKph ?? 12,
      cloudCover: weather.cloudCover ?? 60,
    });
    return {
      mode: 'live',
      source: 'live',
      preset,
    };
  }

  // Signature storm atmosphere matching the Aurora Command Hub identity before live GPS sync
  const preset = getAtmospherePreset({
    conditionCategory: 'storm',
    isDaytime: false,
    windKph: 22,
    cloudCover: 90,
  });
  return {
    mode: 'live',
    source: 'default',
    preset,
  };
}
