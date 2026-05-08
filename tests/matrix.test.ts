import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildMatrix } from '../src/lib/matrix.js';
import type { CaptureConfig } from '../src/lib/types.js';

describe('buildMatrix', () => {
  it('produces a single item for a 1×1×1 matrix', () => {
    const config: CaptureConfig = {
      url: 'http://localhost:3000/m/star/1-12',
      locales: ['en'],
      domains: ['local'],
      viewports: ['desktop'],
    };
    const items = buildMatrix(config);
    assert.equal(items.length, 1);
    assert.equal(items[0].filename, 'desktop_en.png');
    assert.equal(items[0].url, 'http://localhost:3000/m/star/1-12');
  });

  it('uses local naming (no domain in filename) for local-only matrix', () => {
    const config: CaptureConfig = {
      url: 'http://localhost:3000/parts',
      locales: ['en', 'es'],
      domains: ['local'],
      viewports: ['mobile'],
    };
    const items = buildMatrix(config);
    assert.deepEqual(items.map((i) => i.filename).sort(), [
      'mobile_en.png',
      'mobile_es.png',
    ]);
  });

  it('uses prod naming (domain in filename) when multiple domains', () => {
    const config: CaptureConfig = {
      url: 'https://www.partstown.com/parts',
      locales: ['en'],
      domains: ['com', 'commx'],
      viewports: ['desktop'],
    };
    const items = buildMatrix(config);
    const names = items.map((i) => i.filename).sort();
    assert.deepEqual(names, ['desktop_com_en.png', 'desktop_commx_en.png']);
  });

  it('full matrix produces unique filenames', () => {
    const config: CaptureConfig = {
      url: 'https://www.partstown.com/parts',
      locales: ['en', 'es', 'fr', 'es_MX', 'fr_CA'],
      domains: ['com', 'commx', 'ca'],
      viewports: ['desktop', 'mobile', 'tablet'],
    };
    const items = buildMatrix(config);
    assert.equal(items.length, 5 * 3 * 3);
    const names = items.map((i) => i.filename);
    assert.equal(new Set(names).size, items.length);
  });
});
