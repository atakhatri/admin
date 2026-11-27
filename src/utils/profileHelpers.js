export const PROFILE_DOC_ID = 'main';
export const MAX_SKILLS = 10;
export const MAX_LANGUAGES = 15;
export const MAX_EXPERTISE = 15;

export const SAFE_HTTP_URL_REGEX = /^https?:\/\/[^\s]+$/i;
export const SIMPLE_EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const SPOTIFY_PLAYLIST_REGEX =
  /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?playlist\/([A-Za-z0-9]{10,40})(?:[/?#].*)?$/i;

export const DEFAULT_PROFILE = Object.freeze({
  name: '',
  profession: '',
  oneLiner: '',
  pfp: '',
  spotifyPlaylistUrl: '',
  languages: [],
  mostActivePlatform: '',
  mostActiveUrl: '',
  contactEmail: '',
  githubUrl: '',
  linkedinUrl: '',
  twitterUrl: '',
  websiteUrl: '',
  expertise: [],
  skills: [],
  published: true,
});

export function normalizeSpotifyPlaylistUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: true, url: '', embedUrl: '', playlistId: '', error: '' };
  }
  const match = trimmed.match(SPOTIFY_PLAYLIST_REGEX);
  if (!match) {
    return {
      valid: false,
      url: trimmed,
      embedUrl: '',
      playlistId: '',
      error:
        'Enter a valid Spotify playlist link (https://open.spotify.com/playlist/... or embed URL).',
    };
  }
  const playlistId = match[1];
  return {
    valid: true,
    url: `https://open.spotify.com/playlist/${playlistId}`,
    embedUrl: `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`,
    playlistId,
    error: '',
  };
}

export function sanitizeStringList(input, maxItems = 15, maxItemLen = 40) {
  const items = Array.isArray(input)
    ? input
    : String(input || '')
        .split(/[\n,]/)
        .map((s) => s.trim());

  const seen = new Set();
  const out = [];
  for (const raw of items) {
    const cleaned = String(raw || '').trim().slice(0, maxItemLen);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function reorderListItem(list, fromIdx, toIdx) {
  if (!Array.isArray(list)) return [];
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length || fromIdx === toIdx) {
    return [...list];
  }
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

export function validateProfileForm(form) {
  const errors = {};
  const name = String(form?.name || '').trim();
  const profession = String(form?.profession || '').trim();
  const oneLiner = String(form?.oneLiner || '').trim();
  const pfp = String(form?.pfp || '').trim();
  const rawSpotify = String(form?.spotifyPlaylistUrl || '').trim();
  const mostActivePlatform = String(form?.mostActivePlatform || '').trim();
  const mostActiveUrl = String(form?.mostActiveUrl || '').trim();
  const contactEmail = String(form?.contactEmail || '').trim();
  const githubUrl = String(form?.githubUrl || '').trim();
  const linkedinUrl = String(form?.linkedinUrl || '').trim();
  const twitterUrl = String(form?.twitterUrl || '').trim();
  const websiteUrl = String(form?.websiteUrl || '').trim();

  const rawLanguages = Array.isArray(form?.languages)
    ? form.languages
    : String(form?.languages || '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
  const rawExpertise = Array.isArray(form?.expertise)
    ? form.expertise
    : String(form?.expertise || '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
  const rawSkills = Array.isArray(form?.skills)
    ? form.skills.map((s) => String(s || '').trim()).filter(Boolean)
    : String(form?.skills || '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

  if (name.length < 1 || name.length > 100) {
    errors.name = 'Name is required (1–100 characters).';
  }
  if (profession.length > 100) {
    errors.profession = 'Profession must be 100 characters or fewer.';
  }
  if (oneLiner.length > 240) {
    errors.oneLiner = 'One-liner must be 240 characters or fewer.';
  }
  if (pfp && (!SAFE_HTTP_URL_REGEX.test(pfp) || pfp.length > 1000)) {
    errors.pfp = 'Profile photo must be a valid http(s) URL (max 1000 chars).';
  }

  const spotify = normalizeSpotifyPlaylistUrl(rawSpotify);
  if (!spotify.valid) {
    errors.spotifyPlaylistUrl = spotify.error;
  }

  if (mostActivePlatform.length > 60) {
    errors.mostActivePlatform = 'Platform name must be 60 characters or fewer.';
  }
  if (mostActiveUrl && (!SAFE_HTTP_URL_REGEX.test(mostActiveUrl) || mostActiveUrl.length > 500)) {
    errors.mostActiveUrl = 'Platform URL must be a valid http(s) URL.';
  }
  if (contactEmail && (!SIMPLE_EMAIL_REGEX.test(contactEmail) || contactEmail.length > 120)) {
    errors.contactEmail = 'Enter a valid email address (max 120 chars).';
  }
  if (githubUrl && (!SAFE_HTTP_URL_REGEX.test(githubUrl) || githubUrl.length > 500)) {
    errors.githubUrl = 'GitHub URL must be a valid http(s) URL.';
  }
  if (linkedinUrl && (!SAFE_HTTP_URL_REGEX.test(linkedinUrl) || linkedinUrl.length > 500)) {
    errors.linkedinUrl = 'LinkedIn URL must be a valid http(s) URL.';
  }
  if (twitterUrl && (!SAFE_HTTP_URL_REGEX.test(twitterUrl) || twitterUrl.length > 500)) {
    errors.twitterUrl = 'X / Twitter URL must be a valid http(s) URL.';
  }
  if (websiteUrl && (!SAFE_HTTP_URL_REGEX.test(websiteUrl) || websiteUrl.length > 500)) {
    errors.websiteUrl = 'Website URL must be a valid http(s) URL.';
  }

  const dedupedLanguages = sanitizeStringList(rawLanguages, MAX_LANGUAGES + 1, 40);
  if (dedupedLanguages.length > MAX_LANGUAGES) {
    errors.languages = `Use up to ${MAX_LANGUAGES} languages.`;
  }

  const dedupedExpertise = sanitizeStringList(rawExpertise, MAX_EXPERTISE + 1, 50);
  if (dedupedExpertise.length > MAX_EXPERTISE) {
    errors.expertise = `Use up to ${MAX_EXPERTISE} expertise tags.`;
  }

  const dedupedSkills = sanitizeStringList(rawSkills, MAX_SKILLS + 1, 40);
  if (dedupedSkills.length > MAX_SKILLS) {
    errors.skills = `You can add at most ${MAX_SKILLS} skills.`;
  }

  const normalized = {
    name,
    profession,
    oneLiner,
    pfp,
    spotifyPlaylistUrl: spotify.valid ? spotify.url : '',
    languages: dedupedLanguages.slice(0, MAX_LANGUAGES),
    mostActivePlatform,
    mostActiveUrl,
    contactEmail,
    githubUrl,
    linkedinUrl,
    twitterUrl,
    websiteUrl,
    expertise: dedupedExpertise.slice(0, MAX_EXPERTISE),
    skills: dedupedSkills.slice(0, MAX_SKILLS),
    published: Boolean(form?.published ?? true),
  };

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized,
    spotifyEmbedUrl: spotify.valid ? spotify.embedUrl : '',
  };
}

export function validateTimelineEventForm(form, fallbackOrder = 1) {
  const errors = {};
  const period = String(form?.period || '').trim();
  const title = String(form?.title || '').trim();
  const subtitle = String(form?.subtitle || '').trim();
  const description = String(form?.description || '').trim();
  const parsedOrder = Number.parseInt(form?.displayOrder, 10);
  const displayOrder =
    Number.isInteger(parsedOrder) && parsedOrder >= 0 && parsedOrder <= 10000
      ? parsedOrder
      : Math.max(0, Math.min(10000, Number(fallbackOrder) || 1));

  if (period.length < 1 || period.length > 60) {
    errors.period = 'Period is required (e.g. "2024 – Present", max 60 chars).';
  }
  if (title.length < 1 || title.length > 120) {
    errors.title = 'Title is required (1–120 characters).';
  }
  if (subtitle.length > 120) {
    errors.subtitle = 'Organization / subtitle must be 120 characters or fewer.';
  }
  if (description.length > 1000) {
    errors.description = 'Description must be 1000 characters or fewer.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      period,
      title,
      subtitle,
      description,
      displayOrder,
      published: Boolean(form?.published ?? true),
    },
  };
}

export function normalizeTimelineEvents(docs = []) {
  return [...docs]
    .map((doc) => ({
      id: doc.id,
      ownerId: doc.ownerId || '',
      period: String(doc.period || ''),
      title: String(doc.title || ''),
      subtitle: String(doc.subtitle || ''),
      description: String(doc.description || ''),
      displayOrder: Number.isFinite(doc.displayOrder) ? doc.displayOrder : 0,
      published: Boolean(doc.published),
      createdAt: doc.createdAt || null,
      updatedAt: doc.updatedAt || null,
    }))
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return String(a.title).localeCompare(String(b.title));
    });
}
