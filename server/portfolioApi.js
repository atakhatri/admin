const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const OWNER_EMAIL = 'atakhatri905@gmail.com';
const ALLOWED_CHANNELS = new Set(['all', 'projects', 'gallery', 'blogs']);
const DEFAULT_BLOG_COVER_URL =
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=675&fit=crop&q=80&auto=format';

const MAX_SSE_CLIENTS = 200;
const SSE_HEARTBEAT_MS = 25000;
const SSE_POLL_MS = 15000;

function loadFirebaseConfig() {
  const configPath = path.resolve(__dirname, '..', 'firebase-applet-config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
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

async function queryAllPublishedPortfolioData() {
  const [projects, gallery, posts] = await Promise.all([
    queryPublishedProjectsFromFirestore(null),
    queryPublishedGalleryFromFirestore(),
    queryPublishedBlogsFromFirestore(null),
  ]);
  const categories = extractBlogCategories(posts);
  return {
    projects,
    gridPhotos: gallery.gridPhotos,
    galleryImages: gallery.galleryImages,
    posts,
    categories,
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
function createRealtimeHub() {
  const clients = new Set();
  let lastKnownVersion = 'init';
  let pollTimer = null;
  let polling = false;

  function writeEvent(res, eventName, data) {
    try {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      clients.delete(res);
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
    for (const client of clients) {
      if (
        safeChannel === 'all' ||
        client.channels.has('all') ||
        client.channels.has(safeChannel)
      ) {
        writeEvent(client.res, 'update', payload);
      }
    }
  }

  async function refreshFingerprintAndBroadcast(channel = 'all', forceBroadcast = false) {
    if (polling) return lastKnownVersion;
    polling = true;
    try {
      const snapshot = await queryAllPublishedPortfolioData();
      const { version } = computeContentEtag(snapshot);
      if (forceBroadcast || (lastKnownVersion !== 'init' && version !== lastKnownVersion)) {
        broadcastUpdate(channel, version);
      } else {
        lastKnownVersion = version;
      }
      return version;
    } catch (error) {
      console.error('SSE fingerprint refresh error:', error?.message || error);
      if (forceBroadcast) {
        broadcastUpdate(channel, `${Date.now().toString(36)}`);
      }
      return lastKnownVersion;
    } finally {
      polling = false;
    }
  }

  function ensurePollLoop() {
    if (pollTimer || clients.size === 0) return;
    pollTimer = setInterval(() => {
      if (clients.size === 0) {
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }
      refreshFingerprintAndBroadcast('all', false);
    }, SSE_POLL_MS);
    if (typeof pollTimer.unref === 'function') {
      pollTimer.unref();
    }
  }

  function addClient(res, requestedChannels) {
    if (clients.size >= MAX_SSE_CLIENTS) {
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

  function removeClient(client) {
    if (!client) return;
    clients.delete(client);
    if (clients.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  return {
    addClient,
    removeClient,
    writeEvent,
    broadcastUpdate,
    refreshFingerprintAndBroadcast,
    getClientCount: () => clients.size,
    getVersion: () => lastKnownVersion,
  };
}

function registerPortfolioRoutes(app) {
  const realtimeHub = createRealtimeHub();

  // Public read-only CORS specifically scoped to GET /api/portfolio/*
  const publicPortfolioCors = cors({
    origin: '*',
    methods: ['GET', 'OPTIONS'],
    exposedHeaders: ['ETag'],
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'aurora-command-hub',
      streamClients: realtimeHub.getClientCount(),
      timestamp: new Date().toISOString(),
    });
  });

  app.options('/api/portfolio/all', publicPortfolioCors);
  app.options('/api/portfolio/projects', publicPortfolioCors);
  app.options('/api/portfolio/projects/:slug', publicPortfolioCors);
  app.options('/api/portfolio/gallery', publicPortfolioCors);
  app.options('/api/portfolio/blogs', publicPortfolioCors);
  app.options('/api/portfolio/blogs/:slug', publicPortfolioCors);
  app.options('/api/portfolio/stream', publicPortfolioCors);

  // Unified single-request bootstrap endpoint (Projects + Gallery + Blogs)
  app.get('/api/portfolio/all', publicPortfolioCors, async (req, res) => {
    try {
      const data = await queryAllPublishedPortfolioData();
      sendJsonWithEtag(req, res, data, (version) => ({
        source: 'aurora-command-hub',
        version,
        updatedAt: new Date().toISOString(),
        counts: {
          projects: data.projects.length,
          gridPhotos: data.gridPhotos.length,
          galleryImages: data.galleryImages.length,
          blogs: data.posts.length,
        },
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

  // Real-time Server-Sent Events (SSE) stream for zero-Firebase live portfolio updates
  app.get('/api/portfolio/stream', publicPortfolioCors, async (req, res) => {
    const rawChannels = String(req.query.channels || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter((c) => ALLOWED_CHANNELS.has(c));

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const client = realtimeHub.addClient(res, rawChannels);
    if (!client) {
      res.status(503).json({ error: 'Stream capacity reached. Please retry shortly.' });
      return;
    }

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write('retry: 4000\n\n');
    const version =
      realtimeHub.getVersion() === 'init'
        ? await realtimeHub.refreshFingerprintAndBroadcast('all', false)
        : realtimeHub.getVersion();

    realtimeHub.writeEvent(res, 'ready', {
      source: 'aurora-command-hub',
      version,
      channels: Array.from(client.channels),
      timestamp: new Date().toISOString(),
    });

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
        realtimeHub.removeClient(client);
      }
    }, SSE_HEARTBEAT_MS);

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
      const isOwner = await verifyOwnerIdToken(token);
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

  app.get('/api/portfolio/projects', publicPortfolioCors, async (req, res) => {
    try {
      const typeQuery = String(req.query.type || '').trim().toLowerCase();
      const statusQuery = String(req.query.status || '').trim().toLowerCase();
      const featuredOnly = String(req.query.featured || '').toLowerCase() === 'true';

      let projects = await queryPublishedProjectsFromFirestore(null);

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

  app.get('/api/portfolio/projects/:slug', publicPortfolioCors, async (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!SLUG_REGEX.test(slug) || slug.length > 80) {
      res.status(400).json({ error: 'Invalid project slug format.' });
      return;
    }

    try {
      const projects = await queryPublishedProjectsFromFirestore(slug);
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

  app.get('/api/portfolio/gallery', publicPortfolioCors, async (req, res) => {
    try {
      const { gridPhotos, galleryImages } = await queryPublishedGalleryFromFirestore();
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

  app.get('/api/portfolio/blogs', publicPortfolioCors, async (req, res) => {
    try {
      const categoryQuery = String(req.query.category || '').trim().toLowerCase();
      const tagQuery = String(req.query.tag || '').trim().toLowerCase();
      const featuredOnly = String(req.query.featured || '').toLowerCase() === 'true';

      const allPosts = await queryPublishedBlogsFromFirestore(null);
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

  app.get('/api/portfolio/blogs/:slug', publicPortfolioCors, async (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!SLUG_REGEX.test(slug) || slug.length > 100) {
      res.status(400).json({ error: 'Invalid blog slug format.' });
      return;
    }

    try {
      const posts = await queryPublishedBlogsFromFirestore(slug);
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
}

module.exports = {
  registerPortfolioRoutes,
  decodeFirestoreValue,
  formatPublishedAtLabel,
  computeContentEtag,
  extractBlogCategories,
  normalizePublicProjectDoc,
  normalizePublicGalleryDoc,
  normalizePublicBlogDoc,
  DEFAULT_BLOG_COVER_URL,
};
