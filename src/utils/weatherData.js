export const AVATAR_URL =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop&crop=faces&q=80&auto=format';

export const DEFAULT_WAVE_STROKE_PATH =
  'M0,79 C42,84 68,112 114,112 C164,112 192,70 242,70 C294,70 326,56 376,56 C428,56 458,136 512,136 C568,136 604,26 662,26 C714,26 742,96 792,96 C810,96 822,89 830,87 L835,86';

export const DEFAULT_FORECAST_POINTS = [
  { day: 'Sunday', tempC: 11, icon: 'i-cloud', condition: 'Overcast' },
  { day: 'Monday', tempC: 13, icon: 'i-cloud2', condition: 'Partly Cloudy' },
  { day: 'Tuesday', tempC: 14, icon: 'i-cloud2', condition: 'Scattered Clouds' },
  { day: 'Wednesday', tempC: 10, icon: 'i-hail', condition: 'Heavy Rain' },
  { day: 'Thursday', tempC: 19, icon: 'i-sun', condition: 'Clear Skies' },
  { day: 'Friday', tempC: 12, icon: 'i-cloud', condition: 'Cloudy' },
];

export const DEFAULT_DAY_INDEX = 3; // Wednesday

export const DEFAULT_FEATURED = {
  id: 'central-jakarta',
  country: 'Indonesia',
  city: 'Central Jakarta',
  condition: 'Heavy Rain',
  tempC: 10,
  icon: 'i-hail',
  wind: '19 mph',
  humidity: '40%',
  gust: '15km/h',
  headlineLines: ['Strom', 'with Heavy Rain'],
  blurbLines: [
    'Partly cloudy with occasional snow showers. High around 50°F.',
    'Wind from the east 11 to 21 mph. Snow chance is 40%, with',
    'rainfall expected to be less than an inch.',
  ],
  forecast: DEFAULT_FORECAST_POINTS,
  wavePath: DEFAULT_WAVE_STROKE_PATH,
};

export const DEFAULT_LOCATIONS = [
  {
    id: 'north-jakarta',
    country: 'Indonesia',
    city: 'North Jakarta',
    condition: 'Mostly Sunny',
    tempC: 12,
    icon: 'i-cloud',
    wind: '14 mph',
    humidity: '34%',
    gust: '11km/h',
    headlineLines: ['Coastal Breeze', 'Mostly Sunny'],
    blurbLines: [
      'Bright coastal breaks with light scattered clouds through afternoon.',
      'Gentle sea breeze from the north 10 to 14 mph. Rain chance stays low,',
      'with clear evening visibility across the harbor.',
    ],
    forecast: [
      { day: 'Sunday', tempC: 13, icon: 'i-cloud2', condition: 'Partly Cloudy' },
      { day: 'Monday', tempC: 15, icon: 'i-sun', condition: 'Sunny' },
      { day: 'Tuesday', tempC: 16, icon: 'i-sun', condition: 'Sunny' },
      { day: 'Wednesday', tempC: 12, icon: 'i-cloud', condition: 'Mostly Sunny' },
      { day: 'Thursday', tempC: 18, icon: 'i-sun', condition: 'Warm' },
      { day: 'Friday', tempC: 14, icon: 'i-cloud2', condition: 'Breezy' },
    ],
  },
  {
    id: 'bandung',
    country: 'Indonesia',
    city: 'Bandung',
    condition: 'Cloudy',
    tempC: 10,
    icon: 'i-cloud',
    wind: '12 mph',
    humidity: '58%',
    gust: '13km/h',
    headlineLines: ['Highland Mist', 'with Thick Cloud'],
    blurbLines: [
      'Cool mountain air under a persistent overcast canopy all day.',
      'Light highland drift from the southeast 9 to 12 mph. Humidity near 58%,',
      'with light passing drizzle expected after dusk.',
    ],
    forecast: [
      { day: 'Sunday', tempC: 9, icon: 'i-cloud', condition: 'Mist' },
      { day: 'Monday', tempC: 11, icon: 'i-cloud', condition: 'Cloudy' },
      { day: 'Tuesday', tempC: 12, icon: 'i-cloud2', condition: 'Broken Clouds' },
      { day: 'Wednesday', tempC: 10, icon: 'i-cloud', condition: 'Cloudy' },
      { day: 'Thursday', tempC: 15, icon: 'i-cloud2', condition: 'Mild' },
      { day: 'Friday', tempC: 11, icon: 'i-hail', condition: 'Showers' },
    ],
  },
  {
    id: 'south-jakarta',
    country: 'Indonesia',
    city: 'South Jakarta',
    condition: 'Sunny',
    tempC: 14,
    icon: 'i-cloud2',
    wind: '10 mph',
    humidity: '32%',
    gust: '9km/h',
    headlineLines: ['Clear Horizons', 'and Warm Sun'],
    blurbLines: [
      'Crisp sunshine with thin high-altitude cirrus clouds overhead.',
      'Steady easterly wind 8 to 10 mph. Dry afternoon conditions,',
      'cooling comfortably after sunset with calm skies.',
    ],
    forecast: [
      { day: 'Sunday', tempC: 14, icon: 'i-sun', condition: 'Sunny' },
      { day: 'Monday', tempC: 15, icon: 'i-cloud2', condition: 'Mostly Clear' },
      { day: 'Tuesday', tempC: 17, icon: 'i-sun', condition: 'Bright' },
      { day: 'Wednesday', tempC: 14, icon: 'i-cloud2', condition: 'Sunny' },
      { day: 'Thursday', tempC: 20, icon: 'i-sun', condition: 'Clear' },
      { day: 'Friday', tempC: 16, icon: 'i-cloud2', condition: 'Partly Cloudy' },
    ],
  },
];

export const SEARCHABLE_CITIES = [
  {
    id: 'surabaya',
    country: 'Indonesia',
    city: 'Surabaya',
    condition: 'Partly Cloudy',
    tempC: 17,
    icon: 'i-cloud2',
    wind: '15 mph',
    humidity: '45%',
    gust: '18km/h',
    headlineLines: ['Warm Trade Winds', 'Partly Cloudy'],
    blurbLines: [
      'Warm coastal sun alternating with fast-moving cumulus banks.',
      'East-southeast wind 12 to 15 mph. Moderate humidity at 45%,',
      'with dry conditions holding through late evening.',
    ],
  },
  {
    id: 'yogyakarta',
    country: 'Indonesia',
    city: 'Yogyakarta',
    condition: 'Light Rain',
    tempC: 13,
    icon: 'i-hail',
    wind: '11 mph',
    humidity: '64%',
    gust: '14km/h',
    headlineLines: ['Evening Showers', 'with Cool Air'],
    blurbLines: [
      'Passing rain bands drifting across the valley during late afternoon.',
      'Breeze from the south 9 to 11 mph. Rain chance near 60%,',
      'with mild temperatures continuing overnight.',
    ],
  },
  {
    id: 'denpasar',
    country: 'Indonesia',
    city: 'Denpasar',
    condition: 'Sunny',
    tempC: 21,
    icon: 'i-sun',
    wind: '13 mph',
    humidity: '50%',
    gust: '16km/h',
    headlineLines: ['Tropical Sun', 'and Ocean Breeze'],
    blurbLines: [
      'Abundant sunshine along the southern coast with vivid visibility.',
      'Refreshing onshore wind 10 to 13 mph. Low precipitation risk,',
      'ideal conditions continuing into the evening.',
    ],
  },
  {
    id: 'medan',
    country: 'Indonesia',
    city: 'Medan',
    condition: 'Thunderstorm',
    tempC: 11,
    icon: 'i-hail',
    wind: '20 mph',
    humidity: '72%',
    gust: '22km/h',
    headlineLines: ['Squall Line', 'with Heavy Rain'],
    blurbLines: [
      'Deep convective cells bringing brief intense downpours and gusts.',
      'Variable gusts reaching 20 mph. Storm chance is 70%,',
      'gradually tapering to light mist after midnight.',
    ],
  },
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'i-grid' },
  { id: 'reports', label: 'Reports', icon: 'i-chart' },
  { id: 'explore', label: 'Explore regions', icon: 'i-globe' },
  { id: 'calendar', label: 'Calendar', icon: 'i-cal' },
  { id: 'settings', label: 'Settings', icon: 'i-gear' },
];

export const WEATHER_ALERTS = [
  {
    id: 'alert-1',
    severity: 'Advisory',
    region: 'Central Jakarta',
    title: 'Heavy rain and gusty east winds',
    detail: 'Wind 11–21 mph with 40% precipitation chance through Wednesday evening.',
  },
  {
    id: 'alert-2',
    severity: 'Notice',
    region: 'Bandung',
    title: 'Dense highland cloud cover',
    detail: 'Reduced visibility along elevated roads after 18:00 local time.',
  },
];

export function getPipTopUnits(activeNavIndex) {
  const safeIndex = Math.max(0, Math.min(NAV_ITEMS.length - 1, activeNavIndex));
  return 131 + safeIndex * 71;
}

export function formatTempValue(tempC, unit = 'C') {
  if (unit === 'F') {
    return Math.round((tempC * 9) / 5 + 32);
  }
  return Math.round(tempC);
}

export function buildFillPath(strokePath) {
  return `${strokePath} L835,230 L0,230 Z`;
}

export function buildWavePathFromTemps(forecastPoints) {
  if (!Array.isArray(forecastPoints) || forecastPoints.length !== 6) {
    return DEFAULT_WAVE_STROKE_PATH;
  }

  const temps = forecastPoints.map((pt) => pt.tempC);
  const isDefault = temps.every((t, idx) => t === DEFAULT_FORECAST_POINTS[idx].tempC);
  if (isDefault) {
    return DEFAULT_WAVE_STROKE_PATH;
  }

  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const span = Math.max(1, maxT - minT);

  const xs = [68, 212, 360, 506, 654, 782];
  const ys = temps.map((t) => {
    const norm = (t - minT) / span;
    return Math.round(138 - norm * 108);
  });

  const startY = Math.round(ys[0] - 8);
  const endY = Math.round(ys[5] - 4);
  const pts = [
    { x: 0, y: startY },
    ...xs.map((x, i) => ({ x, y: ys[i] })),
    { x: 835, y: endY },
  ];

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = Math.round((p0.x + p1.x) / 2);
    if (i === pts.length - 2) {
      d += ` C${midX},${p0.y} ${midX},${p1.y} ${p1.x - 5},${p1.y} L${p1.x},${p1.y}`;
    } else {
      d += ` C${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
    }
  }
  return d;
}

export function buildForecastForCity(cityObj) {
  if (Array.isArray(cityObj.forecast) && cityObj.forecast.length === 6) {
    return cityObj.forecast;
  }
  const base = cityObj.tempC;
  return [
    { day: 'Sunday', tempC: base - 1, icon: 'i-cloud', condition: cityObj.condition },
    { day: 'Monday', tempC: base + 1, icon: 'i-cloud2', condition: 'Partly Cloudy' },
    { day: 'Tuesday', tempC: base + 2, icon: 'i-cloud2', condition: 'Mild' },
    { day: 'Wednesday', tempC: base, icon: cityObj.icon || 'i-cloud', condition: cityObj.condition },
    { day: 'Thursday', tempC: base + 5, icon: 'i-sun', condition: 'Clear' },
    { day: 'Friday', tempC: base + 1, icon: 'i-cloud', condition: 'Cloudy' },
  ];
}

export function swapCityWithFeatured(featured, locations, targetId) {
  const idx = locations.findIndex((loc) => loc.id === targetId);
  if (idx === -1) {
    return { featured, locations };
  }
  const target = locations[idx];
  const nextFeatured = {
    ...target,
    forecast: buildForecastForCity(target),
    wavePath: target.wavePath || buildWavePathFromTemps(buildForecastForCity(target)),
  };
  const nextLocations = locations.map((loc, i) => (i === idx ? featured : loc));
  return { featured: nextFeatured, locations: nextLocations };
}

export function filterCities(query, allCities) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return allCities;
  return allCities.filter(
    (item) =>
      item.city.toLowerCase().includes(q) ||
      item.country.toLowerCase().includes(q) ||
      item.condition.toLowerCase().includes(q)
  );
}

export function validateNewLocation({ city, country, condition, tempC }) {
  const trimmedCity = String(city || '').trim();
  const trimmedCountry = String(country || '').trim();
  const trimmedCondition = String(condition || '').trim();
  const parsedTemp = Number(tempC);

  if (trimmedCity.length < 2) {
    return { valid: false, error: 'Enter a city name (at least 2 characters).' };
  }
  if (trimmedCountry.length < 2) {
    return { valid: false, error: 'Enter a country name.' };
  }
  if (trimmedCondition.length < 2) {
    return { valid: false, error: 'Enter a weather condition.' };
  }
  if (Number.isNaN(parsedTemp) || parsedTemp < -60 || parsedTemp > 60) {
    return { valid: false, error: 'Enter a valid temperature between -60°C and 60°C.' };
  }

  return {
    valid: true,
    location: {
      id: `custom-${trimmedCity.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      city: trimmedCity,
      country: trimmedCountry,
      condition: trimmedCondition,
      tempC: Math.round(parsedTemp),
      icon: parsedTemp >= 18 ? 'i-sun' : parsedTemp <= 11 ? 'i-hail' : 'i-cloud2',
      wind: '12 mph',
      humidity: '42%',
      gust: '14km/h',
      headlineLines: [trimmedCondition, `in ${trimmedCity}`],
      blurbLines: [
        `Current conditions in ${trimmedCity}: ${trimmedCondition.toLowerCase()} around ${Math.round(parsedTemp)}°C.`,
        'Steady breeze across the metro area with moderate atmospheric humidity,',
        'and shifting sky coverage expected through the week.',
      ],
    },
  };
}
