import { isSafeHttpUrl } from './projectHelpers';

export const GRID_SLOT_COUNT = 5;

export const GALLERY_LIMITS = {
  TITLE_MAX: 120,
  IMAGE_URL_MAX: 1000,
  ALT_MAX: 200,
  CATEGORY_MAX: 50,
};

export const GALLERY_SECTIONS = ['grid', 'gallery'];

export function getGridSlotDocId(slotNumber) {
  const n = Number(slotNumber);
  if (!Number.isInteger(n) || n < 1 || n > GRID_SLOT_COUNT) {
    throw new Error(`Grid slot must be an integer between 1 and ${GRID_SLOT_COUNT}.`);
  }
  return `grid-slot-${n}`;
}

export function validateGalleryForm(form) {
  const errors = {};
  const section = GALLERY_SECTIONS.includes(form.section) ? form.section : 'gallery';
  const rawSlot = Number(form.slot);
  const slot =
    section === 'grid'
      ? Number.isInteger(rawSlot) && rawSlot >= 1 && rawSlot <= GRID_SLOT_COUNT
        ? rawSlot
        : 1
      : 0;

  const title = String(form.title || '').trim();
  const imageUrl = String(form.imageUrl || '').trim();
  const alt = String(form.alt || '').trim();
  const category = String(form.category || '').trim();
  const published = form.published !== undefined ? Boolean(form.published) : true;
  const displayOrder =
    section === 'grid'
      ? slot
      : Number.isFinite(Number(form.displayOrder))
      ? Math.max(0, Math.min(10000, Math.round(Number(form.displayOrder))))
      : 0;

  if (!imageUrl || !isSafeHttpUrl(imageUrl, GALLERY_LIMITS.IMAGE_URL_MAX)) {
    errors.imageUrl = `A valid http:// or https:// image URL is required (max ${GALLERY_LIMITS.IMAGE_URL_MAX} chars).`;
  }
  if (title.length > GALLERY_LIMITS.TITLE_MAX) {
    errors.title = `Title cannot exceed ${GALLERY_LIMITS.TITLE_MAX} characters.`;
  }
  if (alt.length > GALLERY_LIMITS.ALT_MAX) {
    errors.alt = `Alt text cannot exceed ${GALLERY_LIMITS.ALT_MAX} characters.`;
  }
  if (category.length > GALLERY_LIMITS.CATEGORY_MAX) {
    errors.category = `Category cannot exceed ${GALLERY_LIMITS.CATEGORY_MAX} characters.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      section,
      slot,
      title,
      imageUrl,
      alt: alt || title,
      category,
      displayOrder,
      published,
    },
  };
}

export function organizeGalleryItems(docs = []) {
  const gridSlots = Array.from({ length: GRID_SLOT_COUNT }, (_, idx) => ({
    slot: idx + 1,
    docId: getGridSlotDocId(idx + 1),
    item: null,
  }));

  const galleryImages = [];

  for (const doc of docs) {
    if (!doc || !doc.id) continue;
    const normalized = {
      id: doc.id,
      section: doc.section === 'grid' ? 'grid' : 'gallery',
      slot: Number.isInteger(doc.slot) ? doc.slot : 0,
      title: doc.title || '',
      imageUrl: doc.imageUrl || doc.image || '',
      alt: doc.alt || '',
      category: doc.category || '',
      displayOrder: Number.isFinite(doc.displayOrder) ? doc.displayOrder : 0,
      published: doc.published !== false,
      createdAt: doc.createdAt || null,
      updatedAt: doc.updatedAt || null,
    };

    if (
      normalized.section === 'grid' &&
      normalized.slot >= 1 &&
      normalized.slot <= GRID_SLOT_COUNT
    ) {
      gridSlots[normalized.slot - 1].item = normalized;
    } else if (normalized.section === 'gallery') {
      galleryImages.push(normalized);
    }
  }

  galleryImages.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return String(a.title || a.id).localeCompare(String(b.title || b.id));
  });

  return {
    gridSlots,
    filledGridCount: gridSlots.filter((s) => Boolean(s.item)).length,
    galleryImages,
  };
}

export function filterGalleryImages(images = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return images;
  return images.filter((img) => {
    const haystack = [img.title, img.alt, img.category, img.imageUrl]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export const SAMPLE_STARTER_GALLERY = [
  {
    id: 'grid-slot-1',
    section: 'grid',
    slot: 1,
    title: 'Blue Hour Skyline',
    imageUrl:
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1000&h=800&fit=crop&q=80&auto=format',
    alt: 'City skyline during blue hour twilight',
    category: 'Urban',
    displayOrder: 1,
    published: true,
  },
  {
    id: 'grid-slot-2',
    section: 'grid',
    slot: 2,
    title: 'Misty Alpine Ridge',
    imageUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=640&fit=crop&q=80&auto=format',
    alt: 'Layered mountain ridges above morning mist',
    category: 'Landscape',
    displayOrder: 2,
    published: true,
  },
  {
    id: 'grid-slot-3',
    section: 'grid',
    slot: 3,
    title: 'Rain-Slicked Neon Alley',
    imageUrl:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=640&fit=crop&q=80&auto=format',
    alt: 'Reflections along city street after rain',
    category: 'Street',
    displayOrder: 3,
    published: true,
  },
  {
    id: 'grid-slot-4',
    section: 'grid',
    slot: 4,
    title: 'Coastal Horizon',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=640&fit=crop&q=80&auto=format',
    alt: 'Sunlit ocean waves meeting the shore',
    category: 'Coast',
    displayOrder: 4,
    published: true,
  },
  {
    id: 'grid-slot-5',
    section: 'grid',
    slot: 5,
    title: 'Minimal Concrete Geometry',
    imageUrl:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=640&fit=crop&q=80&auto=format',
    alt: 'Modern architectural facade lines against clear sky',
    category: 'Architecture',
    displayOrder: 5,
    published: true,
  },
  {
    id: 'gallery-golden-forest',
    section: 'gallery',
    slot: 0,
    title: 'Golden Canopy Light',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&h=650&fit=crop&q=80&auto=format',
    alt: 'Sunbeams filtering through tall forest trees',
    category: 'Nature',
    displayOrder: 1,
    published: true,
  },
  {
    id: 'gallery-desert-dunes',
    section: 'gallery',
    slot: 0,
    title: 'Amber Dunes',
    imageUrl:
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=900&h=650&fit=crop&q=80&auto=format',
    alt: 'Wind-sculpted desert sand ridges at sunset',
    category: 'Landscape',
    displayOrder: 2,
    published: true,
  },
];
