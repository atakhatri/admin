export const OWNER_EMAIL = 'atakhatri905@gmail.com';

export const LIMITS = {
  SLUG_MIN: 2,
  SLUG_MAX: 80,
  TITLE_MIN: 2,
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 2000,
  IMAGE_URL_MAX: 1000,
  URL_MAX: 500,
  NOTES_MAX: 2000,
  TAGS_MAX: 12,
  PROVIDERS_MAX: 10,
  TAG_ITEM_MAX: 40,
};

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DOC_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
export const HTTP_URL_REGEX = /^https?:\/\/[^\s]+$/;

export const PROJECT_TYPES = ['Website', 'Mobile App'];
export const PROJECT_STATUSES = ['Complete', 'Demo'];

export function slugifyTitle(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.SLUG_MAX);
}

export function isSafeHttpUrl(url, maxLen = LIMITS.URL_MAX) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return true;
  if (trimmed.length > maxLen) return false;
  if (!HTTP_URL_REGEX.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseTagList(input, maxItems = LIMITS.TAGS_MAX) {
  const raw = Array.isArray(input)
    ? input
    : String(input || '')
        .split(',')
        .map((item) => item.trim());

  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const cleaned = String(item || '').trim().slice(0, LIMITS.TAG_ITEM_MAX);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function normalizeProjectType(rawType, legacyCategory = '') {
  if (PROJECT_TYPES.includes(rawType)) return rawType;
  const lower = String(rawType || legacyCategory || '').toLowerCase();
  if (lower.includes('mobile') || lower.includes('ios') || lower.includes('android')) {
    return 'Mobile App';
  }
  return 'Website';
}

export function normalizeProjectStatus(rawStatus) {
  if (PROJECT_STATUSES.includes(rawStatus)) return rawStatus;
  const lower = String(rawStatus || '').toLowerCase();
  if (lower === 'demo' || lower === 'draft') return 'Demo';
  return 'Complete';
}

export function validateProjectForm(form) {
  const errors = {};
  const title = String(form.title || '').trim();
  const slug = slugifyTitle(form.slug || title);
  const description = String(form.description || '').trim();
  const image = String(form.image || '').trim();
  const tags = parseTagList(form.tags, LIMITS.TAGS_MAX);
  const liveUrl = String(form.liveUrl || '').trim();
  const githubUrl = String(form.githubUrl || '').trim();
  const type = PROJECT_TYPES.includes(form.type) ? form.type : 'Website';
  const status = PROJECT_STATUSES.includes(form.status) ? form.status : 'Complete';
  const published = form.published !== undefined ? Boolean(form.published) : true;
  const featured = Boolean(form.featured);
  const displayOrderNum = Number.isFinite(Number(form.displayOrder))
    ? Math.max(0, Math.min(10000, Math.round(Number(form.displayOrder))))
    : 0;

  const providerTags = parseTagList(form.providerTags, LIMITS.PROVIDERS_MAX);
  const authDashboardUrl = String(form.authDashboardUrl || '').trim();
  const dbDashboardUrl = String(form.dbDashboardUrl || '').trim();
  const hostingDashboardUrl = String(form.hostingDashboardUrl || '').trim();
  const monitoringUrl = String(form.monitoringUrl || '').trim();
  const environmentNotes = String(form.environmentNotes || '').trim();

  if (title.length < LIMITS.TITLE_MIN || title.length > LIMITS.TITLE_MAX) {
    errors.title = `Title must be ${LIMITS.TITLE_MIN}–${LIMITS.TITLE_MAX} characters.`;
  }
  if (slug.length < LIMITS.SLUG_MIN || !SLUG_REGEX.test(slug)) {
    errors.slug = 'Slug must use lowercase letters, numbers, and hyphens.';
  }
  if (description.length > LIMITS.DESCRIPTION_MAX) {
    errors.description = `Description cannot exceed ${LIMITS.DESCRIPTION_MAX} characters.`;
  }
  if (!isSafeHttpUrl(image, LIMITS.IMAGE_URL_MAX)) {
    errors.image = `Image URL must start with http:// or https:// (max ${LIMITS.IMAGE_URL_MAX} chars).`;
  }
  if (environmentNotes.length > LIMITS.NOTES_MAX) {
    errors.environmentNotes = `Notes cannot exceed ${LIMITS.NOTES_MAX} characters.`;
  }

  const urlFields = [
    ['liveUrl', liveUrl, 'Live URL'],
    ['githubUrl', githubUrl, 'GitHub URL'],
    ['authDashboardUrl', authDashboardUrl, 'Auth Dashboard URL'],
    ['dbDashboardUrl', dbDashboardUrl, 'Database Console URL'],
    ['hostingDashboardUrl', hostingDashboardUrl, 'Hosting Dashboard URL'],
    ['monitoringUrl', monitoringUrl, 'Monitoring URL'],
  ];

  for (const [key, val, label] of urlFields) {
    if (!isSafeHttpUrl(val, LIMITS.URL_MAX)) {
      errors[key] = `${label} must start with http:// or https:// (max ${LIMITS.URL_MAX} chars).`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    publicData: {
      slug,
      title,
      description,
      image,
      tags,
      liveUrl,
      githubUrl,
      type,
      status,
      published,
      featured,
      displayOrder: displayOrderNum,
    },
    adminData: {
      authDashboardUrl,
      dbDashboardUrl,
      hostingDashboardUrl,
      monitoringUrl,
      environmentNotes,
      providerTags,
    },
  };
}

export function mergeProjectRecords(publicDocs = [], adminDocs = []) {
  const adminById = new Map();
  for (const doc of adminDocs) {
    adminById.set(doc.id, doc);
  }

  return publicDocs
    .map((pub) => {
      const priv = adminById.get(pub.id) || {};
      const legacyDescription = [pub.tagline, pub.description].filter(Boolean).join(' — ');
      const description =
        typeof pub.description === 'string' && pub.description.trim()
          ? pub.description
          : legacyDescription;
      const tags = Array.isArray(pub.tags)
        ? pub.tags
        : Array.isArray(pub.techStack)
        ? pub.techStack
        : [];
      const published =
        typeof pub.published === 'boolean' ? pub.published : pub.status === 'published';

      return {
        id: pub.id,
        slug: pub.slug || pub.id,
        title: pub.title || '',
        description,
        image: pub.image || pub.coverImageUrl || '',
        tags,
        liveUrl: pub.liveUrl || '',
        githubUrl: pub.githubUrl || pub.repoUrl || '',
        type: normalizeProjectType(pub.type, pub.category),
        status: normalizeProjectStatus(pub.status),
        published,
        featured: Boolean(pub.featured),
        displayOrder: Number.isFinite(pub.displayOrder) ? pub.displayOrder : 0,
        createdAt: pub.createdAt || null,
        updatedAt: pub.updatedAt || null,
        authDashboardUrl: priv.authDashboardUrl || '',
        dbDashboardUrl: priv.dbDashboardUrl || '',
        hostingDashboardUrl: priv.hostingDashboardUrl || '',
        monitoringUrl: priv.monitoringUrl || '',
        environmentNotes: priv.environmentNotes || '',
        providerTags: Array.isArray(priv.providerTags) ? priv.providerTags : [],
      };
    })
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return String(a.title).localeCompare(String(b.title));
    });
}

export function filterProjects(projects, { filter = 'all', query = '' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return projects.filter((proj) => {
    if (filter === 'published' && !proj.published) return false;
    if (filter === 'draft' && proj.published) return false;
    if (filter === 'Complete' && proj.status !== 'Complete') return false;
    if (filter === 'Demo' && proj.status !== 'Demo') return false;
    if (filter === 'Website' && proj.type !== 'Website') return false;
    if (filter === 'Mobile App' && proj.type !== 'Mobile App') return false;

    if (!q) return true;
    const haystack = [
      proj.title,
      proj.slug,
      proj.description,
      proj.type,
      proj.status,
      ...(proj.tags || []),
      ...(proj.providerTags || []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export const SHARED_PRODUCTION_API_URL =
  'https://ais-pre-m642u4bhyebgb6qcll7dje-502695879544.asia-southeast1.run.app';

export function generatePortfolioFetchSnippet(baseUrl) {
  const cleanBase = String(baseUrl || SHARED_PRODUCTION_API_URL).replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/portfolio/projects`;
  const galleryEndpoint = `${cleanBase}/api/portfolio/gallery`;
  const blogsEndpoint = `${cleanBase}/api/portfolio/blogs`;
  const allEndpoint = `${cleanBase}/api/portfolio/all`;
  const streamEndpoint = `${cleanBase}/api/portfolio/stream`;

  const nextBlogsLib = `// src/lib/blogs.ts — Drop-in REST replacement for @/lib/blogs (Zero Firebase SDK)
export type BlogPostMeta = {
  slug: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  featured?: boolean;
  cover: string;
  publishedAt: string;
  publishedDate?: string;
  readTime: string;
  author?: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
  updatedAt?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_PORTFOLIO_API_URL || '${cleanBase}';

export async function getAllBlogsData(): Promise<{
  posts: BlogPostMeta[];
  categories: string[];
}> {
  const res = await fetch(\`\${API_BASE}/api/portfolio/blogs\`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(\`Failed to fetch blogs (\${res.status})\`);
  }
  const data = await res.json();
  return {
    posts: Array.isArray(data.posts) ? data.posts : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  const res = await fetch(
    \`\${API_BASE}/api/portfolio/blogs/\${encodeURIComponent(slug)}\`,
    { cache: 'no-store' }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(\`Failed to fetch blog (\${res.status})\`);
  const data = await res.json();
  return data.post ?? null;
}`;

  const nextPortfolioBridge = `// src/lib/portfolioApi.ts — REST API + Real-Time SSE Live Sync (Zero Firebase SDK)
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BlogPostMeta } from './blogs';

export type PortfolioProject = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  liveUrl: string;
  githubUrl: string;
  type: 'Website' | 'Mobile App';
  status: 'Complete' | 'Demo';
  featured?: boolean;
};

export type GalleryPhoto = {
  id: string;
  section: 'grid' | 'gallery';
  slot: number;
  title: string;
  image: string;
  alt: string;
  category: string;
};

export const PORTFOLIO_API_BASE =
  process.env.NEXT_PUBLIC_PORTFOLIO_API_URL || '${cleanBase}';

export function useLivePortfolioChannel<T>(options: {
  channel: 'projects' | 'gallery' | 'blogs' | 'all';
  endpoint: string;
  initialData: T;
  cacheKey?: string;
}) {
  const { channel, endpoint, initialData, cacheKey } = options;
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(\`\${PORTFOLIO_API_BASE}\${endpoint}\`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = (await res.json()) as T;
      setData(json);
      if (cacheKey && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify(json));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, cacheKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Real-time Server-Sent Events (instant refresh on dashboard save/publish)
    const es = new EventSource(
      \`\${PORTFOLIO_API_BASE}/api/portfolio/stream?channels=\${channel}\`
    );
    const onUpdate = () => {
      refetch();
    };
    es.addEventListener('update', onUpdate);

    // 2. Also revalidate when returning to the browser tab
    const onFocus = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      es.removeEventListener('update', onUpdate);
      es.close();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [channel, refetch]);

  return { data, loading, refetch };
}

export function useLiveBlogs(initial: { posts: BlogPostMeta[]; categories: string[] }) {
  return useLivePortfolioChannel({
    channel: 'blogs',
    endpoint: '/api/portfolio/blogs',
    initialData: initial,
    cacheKey: 'portfolio_live_blogs_v1',
  });
}

export function useLiveProjects(initial: { projects: PortfolioProject[] }) {
  return useLivePortfolioChannel({
    channel: 'projects',
    endpoint: '/api/portfolio/projects',
    initialData: initial,
    cacheKey: 'portfolio_live_projects_v1',
  });
}

export function useLiveGallery(initial: {
  gridPhotos: GalleryPhoto[];
  galleryImages: GalleryPhoto[];
}) {
  return useLivePortfolioChannel({
    channel: 'gallery',
    endpoint: '/api/portfolio/gallery',
    initialData: initial,
    cacheKey: 'portfolio_live_gallery_v1',
  });
}`;

  const nextBlogsPageExample = `// 1) src/app/blogs/LiveBlogsBridge.tsx — Real-time wrapper around your existing BlogsClient.tsx
'use client';

import BlogsClient from './BlogsClient';
import { useLiveBlogs } from '@/lib/portfolioApi';
import type { BlogPostMeta } from '@/lib/blogs';

export default function LiveBlogsBridge({
  initialPosts,
  initialCategories,
}: {
  initialPosts: BlogPostMeta[];
  initialCategories: string[];
}) {
  const { data } = useLiveBlogs({
    posts: initialPosts,
    categories: initialCategories,
  });

  return <BlogsClient posts={data.posts} categories={data.categories} />;
}

// 2) src/app/blogs/page.tsx — Server Component (always fresh + instant SSR)
import { getAllBlogsData } from '@/lib/blogs';
import LiveBlogsBridge from './LiveBlogsBridge';

export const dynamic = 'force-dynamic';

export default async function BlogsPage() {
  const { posts, categories } = await getAllBlogsData();
  return (
    <LiveBlogsBridge
      initialPosts={posts}
      initialCategories={categories}
    />
  );
}`;

  const nextConfigSnippet = `// next.config.ts — Allow remote cover, project, and gallery HTTPS images in <Image />
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**' }, // Or list your exact image CDNs
    ],
  },
};

export default nextConfig;

// .env.local (in your Next.js portfolio repo)
// NEXT_PUBLIC_PORTFOLIO_API_URL=${cleanBase}`;

  return {
    profileEndpoint: `${cleanBase}/api/portfolio/profile`,
    endpoint,
    singleEndpoint: `${cleanBase}/api/portfolio/projects/<slug>`,
    galleryEndpoint,
    blogsEndpoint,
    singleBlogEndpoint: `${cleanBase}/api/portfolio/blogs/<slug>`,
    allEndpoint,
    streamEndpoint,
    nextBlogsLib,
    nextPortfolioBridge,
    nextBlogsPageExample,
    nextConfigSnippet,
    vanillaJs: `// Fetch published portfolio projects dynamically
const res = await fetch('${endpoint}');
if (!res.ok) throw new Error('Failed to load portfolio projects');
const { projects } = await res.json();
// Each project: { title, description, image, tags, liveUrl, githubUrl, type, status }
console.log(projects);`,
    reactHook: `import { useEffect, useState } from 'react';

export function usePortfolioData() {
  const [projects, setProjects] = useState([]);
  const [gallery, setGallery] = useState({ gridPhotos: [], galleryImages: [] });
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch('${allEndpoint}', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          setProjects(data.projects || []);
          setGallery({
            gridPhotos: data.gridPhotos || [],
            galleryImages: data.galleryImages || [],
          });
          setBlogs(data.posts || []);
          setCategories(data.categories || []);
        })
        .finally(() => setLoading(false));

    load();
    const es = new EventSource('${streamEndpoint}');
    es.addEventListener('update', load);
    return () => es.close();
  }, []);

  return { projects, gallery, blogs, categories, loading };
}`,
    galleryJs: `// Fetch 5 featured grid slots + unlimited gallery images
const res = await fetch('${galleryEndpoint}');
const { gridPhotos, galleryImages } = await res.json();
console.log(gridPhotos, galleryImages);`,
    blogsJs: `// Fetch published portfolio blogs + categories (matches BlogsClient.tsx)
const res = await fetch('${blogsEndpoint}');
const { posts, categories } = await res.json();
console.log(posts, categories);`,
  };
}

export const SAMPLE_STARTER_PROJECTS = [
  {
    id: 'personal-portfolio',
    slug: 'personal-portfolio',
    title: 'Developer Portfolio',
    description:
      'Dynamic personal portfolio website powered live by Aurora Command Hub JSON API for projects and photography.',
    image:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&h=520&fit=crop&q=80&auto=format',
    tags: ['React', 'Tailwind CSS', 'REST API'],
    liveUrl: 'https://example.com',
    githubUrl: 'https://github.com/example/portfolio',
    type: 'Website',
    status: 'Complete',
    published: true,
    featured: true,
    displayOrder: 1,
    authDashboardUrl: 'https://console.firebase.google.com/',
    dbDashboardUrl: 'https://console.firebase.google.com/',
    hostingDashboardUrl: 'https://vercel.com/dashboard',
    monitoringUrl: '',
    environmentNotes: 'Consumes GET /api/portfolio/projects and GET /api/portfolio/gallery.',
    providerTags: ['Firebase', 'Vercel'],
  },
  {
    id: 'pulse-mobile-tracker',
    slug: 'pulse-mobile-tracker',
    title: 'Pulse Habit Companion',
    description:
      'Cross-platform mobile app for tracking daily focus streaks, cloud-synced routines, and ambient reminders.',
    image:
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=900&h=520&fit=crop&q=80&auto=format',
    tags: ['React Native', 'Firebase', 'TypeScript'],
    liveUrl: 'https://pulse.example.com',
    githubUrl: 'https://github.com/example/pulse-mobile',
    type: 'Mobile App',
    status: 'Complete',
    published: true,
    featured: true,
    displayOrder: 2,
    authDashboardUrl: 'https://console.firebase.google.com/',
    dbDashboardUrl: 'https://console.firebase.google.com/',
    hostingDashboardUrl: 'https://expo.dev/',
    monitoringUrl: '',
    environmentNotes: 'Production EAS build connected to Firestore.',
    providerTags: ['Firebase', 'Expo'],
  },
  {
    id: 'aurora-notes-demo',
    slug: 'aurora-notes-demo',
    title: 'Aurora Notes Preview',
    description:
      'Interactive markdown knowledge base prototype with keyboard shortcuts and backlink graph exploration.',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&h=520&fit=crop&q=80&auto=format',
    tags: ['Next.js', 'Firestore', 'PWA'],
    liveUrl: 'https://notes-demo.example.com',
    githubUrl: 'https://github.com/example/aurora-notes',
    type: 'Website',
    status: 'Demo',
    published: false,
    featured: false,
    displayOrder: 3,
    authDashboardUrl: 'https://console.firebase.google.com/',
    dbDashboardUrl: 'https://console.firebase.google.com/',
    hostingDashboardUrl: '',
    monitoringUrl: '',
    environmentNotes: 'Demo build — publish to API whenever ready.',
    providerTags: ['Firebase'],
  },
];
