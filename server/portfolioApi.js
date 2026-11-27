const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const OWNER_EMAIL = 'atakhatri905@gmail.com';
const ALLOWED_CHANNELS = new Set(['all', 'projects', 'gallery', 'blogs', 'profile']);
const SPOTIFY_PLAYLIST_REGEX =
  /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?playlist\/([A-Za-z0-9]{10,40})(?:[/?#].*)?$/i;
const DEFAULT_BLOG_COVER_URL =
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=675&fit=crop&q=80&auto=format';

const MAX_SSE_CLIENTS = 200;
const SSE_HEARTBEAT_MS = 25000;
const SSE_POLL_MS = 15000;

function loadFirebaseConfig() {
  try {
    return require('../firebase-applet-config.json');
  } catch {
    const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  }
}

function decodeFirestoreValue(val) {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const values =
      val.arrayValue && Array.isArray(val.arrayValue.values) ? val.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = (val.mapValue && val.mapValue.fields) || {};
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function formatPublishedAtLabel(isoDate, fallbackTimestamp) {
  const raw = String(isoDate || '').trim();
  if (ISO_DATE_REGEX.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  }
  if (fallbackTimestamp) {
    const dt = new Date(fallbackTimestamp);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  }
  return raw || 'Recently updated';
}

function computeContentEtag(data) {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .slice(0, 16);
  return { version: hash, etag: `"${hash}"` };
}

function sendJsonWithEtag(req, res, etagSource, buildBody) {
  const { version, etag } = computeContentEtag(etagSource);
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Vary', 'Origin');

  const ifNoneMatch = String(req.headers['if-none-match'] || '').trim();
  if (ifNoneMatch && (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`)) {
    res.status(304).end();
    return;
  }

  res.json(buildBody(version));
}

function normalizeProjectType(rawType, legacyCategory) {
  if (rawType === 'Website' || rawType === 'Mobile App') return rawType;
  const lower = String(rawType || legacyCategory || '').toLowerCase();
  return lower.includes('mobile') ? 'Mobile App' : 'Website';
}

function normalizeProjectStatus(rawStatus) {
  if (rawStatus === 'Complete' || rawStatus === 'Demo') return rawStatus;
  if (String(rawStatus || '').toLowerCase() === 'demo') return 'Demo';
  return 'Complete';
}

function normalizePublicProjectDoc(doc) {
  if (!doc || !doc.fields || !doc.name) return null;
  const segments = doc.name.split('/');
  const id = segments[segments.length - 1];
  const f = doc.fields;

  const rawPublished = f.published !== undefined ? decodeFirestoreValue(f.published) : null;
  const rawStatus = decodeFirestoreValue(f.status);
  const isPublished =
    typeof rawPublished === 'boolean' ? rawPublished : rawStatus === 'published';

  if (!isPublished) return null;

  const rawTags = decodeFirestoreValue(f.tags);
  const rawLegacyStack = decodeFirestoreValue(f.techStack);
  const tags = Array.isArray(rawTags)
    ? rawTags
    : Array.isArray(rawLegacyStack)
    ? rawLegacyStack
    : [];

  const desc = decodeFirestoreValue(f.description) || decodeFirestoreValue(f.tagline) || '';

  // Explicitly project ONLY public portfolio fields (never expose ownerId or private console links)
  return {
    id,
    slug: decodeFirestoreValue(f.slug) || id,
    title: decodeFirestoreValue(f.title) || '',
    description: desc,
    image: decodeFirestoreValue(f.image) || decodeFirestoreValue(f.coverImageUrl) || '',
    tags,
    liveUrl: decodeFirestoreValue(f.liveUrl) || '',
    githubUrl: decodeFirestoreValue(f.githubUrl) || decodeFirestoreValue(f.repoUrl) || '',
    type: normalizeProjectType(
      decodeFirestoreValue(f.type),
      decodeFirestoreValue(f.category)
    ),
    status: normalizeProjectStatus(rawStatus),
    featured: Boolean(decodeFirestoreValue(f.featured)),
    displayOrder: Number.isFinite(decodeFirestoreValue(f.displayOrder))
      ? decodeFirestoreValue(f.displayOrder)
      : 0,
    updatedAt: decodeFirestoreValue(f.updatedAt) || doc.updateTime || null,
  };
}

function normalizePublicGalleryDoc(doc) {
  if (!doc || !doc.fields || !doc.name) return null;
  const segments = doc.name.split('/');
  const id = segments[segments.length - 1];
  const f = doc.fields;

  const published = decodeFirestoreValue(f.published);
  if (published !== true) return null;

  const section = decodeFirestoreValue(f.section) === 'grid' ? 'grid' : 'gallery';
  const slotVal = decodeFirestoreValue(f.slot);
  const slot = Number.isInteger(slotVal) ? slotVal : 0;

  return {
    id,
    section,
    slot,
    title: decodeFirestoreValue(f.title) || '',
    image: decodeFirestoreValue(f.imageUrl) || '',
    alt: decodeFirestoreValue(f.alt) || '',
    category: decodeFirestoreValue(f.category) || '',
    displayOrder: Number.isFinite(decodeFirestoreValue(f.displayOrder))
      ? decodeFirestoreValue(f.displayOrder)
      : 0,
    updatedAt: decodeFirestoreValue(f.updatedAt) || doc.updateTime || null,
  };
}

function normalizePublicBlogDoc(doc) {
  if (!doc || !doc.fields || !doc.name) return null;
  const segments = doc.name.split('/');
  const id = segments[segments.length - 1];
  const f = doc.fields;

  const published = decodeFirestoreValue(f.published);
  if (published !== true) return null;

  const rawTags = decodeFirestoreValue(f.tags);
  const tags = Array.isArray(rawTags) ? rawTags : [];
  const slug = decodeFirestoreValue(f.slug) || id;
  const rawCover = String(decodeFirestoreValue(f.coverImage) || '').trim();
  const cover = rawCover || DEFAULT_BLOG_COVER_URL;
  const publishedDate = String(decodeFirestoreValue(f.publishedDate) || '').trim();
  const updatedAt = decodeFirestoreValue(f.updatedAt) || doc.updateTime || null;
  const category = String(decodeFirestoreValue(f.category) || '').trim() || 'General';

  // Matches Next.js portfolio BlogPostMeta (BlogsClient.tsx) 1-to-1 while preserving full article fields
  return {
    id,
    slug,
    href: `/blogs/${slug}`,
    title: decodeFirestoreValue(f.title) || '',
    excerpt: decodeFirestoreValue(f.excerpt) || '',
    content: decodeFirestoreValue(f.content) || '',
    cover,
    coverImage: cover,
    author: decodeFirestoreValue(f.author) || 'Owner',
    category,
    tags,
    publishedAt: formatPublishedAtLabel(publishedDate, updatedAt),
    publishedDate,
    readTime: decodeFirestoreValue(f.readTime) || '1 min read',
    featured: Boolean(decodeFirestoreValue(f.featured)),
    displayOrder: Number.isFinite(decodeFirestoreValue(f.displayOrder))
      ? decodeFirestoreValue(f.displayOrder)
      : 0,
    updatedAt,
  };
}

function extractBlogCategories(posts = []) {
  const seen = new Set();
  const categories = [];
  for (const post of posts) {
    const cat = String(post?.category || '').trim();
    if (!cat) continue;
    const key = cat.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      categories.push(cat);
    }
  }
  return categories.sort((a, b) => a.localeCompare(b));
}

function normalizeSpotifyEmbedUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { spotifyPlaylistUrl: '', spotifyEmbedUrl: '' };
  const match = trimmed.match(SPOTIFY_PLAYLIST_REGEX);
  if (!match) return { spotifyPlaylistUrl: '', spotifyEmbedUrl: '' };
  const id = match[1];
  return {
    spotifyPlaylistUrl: `https://open.spotify.com/playlist/${id}`,
    spotifyEmbedUrl: `https://open.spotify.com/embed/playlist/${id}?utm_source=generator`,
  };
}

function normalizePublicTimelineDoc(doc) {
  if (!doc || !doc.fields || !doc.name) return null;
  const segments = doc.name.split('/');
  const id = segments[segments.length - 1];
  const f = doc.fields;

  if (decodeFirestoreValue(f.published) !== true) return null;

  return {
    id,
    period: String(decodeFirestoreValue(f.period) || ''),
    title: String(decodeFirestoreValue(f.title) || ''),
    subtitle: String(decodeFirestoreValue(f.subtitle) || ''),
    description: String(decodeFirestoreValue(f.description) || ''),
    displayOrder: Number.isFinite(decodeFirestoreValue(f.displayOrder))
      ? decodeFirestoreValue(f.displayOrder)
      : 0,
    updatedAt: decodeFirestoreValue(f.updatedAt) || doc.updateTime || null,
  };
}

function createEmptyPublicProfile(timeline = []) {
  return {
    name: '',
    profession: '',
    oneLiner: '',
    pfp: '',
    about: {
      spotifyPlaylistUrl: '',
      spotifyEmbedUrl: '',
      languages: [],
      mostActiveOn: {
        platform: '',
        url: '',
      },
      links: {
        email: '',
        github: '',
        linkedin: '',
        twitter: '',
        website: '',
      },
      expertise: [],
    },
    timeline: Array.isArray(timeline) ? timeline : [],
    skills: [],
    updatedAt: null,
  };
}

function normalizePublicProfileDoc(doc, timeline = []) {
  if (!doc || !doc.fields || !doc.name) return null;
  const f = doc.fields;
  if (decodeFirestoreValue(f.published) !== true) return null;

  const rawLanguages = decodeFirestoreValue(f.languages);
  const rawExpertise = decodeFirestoreValue(f.expertise);
  const rawSkills = decodeFirestoreValue(f.skills);
  const spotify = normalizeSpotifyEmbedUrl(decodeFirestoreValue(f.spotifyPlaylistUrl));

  return {
    name: String(decodeFirestoreValue(f.name) || ''),
    profession: String(decodeFirestoreValue(f.profession) || ''),
    oneLiner: String(decodeFirestoreValue(f.oneLiner) || ''),
    pfp: String(decodeFirestoreValue(f.pfp) || ''),
    about: {
      spotifyPlaylistUrl: spotify.spotifyPlaylistUrl,
      spotifyEmbedUrl: spotify.spotifyEmbedUrl,
      languages: Array.isArray(rawLanguages) ? rawLanguages.slice(0, 15) : [],
      mostActiveOn: {
        platform: String(decodeFirestoreValue(f.mostActivePlatform) || ''),
        url: String(decodeFirestoreValue(f.mostActiveUrl) || ''),
      },
      links: {
        email: String(decodeFirestoreValue(f.contactEmail) || ''),
        github: String(decodeFirestoreValue(f.githubUrl) || ''),
        linkedin: String(decodeFirestoreValue(f.linkedinUrl) || ''),
        twitter: String(decodeFirestoreValue(f.twitterUrl) || ''),
        website: String(decodeFirestoreValue(f.websiteUrl) || ''),
      },
      expertise: Array.isArray(rawExpertise) ? rawExpertise.slice(0, 15) : [],
    },
    timeline: Array.isArray(timeline) ? timeline : [],
    skills: Array.isArray(rawSkills) ? rawSkills.slice(0, 10) : [],
    updatedAt: decodeFirestoreValue(f.updatedAt) || doc.updateTime || null,
  };
}

function getFirestoreQueryEndpoint() {
  const cfg = loadFirebaseConfig();
  const projectId = cfg.projectId;
  const databaseId = cfg.firestoreDatabaseId || '(default)';
  const apiKey = cfg.apiKey;

  if (!projectId || projectId === 'remixed-project-id') {
    throw new Error('Firebase project is not configured.');
  }

  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents:runQuery?key=${encodeURIComponent(
    apiKey
  )}`;
}

async function runStructuredQuery(endpoint, structuredQuery) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firestore REST query failed (${response.status}): ${errText.slice(0, 240)}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function queryPublishedProjectsFromFirestore(slugFilter = null) {
  const endpoint = getFirestoreQueryEndpoint();

  const buildWhere = (visibilityFilter) =>
    slugFilter
      ? {
          compositeFilter: {
            op: 'AND',
            filters: [
              visibilityFilter,
              {
                fieldFilter: {
                  field: { fieldPath: 'slug' },
                  op: 'EQUAL',
                  value: { stringValue: slugFilter },
                },
              },
            ],
          },
        }
      : visibilityFilter;

  const modernFilter = {
    fieldFilter: {
      field: { fieldPath: 'published' },
      op: 'EQUAL',
      value: { booleanValue: true },
    },
  };

  const legacyFilter = {
    fieldFilter: {
      field: { fieldPath: 'status' },
      op: 'EQUAL',
      value: { stringValue: 'published' },
    },
  };

  const [modernRows, legacyRows] = await Promise.all([
    runStructuredQuery(endpoint, {
      from: [{ collectionId: 'public_projects' }],
      where: buildWhere(modernFilter),
    }),
    runStructuredQuery(endpoint, {
      from: [{ collectionId: 'public_projects' }],
      where: buildWhere(legacyFilter),
    }),
  ]);

  const byId = new Map();
  for (const row of [...modernRows, ...legacyRows]) {
    if (!row || !row.document) continue;
    const item = normalizePublicProjectDoc(row.document);
    if (item && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return String(a.title).localeCompare(String(b.title));
  });
}

async function queryPublishedGalleryFromFirestore() {
  const endpoint = getFirestoreQueryEndpoint();

  const rows = await runStructuredQuery(endpoint, {
    from: [{ collectionId: 'public_gallery' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'published' },
        op: 'EQUAL',
        value: { booleanValue: true },
      },
    },
  });

  const gridPhotos = [];
  const galleryImages = [];

  for (const row of rows) {
    if (!row || !row.document) continue;
    const item = normalizePublicGalleryDoc(row.document);
    if (!item) continue;
    if (item.section === 'grid' && item.slot >= 1 && item.slot <= 5) {
      gridPhotos.push(item);
    } else if (item.section === 'gallery') {
      galleryImages.push(item);
    }
  }

  gridPhotos.sort((a, b) => a.slot - b.slot);
  galleryImages.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return String(a.title || a.id).localeCompare(String(b.title || b.id));
  });

  return { gridPhotos, galleryImages };
}

async function queryPublishedBlogsFromFirestore(slugFilter = null) {
  const endpoint = getFirestoreQueryEndpoint();

  const publishedFilter = {
    fieldFilter: {
      field: { fieldPath: 'published' },
      op: 'EQUAL',
      value: { booleanValue: true },
    },
  };

  const where = slugFilter
    ? {
        compositeFilter: {
          op: 'AND',
          filters: [
            publishedFilter,
            {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: slugFilter },
              },
            },
          ],
        },
      }
    : publishedFilter;

  const rows = await runStructuredQuery(endpoint, {
    from: [{ collectionId: 'public_blogs' }],
    where,
  });

  const posts = [];
  for (const row of rows) {
    if (!row || !row.document) continue;
    const item = normalizePublicBlogDoc(row.document);
    if (item) posts.push(item);
  }

  return posts.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return String(b.publishedDate || '').localeCompare(String(a.publishedDate || ''));
  });
}

async function queryPublishedProfileFromFirestore() {
  const endpoint = getFirestoreQueryEndpoint();
  const publishedFilter = {
    fieldFilter: {
      field: { fieldPath: 'published' },
      op: 'EQUAL',
      value: { booleanValue: true },
    },
  };

  const [profileRows, timelineRows] = await Promise.all([
    runStructuredQuery(endpoint, {
      from: [{ collectionId: 'public_profile' }],
      where: publishedFilter,
    }),
    runStructuredQuery(endpoint, {
      from: [{ collectionId: 'public_timeline' }],
      where: publishedFilter,
    }),
  ]);

  const timeline = [];
  for (const row of timelineRows) {
    if (!row || !row.document) continue;
    const item = normalizePublicTimelineDoc(row.document);
    if (item) timeline.push(item);
  }
  timeline.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return String(a.title).localeCompare(String(b.title));
  });

  let profileDoc = null;
  for (const row of profileRows) {
    if (!row || !row.document) continue;
    const segments = String(row.document.name || '').split('/');
    if (segments[segments.length - 1] === 'main') {
      profileDoc = row.document;
      break;
    }
    if (!profileDoc) profileDoc = row.document;
  }

  return normalizePublicProfileDoc(profileDoc, timeline) || createEmptyPublicProfile(timeline);
}

async function queryAllPublishedPortfolioData() {
  const [projects, gallery, posts, profile] = await Promise.all([
    queryPublishedProjectsFromFirestore(null),
    queryPublishedGalleryFromFirestore(),
    queryPublishedBlogsFromFirestore(null),
    queryPublishedProfileFromFirestore(),
  ]);
  const categories = extractBlogCategories(posts);
  return {
    projects,
    gridPhotos: gallery.gridPhotos,
    galleryImages: gallery.galleryImages,
    posts,
    categories,
    profile,
  };
}

// Verify Firebase ID token via Firebase Auth Identity Toolkit REST API (zero Admin SDK/IAM needed)
async function verifyOwnerIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 8192) {
    return false;
  }
  const cfg = loadFirebaseConfig();
  if (!cfg.apiKey) return false;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(cfg.apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!response.ok) return false;
  const payload = await response.json();
  const user = Array.isArray(payload?.users) ? payload.users[0] : null;
  if (!user || user.disabled) return false;
  return (
    Boolean(user.emailVerified) &&
    typeof user.email === 'string' &&
    user.email.toLowerCase() === OWNER_EMAIL
  );
}

// ═══════════════════════════════════════════════════════════════════
// REAL-TIME SSE BROADCAST HUB (Zero Firebase SDK needed on portfolio)
// ═══════════════════════════════════════════════════════════════════
function createRealtimeHub(options = {}) {
  const queryAllData = options.queryAllData || queryAllPublishedPortfolioData;
  const pollMs = Number.isFinite(options.pollMs) ? options.pollMs : SSE_POLL_MS;
  const maxClients = Number.isFinite(options.maxClients) ? options.maxClients : MAX_SSE_CLIENTS;

  const clients = new Set();
  let lastKnownVersion = 'init';
  let lastChannelVersions = {
    projects: null,
    gallery: null,
    blogs: null,
    profile: null,
  };
  let pollTimer = null;
  let polling = false;

  function removeClient(client) {
    if (!client) return;
    clients.delete(client);
    if (clients.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function writeEvent(clientOrRes, eventName, data) {
    const isClientObj =
      clientOrRes && typeof clientOrRes === 'object' && 'res' in clientOrRes && clientOrRes.res;
    const res = isClientObj ? clientOrRes.res : clientOrRes;
    try {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') {
        res.flush();
      }
    } catch {
      if (isClientObj) {
        removeClient(clientOrRes);
      } else {
        for (const c of clients) {
          if (c.res === res) {
            removeClient(c);
            break;
          }
        }
      }
    }
  }

  function broadcastUpdate(channel = 'all', version = null) {
    const safeChannel = ALLOWED_CHANNELS.has(channel) ? channel : 'all';
    const nextVersion = version || `${Date.now().toString(36)}`;
    lastKnownVersion = nextVersion;
    const payload = {
      channel: safeChannel,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };
    for (const client of Array.from(clients)) {
      if (
        safeChannel === 'all' ||
        client.channels.has('all') ||
        client.channels.has(safeChannel)
      ) {
        writeEvent(client, 'update', payload);
      }
    }
  }

  async function refreshFingerprintAndBroadcast(channel = 'all', forceBroadcast = false) {
    if (polling) {
      if (forceBroadcast) {
        const fallbackVersion = `${Date.now().toString(36)}`;
        broadcastUpdate(channel, fallbackVersion);
        return fallbackVersion;
      }
      return lastKnownVersion;
    }
    polling = true;
    try {
      const snapshot = await queryAllData();
      const { version } = computeContentEtag(snapshot);
      const nextChannelVersions = {
        projects: computeContentEtag(snapshot.projects || []).version,
        gallery: computeContentEtag({
          gridPhotos: snapshot.gridPhotos || [],
          galleryImages: snapshot.galleryImages || [],
        }).version,
        blogs: computeContentEtag({
          posts: snapshot.posts || [],
          categories: snapshot.categories || [],
        }).version,
        profile: computeContentEtag(snapshot.profile || createEmptyPublicProfile()).version,
      };

      if (forceBroadcast) {
        lastChannelVersions = nextChannelVersions;
        broadcastUpdate(channel, version);
      } else if (lastKnownVersion !== 'init' && version !== lastKnownVersion) {
        const changedChannels = Object.keys(nextChannelVersions).filter(
          (key) => lastChannelVersions[key] !== null && lastChannelVersions[key] !== nextChannelVersions[key]
        );
        const broadcastChannel = changedChannels.length === 1 ? changedChannels[0] : channel;
        lastChannelVersions = nextChannelVersions;
        broadcastUpdate(broadcastChannel, version);
      } else {
        lastKnownVersion = version;
        lastChannelVersions = nextChannelVersions;
      }
      return version;
    } catch (error) {
      console.error('SSE fingerprint refresh error:', error?.message || error);
      if (forceBroadcast) {
        const fallbackVersion = `${Date.now().toString(36)}`;
        broadcastUpdate(channel, fallbackVersion);
        return fallbackVersion;
      }
      return lastKnownVersion;
    } finally {
      polling = false;
    }
  }

  function ensurePollLoop() {
    if (pollTimer || clients.size === 0 || pollMs <= 0) return;
    pollTimer = setInterval(() => {
      if (clients.size === 0) {
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }
      refreshFingerprintAndBroadcast('all', false);
    }, pollMs);
    if (typeof pollTimer.unref === 'function') {
      pollTimer.unref();
    }
  }

  function addClient(res, requestedChannels) {
    if (clients.size >= maxClients) {
      return null;
    }
    const channels = new Set(
      requestedChannels.length > 0 ? requestedChannels : ['all']
    );
    const client = { res, channels };
    clients.add(client);
    ensurePollLoop();
    return client;
  }

  function close() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    clients.clear();
  }

  return {
    addClient,
    removeClient,
    writeEvent,
    broadcastUpdate,
    refreshFingerprintAndBroadcast,
    close,
    getClientCount: () => clients.size,
    getVersion: () => lastKnownVersion,
  };
}

function registerPortfolioRoutes(app, deps = {}) {
  const queryPublishedProjects =
    deps.queryPublishedProjects || queryPublishedProjectsFromFirestore;
  const queryPublishedGallery =
    deps.queryPublishedGallery || queryPublishedGalleryFromFirestore;
  const queryPublishedBlogs =
    deps.queryPublishedBlogs || queryPublishedBlogsFromFirestore;
  const queryPublishedProfile =
    deps.queryPublishedProfile || queryPublishedProfileFromFirestore;
  const queryAllPublishedPortfolio =
    deps.queryAllPublishedPortfolio ||
    (async () => {
      const [projects, gallery, posts, profile] = await Promise.all([
        queryPublishedProjects(null),
        queryPublishedGallery(),
        queryPublishedBlogs(null),
        queryPublishedProfile(),
      ]);
      const categories = extractBlogCategories(posts);
      return {
        projects,
        gridPhotos: gallery.gridPhotos,
        galleryImages: gallery.galleryImages,
        posts,
        categories,
        profile: profile || createEmptyPublicProfile(),
      };
    });
  const verifyOwnerToken = deps.verifyOwnerIdToken || verifyOwnerIdToken;
  const heartbeatMs = Number.isFinite(deps.sseHeartbeatMs)
    ? deps.sseHeartbeatMs
    : SSE_HEARTBEAT_MS;
  const pollMs = Number.isFinite(deps.ssePollMs) ? deps.ssePollMs : SSE_POLL_MS;
  const maxSseClients = Number.isFinite(deps.maxSseClients)
    ? deps.maxSseClients
    : MAX_SSE_CLIENTS;

  const isServerless =
    deps.isServerless !== undefined ? Boolean(deps.isServerless) : process.env.VERCEL === '1';

  const realtimeHub = createRealtimeHub({
    queryAllData: queryAllPublishedPortfolio,
    pollMs: isServerless ? 0 : pollMs,
    maxClients: maxSseClients,
  });

  // Public read-only CORS mounted BEFORE all /api/portfolio routes so GET/HEAD/OPTIONS
  // responses AND 404/error responses always include Access-Control-Allow-Origin: *
  const publicPortfolioCors = cors({
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS'],
    exposedHeaders: ['ETag'],
  });

  app.use('/api/portfolio', (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      publicPortfolioCors(req, res, next);
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'aurora-command-hub',
      runtime: isServerless ? 'serverless' : 'server',
      streamClients: realtimeHub.getClientCount(),
      timestamp: new Date().toISOString(),
    });
  });

  // Unified single-request bootstrap endpoint (Profile + Projects + Gallery + Blogs)
  app.get('/api/portfolio/all', async (req, res) => {
    try {
      const rawData = await queryAllPublishedPortfolio();
      const profile = rawData.profile || createEmptyPublicProfile();
      const data = { ...rawData, profile };
      sendJsonWithEtag(req, res, data, (version) => ({
        source: 'aurora-command-hub',
        version,
        updatedAt: new Date().toISOString(),
        counts: {
          projects: data.projects.length,
          gridPhotos: data.gridPhotos.length,
          galleryImages: data.galleryImages.length,
          blogs: data.posts.length,
          timeline: profile.timeline.length,
          skills: profile.skills.length,
        },
        profile,
        projects: data.projects,
        gridPhotos: data.gridPhotos,
        galleryImages: data.galleryImages,
        posts: data.posts,
        blogs: data.posts,
        categories: data.categories,
      }));
    } catch (error) {
      console.error('Portfolio combined fetch failed:', error);
      res.status(502).json({
        error: 'Unable to fetch combined portfolio payload.',
      });
    }
  });

  // Public Portfolio Profile Details + Scalable Timeline + Skills (max 10)
  app.get('/api/portfolio/profile', async (req, res) => {
    try {
      const profile = (await queryPublishedProfile()) || createEmptyPublicProfile();
      sendJsonWithEtag(req, res, { profile }, (version) => ({
        source: 'aurora-command-hub',
        version,
        updatedAt: new Date().toISOString(),
        profile,
      }));
    } catch (error) {
      console.error('Portfolio profile fetch failed:', error);
      res.status(502).json({
        error: 'Unable to fetch published portfolio profile.',
      });
    }
  });

  // Real-time Server-Sent Events (SSE) stream for zero-Firebase live portfolio updates
  app.get('/api/portfolio/stream', async (req, res) => {
    const rawChannels = String(req.query.channels || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter((c) => ALLOWED_CHANNELS.has(c));

    // On serverless hosts (e.g. Vercel), emit a fresh version snapshot and end cleanly
    // so EventSource reconnects gently without hitting serverless execution timeouts.
    if (isServerless) {
      const channels = rawChannels.length > 0 ? Array.from(new Set(rawChannels)) : ['all'];
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }
      res.write('retry: 15000\n\n');
      const version = await realtimeHub.refreshFingerprintAndBroadcast('all', false);
      if (!req.destroyed && !res.writableEnded) {
        realtimeHub.writeEvent(res, 'ready', {
          source: 'aurora-command-hub',
          version,
          channels,
          mode: 'serverless',
          timestamp: new Date().toISOString(),
        });
        res.end();
      }
      return;
    }

    const client = realtimeHub.addClient(res, rawChannels);
    if (!client) {
      res.status(503).json({ error: 'Stream capacity reached. Please retry shortly.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write('retry: 4000\n\n');
    if (typeof res.flush === 'function') {
      res.flush();
    }

    const version =
      realtimeHub.getVersion() === 'init'
        ? await realtimeHub.refreshFingerprintAndBroadcast('all', false)
        : realtimeHub.getVersion();

    if (req.destroyed || res.writableEnded) {
      realtimeHub.removeClient(client);
      return;
    }

    realtimeHub.writeEvent(client, 'ready', {
      source: 'aurora-command-hub',
      version,
      channels: Array.from(client.channels),
      timestamp: new Date().toISOString(),
    });

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
        if (typeof res.flush === 'function') {
          res.flush();
        }
      } catch {
        clearInterval(heartbeat);
        realtimeHub.removeClient(client);
      }
    }, heartbeatMs);
    if (typeof heartbeat.unref === 'function') {
      heartbeat.unref();
    }

    req.on('close', () => {
      clearInterval(heartbeat);
      realtimeHub.removeClient(client);
    });
  });

  // Owner-authenticated instant revalidation trigger called by this dashboard after CRUD writes
  app.post('/api/portfolio/revalidate', async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || '');
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const isOwner = await verifyOwnerToken(token);
      if (!isOwner) {
        res.status(401).json({ error: 'Owner authentication required.' });
        return;
      }

      const requestedChannel = String(req.body?.channel || 'all').trim().toLowerCase();
      const channel = ALLOWED_CHANNELS.has(requestedChannel) ? requestedChannel : 'all';
      const version = await realtimeHub.refreshFingerprintAndBroadcast(channel, true);

      res.json({
        ok: true,
        channel,
        version,
        notifiedClients: realtimeHub.getClientCount(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Portfolio revalidate failed:', error);
      res.status(500).json({ error: 'Unable to trigger revalidation.' });
    }
  });

  app.get('/api/portfolio/projects', async (req, res) => {
    try {
      const typeQuery = String(req.query.type || '').trim().toLowerCase();
      const statusQuery = String(req.query.status || '').trim().toLowerCase();
      const featuredOnly = String(req.query.featured || '').toLowerCase() === 'true';

      let projects = await queryPublishedProjects(null);

      if (typeQuery) {
        projects = projects.filter((p) => p.type.toLowerCase() === typeQuery);
      }
      if (statusQuery) {
        projects = projects.filter((p) => p.status.toLowerCase() === statusQuery);
      }
      if (featuredOnly) {
        projects = projects.filter((p) => p.featured);
      }

      sendJsonWithEtag(req, res, projects, (version) => ({
        source: 'aurora-command-hub',
        version,
        count: projects.length,
        updatedAt: new Date().toISOString(),
        projects,
      }));
    } catch (error) {
      console.error('Portfolio projects fetch failed:', error);
      res.status(502).json({
        error: 'Unable to fetch published portfolio projects.',
      });
    }
  });

  app.get('/api/portfolio/projects/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!SLUG_REGEX.test(slug) || slug.length > 80) {
      res.status(400).json({ error: 'Invalid project slug format.' });
      return;
    }

    try {
      const projects = await queryPublishedProjects(slug);
      if (projects.length === 0) {
        res.status(404).json({ error: 'Published project not found.' });
        return;
      }

      sendJsonWithEtag(req, res, projects[0], (version) => ({
        source: 'aurora-command-hub',
        version,
        project: projects[0],
      }));
    } catch (error) {
      console.error('Portfolio project slug fetch failed:', error);
      res.status(502).json({
        error: 'Unable to fetch project.',
      });
    }
  });

  app.get('/api/portfolio/gallery', async (req, res) => {
    try {
      const { gridPhotos, galleryImages } = await queryPublishedGallery();
      sendJsonWithEtag(req, res, { gridPhotos, galleryImages }, (version) => ({
        source: 'aurora-command-hub',
        version,
        updatedAt: new Date().toISOString(),
        gridCount: gridPhotos.length,
        galleryCount: galleryImages.length,
        gridPhotos,
        galleryImages,
      }));
    } catch (error) {
      console.error('Portfolio gallery fetch failed:', error);
      res.status(502).json({
        error: 'Unable to fetch published portfolio gallery.',
      });
    }
  });

  app.get('/api/portfolio/blogs', async (req, res) => {
    try {
      const categoryQuery = String(req.query.category || '').trim().toLowerCase();
      const tagQuery = String(req.query.tag || '').trim().toLowerCase();
      const featuredOnly = String(req.query.featured || '').toLowerCase() === 'true';

      const allPosts = await queryPublishedBlogs(null);
      const categories = extractBlogCategories(allPosts);
      let posts = allPosts;

      if (categoryQuery) {
        posts = posts.filter((b) => b.category.toLowerCase() === categoryQuery);
      }
      if (tagQuery) {
        posts = posts.filter((b) =>
          b.tags.some((t) => String(t).toLowerCase() === tagQuery)
        );
      }
      if (featuredOnly) {
        posts = posts.filter((b) => b.featured);
      }

      sendJsonWithEtag(req, res, { posts, categories }, (version) => ({
        source: 'aurora-command-hub',
        version,
        count: posts.length,
        updatedAt: new Date().toISOString(),
        categories,
        posts,
        blogs: posts,
      }));
    } catch (error) {
      console.error('Portfolio blogs fetch failed:', error);
      res.status(502).json({
        error: 'Unable to fetch published portfolio blogs.',
      });
    }
  });

  app.get('/api/portfolio/blogs/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!SLUG_REGEX.test(slug) || slug.length > 100) {
      res.status(400).json({ error: 'Invalid blog slug format.' });
      return;
    }

    try {
      const posts = await queryPublishedBlogs(slug);
      if (posts.length === 0) {
        res.status(404).json({ error: 'Published blog post not found.' });
        return;
      }

      sendJsonWithEtag(req, res, posts[0], (version) => ({
        source: 'aurora-command-hub',
        version,
        post: posts[0],
        blog: posts[0],
      }));
    } catch (error) {
      console.error('Portfolio blog slug fetch failed:', error);
      res.status(502).json({
        error: 'Unable to fetch blog post.',
      });
    }
  });

  // Scoped JSON 404 & error handlers so /api/portfolio/* NEVER returns HTML and always retains CORS
  app.use('/api/portfolio', (_req, res) => {
    res.status(404).json({ error: 'Portfolio API route not found.' });
  });

  app.use('/api/portfolio', (err, _req, res, _next) => {
    console.error('Unhandled portfolio API error:', err);
    if (res.headersSent) return;
    const status = err && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error: status === 400 ? 'Malformed request payload.' : 'Portfolio API internal error.',
    });
  });

  return { realtimeHub };
}

module.exports = {
  registerPortfolioRoutes,
  createRealtimeHub,
  createEmptyPublicProfile,
  decodeFirestoreValue,
  formatPublishedAtLabel,
  computeContentEtag,
  extractBlogCategories,
  normalizeSpotifyEmbedUrl,
  normalizePublicProjectDoc,
  normalizePublicGalleryDoc,
  normalizePublicBlogDoc,
  normalizePublicProfileDoc,
  normalizePublicTimelineDoc,
  DEFAULT_BLOG_COVER_URL,
};
