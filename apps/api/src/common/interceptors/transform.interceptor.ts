import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { randomUUID } from 'node:crypto';

interface ControllerResult<T> {
  message?: string;
  data?: T;
  pagination?: ApiResponse<T>['pagination'];
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const header = request.headers['x-request-id'];
    const requestId =
      (Array.isArray(header) ? header[0] : header) ?? randomUUID();

    return next.handle().pipe(
      map((value) => {
        const result =
          typeof value === 'object' && value !== null
            ? (value as ControllerResult<T>)
            : undefined;
        const data = result && 'data' in result ? (result.data ?? null) : value;
        return {
          status: 'success' as const,
          success: true,
          message: result?.message ?? 'Operation successful',
          data: this.jsonSafe(data) as T,
          pagination: result?.pagination,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }

  private jsonSafe(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.jsonSafe(item));
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof Prisma.Decimal) {
      return value.toString();
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.jsonSafe(item)]),
      );
    }
    return value;
  }
}
