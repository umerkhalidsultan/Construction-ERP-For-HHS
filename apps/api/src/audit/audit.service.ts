import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../common/context/request-context.service';
import { AuditEntry, IAuditService } from './audit.interface';

const SECRET_KEYS = new Set([
  'password',
  'refreshToken',
  'refreshTokenHash',
  'accessToken',
  'secret',
  'secretAccessKey',
  'apiKey',
]);

@Injectable()
export class AuditService implements IAuditService {
  constructor(private readonly context: RequestContextService) {}

  async record(
    transaction: Prisma.TransactionClient,
    entry: AuditEntry,
  ): Promise<void> {
    const request = this.context.get();
    const actorId = request?.principal?.userId ?? null;

    await transaction.auditLog.create({
      data: {
        companyId: entry.companyId ?? request?.principal?.companyId ?? null,
        userId: actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValue: this.toJson(entry.oldValue),
        newValue: this.toJson(entry.newValue),
        ipAddress: request?.ipAddress,
        browser: request?.userAgent,
        requestId: request?.requestId,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }
    return JSON.parse(
      JSON.stringify(value, (key, nestedValue: unknown) => {
        if (SECRET_KEYS.has(key)) {
          return '[REDACTED]';
        }
        return typeof nestedValue === 'bigint'
          ? nestedValue.toString()
          : nestedValue;
      }),
    ) as Prisma.InputJsonValue;
  }
}
