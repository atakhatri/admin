import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAtmospherePreset,
  resolveAtmosphereState,
  terrainHeightAt,
} from './atmospherePresets.js';

test('getAtmospherePreset maps all weather categories and modulates day/night lighting', () => {
  const storm = getAtmospherePreset({ conditionCategory: 'storm', isDaytime: false, windKph: 35 });
  assert.equal(storm.particleMode, 'rain');
  assert.equal(storm.lightningEnabled, true);
  assert.ok(storm.cloudDriftSpeed > 1.5);

  const clearDay = getAtmospherePreset({ conditionCategory: 'clear', isDaytime: true, windKph: 8 });
  const clearNight = getAtmospherePreset({ conditionCategory: 'clear', isDaytime: false, windKph: 8 });
  assert.equal(clearDay.lightningEnabled, false);
  assert.ok(clearDay.keyIntensity > clearNight.keyIntensity);
  assert.notEqual(clearDay.skyTop, clearNight.skyTop);

  const snow = getAtmospherePreset({ conditionCategory: 'snow', isDaytime: true, windKph: 10 });
  assert.equal(snow.particleMode, 'snow');
  assert.equal(snow.lightningEnabled, false);
});

test('resolveAtmosphereState prioritizes manual preview override and otherwise tracks live weather', () => {
  const liveWeather = {
    conditionCategory: 'rain',
    isDaytime: true,
    windKph: 18,
    cloudCover: 85,
  };

  const liveResolved = resolveAtmosphereState({ weather: liveWeather, overrideMode: 'live' });
  assert.equal(liveResolved.source, 'live');
  assert.equal(liveResolved.preset.conditionCategory, 'rain');

  const overrideResolved = resolveAtmosphereState({ weather: liveWeather, overrideMode: 'snow' });
  assert.equal(overrideResolved.source, 'preview');
  assert.equal(overrideResolved.preset.conditionCategory, 'snow');

  const defaultResolved = resolveAtmosphereState({ weather: null, overrideMode: 'live' });
  assert.equal(defaultResolved.source, 'default');
  assert.equal(defaultResolved.preset.conditionCategory, 'storm');
});

test('terrainHeightAt produces finite grounded heights with lower central basin', () => {
  const centerY = terrainHeightAt(0, -6);
  const ridgeY = terrainHeightAt(26, -34);
  assert.equal(Number.isFinite(centerY), true);
  assert.equal(Number.isFinite(ridgeY), true);
  assert.ok(ridgeY > centerY);
});
