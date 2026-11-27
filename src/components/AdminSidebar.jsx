import React from 'react';
import {
  Code2,
  FileText,
  FolderKanban,
  Home,
  Images,
  LogOut,
  Server,
  Settings,
} from 'lucide-react';
import { BrandLogo } from './IconSprite';

export const ADMIN_TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'consoles', label: 'Consoles', icon: Server },
  { id: 'api', label: 'Portfolio API', icon: Code2 },
  { id: 'blogs', label: 'Blogs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({ activeTab, onSelectTab, onSignOut }) {
  const [faviconFailed, setFaviconFailed] = React.useState(false);
  const activeIdx = Math.max(
    0,
    ADMIN_TABS.findIndex((tab) => tab.id === activeTab)
  );

  return (
    <aside className="hub-sidebar" aria-label="Primary navigation">
      <span
        className="hub-pip"
        aria-hidden="true"
        style={{ transform: `translateY(${activeIdx * 56}px)` }}
      />

      <button
        type="button"
        className="hub-logo-btn"
        aria-label="Admin Dashboard Home"
        title="Admin Dashboard"
        onClick={() => onSelectTab('home')}
      >
        {!faviconFailed ? (
          <img
            src="/favicon.ico"
            alt="Admin Dashboard"
            className="hub-brand-favicon"
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <BrandLogo />
        )}
      </button>

      <nav className="hub-nav" aria-label="Admin sections">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isCurrent = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              className={`hub-nav-btn${isCurrent ? ' is-active' : ''}`}
              aria-label={tab.label}
              aria-current={isCurrent ? 'page' : undefined}
              title={tab.label}
              onClick={() => onSelectTab(tab.id)}
            >
              <Icon size={20} strokeWidth={1.85} aria-hidden="true" />
              <span className="hub-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="hub-logout-btn"
        aria-label="Sign out"
        title="Sign out"
        onClick={onSignOut}
      >
        <LogOut size={20} strokeWidth={1.85} aria-hidden="true" />
      </button>
    </aside>
  );
}
