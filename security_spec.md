# Security Specification — Aurora Command Hub

## 1. Data Invariants
1. **Owner-Only Mutations**: Only verified Google accounts matching `atakhatri905@gmail.com` (`request.auth.token.email_verified == true`) can create, update, or delete documents in `public_projects`, `admin_projects`, `public_gallery`, or `public_blogs`.
2. **Strict PII & Console Isolation**: `admin_projects/{projectId}` is strictly owner-only on `get`, `list`, `create`, `update`, and `delete`. It is never publicly readable.
3. **Public API Visibility**: Unauthenticated reads on `public_projects` are permitted only when `published == true` (or legacy `status == 'published'`). Unauthenticated reads on `public_gallery` and `public_blogs` are permitted only when `published == true`.
4. **Portfolio Project Schema**: Every newly written `public_projects` document enforces exact portfolio keys (`title`, `description`, `image`, `tags`, `liveUrl`, `githubUrl`, `type` in `['Website', 'Mobile App']`, `status` in `['Complete', 'Demo']`, `published`, `featured`, `displayOrder`, `slug`, `ownerId`, `createdAt`, `updatedAt`).
5. **Gallery Section & 5-Slot Grid Bounds**: Every `public_gallery` document with `section == 'grid'` MUST have `slot >= 1 && slot <= 5` and document ID `grid-slot-<slot>`. Every `public_gallery` document with `section == 'gallery'` MUST have `slot == 0`.
6. **Blog Article Bounds**: Every `public_blogs` document enforces strict key allowlists (`slug`, `title`, `excerpt`, `content` <= 50000 chars, optional HTTPS `coverImage`, `author`, `category`, bounded `tags` <= 12, `YYYY-MM-DD` `publishedDate`, `readTime`, `published`, `featured`, `displayOrder`, `ownerId`, `createdAt`, `updatedAt`).
7. **Temporal & Ownership Immutability**: `ownerId` and `createdAt` are immutable after creation; `updatedAt` must equal `request.time`.
8. **Atomic Admin Creation**: Creating `admin_projects/{projectId}` requires `existsAfter(/databases/$(database)/documents/public_projects/$(projectId))`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: Auth token with `email: 'atakhatri905@gmail.com'`, `email_verified: false` creating `public_projects/p1` or `public_blogs/b1`.
2. **Non-Owner Public Blog Write**: Authenticated user `other@example.com` attempting to create or update `public_blogs/b1`.
3. **Ghost Shadow Field Injection**: Owner writing `public_projects/p1` or `public_blogs/b1` with extra key `isAdmin: true`.
4. **Invalid Project Type Enum**: Owner writing `public_projects/p1` with `type: 'Desktop App'`.
5. **Invalid Project Status Enum**: Owner writing `public_projects/p1` with `status: 'WIP'`.
6. **JavaScript Scheme URL Poisoning**: Owner writing `public_projects/p1` with `liveUrl: 'javascript:alert(1)'` or `public_blogs/b1` with `coverImage: 'javascript:alert(1)'`.
7. **Unbounded Tags Array**: Owner writing `public_projects/p1` or `public_blogs/b1` with 13 tags (`tags.size() > 12`).
8. **Gallery Grid Slot Overflow**: Owner creating `public_gallery/grid-slot-6` with `section: 'grid', slot: 6`.
9. **Gallery Section Mismatch**: Owner creating `public_gallery/photo-1` with `section: 'grid', slot: 0` or `section: 'gallery', slot: 2`.
10. **Blog Oversized Content / Malformed Slug**: Owner creating `public_blogs/b1` with `content.size() > 50000` or `slug: 'Bad Slug!'`.
11. **Public Read of Unpublished Draft**: Unauthenticated client reading `public_projects/draft-1` (`published: false`), `public_gallery/draft-photo` (`published: false`), or `public_blogs/draft-post` (`published: false`).
12. **Client-Spoofed Timestamp / Owner Reassignment**: Owner updating `public_blogs/b1` with `createdAt: <newTimestamp>` or `ownerId: 'different-uid'`.
