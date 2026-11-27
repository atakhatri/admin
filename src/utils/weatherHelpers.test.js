import test from 'node:test';
import assert from 'node:assert/strict';
import {
  celsiusToFahrenheit,
  classifyWeatherCondition,
  formatCardinal,
  formatTemperature,
  formatWindSpeed,
  isSafeMapsUrl,
  isValidCityInput,
  kphToMph,
} from './weatherHelpers.js';

test('classifyWeatherCondition maps Google Weather API condition types to atmosphere buckets', () => {
  assert.equal(classifyWeatherCondition('THUNDERSTORM'), 'storm');
  assert.equal(classifyWeatherCondition('HEAVY_RAIN_SHOWERS'), 'rain');
  assert.equal(classifyWeatherCondition('LIGHT_SNOW'), 'snow');
  assert.equal(classifyWeatherCondition('FOG'), 'fog');
  assert.equal(classifyWeatherCondition('MOSTLY_CLOUDY'), 'cloudy');
  assert.equal(classifyWeatherCondition('CLEAR'), 'clear');
  assert.equal(classifyWeatherCondition(''), 'clear');
});

test('temperature and wind unit conversions format accurately for C and F', () => {
  assert.equal(celsiusToFahrenheit(0), 32);
  assert.equal(celsiusToFahrenheit(25), 77);
  assert.equal(formatTemperature(24.6, 'C'), '25°C');
  assert.equal(formatTemperature(25, 'F'), '77°F');
  assert.equal(formatTemperature(null, 'C'), '--');

  assert.equal(kphToMph(16.0934), 10);
  assert.equal(formatWindSpeed(18, 'C'), '18 km/h');
  assert.equal(formatWindSpeed(16.0934, 'F'), '10 mph');
  assert.equal(formatCardinal('NORTH_NORTHWEST'), 'NNW');
});

test('city input and maps URL validators enforce safe bounds and schemes', () => {
  assert.equal(isValidCityInput('Central Jakarta'), true);
  assert.equal(isValidCityInput('a'), false);
  assert.equal(isValidCityInput('   '), false);
  assert.equal(isSafeMapsUrl('https://maps.google.com/?cid=12345'), true);
  assert.equal(isSafeMapsUrl('javascript:alert(1)'), false);
});
