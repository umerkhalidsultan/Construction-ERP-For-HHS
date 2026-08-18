import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { WORKFORCE_REPOSITORY } from '../domain/workforce.repository';
import type {
  EmployeeCreateData,
  EmployeeUpdateData,
  IWorkforceRepository,
} from '../domain/workforce.repository';
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
import { IWorkforceService } from './workforce.service.interface';

@Injectable()
export class WorkforceService implements IWorkforceService {
  constructor(
    @Inject(WORKFORCE_REPOSITORY)
    private readonly repository: IWorkforceRepository,
  ) {}

  list(
    companyId: string,
    query: EmployeeQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    return this.repository.list({ companyId, ...query });
  }

  async get(
    companyId: string,
    employeeId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    return this.requireEmployee(companyId, employeeId);
  }

  async create(
    companyId: string,
    dto: CreateEmployeeDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    this.validateEmployeeDates(dto);
    await this.validateReferences(companyId, {
      userId: dto.userId,
      membershipId: dto.membershipId,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      teamId: dto.teamId,
      managerEmployeeId: dto.managerEmployeeId,
      employmentTypeId: dto.employmentTypeId,
    });
    return this.repository.create(
      companyId,
      this.mapEmployee(dto) as EmployeeCreateData,
      principal.userId,
    );
  }

  async update(
    companyId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    this.rejectOrganizationPatch(dto);
    this.validateEmployeeDates(dto);
    await this.validateReferences(companyId, {
      userId: dto.userId,
      membershipId: dto.membershipId,
    });
    const mapped = this.mapEmployee(dto) as Omit<
      EmployeeUpdateData,
      'expectedUpdatedAt'
    >;
    return this.repository.update(
      companyId,
      employeeId,
      {
        ...mapped,
        expectedUpdatedAt: this.date(dto.expectedUpdatedAt),
      },
      principal.userId,
    );
  }

  async delete(
    companyId: string,
    employeeId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    return this.repository.softDelete(companyId, employeeId, principal.userId);
  }

  async transfer(
    companyId: string,
    employeeId: string,
    dto: TransferEmployeeDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    const effectiveDate = this.date(dto.effectiveDate);
    if (dto.managerEmployeeId === employeeId)
      throw new BadRequestException('An employee cannot manage themself');
    await this.validateReferences(companyId, {
      branchId: dto.branchId ?? undefined,
      departmentId: dto.departmentId ?? undefined,
      designationId: dto.designationId ?? undefined,
      managerEmployeeId: dto.managerEmployeeId ?? undefined,
      employmentTypeId: dto.employmentTypeId,
    });
    if (
      dto.managerEmployeeId &&
      (await this.repository.wouldCreateManagerCycle(
        companyId,
        employeeId,
        dto.managerEmployeeId,
      ))
    ) {
      throw new BadRequestException(
        'The reporting assignment would create a management cycle',
      );
    }
    return this.repository.transfer(
      companyId,
      employeeId,
      { ...dto, effectiveDate },
      principal.userId,
    );
  }

  async assignProject(
    companyId: string,
    employeeId: string,
    dto: AssignProjectDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    await this.validateReferences(companyId, { projectId: dto.projectId });
    const assignedAt = this.date(dto.assignedAt);
    const unassignedAt = dto.unassignedAt
      ? this.date(dto.unassignedAt)
      : undefined;
    if (unassignedAt && unassignedAt < assignedAt)
      throw new BadRequestException(
        'Unassignment date cannot be before assignment date',
      );
    const allocationPct = dto.allocationPct ?? 100;
    const active = await this.repository.activeAllocation(
      companyId,
      employeeId,
      assignedAt,
      unassignedAt,
    );
    if (active + allocationPct > 100)
      throw new ConflictException(
        `Project allocation would exceed 100% (currently ${active}%)`,
      );
    return this.repository.assignProject(
      companyId,
      employeeId,
      {
        projectId: dto.projectId,
        role: dto.role,
        assignedAt,
        unassignedAt,
        allocationPct: new Prisma.Decimal(allocationPct),
        workingHours:
          dto.workingHours === undefined
            ? undefined
            : new Prisma.Decimal(dto.workingHours),
      },
      principal.userId,
    );
  }

  async endProjectAssignment(
    companyId: string,
    employeeId: string,
    assignmentId: string,
    endDate: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    return this.repository.endProjectAssignment(
      companyId,
      employeeId,
      assignmentId,
      this.date(endDate),
      principal.userId,
    );
  }

  async assignSkill(
    companyId: string,
    employeeId: string,
    dto: AssignSkillDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    await this.validateReferences(companyId, { skillId: dto.skillId });
    return this.repository.assignSkill(
      companyId,
      employeeId,
      {
        skillId: dto.skillId,
        proficiencyLevel: dto.proficiencyLevel,
        yearsExperience:
          dto.yearsExperience === undefined
            ? undefined
            : new Prisma.Decimal(dto.yearsExperience),
        notes: dto.notes,
      },
      principal.userId,
    );
  }

  async removeSkill(
    companyId: string,
    employeeId: string,
    skillId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    return this.repository.removeSkill(
      companyId,
      employeeId,
      skillId,
      principal.userId,
    );
  }

  addCertification(
    companyId: string,
    employeeId: string,
    dto: CreateCertificationDto,
    principal: AuthenticatedPrincipal,
  ) {
    return this.addCredential(
      'certification',
      companyId,
      employeeId,
      dto,
      principal,
    );
  }

  addLicense(
    companyId: string,
    employeeId: string,
    dto: CreateLicenseDto,
    principal: AuthenticatedPrincipal,
  ) {
    return this.addCredential('license', companyId, employeeId, dto, principal);
  }

  updateCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    dto: UpdateCertificationDto,
    principal: AuthenticatedPrincipal,
  ) {
    return this.updateCredential(
      'certification',
      companyId,
      employeeId,
      certificationId,
      dto,
      principal,
    );
  }

  async deleteCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    return this.repository.deleteCertification(
      companyId,
      employeeId,
      certificationId,
      principal.userId,
    );
  }

  updateLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    dto: UpdateLicenseDto,
    principal: AuthenticatedPrincipal,
  ) {
    return this.updateCredential(
      'license',
      companyId,
      employeeId,
      licenseId,
      dto,
      principal,
    );
  }

  async deleteLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    return this.repository.deleteLicense(
      companyId,
      employeeId,
      licenseId,
      principal.userId,
    );
  }

  async addDocument(
    companyId: string,
    employeeId: string,
    dto: CreateEmployeeDocumentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    await this.validateReferences(companyId, {
      fileObjectId: dto.fileObjectId,
    });
    const issuedAt = dto.issuedAt ? this.date(dto.issuedAt) : undefined;
    const expiresAt = dto.expiresAt ? this.date(dto.expiresAt) : undefined;
    if (issuedAt && expiresAt && expiresAt < issuedAt)
      throw new BadRequestException(
        'Document expiry date cannot be before issue date',
      );
    return this.repository.addDocument(
      companyId,
      employeeId,
      { ...dto, issuedAt, expiresAt },
      principal.userId,
    );
  }

  async updateDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    dto: UpdateEmployeeDocumentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    await this.validateReferences(companyId, {
      fileObjectId: dto.fileObjectId,
    });
    const issuedAt = dto.issuedAt ? this.date(dto.issuedAt) : undefined;
    const expiresAt = dto.expiresAt ? this.date(dto.expiresAt) : undefined;
    if (issuedAt && expiresAt && expiresAt < issuedAt)
      throw new BadRequestException(
        'Document expiry date cannot be before issue date',
      );
    return this.repository.updateDocument(
      companyId,
      employeeId,
      documentId,
      { ...dto, issuedAt, expiresAt },
      principal.userId,
    );
  }

  async deleteDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    return this.repository.deleteDocument(
      companyId,
      employeeId,
      documentId,
      principal.userId,
    );
  }

  async dashboard(
    companyId: string,
    employeeId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    const result = await this.repository.dashboard(companyId, employeeId);
    if (!result) throw new NotFoundException('Employee not found');
    return result;
  }

  organizationChart(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertTenant(companyId, principal);
    return this.repository.organizationChart(companyId);
  }

  listEmploymentTypes(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertTenant(companyId, principal);
    return this.repository.listEmploymentTypes(companyId);
  }

  listSkills(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertTenant(companyId, principal);
    return this.repository.listSkills(companyId);
  }

  createEmploymentType(
    companyId: string,
    dto: CreateCatalogItemDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    return this.repository.createEmploymentType(
      companyId,
      dto,
      principal.userId,
    );
  }

  createSkill(
    companyId: string,
    dto: CreateCatalogItemDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    return this.repository.createSkill(companyId, dto, principal.userId);
  }

  private async addCredential(
    kind: 'certification' | 'license',
    companyId: string,
    employeeId: string,
    dto: CreateCertificationDto | CreateLicenseDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    await this.validateReferences(companyId, {
      fileObjectId: dto.fileObjectId,
    });
    const issueDate = dto.issueDate ? this.date(dto.issueDate) : undefined;
    const expiryDate = dto.expiryDate ? this.date(dto.expiryDate) : undefined;
    if (issueDate && expiryDate && expiryDate < issueDate)
      throw new BadRequestException('Expiry date cannot be before issue date');
    const data = {
      name:
        kind === 'certification'
          ? (dto as CreateCertificationDto).name
          : (dto as CreateLicenseDto).licenseType,
      number:
        kind === 'certification'
          ? (dto as CreateCertificationDto).certificationNo
          : (dto as CreateLicenseDto).licenseNumber,
      issueDate,
      expiryDate,
      issuingAuthority: dto.issuingAuthority,
      fileObjectId: dto.fileObjectId,
      notes: dto.notes,
    };
    return kind === 'certification'
      ? this.repository.addCertification(
          companyId,
          employeeId,
          data,
          principal.userId,
        )
      : this.repository.addLicense(
          companyId,
          employeeId,
          data,
          principal.userId,
        );
  }

  private async updateCredential(
    kind: 'certification' | 'license',
    companyId: string,
    employeeId: string,
    credentialId: string,
    dto: UpdateCertificationDto | UpdateLicenseDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(companyId, principal);
    await this.requireEmployee(companyId, employeeId);
    await this.validateReferences(companyId, {
      fileObjectId: dto.fileObjectId,
    });
    const issueDate = dto.issueDate ? this.date(dto.issueDate) : undefined;
    const expiryDate = dto.expiryDate ? this.date(dto.expiryDate) : undefined;
    if (issueDate && expiryDate && expiryDate < issueDate)
      throw new BadRequestException('Expiry date cannot be before issue date');
    const data = {
      name:
        kind === 'certification'
          ? (dto as UpdateCertificationDto).name
          : (dto as UpdateLicenseDto).licenseType,
      number:
        kind === 'certification'
          ? (dto as UpdateCertificationDto).certificationNo
          : (dto as UpdateLicenseDto).licenseNumber,
      issueDate,
      expiryDate,
      issuingAuthority: dto.issuingAuthority,
      fileObjectId: dto.fileObjectId,
      notes: dto.notes,
    };
    return kind === 'certification'
      ? this.repository.updateCertification(
          companyId,
          employeeId,
          credentialId,
          data,
          principal.userId,
        )
      : this.repository.updateLicense(
          companyId,
          employeeId,
          credentialId,
          data,
          principal.userId,
        );
  }

  private assertTenant(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): void {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId) {
      throw new ForbiddenException(
        'Cross-company workforce access is not allowed',
      );
    }
  }

  private async requireEmployee(
    companyId: string,
    employeeId: string,
  ): Promise<unknown> {
    const employee = await this.repository.findDetail(companyId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async validateReferences(
    companyId: string,
    refs: Record<string, string | undefined>,
  ): Promise<void> {
    const failures = await this.repository.validateReferences(companyId, refs);
    if (failures.length)
      throw new BadRequestException(
        `Invalid or cross-company references: ${failures.join(', ')}`,
      );
  }

  private validateEmployeeDates(dto: Partial<CreateEmployeeDto>): void {
    const joining = dto.joiningDate ? this.date(dto.joiningDate) : undefined;
    const confirmation = dto.confirmationDate
      ? this.date(dto.confirmationDate)
      : undefined;
    const resignation = dto.resignationDate
      ? this.date(dto.resignationDate)
      : undefined;
    const termination = dto.terminationDate
      ? this.date(dto.terminationDate)
      : undefined;
    if (joining && confirmation && confirmation < joining)
      throw new BadRequestException(
        'Confirmation date cannot be before joining date',
      );
    if (joining && resignation && resignation < joining)
      throw new BadRequestException(
        'Resignation date cannot be before joining date',
      );
    if (joining && termination && termination < joining)
      throw new BadRequestException(
        'Termination date cannot be before joining date',
      );
  }

  private rejectOrganizationPatch(dto: UpdateEmployeeDto): void {
    const keys: Array<keyof UpdateEmployeeDto> = [
      'branchId',
      'departmentId',
      'designationId',
      'teamId',
      'managerEmployeeId',
      'employmentTypeId',
      'joiningDate',
    ];
    const supplied = keys.filter((key) => dto[key] !== undefined);
    if (supplied.length)
      throw new BadRequestException(
        `Use the transfer endpoint for employment changes: ${supplied.join(', ')}`,
      );
  }

  private mapEmployee(dto: Partial<CreateEmployeeDto>) {
    const value = { ...dto } as Partial<UpdateEmployeeDto>;
    delete value.expectedUpdatedAt;
    return {
      ...value,
      dateOfBirth: dto.dateOfBirth ? this.date(dto.dateOfBirth) : undefined,
      joiningDate: dto.joiningDate ? this.date(dto.joiningDate) : undefined,
      confirmationDate: dto.confirmationDate
        ? this.date(dto.confirmationDate)
        : undefined,
      resignationDate: dto.resignationDate
        ? this.date(dto.resignationDate)
        : undefined,
      terminationDate: dto.terminationDate
        ? this.date(dto.terminationDate)
        : undefined,
    };
  }

  private date(value: string): Date {
    const result = new Date(value);
    if (Number.isNaN(result.getTime()))
      throw new BadRequestException('Invalid date');
    return result;
  }
}
