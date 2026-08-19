import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma, ReportingLine } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IOrganizationRepository,
  OrganizationKind,
  OrganizationListCriteria,
  OrganizationMutationData,
  OrganizationRecord,
} from '../domain/organization.repository';

@Injectable()
export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    kind: OrganizationKind,
    companyId: string,
    criteria: OrganizationListCriteria,
  ) {
    const skip = (criteria.page - 1) * criteria.limit;
    const deletedAt = criteria.includeDeleted ? undefined : null;
    const common = { companyId, deletedAt, status: criteria.status };
    const search = criteria.search;
    let items: OrganizationRecord[];
    let total: number;

    switch (kind) {
      case 'branch': {
        const where: Prisma.BranchWhereInput = {
          ...common,
          ...(search
            ? {
                OR: [
                  { branchCode: { contains: search, mode: 'insensitive' } },
                  { name: { contains: search, mode: 'insensitive' } },
                ],
              }
            : undefined),
        };
        [items, total] = await this.prisma.$transaction([
          this.prisma.branch.findMany({
            where,
            skip,
            take: criteria.limit,
            orderBy: { name: 'asc' },
          }),
          this.prisma.branch.count({ where }),
        ]);
        break;
      }
      case 'department': {
        const where: Prisma.DepartmentWhereInput = {
          ...common,
          ...(search
            ? {
                OR: [
                  { departmentCode: { contains: search, mode: 'insensitive' } },
                  { name: { contains: search, mode: 'insensitive' } },
                ],
              }
            : undefined),
        };
        [items, total] = await this.prisma.$transaction([
          this.prisma.department.findMany({
            where,
            skip,
            take: criteria.limit,
            orderBy: { name: 'asc' },
          }),
          this.prisma.department.count({ where }),
        ]);
        break;
      }
      case 'designation': {
        const where = this.codedWhere<Prisma.DesignationWhereInput>(
          common,
          search,
        );
        [items, total] = await this.prisma.$transaction([
          this.prisma.designation.findMany({
            where,
            skip,
            take: criteria.limit,
            orderBy: [{ rank: 'asc' }, { name: 'asc' }],
          }),
          this.prisma.designation.count({ where }),
        ]);
        break;
      }
      case 'costCenter': {
        const where = this.codedWhere<Prisma.CostCenterWhereInput>(
          common,
          search,
        );
        [items, total] = await this.prisma.$transaction([
          this.prisma.costCenter.findMany({
            where,
            skip,
            take: criteria.limit,
            orderBy: { name: 'asc' },
          }),
          this.prisma.costCenter.count({ where }),
        ]);
        break;
      }
      case 'businessUnit': {
        const where = this.codedWhere<Prisma.BusinessUnitWhereInput>(
          common,
          search,
        );
        [items, total] = await this.prisma.$transaction([
          this.prisma.businessUnit.findMany({
            where,
            skip,
            take: criteria.limit,
            orderBy: { name: 'asc' },
          }),
          this.prisma.businessUnit.count({ where }),
        ]);
        break;
      }
      case 'region': {
        const where = this.codedWhere<Prisma.RegionWhereInput>(common, search);
        [items, total] = await this.prisma.$transaction([
          this.prisma.region.findMany({
            where,
            skip,
            take: criteria.limit,
            orderBy: { name: 'asc' },
          }),
          this.prisma.region.count({ where }),
        ]);
        break;
      }
      case 'team': {
        const where = this.codedWhere<Prisma.TeamWhereInput>(common, search);
        [items, total] = await this.prisma.$transaction([
          this.prisma.team.findMany({
            where,
            skip,
            take: criteria.limit,
            orderBy: { name: 'asc' },
          }),
          this.prisma.team.count({ where }),
        ]);
        break;
      }
    }
    return { items, total, page: criteria.page, limit: criteria.limit };
  }

  async find(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    includeDeleted = false,
  ): Promise<OrganizationRecord | null> {
    const where = {
      id: entityId,
      companyId,
      ...(includeDeleted ? undefined : { deletedAt: null }),
    };
    switch (kind) {
      case 'branch':
        return this.prisma.branch.findFirst({ where });
      case 'department':
        return this.prisma.department.findFirst({ where });
      case 'designation':
        return this.prisma.designation.findFirst({ where });
      case 'costCenter':
        return this.prisma.costCenter.findFirst({ where });
      case 'businessUnit':
        return this.prisma.businessUnit.findFirst({ where });
      case 'region':
        return this.prisma.region.findFirst({ where });
      case 'team':
        return this.prisma.team.findFirst({ where });
    }
  }

  async create(
    kind: OrganizationKind,
    companyId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<OrganizationRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const record = await this.createRecord(
        transaction,
        kind,
        companyId,
        data,
        actorId,
      );
      await this.audit.record(transaction, {
        companyId,
        action: `${this.entityName(kind)}.Create`,
        entity: this.entityName(kind),
        entityId: record.id,
        newValue: record,
      });
      return record;
    });
  }

  async update(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<OrganizationRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.findInTransaction(
        transaction,
        kind,
        companyId,
        entityId,
        false,
      );
      if (!previous) {
        throw new NotFoundException('Organization record was not found');
      }
      const record = await this.updateRecord(
        transaction,
        kind,
        entityId,
        data,
        actorId,
      );
      await this.audit.record(transaction, {
        companyId,
        action: `${this.entityName(kind)}.Update`,
        entity: this.entityName(kind),
        entityId,
        oldValue: previous,
        newValue: record,
      });
      return record;
    });
  }

  async softDelete(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    actorId: string,
  ): Promise<OrganizationRecord> {
    await this.assertNotInUse(kind, companyId, entityId);
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.findInTransaction(
        transaction,
        kind,
        companyId,
        entityId,
        false,
      );
      if (!previous) {
        throw new NotFoundException('Organization record was not found');
      }
      const record = await this.updateRecord(
        transaction,
        kind,
        entityId,
        {
          status: EntityStatus.INACTIVE,
          deletedAt: new Date(),
        },
        actorId,
      );
      await this.audit.record(transaction, {
        companyId,
        action: `${this.entityName(kind)}.Delete`,
        entity: this.entityName(kind),
        entityId,
        oldValue: previous,
        newValue: record,
      });
      return record;
    });
  }

  async restore(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    actorId: string,
  ): Promise<OrganizationRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.findInTransaction(
        transaction,
        kind,
        companyId,
        entityId,
        true,
      );
      if (!previous || !previous.deletedAt) {
        throw new NotFoundException(
          'Archived organization record was not found',
        );
      }
      const record = await this.updateRecord(
        transaction,
        kind,
        entityId,
        { status: EntityStatus.INACTIVE, deletedAt: null },
        actorId,
      );
      await this.audit.record(transaction, {
        companyId,
        action: `${this.entityName(kind)}.Restore`,
        entity: this.entityName(kind),
        entityId,
        oldValue: previous,
        newValue: record,
      });
      return record;
    });
  }

  async createReportingLine(
    companyId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<ReportingLine> {
    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.reportingLine.create({
        data: {
          ...(data as Prisma.ReportingLineUncheckedCreateInput),
          companyId,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'ReportingHierarchy.Create',
        entity: 'ReportingLine',
        entityId: record.id,
        newValue: record,
      });
      return record;
    });
  }

  findReportingLine(
    companyId: string,
    entityId: string,
  ): Promise<ReportingLine | null> {
    return this.prisma.reportingLine.findFirst({
      where: { id: entityId, companyId, deletedAt: null },
    });
  }

  async updateReportingLine(
    companyId: string,
    entityId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<ReportingLine> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.reportingLine.findFirstOrThrow({
        where: { id: entityId, companyId, deletedAt: null },
      });
      const record = await transaction.reportingLine.update({
        where: { id: entityId },
        data: {
          ...(data as Prisma.ReportingLineUncheckedUpdateInput),
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'ReportingHierarchy.Update',
        entity: 'ReportingLine',
        entityId,
        oldValue: previous,
        newValue: record,
      });
      return record;
    });
  }

  async deleteReportingLine(
    companyId: string,
    entityId: string,
    actorId: string,
  ): Promise<ReportingLine> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.reportingLine.findFirstOrThrow({
        where: { id: entityId, companyId, deletedAt: null },
      });
      const record = await transaction.reportingLine.update({
        where: { id: entityId },
        data: {
          deletedAt: new Date(),
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'ReportingHierarchy.Delete',
        entity: 'ReportingLine',
        entityId,
        oldValue: previous,
        newValue: record,
      });
      return record;
    });
  }

  async getOrganizationChart(companyId: string) {
    const [memberships, lines] = await this.prisma.$transaction([
      this.prisma.companyMembership.findMany({
        where: { companyId, status: 'ACTIVE', deletedAt: null },
        select: {
          id: true,
          employeeCode: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          designation: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
      }),
      this.prisma.reportingLine.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { memberships, lines };
  }

  async reportingPathExists(
    companyId: string,
    fromMembershipId: string,
    targetMembershipId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    let frontier = [fromMembershipId];
    while (frontier.length > 0) {
      if (frontier.includes(targetMembershipId)) {
        return true;
      }
      const unvisited = frontier.filter((id) => !visited.has(id));
      if (!unvisited.length) {
        return false;
      }
      unvisited.forEach((id) => visited.add(id));
      const lines = await this.prisma.reportingLine.findMany({
        where: {
          companyId,
          subordinateMembershipId: { in: unvisited },
          deletedAt: null,
        },
        select: { managerMembershipId: true },
      });
      frontier = lines.map((line) => line.managerMembershipId);
    }
    return false;
  }

  async hierarchyPathExists(
    kind: 'department' | 'costCenter',
    companyId: string,
    fromEntityId: string,
    targetEntityId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    let currentId: string | null = fromEntityId;
    while (currentId && !visited.has(currentId)) {
      if (currentId === targetEntityId) {
        return true;
      }
      visited.add(currentId);
      if (kind === 'department') {
        const record: { parentDepartmentId: string | null } | null =
          await this.prisma.department.findFirst({
            where: { id: currentId, companyId, deletedAt: null },
            select: { parentDepartmentId: true },
          });
        currentId = record?.parentDepartmentId ?? null;
      } else {
        const record: { parentCostCenterId: string | null } | null =
          await this.prisma.costCenter.findFirst({
            where: { id: currentId, companyId, deletedAt: null },
            select: { parentCostCenterId: true },
          });
        currentId = record?.parentCostCenterId ?? null;
      }
    }
    return false;
  }

  private async createRecord(
    transaction: Prisma.TransactionClient,
    kind: OrganizationKind,
    companyId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<OrganizationRecord> {
    const audit = { companyId, createdBy: actorId, updatedBy: actorId };
    switch (kind) {
      case 'branch':
        return transaction.branch.create({
          data: {
            ...(data as Prisma.BranchUncheckedCreateInput),
            ...audit,
          },
        });
      case 'department':
        return transaction.department.create({
          data: {
            ...(data as Prisma.DepartmentUncheckedCreateInput),
            ...audit,
          },
        });
      case 'designation':
        return transaction.designation.create({
          data: {
            ...(data as Prisma.DesignationUncheckedCreateInput),
            ...audit,
          },
        });
      case 'costCenter':
        return transaction.costCenter.create({
          data: {
            ...(data as Prisma.CostCenterUncheckedCreateInput),
            ...audit,
          },
        });
      case 'businessUnit':
        return transaction.businessUnit.create({
          data: {
            ...(data as Prisma.BusinessUnitUncheckedCreateInput),
            ...audit,
          },
        });
      case 'region':
        return transaction.region.create({
          data: {
            ...(data as Prisma.RegionUncheckedCreateInput),
            ...audit,
          },
        });
      case 'team':
        return transaction.team.create({
          data: {
            ...(data as Prisma.TeamUncheckedCreateInput),
            ...audit,
          },
        });
    }
  }

  private async updateRecord(
    transaction: Prisma.TransactionClient,
    kind: OrganizationKind,
    entityId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<OrganizationRecord> {
    const audit = { updatedBy: actorId };
    switch (kind) {
      case 'branch':
        return transaction.branch.update({
          where: { id: entityId },
          data: {
            ...(data as Prisma.BranchUncheckedUpdateInput),
            ...audit,
          },
        });
      case 'department':
        return transaction.department.update({
          where: { id: entityId },
          data: {
            ...(data as Prisma.DepartmentUncheckedUpdateInput),
            ...audit,
          },
        });
      case 'designation':
        return transaction.designation.update({
          where: { id: entityId },
          data: {
            ...(data as Prisma.DesignationUncheckedUpdateInput),
            ...audit,
          },
        });
      case 'costCenter':
        return transaction.costCenter.update({
          where: { id: entityId },
          data: {
            ...(data as Prisma.CostCenterUncheckedUpdateInput),
            ...audit,
          },
        });
      case 'businessUnit':
        return transaction.businessUnit.update({
          where: { id: entityId },
          data: {
            ...(data as Prisma.BusinessUnitUncheckedUpdateInput),
            ...audit,
          },
        });
      case 'region':
        return transaction.region.update({
          where: { id: entityId },
          data: {
            ...(data as Prisma.RegionUncheckedUpdateInput),
            ...audit,
          },
        });
      case 'team':
        return transaction.team.update({
          where: { id: entityId },
          data: {
            ...(data as Prisma.TeamUncheckedUpdateInput),
            ...audit,
          },
        });
    }
  }

  private async findInTransaction(
    transaction: Prisma.TransactionClient,
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    includeDeleted: boolean,
  ): Promise<OrganizationRecord | null> {
    const where = {
      id: entityId,
      companyId,
      ...(includeDeleted ? undefined : { deletedAt: null }),
    };
    switch (kind) {
      case 'branch':
        return transaction.branch.findFirst({ where });
      case 'department':
        return transaction.department.findFirst({ where });
      case 'designation':
        return transaction.designation.findFirst({ where });
      case 'costCenter':
        return transaction.costCenter.findFirst({ where });
      case 'businessUnit':
        return transaction.businessUnit.findFirst({ where });
      case 'region':
        return transaction.region.findFirst({ where });
      case 'team':
        return transaction.team.findFirst({ where });
    }
  }

  private async assertNotInUse(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
  ): Promise<void> {
    let references = 0;
    switch (kind) {
      case 'branch':
        references =
          (await this.prisma.companyMembership.count({
            where: { companyId, branchId: entityId, deletedAt: null },
          })) +
          (await this.prisma.team.count({
            where: { companyId, branchId: entityId, deletedAt: null },
          }));
        break;
      case 'department':
        references =
          (await this.prisma.companyMembership.count({
            where: { companyId, departmentId: entityId, deletedAt: null },
          })) +
          (await this.prisma.department.count({
            where: {
              companyId,
              parentDepartmentId: entityId,
              deletedAt: null,
            },
          }));
        break;
      case 'designation':
        references = await this.prisma.companyMembership.count({
          where: { companyId, designationId: entityId, deletedAt: null },
        });
        break;
      case 'costCenter':
        references = await this.prisma.costCenter.count({
          where: { companyId, parentCostCenterId: entityId, deletedAt: null },
        });
        break;
      case 'businessUnit':
        references = await this.prisma.branch.count({
          where: { companyId, businessUnitId: entityId, deletedAt: null },
        });
        break;
      case 'region':
        references = await this.prisma.branch.count({
          where: { companyId, regionId: entityId, deletedAt: null },
        });
        break;
      case 'team':
        references = await this.prisma.companyMembership.count({
          where: { companyId, teamId: entityId, deletedAt: null },
        });
        break;
    }
    if (references > 0) {
      throw new ConflictException(
        `${this.entityName(kind)} cannot be deleted while active records reference it`,
      );
    }
  }

  private codedWhere<T>(
    common: {
      companyId: string;
      deletedAt: Date | null | undefined;
      status: EntityStatus | undefined;
    },
    search?: string,
  ): T {
    return {
      ...common,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined),
    } as T;
  }

  private entityName(kind: OrganizationKind): string {
    const names: Record<OrganizationKind, string> = {
      branch: 'Branch',
      department: 'Department',
      designation: 'Designation',
      costCenter: 'CostCenter',
      businessUnit: 'BusinessUnit',
      region: 'Region',
      team: 'Team',
    };
    return names[kind];
  }
}
