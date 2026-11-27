import React from 'react';

/**
 * shadcn/ui-inspired Skeleton primitive adapted for liquid-glass surfaces.
 * Uses smooth pulse + specular shimmer with exact geometry placeholders.
 */
export function Skeleton({ className = '', style, ...props }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={`sh-skeleton ${className}`.trim()}
      style={style}
      {...props}
    />
  );
}

export function WeatherHeroSkeleton() {
  return (
    <div className="weather-skeleton-stack" aria-busy="true" aria-label="Loading live weather">
      <div className="weather-chip-row">
        <Skeleton className="sh-pill" style={{ width: 158, height: 34 }} />
        <Skeleton className="sh-circle" style={{ width: 34, height: 34 }} />
      </div>
      <div className="weather-skeleton-headline">
        <Skeleton style={{ width: 112, height: 50, borderRadius: 14 }} />
        <Skeleton style={{ width: 168, height: 28, borderRadius: 10 }} />
      </div>
      <Skeleton style={{ width: 248, height: 16, borderRadius: 8 }} />
    </div>
  );
}

export function MetricStripSkeleton() {
  return (
    <section
      className="summary-strip"
      aria-busy="true"
      aria-label="Loading workspace telemetry"
    >
      {[0, 1, 2, 3].map((idx) => (
        <div key={idx} className="metric-card is-loading">
          <div className="metric-card-head">
            <Skeleton style={{ width: 96, height: 13 }} />
            <Skeleton className="sh-circle" style={{ width: 30, height: 30 }} />
          </div>
          <div className="metric-card-body">
            <Skeleton style={{ width: 64, height: 34, borderRadius: 10 }} />
            <Skeleton style={{ width: 52, height: 34, borderRadius: 10 }} />
          </div>
          <Skeleton style={{ width: '100%', height: 6, borderRadius: 999 }} />
          <Skeleton style={{ width: '68%', height: 12 }} />
        </div>
      ))}
    </section>
  );
}

export function ProjectCardsSkeleton({ count = 3 }) {
  return (
    <div className="projects-grid" aria-busy="true" aria-label="Loading projects">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="project-card is-skeleton-card">
          <Skeleton className="project-skel-media" />
          <div className="project-card-top">
            <Skeleton style={{ width: 165, height: 14 }} />
            <div className="project-order-actions">
              <Skeleton style={{ width: 28, height: 28, borderRadius: 8 }} />
              <Skeleton style={{ width: 28, height: 28, borderRadius: 8 }} />
            </div>
          </div>
          <Skeleton style={{ width: '74%', height: 22 }} />
          <div className="skel-text-stack">
            <Skeleton style={{ width: '100%', height: 13 }} />
            <Skeleton style={{ width: '82%', height: 13 }} />
          </div>
          <Skeleton style={{ width: '58%', height: 13 }} />
          <div className="project-card-foot">
            <Skeleton style={{ width: 112, height: 32, borderRadius: 10 }} />
            <div className="card-foot-right">
              <Skeleton style={{ width: 64, height: 30, borderRadius: 10 }} />
              <Skeleton style={{ width: 32, height: 30, borderRadius: 9 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GalleryWorkspaceSkeleton() {
  return (
    <div className="workspace-section" aria-busy="true" aria-label="Loading gallery">
      <div className="gallery-bento-grid">
        {[0, 1, 2, 3, 4].map((slot) => (
          <div
            key={slot}
            className={`gallery-slot-card${slot === 0 ? ' is-feature-slot' : ''}`}
          >
            <Skeleton className="gallery-skel-media" />
            <div className="gallery-slot-foot">
              <div className="skel-text-stack" style={{ flex: 1 }}>
                <Skeleton style={{ width: '62%', height: 14 }} />
                <Skeleton style={{ width: '38%', height: 11 }} />
              </div>
              <div className="card-foot-right">
                <Skeleton style={{ width: 28, height: 28, borderRadius: 8 }} />
                <Skeleton style={{ width: 28, height: 28, borderRadius: 8 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="gallery-items-grid">
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="gallery-item-card">
            <Skeleton className="gallery-item-skel-media" />
            <div className="gallery-item-body">
              <Skeleton style={{ width: '68%', height: 15 }} />
              <Skeleton style={{ width: '44%', height: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BlogCardsSkeleton({ count = 3 }) {
  return (
    <div className="projects-grid" aria-busy="true" aria-label="Loading blog posts">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="project-card is-skeleton-card">
          <Skeleton className="project-skel-media" />
          <div className="project-card-top">
            <Skeleton style={{ width: 185, height: 13 }} />
            <Skeleton style={{ width: 62, height: 26, borderRadius: 8 }} />
          </div>
          <Skeleton style={{ width: '86%', height: 22 }} />
          <div className="skel-text-stack">
            <Skeleton style={{ width: '100%', height: 13 }} />
            <Skeleton style={{ width: '92%', height: 13 }} />
            <Skeleton style={{ width: '60%', height: 13 }} />
          </div>
          <div className="project-card-foot">
            <Skeleton style={{ width: 108, height: 32, borderRadius: 10 }} />
            <div className="card-foot-right">
              <Skeleton style={{ width: 62, height: 30, borderRadius: 10 }} />
              <Skeleton style={{ width: 32, height: 30, borderRadius: 9 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConsolesTableSkeleton({ rows = 4 }) {
  return (
    <div className="console-table-wrap" aria-busy="true" aria-label="Loading project consoles">
      <div className="table-skel-body">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="table-skel-row">
            <div className="skel-text-stack">
              <Skeleton style={{ width: 150, height: 15 }} />
              <Skeleton style={{ width: 96, height: 12 }} />
            </div>
            <Skeleton style={{ width: 110, height: 14 }} />
            <div className="table-skel-links">
              <Skeleton style={{ width: 64, height: 28, borderRadius: 9 }} />
              <Skeleton style={{ width: 76, height: 28, borderRadius: 9 }} />
              <Skeleton style={{ width: 68, height: 28, borderRadius: 9 }} />
            </div>
            <Skeleton style={{ width: 160, height: 14 }} />
            <Skeleton style={{ width: 60, height: 28, borderRadius: 9 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApiPreviewSkeleton() {
  return (
    <div className="api-skel-stack" aria-busy="true" aria-label="Loading live API payload">
      <Skeleton style={{ width: '48%', height: 13 }} />
      <Skeleton style={{ width: '92%', height: 13 }} />
      <Skeleton style={{ width: '76%', height: 13 }} />
      <Skeleton style={{ width: '85%', height: 13 }} />
      <Skeleton style={{ width: '64%', height: 13 }} />
      <Skeleton style={{ width: '90%', height: 13 }} />
      <Skeleton style={{ width: '52%', height: 13 }} />
    </div>
  );
}

export function WorkspaceFallbackSkeleton() {
  return (
    <section className="workspace-section" aria-busy="true" aria-label="Loading workspace">
      <div className="section-heading-row">
        <div className="skel-text-stack" style={{ flex: 1, maxWidth: 420 }}>
          <Skeleton style={{ width: 220, height: 24 }} />
          <Skeleton style={{ width: '100%', height: 14 }} />
        </div>
        <Skeleton style={{ width: 136, height: 38, borderRadius: 12 }} />
      </div>
      <ProjectCardsSkeleton count={3} />
    </section>
  );
}
