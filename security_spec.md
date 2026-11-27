# Security Specification — Aurora Command Hub

## 1. Data Invariants
1. **Owner-Only Mutations**: Only verified Google accounts matching `atakhatri905@gmail.com` (`request.auth.token.email_verified == true`) can create, update, or delete documents in `public_projects`, `admin_projects`, `public_gallery`, or `public_blogs`.
2. **Strict PII & Console Isolation**: `admin_projects/{projectId}` is strictly owner-only on `get`, `list`, `create`, `update`, and `delete`. It is never publicly readable.
3. **Public API Visibility**: Unauthenticated reads on `public_projects` are permitted only when `published == true` (or legacy `status == 'published'`). Unauthenticated reads on `public_gallery` and `public_blogs` are permitted only when `published == true`.
4. **Portfolio Project Schema**: Every newly written `public_projects` document enforces exact portfolio keys (`title`, `description`, `image`, `tags`, `liveUrl`, `githubUrl`, `type` in `['Website', 'Mobile App']`, `status` in `['Complete', 'Demo']`, `published`, `featured`, `displayOrder`, `slug`, `ownerId`, `createdAt`, `updatedAt`).
5. **Gallery Section & 5-Slot Grid Bounds**: Every `public_gallery` document with `section == 'grid'` MUST have `slot >= 1 && slot <= 5` and document ID `grid-slot-<slot>`. Every `public_gallery` document with `section == 'gallery'` MUST have `slot == 0`.
6. **Blog Article Bounds**: Every `public_blogs` document enforces strict key allowlists (`slug`, `title`, `excerpt`, `content` <= 50000 chars, optional HTTPS `coverImage`, `author`, `category`, bounded `tags` <= 12, `YYYY-MM-DD` `publishedDate`, `readTime`, `published`, `featured`, `displayOrder`, `ownerId`, `createdAt`, `updatedAt`).
7. **Portfolio Profile & Skills Bound**: `/public_profile/main` is a single deterministic document enforcing exact key allowlists (`name`, `profession`, `oneLiner`, optional HTTPS `pfp`, optional HTTPS `spotifyPlaylistUrl`, bounded `languages` <= 15, `mostActivePlatform`, optional HTTPS `mostActiveUrl`, optional `contactEmail`, optional HTTPS `githubUrl`/`linkedinUrl`/`twitterUrl`/`websiteUrl`, bounded `expertise` <= 15, bounded `skills` <= 10, `published`, `ownerId`, `createdAt`, `updatedAt`).
8. **Scalable Timeline Events**: `/public_timeline/{eventId}` stores individual chronological milestones (`period`, `title`, `subtitle`, `description`, `displayOrder`, `published`, `ownerId`, `createdAt`, `updatedAt`) rather than an unbounded array on `/public_profile/main`.
9. **Temporal & Ownership Immutability**: `ownerId` and `createdAt` are immutable after creation; `updatedAt` must equal `request.time`.
10. **Atomic Admin Creation**: Creating `admin_projects/{projectId}` requires `existsAfter(/databases/$(database)/documents/public_projects/$(projectId))`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unverified Admin Email Spoof**: Auth token with `email: 'atakhatri905@gmail.com'`, `email_verified: false` creating `public_profile/main` or `public_timeline/t1`.
2. **Non-Owner Public Profile/Timeline Write**: Authenticated user `other@example.com` attempting to create or update `public_profile/main` or `public_timeline/t1`.
3. **Ghost Shadow Field Injection**: Owner writing `public_profile/main` or `public_timeline/t1` with extra key `isAdmin: true`.
4. **Arbitrary Profile Doc ID Spam**: Owner attempting to create `public_profile/secondary` (only `profileId == 'main'` is allowed).
5. **Skills Cap Overflow**: Owner writing `public_profile/main` with 11 skills (`skills.size() > 10`).
6. **JavaScript Scheme URL Poisoning**: Owner writing `public_profile/main` with `pfp: 'javascript:alert(1)'`, `spotifyPlaylistUrl: 'javascript:alert(1)'`, or `mostActiveUrl: 'javascript:alert(1)'`.
7. **Unbounded Tags/Languages/Expertise Arrays**: Owner writing `languages.size() > 15` or `expertise.size() > 15` on `public_profile/main`, or `tags.size() > 12` on projects/blogs.
8. **Gallery Grid Slot Overflow**: Owner creating `public_gallery/grid-slot-6` with `section: 'grid', slot: 6`.
9. **Gallery Section Mismatch**: Owner creating `public_gallery/photo-1` with `section: 'grid', slot: 0` or `section: 'gallery', slot: 2`.
10. **Timeline Oversized Description / Empty Title**: Owner creating `public_timeline/t1` with `title: ''` or `description.size() > 1000`.
11. **Public Read of Unpublished Draft**: Unauthenticated client reading `public_profile/main` (`published: false`), `public_timeline/draft-1` (`published: false`), `public_projects/draft-1`, `public_gallery/draft-photo`, or `public_blogs/draft-post`.
12. **Client-Spoofed Timestamp / Owner Reassignment**: Owner updating `public_profile/main` or `public_timeline/t1` with `createdAt: <newTimestamp>` or `ownerId: 'different-uid'`.
