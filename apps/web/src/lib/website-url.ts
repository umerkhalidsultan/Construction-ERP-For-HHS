/**
 * Normalizes company website values before validation and persistence.
 * Empty input becomes an empty string in the form and null in the API payload.
 */
export function normalizeWebsiteUrl(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function isHttpWebsiteUrl(value: string): boolean {
  if (!value) {
    return true;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function toWebsitePayload(value: string | undefined): string | null {
  const normalized = normalizeWebsiteUrl(value ?? '');
  return normalized ? normalized : null;
}
