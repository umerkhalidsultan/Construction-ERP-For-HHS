import { normalizeWebsiteUrl, persistWebsiteUrl } from './website-url';

describe('normalizeWebsiteUrl', () => {
  it('returns undefined when the field was omitted', () => {
    expect(normalizeWebsiteUrl(undefined)).toBeUndefined();
  });

  it('returns null for empty or whitespace values', () => {
    expect(normalizeWebsiteUrl('')).toBeNull();
    expect(normalizeWebsiteUrl('   ')).toBeNull();
    expect(normalizeWebsiteUrl(null)).toBeNull();
  });

  it('keeps http(s) URLs intact', () => {
    expect(normalizeWebsiteUrl('https://example.com')).toBe(
      'https://example.com',
    );
    expect(normalizeWebsiteUrl('http://www.example.com/about')).toBe(
      'http://www.example.com/about',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeWebsiteUrl('  https://example.com/path  ')).toBe(
      'https://example.com/path',
    );
  });

  it('converts protocol-relative URLs to https', () => {
    expect(normalizeWebsiteUrl('//example.com')).toBe('https://example.com');
  });

  it('prefixes https for bare domains', () => {
    expect(normalizeWebsiteUrl('www.example.com')).toBe(
      'https://www.example.com',
    );
    expect(normalizeWebsiteUrl('example.com')).toBe('https://example.com');
  });

  it('is idempotent for already-normalized URLs', () => {
    expect(normalizeWebsiteUrl('https://www.example.com')).toBe(
      'https://www.example.com',
    );
  });
});

describe('persistWebsiteUrl', () => {
  it('does not overwrite the column when the field is omitted', () => {
    expect(persistWebsiteUrl(undefined)).toBeUndefined();
  });

  it('stores NULL when the client clears the field', () => {
    expect(persistWebsiteUrl(null)).toBeNull();
    expect(persistWebsiteUrl('')).toBeNull();
    expect(persistWebsiteUrl('  ')).toBeNull();
  });

  it('persists trimmed URLs', () => {
    expect(persistWebsiteUrl(' https://example.com ')).toBe(
      'https://example.com',
    );
  });
});
