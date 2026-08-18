import { Prisma } from '@prisma/client';

export interface AuditEntry {
  companyId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface IAuditService {
  record(
    transaction: Prisma.TransactionClient,
    entry: AuditEntry,
  ): Promise<void>;
}

export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');
