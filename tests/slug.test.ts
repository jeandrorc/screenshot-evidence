import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { deriveSlug, timestamp } from '../src/lib/slug.js';

describe('deriveSlug', () => {
  it('joins path segments with dashes', () => {
    assert.equal(deriveSlug('http://localhost:3000/m/star/1-12'), 'm-star-1-12');
  });

  it('appends query params as key-value pairs', () => {
    assert.equal(deriveSlug('https://www.partstown.com/parts?q=pitco'), 'parts-q-pitco');
  });

  it('handles root path', () => {
    assert.equal(deriveSlug('https://www.partstown.com/'), 'page');
  });

  it('lowercases and sanitizes special chars', () => {
    assert.equal(
      deriveSlug('https://www.partstown.com/Café/Über?q=foo bar'),
      'caf-ber-q-foo-bar',
    );
  });

  it('truncates very long slugs', () => {
    const longUrl = 'http://localhost:3000/' + 'a'.repeat(200);
    const slug = deriveSlug(longUrl);
    assert.ok(slug.length <= 80);
  });

  it('returns "page" for invalid URLs', () => {
    assert.equal(deriveSlug('not a url'), 'page');
  });
});

describe('timestamp', () => {
  it('formats date as YYYY-MM-DD_HH-mm', () => {
    const ts = timestamp(new Date('2026-05-08T15:30:00'));
    assert.equal(ts, '2026-05-08_15-30');
  });

  it('zero-pads single-digit components', () => {
    const ts = timestamp(new Date('2026-01-02T03:04:00'));
    assert.equal(ts, '2026-01-02_03-04');
  });
});
