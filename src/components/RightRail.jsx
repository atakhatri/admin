import React from 'react';
import { formatTempValue } from '../utils/weatherData';

export default function RightRail({ featured, locations, unit, onSelectLocation }) {
  return (
    <aside className="rail" aria-label="Regional weather cards">
      <article className="card big" aria-label={`Current weather in ${featured.city}`}>
        <div className="place">
          <span>{featured.city}</span>
          <svg className="place-ic" aria-hidden="true">
            <use href="#i-pin" />
          </svg>
        </div>

        <div className="big-temp">
          {formatTempValue(featured.tempC, unit)}° <i>{unit}</i>
        </div>

        <div className="metrics">
          <div className="metric">
            <svg className="metric-ic" aria-hidden="true">
              <use href="#i-wind" />
            </svg>
            <span>{featured.wind}</span>
          </div>
          <div className="metric">
            <svg className="metric-ic" aria-hidden="true">
              <use href="#i-drop" />
            </svg>
            <span>{featured.humidity}</span>
          </div>
          <div className="metric">
            <svg className="metric-ic" aria-hidden="true">
              <use href="#i-gust" />
            </svg>
            <span>{featured.gust}</span>
          </div>
        </div>
      </article>

      {locations.map((loc, idx) => (
        <button
          key={loc.id}
          type="button"
          className="card row"
          style={{ '--c': idx + 1 }}
          aria-label={`View forecast for ${loc.city}, ${loc.condition}, ${formatTempValue(loc.tempC, unit)} degrees`}
          onClick={() => onSelectLocation(loc.id)}
        >
          <span className="row-meta">
            <span className="row-country">{loc.country}</span>
            <span className="row-city">{loc.city}</span>
            <span className="row-cond">{loc.condition}</span>
          </span>
          <span className="row-stat">
            <svg className="row-ic" aria-hidden="true">
              <use href={`#${loc.icon}`} />
            </svg>
            <span className="row-temp">{formatTempValue(loc.tempC, unit)}°</span>
          </span>
        </button>
      ))}
    </aside>
  );
}
