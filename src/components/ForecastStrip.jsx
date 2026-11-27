import React from 'react';
import { buildFillPath, buildWavePathFromTemps, formatTempValue } from '../utils/weatherData';

export default function ForecastStrip({
  forecast,
  wavePath,
  activeDayIndex,
  unit,
  onSelectDay,
  chartKey,
}) {
  const strokePath = wavePath || buildWavePathFromTemps(forecast);
  const fillPath = buildFillPath(strokePath);

  return (
    <section className="forecast" aria-label="Weekly temperature forecast">
      <div className="temps" role="list" aria-label="Daily temperatures">
        {forecast.map((item, idx) => {
          const isActive = idx === activeDayIndex;
          return (
            <div
              key={item.day}
              role="listitem"
              className={`temp-item${isActive ? ' is-selected' : ''}`}
              style={{ '--i': idx }}
            >
              <span className="temp-val">{formatTempValue(item.tempC, unit)}°</span>
              <svg className="temp-ic" aria-hidden="true">
                <use href={`#${item.icon}`} />
              </svg>
            </div>
          );
        })}
      </div>

      <div className="wave-wrap" key={chartKey}>
        <svg
          className="wave"
          viewBox="0 0 835 230"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="wg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
              <stop offset="12%" stopColor="#ffffff" stopOpacity="0.88" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="88%" stopColor="#ffffff" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.30" />
            </linearGradient>

            <linearGradient id="wf" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.26" />
              <stop offset="58%" stopColor="#ffffff" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="wfade-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="72%" stopColor="#ffffff" stopOpacity="0.68" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="wfade-edge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.72" />
              <stop offset="6%" stopColor="#000000" stopOpacity="0" />
              <stop offset="94%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.72" />
            </linearGradient>

            <mask id="wfade">
              <rect x="0" y="0" width="835" height="230" fill="url(#wfade-grad)" />
              <rect x="0" y="0" width="835" height="230" fill="url(#wfade-edge)" />
            </mask>

            <clipPath id="wclip">
              <rect id="wclipr" x="0" y="0" width="835" height="230" />
            </clipPath>
          </defs>

          <g clipPath="url(#wclip)" mask="url(#wfade)">
            <path d={fillPath} fill="url(#wf)" />
          </g>

          <path
            className="wline"
            d={strokePath}
            fill="none"
            stroke="url(#wg)"
            strokeWidth="6.2"
            strokeLinecap="round"
            opacity="0.17"
            pathLength="1"
          />
          <path
            className="wline"
            d={strokePath}
            fill="none"
            stroke="url(#wg)"
            strokeWidth="4.6"
            strokeLinecap="round"
            opacity="0.26"
            pathLength="1"
          />
          <path
            className="wline"
            d={strokePath}
            fill="none"
            stroke="url(#wg)"
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="1"
            pathLength="1"
          />
        </svg>
      </div>

      <div className="days" role="group" aria-label="Forecast days">
        {forecast.map((item, idx) => {
          const isActive = idx === activeDayIndex;
          return (
            <button
              key={item.day}
              type="button"
              className={`day-btn${isActive ? ' on' : ''}`}
              aria-pressed={isActive}
              style={{ '--i': idx }}
              onClick={() => onSelectDay(idx)}
            >
              {item.day}
            </button>
          );
        })}
      </div>
    </section>
  );
}
