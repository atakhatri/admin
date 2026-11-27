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
    skyTop: 0x081a2c,
    skyHorizon: 0x163850,
    glowColor: 0x38bdf8,
    fogColor: 0x0e2536,
    fogDensity: 0.0135,
    keyColor: 0xb2d8f5,
    keyIntensity: 1.45,
    hemiSky: 0x4b7ea3,
    hemiGround: 0x163327,
    hemiIntensity: 1.15,
    rimColor: 0x67d4ff,
    rimIntensity: 1.05,
    cloudColor: 0x263e52,
    cloudEmissive: 0x0d2133,
    cloudScale: 1.16,
    cloudElevation: 0.2,
    cloudDriftSpeed: 1.35,
    particleMode: 'rain',
    particleSpeed: 28,
    particleOpacity: 0.56,
    particleColor: 0xc8ebff,
    lightningEnabled: true,
    waterColor: 0x0e5e8a,
    terrainTint: 0x8cc29e,
    windowGlow: 1.85,
    exposure: 1.14,
  },
  rain: {
    label: 'Rain',
    skyTop: 0x0f2b42,
    skyHorizon: 0x285470,
    glowColor: 0x7dd3fc,
    fogColor: 0x1a3e54,
    fogDensity: 0.0125,
    keyColor: 0xd4e9f7,
    keyIntensity: 1.55,
    hemiSky: 0x6696b8,
    hemiGround: 0x1f4733,
    hemiIntensity: 1.2,
    rimColor: 0x7dd3fc,
    rimIntensity: 0.85,
    cloudColor: 0x3a586e,
    cloudEmissive: 0x122838,
    cloudScale: 1.08,
    cloudElevation: 0.6,
    cloudDriftSpeed: 1.05,
    particleMode: 'rain',
    particleSpeed: 22,
    particleOpacity: 0.44,
    particleColor: 0xd6f0ff,
    lightningEnabled: false,
    waterColor: 0x175a7d,
    terrainTint: 0x9ac9a6,
    windowGlow: 1.1,
    exposure: 1.16,
  },
  cloudy: {
    label: 'Cloudy',
    skyTop: 0x1c456b,
    skyHorizon: 0x5c89ab,
    glowColor: 0xfde68a,
    fogColor: 0x3b6787,
    fogDensity: 0.0105,
    keyColor: 0xfff0d4,
    keyIntensity: 1.9,
    hemiSky: 0x94bdd9,
    hemiGround: 0x2e5e3e,
    hemiIntensity: 1.3,
    rimColor: 0xbae6fd,
    rimIntensity: 0.78,
    cloudColor: 0x9ab0c2,
    cloudEmissive: 0x2d4354,
    cloudScale: 0.96,
    cloudElevation: 1.6,
    cloudDriftSpeed: 0.65,
    particleMode: 'ambient',
    particleSpeed: 1.4,
    particleOpacity: 0.25,
    particleColor: 0xe6f4ff,
    lightningEnabled: false,
    waterColor: 0x1f6e99,
    terrainTint: 0xd8ebd8,
    windowGlow: 0.65,
    exposure: 1.18,
  },
  fog: {
    label: 'Mist',
    skyTop: 0x214154,
    skyHorizon: 0x5f8596,
    glowColor: 0xdbeafe,
    fogColor: 0x3e6273,
    fogDensity: 0.0195,
    keyColor: 0xeaf2f8,
    keyIntensity: 1.45,
    hemiSky: 0x9ab8c7,
    hemiGround: 0x274d3a,
    hemiIntensity: 1.25,
    rimColor: 0xbae6fd,
    rimIntensity: 0.65,
    cloudColor: 0x8099ab,
    cloudEmissive: 0x283e4d,
    cloudScale: 1.08,
    cloudElevation: -0.9,
    cloudDriftSpeed: 0.42,
    particleMode: 'ambient',
    particleSpeed: 0.9,
    particleOpacity: 0.32,
    particleColor: 0xe0f2fe,
    lightningEnabled: false,
    waterColor: 0x1f5f7a,
    terrainTint: 0xbad4c2,
    windowGlow: 0.9,
    exposure: 1.12,
  },
  clear: {
    label: 'Clear',
    skyTop: 0x1e7ce0,
    skyHorizon: 0x9edcff,
    glowColor: 0xfff5c0,
    glowStrength: 0.72,
    fogColor: 0x6ec0ee,
    fogDensity: 0.0052,
    keyColor: 0xfff6dc,
    keyIntensity: 2.95,
    hemiSky: 0xdaf3ff,
    hemiGround: 0x3b7a4a,
    hemiIntensity: 1.55,
    rimColor: 0xfff2ad,
    rimIntensity: 1.15,
    cloudColor: 0xfaffff,
    cloudEmissive: 0x8ac2e8,
    cloudScale: 0.48,
    cloudElevation: 5.5,
    cloudDriftSpeed: 0.42,
    particleMode: 'ambient',
    particleSpeed: 1.1,
    particleOpacity: 0.28,
    particleColor: 0xfffbeb,
    lightningEnabled: false,
    waterColor: 0x1b9ce8,
    terrainTint: 0xffffff,
    windowGlow: 0.3,
    exposure: 1.24,
  },
  snow: {
    label: 'Snow',
    skyTop: 0x1e3f5e,
    skyHorizon: 0x668eab,
    glowColor: 0xe0f2fe,
    fogColor: 0x456b85,
    fogDensity: 0.0135,
    keyColor: 0xf2f8ff,
    keyIntensity: 1.8,
    hemiSky: 0xb7d9f2,
    hemiGround: 0x3b5861,
    hemiIntensity: 1.3,
    rimColor: 0xbae6fd,
    rimIntensity: 0.85,
    cloudColor: 0xa6bed1,
    cloudEmissive: 0x385266,
    cloudScale: 1.02,
    cloudElevation: 1.1,
    cloudDriftSpeed: 0.75,
    particleMode: 'snow',
    particleSpeed: 4.8,
    particleOpacity: 0.78,
    particleColor: 0xf8fafc,
    lightningEnabled: false,
    waterColor: 0x1c658f,
    terrainTint: 0xd0e3eb,
    windowGlow: 1.25,
    exposure: 1.16,
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
