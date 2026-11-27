import React from 'react';
import { AVATAR_URL } from '../utils/weatherData';

export default function Header({ activePanel, onOpenPanel }) {
  return (
    <header className="header">
      <div className="greet">
        <div className="hello">Welcome</div>
        <div className="who">Calfin Danang</div>
      </div>

      <div className="tools">
        <button
          type="button"
          className={`tool${activePanel === 'add' ? ' is-open' : ''}`}
          aria-label="Add location"
          aria-expanded={activePanel === 'add'}
          style={{ '--t': 0 }}
          onClick={() => onOpenPanel('add')}
        >
          <svg className="tool-ic" aria-hidden="true">
            <use href="#i-plus" />
          </svg>
        </button>

        <button
          type="button"
          className={`tool${activePanel === 'search' ? ' is-open' : ''}`}
          aria-label="Search"
          aria-expanded={activePanel === 'search'}
          style={{ '--t': 1 }}
          onClick={() => onOpenPanel('search')}
        >
          <svg className="tool-ic" aria-hidden="true">
            <use href="#i-search" />
          </svg>
        </button>

        <button
          type="button"
          className={`tool${activePanel === 'notifications' ? ' is-open' : ''}`}
          aria-label="Notifications"
          aria-expanded={activePanel === 'notifications'}
          style={{ '--t': 2 }}
          onClick={() => onOpenPanel('notifications')}
        >
          <svg className="tool-ic" aria-hidden="true">
            <use href="#i-bell" />
          </svg>
        </button>

        <button
          type="button"
          className="avatar"
          aria-label="Calfin Danang profile"
          style={{ '--t': 3 }}
          onClick={() => onOpenPanel('profile')}
        >
          <svg className="avatar-fallback" aria-hidden="true">
            <use href="#i-avatar" />
          </svg>
          <img
            src={AVATAR_URL}
            alt="Calfin Danang"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.remove();
            }}
          />
        </button>
      </div>
    </header>
  );
}
