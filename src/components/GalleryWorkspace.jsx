import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  GRID_SLOT_COUNT,
  filterGalleryImages,
  validateGalleryForm,
} from '../utils/galleryHelpers';
import { isSafeHttpUrl } from '../utils/projectHelpers';
import { GalleryWorkspaceSkeleton } from './ui/Skeleton';
import LazyImage from './ui/LazyImage';

function buildPhotoForm(draftConfig, nextOrder) {
  const existing = draftConfig?.existingItem || null;
  const section = existing?.section || draftConfig?.section || 'gallery';
  const slot = section === 'grid' ? existing?.slot || draftConfig?.slot || 1 : 0;

  return {
    section,
    slot,
    title: existing?.title || '',
    imageUrl: existing?.imageUrl || '',
    alt: existing?.alt || '',
    category: existing?.category || '',
    displayOrder: existing
      ? existing.displayOrder
      : section === 'grid'
      ? slot
      : nextOrder,
    published: existing ? existing.published !== false : true,
  };
}

export function GalleryPhotoModal({ open, draftConfig, nextOrder, onClose, onSave }) {
  const [form, setForm] = useState(() => buildPhotoForm(draftConfig, nextOrder));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildPhotoForm(draftConfig, nextOrder));
      setErrors({});
      setSubmitError('');
      setSaving(false);
    }
  }, [open, draftConfig, nextOrder]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const isGrid = form.section === 'grid';
  const existingItem = draftConfig?.existingItem || null;
  const showPreview = Boolean(form.imageUrl && isSafeHttpUrl(form.imageUrl, 1000));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateGalleryForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitError('');
    setSaving(true);
    try {
      await onSave({
        existingItem,
        data: validation.data,
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="modal-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={
          isGrid
            ? `Grid Photo Slot ${form.slot}`
            : existingItem
            ? 'Edit Gallery Image'
            : 'Add Gallery Image'
        }
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isGrid
                ? `Grid Photo · Slot ${form.slot} of ${GRID_SLOT_COUNT}`
                : existingItem
                ? 'Edit Gallery Image'
                : 'Add Gallery Image'}
            </h2>
            <p className="modal-subtitle">
              {isGrid
                ? 'Featured showcase slot served in gridPhotos on GET /api/portfolio/gallery.'
                : 'Unlimited portfolio gallery item served in galleryImages on GET /api/portfolio/gallery.'}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close photo editor"
            disabled={saving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="editor-form" onSubmit={handleSubmit} noValidate>
          <div className="editor-section">
            <div className="form-field">
              <label htmlFor="gallery-image-url">Photo URL (HTTPS)</label>
              <input
                id="gallery-image-url"
                type="url"
                className="hub-input"
                placeholder="https://images.unsplash.com/..."
                value={form.imageUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
              />
              {errors.imageUrl && <span className="field-err">{errors.imageUrl}</span>}
              {showPreview && (
                <div className="editor-img-preview">
                  <img
                    src={form.imageUrl}
                    alt={form.alt || form.title || 'Photo preview'}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="gallery-title">Title / Caption (optional)</label>
                <input
                  id="gallery-title"
                  type="text"
                  className="hub-input"
                  placeholder="e.g. Blue Hour Skyline"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                {errors.title && <span className="field-err">{errors.title}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="gallery-category">Category (optional)</label>
                <input
                  id="gallery-category"
                  type="text"
                  className="hub-input"
                  placeholder="Street, Landscape, Portrait..."
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                />
                {errors.category && <span className="field-err">{errors.category}</span>}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="gallery-alt">Alt Text (accessibility)</label>
              <input
                id="gallery-alt"
                type="text"
                className="hub-input"
                placeholder="Brief visual description of the photo"
                value={form.alt}
                onChange={(e) => setForm((prev) => ({ ...prev, alt: e.target.value }))}
              />
              {errors.alt && <span className="field-err">{errors.alt}</span>}
            </div>

            <div className="form-grid-2">
              {!isGrid && (
                <div className="form-field">
                  <label htmlFor="gallery-order">Display Order</label>
                  <input
                    id="gallery-order"
                    type="number"
                    min={0}
                    max={10000}
                    className="hub-input"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, displayOrder: e.target.value }))
                    }
                  />
                </div>
              )}

              <div className="form-field checkbox-field">
                <label className="checkbox-label" htmlFor="gallery-published">
                  <input
                    id="gallery-published"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, published: e.target.checked }))
                    }
                  />
                  <span>Publish to Portfolio Gallery API</span>
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
              {saving ? 'Saving...' : existingItem ? 'Save Photo' : 'Add Photo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GalleryWorkspace({
  gridSlots,
  filledGridCount,
  galleryImages,
  loading,
  seeding,
  searchQuery,
  onSearchChange,
  onOpenGridSlotEditor,
  onOpenNewGalleryImage,
  onEditGalleryImage,
  onTogglePublish,
  onMoveGalleryImage,
  onDeletePhoto,
  onSeedStarterGallery,
}) {
  const [busyId, setBusyId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const visibleGalleryImages = filterGalleryImages(galleryImages, searchQuery);

  const runAction = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const isEmptyOverall = filledGridCount === 0 && galleryImages.length === 0;

  return (
    <section className="workspace-section" aria-label="Portfolio photography gallery manager">
      <div className="section-heading-row">
        <div>
          <h2 className="section-title">Portfolio Photo Gallery</h2>
          <p className="section-subtitle">
            Manage your 5 curated Grid Photos showcase slots and your unlimited Gallery Images
            collection served dynamically via <code>GET /api/portfolio/gallery</code>.
          </p>
        </div>

        <div className="empty-actions">
          {isEmptyOverall && !loading && (
            <button
              type="button"
              className="btn-secondary"
              disabled={seeding}
              onClick={onSeedStarterGallery}
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>{seeding ? 'Loading Starters...' : 'Load Starter Photos'}</span>
            </button>
          )}
          <button type="button" className="btn-primary" onClick={onOpenNewGalleryImage}>
            <ImagePlus size={16} aria-hidden="true" />
            <span>Add Gallery Image</span>
          </button>
        </div>
      </div>

      {loading ? (
        <GalleryWorkspaceSkeleton />
      ) : (
        <>
          {/* SECTION A: GRID PHOTOS (5 SLOTS) */}
          <div className="gallery-section-block">
            <div className="gallery-section-head">
              <div>
                <h3 className="gallery-section-title">A. Grid Photos</h3>
                <p className="gallery-section-copy">
                  5 dedicated showcase slots for your portfolio hero photo grid ({filledGridCount}/
                  {GRID_SLOT_COUNT} filled).
                </p>
              </div>
              <span className="gallery-count-label">
                {filledGridCount} / {GRID_SLOT_COUNT} Slots
              </span>
            </div>

            <div className="gallery-bento-grid">
              {gridSlots.map(({ slot, item }) => {
                const isBusy = item && busyId === item.id;
                const isFeature = slot === 1;
                return (
                  <article
                    key={slot}
                    className={`gallery-slot-card${isFeature ? ' is-feature-slot' : ''}${
                      !item ? ' is-empty-slot' : ''
                    }`}
                  >
                    {item ? (
                      <>
                        <div className="gallery-slot-media">
                          <LazyImage
                            src={item.imageUrl}
                            alt={item.alt || item.title || `Slot ${slot}`}
                            fallbackLabel={`Slot ${slot}`}
                          />
                          <div className="gallery-slot-overlay">
                            <span className="gallery-slot-tag">Slot {slot}</span>
                            <span
                              className={
                                item.published ? 'api-live-flag' : 'api-hidden-flag'
                              }
                            >
                              {item.published ? 'API Live' : 'Hidden'}
                            </span>
                          </div>
                        </div>

                    <div className="gallery-slot-foot">
                      <div className="gallery-slot-meta">
                        <strong className="gallery-item-title">
                          {item.title || `Grid Slot ${slot}`}
                        </strong>
                        {item.category && (
                          <span className="gallery-item-cat">{item.category}</span>
                        )}
                      </div>

                      <div className="card-foot-right">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={
                            item.published
                              ? `Hide Grid Slot ${slot} from API`
                              : `Publish Grid Slot ${slot} to API`
                          }
                          title={item.published ? 'Hide from API' : 'Publish to API'}
                          disabled={isBusy}
                          onClick={() =>
                            runAction(item.id, () => onTogglePublish(item.id, !item.published))
                          }
                        >
                          {item.published ? (
                            <Eye size={14} aria-hidden="true" />
                          ) : (
                            <EyeOff size={14} aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Edit Grid Slot ${slot}`}
                          onClick={() => onOpenGridSlotEditor(slot, item)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        {confirmDeleteId === item.id ? (
                          <button
                            type="button"
                            className="btn-danger-sm"
                            disabled={isBusy}
                            onClick={() =>
                              runAction(item.id, async () => {
                                await onDeletePhoto(item.id);
                                setConfirmDeleteId(null);
                              })
                            }
                          >
                            Clear
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            aria-label={`Clear Grid Slot ${slot}`}
                            onClick={() => setConfirmDeleteId(item.id)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="gallery-empty-slot-btn"
                    onClick={() => onOpenGridSlotEditor(slot, null)}
                  >
                    <ImagePlus size={22} strokeWidth={1.7} aria-hidden="true" />
                    <span className="gallery-empty-slot-title">Slot {slot}</span>
                    <span className="gallery-empty-slot-sub">Click to assign photo</span>
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {/* SECTION B: GALLERY IMAGES (NO LIMIT) */}
      <div className="gallery-section-block">
        <div className="gallery-section-head">
          <div>
            <h3 className="gallery-section-title">B. Gallery Images</h3>
            <p className="gallery-section-copy">
              Unlimited photo collection for your portfolio gallery feed ({galleryImages.length}{' '}
              {galleryImages.length === 1 ? 'image' : 'images'}).
            </p>
          </div>
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

        {visibleGalleryImages.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-title">
              {galleryImages.length === 0
                ? 'No gallery images yet'
                : 'No gallery images match your search'}
            </h3>
            <p className="empty-copy">
              {galleryImages.length === 0
                ? 'Add as many photographs as you want to populate your unlimited portfolio gallery.'
                : 'Try clearing your search filter in the top right.'}
            </p>
            {galleryImages.length === 0 ? (
              <button type="button" className="btn-primary" onClick={onOpenNewGalleryImage}>
                <ImagePlus size={16} aria-hidden="true" />
                <span>Add First Gallery Image</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onSearchChange('')}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="gallery-items-grid">
            {visibleGalleryImages.map((img, index) => {
              const isBusy = busyId === img.id;
              const canUp = !searchQuery && index > 0;
              const canDown = !searchQuery && index < visibleGalleryImages.length - 1;

              return (
                <article key={img.id} className="gallery-item-card">
                  <div className="gallery-item-media">
                    <LazyImage
                      src={img.imageUrl}
                      alt={img.alt || img.title || 'Gallery photo'}
                      fallbackLabel="Photo unavailable"
                    />
                    <div className="gallery-slot-overlay">
                      <span className="gallery-slot-tag">
                        {img.category || 'Gallery'}
                      </span>
                      <span className={img.published ? 'api-live-flag' : 'api-hidden-flag'}>
                        {img.published ? 'API Live' : 'Hidden'}
                      </span>
                    </div>
                  </div>

                  <div className="gallery-item-body">
                    <div className="gallery-slot-meta">
                      <strong className="gallery-item-title">
                        {img.title || 'Untitled Photo'}
                      </strong>
                      {img.alt && img.alt !== img.title && (
                        <span className="gallery-item-cat">{img.alt}</span>
                      )}
                    </div>

                    <div className="gallery-item-actions">
                      <div className="project-order-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Move ${img.title || 'photo'} earlier`}
                          disabled={!canUp || isBusy}
                          onClick={() =>
                            runAction(img.id, () => onMoveGalleryImage(index, index - 1))
                          }
                        >
                          <ArrowUp size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Move ${img.title || 'photo'} later`}
                          disabled={!canDown || isBusy}
                          onClick={() =>
                            runAction(img.id, () => onMoveGalleryImage(index, index + 1))
                          }
                        >
                          <ArrowDown size={14} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="card-foot-right">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={
                            img.published ? 'Hide image from API' : 'Publish image to API'
                          }
                          disabled={isBusy}
                          onClick={() =>
                            runAction(img.id, () => onTogglePublish(img.id, !img.published))
                          }
                        >
                          {img.published ? (
                            <Eye size={14} aria-hidden="true" />
                          ) : (
                            <EyeOff size={14} aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Edit ${img.title || 'photo'}`}
                          onClick={() => onEditGalleryImage(img)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        {confirmDeleteId === img.id ? (
                          <button
                            type="button"
                            className="btn-danger-sm"
                            disabled={isBusy}
                            onClick={() =>
                              runAction(img.id, async () => {
                                await onDeletePhoto(img.id);
                                setConfirmDeleteId(null);
                              })
                            }
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            aria-label={`Delete ${img.title || 'photo'}`}
                            onClick={() => setConfirmDeleteId(img.id)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
        </>
      )}
    </section>
  );
}
