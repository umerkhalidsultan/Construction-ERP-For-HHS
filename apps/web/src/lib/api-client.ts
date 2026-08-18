import type { ApiResponse } from '../types/api';
import { useAuthStore } from '../store/auth.store';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly errors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  skipAuth?: boolean;
};

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();

  let payload: ApiResponse<T> | null = null;
  if (raw && contentType.includes('application/json')) {
    try {
      payload = JSON.parse(raw) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload?.status === 'error') {
    throw new ApiError(
      payload?.message ||
        (response.status === 404
          ? 'API is unreachable. Make sure the backend is running on port 3000.'
          : `Request failed (${response.status})`),
      response.status,
      payload?.requestId,
      payload?.errors,
    );
  }

  if (!payload) {
    throw new ApiError(
      'API returned an unexpected response. Make sure the NestJS backend is running.',
      response.status,
    );
  }

  return payload;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { body, skipAuth, headers, ...rest } = options;
  const token = useAuthStore.getState().token;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if (!skipAuth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: requestHeaders,
      credentials: 'include',
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot reach the API. Start the backend with npm run dev:api (and Docker for Postgres).',
      0,
    );
  }

  if (response.status === 401 && !skipAuth && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, options);
    }
    useAuthStore.getState().logout();
  }

  return parseResponse<T>(response);
}

async function tryRefresh(): Promise<boolean> {
  try {
    const payload = await apiRequest<{
      accessToken: string;
      accessTokenExpiresIn: number;
    }>('/auth/refresh', {
      method: 'POST',
      skipAuth: true,
      body: {},
    });
    useAuthStore.getState().setToken(payload.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export function toQuery(
  params: object | Record<string, unknown>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}
