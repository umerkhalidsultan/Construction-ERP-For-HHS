import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentSequence,
  EntityStatus,
  Prisma,
  SequenceResetPolicy,
} from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AllocateDocumentNumberDto,
  CreateDocumentSequenceDto,
  UpdateDocumentSequenceDto,
} from '../dto/document-sequence.dto';
import { IDocumentNumberingService } from './document-numbering.service.interface';

@Injectable()
export class DocumentNumberingService implements IDocumentNumberingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    return this.prisma.documentSequence.findMany({
      where: { companyId, deletedAt: null },
      include: {
        branch: { select: { id: true, branchCode: true, name: true } },
      },
      orderBy: [{ documentType: 'asc' }, { branchId: 'asc' }],
    });
  }

  async create(
    companyId: string,
    dto: CreateDocumentSequenceDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    this.validateTemplate(dto.prefixTemplate);
    const duplicate = await this.prisma.documentSequence.findFirst({
      where: {
        companyId,
        documentType: dto.documentType,
        branchId: dto.branchId ?? null,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'A numbering rule already exists for this company, document type, and branch',
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const sequence = await transaction.documentSequence.create({
        data: {
          companyId,
          branchId: dto.branchId,
          documentType: dto.documentType,
          prefixTemplate: dto.prefixTemplate,
          padding: dto.padding,
          resetPolicy: dto.resetPolicy,
          status: dto.status,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'DocumentSequence.Create',
        entity: 'DocumentSequence',
        entityId: sequence.id,
        newValue: sequence,
      });
      return sequence;
    });
  }

  async update(
    companyId: string,
    sequenceId: string,
    dto: UpdateDocumentSequenceDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    if (dto.prefixTemplate) {
      this.validateTemplate(dto.prefixTemplate);
    }
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.documentSequence.findFirstOrThrow({
        where: { id: sequenceId, companyId, deletedAt: null },
      });
      const sequence = await transaction.documentSequence.update({
        where: { id: sequenceId },
        data: { ...dto, updatedBy: principal.userId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'DocumentSequence.Update',
        entity: 'DocumentSequence',
        entityId: sequenceId,
        oldValue: previous,
        newValue: sequence,
      });
      return sequence;
    });
  }

  async delete(
    companyId: string,
    sequenceId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.documentSequence.findFirstOrThrow({
        where: { id: sequenceId, companyId, deletedAt: null },
      });
      const sequence = await transaction.documentSequence.update({
        where: { id: sequenceId },
        data: {
          status: EntityStatus.INACTIVE,
          deletedAt: new Date(),
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'DocumentSequence.Delete',
        entity: 'DocumentSequence',
        entityId: sequenceId,
        oldValue: previous,
        newValue: sequence,
      });
      return sequence;
    });
  }

  async allocate(
    companyId: string,
    dto: AllocateDocumentNumberDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    const sequence = await this.prisma.documentSequence.findFirst({
      where: {
        companyId,
        branchId: dto.branchId ?? null,
        documentType: dto.documentType,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      include: { branch: { select: { branchCode: true } } },
    });
    if (!sequence) {
      throw new NotFoundException(
        'Active document numbering rule was not found',
      );
    }

    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw(
          Prisma.sql`SELECT "id" FROM "document_sequences" WHERE "id" = ${sequence.id}::uuid FOR UPDATE`,
        );
        const current = await transaction.documentSequence.findUniqueOrThrow({
          where: { id: sequence.id },
          include: { branch: { select: { branchCode: true } } },
        });
        const now = new Date();
        const period = await this.periodFor(
          transaction,
          companyId,
          current.resetPolicy,
          now,
        );
        const numericValue =
          current.currentPeriod === period ? current.nextNumber : 1n;
        const updated = await transaction.documentSequence.update({
          where: { id: current.id },
          data: {
            currentPeriod: period,
            nextNumber: numericValue + 1n,
            updatedBy: principal.userId,
          },
        });
        const value = this.formatNumber(current, numericValue, period, now);
        await this.audit.record(transaction, {
          companyId,
          action: 'DocumentSequence.Allocate',
          entity: 'DocumentSequence',
          entityId: current.id,
          oldValue: current,
          newValue: { ...updated, allocatedValue: value },
        });
        return {
          value,
          sequenceId: current.id,
          numericValue: numericValue.toString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async periodFor(
    transaction: Prisma.TransactionClient,
    companyId: string,
    resetPolicy: SequenceResetPolicy,
    date: Date,
  ): Promise<string> {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    if (resetPolicy === SequenceResetPolicy.NEVER) {
      return 'GLOBAL';
    }
    if (resetPolicy === SequenceResetPolicy.MONTHLY) {
      return `${year}-${month}`;
    }
    if (resetPolicy === SequenceResetPolicy.YEARLY) {
      return String(year);
    }
    const settings = await transaction.companySettings.findUnique({
      where: { companyId },
      select: { financialYearStart: true },
    });
    const [startMonth, startDay] = (settings?.financialYearStart ?? '01-01')
      .split('-')
      .map(Number);
    const start = new Date(Date.UTC(year, startMonth - 1, startDay));
    const fiscalYear = date < start ? year - 1 : year;
    return `FY${fiscalYear}`;
  }

  private formatNumber(
    sequence: DocumentSequence & { branch?: { branchCode: string } | null },
    numericValue: bigint,
    period: string,
    date: Date,
  ): string {
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const prefix = sequence.prefixTemplate
      .replaceAll('{YYYY}', year)
      .replaceAll('{YY}', year.slice(-2))
      .replaceAll('{MM}', month)
      .replaceAll('{FY}', period)
      .replaceAll('{BRANCH}', sequence.branch?.branchCode ?? '');
    return `${prefix}${numericValue.toString().padStart(sequence.padding, '0')}`;
  }

  private validateTemplate(template: string): void {
    const unsupported = template
      .match(/\{([^}]+)\}/g)
      ?.filter(
        (token) =>
          !['{YYYY}', '{YY}', '{MM}', '{FY}', '{BRANCH}'].includes(token),
      );
    if (unsupported?.length) {
      throw new ConflictException(
        `Unsupported numbering template token: ${unsupported.join(', ')}`,
      );
    }
  }

  private assertCompanyAccess(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): void {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId) {
      throw new ForbiddenException('Cross-company access is denied');
    }
  }
}
