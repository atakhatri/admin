import React, { useEffect, useState } from 'react';
import { Eye, PenLine, X } from 'lucide-react';
import {
  estimateReadTime,
  getTodayIsoDate,
  parseMarkdownPreviewBlocks,
  slugifyBlogTitle,
  validateBlogForm,
} from '../utils/blogHelpers';
import { isSafeHttpUrl } from '../utils/projectHelpers';

function buildInitialBlogForm(blog, nextOrder, defaultAuthor) {
  if (!blog) {
    return {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      coverImage: '',
      author: defaultAuthor || 'Owner',
      category: '',
      tags: '',
      publishedDate: getTodayIsoDate(),
      readTime: '',
      published: false,
      featured: false,
      displayOrder: nextOrder,
    };
  }

  return {
    title: blog.title || '',
    slug: blog.slug || '',
    excerpt: blog.excerpt || '',
    content: blog.content || '',
    coverImage: blog.coverImage || '',
    author: blog.author || defaultAuthor || 'Owner',
    category: blog.category || '',
    tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
    publishedDate: blog.publishedDate || getTodayIsoDate(),
    readTime: blog.readTime || '',
    published: Boolean(blog.published),
    featured: Boolean(blog.featured),
    displayOrder: Number.isFinite(blog.displayOrder) ? blog.displayOrder : nextOrder,
  };
}

export default function BlogEditorModal({
  open,
  blog,
  nextOrder,
  defaultAuthor,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() =>
    buildInitialBlogForm(blog, nextOrder, defaultAuthor)
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(blog));
  const [bodyTab, setBodyTab] = useState('write'); // 'write' | 'preview'
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialBlogForm(blog, nextOrder, defaultAuthor));
      setSlugTouched(Boolean(blog));
      setBodyTab('write');
      setErrors({});
      setSubmitError('');
      setSaving(false);
    }
  }, [open, blog, nextOrder, defaultAuthor]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && !slugTouched) {
        next.slug = slugifyBlogTitle(value);
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateBlogForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitError('');
    setSaving(true);
    try {
      await onSave({
        existingBlog: blog || null,
        data: validation.data,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save blog post.');
    } finally {
      setSaving(false);
    }
  };

  const showCoverPreview = Boolean(
    form.coverImage && isSafeHttpUrl(form.coverImage, 1000)
  );
  const computedReadTime = form.readTime.trim() || estimateReadTime(form.content);
  const previewBlocks = bodyTab === 'preview' ? parseMarkdownPreviewBlocks(form.content) : [];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="modal-drawer modal-drawer-wide"
        role="dialog"
        aria-modal="true"
        aria-label={blog ? `Edit ${blog.title}` : 'New blog post'}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{blog ? 'Edit Blog Post' : 'New Blog Post'}</h2>
            <p className="modal-subtitle">
              Published posts stream live to <code>GET /api/portfolio/blogs</code> with{' '}
              <code>href: &quot;/blogs/{form.slug || '<slug>'}&quot;</code>,{' '}
              <code>cover</code>, and <code>publishedAt</code>.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close blog editor"
            disabled={saving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="editor-form" onSubmit={handleSubmit} noValidate>
          <div className="editor-section">
            <h3 className="editor-section-title">Article Metadata</h3>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="blog-title">Title</label>
                <input
                  id="blog-title"
                  type="text"
                  className="hub-input"
                  placeholder="e.g. Replacing Hardcoded Portfolio Data"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
                {errors.title && <span className="field-err">{errors.title}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="blog-slug">Slug</label>
                <input
                  id="blog-slug"
                  type="text"
                  className="hub-input mono-input"
                  placeholder="replacing-hardcoded-portfolio-data"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField('slug', e.target.value);
                  }}
                />
                {errors.slug && <span className="field-err">{errors.slug}</span>}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="blog-excerpt">Excerpt / Summary</label>
              <textarea
                id="blog-excerpt"
                rows={2}
                className="hub-input"
                placeholder="One- or two-sentence summary displayed on portfolio blog cards..."
                value={form.excerpt}
                onChange={(e) => updateField('excerpt', e.target.value)}
              />
              {errors.excerpt && <span className="field-err">{errors.excerpt}</span>}
            </div>

            <div className="form-grid-3">
              <div className="form-field">
                <label htmlFor="blog-category">Category</label>
                <input
                  id="blog-category"
                  type="text"
                  className="hub-input"
                  placeholder="Engineering, Design, Notes"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                />
                {errors.category && <span className="field-err">{errors.category}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="blog-date">Publish Date</label>
                <input
                  id="blog-date"
                  type="date"
                  className="hub-input"
                  value={form.publishedDate}
                  onChange={(e) => updateField('publishedDate', e.target.value)}
                />
                {errors.publishedDate && (
                  <span className="field-err">{errors.publishedDate}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="blog-readtime">Read Time (auto: {computedReadTime})</label>
                <input
                  id="blog-readtime"
                  type="text"
                  className="hub-input"
                  placeholder={computedReadTime}
                  value={form.readTime}
                  onChange={(e) => updateField('readTime', e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="blog-author">Author</label>
                <input
                  id="blog-author"
                  type="text"
                  className="hub-input"
                  placeholder="Your name"
                  value={form.author}
                  onChange={(e) => updateField('author', e.target.value)}
                />
                {errors.author && <span className="field-err">{errors.author}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="blog-tags">Tags (comma-separated, max 12)</label>
                <input
                  id="blog-tags"
                  type="text"
                  className="hub-input"
                  placeholder="React, Firebase, Architecture"
                  value={form.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="blog-cover">Cover Image URL (optional HTTPS)</label>
              <input
                id="blog-cover"
                type="url"
                className="hub-input"
                placeholder="https://images.unsplash.com/..."
                value={form.coverImage}
                onChange={(e) => updateField('coverImage', e.target.value)}
              />
              {errors.coverImage && <span className="field-err">{errors.coverImage}</span>}
              {showCoverPreview && (
                <div className="editor-img-preview">
                  <img
                    src={form.coverImage}
                    alt={form.title || 'Blog cover preview'}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="editor-section">
            <div className="blog-content-head">
              <h3 className="editor-section-title" style={{ borderBottom: 0, paddingBottom: 0 }}>
                Article Content (Markdown)
              </h3>
              <div className="segmented-control" role="tablist" aria-label="Editor mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={bodyTab === 'write'}
                  className={bodyTab === 'write' ? 'is-active' : undefined}
                  onClick={() => setBodyTab('write')}
                >
                  <PenLine size={13} aria-hidden="true" style={{ marginRight: 5 }} />
                  Write
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bodyTab === 'preview'}
                  className={bodyTab === 'preview' ? 'is-active' : undefined}
                  onClick={() => setBodyTab('preview')}
                >
                  <Eye size={13} aria-hidden="true" style={{ marginRight: 5 }} />
                  Preview
                </button>
              </div>
            </div>

            {bodyTab === 'write' ? (
              <div className="form-field">
                <label htmlFor="blog-content" className="sr-only">
                  Markdown article content
                </label>
                <textarea
                  id="blog-content"
                  rows={10}
                  className="hub-input mono-input blog-markdown-textarea"
                  placeholder="## Section Heading&#10;&#10;Write your article in Markdown..."
                  value={form.content}
                  onChange={(e) => updateField('content', e.target.value)}
                />
                {errors.content && <span className="field-err">{errors.content}</span>}
              </div>
            ) : (
              <div className="blog-markdown-preview" aria-label="Article preview">
                {previewBlocks.length === 0 ? (
                  <p className="table-muted">Nothing written yet — switch to Write to start drafting.</p>
                ) : (
                  previewBlocks.map((block, idx) => {
                    if (block.type === 'h1') return <h2 key={idx}>{block.text}</h2>;
                    if (block.type === 'h2') return <h3 key={idx}>{block.text}</h3>;
                    if (block.type === 'h3') return <h4 key={idx}>{block.text}</h4>;
                    if (block.type === 'quote') return <blockquote key={idx}>{block.text}</blockquote>;
                    if (block.type === 'code') {
                      return (
                        <pre key={idx} className="code-pre">
                          {block.text}
                        </pre>
                      );
                    }
                    if (block.type === 'ul') {
                      return (
                        <ul key={idx}>
                          {block.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      );
                    }
                    return <p key={idx}>{block.text}</p>;
                  })
                )}
              </div>
            )}

            <div className="form-grid-3">
              <div className="form-field">
                <label htmlFor="blog-order">Display Order</label>
                <input
                  id="blog-order"
                  type="number"
                  min={0}
                  max={10000}
                  className="hub-input"
                  value={form.displayOrder}
                  onChange={(e) => updateField('displayOrder', e.target.value)}
                />
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label" htmlFor="blog-published">
                  <input
                    id="blog-published"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => updateField('published', e.target.checked)}
                  />
                  <span>Publish to Portfolio API</span>
                </label>
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label" htmlFor="blog-featured">
                  <input
                    id="blog-featured"
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => updateField('featured', e.target.checked)}
                  />
                  <span>Featured Article</span>
                </label>
              </div>
            </div>
          </div>

          {submitError && (
            <p className="field-error-banner" role="alert">
              {submitError}
            </p>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : blog ? 'Save Changes' : 'Create Blog Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
