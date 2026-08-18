import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import {
  OrganizationKind,
  OrganizationMutationData,
} from '../domain/organization.repository';
import {
  CreateReportingLineDto,
  OrganizationQueryDto,
  UpdateReportingLineDto,
} from '../dto/organization.dto';

export interface IOrganizationService {
  list(
    kind: OrganizationKind,
    companyId: string,
    query: OrganizationQueryDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  get(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  create(
    kind: OrganizationKind,
    companyId: string,
    data: OrganizationMutationData,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  update(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    data: OrganizationMutationData,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  delete(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  restore(
    kind: OrganizationKind,
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createReportingLine(
    companyId: string,
    dto: CreateReportingLineDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateReportingLine(
    companyId: string,
    entityId: string,
    dto: UpdateReportingLineDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteReportingLine(
    companyId: string,
    entityId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  organizationChart(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
}

export const ORGANIZATION_SERVICE = Symbol('ORGANIZATION_SERVICE');
