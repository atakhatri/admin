import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SKILLS,
  normalizeSpotifyPlaylistUrl,
  normalizeTimelineEvents,
  reorderListItem,
  sanitizeStringList,
  validateProfileForm,
  validateTimelineEventForm,
} from './profileHelpers.js';

describe('normalizeSpotifyPlaylistUrl', () => {
  it('accepts empty string as valid optional field', () => {
    const res = normalizeSpotifyPlaylistUrl('   ');
    assert.equal(res.valid, true);
    assert.equal(res.url, '');
    assert.equal(res.embedUrl, '');
  });

  it('normalizes regular Spotify playlist URL with query params into clean URL and embed URL', () => {
    const res = normalizeSpotifyPlaylistUrl(
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123def456'
    );
    assert.equal(res.valid, true);
    assert.equal(res.playlistId, '37i9dQZF1DXcBWIGoYBM5M');
    assert.equal(res.url, 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
    assert.equal(
      res.embedUrl,
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator'
    );
  });

  it('normalizes embed and localized Spotify playlist URLs', () => {
    const res = normalizeSpotifyPlaylistUrl(
      'https://open.spotify.com/intl-en/embed/playlist/5ABHKGoOzxkaa28ttQV9sE?utm_source=generator'
    );
    assert.equal(res.valid, true);
    assert.equal(res.playlistId, '5ABHKGoOzxkaa28ttQV9sE');
    assert.equal(
      res.embedUrl,
      'https://open.spotify.com/embed/playlist/5ABHKGoOzxkaa28ttQV9sE?utm_source=generator'
    );
  });

  it('rejects non-Spotify URLs and javascript: payloads', () => {
    assert.equal(normalizeSpotifyPlaylistUrl('javascript:alert(1)').valid, false);
    assert.equal(normalizeSpotifyPlaylistUrl('https://evil.example.com/playlist/1234567890').valid, false);
  });
});

describe('validateProfileForm', () => {
  it('validates complete profile with communication links and enforces max 10 skills', () => {
    const ok = validateProfileForm({
      name: 'Ata Khatri',
      profession: 'Web Developer',
      oneLiner: 'Building fast, expressive web interfaces.',
      pfp: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
      spotifyPlaylistUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
      languages: 'English, Hindi, Urdu',
      mostActivePlatform: 'GitHub',
      mostActiveUrl: 'https://github.com/atakhatri',
      contactEmail: 'hello@atakhatri.dev',
      githubUrl: 'https://github.com/atakhatri',
      linkedinUrl: 'https://linkedin.com/in/atakhatri',
      twitterUrl: 'https://x.com/atakhatri',
      websiteUrl: 'https://atakhatri.dev',
      expertise: 'Full-Stack, UI Engineering, Next.js',
      skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'Tailwind CSS'],
      published: true,
    });
    assert.equal(ok.valid, true);
    assert.equal(ok.normalized.contactEmail, 'hello@atakhatri.dev');
    assert.equal(ok.normalized.githubUrl, 'https://github.com/atakhatri');
    assert.deepEqual(ok.normalized.languages, ['English', 'Hindi', 'Urdu']);
    assert.deepEqual(ok.normalized.skills, ['React', 'Next.js', 'TypeScript', 'Node.js', 'Tailwind CSS']);
    assert.equal(
      ok.spotifyEmbedUrl,
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator'
    );

    const elevenSkills = Array.from({ length: MAX_SKILLS + 1 }, (_, i) => `Skill ${i + 1}`);
    const tooMany = validateProfileForm({
      name: 'Ata Khatri',
      skills: elevenSkills,
    });
    assert.equal(tooMany.valid, false);
    assert.ok(tooMany.errors.skills);
  });

  it('rejects missing name, invalid email, or unsafe URLs', () => {
    const res = validateProfileForm({
      name: '   ',
      pfp: 'javascript:alert(1)',
      mostActiveUrl: 'ftp://bad.host/file',
      contactEmail: 'not-an-email',
      githubUrl: 'javascript:void(0)',
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.name);
    assert.ok(res.errors.pfp);
    assert.ok(res.errors.mostActiveUrl);
    assert.ok(res.errors.contactEmail);
    assert.ok(res.errors.githubUrl);
  });
});

describe('validateTimelineEventForm, normalizeTimelineEvents & reorderListItem', () => {
  it('validates timeline entry and sorts by displayOrder', () => {
    const res = validateTimelineEventForm({
      period: '2024 – Present',
      title: 'Independent Full-Stack Developer',
      subtitle: 'Remote',
      description: 'Shipping web apps and interactive portfolios.',
      displayOrder: 2,
      published: true,
    });
    assert.equal(res.valid, true);
    assert.equal(res.normalized.displayOrder, 2);

    const invalid = validateTimelineEventForm({ period: '', title: '' });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.period);
    assert.ok(invalid.errors.title);

    const sorted = normalizeTimelineEvents([
      { id: 'b', period: '2023', title: 'B', displayOrder: 2, published: true },
      { id: 'a', period: '2024', title: 'A', displayOrder: 1, published: true },
    ]);
    assert.deepEqual(
      sorted.map((x) => x.id),
      ['a', 'b']
    );
  });

  it('deduplicates case-insensitively and reorders skill tags cleanly', () => {
    assert.deepEqual(sanitizeStringList('React, react, Next.js, REACT', 10, 40), [
      'React',
      'Next.js',
    ]);
    assert.deepEqual(reorderListItem(['React', 'TypeScript', 'Node.js'], 2, 0), [
      'Node.js',
      'React',
      'TypeScript',
    ]);
  });
});
