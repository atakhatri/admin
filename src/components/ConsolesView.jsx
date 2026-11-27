import React from 'react';
import {
  Activity,
  Database,
  ExternalLink,
  GitBranch,
  Globe,
  Pencil,
  Server,
  Shield,
} from 'lucide-react';
import { isSafeHttpUrl } from '../utils/projectHelpers';
import { ConsolesTableSkeleton } from './ui/Skeleton';

export default function ConsolesView({ projects, loading = false, onEditProject, onNewProject }) {
  return (
    <section className="workspace-section" aria-label="Project auth and database consoles launchpad">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Project Consoles Launchpad</h2>
          <p className="section-subtitle">
            Private one-click entrypoints to each project&apos;s Authentication, Database, Hosting,
            and Monitoring dashboards.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onNewProject}>
          Add Project
        </button>
      </div>

      {loading ? (
        <ConsolesTableSkeleton rows={4} />
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-title">No console links saved yet</h3>
          <p className="empty-copy">
            Create a project and attach its Auth, Database, and Hosting console URLs to build your
            central command directory.
          </p>
          <button type="button" className="btn-primary" onClick={onNewProject}>
            Add First Project
          </button>
        </div>
      ) : (
        <div className="console-table-wrap">
          <table className="console-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Infrastructure</th>
                <th>Operational Consoles</th>
                <th>Private Notes</th>
                <th className="col-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj) => {
                const links = [
                  { label: 'Auth', url: proj.authDashboardUrl, icon: Shield },
                  { label: 'Database', url: proj.dbDashboardUrl, icon: Database },
                  { label: 'Hosting', url: proj.hostingDashboardUrl, icon: Server },
                  { label: 'Logs', url: proj.monitoringUrl, icon: Activity },
                  { label: 'Live', url: proj.liveUrl, icon: Globe },
                  { label: 'GitHub', url: proj.githubUrl, icon: GitBranch },
                ].filter((item) => item.url && isSafeHttpUrl(item.url));

                return (
                  <tr key={proj.id}>
                    <td>
                      <div className="table-project-name">{proj.title}</div>
                      <div className="table-project-sub">
                        <span
                          className={`status-text ${
                            proj.status === 'Complete' ? 'status-published' : 'status-draft'
                          }`}
                        >
                          {proj.status}
                        </span>
                        <span className="meta-sep" aria-hidden="true">·</span>
                        <span className="table-muted">{proj.type}</span>
                      </div>
                    </td>
                    <td>
                      {proj.providerTags.length > 0 ? (
                        <span className="table-muted">{proj.providerTags.join(' · ')}</span>
                      ) : (
                        <span className="table-muted">—</span>
                      )}
                    </td>
                    <td>
                      {links.length > 0 ? (
                        <div className="table-links-wrap">
                          {links.map((item) => {
                            const Icon = item.icon;
                            return (
                              <a
                                key={item.label}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="console-link-btn"
                              >
                                <Icon size={13} aria-hidden="true" />
                                <span>{item.label}</span>
                                <ExternalLink size={11} aria-hidden="true" />
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="table-muted">No URLs configured</span>
                      )}
                    </td>
                    <td className="table-notes-cell">
                      {proj.environmentNotes || <span className="table-muted">—</span>}
                    </td>
                    <td className="col-right">
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        aria-label={`Edit consoles for ${proj.title}`}
                        onClick={() => onEditProject(proj)}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
