import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFrontmatterMarkdown,
  parseImportedBlogFile,
  parseImportedProjectFile,
} from './fileImportParser';

test('parseFrontmatterMarkdown parses YAML scalars, inline arrays, multiline arrays, and body', () => {
  const md = `---
title: "Shipping Live Portfolio Sync"
slug: shipping-live-portfolio-sync
excerpt: How I bridged my dashboard to Next.js without Firebase SDK.
category: Engineering
publishedAt: 2026-11-24
featured: true
published: true
cover: https://res.cloudinary.com/demo/image/upload/v1/sample.jpg
tags:
  - Next.js
  - REST API
  - SSE
---

## Architecture Overview

Every publish triggers an instant SSE event to connected visitors.`;

  const parsed = parseFrontmatterMarkdown(md);
  assert.equal(parsed.hasFrontmatter, true);
  assert.equal(parsed.frontmatter.title, 'Shipping Live Portfolio Sync');
  assert.equal(parsed.frontmatter.featured, true);
  assert.deepEqual(parsed.frontmatter.tags, ['Next.js', 'REST API', 'SSE']);
  assert.match(parsed.body, /^## Architecture Overview/);
});

test('parseImportedBlogFile handles Markdown with frontmatter cleanly', () => {
  const md = `---
title: Designing Glass Cards
excerpt: Practical contrast rules for translucent surfaces.
category: Design
tags: [UI, CSS, Three.js]
date: 2026-11-20
coverImage: https://images.unsplash.com/photo-1504608524841-42fe6f032b4b
author: Ata Khatri
readTime: 4 min read
featured: true
published: true
---

# Designing Glass Cards

Glass works best when foreground ink stays crisp.`;

  const res = parseImportedBlogFile(md, 'designing-glass-cards.mdx');
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 1);
  const post = res.items[0];
  assert.equal(post.title, 'Designing Glass Cards');
  assert.equal(post.slug, 'designing-glass-cards');
  assert.equal(post.category, 'Design');
  assert.equal(post.tags, 'UI, CSS, Three.js');
  assert.equal(post.publishedDate, '2026-11-20');
  assert.equal(post.author, 'Ata Khatri');
  assert.equal(post.readTime, '4 min read');
  assert.equal(post.featured, true);
  assert.equal(post.published, true);
  assert.match(post.content, /Glass works best/);
});

test('parseImportedBlogFile extracts heading, excerpt, and slug from plain Markdown without frontmatter', () => {
  const md = `# Zero Redeploy Publishing

Moving static arrays into a live REST endpoint saved hours every week.

- Instant updates
- Zero rebuilds`;

  const res = parseImportedBlogFile(md, 'zero-redeploy.md');
  assert.equal(res.ok, true);
  assert.equal(res.items[0].title, 'Zero Redeploy Publishing');
  assert.equal(res.items[0].slug, 'zero-redeploy-publishing');
  assert.match(res.items[0].excerpt, /Moving static arrays/);
});

test('parseImportedProjectFile parses TypeScript array export with URLs, comments, and as const', () => {
  const tsCode = `// Portfolio projects list
export interface Project {
  title: string;
  description: string;
}

export const projects: Project[] = [
  {
    title: 'Aurora Weather Studio',
    description: 'Real-time 3D atmosphere dashboard with live telemetry.',
    image: 'https://res.cloudinary.com/demo/image/upload/aurora.webp', // inline comment after URL
    tags: ['React', 'Three.js', 'TypeScript'],
    liveUrl: 'https://aurora.example.com',
    githubUrl: 'https://github.com/ata/aurora-studio',
    type: 'Website',
    status: 'Complete',
    featured: true,
  },
  {
    title: 'Pulse Mobile',
    description: 'Cross-platform habit tracker.',
    image: 'https://res.cloudinary.com/demo/image/upload/pulse.webp',
    tags: ['React Native', 'Expo'],
    liveUrl: 'https://pulse.example.com',
    githubUrl: 'https://github.com/ata/pulse',
    type: 'mobile',
    status: 'demo',
  },
] as const;
`;

  const res = parseImportedProjectFile(tsCode, 'projects.ts');
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 2);

  assert.equal(res.items[0].title, 'Aurora Weather Studio');
  assert.equal(res.items[0].slug, 'aurora-weather-studio');
  assert.equal(res.items[0].image, 'https://res.cloudinary.com/demo/image/upload/aurora.webp');
  assert.equal(res.items[0].tags, 'React, Three.js, TypeScript');
  assert.equal(res.items[0].liveUrl, 'https://aurora.example.com');
  assert.equal(res.items[0].githubUrl, 'https://github.com/ata/aurora-studio');
  assert.equal(res.items[0].type, 'Website');
  assert.equal(res.items[0].status, 'Complete');
  assert.equal(res.items[0].featured, true);

  assert.equal(res.items[1].title, 'Pulse Mobile');
  assert.equal(res.items[1].type, 'Mobile App');
  assert.equal(res.items[1].status, 'Demo');
});

test('parseImportedBlogFile parses JS export default with template literal markdown body', () => {
  const jsCode = `export default {
  title: 'Building Real-Time SSE Streams',
  slug: 'realtime-sse-streams',
  category: 'Backend',
  tags: ['Node.js', 'Express', 'SSE'],
  cover: 'https://cdn.example.com/sse-cover.png',
  publishedAt: '2026-11-27',
  content: \`## Why SSE Beats Polling

Server-Sent Events keep a single lightweight HTTP connection open.
\`,
};`;

  const res = parseImportedBlogFile(jsCode, 'sse-post.js');
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].title, 'Building Real-Time SSE Streams');
  assert.equal(res.items[0].coverImage, 'https://cdn.example.com/sse-cover.png');
  assert.equal(res.items[0].publishedDate, '2026-11-27');
  assert.match(res.items[0].content, /Why SSE Beats Polling/);
});

test('parseImportedProjectFile parses Markdown README and strips unsafe javascript: URLs', () => {
  const readme = `# Orbit Notes

A fast local-first markdown notebook with graph navigation.

![Preview](https://cdn.example.com/orbit-preview.png)

Check out [Live Demo](https://orbit.example.com) and source on https://github.com/ata/orbit-notes.`;

  const res = parseImportedProjectFile(readme, 'README.md');
  assert.equal(res.ok, true);
  assert.equal(res.items[0].title, 'Orbit Notes');
  assert.equal(res.items[0].image, 'https://cdn.example.com/orbit-preview.png');
  assert.equal(res.items[0].liveUrl, 'https://orbit.example.com');
  assert.equal(res.items[0].githubUrl, 'https://github.com/ata/orbit-notes');

  const unsafeJson = JSON.stringify({
    title: 'XSS Check',
    description: 'Testing unsafe protocol rejection',
    image: 'javascript:alert(1)',
    liveUrl: 'data:text/html,boom',
    githubUrl: 'https://github.com/ata/safe',
  });
  const unsafeRes = parseImportedProjectFile(unsafeJson, 'unsafe.json');
  assert.equal(unsafeRes.ok, true);
  assert.equal(unsafeRes.items[0].image, '');
  assert.equal(unsafeRes.items[0].liveUrl, '');
  assert.equal(unsafeRes.items[0].githubUrl, 'https://github.com/ata/safe');
});

test('importers reject empty or unparseable files with clear error messages', () => {
  const emptyProj = parseImportedProjectFile('   ', 'empty.ts');
  assert.equal(emptyProj.ok, false);
  assert.match(emptyProj.error, /empty/i);

  const badJs = parseImportedBlogFile('console.log("hello world");', 'noop.js');
  assert.equal(badJs.ok, false);
  assert.match(badJs.error, /Could not find/i);
});
