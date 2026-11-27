import React, { useEffect, useState } from 'react';
import {
  Code2,
  FileText,
  FolderKanban,
  Home,
  Images,
  LogOut,
  Plus,
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
  const [faviconFailed, setFaviconFailed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeIdx = Math.max(
    0,
    ADMIN_TABS.findIndex((tab) => tab.id === activeTab)
  );

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const handleMobileSelect = (tabId) => {
    setMobileMenuOpen(false);
    onSelectTab(tabId);
  };

  return (
    <>
      {/* Desktop Vertical Rail Sidebar (> 860px) */}
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

      {/* Mobile Google Drive-Style Expandable FAB Menu (<= 860px) */}
      <div
        className={`mobile-fab-shell${mobileMenuOpen ? ' is-open' : ''}`}
        data-testid="mobile-fab-nav"
      >
        {mobileMenuOpen && (
          <div
            className="mobile-fab-backdrop"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <nav
          id="mobile-fab-menu"
          className="mobile-fab-menu"
          aria-label="Mobile navigation menu"
          aria-hidden={!mobileMenuOpen}
        >
          {ADMIN_TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isCurrent = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                tabIndex={mobileMenuOpen ? 0 : -1}
                className={`mobile-fab-item${isCurrent ? ' is-active' : ''}`}
                style={{ '--fab-index': ADMIN_TABS.length - idx }}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => handleMobileSelect(tab.id)}
              >
                <span className="mobile-fab-label">{tab.label}</span>
                <span className="mobile-fab-icon">
                  <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                </span>
              </button>
            );
          })}

          <button
            type="button"
            tabIndex={mobileMenuOpen ? 0 : -1}
            className="mobile-fab-item is-danger"
            style={{ '--fab-index': 0 }}
            onClick={() => {
              setMobileMenuOpen(false);
              onSignOut();
            }}
          >
            <span className="mobile-fab-label">Sign Out</span>
            <span className="mobile-fab-icon">
              <LogOut size={18} strokeWidth={1.9} aria-hidden="true" />
            </span>
          </button>
        </nav>

        <button
          type="button"
          className={`mobile-fab-trigger${mobileMenuOpen ? ' is-open' : ''}`}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-fab-menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <Plus size={26} strokeWidth={2.2} className="mobile-fab-plus" aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
