import {
  isSafeHttpUrl,
  normalizeProjectStatus,
  normalizeProjectType,
  parseTagList,
  slugifyTitle,
} from './projectHelpers';
import { BLOG_DATE_REGEX, slugifyBlogTitle } from './blogHelpers';

export const MAX_IMPORT_FILE_BYTES = 512 * 1024; // 512 KB safety cap

export const PROJECT_IMPORT_ACCEPT = '.js,.ts,.jsx,.tsx,.json,.md,.mdx';
export const BLOG_IMPORT_ACCEPT = '.md,.mdx,.js,.ts,.jsx,.tsx,.json';

function humanizeFilename(filename = '') {
  const base = String(filename || '')
    .replace(/^.*[/\\]/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!base) return '';
  return base.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function getFileExtension(filename = '') {
  const match = String(filename || '')
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function cleanSafeUrl(value, maxLen = 1000) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return isSafeHttpUrl(trimmed, maxLen) ? trimmed : '';
}

function normalizeIsoDate(raw) {
  const str = String(raw || '').trim();
  if (!str) return '';
  if (BLOG_DATE_REGEX.test(str)) return str;
  const isoPrefix = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return '';
  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const d = String(parsed.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function stripInlineMarkdown(line) {
  return String(line || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]+/g, '')
    .trim();
}

function extractFirstHeading(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const match = line.trim().match(/^#\s+(.+)$/);
    if (match) return stripInlineMarkdown(match[1]);
  }
  return '';
}

function extractFirstParagraph(markdown, maxLen = 280) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  let inCode = false;
  const para = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (!line) {
      if (para.length > 0) break;
      continue;
    }
    if (/^(#{1,6}\s|[-*+]\s|>\s|!\[)/.test(line)) {
      if (para.length > 0) break;
      continue;
    }
    para.push(stripInlineMarkdown(line));
  }
  return para.join(' ').trim().slice(0, maxLen);
}

function extractMarkdownHints(markdown) {
  const text = String(markdown || '');
  const imgMatch = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
  const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)"'<>]+/i);
  const linkMatches = text.match(/https?:\/\/[^\s)"'<>]+/gi) || [];
  const liveCandidate = linkMatches.find(
    (url) =>
      !/github\.com/i.test(url) &&
      (!imgMatch || url !== imgMatch[1]) &&
      !/\.(?:png|jpe?g|webp|gif|svg)(?:\?|$)/i.test(url)
  );
  return {
    image: imgMatch ? cleanSafeUrl(imgMatch[1], 1000) : '',
    githubUrl: githubMatch ? cleanSafeUrl(githubMatch[0].replace(/[.,;]+$/, ''), 500) : '',
    liveUrl: liveCandidate ? cleanSafeUrl(liveCandidate.replace(/[.,;]+$/, ''), 500) : '',
  };
}

function parseYamlScalar(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\(["'\\])/g, '$1');
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    const items = [];
    let current = '';
    let quote = null;
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i];
      if (quote) {
        if (ch === '\\' && i + 1 < inner.length) {
          current += inner[i + 1];
          i += 1;
        } else if (ch === quote) {
          quote = null;
        } else {
          current += ch;
        }
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ',') {
        if (current.trim()) items.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) items.push(current.trim());
    return items;
  }
  return trimmed;
}

export function parseFrontmatterMarkdown(rawText) {
  const normalized = String(rawText || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)([\s\S]*)$/);
  if (!match) {
    return {
      frontmatter: {},
      body: normalized.trim(),
      hasFrontmatter: false,
    };
  }

  const yamlBlock = match[1];
  const body = match[2].trim();
  const frontmatter = {};
  const lines = yamlBlock.split('\n');
  let activeArrayKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listItemMatch = line.match(/^\s*-\s+(.+)$/);
    if (listItemMatch && activeArrayKey) {
      if (!Array.isArray(frontmatter[activeArrayKey])) {
        frontmatter[activeArrayKey] = [];
      }
      frontmatter[activeArrayKey].push(String(parseYamlScalar(listItemMatch[1])).trim());
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!kvMatch) {
      activeArrayKey = null;
      continue;
    }

    const key = kvMatch[1].trim();
    const rawVal = kvMatch[2].trim();
    if (!rawVal) {
      frontmatter[key] = [];
      activeArrayKey = key;
    } else {
      frontmatter[key] = parseYamlScalar(rawVal);
      activeArrayKey = null;
    }
  }

  return {
    frontmatter,
    body,
    hasFrontmatter: true,
  };
}

// ─────────────────────────────────────────────────────────────
// Safe static JS/TS/JSON literal scanner & parser (zero eval)
// ─────────────────────────────────────────────────────────────

function tokenizeSource(source) {
  const tokens = [];
  const text = String(source || '').replace(/^\uFEFF/, '');
  const len = text.length;
  let i = 0;

  while (i < len) {
    const ch = text[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    // Single-line comment
    if (ch === '/' && text[i + 1] === '/') {
      i += 2;
      while (i < len && text[i] !== '\n') i += 1;
      continue;
    }

    // Block comment
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < len && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    // String literals: '...', "...", `...`
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i += 1;
      let val = '';
      while (i < len && text[i] !== quote) {
        if (text[i] === '\\' && i + 1 < len) {
          const next = text[i + 1];
          if (next === 'n') val += '\n';
          else if (next === 'r') val += '\r';
          else if (next === 't') val += '\t';
          else if (next === '\\') val += '\\';
          else if (next === quote) val += quote;
          else if (next === '\n') {
            // Line continuation
          } else {
            val += next;
          }
          i += 2;
        } else {
          val += text[i];
          i += 1;
        }
      }
      if (i < len && text[i] === quote) i += 1;
      tokens.push({ type: 'string', value: val });
      continue;
    }

    // Numbers
    if (
      /[0-9]/.test(ch) ||
      (ch === '-' && /[0-9]/.test(text[i + 1] || ''))
    ) {
      let numStr = ch;
      i += 1;
      while (i < len && /[0-9._eE+-]/.test(text[i])) {
        if ((text[i] === '+' || text[i] === '-') && !/[eE]/.test(text[i - 1])) break;
        numStr += text[i];
        i += 1;
      }
      const cleaned = numStr.replace(/_/g, '');
      const num = Number(cleaned);
      tokens.push({ type: 'number', value: Number.isFinite(num) ? num : 0 });
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = ch;
      i += 1;
      while (i < len && /[a-zA-Z0-9_$]/.test(text[i])) {
        id += text[i];
        i += 1;
      }
      tokens.push({ type: 'ident', value: id });
      continue;
    }

    // Single-character punctuation
    tokens.push({ type: 'punct', value: ch });
    i += 1;
  }

  return tokens;
}

function createLiteralParser(tokens, startIndex) {
  let pos = startIndex;

  const peek = (offset = 0) => tokens[pos + offset] || null;
  const consume = () => tokens[pos++] || null;
  const isPunct = (t, v) => Boolean(t && t.type === 'punct' && t.value === v);

  function skipTypeAssertion() {
    // Handles TypeScript `as const`, `as Project[]`, `satisfies Record<...>`
    while (peek() && peek().type === 'ident' && (peek().value === 'as' || peek().value === 'satisfies')) {
      consume();
      let depth = 0;
      while (peek()) {
        const cur = peek();
        if (isPunct(cur, '<') || isPunct(cur, '(') || isPunct(cur, '[') || isPunct(cur, '{')) {
          depth += 1;
          consume();
        } else if (isPunct(cur, '>') || isPunct(cur, ')') || isPunct(cur, ']') || isPunct(cur, '}')) {
          if (depth === 0) break;
          depth -= 1;
          consume();
        } else if (depth === 0 && (isPunct(cur, ',') || isPunct(cur, ';'))) {
          break;
        } else {
          consume();
        }
      }
    }
  }

  function skipUnknownExpression() {
    let depth = 0;
    while (peek()) {
      const cur = peek();
      if (isPunct(cur, '(') || isPunct(cur, '[') || isPunct(cur, '{')) {
        depth += 1;
        consume();
      } else if (isPunct(cur, ')') || isPunct(cur, ']') || isPunct(cur, '}')) {
        if (depth === 0) break;
        depth -= 1;
        consume();
      } else if (depth === 0 && (isPunct(cur, ',') || isPunct(cur, ';'))) {
        break;
      } else {
        consume();
      }
    }
  }

  function parseValue() {
    const tok = peek();
    if (!tok) return undefined;

    if (tok.type === 'string') {
      consume();
      let combined = tok.value;
      // Handle simple `'a' + 'b'` string concatenation
      while (isPunct(peek(), '+') && peek(1)?.type === 'string') {
        consume();
        combined += consume().value;
      }
      skipTypeAssertion();
      return combined;
    }

    if (tok.type === 'number') {
      consume();
      skipTypeAssertion();
      return tok.value;
    }

    if (tok.type === 'ident') {
      if (tok.value === 'true') {
        consume();
        skipTypeAssertion();
        return true;
      }
      if (tok.value === 'false') {
        consume();
        skipTypeAssertion();
        return false;
      }
      if (tok.value === 'null') {
        consume();
        skipTypeAssertion();
        return null;
      }
      if (tok.value === 'undefined') {
        consume();
        skipTypeAssertion();
        return undefined;
      }
      // Handle `new Date('2026-11-20')` gracefully
      if (
        tok.value === 'new' &&
        peek(1)?.type === 'ident' &&
        peek(1)?.value === 'Date' &&
        isPunct(peek(2), '(')
      ) {
        consume(); // new
        consume(); // Date
        consume(); // (
        let dateArg = '';
        if (peek()?.type === 'string') {
          dateArg = consume().value;
        }
        while (peek() && !isPunct(peek(), ')')) consume();
        if (isPunct(peek(), ')')) consume();
        skipTypeAssertion();
        return dateArg;
      }
      // Unresolved variable or call expression (e.g. imported image asset) -> skip safely
      skipUnknownExpression();
      return undefined;
    }

    if (isPunct(tok, '[')) {
      return parseArray();
    }

    if (isPunct(tok, '{')) {
      return parseObject();
    }

    skipUnknownExpression();
    return undefined;
  }

  function parseArray() {
    if (!isPunct(peek(), '[')) return null;
    consume(); // [
    const arr = [];
    let guard = 0;

    while (peek() && !isPunct(peek(), ']') && guard < 10000) {
      guard += 1;
      if (isPunct(peek(), ',')) {
        consume();
        continue;
      }
      // Skip spread syntax `...otherItems`
      if (isPunct(peek(), '.') && isPunct(peek(1), '.') && isPunct(peek(2), '.')) {
        skipUnknownExpression();
        if (isPunct(peek(), ',')) consume();
        continue;
      }
      const val = parseValue();
      if (val !== undefined) arr.push(val);
      if (isPunct(peek(), ',')) consume();
    }

    if (isPunct(peek(), ']')) consume();
    skipTypeAssertion();
    return arr;
  }

  function parseObject() {
    if (!isPunct(peek(), '{')) return null;
    consume(); // {
    const obj = {};
    let guard = 0;

    while (peek() && !isPunct(peek(), '}') && guard < 10000) {
      guard += 1;
      if (isPunct(peek(), ',')) {
        consume();
        continue;
      }
      // Skip spread syntax `...defaults`
      if (isPunct(peek(), '.') && isPunct(peek(1), '.') && isPunct(peek(2), '.')) {
        skipUnknownExpression();
        if (isPunct(peek(), ',')) consume();
        continue;
      }

      const keyTok = peek();
      if (!keyTok) break;
      let key = '';
      if (keyTok.type === 'ident' || keyTok.type === 'string' || keyTok.type === 'number') {
        key = String(consume().value);
      } else {
        // Unexpected token inside object; abort cleanly so we don't misparse TS interfaces
        return null;
      }

      if (!isPunct(peek(), ':')) {
        // Shorthand property or method (or TS interface)
        if (isPunct(peek(), ',')) {
          consume();
          continue;
        }
        return null;
      }
      consume(); // :

      const val = parseValue();
      if (val !== undefined) {
        obj[key] = val;
      }
      if (isPunct(peek(), ',')) consume();
    }

    if (!isPunct(peek(), '}')) return null;
    consume();
    skipTypeAssertion();
    return obj;
  }

  return {
    parse() {
      const value = parseValue();
      return { value, nextPos: pos };
    },
  };
}

function isPlainRecord(val) {
  return Boolean(val && typeof val === 'object' && !Array.isArray(val));
}

function scoreRecordKeys(record, expectedKeys) {
  if (!isPlainRecord(record)) return 0;
  let score = 0;
  for (const key of Object.keys(record)) {
    if (expectedKeys.has(key.toLowerCase())) score += 1;
  }
  return score;
}

export function extractDataRecordsFromCode(sourceText, expectedKeys) {
  const trimmed = String(sourceText || '').trim();
  if (!trimmed) return [];

  // 1. Try strict JSON first (fast path)
  try {
    const parsedJson = JSON.parse(trimmed);
    if (Array.isArray(parsedJson)) {
      const records = parsedJson.filter(isPlainRecord);
      if (records.length > 0) return records;
    } else if (isPlainRecord(parsedJson)) {
      // Check for wrapper objects like { projects: [...] } or { posts: [...] }
      for (const arrayKey of ['projects', 'posts', 'blogs', 'items', 'data']) {
        if (Array.isArray(parsedJson[arrayKey])) {
          const inner = parsedJson[arrayKey].filter(isPlainRecord);
          if (inner.length > 0) return inner;
        }
      }
      return [parsedJson];
    }
  } catch {
    // Fall through to safe JS/TS literal scanner
  }

  const tokens = tokenizeSource(trimmed);
  const candidates = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    const prev = tokens[i - 1];

    // Look for array/object literals right after `=`, `default`, `return`, or `(`
    const isStart =
      (tok.type === 'punct' && (tok.value === '[' || tok.value === '{')) &&
      (!prev ||
        (prev.type === 'punct' && (prev.value === '=' || prev.value === '(')) ||
        (prev.type === 'ident' && (prev.value === 'default' || prev.value === 'return')));

    if (!isStart) continue;

    // Skip `type Foo = { ... }` (where `type` preceded the identifier before `=`)
    if (prev && prev.type === 'punct' && prev.value === '=') {
      const maybeTypeKw = tokens[i - 3];
      const maybeExportTypeKw = tokens[i - 4];
      if (
        (maybeTypeKw?.type === 'ident' && maybeTypeKw.value === 'type') ||
        (maybeExportTypeKw?.type === 'ident' && maybeExportTypeKw.value === 'type')
      ) {
        continue;
      }
    }

    const parser = createLiteralParser(tokens, i);
    const { value, nextPos } = parser.parse();
    if (!value) continue;

    let records = [];
    if (Array.isArray(value)) {
      records = value.filter(isPlainRecord);
    } else if (isPlainRecord(value)) {
      let unwrapped = null;
      for (const arrayKey of ['projects', 'posts', 'blogs', 'items', 'data']) {
        if (Array.isArray(value[arrayKey])) {
          const inner = value[arrayKey].filter(isPlainRecord);
          if (inner.length > 0) {
            unwrapped = inner;
            break;
          }
        }
      }
      records = unwrapped || [value];
    }

    if (records.length > 0) {
      const totalScore = records.reduce(
        (sum, rec) => sum + scoreRecordKeys(rec, expectedKeys),
        0
      );
      candidates.push({ records, score: totalScore, count: records.length });
      i = Math.max(i, nextPos - 1);
    }
  }

  if (candidates.length === 0) return [];
  candidates.sort((a, b) => b.score - a.score || b.count - a.count);
  return candidates[0].records;
}

// ─────────────────────────────────────────────────────────────
// Project & Blog Record Mappers
// ─────────────────────────────────────────────────────────────

const PROJECT_KEYS = new Set([
  'title',
  'name',
  'projectname',
  'slug',
  'description',
  'summary',
  'tagline',
  'image',
  'imageurl',
  'cover',
  'coverimage',
  'thumbnail',
  'tags',
  'techstack',
  'stack',
  'technologies',
  'liveurl',
  'live',
  'demourl',
  'demo',
  'url',
  'website',
  'githuburl',
  'github',
  'repourl',
  'repo',
  'type',
  'status',
  'published',
  'featured',
]);

const BLOG_KEYS = new Set([
  'title',
  'name',
  'heading',
  'slug',
  'excerpt',
  'description',
  'summary',
  'content',
  'body',
  'markdown',
  'md',
  'cover',
  'coverimage',
  'image',
  'imageurl',
  'thumbnail',
  'author',
  'category',
  'topic',
  'tags',
  'keywords',
  'publisheddate',
  'publishedat',
  'date',
  'readtime',
  'readingtime',
  'published',
  'featured',
]);

function mapRecordToProjectForm(raw, fallbackTitle = '') {
  const links = isPlainRecord(raw.links) ? raw.links : {};
  const title = String(raw.title || raw.name || raw.projectName || fallbackTitle || '').trim();
  const slug = slugifyTitle(raw.slug || title);
  const description = String(
    raw.description || raw.summary || raw.tagline || raw.excerpt || raw.about || ''
  ).trim();
  const image = cleanSafeUrl(
    raw.image || raw.imageUrl || raw.cover || raw.coverImage || raw.thumbnail || raw.preview || '',
    1000
  );
  const rawTags =
    raw.tags ?? raw.techStack ?? raw.stack ?? raw.technologies ?? raw.skills ?? raw.tools ?? [];
  const tags = parseTagList(rawTags, 12).join(', ');
  const liveUrl = cleanSafeUrl(
    raw.liveUrl ||
      raw.live ||
      raw.demoUrl ||
      raw.demo ||
      raw.url ||
      raw.website ||
      raw.homepage ||
      links.live ||
      links.demo ||
      '',
    500
  );
  const githubUrl = cleanSafeUrl(
    raw.githubUrl ||
      raw.github ||
      raw.repoUrl ||
      raw.repo ||
      raw.repository ||
      raw.sourceUrl ||
      links.github ||
      links.repo ||
      '',
    500
  );

  const type = normalizeProjectType(raw.type, raw.category || raw.platform || '');
  const status = normalizeProjectStatus(raw.status);
  const published =
    typeof raw.published === 'boolean'
      ? raw.published
      : String(raw.status || '').toLowerCase() === 'draft'
      ? false
      : true;
  const featured = Boolean(raw.featured);

  const mapped = {
    title,
    slug,
    description,
    image,
    tags,
    liveUrl,
    githubUrl,
    type,
    status,
    published,
    featured,
  };

  // Optional private console fields if included in the imported file
  if (raw.authDashboardUrl) {
    mapped.authDashboardUrl = cleanSafeUrl(raw.authDashboardUrl, 500);
  }
  if (raw.dbDashboardUrl) {
    mapped.dbDashboardUrl = cleanSafeUrl(raw.dbDashboardUrl, 500);
  }
  if (raw.hostingDashboardUrl) {
    mapped.hostingDashboardUrl = cleanSafeUrl(raw.hostingDashboardUrl, 500);
  }
  if (raw.monitoringUrl) {
    mapped.monitoringUrl = cleanSafeUrl(raw.monitoringUrl, 500);
  }
  if (typeof raw.environmentNotes === 'string' && raw.environmentNotes.trim()) {
    mapped.environmentNotes = raw.environmentNotes.trim().slice(0, 2000);
  }
  if (raw.providerTags) {
    mapped.providerTags = parseTagList(raw.providerTags, 10).join(', ');
  }

  return mapped;
}

function mapRecordToBlogForm(raw, fallbackTitle = '') {
  const title = String(raw.title || raw.name || raw.heading || fallbackTitle || '').trim();
  const slug = slugifyBlogTitle(raw.slug || title);
  const content = String(raw.content || raw.body || raw.markdown || raw.md || raw.text || '').trim();
  const excerpt = String(
    raw.excerpt ||
      raw.description ||
      raw.summary ||
      raw.subtitle ||
      (content ? extractFirstParagraph(content, 240) : '')
  ).trim();
  const coverImage = cleanSafeUrl(
    raw.coverImage || raw.cover || raw.image || raw.imageUrl || raw.thumbnail || raw.banner || '',
    1000
  );

  let author = '';
  if (typeof raw.author === 'string') {
    author = raw.author.trim();
  } else if (isPlainRecord(raw.author) && typeof raw.author.name === 'string') {
    author = raw.author.name.trim();
  }

  const category = String(raw.category || raw.topic || raw.section || '').trim();
  const tags = parseTagList(raw.tags ?? raw.keywords ?? raw.topics ?? [], 12).join(', ');
  const publishedDate = normalizeIsoDate(
    raw.publishedDate || raw.publishedAt || raw.date || raw.createdAt || ''
  );
  const readTime = String(raw.readTime || raw.readingTime || '').trim();

  let published;
  if (typeof raw.published === 'boolean') {
    published = raw.published;
  } else if (typeof raw.draft === 'boolean') {
    published = !raw.draft;
  } else if (typeof raw.status === 'string') {
    published = raw.status.toLowerCase() === 'published';
  }

  const featured = typeof raw.featured === 'boolean' ? raw.featured : undefined;

  const mapped = {
    title,
    slug,
    excerpt,
    content,
    coverImage,
    category,
    tags,
    readTime,
  };
  if (author) mapped.author = author;
  if (publishedDate) mapped.publishedDate = publishedDate;
  if (typeof published === 'boolean') mapped.published = published;
  if (typeof featured === 'boolean') mapped.featured = featured;

  return mapped;
}

export function parseImportedProjectFile(text, filename = '') {
  const raw = String(text || '').trim();
  if (!raw) {
    return { ok: false, items: [], error: 'The selected file is empty.' };
  }

  const ext = getFileExtension(filename);
  const fallbackTitle = humanizeFilename(filename);

  if (ext === 'md' || ext === 'mdx') {
    const { frontmatter, body } = parseFrontmatterMarkdown(raw);
    const mdHints = extractMarkdownHints(body);
    const heading = extractFirstHeading(body);
    const firstPara = extractFirstParagraph(body, 600);

    const merged = {
      ...frontmatter,
      title: frontmatter.title || frontmatter.name || heading || fallbackTitle,
      description: frontmatter.description || frontmatter.summary || frontmatter.excerpt || firstPara,
      image: frontmatter.image || frontmatter.cover || frontmatter.coverImage || mdHints.image,
      liveUrl: frontmatter.liveUrl || frontmatter.live || frontmatter.demo || mdHints.liveUrl,
      githubUrl:
        frontmatter.githubUrl || frontmatter.github || frontmatter.repo || mdHints.githubUrl,
    };

    const item = mapRecordToProjectForm(merged, fallbackTitle);
    if (!item.title && !item.description) {
      return {
        ok: false,
        items: [],
        error: 'Could not detect project fields in this Markdown file.',
      };
    }
    return { ok: true, items: [item], error: '' };
  }

  const records = extractDataRecordsFromCode(raw, PROJECT_KEYS);
  if (records.length === 0) {
    return {
      ok: false,
      items: [],
      error:
        'Could not find a project object or array in this file. Export a JS/TS object, JSON, or Markdown file with fields like title, description, tags, and liveUrl.',
    };
  }

  const items = records
    .map((rec, idx) =>
      mapRecordToProjectForm(rec, records.length === 1 ? fallbackTitle : `Project ${idx + 1}`)
    )
    .filter((item) => item.title || item.description || item.liveUrl || item.githubUrl);

  if (items.length === 0) {
    return {
      ok: false,
      items: [],
      error: 'Found structured data, but none of the entries matched project fields.',
    };
  }

  return { ok: true, items, error: '' };
}

export function parseImportedBlogFile(text, filename = '') {
  const raw = String(text || '').trim();
  if (!raw) {
    return { ok: false, items: [], error: 'The selected file is empty.' };
  }

  const ext = getFileExtension(filename);
  const fallbackTitle = humanizeFilename(filename);

  // Treat .md/.mdx OR any file beginning with YAML frontmatter `---` as Markdown
  if (ext === 'md' || ext === 'mdx' || /^---\s*\r?\n/.test(raw)) {
    const { frontmatter, body } = parseFrontmatterMarkdown(raw);
    const heading = extractFirstHeading(body);
    const merged = {
      ...frontmatter,
      title: frontmatter.title || frontmatter.name || heading || fallbackTitle,
      content: body || String(frontmatter.content || ''),
    };

    const item = mapRecordToBlogForm(merged, fallbackTitle);
    if (!item.title && !item.content) {
      return {
        ok: false,
        items: [],
        error: 'Could not detect a blog title or Markdown content in this file.',
      };
    }
    return { ok: true, items: [item], error: '' };
  }

  const records = extractDataRecordsFromCode(raw, BLOG_KEYS);
  if (records.length === 0) {
    return {
      ok: false,
      items: [],
      error:
        'Could not find a blog post object or array in this file. Upload a .md/.mdx file or a .js/.ts/.json file exporting post fields.',
    };
  }

  const items = records
    .map((rec, idx) =>
      mapRecordToBlogForm(rec, records.length === 1 ? fallbackTitle : `Post ${idx + 1}`)
    )
    .filter((item) => item.title || item.content || item.excerpt);

  if (items.length === 0) {
    return {
      ok: false,
      items: [],
      error: 'Found structured data, but none of the entries matched blog post fields.',
    };
  }

  return { ok: true, items, error: '' };
}
