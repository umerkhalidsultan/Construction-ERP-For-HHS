import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import {
  AssignProjectDto,
  AssignSkillDto,
  CreateCatalogItemDto,
  CreateCertificationDto,
  CreateEmployeeDocumentDto,
  CreateEmployeeDto,
  CreateLicenseDto,
  EmployeeQueryDto,
  TransferEmployeeDto,
  UpdateEmployeeDto,
  UpdateCertificationDto,
  UpdateEmployeeDocumentDto,
  UpdateLicenseDto,
} from '../dto/workforce.dto';

export interface IWorkforceService {
  list(
    companyId: string,
    query: EmployeeQueryDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  get(
    companyId: string,
    employeeId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  create(
    companyId: string,
    dto: CreateEmployeeDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  update(
    companyId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  delete(
    companyId: string,
    employeeId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  transfer(
    companyId: string,
    employeeId: string,
    dto: TransferEmployeeDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  assignProject(
    companyId: string,
    employeeId: string,
    dto: AssignProjectDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  endProjectAssignment(
    companyId: string,
    employeeId: string,
    assignmentId: string,
    endDate: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  assignSkill(
    companyId: string,
    employeeId: string,
    dto: AssignSkillDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  removeSkill(
    companyId: string,
    employeeId: string,
    skillId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  addCertification(
    companyId: string,
    employeeId: string,
    dto: CreateCertificationDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    dto: UpdateCertificationDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  addLicense(
    companyId: string,
    employeeId: string,
    dto: CreateLicenseDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    dto: UpdateLicenseDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  addDocument(
    companyId: string,
    employeeId: string,
    dto: CreateEmployeeDocumentDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    dto: UpdateEmployeeDocumentDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  dashboard(
    companyId: string,
    employeeId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  organizationChart(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown[]>;
  listEmploymentTypes(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown[]>;
  listSkills(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown[]>;
  createEmploymentType(
    companyId: string,
    dto: CreateCatalogItemDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createSkill(
    companyId: string,
    dto: CreateCatalogItemDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
}

export const WORKFORCE_SERVICE = Symbol('WORKFORCE_SERVICE');
