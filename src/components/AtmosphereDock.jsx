import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, Sparkles, Zap } from 'lucide-react';
import { ATMOSPHERE_MODES } from '../three/atmospherePresets';

export default function AtmosphereDock({
  overrideMode,
  activePreset,
  liveWeather,
  paused,
  elevated,
  onSelectMode,
  onTogglePause,
  onTriggerLightning,
}) {
  const [expanded, setExpanded] = useState(false);

  // Keyboard shortcut 'H' toggles 3D scene dock when not typing in form fields
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      if ((e.key === 'h' || e.key === 'H') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setExpanded((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const currentLabel =
    overrideMode === 'live'
      ? liveWeather
        ? `Live · ${activePreset.label}`
        : activePreset.label
      : activePreset.label;

  return (
    <aside
      className={`atmosphere-dock-wrap${elevated ? ' is-elevated' : ''}`}
      aria-label="3D atmosphere scene controls"
    >
      {!expanded ? (
        <button
          type="button"
          className="atmosphere-toggle-btn"
          aria-expanded="false"
          onClick={() => setExpanded(true)}
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>3D Scene · {currentLabel}</span>
          <ChevronUp size={14} aria-hidden="true" />
        </button>
      ) : (
        <div className="atmosphere-dock" role="region" aria-label="3D weather scene controls">
          <div className="atmosphere-mode-group" role="group" aria-label="Weather scene mode">
            {ATMOSPHERE_MODES.map((m) => {
              const isSelected = overrideMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`dock-mode-btn${isSelected ? ' is-active' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectMode(m.id)}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="atmosphere-dock-actions">
            {activePreset.conditionCategory === 'storm' && (
              <button
                type="button"
                className="dock-action-btn"
                onClick={onTriggerLightning}
                title="Trigger lightning flash"
              >
                <Zap size={13} aria-hidden="true" />
                <span>Flash</span>
              </button>
            )}

            <button
              type="button"
              className="dock-action-btn"
              onClick={onTogglePause}
              aria-pressed={paused}
            >
              {paused ? (
                <>
                  <Play size={13} aria-hidden="true" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause size={13} aria-hidden="true" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="dock-action-btn"
              aria-label="Hide 3D scene controls"
              onClick={() => setExpanded(false)}
            >
              <ChevronDown size={14} aria-hidden="true" />
              <span>Hide</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
