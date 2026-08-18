import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import type {
  IOrganizationRepository,
  OrganizationKind,
  OrganizationMutationData,
} from '../domain/organization.repository';
import { ORGANIZATION_REPOSITORY } from '../domain/organization.repository';
import {
  CreateReportingLineDto,
  OrganizationQueryDto,
  UpdateReportingLineDto,
} from '../dto/organization.dto';
import { IOrganizationService } from './organization.service.interface';

interface ChartMembership {
  id: string;
  [key: string]: unknown;
}

interface ChartNode extends ChartMembership {
  reports: ChartNode[];
}

@Injectable()
export class OrganizationService implements IOrganizationService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organization: IOrganizationRepository,
  ) {}

  async list(
    kind: OrganizationKind,
    companyId: string,
    query: OrganizationQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    if (query.includeDeleted && !principal.isPlatformAdmin) {
      throw new ForbiddenException(
        'Only platform administrators can view archived records',
      );
    }
    const result = await this.organization.list(kind, companyId, query);
    return {
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async get(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    const record = await this.organization.find(
      kind,
      companyId,
      entityId,
      principal.isPlatformAdmin,
    );
    if (!record) {
      throw new NotFoundException('Organization record was not found');
    }
    return record;
  }

  async create(
    kind: OrganizationKind,
    companyId: string,
    data: OrganizationMutationData,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.organization.create(kind, companyId, data, principal.userId);
  }

  async update(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    data: OrganizationMutationData,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.assertNoHierarchyCycle(kind, companyId, entityId, data);
    return this.organization.update(
      kind,
      companyId,
      entityId,
      data,
      principal.userId,
    );
  }

  async delete(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.organization.softDelete(
      kind,
      companyId,
      entityId,
      principal.userId,
    );
  }

  async restore(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.organization.restore(
      kind,
      companyId,
      entityId,
      principal.userId,
    );
  }

  async createReportingLine(
    companyId: string,
    dto: CreateReportingLineDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.assertNoReportingCycle(
      companyId,
      dto.subordinateMembershipId,
      dto.managerMembershipId,
    );
    return this.organization.createReportingLine(
      companyId,
      this.reportingData(dto),
      principal.userId,
    );
  }

  async updateReportingLine(
    companyId: string,
    entityId: string,
    dto: UpdateReportingLineDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    const existing = await this.organization.findReportingLine(
      companyId,
      entityId,
    );
    if (!existing) {
      throw new NotFoundException('Reporting line was not found');
    }
    const subordinate =
      dto.subordinateMembershipId ?? existing.subordinateMembershipId;
    const manager = dto.managerMembershipId ?? existing.managerMembershipId;
    await this.assertNoReportingCycle(companyId, subordinate, manager);
    return this.organization.updateReportingLine(
      companyId,
      entityId,
      this.reportingData(dto),
      principal.userId,
    );
  }

  async deleteReportingLine(
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.organization.deleteReportingLine(
      companyId,
      entityId,
      principal.userId,
    );
  }

  async organizationChart(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    const chart = await this.organization.getOrganizationChart(companyId);
    const nodes = new Map<string, ChartNode>(
      (chart.memberships as ChartMembership[]).map((membership) => [
        membership.id,
        { ...membership, reports: [] },
      ]),
    );
    const childIds = new Set<string>();
    for (const line of chart.lines.filter((entry) => entry.isPrimary)) {
      const manager = nodes.get(line.managerMembershipId);
      const subordinate = nodes.get(line.subordinateMembershipId);
      if (manager && subordinate) {
        manager.reports.push(subordinate);
        childIds.add(subordinate.id);
      }
    }
    return {
      roots: [...nodes.values()].filter((node) => !childIds.has(node.id)),
      secondaryReportingLines: chart.lines.filter((line) => !line.isPrimary),
    };
  }

  private async assertNoHierarchyCycle(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    data: OrganizationMutationData,
  ): Promise<void> {
    const parentId =
      kind === 'department'
        ? data.parentDepartmentId
        : kind === 'costCenter'
          ? data.parentCostCenterId
          : undefined;
    if (typeof parentId !== 'string') {
      return;
    }
    if (
      parentId === entityId ||
      (await this.organization.hierarchyPathExists(
        kind as 'department' | 'costCenter',
        companyId,
        parentId,
        entityId,
      ))
    ) {
      throw new ConflictException(
        'Organization hierarchy cannot contain a cycle',
      );
    }
  }

  private async assertNoReportingCycle(
    companyId: string,
    subordinateMembershipId: string,
    managerMembershipId: string,
  ): Promise<void> {
    if (
      subordinateMembershipId === managerMembershipId ||
      (await this.organization.reportingPathExists(
        companyId,
        managerMembershipId,
        subordinateMembershipId,
      ))
    ) {
      throw new ConflictException('Reporting hierarchy cannot contain a cycle');
    }
  }

  private reportingData(
    dto: CreateReportingLineDto | UpdateReportingLineDto,
  ): OrganizationMutationData {
    return {
      ...dto,
      effectiveFrom: dto.effectiveFrom
        ? new Date(`${dto.effectiveFrom}T00:00:00.000Z`)
        : undefined,
      effectiveTo: dto.effectiveTo
        ? new Date(`${dto.effectiveTo}T00:00:00.000Z`)
        : undefined,
    };
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
