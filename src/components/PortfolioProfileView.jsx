import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Clock,
  Edit3,
  ExternalLink,
  Globe,
  Link2,
  Mail,
  Music,
  Plus,
  Save,
  Sparkles,
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
  const [form, setForm] = useState(() => buildProfileState(profile, defaultName));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Tag chip drafts
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
  }, [profile, defaultName]);

  const setField = (key, value) => {
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
      return;
    }

    setSaving(true);
    try {
      await onSaveProfile({
        existingProfile: profile,
        data: result.normalized,
      });
      setForm(result.normalized);
      setSaveSuccess('Portfolio profile saved and published live.');
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
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Portfolio Profile</h2>
          <p className="section-subtitle">
            Manage your personal details, embedded Spotify playlist, communication links, timeline,
            and core skills.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={handleSaveProfileSubmit}
        >
          <Save size={15} aria-hidden="true" />
          <span>{saving ? 'Saving...' : 'Save Portfolio Profile'}</span>
        </button>
      </div>

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

      <div className="profile-workspace-grid">
        {/* LEFT COLUMN: LIVE IDENTITY & MEDIA PREVIEW */}
        <aside className="profile-preview-col" aria-label="Live profile preview">
          <div className="profile-glass-card profile-preview-card">
            <div className="profile-identity-preview profile-identity-preview-stacked">
              <div className="profile-pfp-circle profile-pfp-circle-lg">
                {form.pfp && /^https?:\/\//i.test(form.pfp) ? (
                  <img src={form.pfp} alt={form.name || 'Portfolio profile photo'} />
                ) : (
                  <User size={32} aria-hidden="true" />
                )}
              </div>
              <div className="profile-identity-meta">
                <span className={`status-text ${form.published ? 'status-published' : 'status-draft'}`}>
                  {form.published ? 'Published' : 'Hidden Draft'}
                </span>
                <strong>{form.name || 'Your Name'}</strong>
                <span>{form.profession || 'Your Profession (e.g. Web Dev)'}</span>
                {form.oneLiner && <p>{form.oneLiner}</p>}
              </div>
            </div>

            {form.contactEmail && (
              <div className="profile-preview-email">
                <Mail size={14} aria-hidden="true" />
                <span>{form.contactEmail}</span>
              </div>
            )}

            {activePreviewLinks.length > 0 && (
              <div className="profile-preview-links">
                {activePreviewLinks.map((lnk) => (
                  <a
                    key={lnk.key}
                    href={lnk.href}
                    target="_blank"
                    rel="noreferrer"
                    className="profile-preview-link-pill"
                  >
                    <span>{lnk.label}</span>
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}

            <div className="profile-preview-stats">
              <div>
                <span>Skills</span>
                <strong>
                  {form.skills.length}/{MAX_SKILLS}
                </strong>
              </div>
              <div>
                <span>Timeline</span>
                <strong>{timeline.length}</strong>
              </div>
              <div>
                <span>Languages</span>
                <strong>{form.languages.length}</strong>
              </div>
            </div>
          </div>

          <div className="profile-glass-card">
            <div className="profile-card-head">
              <Music size={16} aria-hidden="true" />
              <h3>Spotify Playlist Preview</h3>
            </div>
            {spotifyPreview.valid && spotifyPreview.embedUrl ? (
              <div className="profile-spotify-preview">
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
            ) : (
              <div className="timeline-empty">
                <Music size={16} aria-hidden="true" />
                <span>Paste any Spotify playlist link to preview the live embed here.</span>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: COMPREHENSIVE FORM CARDS */}
        <div className="profile-editor-col">
          <form className="profile-form-stack" onSubmit={handleSaveProfileSubmit} noValidate>
            {/* 1. PERSONAL DETAILS */}
            <div className="profile-glass-card">
              <div className="profile-card-head">
                <User size={16} aria-hidden="true" />
                <h3>1. Personal Details</h3>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="prof-name">Name *</label>
                  <input
                    id="prof-name"
                    type="text"
                    className="glass-input"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Ata Khatri"
                    required
                  />
                  {errors.name && <span className="field-err">{errors.name}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-role">Profession</label>
                  <input
                    id="prof-role"
                    type="text"
                    className="glass-input"
                    value={form.profession}
                    onChange={(e) => setField('profession', e.target.value)}
                    placeholder="Web Developer"
                  />
                  {errors.profession && <span className="field-err">{errors.profession}</span>}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="prof-oneliner">One-Liner</label>
                <input
                  id="prof-oneliner"
                  type="text"
                  className="glass-input"
                  value={form.oneLiner}
                  onChange={(e) => setField('oneLiner', e.target.value)}
                  placeholder="Building fast, expressive web apps and clean digital products."
                  maxLength={240}
                />
                {errors.oneLiner && <span className="field-err">{errors.oneLiner}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="prof-pfp">Portfolio Profile Photo (PFP URL)</label>
                <input
                  id="prof-pfp"
                  type="url"
                  className="glass-input"
                  value={form.pfp}
                  onChange={(e) => setField('pfp', e.target.value)}
                  placeholder="https://res.cloudinary.com/.../avatar.jpg"
                />
                {errors.pfp && <span className="field-err">{errors.pfp}</span>}
              </div>

              <div className="form-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(form.published)}
                    onChange={(e) => setField('published', e.target.checked)}
                  />
                  <span>Publish profile live to portfolio</span>
                </label>
              </div>
            </div>

            {/* 2. ABOUT & MEDIA EMBEDDINGS */}
            <div className="profile-glass-card">
              <div className="profile-card-head">
                <Music size={16} aria-hidden="true" />
                <h3>2. About &amp; Media Embeddings</h3>
              </div>

              <div className="form-field">
                <label htmlFor="prof-spotify">Spotify Playlist URL</label>
                <input
                  id="prof-spotify"
                  type="url"
                  className="glass-input"
                  value={form.spotifyPlaylistUrl}
                  onChange={(e) => setField('spotifyPlaylistUrl', e.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                />
                {errors.spotifyPlaylistUrl && (
                  <span className="field-err">{errors.spotifyPlaylistUrl}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="prof-languages">
                  Languages I Speak ({form.languages.length}/{MAX_LANGUAGES})
                </label>
                <div className="chip-input-row">
                  <input
                    id="prof-languages"
                    type="text"
                    className="glass-input"
                    value={languageDraft}
                    onChange={(e) => setLanguageDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addChip('languages', languageDraft, MAX_LANGUAGES, 40, setLanguageDraft);
                      }
                    }}
                    placeholder="Type language and press Enter (e.g. English, Hindi)"
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
                  <div className="profile-chip-list">
                    {form.languages.map((lang, idx) => (
                      <span key={`${lang}-${idx}`} className="profile-chip">
                        <span>{lang}</span>
                        <button
                          type="button"
                          className="profile-chip-remove"
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
                  Expertise Tags ({form.expertise.length}/{MAX_EXPERTISE})
                </label>
                <div className="chip-input-row">
                  <input
                    id="prof-expertise"
                    type="text"
                    className="glass-input"
                    value={expertiseDraft}
                    onChange={(e) => setExpertiseDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addChip('expertise', expertiseDraft, MAX_EXPERTISE, 50, setExpertiseDraft);
                      }
                    }}
                    placeholder="Type expertise and press Enter (e.g. Full-Stack, UI Systems)"
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
                  <div className="profile-chip-list">
                    {form.expertise.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="profile-chip">
                        <span>{tag}</span>
                        <button
                          type="button"
                          className="profile-chip-remove"
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

            {/* 3. COMMUNICATION & PLATFORM LINKS */}
            <div className="profile-glass-card">
              <div className="profile-card-head">
                <Link2 size={16} aria-hidden="true" />
                <h3>3. Communication &amp; Platform Links</h3>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="prof-active-platform">Most Active On (Platform)</label>
                  <input
                    id="prof-active-platform"
                    type="text"
                    className="glass-input"
                    value={form.mostActivePlatform}
                    onChange={(e) => setField('mostActivePlatform', e.target.value)}
                    placeholder="GitHub, X, Discord..."
                  />
                  {errors.mostActivePlatform && (
                    <span className="field-err">{errors.mostActivePlatform}</span>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="prof-active-url">Most Active Profile URL</label>
                  <input
                    id="prof-active-url"
                    type="url"
                    className="glass-input"
                    value={form.mostActiveUrl}
                    onChange={(e) => setField('mostActiveUrl', e.target.value)}
                    placeholder="https://github.com/yourusername"
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
                    className="glass-input"
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
                    className="glass-input"
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
                    className="glass-input"
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
                    className="glass-input"
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
                    className="glass-input"
                    value={form.twitterUrl}
                    onChange={(e) => setField('twitterUrl', e.target.value)}
                    placeholder="https://x.com/..."
                  />
                  {errors.twitterUrl && <span className="field-err">{errors.twitterUrl}</span>}
                </div>
              </div>
            </div>

            {/* 4. SKILLS TAG MANAGER (MAX 10) */}
            <div className="profile-glass-card">
              <div className="profile-card-head profile-card-head-between">
                <div className="profile-card-head-left">
                  <Sparkles size={16} aria-hidden="true" />
                  <h3>4. Skills Tag Manager</h3>
                </div>
                <span className={`skills-cap-counter${skillsAtCap ? ' is-full' : ''}`}>
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
                <label htmlFor="prof-skills">Add Skills (up to {MAX_SKILLS})</label>
                <div className="chip-input-row">
                  <input
                    id="prof-skills"
                    type="text"
                    className="glass-input"
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
                        : 'Type a skill and press Enter (e.g. React, Next.js, TypeScript)'
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
                <div className="timeline-empty">
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Add up to {MAX_SKILLS} core skills to showcase on your portfolio.</span>
                </div>
              ) : (
                <div className="profile-chip-list profile-skills-list">
                  {form.skills.map((skill, idx) => (
                    <span key={`${skill}-${idx}`} className="profile-chip profile-skill-chip">
                      <span className="profile-skill-index">{idx + 1}</span>
                      <span>{skill}</span>
                      <span className="profile-skill-reorder">
                        <button
                          type="button"
                          className="profile-chip-step"
                          aria-label={`Move ${skill} earlier`}
                          disabled={idx === 0}
                          onClick={() => moveSkill(idx, idx - 1)}
                        >
                          <ArrowLeft size={11} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="profile-chip-step"
                          aria-label={`Move ${skill} later`}
                          disabled={idx === form.skills.length - 1}
                          onClick={() => moveSkill(idx, idx + 1)}
                        >
                          <ArrowRight size={11} aria-hidden="true" />
                        </button>
                      </span>
                      <button
                        type="button"
                        className="profile-chip-remove"
                        aria-label={`Remove ${skill}`}
                        onClick={() => removeChip('skills', idx)}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="profile-card-save-row">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save size={15} aria-hidden="true" />
                  <span>{saving ? 'Saving...' : 'Save Portfolio Profile'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* 5. SCALABLE TIMELINE EVENTS */}
          <div className="profile-glass-card">
            <div className="profile-card-head profile-card-head-between">
              <div className="profile-card-head-left">
                <Clock size={16} aria-hidden="true" />
                <h3>5. Timeline Events</h3>
              </div>
              <span className="table-muted">{timeline.length} saved</span>
            </div>

            {eventBannerError && (
              <p className="field-error-banner" role="alert">
                {eventBannerError}
              </p>
            )}

            <div className="timeline-composer">
              <div className="timeline-composer-head">
                <strong>{editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}</strong>
                {editingEvent && (
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    onClick={handleCancelEditEvent}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="tl-period">Time / Period *</label>
                  <input
                    id="tl-period"
                    type="text"
                    className="glass-input"
                    value={eventDraft.period}
                    onChange={(e) =>
                      setEventDraft((prev) => ({ ...prev, period: e.target.value }))
                    }
                    placeholder="2024 – Present"
                  />
                  {eventErrors.period && <span className="field-err">{eventErrors.period}</span>}
                </div>

                <div className="form-field">
                  <label htmlFor="tl-title">Event / Role Title *</label>
                  <input
                    id="tl-title"
                    type="text"
                    className="glass-input"
                    value={eventDraft.title}
                    onChange={(e) =>
                      setEventDraft((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Full-Stack Web Developer"
                  />
                  {eventErrors.title && <span className="field-err">{eventErrors.title}</span>}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="tl-subtitle">Organization / Context</label>
                <input
                  id="tl-subtitle"
                  type="text"
                  className="glass-input"
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
                  className="glass-textarea"
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
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(eventDraft.published)}
                    onChange={(e) =>
                      setEventDraft((prev) => ({ ...prev, published: e.target.checked }))
                    }
                  />
                  <span>Visible on portfolio</span>
                </label>

                <button
                  type="button"
                  className="btn-primary"
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
              <div className="timeline-empty">
                <Globe size={16} aria-hidden="true" />
                <span>No timeline events yet. Add your first milestone above.</span>
              </div>
            ) : (
              <div className="timeline-event-list">
                {timeline.map((evt, idx) => (
                  <div key={evt.id} className="timeline-event-card">
                    <div className="timeline-event-main">
                      <div className="timeline-event-top">
                        <span className="timeline-period-badge">{evt.period}</span>
                        {!evt.published && <span className="table-muted">Draft</span>}
                      </div>
                      <strong className="timeline-event-title">{evt.title}</strong>
                      {evt.subtitle && <span className="timeline-event-sub">{evt.subtitle}</span>}
                      {evt.description && <p className="timeline-event-desc">{evt.description}</p>}
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
                        <Edit3 size={14} aria-hidden="true" />
                      </button>

                      {confirmDeleteId === evt.id ? (
                        <div className="timeline-delete-confirm">
                          <button
                            type="button"
                            className="btn-logout-danger"
                            onClick={() => handleDeleteTimelineItem(evt.id)}
                          >
                            Delete
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
                          className="icon-btn"
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
        </div>
      </div>
    </section>
  );
}
