import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { firstValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

function contextWithHeaders(headers: Record<string, string> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

function handlerReturning(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('serializes Prisma.Decimal fields to plain strings instead of internal digit arrays', async () => {
    const response = await firstValueFrom(
      interceptor.intercept(
        contextWithHeaders(),
        handlerReturning({
          data: {
            estimatedBudget: new Prisma.Decimal('500000'),
            completionPercentage: new Prisma.Decimal('0'),
          },
        }),
      ),
    );

    expect(response.data).toEqual({
      estimatedBudget: '500000',
      completionPercentage: '0',
    });
  });

  it('serializes Decimal fields nested inside arrays', async () => {
    const response = await firstValueFrom(
      interceptor.intercept(
        contextWithHeaders(),
        handlerReturning({
          data: [{ estimatedBudget: new Prisma.Decimal('123.45') }],
        }),
      ),
    );

    expect(response.data).toEqual([{ estimatedBudget: '123.45' }]);
  });

  it('still serializes bigint and Date values correctly', async () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const response = await firstValueFrom(
      interceptor.intercept(
        contextWithHeaders(),
        handlerReturning({ data: { storageLimit: 10n, createdAt: date } }),
      ),
    );

    expect(response.data).toEqual({
      storageLimit: '10',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('wraps the payload in the standard success envelope', async () => {
    const response = await firstValueFrom(
      interceptor.intercept(
        contextWithHeaders({ 'x-request-id': 'req-1' }),
        handlerReturning({
          message: 'Project created successfully',
          data: { id: 'p1' },
        }),
      ),
    );

    expect(response.status).toBe('success');
    expect(response.message).toBe('Project created successfully');
    expect(response.requestId).toBe('req-1');
  });
});
