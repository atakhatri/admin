import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  isSafeHttpUrl,
  slugifyTitle,
  validateProjectForm,
} from '../utils/projectHelpers';

function buildInitialState(project, nextOrder) {
  if (!project) {
    return {
      title: '',
      slug: '',
      description: '',
      image: '',
      tags: '',
      liveUrl: '',
      githubUrl: '',
      type: 'Website',
      status: 'Complete',
      published: true,
      featured: false,
      displayOrder: nextOrder,
      authDashboardUrl: '',
      dbDashboardUrl: '',
      hostingDashboardUrl: '',
      monitoringUrl: '',
      environmentNotes: '',
      providerTags: '',
    };
  }
  return {
    title: project.title || '',
    slug: project.slug || '',
    description: project.description || '',
    image: project.image || '',
    tags: (project.tags || []).join(', '),
    liveUrl: project.liveUrl || '',
    githubUrl: project.githubUrl || '',
    type: PROJECT_TYPES.includes(project.type) ? project.type : 'Website',
    status: PROJECT_STATUSES.includes(project.status) ? project.status : 'Complete',
    published: project.published !== false,
    featured: Boolean(project.featured),
    displayOrder: Number.isFinite(project.displayOrder) ? project.displayOrder : nextOrder,
    authDashboardUrl: project.authDashboardUrl || '',
    dbDashboardUrl: project.dbDashboardUrl || '',
    hostingDashboardUrl: project.hostingDashboardUrl || '',
    monitoringUrl: project.monitoringUrl || '',
    environmentNotes: project.environmentNotes || '',
    providerTags: (project.providerTags || []).join(', '),
  };
}

export default function ProjectEditorModal({
  open,
  project,
  nextOrder,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => buildInitialState(project, nextOrder));
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialState(project, nextOrder));
      setSlugTouched(Boolean(project));
      setErrors({});
      setSubmitError('');
      setSaving(false);
    }
  }, [open, project, nextOrder]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && !slugTouched) {
        next.slug = slugifyTitle(value);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateProjectForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitError('');
    setSaving(true);
    try {
      await onSave({
        existingId: project ? project.id : null,
        existingCreatedAt: project ? project.createdAt : null,
        publicData: validation.publicData,
        adminData: validation.adminData,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setSaving(false);
    }
  };

  const showPreview = Boolean(form.image && isSafeHttpUrl(form.image, 1000));

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="modal-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={project ? `Edit ${project.title}` : 'Create new project'}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {project ? `Edit ${project.title}` : 'New Portfolio Project'}
            </h2>
            <p className="modal-subtitle">
              Matches your portfolio schema (title, description, image, tags, liveUrl, githubUrl,
              type, status). Console URLs remain private.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close editor"
            disabled={saving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="editor-form" onSubmit={handleSubmit} noValidate>
          <div className="editor-section">
            <h3 className="editor-section-title">01. Portfolio Project Details</h3>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="proj-title">Title</label>
                <input
                  id="proj-title"
                  type="text"
                  className="hub-input"
                  placeholder="e.g. Developer Portfolio"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
                {errors.title && <span className="field-err">{errors.title}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="proj-slug">API Slug</label>
                <input
                  id="proj-slug"
                  type="text"
                  className="hub-input mono-input"
                  placeholder="developer-portfolio"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField('slug', e.target.value);
                  }}
                />
                {errors.slug && <span className="field-err">{errors.slug}</span>}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="proj-description">Description</label>
              <textarea
                id="proj-description"
                rows={3}
                className="hub-input"
                placeholder="Project summary, stack highlights, and key features..."
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
              {errors.description && <span className="field-err">{errors.description}</span>}
            </div>

            <div className="form-grid-3">
              <div className="form-field">
                <label htmlFor="proj-type">Type</label>
                <select
                  id="proj-type"
                  className="hub-input"
                  value={form.type}
                  onChange={(e) => updateField('type', e.target.value)}
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="proj-status">Status</label>
                <select
                  id="proj-status"
                  className="hub-input"
                  value={form.status}
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="proj-order">Display Order</label>
                <input
                  id="proj-order"
                  type="number"
                  min={0}
                  max={10000}
                  className="hub-input"
                  value={form.displayOrder}
                  onChange={(e) => updateField('displayOrder', e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="proj-image">Image URL</label>
              <input
                id="proj-image"
                type="url"
                className="hub-input"
                placeholder="https://images.unsplash.com/..."
                value={form.image}
                onChange={(e) => updateField('image', e.target.value)}
              />
              {errors.image && <span className="field-err">{errors.image}</span>}
              {showPreview && (
                <div className="editor-img-preview">
                  <img
                    src={form.image}
                    alt="Project preview"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="proj-tags">Tags (comma separated, max 12)</label>
              <input
                id="proj-tags"
                type="text"
                className="hub-input"
                placeholder="React, Next.js, Tailwind CSS, Firebase"
                value={form.tags}
                onChange={(e) => updateField('tags', e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="proj-live-url">Live URL</label>
                <input
                  id="proj-live-url"
                  type="url"
                  className="hub-input"
                  placeholder="https://yourproject.com"
                  value={form.liveUrl}
                  onChange={(e) => updateField('liveUrl', e.target.value)}
                />
                {errors.liveUrl && <span className="field-err">{errors.liveUrl}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="proj-github-url">GitHub URL</label>
                <input
                  id="proj-github-url"
                  type="url"
                  className="hub-input"
                  placeholder="https://github.com/username/repo"
                  value={form.githubUrl}
                  onChange={(e) => updateField('githubUrl', e.target.value)}
                />
                {errors.githubUrl && <span className="field-err">{errors.githubUrl}</span>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field checkbox-field">
                <label className="checkbox-label" htmlFor="proj-published">
                  <input
                    id="proj-published"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => updateField('published', e.target.checked)}
                  />
                  <span>Publish to Portfolio JSON API</span>
                </label>
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label" htmlFor="proj-featured">
                  <input
                    id="proj-featured"
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => updateField('featured', e.target.checked)}
                  />
                  <span>Mark as Featured</span>
                </label>
              </div>
            </div>
          </div>

          <div className="editor-section">
            <h3 className="editor-section-title">02. Private Admin Console Entrypoints</h3>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="proj-auth-url">Auth Dashboard URL</label>
                <input
                  id="proj-auth-url"
                  type="url"
                  className="hub-input"
                  placeholder="https://console.firebase.google.com/..."
                  value={form.authDashboardUrl}
                  onChange={(e) => updateField('authDashboardUrl', e.target.value)}
                />
                {errors.authDashboardUrl && (
                  <span className="field-err">{errors.authDashboardUrl}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="proj-db-url">Database Console URL</label>
                <input
                  id="proj-db-url"
                  type="url"
                  className="hub-input"
                  placeholder="https://console.firebase.google.com/.../firestore"
                  value={form.dbDashboardUrl}
                  onChange={(e) => updateField('dbDashboardUrl', e.target.value)}
                />
                {errors.dbDashboardUrl && (
                  <span className="field-err">{errors.dbDashboardUrl}</span>
                )}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="proj-host-url">Hosting / CI Dashboard URL</label>
                <input
                  id="proj-host-url"
                  type="url"
                  className="hub-input"
                  placeholder="https://vercel.com/... or Cloud Run URL"
                  value={form.hostingDashboardUrl}
                  onChange={(e) => updateField('hostingDashboardUrl', e.target.value)}
                />
                {errors.hostingDashboardUrl && (
                  <span className="field-err">{errors.hostingDashboardUrl}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="proj-monitor-url">Monitoring / Logs URL</label>
                <input
                  id="proj-monitor-url"
                  type="url"
                  className="hub-input"
                  placeholder="https://console.cloud.google.com/logs"
                  value={form.monitoringUrl}
                  onChange={(e) => updateField('monitoringUrl', e.target.value)}
                />
                {errors.monitoringUrl && (
                  <span className="field-err">{errors.monitoringUrl}</span>
                )}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="proj-providers">Infrastructure Providers (comma separated)</label>
              <input
                id="proj-providers"
                type="text"
                className="hub-input"
                placeholder="Firebase, Vercel, Cloud Run, Supabase"
                value={form.providerTags}
                onChange={(e) => updateField('providerTags', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="proj-notes">Private Operational Notes</label>
              <textarea
                id="proj-notes"
                rows={2}
                className="hub-input"
                placeholder="Deployment branch, billing notes, domain renewal reminders..."
                value={form.environmentNotes}
                onChange={(e) => updateField('environmentNotes', e.target.value)}
              />
              {errors.environmentNotes && (
                <span className="field-err">{errors.environmentNotes}</span>
              )}
            </div>
          </div>

          {submitError && (
            <p className="field-error-banner" role="alert">
              {submitError}
            </p>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
