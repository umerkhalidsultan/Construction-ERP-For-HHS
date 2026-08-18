import { Prisma } from '@prisma/client';
import {
  AppError,
  ConflictAppError,
  NotFoundAppError,
  ValidationAppError,
} from './app-errors';
import { ErrorCode, USER_MESSAGES } from './error-codes';
import { fieldLabel } from './field-labels';
import { HttpStatus } from '@nestjs/common';

export function mapPrismaError(exception: unknown): AppError | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      const target = Array.isArray(exception.meta?.target)
        ? (exception.meta.target as string[])
        : [];
      const field = target.find((item) => item !== 'deletedAt') ?? target[0];
      if (
        field === 'email' ||
        field === 'personalEmail' ||
        field === 'companyEmail'
      ) {
        return new ConflictAppError(
          'A record with this email already exists.',
          { [field]: 'A record with this email already exists.' },
        );
      }
      if (field === 'employeeCode') {
        return new ConflictAppError(
          'An employee with this code already exists.',
          {
            employeeCode: 'An employee with this code already exists.',
          },
        );
      }
      if (field === 'companyCode') {
        return new ConflictAppError('A company with this code already exists.');
      }
      if (field === 'invoiceNumber') {
        return new ConflictAppError(
          'An invoice with this number already exists for this vendor.',
        );
      }
      const label = field ? fieldLabel(field) : 'record';
      return new ConflictAppError(
        `A record with this ${label.toLowerCase()} already exists.`,
      );
    }
    if (exception.code === 'P2003' || exception.code === 'P2014') {
      return new AppError(
        ErrorCode.CONFLICT_ERROR,
        'This record cannot be changed because other records depend on it.',
        HttpStatus.CONFLICT,
      );
    }
    if (exception.code === 'P2011') {
      const constraint = exception.meta?.constraint;
      const field = typeof constraint === 'string' ? constraint : 'field';
      return new ValidationAppError({
        [field]: `${fieldLabel(field)} is required.`,
      });
    }
    if (exception.code === 'P2000') {
      const columnName = exception.meta?.column_name;
      const field = typeof columnName === 'string' ? columnName : 'field';
      return new ValidationAppError({
        [field]: `${fieldLabel(field)} is too long.`,
      });
    }
    if (exception.code === 'P2025' || exception.code === 'P2015') {
      return new NotFoundAppError();
    }
    if (
      exception.code === 'P2024' ||
      exception.code === 'P1001' ||
      exception.code === 'P1002'
    ) {
      return new AppError(
        ErrorCode.DATABASE_ERROR,
        USER_MESSAGES.DATABASE_ERROR,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return new AppError(
      ErrorCode.DATABASE_ERROR,
      USER_MESSAGES.DATABASE_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  if (
    exception instanceof Prisma.PrismaClientInitializationError ||
    exception instanceof Prisma.PrismaClientRustPanicError
  ) {
    return new AppError(
      ErrorCode.DATABASE_ERROR,
      USER_MESSAGES.DATABASE_ERROR,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  if (exception instanceof Prisma.PrismaClientValidationError) {
    return new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Unable to save this record. Please review the form and try again.',
      HttpStatus.BAD_REQUEST,
    );
  }

  const databaseError = structuralDatabaseError(exception);
  if (databaseError) {
    return databaseError;
  }

  return null;
}

function structuralDatabaseError(exception: unknown): AppError | null {
  if (!exception || typeof exception !== 'object') return null;
  const candidate = exception as { code?: unknown; constraint?: unknown };
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  if (code === '23505') {
    return new ConflictAppError('This record already exists.');
  }
  if (code === '23503') {
    return new AppError(
      ErrorCode.CONFLICT_ERROR,
      'This record cannot be changed because other records depend on it.',
      HttpStatus.CONFLICT,
    );
  }
  if (code === '23502') {
    return new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Unable to save this record. Please review the required fields.',
      HttpStatus.BAD_REQUEST,
    );
  }
  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code.startsWith('08')
  ) {
    return new AppError(
      ErrorCode.DATABASE_ERROR,
      USER_MESSAGES.DATABASE_ERROR,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  return null;
}
