import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_SLOT_COUNT,
  getGridSlotDocId,
  validateGalleryForm,
  organizeGalleryItems,
  filterGalleryImages,
} from './galleryHelpers.js';

test('getGridSlotDocId validates slots 1..5 and rejects out-of-range slots', () => {
  assert.equal(GRID_SLOT_COUNT, 5);
  assert.equal(getGridSlotDocId(1), 'grid-slot-1');
  assert.equal(getGridSlotDocId(5), 'grid-slot-5');
  assert.throws(() => getGridSlotDocId(0));
  assert.throws(() => getGridSlotDocId(6));
});

test('validateGalleryForm enforces required HTTPS imageUrl and grid vs gallery slot rules', () => {
  const invalid = validateGalleryForm({
    section: 'grid',
    slot: 2,
    imageUrl: 'javascript:alert(1)',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.imageUrl);

  const validGrid = validateGalleryForm({
    section: 'grid',
    slot: 3,
    title: 'Sunset Ridge',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    category: 'Landscape',
    published: true,
  });
  assert.equal(validGrid.valid, true);
  assert.equal(validGrid.data.section, 'grid');
  assert.equal(validGrid.data.slot, 3);
  assert.equal(validGrid.data.displayOrder, 3);

  const validGallery = validateGalleryForm({
    section: 'gallery',
    slot: 4,
    title: 'Street Light',
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad',
    displayOrder: 7,
  });
  assert.equal(validGallery.valid, true);
  assert.equal(validGallery.data.slot, 0);
  assert.equal(validGallery.data.displayOrder, 7);
});

test('organizeGalleryItems separates 5 grid slots from unlimited sorted gallery images', () => {
  const result = organizeGalleryItems([
    {
      id: 'grid-slot-2',
      section: 'grid',
      slot: 2,
      title: 'Second Slot',
      imageUrl: 'https://example.com/2.jpg',
      published: true,
    },
    {
      id: 'photo-b',
      section: 'gallery',
      slot: 0,
      title: 'B Photo',
      imageUrl: 'https://example.com/b.jpg',
      category: 'Street',
      displayOrder: 2,
      published: true,
    },
    {
      id: 'photo-a',
      section: 'gallery',
      slot: 0,
      title: 'A Photo',
      imageUrl: 'https://example.com/a.jpg',
      category: 'Urban',
      displayOrder: 1,
      published: true,
    },
  ]);

  assert.equal(result.gridSlots.length, 5);
  assert.equal(result.filledGridCount, 1);
  assert.equal(result.gridSlots[0].item, null);
  assert.equal(result.gridSlots[1].item.title, 'Second Slot');
  assert.equal(result.galleryImages.length, 2);
  assert.equal(result.galleryImages[0].id, 'photo-a');

  const filtered = filterGalleryImages(result.galleryImages, 'street');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'photo-b');
});
