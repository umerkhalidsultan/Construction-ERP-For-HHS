import {
  Branch,
  BusinessUnit,
  CostCenter,
  Department,
  Designation,
  EntityStatus,
  Region,
  ReportingLine,
  Team,
} from '@prisma/client';

export type OrganizationKind =
  | 'branch'
  | 'department'
  | 'designation'
  | 'costCenter'
  | 'businessUnit'
  | 'region'
  | 'team';

export type OrganizationRecord =
  Branch | Department | Designation | CostCenter | BusinessUnit | Region | Team;

export interface OrganizationListCriteria {
  page: number;
  limit: number;
  search?: string;
  status?: EntityStatus;
  includeDeleted: boolean;
}

export interface OrganizationMutationData {
  name?: unknown;
  code?: unknown;
  branchCode?: unknown;
  departmentCode?: unknown;
  status?: unknown;
  deletedAt?: unknown;
  parentDepartmentId?: unknown;
  parentCostCenterId?: unknown;
  subordinateMembershipId?: unknown;
  managerMembershipId?: unknown;
  effectiveFrom?: unknown;
  effectiveTo?: unknown;
}

export interface IOrganizationRepository {
  list(
    kind: OrganizationKind,
    companyId: string,
    criteria: OrganizationListCriteria,
  ): Promise<{
    items: OrganizationRecord[];
    total: number;
    page: number;
    limit: number;
  }>;
  find(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    includeDeleted?: boolean,
  ): Promise<OrganizationRecord | null>;
  create(
    kind: OrganizationKind,
    companyId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<OrganizationRecord>;
  update(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<OrganizationRecord>;
  softDelete(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    actorId: string,
  ): Promise<OrganizationRecord>;
  restore(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    actorId: string,
  ): Promise<OrganizationRecord>;
  createReportingLine(
    companyId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<ReportingLine>;
  findReportingLine(
    companyId: string,
    entityId: string,
  ): Promise<ReportingLine | null>;
  updateReportingLine(
    companyId: string,
    entityId: string,
    data: OrganizationMutationData,
    actorId: string,
  ): Promise<ReportingLine>;
  deleteReportingLine(
    companyId: string,
    entityId: string,
    actorId: string,
  ): Promise<ReportingLine>;
  getOrganizationChart(companyId: string): Promise<{
    memberships: unknown[];
    lines: ReportingLine[];
  }>;
  reportingPathExists(
    companyId: string,
    fromMembershipId: string,
    targetMembershipId: string,
  ): Promise<boolean>;
  hierarchyPathExists(
    kind: 'department' | 'costCenter',
    companyId: string,
    fromEntityId: string,
    targetEntityId: string,
  ): Promise<boolean>;
}

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');
