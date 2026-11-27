import React, { useState } from 'react';
import { Check, Link2, LogOut, Pause, Play, ShieldCheck, Sparkles, Unlink, Zap } from 'lucide-react';
import { OWNER_EMAIL } from '../utils/projectHelpers';
import { ATMOSPHERE_MODES } from '../three/atmospherePresets';
import { getLinkedProviderIds } from '../firebase';

export default function SettingsView({
  user,
  unit,
  onChangeUnit,
  onSignOut,
  onLinkGithub,
  onUnlinkGithub,
  sceneModeOverride,
  activePreset,
  liveWeather,
  scenePaused,
  onSelectSceneMode,
  onToggleScenePause,
  onTriggerLightning,
}) {
  const [linkingBusy, setLinkingBusy] = useState(false);
  const [linkMessage, setLinkMessage] = useState('');
  const [linkError, setLinkError] = useState('');

  const linkedProviders = getLinkedProviderIds(user);
  const hasGoogle = linkedProviders.includes('google.com');
  const hasGithub = linkedProviders.includes('github.com');

  const handleLinkGithubClick = async () => {
    setLinkingBusy(true);
    setLinkError('');
    setLinkMessage('');
    try {
      await onLinkGithub();
      setLinkMessage('GitHub linked! You can now sign in with either Google or GitHub.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to link GitHub account.';
      if (!msg.includes('popup-closed-by-user')) {
        setLinkError(msg);
      }
    } finally {
      setLinkingBusy(false);
    }
  };

  const handleUnlinkGithubClick = async () => {
    setLinkingBusy(true);
    setLinkError('');
    setLinkMessage('');
    try {
      await onUnlinkGithub();
      setLinkMessage('GitHub sign-in disconnected.');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Unable to disconnect GitHub.');
    } finally {
      setLinkingBusy(false);
    }
  };
  return (
    <section className="workspace-section" aria-label="Workspace settings">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Workspace Settings</h2>
          <p className="section-subtitle">
            3D atmospheric sky controls, weather unit preferences, and owner session security.
          </p>
        </div>
      </div>

      <div className="settings-stack">
        {/* 3D ATMOSPHERE SCENE CONTROLS (MOVED FROM BOTTOM CAPSULE) */}
        <div className="api-panel">
          <div className="settings-scene-head">
            <div>
              <h3 className="settings-item-title settings-title-with-icon">
                <Sparkles size={16} aria-hidden="true" />
                <span>3D Atmosphere Scene</span>
              </h3>
              <p className="settings-item-copy">
                {sceneModeOverride === 'live'
                  ? liveWeather
                    ? `Synced live to ${liveWeather.cityLabel} (${activePreset.label}).`
                    : `Auto-syncs when current location weather loads (currently ${activePreset.label}).`
                  : `Manual preview override active: ${activePreset.label}.`}
              </p>
            </div>

            <div className="settings-scene-actions">
              {activePreset.conditionCategory === 'storm' && (
                <button
                  type="button"
                  className="btn-ghost-sm"
                  onClick={onTriggerLightning}
                >
                  <Zap size={14} aria-hidden="true" />
                  <span>Flash</span>
                </button>
              )}
              <button
                type="button"
                className="btn-ghost-sm"
                aria-pressed={scenePaused}
                onClick={onToggleScenePause}
              >
                {scenePaused ? (
                  <>
                    <Play size={14} aria-hidden="true" />
                    <span>Resume 3D</span>
                  </>
                ) : (
                  <>
                    <Pause size={14} aria-hidden="true" />
                    <span>Pause 3D</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            className="settings-scene-modes"
            role="group"
            aria-label="3D weather sky preset"
          >
            {ATMOSPHERE_MODES.map((m) => {
              const isSelected = sceneModeOverride === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`dock-mode-btn${isSelected ? ' is-active' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectSceneMode(m.id)}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="api-panel">
          <div className="settings-row">
            <div>
              <h3 className="settings-item-title">Verified Owner Account</h3>
              <p className="settings-item-copy">
                {user?.displayName || 'Owner'} · {user?.email || OWNER_EMAIL}
              </p>
            </div>
            <span className="status-text status-published">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>Allowlisted Owner</span>
            </span>
          </div>

          <div className="settings-divider" />

          <div className="settings-row">
            <div>
              <h3 className="settings-item-title">Connected Sign-In Methods</h3>
              <p className="settings-item-copy">
                Link GitHub to your Google owner account so both providers open the same workspace
                and data.
              </p>
              {linkMessage && (
                <p className="settings-item-copy" style={{ color: '#86efac', marginTop: 6 }}>
                  {linkMessage}
                </p>
              )}
              {linkError && (
                <p className="field-error-banner" role="alert" style={{ marginTop: 8 }}>
                  {linkError}
                </p>
              )}
            </div>
            <div className="settings-scene-actions">
              {hasGoogle && (
                <span className="status-text status-published">
                  <Check size={14} aria-hidden="true" />
                  <span>Google</span>
                </span>
              )}
              {hasGithub ? (
                <button
                  type="button"
                  className="btn-ghost-sm"
                  disabled={linkingBusy || !hasGoogle}
                  onClick={handleUnlinkGithubClick}
                >
                  <Unlink size={14} aria-hidden="true" />
                  <span>{linkingBusy ? 'Updating...' : 'Unlink GitHub'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={linkingBusy}
                  onClick={handleLinkGithubClick}
                >
                  <Link2 size={14} aria-hidden="true" />
                  <span>{linkingBusy ? 'Linking...' : 'Link GitHub'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-row">
            <div>
              <h3 className="settings-item-title">Temperature Unit</h3>
              <p className="settings-item-copy">
                Applies to the floating current-location weather display on Home.
              </p>
            </div>
            <div className="segmented-control" role="group" aria-label="Temperature unit">
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

          <div className="settings-divider" />

          <div className="settings-row">
            <div>
              <h3 className="settings-item-title">Session Control</h3>
              <p className="settings-item-copy">
                Sign out of Firebase Authentication on this browser.
              </p>
            </div>
            <button type="button" className="btn-logout-danger" onClick={onSignOut}>
              <LogOut size={15} aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
