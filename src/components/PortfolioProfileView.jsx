import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ExternalLink,
  Eye,
  Mail,
  Pencil,
  PenLine,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  DEFAULT_PROFILE,
  MAX_EXPERTISE,
  MAX_LANGUAGES,
  MAX_SKILLS,
  normalizeSpotifyPlaylistUrl,
  reorderListItem,
  validateProfileForm,
  validateTimelineEventForm,
} from '../utils/profileHelpers';

function buildProfileState(profile, defaultName) {
  if (!profile) {
    return {
      ...DEFAULT_PROFILE,
      name: defaultName || '',
      languages: [],
      expertise: [],
      skills: [],
      published: true,
    };
  }
  return {
    name: profile.name || defaultName || '',
    profession: profile.profession || '',
    oneLiner: profile.oneLiner || '',
    pfp: profile.pfp || '',
    spotifyPlaylistUrl: profile.spotifyPlaylistUrl || '',
    languages: Array.isArray(profile.languages) ? profile.languages : [],
    mostActivePlatform: profile.mostActivePlatform || '',
    mostActiveUrl: profile.mostActiveUrl || '',
    contactEmail: profile.contactEmail || '',
    githubUrl: profile.githubUrl || '',
    linkedinUrl: profile.linkedinUrl || '',
    twitterUrl: profile.twitterUrl || '',
    websiteUrl: profile.websiteUrl || '',
    expertise: Array.isArray(profile.expertise) ? profile.expertise : [],
    skills: Array.isArray(profile.skills) ? profile.skills.slice(0, MAX_SKILLS) : [],
    published: profile.published !== undefined ? Boolean(profile.published) : true,
  };
}

function emptyTimelineDraft(nextOrder = 1) {
  return {
    period: '',
    title: '',
    subtitle: '',
    description: '',
    displayOrder: nextOrder,
    published: true,
  };
}

export default function PortfolioProfileView({
  profile,
  timeline = [],
  defaultName = '',
  onSaveProfile,
  onSaveTimelineEvent,
  onMoveTimelineEvent,
  onDeleteTimelineEvent,
}) {
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'preview'
  const [form, setForm] = useState(() => buildProfileState(profile, defaultName));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [pfpFailed, setPfpFailed] = useState(false);

  // Tag drafts
  const [languageDraft, setLanguageDraft] = useState('');
  const [expertiseDraft, setExpertiseDraft] = useState('');
  const [skillDraft, setSkillDraft] = useState('');

  // Timeline event composer state
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventDraft, setEventDraft] = useState(() => emptyTimelineDraft(timeline.length + 1));
  const [eventErrors, setEventErrors] = useState({});
  const [eventSaving, setEventSaving] = useState(false);
  const [eventBannerError, setEventBannerError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  useEffect(() => {
    setForm(buildProfileState(profile, defaultName));
    setPfpFailed(false);
  }, [profile, defaultName]);

  const setField = (key, value) => {
    if (key === 'pfp') setPfpFailed(false);
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setSaveSuccess('');
  };

  const addChip = (fieldKey, rawValue, maxLimit, maxLen, clearDraft) => {
    const pieces = String(rawValue || '')
      .split(',')
      .map((s) => s.trim().slice(0, maxLen))
      .filter(Boolean);
    if (pieces.length === 0) return;

    setForm((prev) => {
      const current = Array.isArray(prev[fieldKey]) ? [...prev[fieldKey]] : [];
      const existingLower = new Set(current.map((item) => item.toLowerCase()));
      for (const piece of pieces) {
        if (current.length >= maxLimit) break;
        if (!existingLower.has(piece.toLowerCase())) {
          existingLower.add(piece.toLowerCase());
          current.push(piece);
        }
      }
      return { ...prev, [fieldKey]: current };
    });
    clearDraft('');
    setSaveSuccess('');
    setErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const copy = { ...prev };
      delete copy[fieldKey];
      return copy;
    });
  };

  const removeChip = (fieldKey, index) => {
    setForm((prev) => ({
      ...prev,
      [fieldKey]: prev[fieldKey].filter((_, i) => i !== index),
    }));
    setSaveSuccess('');
  };

  const moveSkill = (fromIdx, toIdx) => {
    setForm((prev) => ({
      ...prev,
      skills: reorderListItem(prev.skills, fromIdx, toIdx),
    }));
    setSaveSuccess('');
  };

  const handleSaveProfileSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitError('');
    setSaveSuccess('');

    const nextForm = { ...form };
    if (languageDraft.trim()) {
      const merged = [...nextForm.languages];
      for (const piece of languageDraft.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (
          merged.length < MAX_LANGUAGES &&
          !merged.some((x) => x.toLowerCase() === piece.toLowerCase())
        ) {
          merged.push(piece.slice(0, 40));
        }
      }
      nextForm.languages = merged;
      setLanguageDraft('');
    }
    if (expertiseDraft.trim()) {
      const merged = [...nextForm.expertise];
      for (const piece of expertiseDraft.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (
          merged.length < MAX_EXPERTISE &&
          !merged.some((x) => x.toLowerCase() === piece.toLowerCase())
        ) {
          merged.push(piece.slice(0, 50));
        }
      }
      nextForm.expertise = merged;
      setExpertiseDraft('');
    }
    if (skillDraft.trim()) {
      const merged = [...nextForm.skills];
      for (const piece of skillDraft.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (
          merged.length < MAX_SKILLS &&
          !merged.some((x) => x.toLowerCase() === piece.toLowerCase())
        ) {
          merged.push(piece.slice(0, 40));
        }
      }
      nextForm.skills = merged;
      setSkillDraft('');
    }

    const result = validateProfileForm(nextForm);
    if (!result.valid) {
      setErrors(result.errors);
      setSubmitError('Please fix the highlighted profile fields before saving.');
      setViewMode('edit');
      return;
    }

    setSaving(true);
    try {
      await onSaveProfile({
        existingProfile: profile,
        data: result.normalized,
      });
      setForm(result.normalized);
      setSaveSuccess('Portfolio profile saved.');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save portfolio profile.');
    } finally {
      setSaving(false);
    }
  };

  // Timeline CRUD handlers
  const handleStartEditEvent = (evt) => {
    setEditingEvent(evt);
    setEventDraft({
      period: evt.period || '',
      title: evt.title || '',
      subtitle: evt.subtitle || '',
      description: evt.description || '',
      displayOrder: evt.displayOrder ?? 1,
      published: evt.published !== undefined ? Boolean(evt.published) : true,
    });
    setEventErrors({});
    setEventBannerError('');
  };

  const handleCancelEditEvent = () => {
    setEditingEvent(null);
    setEventDraft(emptyTimelineDraft(timeline.length + 1));
    setEventErrors({});
    setEventBannerError('');
  };

  const handleSaveTimelineItem = async () => {
    setEventBannerError('');
    const validation = validateTimelineEventForm(eventDraft, timeline.length + 1);
    if (!validation.valid) {
      setEventErrors(validation.errors);
      return;
    }
    setEventSaving(true);
    try {
      await onSaveTimelineEvent({
        existingEvent: editingEvent,
        data: validation.normalized,
      });
      setEditingEvent(null);
      setEventDraft(emptyTimelineDraft(timeline.length + (editingEvent ? 1 : 2)));
      setEventErrors({});
    } catch (err) {
      setEventBannerError(err instanceof Error ? err.message : 'Unable to save timeline event.');
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteTimelineItem = async (eventId) => {
    setEventBannerError('');
    try {
      await onDeleteTimelineEvent(eventId);
      if (editingEvent?.id === eventId) {
        handleCancelEditEvent();
      }
      setConfirmDeleteId('');
    } catch (err) {
      setEventBannerError(err instanceof Error ? err.message : 'Unable to delete timeline event.');
    }
  };

  const spotifyPreview = normalizeSpotifyPlaylistUrl(form.spotifyPlaylistUrl);
  const skillsAtCap = form.skills.length >= MAX_SKILLS;
  const skillProgressPct = Math.min(100, Math.round((form.skills.length / MAX_SKILLS) * 100));
  const hasValidPfp = Boolean(form.pfp && /^https?:\/\//i.test(form.pfp) && !pfpFailed);

  const activePreviewLinks = [
    form.mostActiveUrl && {
      key: 'active',
      label: form.mostActivePlatform || 'Most Active',
      href: form.mostActiveUrl,
    },
    form.githubUrl && { key: 'github', label: 'GitHub', href: form.githubUrl },
    form.linkedinUrl && { key: 'linkedin', label: 'LinkedIn', href: form.linkedinUrl },
    form.twitterUrl && { key: 'twitter', label: 'X / Twitter', href: form.twitterUrl },
    form.websiteUrl && { key: 'website', label: 'Website', href: form.websiteUrl },
  ].filter(Boolean);

  return (
    <section className="workspace-section" aria-label="Portfolio Profile">
      <div className="profile-editor-sheet">
        <div className="modal-header profile-sheet-header">
          <div className="profile-sheet-title-wrap">
            <h2 className="modal-title">Portfolio Profile</h2>
          </div>

          <div className="profile-sheet-actions">
            <div className="segmented-control" role="tablist" aria-label="Profile editor mode">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'edit'}
                className={viewMode === 'edit' ? 'is-active' : undefined}
                onClick={() => setViewMode('edit')}
              >
                <PenLine size={13} aria-hidden="true" className="seg-inline-ic" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'preview'}
                className={viewMode === 'preview' ? 'is-active' : undefined}
                onClick={() => setViewMode('preview')}
              >
                <Eye size={13} aria-hidden="true" className="seg-inline-ic" />
                <span>Preview</span>
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={handleSaveProfileSubmit}
            >
              <Save size={15} aria-hidden="true" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {viewMode === 'preview' ? (
          <div className="editor-form profile-preview-body">
            {submitError && (
              <p className="field-error-banner" role="alert">
                {submitError}
              </p>
            )}
            {saveSuccess && (
              <div className="profile-save-banner" role="status">
                <Check size={15} aria-hidden="true" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <div className="profile-preview-hero">
              <div className="profile-pfp-circle profile-pfp-circle-lg">
                {hasValidPfp ? (
                  <img
                    src={form.pfp}
                    alt={form.name || 'Portfolio profile photo'}
                    referrerPolicy="no-referrer"
                    onError={() => setPfpFailed(true)}
                  />
                ) : (
                  <User size={28} aria-hidden="true" />
                )}
              </div>

              <div className="profile-identity-meta">
                <div className="project-meta-row">
                  <span
                    className={`status-text ${
                      form.published ? 'status-published' : 'status-draft'
                    }`}
                  >
                    {form.published ? 'Published' : 'Draft'}
                  </span>
                  <span className="meta-sep" aria-hidden="true">·</span>
                  <span>{form.skills.length} skills</span>
                  <span className="meta-sep" aria-hidden="true">·</span>
                  <span>{timeline.length} timeline events</span>
                </div>
                <h3 className="profile-preview-name">{form.name || 'Your Name'}</h3>
                <span className="profile-preview-role">
                  {form.profession || 'Your Profession'}
                </span>
                {form.oneLiner && <p className="profile-preview-liner">{form.oneLiner}</p>}
              </div>
            </div>

            {(form.contactEmail || activePreviewLinks.length > 0) && (
              <div className="editor-section">
                <h3 className="editor-section-title">Links &amp; Contact</h3>
                <div className="project-links-row">
                  {form.contactEmail && (
                    <a href={`mailto:${form.contactEmail}`} className="console-link-btn">
                      <Mail size={13} aria-hidden="true" />
                      <span>{form.contactEmail}</span>
                    </a>
                  )}
                  {activePreviewLinks.map((lnk) => (
                    <a
                      key={lnk.key}
                      href={lnk.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="console-link-btn"
                    >
                      <span>{lnk.label}</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(form.languages.length > 0 || form.expertise.length > 0) && (
              <div className="editor-section">
                <h3 className="editor-section-title">About</h3>
                <div className="form-grid-2">
                  <div className="form-field">
                    <span className="profile-meta-label">Languages</span>
                    <div className="project-stack-line">
                      {form.languages.length > 0 ? (
                        form.languages.map((lang, idx) => (
                          <React.Fragment key={`${lang}-${idx}`}>
                            <span>{lang}</span>
                            {idx < form.languages.length - 1 && (
                              <span className="meta-sep" aria-hidden="true">·</span>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        <span className="table-muted">None added</span>
                      )}
                    </div>
                  </div>
                  <div className="form-field">
                    <span className="profile-meta-label">Expertise</span>
                    <div className="project-stack-line">
                      {form.expertise.length > 0 ? (
                        form.expertise.map((item, idx) => (
                          <React.Fragment key={`${item}-${idx}`}>
                            <span>{item}</span>
                            {idx < form.expertise.length - 1 && (
                              <span className="meta-sep" aria-hidden="true">·</span>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        <span className="table-muted">None added</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {form.skills.length > 0 && (
              <div className="editor-section">
                <h3 className="editor-section-title">Skills ({form.skills.length}/{MAX_SKILLS})</h3>
                <div className="project-stack-line">
                  {form.skills.map((skill, idx) => (
                    <React.Fragment key={`${skill}-${idx}`}>
                      <span>{skill}</span>
                      {idx < form.skills.length - 1 && (
                        <span className="meta-sep" aria-hidden="true">·</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {spotifyPreview.valid && spotifyPreview.embedUrl && (
              <div className="editor-section">
                <h3 className="editor-section-title">Spotify Playlist</h3>
                <div className="profile-spotify-embed">
                  <iframe
                    title="Spotify playlist preview"
                    src={spotifyPreview.embedUrl}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            <div className="editor-section">
              <h3 className="editor-section-title">Timeline ({timeline.length})</h3>
              {timeline.length === 0 ? (
                <p className="table-muted">No timeline events added yet.</p>
              ) : (
                <div className="timeline-event-list">
                  {timeline.map((evt) => (
                    <div key={evt.id} className="timeline-row">
                      <div className="timeline-event-main">
                        <div className="project-meta-row">
                          <span className="timeline-period-text">{evt.period}</span>
                          {!evt.published && (
                            <>
                              <span className="meta-sep" aria-hidden="true">·</span>
                              <span className="status-text status-draft">Draft</span>
                            </>
                          )}
                        </div>
                        <strong className="timeline-event-title">{evt.title}</strong>
                        {evt.subtitle && <span className="timeline-event-sub">{evt.subtitle}</span>}
                        {evt.description && <p className="timeline-event-desc">{evt.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <form className="editor-form" onSubmit={handleSaveProfileSubmit} noValidate>
            {submitError && (
              <p className="field-error-banner" role="alert">
                {submitError}
              </p>
            )}
            {saveSuccess && (
              <div className="profile-save-banner" role="status">
                <Check size={15} aria-hidden="true" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {/* 01. PERSONAL DETAILS */}
            <div className="editor-section">
              <h3 className="editor-section-title">01. Personal Details</h3>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="prof-name">Name</label>
                  <input
                    id="prof-name"
                    type="text"
                    className="hub-input"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="e.g. Ata Khatri"
                    required
                  />
                  {errors.name && <span className="field-err">{errors.name}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-role">Profession</label>
                  <input
                    id="prof-role"
                    type="text"
                    className="hub-input"
                    value={form.profession}
                    onChange={(e) => setField('profession', e.target.value)}
                    placeholder="e.g. Web Developer"
                  />
                  {errors.profession && <span className="field-err">{errors.profession}</span>}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="prof-oneliner">One-Liner</label>
                <input
                  id="prof-oneliner"
                  type="text"
                  className="hub-input"
                  value={form.oneLiner}
                  onChange={(e) => setField('oneLiner', e.target.value)}
                  placeholder="Short introduction shown in your portfolio hero..."
                  maxLength={240}
                />
                {errors.oneLiner && <span className="field-err">{errors.oneLiner}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="prof-pfp">Profile Photo URL</label>
                <div className="profile-pfp-field-row">
                  <div className="profile-pfp-thumb" aria-hidden="true">
                    {hasValidPfp ? (
                      <img
                        src={form.pfp}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => setPfpFailed(true)}
                      />
                    ) : (
                      <User size={18} />
                    )}
                  </div>
                  <input
                    id="prof-pfp"
                    type="url"
                    className="hub-input mono-input profile-flex-input"
                    value={form.pfp}
                    onChange={(e) => setField('pfp', e.target.value)}
                    placeholder="https://res.cloudinary.com/.../avatar.jpg"
                  />
                </div>
                {errors.pfp && <span className="field-err">{errors.pfp}</span>}
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label" htmlFor="prof-published">
                  <input
                    id="prof-published"
                    type="checkbox"
                    checked={Boolean(form.published)}
                    onChange={(e) => setField('published', e.target.checked)}
                  />
                  <span>Published</span>
                </label>
              </div>
            </div>

            {/* 02. ABOUT & MEDIA */}
            <div className="editor-section">
              <h3 className="editor-section-title">02. About &amp; Media</h3>

              <div className="form-field">
                <label htmlFor="prof-spotify">Spotify Playlist URL</label>
                <input
                  id="prof-spotify"
                  type="url"
                  className="hub-input mono-input"
                  value={form.spotifyPlaylistUrl}
                  onChange={(e) => setField('spotifyPlaylistUrl', e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                />
                {errors.spotifyPlaylistUrl && (
                  <span className="field-err">{errors.spotifyPlaylistUrl}</span>
                )}
                {spotifyPreview.valid && spotifyPreview.embedUrl && (
                  <div className="profile-spotify-embed">
                    <iframe
                      title="Spotify playlist preview"
                      src={spotifyPreview.embedUrl}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="prof-languages">
                    Languages ({form.languages.length}/{MAX_LANGUAGES})
                  </label>
                  <div className="chip-input-row">
                    <input
                      id="prof-languages"
                      type="text"
                      className="hub-input profile-flex-input"
                      value={languageDraft}
                      onChange={(e) => setLanguageDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addChip('languages', languageDraft, MAX_LANGUAGES, 40, setLanguageDraft);
                        }
                      }}
                      placeholder="English, Hindi..."
                      disabled={form.languages.length >= MAX_LANGUAGES}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={form.languages.length >= MAX_LANGUAGES || !languageDraft.trim()}
                      onClick={() =>
                        addChip('languages', languageDraft, MAX_LANGUAGES, 40, setLanguageDraft)
                      }
                    >
                      <Plus size={14} aria-hidden="true" />
                      <span>Add</span>
                    </button>
                  </div>
                  {errors.languages && <span className="field-err">{errors.languages}</span>}
                  {form.languages.length > 0 && (
                    <div className="profile-tag-list">
                      {form.languages.map((lang, idx) => (
                        <span key={`${lang}-${idx}`} className="profile-tag">
                          <span>{lang}</span>
                          <button
                            type="button"
                            className="profile-tag-remove"
                            aria-label={`Remove ${lang}`}
                            onClick={() => removeChip('languages', idx)}
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-expertise">
                    Expertise ({form.expertise.length}/{MAX_EXPERTISE})
                  </label>
                  <div className="chip-input-row">
                    <input
                      id="prof-expertise"
                      type="text"
                      className="hub-input profile-flex-input"
                      value={expertiseDraft}
                      onChange={(e) => setExpertiseDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addChip('expertise', expertiseDraft, MAX_EXPERTISE, 50, setExpertiseDraft);
                        }
                      }}
                      placeholder="Full-Stack, UI Systems..."
                      disabled={form.expertise.length >= MAX_EXPERTISE}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={form.expertise.length >= MAX_EXPERTISE || !expertiseDraft.trim()}
                      onClick={() =>
                        addChip('expertise', expertiseDraft, MAX_EXPERTISE, 50, setExpertiseDraft)
                      }
                    >
                      <Plus size={14} aria-hidden="true" />
                      <span>Add</span>
                    </button>
                  </div>
                  {errors.expertise && <span className="field-err">{errors.expertise}</span>}
                  {form.expertise.length > 0 && (
                    <div className="profile-tag-list">
                      {form.expertise.map((tag, idx) => (
                        <span key={`${tag}-${idx}`} className="profile-tag">
                          <span>{tag}</span>
                          <button
                            type="button"
                            className="profile-tag-remove"
                            aria-label={`Remove ${tag}`}
                            onClick={() => removeChip('expertise', idx)}
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 03. COMMUNICATION & PLATFORM LINKS */}
            <div className="editor-section">
              <h3 className="editor-section-title">03. Communication &amp; Platform Links</h3>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="prof-active-platform">Most Active Platform</label>
                  <input
                    id="prof-active-platform"
                    type="text"
                    className="hub-input"
                    value={form.mostActivePlatform}
                    onChange={(e) => setField('mostActivePlatform', e.target.value)}
                    placeholder="e.g. GitHub, X, Discord"
                  />
                  {errors.mostActivePlatform && (
                    <span className="field-err">{errors.mostActivePlatform}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-active-url">Most Active URL</label>
                  <input
                    id="prof-active-url"
                    type="url"
                    className="hub-input"
                    value={form.mostActiveUrl}
                    onChange={(e) => setField('mostActiveUrl', e.target.value)}
                    placeholder="https://github.com/username"
                  />
                  {errors.mostActiveUrl && <span className="field-err">{errors.mostActiveUrl}</span>}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="prof-email">Contact Email</label>
                  <input
                    id="prof-email"
                    type="email"
                    className="hub-input"
                    value={form.contactEmail}
                    onChange={(e) => setField('contactEmail', e.target.value)}
                    placeholder="hello@yourdomain.com"
                  />
                  {errors.contactEmail && <span className="field-err">{errors.contactEmail}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-website">Personal Website</label>
                  <input
                    id="prof-website"
                    type="url"
                    className="hub-input"
                    value={form.websiteUrl}
                    onChange={(e) => setField('websiteUrl', e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                  {errors.websiteUrl && <span className="field-err">{errors.websiteUrl}</span>}
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-field">
                  <label htmlFor="prof-github">GitHub URL</label>
                  <input
                    id="prof-github"
                    type="url"
                    className="hub-input"
                    value={form.githubUrl}
                    onChange={(e) => setField('githubUrl', e.target.value)}
                    placeholder="https://github.com/..."
                  />
                  {errors.githubUrl && <span className="field-err">{errors.githubUrl}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-linkedin">LinkedIn URL</label>
                  <input
                    id="prof-linkedin"
                    type="url"
                    className="hub-input"
                    value={form.linkedinUrl}
                    onChange={(e) => setField('linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                  />
                  {errors.linkedinUrl && <span className="field-err">{errors.linkedinUrl}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-twitter">X / Twitter URL</label>
                  <input
                    id="prof-twitter"
                    type="url"
                    className="hub-input"
                    value={form.twitterUrl}
                    onChange={(e) => setField('twitterUrl', e.target.value)}
                    placeholder="https://x.com/..."
                  />
                  {errors.twitterUrl && <span className="field-err">{errors.twitterUrl}</span>}
                </div>
              </div>
            </div>

            {/* 04. SKILLS */}
            <div className="editor-section">
              <div className="blog-content-head">
                <h3 className="editor-section-title profile-section-title-flat">04. Skills</h3>
                <span className={`profile-counter-text${skillsAtCap ? ' is-full' : ''}`}>
                  {form.skills.length} / {MAX_SKILLS} max
                </span>
              </div>

              <div className="skills-progress-track" aria-hidden="true">
                <div
                  className={`skills-progress-fill${skillsAtCap ? ' is-full' : ''}`}
                  style={{ width: `${skillProgressPct}%` }}
                />
              </div>

              <div className="form-field">
                <label htmlFor="prof-skills">Add Skill (press Enter or comma)</label>
                <div className="chip-input-row">
                  <input
                    id="prof-skills"
                    type="text"
                    className="hub-input profile-flex-input"
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addChip('skills', skillDraft, MAX_SKILLS, 40, setSkillDraft);
                      }
                    }}
                    placeholder={
                      skillsAtCap
                        ? 'Maximum 10 skills reached'
                        : 'React, Next.js, TypeScript...'
                    }
                    disabled={skillsAtCap}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={skillsAtCap || !skillDraft.trim()}
                    onClick={() => addChip('skills', skillDraft, MAX_SKILLS, 40, setSkillDraft)}
                  >
                    <Plus size={14} aria-hidden="true" />
                    <span>Add</span>
                  </button>
                </div>
                {errors.skills && <span className="field-err">{errors.skills}</span>}
              </div>

              {form.skills.length === 0 ? (
                <p className="table-muted">No skills added yet (up to {MAX_SKILLS}).</p>
              ) : (
                <div className="profile-tag-list">
                  {form.skills.map((skill, idx) => (
                    <span key={`${skill}-${idx}`} className="profile-tag profile-skill-tag">
                      <span className="profile-skill-num">{idx + 1}.</span>
                      <span>{skill}</span>
                      <span className="profile-skill-reorder">
                        <button
                          type="button"
                          className="profile-tag-step"
                          aria-label={`Move ${skill} earlier`}
                          disabled={idx === 0}
                          onClick={() => moveSkill(idx, idx - 1)}
                        >
                          <ArrowLeft size={11} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="profile-tag-step"
                          aria-label={`Move ${skill} later`}
                          disabled={idx === form.skills.length - 1}
                          onClick={() => moveSkill(idx, idx + 1)}
                        >
                          <ArrowRight size={11} aria-hidden="true" />
                        </button>
                      </span>
                      <button
                        type="button"
                        className="profile-tag-remove"
                        aria-label={`Remove ${skill}`}
                        onClick={() => removeChip('skills', idx)}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 05. TIMELINE EVENTS */}
            <div className="editor-section">
              <div className="blog-content-head">
                <h3 className="editor-section-title profile-section-title-flat">
                  05. Timeline Events
                </h3>
                <span className="profile-counter-text">{timeline.length} saved</span>
              </div>

              {eventBannerError && (
                <p className="field-error-banner" role="alert">
                  {eventBannerError}
                </p>
              )}

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="tl-period">Time / Period</label>
                  <input
                    id="tl-period"
                    type="text"
                    className="hub-input"
                    value={eventDraft.period}
                    onChange={(e) =>
                      setEventDraft((prev) => ({ ...prev, period: e.target.value }))
                    }
                    placeholder="e.g. 2024 – Present"
                  />
                  {eventErrors.period && <span className="field-err">{eventErrors.period}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="tl-title">Event / Role Title</label>
                  <input
                    id="tl-title"
                    type="text"
                    className="hub-input"
                    value={eventDraft.title}
                    onChange={(e) =>
                      setEventDraft((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="e.g. Full-Stack Web Developer"
                  />
                  {eventErrors.title && <span className="field-err">{eventErrors.title}</span>}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tl-subtitle">Organization / Context</label>
                <input
                  id="tl-subtitle"
                  type="text"
                  className="hub-input"
                  value={eventDraft.subtitle}
                  onChange={(e) =>
                    setEventDraft((prev) => ({ ...prev, subtitle: e.target.value }))
                  }
                  placeholder="Company, university, or studio name"
                />
                {eventErrors.subtitle && <span className="field-err">{eventErrors.subtitle}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="tl-desc">Description</label>
                <textarea
                  id="tl-desc"
                  rows={2}
                  className="hub-input"
                  value={eventDraft.description}
                  onChange={(e) =>
                    setEventDraft((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Key milestone highlights..."
                />
                {eventErrors.description && (
                  <span className="field-err">{eventErrors.description}</span>
                )}
              </div>

              <div className="timeline-composer-footer">
                <label className="checkbox-label" htmlFor="tl-published">
                  <input
                    id="tl-published"
                    type="checkbox"
                    checked={Boolean(eventDraft.published)}
                    onChange={(e) =>
                      setEventDraft((prev) => ({ ...prev, published: e.target.checked }))
                    }
                  />
                  <span>Visible on portfolio</span>
                </label>

                <div className="card-foot-right">
                  {editingEvent && (
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      onClick={handleCancelEditEvent}
                    >
                      Cancel edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={eventSaving}
                    onClick={handleSaveTimelineItem}
                  >
                    <Plus size={14} aria-hidden="true" />
                    <span>
                      {eventSaving
                        ? 'Saving...'
                        : editingEvent
                        ? 'Update Event'
                        : 'Add Timeline Event'}
                    </span>
                  </button>
                </div>
              </div>

              {timeline.length === 0 ? (
                <p className="table-muted profile-timeline-empty-note">
                  No timeline events yet. Add your first milestone above.
                </p>
              ) : (
                <div className="timeline-event-list">
                  {timeline.map((evt, idx) => (
                    <div
                      key={evt.id}
                      className={`timeline-row${editingEvent?.id === evt.id ? ' is-editing' : ''}`}
                    >
                      <div className="timeline-event-main">
                        <div className="project-meta-row">
                          <span className="timeline-period-text">{evt.period}</span>
                          <span className="meta-sep" aria-hidden="true">·</span>
                          <span
                            className={`status-text ${
                              evt.published ? 'status-published' : 'status-draft'
                            }`}
                          >
                            {evt.published ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <strong className="timeline-event-title">{evt.title}</strong>
                        {evt.subtitle && <span className="timeline-event-sub">{evt.subtitle}</span>}
                        {evt.description && (
                          <p className="timeline-event-desc">{evt.description}</p>
                        )}
                      </div>

                      <div className="timeline-event-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Move up"
                          aria-label={`Move ${evt.title} up`}
                          disabled={idx === 0}
                          onClick={() => onMoveTimelineEvent(idx, idx - 1)}
                        >
                          <ArrowUp size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Move down"
                          aria-label={`Move ${evt.title} down`}
                          disabled={idx === timeline.length - 1}
                          onClick={() => onMoveTimelineEvent(idx, idx + 1)}
                        >
                          <ArrowDown size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit event"
                          aria-label={`Edit ${evt.title}`}
                          onClick={() => handleStartEditEvent(evt)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>

                        {confirmDeleteId === evt.id ? (
                          <div className="delete-confirm-group">
                            <button
                              type="button"
                              className="btn-danger-sm"
                              onClick={() => handleDeleteTimelineItem(evt.id)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-ghost-sm"
                              onClick={() => setConfirmDeleteId('')}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            title="Delete event"
                            aria-label={`Delete ${evt.title}`}
                            onClick={() => setConfirmDeleteId(evt.id)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer profile-sheet-footer">
              <span className="table-muted">
                {form.published ? 'Published live on portfolio' : 'Saved as hidden draft'}
              </span>
              <button type="submit" className="btn-primary" disabled={saving}>
                <Save size={15} aria-hidden="true" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
