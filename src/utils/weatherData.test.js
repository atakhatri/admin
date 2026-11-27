import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FEATURED,
  DEFAULT_LOCATIONS,
  DEFAULT_DAY_INDEX,
  DEFAULT_WAVE_STROKE_PATH,
  SEARCHABLE_CITIES,
  getPipTopUnits,
  formatTempValue,
  buildFillPath,
  buildWavePathFromTemps,
  swapCityWithFeatured,
  filterCities,
  validateNewLocation,
} from './weatherData.js';

test('default featured location preserves exact reference copy, metrics, and typo', () => {
  assert.equal(DEFAULT_FEATURED.city, 'Central Jakarta');
  assert.equal(DEFAULT_FEATURED.tempC, 10);
  assert.equal(DEFAULT_FEATURED.wind, '19 mph');
  assert.equal(DEFAULT_FEATURED.humidity, '40%');
  assert.equal(DEFAULT_FEATURED.gust, '15km/h');
  assert.deepEqual(DEFAULT_FEATURED.headlineLines, ['Strom', 'with Heavy Rain']);
  assert.equal(DEFAULT_DAY_INDEX, 3);
  assert.equal(DEFAULT_FEATURED.forecast[DEFAULT_DAY_INDEX].day, 'Wednesday');
  assert.deepEqual(
    DEFAULT_FEATURED.forecast.map((f) => f.tempC),
    [11, 13, 14, 10, 19, 12]
  );
  assert.deepEqual(
    DEFAULT_LOCATIONS.map((l) => [l.city, l.condition, l.tempC]),
    [
      ['North Jakarta', 'Mostly Sunny', 12],
      ['Bandung', 'Cloudy', 10],
      ['South Jakarta', 'Sunny', 14],
    ]
  );
});

test('default wave path starts at M0,79, ends at L835,86, and builds valid closed fill path', () => {
  assert.ok(DEFAULT_WAVE_STROKE_PATH.startsWith('M0,79'));
  assert.ok(DEFAULT_WAVE_STROKE_PATH.endsWith('L835,86'));
  const fill = buildFillPath(DEFAULT_WAVE_STROKE_PATH);
  assert.ok(fill.endsWith('L835,230 L0,230 Z'));
  assert.equal(buildWavePathFromTemps(DEFAULT_FEATURED.forecast), DEFAULT_WAVE_STROKE_PATH);
});

test('sidebar pip vertical units align at 131u for Dashboard and step monotonically', () => {
  assert.equal(getPipTopUnits(0), 131);
  assert.equal(getPipTopUnits(1), 202);
  assert.equal(getPipTopUnits(4), 415);
  assert.equal(getPipTopUnits(-3), 131);
  assert.equal(getPipTopUnits(99), 415);
});

test('temperature formatter supports C and F accurately', () => {
  assert.equal(formatTempValue(10, 'C'), 10);
  assert.equal(formatTempValue(10, 'F'), 50);
  assert.equal(formatTempValue(19, 'F'), 66);
});

test('swapCityWithFeatured swaps clicked city into Card A and keeps 3 rail rows', () => {
  const { featured, locations } = swapCityWithFeatured(
    DEFAULT_FEATURED,
    DEFAULT_LOCATIONS,
    'bandung'
  );
  assert.equal(featured.city, 'Bandung');
  assert.equal(locations.length, 3);
  assert.equal(locations[1].city, 'Central Jakarta');
  assert.ok(featured.wavePath.startsWith('M0,'));
  assert.ok(featured.wavePath.includes('L835,'));
});

test('filterCities and validateNewLocation handle search and form validation properly', () => {
  const matches = filterCities('sura', SEARCHABLE_CITIES);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].city, 'Surabaya');

  const invalid = validateNewLocation({ city: '', country: 'Indonesia', condition: 'Sunny', tempC: 20 });
  assert.equal(invalid.valid, false);

  const valid = validateNewLocation({
    city: 'Semarang',
    country: 'Indonesia',
    condition: 'Breezy',
    tempC: 24,
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.location.city, 'Semarang');
  assert.equal(valid.location.tempC, 24);
});
