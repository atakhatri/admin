export function classifyWeatherCondition(conditionType) {
  const code = String(conditionType || '').toUpperCase();
  if (
    code.includes('THUNDER') ||
    code.includes('STORM') ||
    code.includes('HAIL') ||
    code.includes('SQUALL')
  ) {
    return 'storm';
  }
  if (
    code.includes('SNOW') ||
    code.includes('SLEET') ||
    code.includes('BLIZZARD') ||
    code.includes('FLURR') ||
    code.includes('ICE')
  ) {
    return 'snow';
  }
  if (
    code.includes('RAIN') ||
    code.includes('SHOWER') ||
    code.includes('DRIZZLE')
  ) {
    return 'rain';
  }
  if (
    code.includes('FOG') ||
    code.includes('MIST') ||
    code.includes('HAZE') ||
    code.includes('SMOKE') ||
    code.includes('DUST')
  ) {
    return 'fog';
  }
  if (
    code.includes('CLOUD') ||
    code.includes('OVERCAST')
  ) {
    return 'cloudy';
  }
  return 'clear';
}

export function celsiusToFahrenheit(tempC) {
  if (typeof tempC !== 'number' || !Number.isFinite(tempC)) return null;
  return Number(((tempC * 9) / 5 + 32).toFixed(1));
}

export function kphToMph(kph) {
  if (typeof kph !== 'number' || !Number.isFinite(kph)) return null;
  return Number((kph * 0.621371).toFixed(1));
}

export function formatTemperature(tempC, unit = 'C') {
  if (typeof tempC !== 'number' || !Number.isFinite(tempC)) return '--';
  const value = unit === 'F' ? celsiusToFahrenheit(tempC) : tempC;
  return `${Math.round(value)}°${unit === 'F' ? 'F' : 'C'}`;
}

export function formatWindSpeed(windKph, unit = 'C') {
  if (typeof windKph !== 'number' || !Number.isFinite(windKph)) return '--';
  if (unit === 'F') {
    return `${Math.round(kphToMph(windKph))} mph`;
  }
  return `${Math.round(windKph)} km/h`;
}

const CARDINAL_SHORT = {
  NORTH: 'N',
  NORTH_NORTHEAST: 'NNE',
  NORTHEAST: 'NE',
  EAST_NORTHEAST: 'ENE',
  EAST: 'E',
  EAST_SOUTHEAST: 'ESE',
  SOUTHEAST: 'SE',
  SOUTH_SOUTHEAST: 'SSE',
  SOUTH: 'S',
  SOUTH_SOUTHWEST: 'SSW',
  SOUTHWEST: 'SW',
  WEST_SOUTHWEST: 'WSW',
  WEST: 'W',
  WEST_NORTHWEST: 'WNW',
  NORTHWEST: 'NW',
  NORTH_NORTHWEST: 'NNW',
};

export function formatCardinal(cardinal) {
  if (!cardinal) return '';
  const key = String(cardinal).toUpperCase().trim();
  return CARDINAL_SHORT[key] || key;
}

export function formatRelativeObservationTime(isoString) {
  if (!isoString) return '';
  const parsed = Date.parse(isoString);
  if (!Number.isFinite(parsed)) return '';
  try {
    return new Date(parsed).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (_err) {
    return '';
  }
}

export function isValidCityInput(value) {
  const trimmed = String(value || '').trim();
  return trimmed.length >= 2 && trimmed.length <= 120;
}

export function isSafeMapsUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (_err) {
    return false;
  }
}
