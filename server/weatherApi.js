const express = require('express');

// Usage attribution override required for AI Studio Google Maps Platform calls
const GMP_SOLUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

function getMapsApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.MAPS_API_KEY ||
    ''
  ).trim();
}

function getGeminiApiKey() {
  return (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
}

function parseCoordinate(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return Number(num.toFixed(6));
}

function extractCityLabelFromGeocode(results) {
  if (!Array.isArray(results) || results.length === 0) return '';

  const pickFromComponents = (components) => {
    if (!Array.isArray(components)) return '';
    const findByTypes = (wantedTypes) => {
      for (const comp of components) {
        const types = Array.isArray(comp.types) ? comp.types : [];
        if (wantedTypes.some((t) => types.includes(t))) {
          return comp.longText || comp.long_name || comp.shortText || comp.short_name || '';
        }
      }
      return '';
    };

    const locality =
      findByTypes(['locality']) ||
      findByTypes(['sublocality_level_1', 'sublocality', 'administrative_area_level_2']) ||
      findByTypes(['administrative_area_level_1']);
    const region = findByTypes(['administrative_area_level_1', 'country']);

    if (locality && region && locality.toLowerCase() !== region.toLowerCase()) {
      return `${locality}, ${region}`;
    }
    return locality || region || '';
  };

  for (const res of results) {
    const label = pickFromComponents(res.addressComponents || res.address_components);
    if (label) return label;
  }

  const first = results[0];
  return first.formattedAddress || first.formatted_address || '';
}

function classifyConditionType(conditionType) {
  const code = String(conditionType || '').toUpperCase();
  if (code.includes('THUNDER') || code.includes('STORM') || code.includes('HAIL') || code.includes('SQUALL')) {
    return 'storm';
  }
  if (code.includes('SNOW') || code.includes('SLEET') || code.includes('BLIZZARD') || code.includes('FLURR') || code.includes('ICE')) {
    return 'snow';
  }
  if (code.includes('RAIN') || code.includes('SHOWER') || code.includes('DRIZZLE')) {
    return 'rain';
  }
  if (code.includes('FOG') || code.includes('MIST') || code.includes('HAZE') || code.includes('SMOKE') || code.includes('DUST')) {
    return 'fog';
  }
  if (code.includes('CLOUD') || code.includes('OVERCAST')) {
    return 'cloudy';
  }
  return 'clear';
}

function normalizeWeatherResponse(raw, meta) {
  const cond = raw?.weatherCondition || {};
  const tempC = typeof raw?.temperature?.degrees === 'number' ? raw.temperature.degrees : null;
  const feelsLikeC =
    typeof raw?.feelsLikeTemperature?.degrees === 'number'
      ? raw.feelsLikeTemperature.degrees
      : tempC;
  const windKph = typeof raw?.wind?.speed?.value === 'number' ? raw.wind.speed.value : null;
  const maxTempC =
    typeof raw?.currentConditionsHistory?.maxTemperature?.degrees === 'number'
      ? raw.currentConditionsHistory.maxTemperature.degrees
      : null;
  const minTempC =
    typeof raw?.currentConditionsHistory?.minTemperature?.degrees === 'number'
      ? raw.currentConditionsHistory.minTemperature.degrees
      : null;

  const iconBase = typeof cond.iconBaseUri === 'string' && cond.iconBaseUri.startsWith('https://')
    ? cond.iconBaseUri
    : '';

  return {
    cityLabel: meta.cityLabel || `${meta.lat.toFixed(2)}, ${meta.lng.toFixed(2)}`,
    formattedAddress: meta.formattedAddress || '',
    placeId: meta.placeId || '',
    lat: meta.lat,
    lng: meta.lng,
    observedAt: raw?.currentTime || new Date().toISOString(),
    timeZoneId: raw?.timeZone?.id || '',
    isDaytime: typeof raw?.isDaytime === 'boolean' ? raw.isDaytime : true,
    conditionType: cond.type || 'CLEAR',
    conditionCategory: classifyConditionType(cond.type),
    description: cond.description?.text || 'Current conditions',
    iconBaseUri: iconBase,
    temperatureC: tempC,
    feelsLikeC,
    maxTempC,
    minTempC,
    humidity: typeof raw?.relativeHumidity === 'number' ? raw.relativeHumidity : null,
    uvIndex: typeof raw?.uvIndex === 'number' ? raw.uvIndex : null,
    precipPercent:
      typeof raw?.precipitation?.probability?.percent === 'number'
        ? raw.precipitation.probability.percent
        : 0,
    precipType: raw?.precipitation?.probability?.type || 'RAIN',
    thunderstormPercent:
      typeof raw?.thunderstormProbability === 'number' ? raw.thunderstormProbability : 0,
    windKph,
    windCardinal: raw?.wind?.direction?.cardinal || '',
    cloudCover: typeof raw?.cloudCover === 'number' ? raw.cloudCover : null,
    visibilityKm: typeof raw?.visibility?.distance === 'number' ? raw.visibility.distance : null,
  };
}

function extractMapsGroundingLinks(groundingChunks) {
  if (!Array.isArray(groundingChunks)) return [];
  const seen = new Set();
  const links = [];

  const pushIfSafe = (uri, title, sourceType) => {
    if (!uri || typeof uri !== 'string') return;
    const trimmed = uri.trim();
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    links.push({
      uri: trimmed,
      title: String(title || 'View on Google Maps').trim().slice(0, 120),
      sourceType,
    });
  };

  for (const chunk of groundingChunks) {
    if (chunk?.maps?.uri) {
      pushIfSafe(chunk.maps.uri, chunk.maps.title || 'Google Maps place', 'maps');
    }
    const reviewSnippets = chunk?.maps?.placeAnswerSources?.reviewSnippets;
    if (Array.isArray(reviewSnippets)) {
      for (const snippet of reviewSnippets) {
        if (snippet?.googleMapsUri) {
          pushIfSafe(
            snippet.googleMapsUri,
            snippet.title || chunk.maps?.title || 'Google Maps review',
            'review'
          );
        }
      }
    }
    if (chunk?.web?.uri) {
      pushIfSafe(chunk.web.uri, chunk.web.title || 'Reference', 'web');
    }
  }

  return links;
}

async function reverseGeocode(lat, lng, apiKey) {
  // Primary: Geocoding API v4 (structured coordinates)
  const v4Url = new URL('https://geocode.googleapis.com/v4/geocode/location');
  v4Url.searchParams.set('location.latitude', String(lat));
  v4Url.searchParams.set('location.longitude', String(lng));
  v4Url.searchParams.set('languageCode', 'en');

  try {
    const v4Res = await fetch(v4Url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'results.placeId,results.formattedAddress,results.addressComponents',
        'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID,
      },
    });
    if (v4Res.ok) {
      const data = await v4Res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      if (results.length > 0) {
        return {
          cityLabel: extractCityLabelFromGeocode(results),
          formattedAddress: results[0].formattedAddress || '',
          placeId: results[0].placeId || '',
        };
      }
    }
  } catch (_err) {
    // Fallback below
  }

  // Fallback: Standard Geocoding REST endpoint if v4 is not enabled on the selected project
  const restUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  restUrl.searchParams.set('latlng', `${lat},${lng}`);
  restUrl.searchParams.set('language', 'en');
  restUrl.searchParams.set('key', apiKey);

  const restRes = await fetch(restUrl.toString(), {
    method: 'GET',
    headers: { 'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID },
  });
  if (restRes.ok) {
    const data = await restRes.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length > 0) {
      return {
        cityLabel: extractCityLabelFromGeocode(results),
        formattedAddress: results[0].formatted_address || '',
        placeId: results[0].place_id || '',
      };
    }
  }

  return { cityLabel: '', formattedAddress: '', placeId: '' };
}

async function forwardGeocode(cityQuery, apiKey) {
  // Primary: Geocoding API v4 (unstructured address path)
  const encoded = encodeURIComponent(cityQuery);
  const v4Url = new URL(`https://geocode.googleapis.com/v4/geocode/address/${encoded}`);
  v4Url.searchParams.set('languageCode', 'en');

  try {
    const v4Res = await fetch(v4Url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'results.placeId,results.location,results.formattedAddress,results.addressComponents',
        'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID,
      },
    });

    if (v4Res.ok) {
      const data = await v4Res.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      const first = results[0];
      if (first?.location && Number.isFinite(first.location.latitude) && Number.isFinite(first.location.longitude)) {
        return {
          lat: Number(first.location.latitude),
          lng: Number(first.location.longitude),
          cityLabel: extractCityLabelFromGeocode(results) || first.formattedAddress || cityQuery,
          formattedAddress: first.formattedAddress || '',
          placeId: first.placeId || '',
        };
      }
    }
  } catch (_err) {
    // Fallback below
  }

  // Fallback: Standard Geocoding REST endpoint
  const restUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  restUrl.searchParams.set('address', cityQuery);
  restUrl.searchParams.set('language', 'en');
  restUrl.searchParams.set('key', apiKey);

  const restRes = await fetch(restUrl.toString(), {
    method: 'GET',
    headers: { 'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID },
  });

  if (!restRes.ok) {
    return null;
  }

  const data = await restRes.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  const first = results[0];
  const loc = first?.geometry?.location;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
    return null;
  }

  return {
    lat: Number(loc.lat),
    lng: Number(loc.lng),
    cityLabel: extractCityLabelFromGeocode(results) || first.formatted_address || cityQuery,
    formattedAddress: first.formatted_address || '',
    placeId: first.place_id || '',
  };
}

async function fetchCurrentConditions(lat, lng, apiKey) {
  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('location.latitude', String(lat));
  url.searchParams.set('location.longitude', String(lng));
  url.searchParams.set('unitsSystem', 'METRIC');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID,
    },
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    const err = new Error(`Weather API request failed (${response.status})`);
    err.status = response.status;
    err.upstreamDetail = errBody.slice(0, 240);
    throw err;
  }

  return response.json();
}

function registerWeatherRoutes(app) {
  app.get('/api/weather/current', async (req, res) => {
    const apiKey = getMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'Google Maps Platform API key is not configured on the server.',
      });
      return;
    }

    const rawCity = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    let lat = parseCoordinate(req.query.lat, -90, 90);
    let lng = parseCoordinate(req.query.lng, -180, 180);

    try {
      let locationMeta = { cityLabel: '', formattedAddress: '', placeId: '' };

      if (rawCity) {
        if (rawCity.length < 2 || rawCity.length > 120) {
          res.status(400).json({ error: 'Please enter a valid city or location name.' });
          return;
        }
        const geo = await forwardGeocode(rawCity, apiKey);
        if (!geo) {
          res.status(404).json({ error: `Could not find coordinates for "${rawCity}".` });
          return;
        }
        lat = geo.lat;
        lng = geo.lng;
        locationMeta = geo;
      } else {
        if (lat === null || lng === null) {
          res.status(400).json({
            error: 'Provide valid latitude and longitude coordinates or a city query.',
          });
          return;
        }
        locationMeta = await reverseGeocode(lat, lng, apiKey);
      }

      const rawWeather = await fetchCurrentConditions(lat, lng, apiKey);
      const weather = normalizeWeatherResponse(rawWeather, {
        ...locationMeta,
        lat,
        lng,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({ weather });
    } catch (error) {
      console.error('Weather API route error:', error?.status || '', error?.upstreamDetail || error);
      const status = error?.status === 429 ? 429 : 502;
      const message =
        status === 429
          ? 'Weather service rate limit reached. Please try again shortly.'
          : 'Unable to load current weather conditions right now.';
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/location/context', express.json({ limit: '64kb' }), async (req, res) => {
    const geminiKey = getGeminiApiKey();
    if (!geminiKey) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
      return;
    }

    const lat = parseCoordinate(req.body?.lat, -90, 90);
    const lng = parseCoordinate(req.body?.lng, -180, 180);
    const cityLabel =
      typeof req.body?.cityLabel === 'string' ? req.body.cityLabel.trim().slice(0, 120) : '';

    if (lat === null || lng === null) {
      res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
      return;
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const locationPhrase = cityLabel
        ? `${cityLabel} (${lat.toFixed(4)}, ${lng.toFixed(4)})`
        : `coordinates ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents:
          `Provide a concise 2-sentence local briefing for a developer working around ${locationPhrase}, ` +
          'mentioning 2 or 3 real nearby landmarks, cafes, or transit hubs grounded in Google Maps.',
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng,
              },
            },
          },
        },
      });

      const summary = String(response.text || '').trim();
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks = extractMapsGroundingLinks(chunks);

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        summary: summary || 'Local area briefing retrieved from Google Maps.',
        mapsLinks,
      });
    } catch (error) {
      console.error('Gemini Maps grounding error:', error);
      const status = error?.status === 429 ? 429 : 502;
      res.status(status).json({
        error:
          status === 429
            ? 'Location briefing quota reached. Please try again later.'
            : 'Unable to load local area briefing right now.',
      });
    }
  });
}

module.exports = {
  registerWeatherRoutes,
  parseCoordinate,
  extractCityLabelFromGeocode,
  classifyConditionType,
  normalizeWeatherResponse,
  extractMapsGroundingLinks,
};
