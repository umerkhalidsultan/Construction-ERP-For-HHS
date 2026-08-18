/**
 * Normalizes company website values before validation and persistence.
 * Empty input becomes null so PostgreSQL stores NULL rather than "".
 * Bare domains (example.com) receive an https:// prefix.
 * Already-prefixed HTTP(S) values are returned unchanged (idempotent).
 */
export function normalizeWebsiteUrl(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return value as string;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Leave non-http schemes (javascript:, data:, ftp:) unchanged so validators reject them.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function persistWebsiteUrl(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
