import { DEFAULT_USER_MESSAGES, ErrorCode } from "./error-codes";

const TECHNICAL_PATTERNS = [
  /prisma/i,
  /sqlstate/i,
  /econnrefused/i,
  /enotfound/i,
  /etimedout/i,
  /duplicate key/i,
  /foreign key/i,
  /violates .*constraint/i,
  /cannot read propert/i,
  /undefined is not/i,
  /stack:/i,
  /node_modules/i,
  /status code/i,
  /cannot post/i,
  /cannot get/i,
  /exception/i,
  /failed \(\d+\)/i,
  /request failed/i,
];

export function looksTechnical(message: string | undefined | null): boolean {
  if (!message?.trim()) {
    return true;
  }
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(message));
}

export function messageForHttpStatus(status: number): string {
  if (status === 0) {
    return DEFAULT_USER_MESSAGES.NETWORK_ERROR;
  }
  if (status === 400) {
    return DEFAULT_USER_MESSAGES.VALIDATION_ERROR;
  }
  if (status === 401) {
    return DEFAULT_USER_MESSAGES.AUTH_EXPIRED;
  }
  if (status === 403) {
    return DEFAULT_USER_MESSAGES.FORBIDDEN;
  }
  if (status === 404) {
    return DEFAULT_USER_MESSAGES.NOT_FOUND;
  }
  if (status === 409) {
    return DEFAULT_USER_MESSAGES.DUPLICATE_RECORD;
  }
  if (status === 422) {
    return DEFAULT_USER_MESSAGES.BUSINESS_RULE_VIOLATION;
  }
  if (status === 429) {
    return DEFAULT_USER_MESSAGES.RATE_LIMITED;
  }
  if (status === 408 || status === 504) {
    return DEFAULT_USER_MESSAGES.TIMEOUT_ERROR;
  }
  if (status >= 500) {
    return DEFAULT_USER_MESSAGES.SERVER_ERROR;
  }
  return DEFAULT_USER_MESSAGES.UNKNOWN_ERROR;
}

export function toUserMessage(input: {
  code?: string;
  message?: string;
  status?: number;
  requestId?: string;
}): string {
  const code = input.code as ErrorCode | undefined;
  const fallback =
    (code && DEFAULT_USER_MESSAGES[code]) ||
    messageForHttpStatus(input.status ?? 0);
  if (looksTechnical(input.message)) {
    if ((input.status ?? 0) >= 500 && input.requestId) {
      return `${DEFAULT_USER_MESSAGES.SERVER_ERROR} Reference: ${input.requestId.slice(0, 8).toUpperCase()}`;
    }
    return fallback;
  }
  return input.message!.trim();
}

export function isAuthError(code?: string, status?: number): boolean {
  return (
    code === ErrorCode.AUTH_REQUIRED ||
    code === ErrorCode.AUTH_EXPIRED ||
    status === 401
  );
}
