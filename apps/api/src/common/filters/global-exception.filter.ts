import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-errors';
import { mapPrismaError } from '../errors/database-error.mapper';
import { ErrorCode, USER_MESSAGES } from '../errors/error-codes';
import { sanitizeUserMessage } from '../errors/sanitize-error-message';
import { LoggerErrorMonitor } from '../errors/error-monitor';
import type { ErrorMonitor } from '../errors/error-monitor';

interface ErrorBody {
  status: 'error';
  success: false;
  code: ErrorCode;
  message: string;
  data: null;
  fields?: Record<string, string>;
  errors?: string[];
  timestamp: string;
  requestId: string;
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
    requestId: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly monitor: ErrorMonitor = new LoggerErrorMonitor(),
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<
      Request & { user?: { userId?: string; companyId?: string } }
    >();
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ??
      randomUUID();

    const mapped = this.normalize(exception);
    const status = mapped.status;
    const code = mapped.code;
    const message = sanitizeUserMessage(mapped.message, USER_MESSAGES[code]);
    const fields = mapped.fields;

    this.monitor.capture({
      requestId,
      timestamp: new Date().toISOString(),
      endpoint: request.originalUrl || request.url,
      method: request.method,
      module: this.moduleFromUrl(request.url),
      status,
      code,
      userId: request.user?.userId ?? null,
      companyId: request.user?.companyId ?? null,
      environment: process.env.NODE_ENV ?? 'development',
      technicalMessage: mapped.logMessage,
      stack: mapped.stack,
    });

    const publicMessage =
      status >= 500
        ? `${USER_MESSAGES.SERVER_ERROR} Reference: ${requestId.slice(0, 8).toUpperCase()}`
        : message;

    const body: ErrorBody = {
      status: 'error',
      success: false,
      code,
      message: publicMessage,
      data: null,
      fields,
      errors: fields ? Object.values(fields) : [message],
      timestamp: new Date().toISOString(),
      requestId,
      error: {
        code,
        message: publicMessage,
        fields,
        requestId,
      },
    };

    response.status(status).json(body);
  }

  private moduleFromUrl(url: string): string {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    return parts[versionIndex + 1] ?? parts[0] ?? 'application';
  }

  private normalize(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
    logMessage: string;
    stack?: string;
  } {
    const prismaMapped = mapPrismaError(exception);
    if (prismaMapped) {
      return this.fromAppError(prismaMapped, exception);
    }

    if (exception instanceof AppError) {
      return this.fromAppError(exception, exception);
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: ErrorCode.RATE_LIMITED,
        message: USER_MESSAGES.RATE_LIMITED,
        logMessage: 'Rate limited',
      };
    }

    if (this.isMulterError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: ErrorCode.FILE_UPLOAD_ERROR,
        message: this.fileMessage(exception.code),
        logMessage: `Multer ${exception.code}`,
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.SERVER_ERROR,
      message: USER_MESSAGES.SERVER_ERROR,
      logMessage:
        exception instanceof Error ? exception.message : 'Unknown error',
      stack: exception instanceof Error ? exception.stack : undefined,
    };
  }

  private fromAppError(
    error: AppError,
    original: unknown,
  ): ReturnType<GlobalExceptionFilter['normalize']> {
    return {
      status: error.getStatus(),
      code: error.code,
      message: error.message,
      fields: error.fields,
      logMessage: original instanceof Error ? original.message : error.message,
      stack: original instanceof Error ? original.stack : undefined,
    };
  }

  private fromHttpException(
    exception: HttpException,
  ): ReturnType<GlobalExceptionFilter['normalize']> {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const extracted = this.extractPayload(payload);
    const code = this.codeFromStatus(status, extracted.message);
    return {
      status,
      code,
      message: extracted.message || USER_MESSAGES[code],
      fields: extracted.fields,
      logMessage: extracted.message || exception.message,
      stack: exception.stack,
    };
  }

  private extractPayload(payload: string | object): {
    message: string;
    fields?: Record<string, string>;
  } {
    if (typeof payload === 'string') {
      return { message: payload };
    }
    const body = payload as {
      message?: unknown;
      code?: ErrorCode;
      fields?: Record<string, string>;
    };
    if (body.fields && Object.keys(body.fields).length > 0) {
      return {
        message:
          typeof body.message === 'string'
            ? body.message
            : USER_MESSAGES.VALIDATION_ERROR,
        fields: body.fields,
      };
    }
    if (typeof body.message === 'string') {
      return { message: body.message };
    }
    if (
      Array.isArray(body.message) &&
      body.message.every((item) => typeof item === 'string')
    ) {
      return { message: body.message[0] ?? USER_MESSAGES.VALIDATION_ERROR };
    }
    return { message: USER_MESSAGES.UNKNOWN_ERROR };
  }

  private codeFromStatus(status: number, message: string): ErrorCode {
    if (status === 400) {
      return ErrorCode.VALIDATION_ERROR;
    }
    if (status === 401) {
      return /invalid email or password/i.test(message)
        ? ErrorCode.AUTH_INVALID
        : ErrorCode.AUTH_REQUIRED;
    }
    if (status === 403) {
      return ErrorCode.FORBIDDEN;
    }
    if (status === 404) {
      return ErrorCode.NOT_FOUND;
    }
    if (status === 409) {
      return ErrorCode.DUPLICATE_RECORD;
    }
    if (status === 422) {
      return ErrorCode.BUSINESS_RULE_VIOLATION;
    }
    if (status === 408 || status === 504) {
      return ErrorCode.TIMEOUT_ERROR;
    }
    if (status === 413 || status === 415) {
      return ErrorCode.FILE_UPLOAD_ERROR;
    }
    if (status >= 500) {
      return ErrorCode.SERVER_ERROR;
    }
    return ErrorCode.UNKNOWN_ERROR;
  }

  private isMulterError(
    exception: unknown,
  ): exception is Error & { code: string } {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }
    const candidate = exception as { name?: unknown; code?: unknown };
    return (
      candidate.name === 'MulterError' && typeof candidate.code === 'string'
    );
  }

  private fileMessage(code: string): string {
    if (code === 'LIMIT_FILE_SIZE') {
      return 'File is too large. Maximum allowed size is 10 MB.';
    }
    if (code === 'LIMIT_UNEXPECTED_FILE') {
      return 'Unsupported file type. Please upload PDF, JPG, PNG, or XLSX.';
    }
    return USER_MESSAGES.FILE_UPLOAD_ERROR;
  }
}
