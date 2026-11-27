import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  IdCard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { GRID_SLOT_COUNT } from '../utils/galleryHelpers';

const TAB_LABELS = {
  home: '',
  projects: 'Projects',
  gallery: 'Gallery',
  consoles: 'Consoles',
  api: 'Portfolio API',
  blogs: 'Blogs',
  profile: 'Portfolio Profile',
  settings: 'Settings',
};

export default function HubHeader({
  user,
  activeTab,
  searchQuery,
  onSearchChange,
  onPrimaryAdd,
  onOpenPortfolioProfile,
  onSignOut,
  stats,
  weather,
  isClearDay = false,
}) {
  const [openPopover, setOpenPopover] = useState(null); // 'search' | 'notifications' | 'profile' | null
  const toolsRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (openPopover === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [openPopover]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setOpenPopover(null);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenPopover(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const ownerName =
    user?.displayName || (user?.email ? user.email.split('@')[0] : 'Owner');
  const sectionLabel = TAB_LABELS[activeTab] || '';
  const isGalleryTab = activeTab === 'gallery';
  const isBlogsTab = activeTab === 'blogs';

  const primaryAddLabel = isGalleryTab
    ? 'Add Gallery Image'
    : isBlogsTab
    ? 'New Blog Post'
    : 'New Project';

  const searchPlaceholder = isGalleryTab
    ? 'Search gallery title, category...'
    : isBlogsTab
    ? 'Search blogs, tags, category...'
    : 'Search projects, tags, type...';

  const notifications = [
    {
      id: 'api-projects',
      title: `${stats.publishedProjects} of ${stats.totalProjects} projects published`,
      detail: 'Visible on your portfolio',
    },
    {
      id: 'api-blogs',
      title: `${stats.publishedBlogs || 0} of ${stats.totalBlogs || 0} blog posts published`,
      detail: 'Visible on your blog',
    },
    {
      id: 'gallery-slots',
      title: `Gallery Grid: ${stats.filledGridCount} / ${GRID_SLOT_COUNT} slots filled`,
      detail: `${stats.galleryImagesCount} gallery images saved`,
    },
    ...(stats.draftProjects > 0
      ? [
          {
            id: 'drafts',
            title: `${stats.draftProjects} unpublished project ${
              stats.draftProjects === 1 ? 'draft' : 'drafts'
            }`,
            detail: 'Hidden until published',
          },
        ]
      : []),
    ...(weather
      ? [
          {
            id: 'weather-sync',
            title: `Live weather synced for ${weather.cityLabel}`,
            detail: `${weather.description}`,
          },
        ]
      : []),
  ];

  const togglePopover = (key) => {
    setOpenPopover((prev) => (prev === key ? null : key));
  };

  return (
    <header className="hub-header">
      <div className="hub-greet">
        <span className="hub-greet-hello">
          {sectionLabel ? `Welcome · ${sectionLabel}` : 'Welcome'}
        </span>
        <span className="hub-greet-who">{ownerName}</span>
      </div>

      <div
        className={`hub-tools-wrap${isClearDay ? ' is-clear-day' : ''}`}
        data-clear-day={String(Boolean(isClearDay))}
        ref={toolsRef}
      >
        {openPopover === 'search' && (
          <div className="header-search-bar" role="search">
            <Search size={15} className="header-search-ic" aria-hidden="true" />
            <label htmlFor="hub-global-search" className="sr-only">
              {searchPlaceholder}
            </label>
            <input
              ref={searchInputRef}
              id="hub-global-search"
              type="search"
              className="header-search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="header-search-clear"
                aria-label="Clear search"
                onClick={() => onSearchChange('')}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="hub-tools-cluster" aria-label="Quick workspace actions">
          <button
            type="button"
            className="tool-circle-btn"
            aria-label={primaryAddLabel}
            title={primaryAddLabel}
            onClick={() => {
              setOpenPopover(null);
              onPrimaryAdd();
            }}
          >
            <Plus size={19} strokeWidth={2} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`tool-circle-btn${
              openPopover === 'search' || searchQuery ? ' is-open' : ''
            }`}
            aria-label="Search workspace"
            aria-expanded={openPopover === 'search'}
            title="Search"
            onClick={() => togglePopover('search')}
          >
            <Search size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`tool-circle-btn${
              openPopover === 'notifications' ? ' is-open' : ''
            }`}
            aria-label="Workspace notifications"
            aria-expanded={openPopover === 'notifications'}
            title="Notifications"
            onClick={() => togglePopover('notifications')}
          >
            <Bell size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>

          <button
            type="button"
            className={`tool-avatar-btn${openPopover === 'profile' ? ' is-open' : ''}`}
            aria-label={`${ownerName} profile`}
            aria-expanded={openPopover === 'profile'}
            title={ownerName}
            onClick={() => togglePopover('profile')}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={ownerName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <User size={19} strokeWidth={1.9} aria-hidden="true" />
            )}
          </button>
        </div>

        {openPopover === 'notifications' && (
          <div
            className="header-popover"
            role="dialog"
            aria-label="Workspace notifications"
          >
            <div className="header-popover-head">
              <strong>Workspace Status</strong>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close notifications"
                onClick={() => setOpenPopover(null)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <ul className="header-notify-list">
              {notifications.map((note) => (
                <li key={note.id} className="header-notify-item">
                  <span className="header-notify-title">{note.title}</span>
                  <span className="header-notify-detail">{note.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {openPopover === 'profile' && (
          <div className="header-popover" role="dialog" aria-label="Owner profile menu">
            <div className="header-profile-head">
              <div className="header-profile-name">{ownerName}</div>
              <div className="header-profile-email">{user?.email}</div>
              <span className="status-text status-published header-profile-role">
                <ShieldCheck size={13} aria-hidden="true" />
                <span>Verified Owner</span>
              </span>
            </div>
            <div className="header-popover-actions">
              <button
                type="button"
                className="btn-ghost-sm header-popover-btn"
                onClick={() => {
                  setOpenPopover(null);
                  if (onOpenPortfolioProfile) onOpenPortfolioProfile();
                }}
              >
                <IdCard size={15} aria-hidden="true" />
                <span>Portfolio Profile</span>
              </button>
              <button
                type="button"
                className="btn-logout-danger header-popover-btn"
                onClick={() => {
                  setOpenPopover(null);
                  onSignOut();
                }}
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
