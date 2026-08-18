import {
  EmployeeAvailability,
  EmployeeDocumentType,
  EmployeeStatus,
  EntityStatus,
  Gender,
  MaritalStatus,
  Prisma,
  ProjectTeamRole,
} from '@prisma/client';

export interface EmployeeListCriteria {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  status?: EmployeeStatus;
  availability?: EmployeeAvailability;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  skillId?: string;
  projectId?: string;
  includeDeleted: boolean;
}

export interface EmployeeCreateData {
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  gender?: Gender;
  dateOfBirth?: Date;
  nationalId?: string;
  passportNumber?: string;
  nationality?: string;
  religion?: string;
  maritalStatus?: MaritalStatus;
  bloodGroup?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  personalEmail?: string;
  companyEmail?: string;
  photoUrl?: string;
  signatureUrl?: string;
  status?: EmployeeStatus;
  availability?: EmployeeAvailability;
  userId?: string;
  membershipId?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  teamId?: string;
  managerEmployeeId?: string;
  employmentTypeId: string;
  joiningDate: Date;
  confirmationDate?: Date;
  resignationDate?: Date;
  terminationDate?: Date;
}

export type EmployeeUpdateData = Partial<
  Omit<
    EmployeeCreateData,
    | 'employmentTypeId'
    | 'joiningDate'
    | 'branchId'
    | 'departmentId'
    | 'designationId'
    | 'teamId'
    | 'managerEmployeeId'
  >
> & { expectedUpdatedAt: Date };

export interface EmployeeTransferData {
  branchId?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  managerEmployeeId?: string | null;
  employmentTypeId?: string;
  effectiveDate: Date;
  reason: string;
}

export interface ProjectAssignmentData {
  projectId: string;
  role: ProjectTeamRole;
  assignedAt: Date;
  unassignedAt?: Date;
  allocationPct: Prisma.Decimal;
  workingHours?: Prisma.Decimal;
}

export interface SkillAssignmentData {
  skillId: string;
  proficiencyLevel?: number;
  yearsExperience?: Prisma.Decimal;
  notes?: string;
}

export interface CredentialData {
  name: string;
  number?: string;
  issueDate?: Date;
  expiryDate?: Date;
  issuingAuthority?: string;
  fileObjectId?: string;
  notes?: string;
}

export interface DocumentData {
  documentType: EmployeeDocumentType;
  title: string;
  fileObjectId?: string;
  documentNumber?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  notes?: string;
}

export interface CatalogData {
  code: string;
  name: string;
  description?: string;
  status?: EntityStatus;
}

export interface IWorkforceRepository {
  list(criteria: EmployeeListCriteria): Promise<unknown>;
  findDetail(companyId: string, employeeId: string): Promise<unknown>;
  findBasic(
    companyId: string,
    employeeId: string,
  ): Promise<{
    id: string;
    managerEmployeeId: string | null;
    updatedAt: Date;
    deletedAt: Date | null;
  } | null>;
  create(
    companyId: string,
    data: EmployeeCreateData,
    actorId: string,
  ): Promise<unknown>;
  update(
    companyId: string,
    employeeId: string,
    data: EmployeeUpdateData,
    actorId: string,
  ): Promise<unknown>;
  softDelete(
    companyId: string,
    employeeId: string,
    actorId: string,
  ): Promise<unknown>;
  transfer(
    companyId: string,
    employeeId: string,
    data: EmployeeTransferData,
    actorId: string,
  ): Promise<unknown>;
  assignProject(
    companyId: string,
    employeeId: string,
    data: ProjectAssignmentData,
    actorId: string,
  ): Promise<unknown>;
  endProjectAssignment(
    companyId: string,
    employeeId: string,
    assignmentId: string,
    endDate: Date,
    actorId: string,
  ): Promise<unknown>;
  assignSkill(
    companyId: string,
    employeeId: string,
    data: SkillAssignmentData,
    actorId: string,
  ): Promise<unknown>;
  removeSkill(
    companyId: string,
    employeeId: string,
    skillId: string,
    actorId: string,
  ): Promise<unknown>;
  addCertification(
    companyId: string,
    employeeId: string,
    data: CredentialData,
    actorId: string,
  ): Promise<unknown>;
  updateCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    data: Partial<CredentialData>,
    actorId: string,
  ): Promise<unknown>;
  deleteCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    actorId: string,
  ): Promise<unknown>;
  addLicense(
    companyId: string,
    employeeId: string,
    data: CredentialData,
    actorId: string,
  ): Promise<unknown>;
  updateLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    data: Partial<CredentialData>,
    actorId: string,
  ): Promise<unknown>;
  deleteLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    actorId: string,
  ): Promise<unknown>;
  addDocument(
    companyId: string,
    employeeId: string,
    data: DocumentData,
    actorId: string,
  ): Promise<unknown>;
  updateDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    data: Partial<DocumentData>,
    actorId: string,
  ): Promise<unknown>;
  deleteDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    actorId: string,
  ): Promise<unknown>;
  dashboard(companyId: string, employeeId: string): Promise<unknown>;
  organizationChart(companyId: string): Promise<unknown[]>;
  listEmploymentTypes(companyId: string): Promise<unknown[]>;
  listSkills(companyId: string): Promise<unknown[]>;
  createEmploymentType(
    companyId: string,
    data: CatalogData,
    actorId: string,
  ): Promise<unknown>;
  createSkill(
    companyId: string,
    data: CatalogData,
    actorId: string,
  ): Promise<unknown>;
  validateReferences(
    companyId: string,
    refs: Record<string, string | undefined>,
  ): Promise<string[]>;
  wouldCreateManagerCycle(
    companyId: string,
    employeeId: string,
    managerEmployeeId: string,
  ): Promise<boolean>;
  activeAllocation(
    companyId: string,
    employeeId: string,
    from: Date,
    to?: Date,
  ): Promise<number>;
}

export const WORKFORCE_REPOSITORY = Symbol('WORKFORCE_REPOSITORY');
