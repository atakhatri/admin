import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateReadTime,
  filterBlogs,
  formatBlogDate,
  normalizeBlogRecords,
  parseMarkdownPreviewBlocks,
  slugifyBlogTitle,
  validateBlogForm,
} from './blogHelpers';

test('slugifyBlogTitle generates clean URL-safe blog slugs', () => {
  assert.equal(slugifyBlogTitle('Building a Live Portfolio CMS!'), 'building-a-live-portfolio-cms');
  assert.equal(slugifyBlogTitle('  React 19 & Three.js Notes  '), 'react-19-three-js-notes');
});

test('estimateReadTime computes minute estimates cleanly', () => {
  assert.equal(estimateReadTime('Short draft note.'), '1 min read');
  const longBody = Array.from({ length: 450 }, () => 'word').join(' ');
  assert.equal(estimateReadTime(longBody), '3 min read');
});

test('formatBlogDate formats ISO dates and handles blanks gracefully', () => {
  assert.equal(formatBlogDate('2026-11-26'), 'Nov 26, 2026');
  assert.equal(formatBlogDate(''), 'Unscheduled');
});

test('validateBlogForm accepts valid payload and sanitizes fields', () => {
  const res = validateBlogForm({
    title: 'Shipping Realtime Blogs',
    slug: '',
    excerpt: 'How to wire live portfolio articles.',
    content: '## Heading\n\nSome content words here.',
    coverImage: 'https://example.com/blog-cover.jpg',
    author: 'Ata Khatri',
    category: 'Engineering',
    tags: 'React, Firebase, react, Next.js',
    publishedDate: '2026-11-26',
    readTime: '',
    published: true,
    featured: true,
    displayOrder: '2',
  });

  assert.equal(res.valid, true);
  assert.equal(res.data.slug, 'shipping-realtime-blogs');
  assert.deepEqual(res.data.tags, ['React', 'Firebase', 'Next.js']);
  assert.equal(res.data.readTime, '1 min read');
  assert.equal(res.data.displayOrder, 2);
});

test('validateBlogForm rejects unsafe URLs, short titles, and invalid dates', () => {
  const res = validateBlogForm({
    title: 'A',
    coverImage: 'javascript:alert(1)',
    publishedDate: '26-11-2026',
    content: 'Hello',
  });

  assert.equal(res.valid, false);
  assert.ok(res.errors.title);
  assert.ok(res.errors.coverImage);
  assert.ok(res.errors.publishedDate);
});

test('normalizeBlogRecords sorts by displayOrder then date and filterBlogs filters correctly', () => {
  const normalized = normalizeBlogRecords([
    {
      id: 'b2',
      title: 'Second Post',
      slug: 'second-post',
      published: false,
      featured: false,
      displayOrder: 2,
      tags: ['Design'],
    },
    {
      id: 'b1',
      title: 'First Engineering Post',
      slug: 'first-post',
      published: true,
      featured: true,
      displayOrder: 1,
      tags: ['React'],
    },
  ]);

  assert.deepEqual(
    normalized.map((b) => b.id),
    ['b1', 'b2']
  );
  assert.equal(filterBlogs(normalized, { filter: 'published' }).length, 1);
  assert.equal(filterBlogs(normalized, { filter: 'draft' }).length, 1);
  assert.equal(filterBlogs(normalized, { filter: 'featured' }).length, 1);
  assert.equal(filterBlogs(normalized, { query: 'design' }).length, 1);
});

test('parseMarkdownPreviewBlocks safely parses headings, lists, quotes, and code blocks', () => {
  const blocks = parseMarkdownPreviewBlocks(
    '# Title\n\nIntro paragraph.\n\n- Item A\n- Item B\n\n> Quoted line\n\n```js\nconst x = 1;\n```'
  );
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['h1', 'p', 'ul', 'quote', 'code']
  );
  assert.deepEqual(blocks[2].items, ['Item A', 'Item B']);
});
