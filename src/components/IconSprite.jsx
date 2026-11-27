import React from 'react';

export function BrandLogo() {
  return (
    <svg
      className="logo-svg"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="logo-wave-clip">
          <circle cx="20" cy="20" r="13.5" />
        </clipPath>
      </defs>
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="12"
        fill="rgba(255,255,255,0.14)"
        stroke="rgba(255,255,255,0.34)"
        strokeWidth="1.2"
      />
      <g
        clipPath="url(#logo-wave-clip)"
        stroke="#ffffff"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <polyline points="4,9 10,7.2 16,10.8 22,7.2 28,10.8 36,8.4" />
        <polyline points="4,12.7 10,10.9 16,14.5 22,10.9 28,14.5 36,12.1" />
        <polyline points="4,16.4 10,14.6 16,18.2 22,14.6 28,18.2 36,15.8" />
        <polyline points="4,20.1 10,18.3 16,21.9 22,18.3 28,21.9 36,19.5" />
        <polyline points="4,23.8 10,22.0 16,25.6 22,22.0 28,25.6 36,23.2" />
        <polyline points="4,27.5 10,25.7 16,29.3 22,25.7 28,29.3 36,26.9" />
        <polyline points="4,31.2 10,29.4 16,33.0 22,29.4 28,33.0 36,30.6" />
      </g>
    </svg>
  );
}

export default function IconSprite() {
  return (
    <svg className="sprite" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="avatar-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e4d5c" />
          <stop offset="100%" stopColor="#0a2230" />
        </linearGradient>

        {/* Dashboard grid */}
        <symbol id="i-grid" viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
        </symbol>

        {/* Reports chart */}
        <symbol id="i-chart" viewBox="0 0 24 24" fill="none">
          <path
            d="M4.5 19.5H19.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <rect x="5.5" y="12" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.7" />
          <rect x="10.5" y="8" width="3" height="9" rx="1" stroke="currentColor" strokeWidth="1.7" />
          <rect x="15.5" y="5" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.7" />
        </symbol>

        {/* Explore regions globe */}
        <symbol id="i-globe" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <ellipse cx="12" cy="12" rx="3.8" ry="8.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 9.5H20M4 14.5H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>

        {/* Calendar */}
        <symbol id="i-cal" viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 3.2V6.5M16 3.2V6.5M3.5 9.8H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8.5" cy="14" r="1" fill="currentColor" />
          <circle cx="12" cy="14" r="1" fill="currentColor" />
          <circle cx="15.5" cy="14" r="1" fill="currentColor" />
        </symbol>

        {/* Settings gear */}
        <symbol id="i-gear" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a1.9 1.9 0 0 1-2.69 2.69l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a1.9 1.9 0 0 1-3.8 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a1.9 1.9 0 0 1-2.69-2.69l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a1.9 1.9 0 0 1 0-3.8h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a1.9 1.9 0 0 1 2.69-2.69l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a1.9 1.9 0 0 1 3.8 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a1.9 1.9 0 0 1 2.69 2.69l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a1.9 1.9 0 0 1 0 3.8h-.09a1.65 1.65 0 0 0-1.51 1.2Z"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        {/* Sign out */}
        <symbol id="i-out" viewBox="0 0 24 24" fill="none">
          <path
            d="M10 4.5H6.5A2 2 0 0 0 4.5 6.5V17.5A2 2 0 0 0 6.5 19.5H10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 8.5L19 12L15 15.5M18.5 12H9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        {/* Plus */}
        <symbol id="i-plus" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5.5V18.5M5.5 12H18.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </symbol>

        {/* Search */}
        <symbol id="i-search" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
          <path d="M16 16L20 20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </symbol>

        {/* Notifications bell */}
        <symbol id="i-bell" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 15.5V10.5A6 6 0 0 0 6 10.5V15.5L4.5 17.5H19.5L18 15.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.8 18.2A2.2 2.2 0 0 0 14.2 18.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </symbol>

        {/* Location pin */}
        <symbol id="i-pin" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 20.5S6 15.1 6 10.2A6 6 0 1 1 18 10.2C18 15.1 12 20.5 12 20.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.7" />
        </symbol>

        {/* Wind speed */}
        <symbol id="i-wind" viewBox="0 0 24 24" fill="none">
          <path
            d="M3.5 9H14.5A2.5 2.5 0 1 0 12 6.5M3.5 13H17.5A2.5 2.5 0 1 1 15 15.5M3.5 17H10.5A2 2 0 1 1 8.5 19"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </symbol>

        {/* Humidity droplet */}
        <symbol id="i-drop" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3.8C12 3.8 6.2 10.5 6.2 14.4A5.8 5.8 0 0 0 17.8 14.4C17.8 10.5 12 3.8 12 3.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 14.8A2.6 2.6 0 0 0 12.1 17.3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </symbol>

        {/* Gust / breeze pressure */}
        <symbol id="i-gust" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 15.5A8 8 0 1 1 20 15.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 15.5L15.8 11.2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
        </symbol>

        {/* Cloud */}
        <symbol id="i-cloud" viewBox="0 0 32 32" fill="none">
          <path
            d="M9.6 23.2H22.8A4.8 4.8 0 0 0 23.4 13.7A6.6 6.6 0 0 0 10.8 11.9A5.4 5.4 0 0 0 9.6 23.2Z"
            fill="currentColor"
            fillOpacity="0.92"
          />
        </symbol>

        {/* Partly cloudy / cloud2 */}
        <symbol id="i-cloud2" viewBox="0 0 32 32" fill="none">
          <circle cx="21.2" cy="11.4" r="4.2" fill="currentColor" fillOpacity="0.88" />
          <path
            d="M21.2 4.8V6.1M26.8 11.4H25.5M25.2 7.4L24.2 8.4M17.2 7.4L18.2 8.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.82"
          />
          <path
            d="M8.4 23.8H21.2A4.4 4.4 0 0 0 21.8 15.1A6 6 0 0 0 10.2 13.6A4.9 4.9 0 0 0 8.4 23.8Z"
            fill="currentColor"
          />
        </symbol>

        {/* Hail / heavy rain */}
        <symbol id="i-hail" viewBox="0 0 32 32" fill="none">
          <path
            d="M9.2 19.6H22.4A4.4 4.4 0 0 0 23 10.9A6 6 0 0 0 11.4 9.3A5 5 0 0 0 9.2 19.6Z"
            fill="currentColor"
            fillOpacity="0.95"
          />
          <path
            d="M11.8 22.8L10.6 25.4M16.2 22.8L15 25.4M20.6 22.8L19.4 25.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="13.2" cy="27.4" r="1.05" fill="currentColor" />
          <circle cx="17.6" cy="27.4" r="1.05" fill="currentColor" />
        </symbol>

        {/* Sun */}
        <symbol id="i-sun" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="5.6" fill="currentColor" />
          <path
            d="M16 5.5V8M16 24V26.5M5.5 16H8M24 16H26.5M8.6 8.6L10.4 10.4M21.6 21.6L23.4 23.4M23.4 8.6L21.6 10.4M10.4 21.6L8.6 23.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </symbol>

        {/* Vector fallback portrait avatar */}
        <symbol id="i-avatar" viewBox="0 0 52 52" fill="none">
          <rect width="52" height="52" rx="26" fill="url(#avatar-bg-grad)" />
          <circle cx="26" cy="20.5" r="8.5" fill="rgba(255,255,255,0.88)" />
          <path
            d="M11 45C13.2 36.8 18.8 32.5 26 32.5C33.2 32.5 38.8 36.8 41 45"
            fill="rgba(255,255,255,0.84)"
          />
        </symbol>
      </defs>
    </svg>
  );
}
