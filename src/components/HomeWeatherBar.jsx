import React from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Moon,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';
import {
  formatCardinal,
  formatTemperature,
  formatWindSpeed,
} from '../utils/weatherHelpers';
import { WeatherHeroSkeleton } from './ui/Skeleton';

function WeatherGlyph({ category, isDaytime }) {
  switch (category) {
    case 'storm':
      return <CloudLightning size={16} strokeWidth={1.9} />;
    case 'rain':
      return <CloudRain size={16} strokeWidth={1.9} />;
    case 'snow':
      return <CloudSnow size={16} strokeWidth={1.9} />;
    case 'fog':
      return <CloudFog size={16} strokeWidth={1.9} />;
    case 'cloudy':
      return <Cloud size={16} strokeWidth={1.9} />;
    default:
      return isDaytime ? (
        <Sun size={16} strokeWidth={1.9} />
      ) : (
        <Moon size={16} strokeWidth={1.9} />
      );
  }
}

export default function HomeWeatherBar({
  weather,
  loading,
  error,
  statusHint,
  unit,
  onRefresh,
}) {
  const cardinal = formatCardinal(weather?.windCardinal);

  if (loading && !weather) {
    return (
      <section
        className="weather-floating-hero"
        aria-label="Loading current location weather"
        data-testid="home-weather-bar"
      >
        <WeatherHeroSkeleton />
      </section>
    );
  }

  return (
    <section
      className="weather-floating-hero"
      aria-label="Current location weather"
      data-testid="home-weather-bar"
    >
      <div className="weather-chip-row">
        <span className="weather-glass-chip">
          <WeatherGlyph
            category={weather?.conditionCategory || 'clear'}
            isDaytime={weather?.isDaytime ?? true}
          />
          <span>
            {weather
              ? weather.cityLabel
              : loading
              ? 'Locating...'
              : 'Current Location'}
          </span>
        </span>

        <button
          type="button"
          className="weather-refresh-circle"
          aria-label="Refresh current location weather"
          title="Refresh current location weather"
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw
            size={14}
            className={loading ? 'is-spinning' : ''}
            aria-hidden="true"
          />
        </button>
      </div>

      {weather ? (
        <>
          <div className="weather-hero-headline">
            <span className="weather-hero-temp">
              {formatTemperature(weather.temperatureC, unit)}
            </span>
            <span className="weather-hero-cond">{weather.description}</span>
          </div>

          <p className="weather-hero-blurb">
            <span>Feels {formatTemperature(weather.feelsLikeC, unit)}</span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <span className="weather-metric-inline">
              <Droplets size={13} aria-hidden="true" />
              <span>{weather.humidity !== null ? `${weather.humidity}%` : '--'}</span>
            </span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <span className="weather-metric-inline">
              <Wind size={13} aria-hidden="true" />
              <span>
                {formatWindSpeed(weather.windKph, unit)}
                {cardinal ? ` ${cardinal}` : ''}
              </span>
            </span>
          </p>
        </>
      ) : (
        <>
          <div className="weather-hero-headline weather-hero-headline-sub">
            {loading ? 'Syncing live weather...' : 'Live Local Weather'}
          </div>
          <p className="weather-hero-blurb">
            {error ||
              statusHint ||
              'Click refresh to detect your current location and sync live weather.'}
          </p>
        </>
      )}

      {error && weather && (
        <p className="weather-inline-note" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
