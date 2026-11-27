import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import portfolioApi from './portfolioApi.js';

const {
  registerPortfolioRoutes,
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
} = portfolioApi;

function createSampleProfile() {
  return {
    name: 'Ata Khatri',
    profession: 'Web Developer',
    oneLiner: 'Building fast, tactile interfaces.',
    pfp: 'https://example.com/pfp.jpg',
    about: {
      spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
      spotifyEmbedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator',
      languages: ['English', 'Hindi'],
      mostActiveOn: {
        platform: 'GitHub',
        url: 'https://github.com/atakhatri',
      },
      links: {
        email: 'hello@atakhatri.dev',
        github: 'https://github.com/atakhatri',
        linkedin: 'https://linkedin.com/in/atakhatri',
        twitter: 'https://x.com/atakhatri',
        website: 'https://atakhatri.dev',
      },
      expertise: ['Frontend', 'Next.js'],
    },
    timeline: [
      {
        id: 'evt-1',
        period: '2024 – Present',
        title: 'Web Developer',
        subtitle: 'Independent',
        description: 'Shipping full-stack web apps.',
        displayOrder: 0,
        updatedAt: '2026-11-27T00:00:00.000Z',
      },
    ],
    skills: ['React', 'Next.js', 'TypeScript'],
    updatedAt: '2026-11-27T00:00:00.000Z',
  };
}

async function startTestServer(deps = {}) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  const { realtimeHub } = registerPortfolioRoutes(app, {
    queryPublishedProjects: async () => [],
    queryPublishedGallery: async () => ({ gridPhotos: [], galleryImages: [] }),
    queryPublishedBlogs: async () => [],
    queryPublishedProfile: async () => createSampleProfile(),
    verifyOwnerIdToken: async (token) => token === 'valid-owner-token',
    sseHeartbeatMs: 60000,
    ssePollMs: 0,
    ...deps,
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const close = async () => {
    realtimeHub.close();
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
  };

  return { baseUrl, realtimeHub, close };
}

function openSseStream(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let buffer = '';
      const events = [];
      const comments = [];
      const waiters = [];

      const flushWaiters = () => {
        for (let i = waiters.length - 1; i >= 0; i -= 1) {
          const waiter = waiters[i];
          if (waiter.predicate({ events, comments })) {
            clearTimeout(waiter.timer);
            waiters.splice(i, 1);
            waiter.resolve();
          }
        }
      };

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        let sepIndex = buffer.indexOf('\n\n');
        while (sepIndex !== -1) {
          const block = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);

          if (block.startsWith(':')) {
            comments.push(block);
          } else {
            let eventName = 'message';
            const dataLines = [];
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim());
              }
            }
            if (dataLines.length > 0) {
              const rawData = dataLines.join('\n');
              events.push({ event: eventName, data: JSON.parse(rawData) });
            }
          }
          sepIndex = buffer.indexOf('\n\n');
        }
        flushWaiters();
      });

      const waitFor = (predicate, timeoutMs = 3000) =>
        new Promise((resWait, rejWait) => {
          if (predicate({ events, comments })) {
            resWait();
            return;
          }
          const timer = setTimeout(() => {
            rejWait(new Error(`Timed out waiting for SSE condition (events=${JSON.stringify(events)})`));
          }, timeoutMs);
          waiters.push({ predicate, resolve: resWait, timer });
        });

      const close = () => {
        req.destroy();
        res.destroy();
      };

      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        events,
        comments,
        waitFor,
        close,
      });
    });

    req.on('error', reject);
  });
}

test('decodeFirestoreValue decodes primitives, arrays, and maps', () => {
  assert.equal(decodeFirestoreValue({ stringValue: 'hello' }), 'hello');
  assert.equal(decodeFirestoreValue({ integerValue: '42' }), 42);
  assert.equal(decodeFirestoreValue({ booleanValue: true }), true);
  assert.deepEqual(
    decodeFirestoreValue({
      arrayValue: { values: [{ stringValue: 'React' }, { stringValue: 'Node' }] },
    }),
    ['React', 'Node']
  );
  assert.deepEqual(
    decodeFirestoreValue({
      mapValue: { fields: { count: { integerValue: '3' } } },
    }),
    { count: 3 }
  );
});

test('normalizePublicProjectDoc returns exact custom portfolio schema for published projects and excludes drafts', () => {
  const draftDoc = {
    name: 'projects/p/databases/d/documents/public_projects/proj-draft',
    fields: {
      published: { booleanValue: false },
      status: { stringValue: 'Demo' },
      title: { stringValue: 'Secret Draft' },
    },
  };
  assert.equal(normalizePublicProjectDoc(draftDoc), null);

  const publishedDoc = {
    name: 'projects/p/databases/d/documents/public_projects/proj-live',
    updateTime: '2026-11-27T04:00:00Z',
    fields: {
      published: { booleanValue: true },
      slug: { stringValue: 'aurora-site' },
      title: { stringValue: 'Aurora Site' },
      description: { stringValue: 'Full description' },
      image: { stringValue: 'https://images.unsplash.com/photo-1' },
      tags: { arrayValue: { values: [{ stringValue: 'React' }, { stringValue: 'Three.js' }] } },
      liveUrl: { stringValue: 'https://aurora.example.com' },
      githubUrl: { stringValue: 'https://github.com/owner/aurora' },
      type: { stringValue: 'Website' },
      status: { stringValue: 'Complete' },
      featured: { booleanValue: true },
      displayOrder: { integerValue: '1' },
      ownerId: { stringValue: 'sensitive-uid-123' },
      authDashboardUrl: { stringValue: 'https://console.firebase.google.com/secret' },
    },
  };

  const normalized = normalizePublicProjectDoc(publishedDoc);
  assert.equal(normalized.id, 'proj-live');
  assert.equal(normalized.slug, 'aurora-site');
  assert.equal(normalized.title, 'Aurora Site');
  assert.equal(normalized.description, 'Full description');
  assert.equal(normalized.image, 'https://images.unsplash.com/photo-1');
  assert.deepEqual(normalized.tags, ['React', 'Three.js']);
  assert.equal(normalized.liveUrl, 'https://aurora.example.com');
  assert.equal(normalized.githubUrl, 'https://github.com/owner/aurora');
  assert.equal(normalized.type, 'Website');
  assert.equal(normalized.status, 'Complete');
  assert.equal('ownerId' in normalized, false);
  assert.equal('authDashboardUrl' in normalized, false);
});

test('normalizePublicGalleryDoc projects published grid/gallery photos and hides unpublished drafts', () => {
  const hidden = {
    name: 'projects/p/databases/d/documents/public_gallery/photo-hidden',
    fields: {
      published: { booleanValue: false },
      section: { stringValue: 'gallery' },
      imageUrl: { stringValue: 'https://example.com/hidden.jpg' },
    },
  };
  assert.equal(normalizePublicGalleryDoc(hidden), null);

  const gridPhoto = {
    name: 'projects/p/databases/d/documents/public_gallery/grid-slot-1',
    fields: {
      published: { booleanValue: true },
      section: { stringValue: 'grid' },
      slot: { integerValue: '1' },
      title: { stringValue: 'Hero Shot' },
      imageUrl: { stringValue: 'https://example.com/hero.jpg' },
      alt: { stringValue: 'City twilight' },
      category: { stringValue: 'Urban' },
      displayOrder: { integerValue: '1' },
      ownerId: { stringValue: 'private-uid' },
    },
  };
  const out = normalizePublicGalleryDoc(gridPhoto);
  assert.equal(out.id, 'grid-slot-1');
  assert.equal(out.section, 'grid');
  assert.equal(out.slot, 1);
  assert.equal(out.image, 'https://example.com/hero.jpg');
  assert.equal('ownerId' in out, false);
});

test('normalizePublicBlogDoc projects published articles and excludes drafts and ownerId', () => {
  const draftBlog = {
    name: 'projects/p/databases/d/documents/public_blogs/blog-draft',
    fields: {
      published: { booleanValue: false },
      title: { stringValue: 'Private Note' },
    },
  };
  assert.equal(normalizePublicBlogDoc(draftBlog), null);

  const liveBlog = {
    name: 'projects/p/databases/d/documents/public_blogs/blog-1',
    updateTime: '2026-11-27T05:00:00Z',
    fields: {
      published: { booleanValue: true },
      slug: { stringValue: 'live-portfolio-cms' },
      title: { stringValue: 'Live Portfolio CMS' },
      excerpt: { stringValue: 'Short excerpt' },
      content: { stringValue: '## Markdown Body' },
      coverImage: { stringValue: 'https://example.com/blog.jpg' },
      author: { stringValue: 'Ata Khatri' },
      category: { stringValue: 'Engineering' },
      tags: { arrayValue: { values: [{ stringValue: 'React' }, { stringValue: 'Firebase' }] } },
      publishedDate: { stringValue: '2026-11-26' },
      readTime: { stringValue: '3 min read' },
      featured: { booleanValue: true },
      displayOrder: { integerValue: '1' },
      ownerId: { stringValue: 'secret-owner-uid' },
    },
  };

  const out = normalizePublicBlogDoc(liveBlog);
  assert.equal(out.id, 'blog-1');
  assert.equal(out.slug, 'live-portfolio-cms');
  assert.equal(out.href, '/blogs/live-portfolio-cms');
  assert.equal(out.title, 'Live Portfolio CMS');
  assert.equal(out.cover, 'https://example.com/blog.jpg');
  assert.equal(out.publishedAt, 'Nov 26, 2026');
  assert.equal(out.publishedDate, '2026-11-26');
  assert.deepEqual(out.tags, ['React', 'Firebase']);
  assert.equal(out.featured, true);
  assert.equal('ownerId' in out, false);

  // Blank coverImage falls back safely so next/image never crashes
  const noCoverBlog = {
    name: 'projects/p/databases/d/documents/public_blogs/blog-2',
    fields: {
      published: { booleanValue: true },
      slug: { stringValue: 'no-cover-post' },
      title: { stringValue: 'No Cover Post' },
      coverImage: { stringValue: '' },
      category: { stringValue: '' },
    },
  };
  const fallbackOut = normalizePublicBlogDoc(noCoverBlog);
  assert.equal(fallbackOut.cover, DEFAULT_BLOG_COVER_URL);
  assert.equal(fallbackOut.category, 'General');
  assert.equal(fallbackOut.href, '/blogs/no-cover-post');
});

test('extractBlogCategories deduplicates and sorts categories and computeContentEtag is deterministic', () => {
  const cats = extractBlogCategories([
    { category: 'Engineering' },
    { category: 'design' },
    { category: 'Engineering' },
    { category: 'Architecture' },
  ]);
  assert.deepEqual(cats, ['Architecture', 'design', 'Engineering']);

  assert.equal(formatPublishedAtLabel('2026-05-04'), 'May 4, 2026');

  const tagA = computeContentEtag({ posts: [{ slug: 'a' }] });
  const tagB = computeContentEtag({ posts: [{ slug: 'a' }] });
  const tagC = computeContentEtag({ posts: [{ slug: 'b' }] });
  assert.equal(tagA.etag, tagB.etag);
  assert.notEqual(tagA.etag, tagC.etag);
});

test('normalizePublicProfileDoc & normalizePublicTimelineDoc project clean public profile and strip ownerId', () => {
  const spotify = normalizeSpotifyEmbedUrl(
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=xyz'
  );
  assert.equal(spotify.spotifyPlaylistUrl, 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(
    spotify.spotifyEmbedUrl,
    'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator'
  );

  const draftTimeline = {
    name: 'projects/p/databases/d/documents/public_timeline/evt-hidden',
    fields: { published: { booleanValue: false }, title: { stringValue: 'Hidden' } },
  };
  assert.equal(normalizePublicTimelineDoc(draftTimeline), null);

  const liveTimeline = normalizePublicTimelineDoc({
    name: 'projects/p/databases/d/documents/public_timeline/evt-1',
    fields: {
      ownerId: { stringValue: 'secret-uid' },
      period: { stringValue: '2024 – Present' },
      title: { stringValue: 'Web Developer' },
      subtitle: { stringValue: 'Freelance' },
      description: { stringValue: 'Shipping full-stack apps.' },
      displayOrder: { integerValue: '1' },
      published: { booleanValue: true },
    },
  });
  assert.equal(liveTimeline.id, 'evt-1');
  assert.equal(liveTimeline.period, '2024 – Present');
  assert.equal('ownerId' in liveTimeline, false);

  const draftProfile = {
    name: 'projects/p/databases/d/documents/public_profile/main',
    fields: { published: { booleanValue: false }, name: { stringValue: 'Ata' } },
  };
  assert.equal(normalizePublicProfileDoc(draftProfile, [liveTimeline]), null);

  const liveProfile = normalizePublicProfileDoc(
    {
      name: 'projects/p/databases/d/documents/public_profile/main',
      updateTime: '2026-11-27T06:00:00Z',
      fields: {
        ownerId: { stringValue: 'secret-uid' },
        name: { stringValue: 'Ata Khatri' },
        profession: { stringValue: 'Web Dev' },
        oneLiner: { stringValue: 'Crafting crisp web apps.' },
        pfp: { stringValue: 'https://example.com/pfp.jpg' },
        spotifyPlaylistUrl: {
          stringValue: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
        },
        languages: { arrayValue: { values: [{ stringValue: 'English' }, { stringValue: 'Hindi' }] } },
        mostActivePlatform: { stringValue: 'GitHub' },
        mostActiveUrl: { stringValue: 'https://github.com/atakhatri' },
        contactEmail: { stringValue: 'hello@atakhatri.dev' },
        githubUrl: { stringValue: 'https://github.com/atakhatri' },
        linkedinUrl: { stringValue: 'https://linkedin.com/in/atakhatri' },
        twitterUrl: { stringValue: 'https://x.com/atakhatri' },
        websiteUrl: { stringValue: 'https://atakhatri.dev' },
        expertise: { arrayValue: { values: [{ stringValue: 'Frontend' }, { stringValue: 'Next.js' }] } },
        skills: {
          arrayValue: {
            values: Array.from({ length: 12 }, (_, i) => ({ stringValue: `Skill ${i + 1}` })),
          },
        },
        published: { booleanValue: true },
      },
    },
    [liveTimeline]
  );

  assert.equal(liveProfile.name, 'Ata Khatri');
  assert.equal(liveProfile.profession, 'Web Dev');
  assert.equal(liveProfile.about.mostActiveOn.platform, 'GitHub');
  assert.equal(liveProfile.about.mostActiveOn.url, 'https://github.com/atakhatri');
  assert.equal(liveProfile.about.links.email, 'hello@atakhatri.dev');
  assert.equal(liveProfile.about.links.github, 'https://github.com/atakhatri');
  assert.equal(liveProfile.about.links.linkedin, 'https://linkedin.com/in/atakhatri');
  assert.equal(liveProfile.about.links.twitter, 'https://x.com/atakhatri');
  assert.equal(liveProfile.about.links.website, 'https://atakhatri.dev');
  assert.equal(
    liveProfile.about.spotifyEmbedUrl,
    'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator'
  );
  assert.equal(liveProfile.skills.length, 10);
  assert.equal(liveProfile.timeline.length, 1);
  assert.equal('ownerId' in liveProfile, false);
});

test('GET /api/portfolio/profile returns exact shape, CORS, ETag, and 304 support', async () => {
  const { baseUrl, close } = await startTestServer();
  try {
    const res = await fetch(`${baseUrl}/api/portfolio/profile`, {
      headers: { Origin: 'https://my-portfolio.example.com' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.match(String(res.headers.get('access-control-expose-headers') || ''), /ETag/i);
    assert.equal(res.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.match(String(res.headers.get('content-type') || ''), /application\/json/i);

    const etag = res.headers.get('etag');
    assert.ok(etag);

    const body = await res.json();
    assert.equal(body.source, 'aurora-command-hub');
    assert.equal(typeof body.version, 'string');
    assert.equal(typeof body.updatedAt, 'string');
    assert.equal(body.profile.name, 'Ata Khatri');
    assert.equal(body.profile.profession, 'Web Developer');
    assert.equal(body.profile.oneLiner, 'Building fast, tactile interfaces.');
    assert.equal(body.profile.pfp, 'https://example.com/pfp.jpg');
    assert.deepEqual(body.profile.about.languages, ['English', 'Hindi']);
    assert.deepEqual(body.profile.about.mostActiveOn, {
      platform: 'GitHub',
      url: 'https://github.com/atakhatri',
    });
    assert.deepEqual(body.profile.about.expertise, ['Frontend', 'Next.js']);
    assert.equal(body.profile.timeline.length, 1);
    assert.equal(body.profile.timeline[0].id, 'evt-1');
    assert.deepEqual(body.profile.skills, ['React', 'Next.js', 'TypeScript']);

    const cachedRes = await fetch(`${baseUrl}/api/portfolio/profile`, {
      headers: { 'If-None-Match': etag },
    });
    assert.equal(cachedRes.status, 304);
    assert.equal(cachedRes.headers.get('access-control-allow-origin'), '*');
  } finally {
    await close();
  }
});

test('GET /api/portfolio/profile and /api/portfolio/all return valid empty/default profile when uninitialized', async () => {
  const { baseUrl, close } = await startTestServer({
    queryPublishedProfile: async () => null,
  });
  try {
    const profileRes = await fetch(`${baseUrl}/api/portfolio/profile`);
    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.headers.get('access-control-allow-origin'), '*');
    const profileJson = await profileRes.json();
    assert.deepEqual(profileJson.profile, createEmptyPublicProfile());

    const allRes = await fetch(`${baseUrl}/api/portfolio/all`);
    assert.equal(allRes.status, 200);
    assert.equal(allRes.headers.get('access-control-allow-origin'), '*');
    const allJson = await allRes.json();
    assert.deepEqual(allJson.profile, createEmptyPublicProfile());
    assert.equal(allJson.counts.timeline, 0);
    assert.equal(allJson.counts.skills, 0);
    assert.ok(Array.isArray(allJson.projects));
    assert.ok(Array.isArray(allJson.gridPhotos));
    assert.ok(Array.isArray(allJson.galleryImages));
    assert.ok(Array.isArray(allJson.posts));
    assert.ok(Array.isArray(allJson.blogs));
    assert.ok(Array.isArray(allJson.categories));
  } finally {
    await close();
  }
});

test('GET /api/portfolio/all includes populated profile while preserving existing portfolio fields', async () => {
  const { baseUrl, close } = await startTestServer({
    queryPublishedProjects: async () => [
      { id: 'p1', slug: 'demo', title: 'Demo', type: 'Website', status: 'Complete', featured: true, displayOrder: 0 },
    ],
    queryPublishedBlogs: async () => [
      { id: 'b1', slug: 'post-1', title: 'Post 1', category: 'Engineering', tags: ['Node'] },
    ],
  });
  try {
    const res = await fetch(`${baseUrl}/api/portfolio/all`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    const data = await res.json();
    assert.equal(data.source, 'aurora-command-hub');
    assert.equal(data.profile.name, 'Ata Khatri');
    assert.equal(data.counts.projects, 1);
    assert.equal(data.counts.blogs, 1);
    assert.equal(data.counts.timeline, 1);
    assert.equal(data.counts.skills, 3);
    assert.equal(data.projects.length, 1);
    assert.equal(data.posts.length, 1);
    assert.equal(data.blogs.length, 1);
    assert.deepEqual(data.categories, ['Engineering']);
  } finally {
    await close();
  }
});

test('CORS headers and JSON responses are preserved on OPTIONS, 404, 502, and SSE 503 errors (never HTML)', async () => {
  const { baseUrl, close } = await startTestServer({
    queryPublishedProfile: async () => {
      throw new Error('Upstream Firestore failure');
    },
    maxSseClients: 0,
  });
  try {
    const optRes = await fetch(`${baseUrl}/api/portfolio/profile`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://portfolio.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.equal(optRes.status, 204);
    assert.equal(optRes.headers.get('access-control-allow-origin'), '*');

    const notFoundRes = await fetch(`${baseUrl}/api/portfolio/nonexistent-endpoint`, {
      headers: { Origin: 'https://portfolio.example.com' },
    });
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundRes.headers.get('access-control-allow-origin'), '*');
    assert.match(String(notFoundRes.headers.get('content-type') || ''), /application\/json/i);
    const notFoundJson = await notFoundRes.json();
    assert.equal(typeof notFoundJson.error, 'string');

    const failRes = await fetch(`${baseUrl}/api/portfolio/profile`, {
      headers: { Origin: 'https://portfolio.example.com' },
    });
    assert.equal(failRes.status, 502);
    assert.equal(failRes.headers.get('access-control-allow-origin'), '*');
    assert.match(String(failRes.headers.get('content-type') || ''), /application\/json/i);
    const failJson = await failRes.json();
    assert.equal(typeof failJson.error, 'string');

    const capRes = await fetch(`${baseUrl}/api/portfolio/stream?channels=profile`, {
      headers: { Origin: 'https://portfolio.example.com' },
    });
    assert.equal(capRes.status, 503);
    assert.equal(capRes.headers.get('access-control-allow-origin'), '*');
    assert.match(String(capRes.headers.get('content-type') || ''), /application\/json/i);
    const capJson = await capRes.json();
    assert.equal(typeof capJson.error, 'string');
  } finally {
    await close();
  }
});

test('GET /api/portfolio/stream?channels=profile reports profile channel, emits heartbeats, and broadcasts profile updates', async () => {
  let currentProfile = createSampleProfile();
  const { baseUrl, close } = await startTestServer({
    queryPublishedProfile: async () => currentProfile,
    sseHeartbeatMs: 60,
    ssePollMs: 0,
  });

  let stream = null;
  try {
    stream = await openSseStream(`${baseUrl}/api/portfolio/stream?channels=profile`);
    assert.equal(stream.statusCode, 200);
    assert.equal(stream.headers['access-control-allow-origin'], '*');
    assert.match(String(stream.headers['content-type'] || ''), /text\/event-stream/i);

    await stream.waitFor(({ events }) => events.some((e) => e.event === 'ready'));
    const readyEvent = stream.events.find((e) => e.event === 'ready');
    assert.deepEqual(readyEvent.data.channels, ['profile']);
    assert.equal(readyEvent.data.source, 'aurora-command-hub');

    // Confirm stream stays open and emits heartbeat comment
    await stream.waitFor(({ comments }) => comments.some((c) => c.includes(': ping')));

    // Unrelated projects-only update must NOT trigger profile-only subscriber
    const projRes = await fetch(`${baseUrl}/api/portfolio/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-owner-token',
      },
      body: JSON.stringify({ channel: 'projects' }),
    });
    assert.equal(projRes.status, 200);

    // Profile edit/timeline change triggers revalidate(channel: 'profile')
    currentProfile = {
      ...currentProfile,
      oneLiner: 'Updated live one-liner!',
    };
    const revalRes = await fetch(`${baseUrl}/api/portfolio/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-owner-token',
      },
      body: JSON.stringify({ channel: 'profile' }),
    });
    assert.equal(revalRes.status, 200);
    const revalJson = await revalRes.json();
    assert.equal(revalJson.ok, true);
    assert.equal(revalJson.channel, 'profile');

    await stream.waitFor(({ events }) => events.some((e) => e.event === 'update'));
    const updates = stream.events.filter((e) => e.event === 'update');
    assert.equal(updates.length, 1);
    assert.equal(updates[0].data.channel, 'profile');
    assert.equal(typeof updates[0].data.version, 'string');
    assert.equal(typeof updates[0].data.updatedAt, 'string');
  } finally {
    if (stream) stream.close();
    await close();
  }
});

test('SSE background polling detects profile-only mutations and broadcasts channel: "profile"', async () => {
  let currentProfile = createSampleProfile();
  const { baseUrl, close } = await startTestServer({
    queryPublishedProfile: async () => currentProfile,
    sseHeartbeatMs: 60000,
    ssePollMs: 40,
  });

  let stream = null;
  try {
    stream = await openSseStream(`${baseUrl}/api/portfolio/stream?channels=profile`);
    await stream.waitFor(({ events }) => events.some((e) => e.event === 'ready'));

    currentProfile = {
      ...currentProfile,
      skills: [...currentProfile.skills, 'Node.js'],
    };

    await stream.waitFor(({ events }) => events.some((e) => e.event === 'update'));
    const updateEvent = stream.events.find((e) => e.event === 'update');
    assert.equal(updateEvent.data.channel, 'profile');
  } finally {
    if (stream) stream.close();
    await close();
  }
});

test('Serverless mode (Vercel) emits ready event with profile channel and closes cleanly without hanging', async () => {
  const { baseUrl, close } = await startTestServer({
    isServerless: true,
  });

  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.runtime, 'serverless');

    const streamRes = await fetch(`${baseUrl}/api/portfolio/stream?channels=profile`, {
      headers: { Origin: 'https://portfolio.example.com' },
    });
    assert.equal(streamRes.status, 200);
    assert.equal(streamRes.headers.get('access-control-allow-origin'), '*');
    assert.match(String(streamRes.headers.get('content-type') || ''), /text\/event-stream/i);

    const text = await streamRes.text();
    assert.match(text, /retry: 15000/);
    assert.match(text, /event: ready/);

    const dataLine = text
      .split('\n')
      .find((line) => line.startsWith('data:'));
    assert.ok(dataLine);
    const payload = JSON.parse(dataLine.slice(5).trim());
    assert.equal(payload.source, 'aurora-command-hub');
    assert.equal(payload.mode, 'serverless');
    assert.deepEqual(payload.channels, ['profile']);
    assert.equal(typeof payload.version, 'string');
  } finally {
    await close();
  }
});

test('api/index.js exports a Vercel-compatible Express handler serving /api/health and JSON 404s', async () => {
  const { default: vercelApiApp } = await import('../api/index.js');
  assert.equal(typeof vercelApiApp, 'function');

  const server = http.createServer(vercelApiApp);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.status, 'ok');

    const portfolioNotFound = await fetch(`${baseUrl}/api/portfolio/does-not-exist`, {
      headers: { Origin: 'https://portfolio.example.com' },
    });
    assert.equal(portfolioNotFound.status, 404);
    assert.equal(portfolioNotFound.headers.get('access-control-allow-origin'), '*');
    assert.match(String(portfolioNotFound.headers.get('content-type') || ''), /application\/json/i);

    const genericApiNotFound = await fetch(`${baseUrl}/api/unknown-endpoint`);
    assert.equal(genericApiNotFound.status, 404);
    assert.match(String(genericApiNotFound.headers.get('content-type') || ''), /application\/json/i);
    const notFoundBody = await genericApiNotFound.json();
    assert.equal(typeof notFoundBody.error, 'string');
  } finally {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
  }
});

