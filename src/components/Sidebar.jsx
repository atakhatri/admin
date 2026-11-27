import React from 'react';
import { BrandLogo } from './IconSprite';
import { NAV_ITEMS, getPipTopUnits } from '../utils/weatherData';

export default function Sidebar({ activeNavIndex, onSelectNav, onLogoClick, onSignOut }) {
  const pipTop = getPipTopUnits(activeNavIndex);

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <span
        className="pip"
        aria-hidden="true"
        style={{ '--pip-top': `calc(${pipTop} * var(--u))` }}
      />

      <button
        type="button"
        className="logo-btn"
        aria-label="Aurora Weather Home"
        onClick={onLogoClick}
      >
        <BrandLogo />
      </button>

      <nav className="nav" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item, idx) => {
          const isCurrent = idx === activeNavIndex;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-label={item.label}
              aria-current={isCurrent ? 'page' : undefined}
              className={isCurrent ? 'active' : undefined}
              style={{ '--i': idx }}
              onClick={(e) => {
                e.preventDefault();
                onSelectNav(idx, item.id);
              }}
            >
              <svg className="nav-ic" aria-hidden="true">
                <use href={`#${item.icon}`} />
              </svg>
            </a>
          );
        })}
      </nav>

      <button
        type="button"
        className="logout"
        aria-label="Sign out"
        onClick={onSignOut}
      >
        <svg className="nav-ic" aria-hidden="true">
          <use href="#i-out" />
        </svg>
      </button>
    </aside>
  );
}
