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
  /null is not/i,
  /stack:/i,
  /\bat\s+\S+\s+\(/,
  /node_modules/i,
  /internal server error/i,
  /status code/i,
  /sql\s/i,
  /select\s+.+\s+from/i,
  /column\s+"/i,
  /relation\s+"/i,
  /cannot post/i,
  /cannot get/i,
  /nestjs/i,
  /exception/i,
  /traceback/i,
];

export function looksTechnical(message: string | undefined | null): boolean {
  if (!message) {
    return true;
  }
  const trimmed = message.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.length > 280) {
    return true;
  }
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function sanitizeUserMessage(
  message: string | undefined,
  fallback: string,
): string {
  if (!message || looksTechnical(message)) {
    return fallback;
  }
  return message.trim();
}
