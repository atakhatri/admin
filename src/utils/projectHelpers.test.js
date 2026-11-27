import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugifyTitle,
  isSafeHttpUrl,
  parseTagList,
  validateProjectForm,
  mergeProjectRecords,
  filterProjects,
  generatePortfolioFetchSnippet,
} from './projectHelpers.js';

test('slugifyTitle generates clean URL-safe slugs', () => {
  assert.equal(slugifyTitle('My Awesome Portfolio 2.0!'), 'my-awesome-portfolio-2-0');
  assert.equal(slugifyTitle('   ---Hello   World---   '), 'hello-world');
});

test('isSafeHttpUrl allows empty or http/https URLs and blocks unsafe schemes', () => {
  assert.equal(isSafeHttpUrl(''), true);
  assert.equal(isSafeHttpUrl('https://console.firebase.google.com/project/demo'), true);
  assert.equal(isSafeHttpUrl('http://localhost:3000'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeHttpUrl('ftp://files.example.com'), false);
});

test('parseTagList deduplicates, trims, and bounds tags cleanly', () => {
  const tags = parseTagList('React, react, Node.js, , Firebase, TypeScript', 3);
  assert.deepEqual(tags, ['React', 'Node.js', 'Firebase']);
});

test('validateProjectForm enforces custom portfolio schema and splits public vs admin payloads', () => {
  const invalid = validateProjectForm({
    title: 'A',
    liveUrl: 'javascript:void(0)',
    githubUrl: 'ftp://invalid.com',
    image: 'data:image/png;base64,abc',
    authDashboardUrl: 'not-a-url',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.liveUrl);
  assert.ok(invalid.errors.githubUrl);
  assert.ok(invalid.errors.image);
  assert.ok(invalid.errors.authDashboardUrl);

  const valid = validateProjectForm({
    title: 'Portfolio Site',
    description: 'Fetches projects over JSON REST API.',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97',
    tags: 'React, Tailwind, Firebase',
    liveUrl: 'https://myportfolio.dev',
    githubUrl: 'https://github.com/user/portfolio',
    type: 'Website',
    status: 'Complete',
    published: true,
    featured: true,
    displayOrder: 1,
    authDashboardUrl: 'https://console.firebase.google.com/u/0/project/demo/authentication',
    dbDashboardUrl: 'https://console.firebase.google.com/u/0/project/demo/firestore',
    providerTags: 'Firebase, Vercel',
  });

  assert.equal(valid.valid, true);
  assert.equal(valid.publicData.slug, 'portfolio-site');
  assert.equal(valid.publicData.type, 'Website');
  assert.equal(valid.publicData.status, 'Complete');
  assert.equal(valid.publicData.published, true);
  assert.deepEqual(valid.publicData.tags, ['React', 'Tailwind', 'Firebase']);
  assert.equal(valid.publicData.githubUrl, 'https://github.com/user/portfolio');
  assert.equal(valid.publicData.authDashboardUrl, undefined);
  assert.equal(
    valid.adminData.authDashboardUrl,
    'https://console.firebase.google.com/u/0/project/demo/authentication'
  );
});

test('mergeProjectRecords handles modern + legacy docs and filterProjects filters by type, status, published, and query', () => {
  const merged = mergeProjectRecords(
    [
      {
        id: 'b',
        title: 'Beta Mobile',
        slug: 'beta-mobile',
        type: 'Mobile App',
        status: 'Demo',
        published: false,
        displayOrder: 2,
        tags: ['Flutter'],
      },
      {
        id: 'a',
        title: 'Alpha Web',
        slug: 'alpha-web',
        tagline: 'Legacy tagline',
        category: 'Web App',
        status: 'published',
        displayOrder: 1,
        techStack: ['React'],
        repoUrl: 'https://github.com/example/alpha',
      },
    ],
    [{ id: 'a', dbDashboardUrl: 'https://console.firebase.google.com/', providerTags: ['Firebase'] }]
  );

  assert.equal(merged[0].id, 'a');
  assert.equal(merged[0].published, true);
  assert.equal(merged[0].type, 'Website');
  assert.equal(merged[0].status, 'Complete');
  assert.equal(merged[0].githubUrl, 'https://github.com/example/alpha');
  assert.deepEqual(merged[0].tags, ['React']);
  assert.equal(merged[0].dbDashboardUrl, 'https://console.firebase.google.com/');

  assert.equal(merged[1].id, 'b');
  assert.equal(merged[1].published, false);
  assert.equal(merged[1].type, 'Mobile App');
  assert.equal(merged[1].status, 'Demo');

  assert.equal(filterProjects(merged, { filter: 'published' }).length, 1);
  assert.equal(filterProjects(merged, { filter: 'Mobile App' }).length, 1);
  assert.equal(filterProjects(merged, { filter: 'Demo' }).length, 1);
  assert.equal(filterProjects(merged, { filter: 'all', query: 'firebase' }).length, 1);
});

test('generatePortfolioFetchSnippet builds clean Projects, Gallery, Blogs, and Next.js SSE bridge snippets', () => {
  const snippets = generatePortfolioFetchSnippet('https://admin.example.com/');
  assert.equal(snippets.endpoint, 'https://admin.example.com/api/portfolio/projects');
  assert.equal(snippets.galleryEndpoint, 'https://admin.example.com/api/portfolio/gallery');
  assert.equal(snippets.blogsEndpoint, 'https://admin.example.com/api/portfolio/blogs');
  assert.equal(snippets.allEndpoint, 'https://admin.example.com/api/portfolio/all');
  assert.equal(snippets.streamEndpoint, 'https://admin.example.com/api/portfolio/stream');
  assert.ok(snippets.vanillaJs.includes('https://admin.example.com/api/portfolio/projects'));
  assert.ok(snippets.reactHook.includes('usePortfolioData'));
  assert.ok(snippets.nextBlogsLib.includes('export type BlogPostMeta'));
  assert.ok(snippets.nextBlogsLib.includes('getAllBlogsData'));
  assert.ok(snippets.nextPortfolioBridge.includes('EventSource'));
  assert.ok(snippets.nextPortfolioBridge.includes('useLiveBlogs'));
  assert.ok(snippets.nextBlogsPageExample.includes('LiveBlogsBridge'));
});
