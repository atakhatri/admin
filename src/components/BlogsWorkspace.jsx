import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calendar,
  Clock,
  FilePlus2,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';
import { filterBlogs, formatBlogDate } from '../utils/blogHelpers';
import { isSafeHttpUrl } from '../utils/projectHelpers';
import { BlogCardsSkeleton } from './ui/Skeleton';
import LazyImage from './ui/LazyImage';
import ExpandableFilterBar from './ui/ExpandableFilterBar';

const BLOG_FILTER_TABS = [
  { id: 'all', label: 'All Posts' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'featured', label: 'Featured' },
];

export default function BlogsWorkspace({
  blogs,
  loading,
  searchQuery,
  onSearchChange,
  blogFilter,
  onBlogFilterChange,
  onNewBlog,
  onEditBlog,
  onTogglePublish,
  onToggleFeatured,
  onMoveBlog,
  onDeleteBlog,
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const visibleBlogs = filterBlogs(blogs, {
    filter: blogFilter,
    query: searchQuery,
  });

  const runAction = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const countForTab = (tabId) => {
    if (tabId === 'all') return blogs.length;
    if (tabId === 'published') return blogs.filter((b) => b.published).length;
    if (tabId === 'draft') return blogs.filter((b) => !b.published).length;
    if (tabId === 'featured') return blogs.filter((b) => b.featured).length;
    return 0;
  };

  const filterOptions = BLOG_FILTER_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: countForTab(tab.id),
  }));

  return (
    <section className="workspace-section" aria-label="Portfolio blogs manager">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Portfolio Blogs</h2>
          <p className="section-subtitle">
            Write, edit, reorder, and publish your portfolio articles in Markdown.
          </p>
        </div>

        <div className="empty-actions">
          <button type="button" className="btn-primary" onClick={onNewBlog}>
            <FilePlus2 size={16} aria-hidden="true" />
            <span>New Blog Post</span>
          </button>
        </div>
      </div>

      <div className="workspace-toolbar">
        <ExpandableFilterBar
          options={filterOptions}
          value={blogFilter}
          onChange={onBlogFilterChange}
          label="Filters"
          defaultId="all"
        />

        {searchQuery && (
          <div className="active-search-indicator">
            <span>Filtered by &ldquo;{searchQuery}&rdquo;</span>
            <button
              type="button"
              className="btn-ghost-sm"
              onClick={() => onSearchChange('')}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <BlogCardsSkeleton count={3} />
      ) : blogs.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-title">No blog posts yet</h3>
          <p className="empty-copy">
            Create your first portfolio article or import a Markdown file to get started.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn-primary" onClick={onNewBlog}>
              <FilePlus2 size={16} aria-hidden="true" />
              <span>Write First Post</span>
            </button>
          </div>
        </div>
      ) : visibleBlogs.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-title">No matching blog posts</h3>
          <p className="empty-copy">
            Try clearing your search filter or switching back to All Posts.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onSearchChange('');
              onBlogFilterChange('all');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {visibleBlogs.map((post, index) => {
            const isBusy = busyId === post.id;
            const isPublished = Boolean(post.published);
            const canMoveUp = blogFilter === 'all' && !searchQuery && index > 0;
            const canMoveDown =
              blogFilter === 'all' && !searchQuery && index < visibleBlogs.length - 1;
            const hasCover = Boolean(post.coverImage && isSafeHttpUrl(post.coverImage, 1000));

            return (
              <article key={post.id} className="project-card">
                {hasCover && (
                  <div className="project-card-media">
                    <LazyImage
                      src={post.coverImage}
                      alt={post.title}
                      fallbackLabel="Cover unavailable"
                    />
                  </div>
                )}

                <div className="project-card-top">
                  <div className="project-meta-row">
                    <span
                      className={`status-text ${
                        isPublished ? 'status-published' : 'status-draft'
                      }`}
                    >
                      {isPublished ? 'Published' : 'Draft'}
                    </span>
                    {post.category && (
                      <>
                        <span className="meta-sep" aria-hidden="true">·</span>
                        <span className="project-type-inline">
                          <BookOpen size={13} aria-hidden="true" />
                          <span>{post.category}</span>
                        </span>
                      </>
                    )}
                    <span className="meta-sep" aria-hidden="true">·</span>
                    <span className="blog-slug-inline">/{post.slug}</span>
                  </div>

                  <div className="project-order-actions">
                    <button
                      type="button"
                      className={`icon-btn${post.featured ? ' is-featured' : ''}`}
                      aria-label={
                        post.featured
                          ? `Remove ${post.title} from featured`
                          : `Mark ${post.title} as featured`
                      }
                      title={post.featured ? 'Featured post' : 'Mark featured'}
                      disabled={isBusy}
                      onClick={() =>
                        runAction(post.id, () => onToggleFeatured(post.id, !post.featured))
                      }
                    >
                      <Star
                        size={15}
                        fill={post.featured ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Move ${post.title} earlier`}
                      disabled={!canMoveUp || isBusy}
                      onClick={() =>
                        runAction(post.id, () => onMoveBlog(index, index - 1))
                      }
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Move ${post.title} later`}
                      disabled={!canMoveDown || isBusy}
                      onClick={() =>
                        runAction(post.id, () => onMoveBlog(index, index + 1))
                      }
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <h3 className="project-title">{post.title}</h3>

                <div className="blog-byline-row">
                  <span className="weather-metric-inline">
                    <Calendar size={12} aria-hidden="true" />
                    <span>{formatBlogDate(post.publishedDate)}</span>
                  </span>
                  <span className="meta-sep" aria-hidden="true">·</span>
                  <span className="weather-metric-inline">
                    <Clock size={12} aria-hidden="true" />
                    <span>{post.readTime}</span>
                  </span>
                  {post.author && (
                    <>
                      <span className="meta-sep" aria-hidden="true">·</span>
                      <span>{post.author}</span>
                    </>
                  )}
                </div>

                {post.excerpt && <p className="project-tagline">{post.excerpt}</p>}

                {post.tags.length > 0 && (
                  <div className="project-stack-line">
                    {post.tags.map((tag, tIdx) => (
                      <React.Fragment key={tag}>
                        <span>{tag}</span>
                        {tIdx < post.tags.length - 1 && (
                          <span className="meta-sep" aria-hidden="true">·</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                <div className="project-card-foot">
                  <button
                    type="button"
                    className={`btn-toggle${isPublished ? ' is-live' : ''}`}
                    disabled={isBusy}
                    onClick={() =>
                      runAction(post.id, () => onTogglePublish(post.id, !isPublished))
                    }
                  >
                    {isPublished ? 'Unpublish' : 'Publish'}
                  </button>

                  <div className="card-foot-right">
                    <button
                      type="button"
                      className="btn-ghost-sm"
                      onClick={() => onEditBlog(post)}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    {confirmDeleteId === post.id ? (
                      <div className="delete-confirm-group">
                        <button
                          type="button"
                          className="btn-danger-sm"
                          disabled={isBusy}
                          onClick={() =>
                            runAction(post.id, async () => {
                              await onDeleteBlog(post.id);
                              setConfirmDeleteId(null);
                            })
                          }
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn-ghost-sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        aria-label={`Delete ${post.title}`}
                        onClick={() => setConfirmDeleteId(post.id)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
