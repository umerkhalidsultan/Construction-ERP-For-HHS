import type { ApiResponse } from "../types/api";
import { useAuthStore } from "../store/auth.store";
import { ErrorCode } from "./errors/error-codes";
import { isAuthError, toUserMessage } from "./errors/user-messages";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly errors?: string[],
    public readonly code?: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  idempotencyKey?: string;
  timeoutMs?: number;
};

function toApiError(
  status: number,
  payload: ApiResponse<unknown> | null,
  fallback?: string,
): ApiError {
  const message = toUserMessage({
    code: payload?.error?.code ?? payload?.code,
    message: payload?.error?.message ?? payload?.message ?? fallback,
    status,
    requestId: payload?.error?.requestId ?? payload?.requestId,
  });
  return new ApiError(
    message,
    status,
    payload?.error?.requestId ?? payload?.requestId,
    payload?.errors ??
      (payload?.error?.fields
        ? Object.values(payload.error.fields)
        : payload?.fields
          ? Object.values(payload.fields)
          : undefined),
    payload?.error?.code ?? payload?.code,
    payload?.error?.fields ?? payload?.fields,
  );
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  let payload: ApiResponse<T> | null = null;
  if (raw && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(raw) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (
    !response.ok ||
    payload?.status === "error" ||
    payload?.success === false
  ) {
    throw toApiError(response.status, payload);
  }

  if (!payload) {
    throw toApiError(response.status, null, "Unable to connect to the server.");
  }

  return payload;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    body,
    skipAuth,
    headers,
    idempotencyKey,
    timeoutMs = 30000,
    signal,
    ...rest
  } = options;
  const token = useAuthStore.getState().token;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (!skipAuth && token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }
  if (idempotencyKey) {
    requestHeaders.set("Idempotency-Key", idempotencyKey);
  }

  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: requestHeaders,
      credentials: "include",
      signal: controller.signal,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "The server is taking too long to respond. Please try again.",
        408,
        undefined,
        undefined,
        ErrorCode.TIMEOUT_ERROR,
      );
    }
    throw new ApiError(
      navigator.onLine === false
        ? "No internet connection. Please check your connection and try again."
        : "Unable to connect to the server.",
      0,
      undefined,
      undefined,
      ErrorCode.NETWORK_ERROR,
    );
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }

  if (response.status === 401 && !skipAuth && !path.startsWith("/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, options);
    }
    useAuthStore.getState().logout();
    throw toApiError(401, null);
  }

  try {
    return await parseResponse<T>(response);
  } catch (error) {
    if (
      error instanceof ApiError &&
      isAuthError(error.code, error.status) &&
      !path.startsWith("/auth/")
    ) {
      useAuthStore.getState().logout();
    }
    throw error;
  }
}

async function tryRefresh(): Promise<boolean> {
  try {
    const payload = await apiRequest<{
      accessToken: string;
      accessTokenExpiresIn: number;
    }>("/auth/refresh", {
      method: "POST",
      skipAuth: true,
      body: {},
    });
    useAuthStore.getState().setToken(payload.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export function toQuery(params: object | Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function userErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return toUserMessage({
    message: error instanceof Error ? error.message : undefined,
  });
}
