import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Database,
  ExternalLink,
  FolderPlus,
  GitBranch,
  Globe,
  Monitor,
  Pencil,
  Server,
  Shield,
  Smartphone,
  Star,
  Trash2,
} from 'lucide-react';
import { filterProjects, isSafeHttpUrl } from '../utils/projectHelpers';
import { ProjectCardsSkeleton } from './ui/Skeleton';
import LazyImage from './ui/LazyImage';
import ExpandableFilterBar from './ui/ExpandableFilterBar';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'Website', label: 'Website' },
  { id: 'Mobile App', label: 'Mobile App' },
  { id: 'Complete', label: 'Complete' },
  { id: 'Demo', label: 'Demo' },
  { id: 'published', label: 'Published' },
];

export default function ProjectsWorkspace({
  projects,
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onNewProject,
  onEditProject,
  onTogglePublish,
  onToggleFeatured,
  onMoveProject,
  onDeleteProject,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const visibleProjects = filterProjects(projects, {
    filter: statusFilter,
    query: searchQuery,
  });

  const runAction = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const countForTab = (tabId) => {
    if (tabId === 'all') return projects.length;
    if (tabId === 'published') return projects.filter((p) => p.published).length;
    if (tabId === 'Website' || tabId === 'Mobile App') {
      return projects.filter((p) => p.type === tabId).length;
    }
    return projects.filter((p) => p.status === tabId).length;
  };

  const filterOptions = FILTER_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: countForTab(tab.id),
  }));

  return (
    <section className="workspace-section" aria-label="Managed projects and portfolio items">
      <div className="workspace-toolbar">
        <ExpandableFilterBar
          options={filterOptions}
          value={statusFilter}
          onChange={onStatusFilterChange}
          label="Filters"
          defaultId="all"
        />

        {searchQuery && (
          <div className="active-search-indicator">
            <span>Filtered by &ldquo;{searchQuery}&rdquo;</span>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => onSearchChange('')}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <ProjectCardsSkeleton count={3} />
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-title">No projects yet</h2>
          <p className="empty-copy">
            Click the + button in the top right or add your first project to get started.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn-primary" onClick={onNewProject}>
              <FolderPlus size={16} aria-hidden="true" />
              <span>Add First Project</span>
            </button>
          </div>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-title">No matching projects</h2>
          <p className="empty-copy">
            Try clearing your search filter or switching back to the All tab.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onSearchChange('');
              onStatusFilterChange('all');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {visibleProjects.map((project, index) => {
            const isBusy = busyId === project.id;
            const isPublished = Boolean(project.published);
            const canMoveUp = statusFilter === 'all' && !searchQuery && index > 0;
            const canMoveDown =
              statusFilter === 'all' && !searchQuery && index < visibleProjects.length - 1;
            const hasImage = Boolean(project.image && isSafeHttpUrl(project.image, 1000));

            const safeLinks = [
              { label: 'Live', url: project.liveUrl, icon: Globe },
              { label: 'GitHub', url: project.githubUrl, icon: GitBranch },
              { label: 'Auth', url: project.authDashboardUrl, icon: Shield },
              { label: 'DB', url: project.dbDashboardUrl, icon: Database },
              { label: 'Hosting', url: project.hostingDashboardUrl, icon: Server },
            ].filter((link) => link.url && isSafeHttpUrl(link.url));

            return (
              <article key={project.id} className="project-card">
                {hasImage && (
                  <div className="project-card-media">
                    <LazyImage
                      src={project.image}
                      alt={project.title}
                      fallbackLabel="Preview unavailable"
                    />
                  </div>
                )}

                <div className="project-card-top">
                  <div className="project-meta-row">
                    <span
                      className={`status-text ${
                        project.status === 'Complete' ? 'status-published' : 'status-draft'
                      }`}
                    >
                      {project.status}
                    </span>
                    <span className="meta-sep" aria-hidden="true">·</span>
                    <span className="project-type-inline">
                      {project.type === 'Mobile App' ? (
                        <Smartphone size={13} aria-hidden="true" />
                      ) : (
                        <Monitor size={13} aria-hidden="true" />
                      )}
                      <span>{project.type}</span>
                    </span>
                    <span className="meta-sep" aria-hidden="true">·</span>
                    <span className={isPublished ? 'api-live-flag' : 'api-hidden-flag'}>
                      {isPublished ? 'Published' : 'Hidden'}
                    </span>
                  </div>

                  <div className="project-order-actions">
                    <button
                      type="button"
                      className={`icon-btn${project.featured ? ' is-featured' : ''}`}
                      aria-label={
                        project.featured
                          ? `Remove ${project.title} from featured`
                          : `Mark ${project.title} as featured`
                      }
                      title={project.featured ? 'Featured on portfolio' : 'Mark featured'}
                      disabled={isBusy}
                      onClick={() =>
                        runAction(project.id, () =>
                          onToggleFeatured(project, !project.featured)
                        )
                      }
                    >
                      <Star
                        size={15}
                        fill={project.featured ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Move ${project.title} earlier`}
                      disabled={!canMoveUp || isBusy}
                      onClick={() =>
                        runAction(project.id, () => onMoveProject(index, index - 1))
                      }
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Move ${project.title} later`}
                      disabled={!canMoveDown || isBusy}
                      onClick={() =>
                        runAction(project.id, () => onMoveProject(index, index + 1))
                      }
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <h3 className="project-title">{project.title}</h3>
                {project.description && (
                  <p className="project-tagline">{project.description}</p>
                )}

                {project.tags.length > 0 && (
                  <div className="project-stack-line">
                    {project.tags.map((tag, tIdx) => (
                      <React.Fragment key={tag}>
                        <span>{tag}</span>
                        {tIdx < project.tags.length - 1 && (
                          <span className="meta-sep" aria-hidden="true">·</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {safeLinks.length > 0 && (
                  <div
                    className="project-links-row"
                    aria-label={`${project.title} quick launch links`}
                  >
                    {safeLinks.map((link) => {
                      const LinkIcon = link.icon;
                      return (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="console-link-btn"
                        >
                          <LinkIcon size={13} aria-hidden="true" />
                          <span>{link.label}</span>
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      );
                    })}
                  </div>
                )}

                <div className="project-card-foot">
                  <button
                    type="button"
                    className={`btn-toggle${isPublished ? ' is-live' : ''}`}
                    disabled={isBusy}
                    onClick={() =>
                      runAction(project.id, () =>
                        onTogglePublish(project, !isPublished)
                      )
                    }
                  >
                    {isPublished ? 'Unpublish' : 'Publish'}
                  </button>

                  <div className="card-foot-right">
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      onClick={() => onEditProject(project)}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    {confirmDeleteId === project.id ? (
                      <div className="delete-confirm-group">
                        <button
                          type="button"
                          className="btn-danger-sm"
                          disabled={isBusy}
                          onClick={() =>
                            runAction(project.id, async () => {
                              await onDeleteProject(project.id);
                              setConfirmDeleteId(null);
                            })
                          }
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn-ghost-sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        aria-label={`Delete ${project.title}`}
                        onClick={() => setConfirmDeleteId(project.id)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
