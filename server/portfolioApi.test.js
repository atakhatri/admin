import test from 'node:test';
import assert from 'node:assert/strict';
import portfolioApi from './portfolioApi.js';

const {
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
