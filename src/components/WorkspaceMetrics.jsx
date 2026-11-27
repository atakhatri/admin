import React from 'react';
import {
  ArrowUpRight,
  FolderKanban,
  Images,
  Radio,
  Server,
} from 'lucide-react';
import { GRID_SLOT_COUNT } from '../utils/galleryHelpers';
import { MetricStripSkeleton } from './ui/Skeleton';

export default function WorkspaceMetrics({
  loading,
  projects,
  publishedProjectsCount,
  galleryState,
  blogs,
  publishedBlogsCount,
  consolesCount,
  onSelectTab,
}) {
  if (loading) {
    return <MetricStripSkeleton />;
  }

  const totalProjects = projects.length;
  const websiteCount = projects.filter((p) => p.type === 'Website').length;
  const mobileCount = projects.filter((p) => p.type === 'Mobile App').length;
  const completeCount = projects.filter((p) => p.status === 'Complete').length;
  const websitePct = totalProjects > 0 ? Math.round((websiteCount / totalProjects) * 100) : 0;

  const liveTotalCount =
    publishedProjectsCount +
    publishedBlogsCount +
    galleryState.gridSlots.filter((s) => s.item && s.item.published).length +
    galleryState.galleryImages.filter((i) => i.published).length;

  const publishCoveragePct =
    totalProjects > 0 ? Math.round((publishedProjectsCount / totalProjects) * 100) : 0;
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    ringCircumference - (publishCoveragePct / 100) * ringCircumference;

  const projectsWithConsoles = projects.filter(
    (p) =>
      p.authDashboardUrl ||
      p.dbDashboardUrl ||
      p.hostingDashboardUrl ||
      p.monitoringUrl
  ).length;

  const consoleBuckets = [
    { label: 'Auth', count: projects.filter((p) => p.authDashboardUrl).length },
    { label: 'DB', count: projects.filter((p) => p.dbDashboardUrl).length },
    { label: 'Host', count: projects.filter((p) => p.hostingDashboardUrl).length },
    { label: 'Logs', count: projects.filter((p) => p.monitoringUrl).length },
  ];
  const maxBucket = Math.max(1, ...consoleBuckets.map((b) => b.count));

  return (
    <section
      className="summary-strip"
      aria-label="Workspace overview telemetry"
      data-testid="workspace-metrics"
    >
      {/* 1. TOTAL PROJECTS */}
      <button
        type="button"
        className="metric-card metric-card--sky"
        onClick={() => onSelectTab('projects')}
      >
        <div className="metric-card-head">
          <span className="metric-card-label">Total Projects</span>
          <span className="metric-card-icon" aria-hidden="true">
            <FolderKanban size={15} strokeWidth={1.9} />
          </span>
        </div>

        <div className="metric-card-body">
          <span className="metric-card-value">{totalProjects}</span>
          <span className="metric-card-subval">
            {completeCount} complete
          </span>
        </div>

        <div className="metric-split-bar" aria-hidden="true">
          <span
            className="metric-split-fill metric-split-fill--primary"
            style={{ width: `${totalProjects > 0 ? Math.max(10, websitePct) : 0}%` }}
          />
          {mobileCount > 0 && (
            <span
              className="metric-split-fill metric-split-fill--secondary"
              style={{ width: `${Math.max(10, 100 - websitePct)}%` }}
            />
          )}
        </div>

        <div className="metric-card-foot">
          <span>
            {websiteCount} Web · {mobileCount} Mobile
          </span>
          <ArrowUpRight size={14} className="metric-card-arrow" aria-hidden="true" />
        </div>
      </button>

      {/* 2. LIVE IN API (Radial Coverage Ring) */}
      <button
        type="button"
        className="metric-card metric-card--emerald"
        onClick={() => onSelectTab('api')}
      >
        <div className="metric-card-head">
          <span className="metric-card-label">Live in API</span>
          <span className="metric-card-icon" aria-hidden="true">
            <Radio size={15} strokeWidth={1.9} />
          </span>
        </div>

        <div className="metric-card-body metric-card-body--ring">
          <div className="metric-val-stack">
            <span className="metric-card-value">{publishedProjectsCount}</span>
            <span className="metric-card-subval">
              {liveTotalCount} total endpoints items
            </span>
          </div>

          <div className="metric-ring-wrap" aria-hidden="true">
            <svg viewBox="0 0 44 44" className="metric-ring-svg">
              <circle cx="22" cy="22" r={ringRadius} className="metric-ring-track" />
              <circle
                cx="22"
                cy="22"
                r={ringRadius}
                className="metric-ring-arc"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringDashOffset}
              />
            </svg>
            <span className="metric-ring-pct">{publishCoveragePct}%</span>
          </div>
        </div>

        <div className="metric-card-foot">
          <span>
            {publishedBlogsCount}/{blogs.length} blogs live
          </span>
          <ArrowUpRight size={14} className="metric-card-arrow" aria-hidden="true" />
        </div>
      </button>

      {/* 3. GALLERY GRID (Miniature 5-Slot Bento Preview) */}
      <button
        type="button"
        className="metric-card metric-card--indigo"
        onClick={() => onSelectTab('gallery')}
      >
        <div className="metric-card-head">
          <span className="metric-card-label">Gallery Grid</span>
          <span className="metric-card-icon" aria-hidden="true">
            <Images size={15} strokeWidth={1.9} />
          </span>
        </div>

        <div className="metric-card-body metric-card-body--bento">
          <div className="metric-val-stack">
            <span className="metric-card-value">
              {galleryState.filledGridCount}
              <span className="metric-card-denom">/{GRID_SLOT_COUNT}</span>
            </span>
            <span className="metric-card-subval">featured slots</span>
          </div>

          <div className="metric-mini-bento" aria-hidden="true">
            {galleryState.gridSlots.map(({ slot, item }) => (
              <span
                key={slot}
                className={`metric-bento-cell${slot === 1 ? ' is-hero' : ''}${
                  item ? ' is-filled' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="metric-card-foot">
          <span>
            +{galleryState.galleryImages.length} gallery{' '}
            {galleryState.galleryImages.length === 1 ? 'photo' : 'photos'}
          </span>
          <ArrowUpRight size={14} className="metric-card-arrow" aria-hidden="true" />
        </div>
      </button>

      {/* 4. LINKED CONSOLES (4-Channel Mini Bar Chart) */}
      <button
        type="button"
        className="metric-card metric-card--amber"
        onClick={() => onSelectTab('consoles')}
      >
        <div className="metric-card-head">
          <span className="metric-card-label">Linked Consoles</span>
          <span className="metric-card-icon" aria-hidden="true">
            <Server size={15} strokeWidth={1.9} />
          </span>
        </div>

        <div className="metric-card-body metric-card-body--bars">
          <div className="metric-val-stack">
            <span className="metric-card-value">{consolesCount}</span>
            <span className="metric-card-subval">
              {projectsWithConsoles} {projectsWithConsoles === 1 ? 'app' : 'apps'} wired
            </span>
          </div>

          <div className="metric-mini-bars" aria-hidden="true">
            {consoleBuckets.map((bucket) => {
              const heightPct =
                bucket.count > 0 ? Math.max(24, Math.round((bucket.count / maxBucket) * 100)) : 14;
              return (
                <div key={bucket.label} className="metric-bar-col">
                  <div className="metric-bar-track">
                    <span
                      className={`metric-bar-fill${bucket.count > 0 ? ' is-active' : ''}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="metric-bar-tag">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="metric-card-foot">
          <span>Auth · DB · Host · Logs</span>
          <ArrowUpRight size={14} className="metric-card-arrow" aria-hidden="true" />
        </div>
      </button>
    </section>
  );
}
