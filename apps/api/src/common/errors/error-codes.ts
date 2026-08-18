export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  INVALID_STATE: 'INVALID_STATE',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const USER_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Please correct the highlighted fields.',
  AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
  AUTH_INVALID: 'Invalid email or password.',
  AUTH_EXPIRED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: 'The requested record could not be found.',
  DUPLICATE_RECORD: 'This record already exists.',
  CONFLICT_ERROR:
    'This record could not be saved because it conflicts with existing data.',
  INVALID_STATE: 'This action is not allowed in the current state.',
  BUSINESS_RULE_VIOLATION: 'This action cannot be completed.',
  NETWORK_ERROR: 'Unable to connect to the server.',
  DATABASE_ERROR:
    "We're temporarily unable to complete this request. Please try again.",
  SERVER_ERROR: 'Something went wrong on our side. Please try again.',
  FILE_UPLOAD_ERROR: 'Unable to upload the file. Please try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  TIMEOUT_ERROR: 'The server is taking too long to respond. Please try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};
