import React, { useEffect, useState } from 'react';
import {
  SEARCHABLE_CITIES,
  WEATHER_ALERTS,
  filterCities,
  formatTempValue,
  validateNewLocation,
} from '../utils/weatherData';

export default function ToolOverlay({
  panel,
  unit,
  featured,
  locations,
  onClose,
  onSelectSearchCity,
  onAddCustomLocation,
  onChangeUnit,
  onResetDefault,
}) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Indonesia');
  const [condition, setCondition] = useState('Cloudy');
  const [tempC, setTempC] = useState('15');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setError('');
    setStatusMessage('');
  }, [panel]);

  useEffect(() => {
    if (!panel) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [panel, onClose]);

  if (!panel) return null;

  const allKnownCities = [featured, ...locations, ...SEARCHABLE_CITIES];
  const uniqueCities = allKnownCities.filter(
    (item, idx, arr) => arr.findIndex((other) => other.id === item.id) === idx
  );
  const filtered = filterCities(query, uniqueCities);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const res = validateNewLocation({ city, country, condition, tempC });
    if (!res.valid) {
      setError(res.error);
      return;
    }
    setError('');
    onAddCustomLocation(res.location);
    setCity('');
    onClose();
  };

  const titleMap = {
    search: 'Search Locations',
    add: 'Add Location',
    notifications: 'Weather Advisories',
    settings: 'Display Settings',
    profile: 'Calfin Danang',
    signout: 'Session',
  };

  return (
    <div
      className="overlay-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-label={titleMap[panel] || 'Weather panel'}
      >
        <div className="overlay-head">
          <h2 className="overlay-title">{titleMap[panel] || 'Weather'}</h2>
          <button
            type="button"
            className="overlay-close"
            aria-label="Close panel"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {panel === 'search' && (
          <div className="overlay-body">
            <label className="field-label" htmlFor="city-search-input">
              City or weather condition
            </label>
            <input
              id="city-search-input"
              type="search"
              className="glass-input"
              placeholder="Search Jakarta, Bandung, Surabaya..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            <div className="overlay-list">
              {filtered.length === 0 ? (
                <p className="overlay-empty">No matching regions found.</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="overlay-item"
                    onClick={() => {
                      onSelectSearchCity(item);
                      onClose();
                    }}
                  >
                    <span>
                      <strong>{item.city}</strong>
                      <small>
                        {item.country} · {item.condition}
                      </small>
                    </span>
                    <span className="overlay-temp">
                      {formatTempValue(item.tempC, unit)}°{unit}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {panel === 'add' && (
          <form className="overlay-body" onSubmit={handleAddSubmit} noValidate>
            <label className="field-label" htmlFor="new-city">
              City
            </label>
            <input
              id="new-city"
              type="text"
              className="glass-input"
              placeholder="e.g. Semarang"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoFocus
            />

            <div className="field-row">
              <div>
                <label className="field-label" htmlFor="new-country">
                  Country
                </label>
                <input
                  id="new-country"
                  type="text"
                  className="glass-input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="new-temp">
                  Temp (°C)
                </label>
                <input
                  id="new-temp"
                  type="number"
                  className="glass-input"
                  value={tempC}
                  onChange={(e) => setTempC(e.target.value)}
                />
              </div>
            </div>

            <label className="field-label" htmlFor="new-condition">
              Condition
            </label>
            <input
              id="new-condition"
              type="text"
              className="glass-input"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            />

            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}

            <div className="overlay-actions">
              <button type="submit" className="glass-action">
                Save Location
              </button>
            </div>
          </form>
        )}

        {panel === 'notifications' && (
          <div className="overlay-body">
            <div className="overlay-list">
              {WEATHER_ALERTS.map((alert) => (
                <div key={alert.id} className="alert-card">
                  <div className="alert-meta">
                    <span>{alert.region}</span>
                    <span aria-hidden="true">·</span>
                    <span>{alert.severity}</span>
                  </div>
                  <div className="alert-title">{alert.title}</div>
                  <p className="alert-detail">{alert.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(panel === 'settings' || panel === 'profile') && (
          <div className="overlay-body">
            <div className="setting-row">
              <span>Temperature Unit</span>
              <div className="unit-toggle" role="group" aria-label="Temperature unit">
                <button
                  type="button"
                  className={unit === 'C' ? 'is-active' : undefined}
                  aria-pressed={unit === 'C'}
                  onClick={() => onChangeUnit('C')}
                >
                  °C
                </button>
                <button
                  type="button"
                  className={unit === 'F' ? 'is-active' : undefined}
                  aria-pressed={unit === 'F'}
                  onClick={() => onChangeUnit('F')}
                >
                  °F
                </button>
              </div>
            </div>

            <div className="overlay-actions">
              <button
                type="button"
                className="glass-action"
                onClick={() => {
                  onResetDefault();
                  onClose();
                }}
              >
                Reset to Central Jakarta
              </button>
            </div>
          </div>
        )}

        {panel === 'signout' && (
          <div className="overlay-body">
            <p className="overlay-empty">
              Signed in as Calfin Danang. Reset dashboard view to default Central Jakarta forecast?
            </p>
            {statusMessage && <p className="overlay-empty">{statusMessage}</p>}
            <div className="overlay-actions">
              <button
                type="button"
                className="glass-action"
                onClick={() => {
                  onResetDefault();
                  setStatusMessage('Dashboard restored to default state.');
                  onClose();
                }}
              >
                Reset Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
