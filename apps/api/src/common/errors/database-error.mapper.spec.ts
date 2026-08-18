import { Prisma } from '@prisma/client';
import { mapPrismaError } from './database-error.mapper';
import { ErrorCode } from './error-codes';

describe('mapPrismaError', () => {
  it('maps unique email conflicts without exposing SQL', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: '6.0.0',
      meta: { target: ['email'] },
    });
    const mapped = mapPrismaError(error);
    expect(mapped?.code).toBe(ErrorCode.DUPLICATE_RECORD);
    expect(mapped?.message).toBe('A record with this email already exists.');
    expect(mapped?.message).not.toMatch(/P2002|unique/i);
  });

  it('maps missing records to a generic not-found message', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Missing', {
      code: 'P2025',
      clientVersion: '6.0.0',
    });
    expect(mapPrismaError(error)?.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('never returns Prisma validation text to callers', () => {
    const error = new Prisma.PrismaClientValidationError(
      'Argument x is missing',
      {
        clientVersion: '6.0.0',
      },
    );
    const mapped = mapPrismaError(error);
    expect(mapped?.message).not.toContain('Argument');
    expect(mapped?.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('maps raw SQL constraint and connection failures structurally', () => {
    expect(
      mapPrismaError({ code: '23505', detail: 'duplicate key' })?.code,
    ).toBe(ErrorCode.DUPLICATE_RECORD);
    expect(mapPrismaError({ code: '23503', detail: 'foreign key' })?.code).toBe(
      ErrorCode.CONFLICT_ERROR,
    );
    expect(mapPrismaError({ code: 'ECONNREFUSED' })?.code).toBe(
      ErrorCode.DATABASE_ERROR,
    );
  });
});
