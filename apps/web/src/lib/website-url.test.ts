import { describe, expect, it } from 'vitest';
import {
  isHttpWebsiteUrl,
  normalizeWebsiteUrl,
  toWebsitePayload,
} from './website-url';

describe('normalizeWebsiteUrl', () => {
  it('returns an empty string for blank input', () => {
    expect(normalizeWebsiteUrl('')).toBe('');
    expect(normalizeWebsiteUrl('   ')).toBe('');
    expect(normalizeWebsiteUrl(undefined)).toBe('');
  });

  it('keeps valid http(s) URLs', () => {
    expect(normalizeWebsiteUrl('https://example.com')).toBe(
      'https://example.com',
    );
    expect(normalizeWebsiteUrl('http://www.example.com/jobs')).toBe(
      'http://www.example.com/jobs',
    );
  });

  it('prefixes https for domains without a protocol', () => {
    expect(normalizeWebsiteUrl('example.com')).toBe('https://example.com');
    expect(normalizeWebsiteUrl('www.example.com')).toBe(
      'https://www.example.com',
    );
  });
});

describe('isHttpWebsiteUrl', () => {
  it('accepts empty values and http(s) URLs', () => {
    expect(isHttpWebsiteUrl('')).toBe(true);
    expect(isHttpWebsiteUrl('https://example.com')).toBe(true);
  });

  it('rejects non-http schemes and invalid URLs', () => {
    expect(isHttpWebsiteUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpWebsiteUrl('not a url')).toBe(false);
  });
});

describe('toWebsitePayload', () => {
  it('sends null when the field is cleared so Postgres can store NULL', () => {
    expect(toWebsitePayload('')).toBeNull();
  });

  it('sends a normalized URL for valid input', () => {
    expect(toWebsitePayload('www.example.com')).toBe('https://www.example.com');
  });
});
