import test from 'node:test';
import assert from 'node:assert/strict';
import weatherApi from './weatherApi.js';

const {
  parseCoordinate,
  extractCityLabelFromGeocode,
  normalizeWeatherResponse,
  extractMapsGroundingLinks,
} = weatherApi;

test('parseCoordinate validates numeric latitude and longitude bounds strictly', () => {
  assert.equal(parseCoordinate('37.4220', -90, 90), 37.422);
  assert.equal(parseCoordinate('-122.0841', -180, 180), -122.0841);
  assert.equal(parseCoordinate('95', -90, 90), null);
  assert.equal(parseCoordinate('abc', -90, 90), null);
  assert.equal(parseCoordinate('', -90, 90), null);
});

test('extractCityLabelFromGeocode parses both Geocoding v4 and standard REST results', () => {
  const v4Results = [
    {
      formattedAddress: '1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA',
      addressComponents: [
        { longText: 'Mountain View', types: ['locality'] },
        { longText: 'California', types: ['administrative_area_level_1'] },
      ],
    },
  ];
  assert.equal(extractCityLabelFromGeocode(v4Results), 'Mountain View, California');

  const v3Results = [
    {
      formatted_address: 'Central Jakarta, Jakarta, Indonesia',
      address_components: [
        { long_name: 'Central Jakarta', types: ['administrative_area_level_2'] },
        { long_name: 'Jakarta', types: ['administrative_area_level_1'] },
      ],
    },
  ];
  assert.equal(extractCityLabelFromGeocode(v3Results), 'Central Jakarta, Jakarta');
});

test('normalizeWeatherResponse produces clean canonical weather state', () => {
  const raw = {
    currentTime: '2026-11-27T04:00:00Z',
    timeZone: { id: 'America/Los_Angeles' },
    isDaytime: true,
    weatherCondition: {
      type: 'THUNDERSTORM',
      description: { text: 'Thunderstorm' },
      iconBaseUri: 'https://maps.gstatic.com/weather/v1/thunderstorm',
    },
    temperature: { degrees: 24.4, unit: 'CELSIUS' },
    feelsLikeTemperature: { degrees: 26.1, unit: 'CELSIUS' },
    relativeHumidity: 78,
    uvIndex: 3,
    precipitation: { probability: { percent: 80, type: 'RAIN' } },
    thunderstormProbability: 65,
    wind: { speed: { value: 22 }, direction: { cardinal: 'NORTHWEST' } },
    cloudCover: 90,
    visibility: { distance: 8 },
    currentConditionsHistory: {
      maxTemperature: { degrees: 28 },
      minTemperature: { degrees: 21 },
    },
  };

  const out = normalizeWeatherResponse(raw, {
    cityLabel: 'Mountain View, California',
    formattedAddress: 'Mountain View, CA',
    placeId: 'place-123',
    lat: 37.422,
    lng: -122.0841,
  });

  assert.equal(out.conditionCategory, 'storm');
  assert.equal(out.temperatureC, 24.4);
  assert.equal(out.humidity, 78);
  assert.equal(out.windKph, 22);
  assert.equal(out.cityLabel, 'Mountain View, California');
});

test('extractMapsGroundingLinks extracts safe Maps and review URIs and strips unsafe schemes', () => {
  const chunks = [
    {
      maps: {
        uri: 'https://maps.google.com/?cid=1001',
        title: 'Shoreline Park',
        placeAnswerSources: {
          reviewSnippets: [
            { googleMapsUri: 'https://maps.google.com/review/99', title: 'Park Review' },
          ],
        },
      },
    },
    {
      maps: {
        uri: 'javascript:alert(1)',
        title: 'Unsafe',
      },
    },
    {
      maps: {
        uri: 'https://maps.google.com/?cid=1001',
        title: 'Duplicate Shoreline Park',
      },
    },
  ];

  const links = extractMapsGroundingLinks(chunks);
  assert.equal(links.length, 2);
  assert.equal(links[0].uri, 'https://maps.google.com/?cid=1001');
  assert.equal(links[0].title, 'Shoreline Park');
  assert.equal(links[1].uri, 'https://maps.google.com/review/99');
});
