import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class AppError extends HttpException {
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus,
    fields?: Record<string, string>,
  ) {
    super(message, status);
    this.code = code;
    this.fields = fields;
    this.name = 'AppError';
  }
}

export class ValidationAppError extends AppError {
  constructor(fields: Record<string, string>, message?: string) {
    super(
      ErrorCode.VALIDATION_ERROR,
      message ?? 'Please correct the highlighted fields.',
      HttpStatus.BAD_REQUEST,
      fields,
    );
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(
      ErrorCode.BUSINESS_RULE_VIOLATION,
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      fields,
    );
  }
}

export class ConflictAppError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(ErrorCode.DUPLICATE_RECORD, message, HttpStatus.CONFLICT, fields);
  }
}

export class NotFoundAppError extends AppError {
  constructor(message = 'The requested record could not be found.') {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenAppError extends AppError {
  constructor(message = "You don't have permission to perform this action.") {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class AuthenticationAppError extends AppError {
  constructor(
    message = 'Your session has expired. Please sign in again.',
    code: ErrorCode = ErrorCode.AUTH_REQUIRED,
  ) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}
