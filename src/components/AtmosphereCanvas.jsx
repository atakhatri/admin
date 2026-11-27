import React, { useEffect, useRef, useState } from 'react';
import { WeatherAtmosphereEngine } from '../three/WeatherAtmosphereEngine';

export default function AtmosphereCanvas({
  preset,
  paused,
  lightningSeq,
  fallbackImage,
}) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const initialPresetRef = useRef(preset);
  const initialPausedRef = useRef(paused);
  const [webglFailed, setWebglFailed] = useState(false);

  // Mount WebGLRenderer & scene strictly ONCE so React UI updates never reset the canvas
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return undefined;

    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let engine = null;
    try {
      engine = new WeatherAtmosphereEngine(mountEl, initialPresetRef.current, {
        paused: initialPausedRef.current,
        reducedMotion: prefersReduced,
      });
      engineRef.current = engine;
    } catch (_err) {
      setWebglFailed(true);
    }

    return () => {
      if (engine) {
        engine.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (engineRef.current && preset) {
      engineRef.current.setTargetPreset(preset);
    }
  }, [preset]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setPaused(paused);
    }
  }, [paused]);

  useEffect(() => {
    if (lightningSeq > 0 && engineRef.current) {
      engineRef.current.triggerLightning();
    }
  }, [lightningSeq]);

  return (
    <div
      className="atmosphere-stage"
      data-testid="atmosphere-canvas"
      data-atmosphere-mode={preset?.conditionCategory || 'storm'}
      data-atmosphere-daytime={String(Boolean(preset?.isDaytime))}
      data-atmosphere-paused={String(Boolean(paused))}
      aria-hidden="true"
    >
      {webglFailed ? (
        <div
          className="hub-backdrop"
          style={{ '--bg-image': `url("${fallbackImage}")` }}
        />
      ) : (
        <div ref={mountRef} className="atmosphere-canvas-mount" />
      )}
      <div className="atmosphere-scrim" />
    </div>
  );
}
