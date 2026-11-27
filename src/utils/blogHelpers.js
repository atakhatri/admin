import { isSafeHttpUrl, parseTagList } from './projectHelpers';

export const BLOG_LIMITS = {
  SLUG_MIN: 2,
  SLUG_MAX: 100,
  TITLE_MIN: 2,
  TITLE_MAX: 140,
  EXCERPT_MAX: 400,
  CONTENT_MAX: 50000,
  IMAGE_URL_MAX: 1000,
  AUTHOR_MIN: 1,
  AUTHOR_MAX: 80,
  CATEGORY_MAX: 50,
  TAGS_MAX: 12,
  TAG_ITEM_MAX: 40,
  DATE_MAX: 30,
  READ_TIME_MAX: 40,
};

export const BLOG_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BLOG_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function slugifyBlogTitle(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BLOG_LIMITS.SLUG_MAX);
}

export function getTodayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function estimateReadTime(content) {
  const words = String(content || '')
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/[#>*_`[\]()-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function formatBlogDate(isoDate) {
  if (!isoDate || !BLOG_DATE_REGEX.test(String(isoDate))) return 'Unscheduled';
  const [y, m, d] = String(isoDate).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return String(isoDate);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function validateBlogForm(form) {
  const errors = {};
  const title = String(form.title || '').trim();
  const slug = slugifyBlogTitle(form.slug || title);
  const excerpt = String(form.excerpt || '').trim();
  const content = String(form.content || '').trim();
  const coverImage = String(form.coverImage || '').trim();
  const author = String(form.author || '').trim() || 'Owner';
  const category = String(form.category || '').trim();
  const tags = parseTagList(form.tags, BLOG_LIMITS.TAGS_MAX);
  const publishedDate = String(form.publishedDate || '').trim();
  const rawReadTime = String(form.readTime || '').trim();
  const readTime = (rawReadTime || estimateReadTime(content)).slice(
    0,
    BLOG_LIMITS.READ_TIME_MAX
  );
  const published = form.published !== undefined ? Boolean(form.published) : false;
  const featured = Boolean(form.featured);
  const displayOrder = Number.isFinite(Number(form.displayOrder))
    ? Math.max(0, Math.min(10000, Math.round(Number(form.displayOrder))))
    : 0;

  if (title.length < BLOG_LIMITS.TITLE_MIN || title.length > BLOG_LIMITS.TITLE_MAX) {
    errors.title = `Title must be ${BLOG_LIMITS.TITLE_MIN}–${BLOG_LIMITS.TITLE_MAX} characters.`;
  }
  if (slug.length < BLOG_LIMITS.SLUG_MIN || !BLOG_SLUG_REGEX.test(slug)) {
    errors.slug = 'Slug must use lowercase letters, numbers, and hyphens.';
  }
  if (excerpt.length > BLOG_LIMITS.EXCERPT_MAX) {
    errors.excerpt = `Excerpt cannot exceed ${BLOG_LIMITS.EXCERPT_MAX} characters.`;
  }
  if (content.length > BLOG_LIMITS.CONTENT_MAX) {
    errors.content = `Content cannot exceed ${BLOG_LIMITS.CONTENT_MAX.toLocaleString()} characters.`;
  }
  if (!isSafeHttpUrl(coverImage, BLOG_LIMITS.IMAGE_URL_MAX)) {
    errors.coverImage = `Cover image must be a valid http:// or https:// URL (max ${BLOG_LIMITS.IMAGE_URL_MAX} chars).`;
  }
  if (author.length < BLOG_LIMITS.AUTHOR_MIN || author.length > BLOG_LIMITS.AUTHOR_MAX) {
    errors.author = `Author must be ${BLOG_LIMITS.AUTHOR_MIN}–${BLOG_LIMITS.AUTHOR_MAX} characters.`;
  }
  if (category.length > BLOG_LIMITS.CATEGORY_MAX) {
    errors.category = `Category cannot exceed ${BLOG_LIMITS.CATEGORY_MAX} characters.`;
  }
  if (publishedDate && !BLOG_DATE_REGEX.test(publishedDate)) {
    errors.publishedDate = 'Date must follow YYYY-MM-DD format.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      slug,
      title,
      excerpt,
      content,
      coverImage,
      author,
      category,
      tags,
      publishedDate,
      readTime,
      published,
      featured,
      displayOrder,
    },
  };
}

export function normalizeBlogRecords(docs = []) {
  return docs
    .filter((doc) => doc && doc.id)
    .map((doc) => ({
      id: doc.id,
      slug: doc.slug || doc.id,
      title: doc.title || '',
      excerpt: doc.excerpt || '',
      content: doc.content || '',
      coverImage: doc.coverImage || '',
      author: doc.author || 'Owner',
      category: doc.category || '',
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      publishedDate: doc.publishedDate || '',
      readTime: doc.readTime || estimateReadTime(doc.content || ''),
      published: Boolean(doc.published),
      featured: Boolean(doc.featured),
      displayOrder: Number.isFinite(doc.displayOrder) ? doc.displayOrder : 0,
      createdAt: doc.createdAt || null,
      updatedAt: doc.updatedAt || null,
    }))
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return String(b.publishedDate || '').localeCompare(String(a.publishedDate || ''));
    });
}

export function filterBlogs(blogs = [], { filter = 'all', query = '' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return blogs.filter((post) => {
    if (filter === 'published' && !post.published) return false;
    if (filter === 'draft' && post.published) return false;
    if (filter === 'featured' && !post.featured) return false;

    if (!q) return true;
    const haystack = [
      post.title,
      post.slug,
      post.excerpt,
      post.category,
      post.author,
      ...(post.tags || []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

// Safe Markdown block parser for live editor preview (no raw HTML injection)
export function parseMarkdownPreviewBlocks(markdown = '') {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let inCode = false;
  let codeLines = [];
  let listItems = [];
  let paraLines = [];

  const flushParagraph = () => {
    if (paraLines.length > 0) {
      blocks.push({ type: 'p', text: paraLines.join(' ').trim() });
      paraLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'ul', items: [...listItems] });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCode) {
        blocks.push({ type: 'code', text: codeLines.join('\n') });
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
    } else if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
    } else if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
    } else if (trimmed.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'quote', text: trimmed.slice(2).trim() });
    } else if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^[-*]\s+/, '').trim());
    } else {
      flushList();
      paraLines.push(trimmed);
    }
  }

  if (inCode && codeLines.length > 0) {
    blocks.push({ type: 'code', text: codeLines.join('\n') });
  }
  flushParagraph();
  flushList();

  return blocks;
}

export const SAMPLE_STARTER_BLOGS = [
  {
    id: 'building-dynamic-portfolio-cms',
    slug: 'building-dynamic-portfolio-cms',
    title: 'Replacing Hardcoded Portfolio Data with a Live Personal Command Hub',
    excerpt:
      'How I moved my portfolio projects, gallery grids, and writing into a single Firestore-backed control center with clean public JSON endpoints.',
    content: `## Why Hardcoded Arrays Stop Scaling

Every time I shipped a new side project or updated a demo URL, I had to open my portfolio repo, edit a static file, commit, and wait for a full redeploy.

### Separating Public Content from Private Operations

By splitting Firestore into public collections and strictly owner-only operational metadata, the portfolio only reads clean JSON while my Auth, Database, and Hosting dashboards stay private.

- Single source of truth for projects, gallery slots, and articles
- Instant publishing without redeploying the frontend
- Clean CORS-enabled REST endpoints for any web or mobile client`,
    coverImage:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&h=560&fit=crop&q=80&auto=format',
    author: 'Ata Khatri',
    category: 'Engineering',
    tags: ['React', 'Firebase', 'Architecture'],
    publishedDate: '2026-11-20',
    readTime: '3 min read',
    published: true,
    featured: true,
    displayOrder: 1,
  },
  {
    id: 'interactive-webgl-weather-surfaces',
    slug: 'interactive-webgl-weather-surfaces',
    title: 'Designing Atmospheric Three.js Backdrops That Stay Legible',
    excerpt:
      'Balancing real-time weather shaders, frosted liquid glass cards, and adaptive icon contrast across storm and bright daytime skies.',
    content: `## Designing for Dynamic Sky Luminance

A live 3D sky changes dramatically between a midnight thunderstorm and a clear afternoon. UI chrome must adapt so controls remain effortless to scan.

> Glass surfaces work best when light contrast, specular hairlines, and readable ink adapt together.

- Bright clear skies pair with darker frosted action glyphs
- Volumetric clouds drift slowly to keep focus on workspace tasks
- Skeleton placeholders keep layout calm while live records hydrate`,
    coverImage:
      'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1000&h=560&fit=crop&q=80&auto=format',
    author: 'Ata Khatri',
    category: 'Design',
    tags: ['Three.js', 'UI Systems', 'Glassmorphism'],
    publishedDate: '2026-11-12',
    readTime: '2 min read',
    published: true,
    featured: false,
    displayOrder: 2,
  },
  {
    id: 'realtime-portfolio-sync-notes',
    slug: 'realtime-portfolio-sync-notes',
    title: 'Notes on Zero-Redeploy Portfolio Publishing',
    excerpt:
      'Draft checklist for wiring real-time listeners, caching headers, and graceful skeletons into my public portfolio site.',
    content: `## Draft Checklist

- Replace hardcoded project & blog arrays with a resilient fetch + cache hook
- Add instant Firestore live listener option for zero-refresh updates
- Render layout-matched skeletons during initial hydration`,
    coverImage: '',
    author: 'Ata Khatri',
    category: 'Notes',
    tags: ['Portfolio', 'Realtime', 'DX'],
    publishedDate: '2026-11-26',
    readTime: '1 min read',
    published: false,
    featured: false,
    displayOrder: 3,
  },
];
