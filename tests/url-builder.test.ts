import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildUrl, detectDomain } from '../src/lib/url-builder.js';

describe('detectDomain', () => {
  it('detects localhost', () => {
    assert.equal(detectDomain('http://localhost:3000/m/star/1-12'), 'local');
    assert.equal(detectDomain('http://127.0.0.1:3000/'), 'local');
  });

  it('detects partstown.com', () => {
    assert.equal(detectDomain('https://www.partstown.com/parts?q=pitco'), 'com');
  });

  it('detects partstown.com.mx', () => {
    assert.equal(detectDomain('https://www.partstown.com.mx/parts'), 'commx');
  });

  it('detects partstown.ca', () => {
    assert.equal(detectDomain('https://www.partstown.ca/parts'), 'ca');
  });
});

describe('buildUrl', () => {
  const localBase = 'http://localhost:3000/m/star/1-12';

  it('localhost + en (default) keeps URL untouched', () => {
    const url = buildUrl({ baseUrl: localBase, domain: 'local', locale: 'en' });
    assert.equal(url, 'http://localhost:3000/m/star/1-12');
  });

  it('localhost + es prefixes path with /es', () => {
    const url = buildUrl({ baseUrl: localBase, domain: 'local', locale: 'es' });
    assert.equal(url, 'http://localhost:3000/es/m/star/1-12');
  });

  it('localhost + fr_CA prefixes path with /fr_CA', () => {
    const url = buildUrl({ baseUrl: localBase, domain: 'local', locale: 'fr_CA' });
    assert.equal(url, 'http://localhost:3000/fr_CA/m/star/1-12');
  });

  it('com + es swaps host and prefixes', () => {
    const url = buildUrl({
      baseUrl: localBase,
      domain: 'com',
      locale: 'es',
    });
    assert.equal(url, 'https://www.partstown.com/es/m/star/1-12');
  });

  it('commx + es_MX (default) has no prefix', () => {
    const url = buildUrl({
      baseUrl: localBase,
      domain: 'commx',
      locale: 'es_MX',
    });
    assert.equal(url, 'https://www.partstown.com.mx/m/star/1-12');
  });

  it('commx + en (non-default) gets /en prefix', () => {
    const url = buildUrl({
      baseUrl: localBase,
      domain: 'commx',
      locale: 'en',
    });
    assert.equal(url, 'https://www.partstown.com.mx/en/m/star/1-12');
  });

  it('ca + fr_CA (non-default) gets prefix', () => {
    const url = buildUrl({
      baseUrl: 'https://www.partstown.ca/parts',
      domain: 'ca',
      locale: 'fr_CA',
    });
    assert.equal(url, 'https://www.partstown.ca/fr_CA/parts');
  });

  it('preserves query string and hash', () => {
    const url = buildUrl({
      baseUrl: 'https://www.partstown.com/parts?q=pitco#mdptab',
      domain: 'com',
      locale: 'fr',
    });
    assert.equal(url, 'https://www.partstown.com/fr/parts?q=pitco#mdptab');
  });

  it('strips existing locale prefix and applies new one', () => {
    const url = buildUrl({
      baseUrl: 'https://www.partstown.com/es/m/star/1-12',
      domain: 'com',
      locale: 'fr',
    });
    assert.equal(url, 'https://www.partstown.com/fr/m/star/1-12');
  });

  it('strips existing locale prefix when target is default', () => {
    const url = buildUrl({
      baseUrl: 'https://www.partstown.com/es/m/star/1-12',
      domain: 'com',
      locale: 'en',
    });
    assert.equal(url, 'https://www.partstown.com/m/star/1-12');
  });

  it('handles root path with default locale', () => {
    const url = buildUrl({
      baseUrl: 'https://www.partstown.com/',
      domain: 'com',
      locale: 'en',
    });
    assert.equal(url, 'https://www.partstown.com/');
  });

  it('handles root path with non-default locale', () => {
    const url = buildUrl({
      baseUrl: 'https://www.partstown.com/',
      domain: 'com',
      locale: 'es',
    });
    assert.equal(url, 'https://www.partstown.com/es/');
  });
});
