import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, EntityStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogData,
  CredentialData,
  DocumentData,
  EmployeeCreateData,
  EmployeeListCriteria,
  EmployeeTransferData,
  EmployeeUpdateData,
  IWorkforceRepository,
  ProjectAssignmentData,
  SkillAssignmentData,
} from '../domain/workforce.repository';

const employeeSummaryInclude = Prisma.validator<Prisma.EmployeeInclude>()({
  branch: { select: { id: true, branchCode: true, name: true } },
  department: { select: { id: true, departmentCode: true, name: true } },
  designation: { select: { id: true, code: true, name: true } },
  employmentType: { select: { id: true, code: true, name: true } },
  manager: {
    select: { id: true, employeeCode: true, firstName: true, lastName: true },
  },
  skills: {
    where: { deletedAt: null },
    include: { skill: { select: { id: true, code: true, name: true } } },
  },
});

const employeeDetailInclude = Prisma.validator<Prisma.EmployeeInclude>()({
  ...employeeSummaryInclude,
  user: {
    select: {
      id: true,
      email: true,
      status: true,
      mfaEnabled: true,
      lastLoginAt: true,
    },
  },
  membership: { select: { id: true, status: true } },
  directReports: {
    where: { deletedAt: null },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
    },
  },
  employments: {
    where: { deletedAt: null },
    orderBy: { effectiveFrom: 'desc' },
    include: {
      employmentType: true,
      branch: true,
      department: true,
      designation: true,
    },
  },
  projectAssignments: {
    where: { deletedAt: null },
    orderBy: { assignedAt: 'desc' },
    include: {
      project: {
        select: {
          id: true,
          projectCode: true,
          projectName: true,
          lifecycleStatus: true,
        },
      },
    },
  },
  certifications: {
    where: { deletedAt: null },
    orderBy: { expiryDate: 'asc' },
    include: { fileObject: true },
  },
  licenses: {
    where: { deletedAt: null },
    orderBy: { expiryDate: 'asc' },
    include: { fileObject: true },
  },
  documents: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { fileObject: true },
  },
  teamMemberships: { where: { deletedAt: null }, include: { team: true } },
});

@Injectable()
export class PrismaWorkforceRepository implements IWorkforceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(criteria: EmployeeListCriteria): Promise<unknown> {
    const where: Prisma.EmployeeWhereInput = {
      companyId: criteria.companyId,
      deletedAt: criteria.includeDeleted ? undefined : null,
      status: criteria.status,
      availability: criteria.availability,
      branchId: criteria.branchId,
      departmentId: criteria.departmentId,
      designationId: criteria.designationId,
      skills: criteria.skillId
        ? { some: { skillId: criteria.skillId, deletedAt: null } }
        : undefined,
      projectAssignments: criteria.projectId
        ? { some: { projectId: criteria.projectId, deletedAt: null } }
        : undefined,
      OR: criteria.search
        ? [
            {
              employeeCode: { contains: criteria.search, mode: 'insensitive' },
            },
            { firstName: { contains: criteria.search, mode: 'insensitive' } },
            { middleName: { contains: criteria.search, mode: 'insensitive' } },
            { lastName: { contains: criteria.search, mode: 'insensitive' } },
            { phone: { contains: criteria.search, mode: 'insensitive' } },
            {
              personalEmail: { contains: criteria.search, mode: 'insensitive' },
            },
            {
              companyEmail: { contains: criteria.search, mode: 'insensitive' },
            },
            {
              department: {
                name: { contains: criteria.search, mode: 'insensitive' },
              },
            },
            {
              designation: {
                name: { contains: criteria.search, mode: 'insensitive' },
              },
            },
            {
              skills: {
                some: {
                  deletedAt: null,
                  skill: {
                    name: { contains: criteria.search, mode: 'insensitive' },
                  },
                },
              },
            },
            {
              projectAssignments: {
                some: {
                  deletedAt: null,
                  project: {
                    projectName: {
                      contains: criteria.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: employeeSummaryInclude,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.employee.count({ where }),
    ]);
    return {
      items,
      total,
      page: criteria.page,
      limit: criteria.limit,
      pages: Math.ceil(total / criteria.limit),
    };
  }

  findDetail(companyId: string, employeeId: string): Promise<unknown> {
    return this.prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      include: employeeDetailInclude,
    });
  }

  findBasic(companyId: string, employeeId: string) {
    return this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: {
        id: true,
        managerEmployeeId: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
  }

  async create(
    companyId: string,
    data: EmployeeCreateData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: { companyId, ...data, createdBy: actorId, updatedBy: actorId },
      });
      await tx.employment.create({
        data: {
          companyId,
          employeeId: employee.id,
          employmentTypeId: data.employmentTypeId,
          branchId: data.branchId,
          departmentId: data.departmentId,
          designationId: data.designationId,
          managerEmployeeId: data.managerEmployeeId,
          effectiveFrom: data.joiningDate,
          status: EmploymentStatus.ACTIVE,
          changeReason: 'Initial employment',
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.syncCompatibility(
        tx,
        companyId,
        employee.id,
        data,
        actorId,
        data.joiningDate,
      );
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.Created',
        entity: 'Employee',
        entityId: employee.id,
        newValue: employee,
      });
      return tx.employee.findUniqueOrThrow({
        where: { id: employee.id },
        include: employeeDetailInclude,
      });
    });
  }

  async update(
    companyId: string,
    employeeId: string,
    data: EmployeeUpdateData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.employee.findFirst({
        where: { id: employeeId, companyId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Employee not found');
      const { expectedUpdatedAt, ...changes } = data;
      const result = await tx.employee.updateMany({
        where: {
          id: employeeId,
          companyId,
          deletedAt: null,
          updatedAt: expectedUpdatedAt,
        },
        data: { ...changes, updatedBy: actorId },
      });
      if (!result.count)
        throw new ConflictException(
          'Employee was changed by another user; refresh and retry',
        );
      const updated = await tx.employee.findUniqueOrThrow({
        where: { id: employeeId },
      });
      if (updated.membershipId && changes.employeeCode) {
        await tx.companyMembership.update({
          where: { id: updated.membershipId },
          data: { employeeCode: changes.employeeCode, updatedBy: actorId },
        });
      }
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.Updated',
        entity: 'Employee',
        entityId: employeeId,
        oldValue: original,
        newValue: updated,
      });
      return tx.employee.findUniqueOrThrow({
        where: { id: employeeId },
        include: employeeDetailInclude,
      });
    });
  }

  async softDelete(
    companyId: string,
    employeeId: string,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.employee.findFirst({
        where: { id: employeeId, companyId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Employee not found');
      const now = new Date();
      const updated = await tx.employee.update({
        where: { id: employeeId },
        data: {
          deletedAt: now,
          status: 'INACTIVE',
          availability: 'INACTIVE',
          updatedBy: actorId,
        },
      });
      await tx.employment.updateMany({
        where: {
          companyId,
          employeeId,
          status: EmploymentStatus.ACTIVE,
          deletedAt: null,
        },
        data: {
          effectiveTo: now,
          status: EmploymentStatus.ENDED,
          updatedBy: actorId,
        },
      });
      await tx.employeeProjectAssignment.updateMany({
        where: {
          companyId,
          employeeId,
          deletedAt: null,
          status: EntityStatus.ACTIVE,
        },
        data: {
          status: EntityStatus.INACTIVE,
          unassignedAt: now,
          updatedBy: actorId,
        },
      });
      await tx.employeeTeamMembership.updateMany({
        where: {
          companyId,
          employeeId,
          deletedAt: null,
          status: EntityStatus.ACTIVE,
        },
        data: {
          status: EntityStatus.INACTIVE,
          endedAt: now,
          updatedBy: actorId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.Archived',
        entity: 'Employee',
        entityId: employeeId,
        oldValue: original,
        newValue: updated,
      });
      return updated;
    });
  }

  async transfer(
    companyId: string,
    employeeId: string,
    data: EmployeeTransferData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.employee.findFirst({
        where: { id: employeeId, companyId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Employee not found');
      const next = {
        branchId:
          data.branchId !== undefined ? data.branchId : original.branchId,
        departmentId:
          data.departmentId !== undefined
            ? data.departmentId
            : original.departmentId,
        designationId:
          data.designationId !== undefined
            ? data.designationId
            : original.designationId,
        managerEmployeeId:
          data.managerEmployeeId !== undefined
            ? data.managerEmployeeId
            : original.managerEmployeeId,
        employmentTypeId:
          data.employmentTypeId ?? original.employmentTypeId ?? undefined,
      };
      if (!next.employmentTypeId)
        throw new ConflictException('An employment type is required');
      const employmentTypeId = next.employmentTypeId;
      const previousDay = new Date(data.effectiveDate);
      previousDay.setUTCDate(previousDay.getUTCDate() - 1);
      await tx.employment.updateMany({
        where: {
          companyId,
          employeeId,
          status: EmploymentStatus.ACTIVE,
          deletedAt: null,
        },
        data: {
          effectiveTo: previousDay,
          status: EmploymentStatus.ENDED,
          updatedBy: actorId,
        },
      });
      await tx.employment.create({
        data: {
          companyId,
          employeeId,
          ...next,
          employmentTypeId,
          effectiveFrom: data.effectiveDate,
          status: EmploymentStatus.ACTIVE,
          changeReason: data.reason,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      const updated = await tx.employee.update({
        where: { id: employeeId },
        data: { ...next, updatedBy: actorId },
      });
      await this.syncCompatibility(
        tx,
        companyId,
        employeeId,
        next,
        actorId,
        data.effectiveDate,
      );
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.Transferred',
        entity: 'Employee',
        entityId: employeeId,
        oldValue: original,
        newValue: {
          ...updated,
          reason: data.reason,
          effectiveDate: data.effectiveDate,
        },
      });
      return tx.employee.findUniqueOrThrow({
        where: { id: employeeId },
        include: employeeDetailInclude,
      });
    });
  }

  async assignProject(
    companyId: string,
    employeeId: string,
    data: ProjectAssignmentData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.employeeProjectAssignment.upsert({
        where: {
          employeeId_projectId_role: {
            employeeId,
            projectId: data.projectId,
            role: data.role,
          },
        },
        create: {
          companyId,
          employeeId,
          ...data,
          status: EntityStatus.ACTIVE,
          createdBy: actorId,
          updatedBy: actorId,
        },
        update: {
          ...data,
          status: EntityStatus.ACTIVE,
          deletedAt: null,
          updatedBy: actorId,
        },
        include: {
          project: {
            select: { id: true, projectCode: true, projectName: true },
          },
        },
      });
      await tx.employee.update({
        where: { id: employeeId },
        data: { availability: 'ASSIGNED', updatedBy: actorId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.ProjectAssigned',
        entity: 'EmployeeProjectAssignment',
        entityId: assignment.id,
        newValue: assignment,
      });
      return assignment;
    });
  }

  async endProjectAssignment(
    companyId: string,
    employeeId: string,
    assignmentId: string,
    endDate: Date,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.employeeProjectAssignment.findFirst({
        where: { id: assignmentId, companyId, employeeId, deletedAt: null },
      });
      if (!original)
        throw new NotFoundException('Project assignment not found');
      const updated = await tx.employeeProjectAssignment.update({
        where: { id: assignmentId },
        data: {
          unassignedAt: endDate,
          status: EntityStatus.INACTIVE,
          updatedBy: actorId,
        },
      });
      const remaining = await tx.employeeProjectAssignment.count({
        where: {
          companyId,
          employeeId,
          id: { not: assignmentId },
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
      });
      if (!remaining)
        await tx.employee.update({
          where: { id: employeeId },
          data: { availability: 'AVAILABLE', updatedBy: actorId },
        });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.ProjectUnassigned',
        entity: 'EmployeeProjectAssignment',
        entityId: assignmentId,
        oldValue: original,
        newValue: updated,
      });
      return updated;
    });
  }

  async assignSkill(
    companyId: string,
    employeeId: string,
    data: SkillAssignmentData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const skill = await tx.employeeSkill.upsert({
        where: { employeeId_skillId: { employeeId, skillId: data.skillId } },
        create: {
          companyId,
          employeeId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
        update: { ...data, deletedAt: null, updatedBy: actorId },
        include: { skill: true },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.SkillAssigned',
        entity: 'EmployeeSkill',
        entityId: skill.id,
        newValue: skill,
      });
      return skill;
    });
  }

  async removeSkill(
    companyId: string,
    employeeId: string,
    skillId: string,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.employeeSkill.findFirst({
        where: { companyId, employeeId, skillId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Employee skill not found');
      const updated = await tx.employeeSkill.update({
        where: { id: original.id },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.SkillRemoved',
        entity: 'EmployeeSkill',
        entityId: original.id,
        oldValue: original,
      });
      return updated;
    });
  }

  addCertification(
    companyId: string,
    employeeId: string,
    data: CredentialData,
    actorId: string,
  ): Promise<unknown> {
    return this.createCredential(
      'certification',
      companyId,
      employeeId,
      data,
      actorId,
    );
  }

  updateCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    data: Partial<CredentialData>,
    actorId: string,
  ): Promise<unknown> {
    return this.updateCredential(
      'certification',
      companyId,
      employeeId,
      certificationId,
      data,
      actorId,
    );
  }

  deleteCertification(
    companyId: string,
    employeeId: string,
    certificationId: string,
    actorId: string,
  ): Promise<unknown> {
    return this.deleteCredential(
      'certification',
      companyId,
      employeeId,
      certificationId,
      actorId,
    );
  }

  addLicense(
    companyId: string,
    employeeId: string,
    data: CredentialData,
    actorId: string,
  ): Promise<unknown> {
    return this.createCredential(
      'license',
      companyId,
      employeeId,
      data,
      actorId,
    );
  }

  updateLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    data: Partial<CredentialData>,
    actorId: string,
  ): Promise<unknown> {
    return this.updateCredential(
      'license',
      companyId,
      employeeId,
      licenseId,
      data,
      actorId,
    );
  }

  deleteLicense(
    companyId: string,
    employeeId: string,
    licenseId: string,
    actorId: string,
  ): Promise<unknown> {
    return this.deleteCredential(
      'license',
      companyId,
      employeeId,
      licenseId,
      actorId,
    );
  }

  async addDocument(
    companyId: string,
    employeeId: string,
    data: DocumentData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.employeeDocument.create({
        data: {
          companyId,
          employeeId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
        include: { fileObject: true },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.DocumentAdded',
        entity: 'EmployeeDocument',
        entityId: document.id,
        newValue: document,
      });
      return document;
    });
  }

  async updateDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    data: Partial<DocumentData>,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.employeeDocument.findFirst({
        where: { id: documentId, companyId, employeeId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Employee document not found');
      const updated = await tx.employeeDocument.update({
        where: { id: documentId },
        data: { ...data, updatedBy: actorId },
        include: { fileObject: true },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.DocumentUpdated',
        entity: 'EmployeeDocument',
        entityId: documentId,
        oldValue: original,
        newValue: updated,
      });
      return updated;
    });
  }

  async deleteDocument(
    companyId: string,
    employeeId: string,
    documentId: string,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.employeeDocument.findFirst({
        where: { id: documentId, companyId, employeeId, deletedAt: null },
      });
      if (!original) throw new NotFoundException('Employee document not found');
      const updated = await tx.employeeDocument.update({
        where: { id: documentId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'Employee.DocumentRemoved',
        entity: 'EmployeeDocument',
        entityId: documentId,
        oldValue: original,
      });
      return updated;
    });
  }

  dashboard(companyId: string, employeeId: string): Promise<unknown> {
    const warningDate = new Date();
    warningDate.setUTCDate(warningDate.getUTCDate() + 60);
    return this.prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
      include: {
        branch: true,
        department: true,
        designation: true,
        employmentType: true,
        manager: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            companyEmail: true,
            phone: true,
          },
        },
        projectAssignments: {
          where: { deletedAt: null, status: EntityStatus.ACTIVE },
          include: {
            project: {
              select: {
                id: true,
                projectCode: true,
                projectName: true,
                lifecycleStatus: true,
                plannedCompletionDate: true,
              },
            },
          },
        },
        certifications: {
          where: { deletedAt: null, expiryDate: { lte: warningDate } },
          orderBy: { expiryDate: 'asc' },
        },
        licenses: {
          where: { deletedAt: null, expiryDate: { lte: warningDate } },
          orderBy: { expiryDate: 'asc' },
        },
        documents: {
          where: { deletedAt: null, expiresAt: { lte: warningDate } },
          orderBy: { expiresAt: 'asc' },
        },
      },
    });
  }

  organizationChart(companyId: string): Promise<unknown[]> {
    return this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        photoUrl: true,
        status: true,
        managerEmployeeId: true,
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  listEmploymentTypes(companyId: string): Promise<unknown[]> {
    return this.prisma.employmentType.findMany({
      where: {
        OR: [{ companyId: null }, { companyId }],
        deletedAt: null,
        status: EntityStatus.ACTIVE,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  listSkills(companyId: string): Promise<unknown[]> {
    return this.prisma.workforceSkill.findMany({
      where: {
        OR: [{ companyId: null }, { companyId }],
        deletedAt: null,
        status: EntityStatus.ACTIVE,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  createEmploymentType(
    companyId: string,
    data: CatalogData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.employmentType.create({
      data: {
        companyId,
        ...data,
        isSystem: false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  createSkill(
    companyId: string,
    data: CatalogData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.workforceSkill.create({
      data: {
        companyId,
        ...data,
        isSystem: false,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
  }

  async validateReferences(
    companyId: string,
    refs: Record<string, string | undefined>,
  ): Promise<string[]> {
    const failures: string[] = [];
    const checks: Array<[string, string | undefined, Promise<unknown>]> = [
      [
        'branchId',
        refs.branchId,
        this.prisma.branch.findFirst({
          where: { id: refs.branchId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'departmentId',
        refs.departmentId,
        this.prisma.department.findFirst({
          where: { id: refs.departmentId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'designationId',
        refs.designationId,
        this.prisma.designation.findFirst({
          where: { id: refs.designationId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'teamId',
        refs.teamId,
        this.prisma.team.findFirst({
          where: { id: refs.teamId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'managerEmployeeId',
        refs.managerEmployeeId,
        this.prisma.employee.findFirst({
          where: { id: refs.managerEmployeeId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'employmentTypeId',
        refs.employmentTypeId,
        this.prisma.employmentType.findFirst({
          where: {
            id: refs.employmentTypeId,
            OR: [{ companyId: null }, { companyId }],
            deletedAt: null,
          },
          select: { id: true },
        }),
      ],
      [
        'membershipId',
        refs.membershipId,
        this.prisma.companyMembership.findFirst({
          where: { id: refs.membershipId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'userId',
        refs.userId,
        this.prisma.user.findFirst({
          where: { id: refs.userId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'projectId',
        refs.projectId,
        this.prisma.project.findFirst({
          where: { id: refs.projectId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
      [
        'skillId',
        refs.skillId,
        this.prisma.workforceSkill.findFirst({
          where: {
            id: refs.skillId,
            OR: [{ companyId: null }, { companyId }],
            deletedAt: null,
          },
          select: { id: true },
        }),
      ],
      [
        'fileObjectId',
        refs.fileObjectId,
        this.prisma.fileObject.findFirst({
          where: { id: refs.fileObjectId, companyId, deletedAt: null },
          select: { id: true },
        }),
      ],
    ];
    const results = await Promise.all(
      checks.map(([, id, promise]) => (id ? promise : Promise.resolve(true))),
    );
    checks.forEach(([name, id], index) => {
      if (id && !results[index]) failures.push(name);
    });
    return failures;
  }

  async wouldCreateManagerCycle(
    companyId: string,
    employeeId: string,
    managerEmployeeId: string,
  ): Promise<boolean> {
    let cursor: string | null = managerEmployeeId;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor)) {
      if (cursor === employeeId) return true;
      visited.add(cursor);
      const row: { managerEmployeeId: string | null } | null =
        await this.prisma.employee.findFirst({
          where: { id: cursor, companyId, deletedAt: null },
          select: { managerEmployeeId: true },
        });
      cursor = row?.managerEmployeeId ?? null;
    }
    return false;
  }

  async activeAllocation(
    companyId: string,
    employeeId: string,
    from: Date,
    to?: Date,
  ): Promise<number> {
    const rows = await this.prisma.employeeProjectAssignment.findMany({
      where: {
        companyId,
        employeeId,
        deletedAt: null,
        status: EntityStatus.ACTIVE,
        assignedAt: to ? { lte: to } : undefined,
        OR: [{ unassignedAt: null }, { unassignedAt: { gte: from } }],
      },
      select: { allocationPct: true },
    });
    return rows.reduce((sum, row) => sum + Number(row.allocationPct), 0);
  }

  private async createCredential(
    kind: 'certification' | 'license',
    companyId: string,
    employeeId: string,
    data: CredentialData,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const record =
        kind === 'certification'
          ? await tx.employeeCertification.create({
              data: {
                companyId,
                employeeId,
                name: data.name,
                certificationNo: data.number,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                issuingAuthority: data.issuingAuthority,
                fileObjectId: data.fileObjectId,
                notes: data.notes,
                createdBy: actorId,
                updatedBy: actorId,
              },
              include: { fileObject: true },
            })
          : await tx.employeeLicense.create({
              data: {
                companyId,
                employeeId,
                licenseType: data.name,
                licenseNumber: data.number,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                issuingAuthority: data.issuingAuthority,
                fileObjectId: data.fileObjectId,
                notes: data.notes,
                createdBy: actorId,
                updatedBy: actorId,
              },
              include: { fileObject: true },
            });
      await this.audit.record(tx, {
        companyId,
        action:
          kind === 'certification'
            ? 'Employee.CertificationAdded'
            : 'Employee.LicenseAdded',
        entity:
          kind === 'certification'
            ? 'EmployeeCertification'
            : 'EmployeeLicense',
        entityId: record.id,
        newValue: record,
      });
      return record;
    });
  }

  private async updateCredential(
    kind: 'certification' | 'license',
    companyId: string,
    employeeId: string,
    credentialId: string,
    data: Partial<CredentialData>,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original =
        kind === 'certification'
          ? await tx.employeeCertification.findFirst({
              where: {
                id: credentialId,
                companyId,
                employeeId,
                deletedAt: null,
              },
            })
          : await tx.employeeLicense.findFirst({
              where: {
                id: credentialId,
                companyId,
                employeeId,
                deletedAt: null,
              },
            });
      if (!original) throw new NotFoundException(`${kind} not found`);
      const updated =
        kind === 'certification'
          ? await tx.employeeCertification.update({
              where: { id: credentialId },
              data: {
                name: data.name,
                certificationNo: data.number,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                issuingAuthority: data.issuingAuthority,
                fileObjectId: data.fileObjectId,
                notes: data.notes,
                updatedBy: actorId,
              },
              include: { fileObject: true },
            })
          : await tx.employeeLicense.update({
              where: { id: credentialId },
              data: {
                licenseType: data.name,
                licenseNumber: data.number,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                issuingAuthority: data.issuingAuthority,
                fileObjectId: data.fileObjectId,
                notes: data.notes,
                updatedBy: actorId,
              },
              include: { fileObject: true },
            });
      await this.audit.record(tx, {
        companyId,
        action:
          kind === 'certification'
            ? 'Employee.CertificationUpdated'
            : 'Employee.LicenseUpdated',
        entity:
          kind === 'certification'
            ? 'EmployeeCertification'
            : 'EmployeeLicense',
        entityId: credentialId,
        oldValue: original,
        newValue: updated,
      });
      return updated;
    });
  }

  private async deleteCredential(
    kind: 'certification' | 'license',
    companyId: string,
    employeeId: string,
    credentialId: string,
    actorId: string,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const original =
        kind === 'certification'
          ? await tx.employeeCertification.findFirst({
              where: {
                id: credentialId,
                companyId,
                employeeId,
                deletedAt: null,
              },
            })
          : await tx.employeeLicense.findFirst({
              where: {
                id: credentialId,
                companyId,
                employeeId,
                deletedAt: null,
              },
            });
      if (!original) throw new NotFoundException(`${kind} not found`);
      const updated =
        kind === 'certification'
          ? await tx.employeeCertification.update({
              where: { id: credentialId },
              data: { deletedAt: new Date(), updatedBy: actorId },
            })
          : await tx.employeeLicense.update({
              where: { id: credentialId },
              data: { deletedAt: new Date(), updatedBy: actorId },
            });
      await this.audit.record(tx, {
        companyId,
        action:
          kind === 'certification'
            ? 'Employee.CertificationRemoved'
            : 'Employee.LicenseRemoved',
        entity:
          kind === 'certification'
            ? 'EmployeeCertification'
            : 'EmployeeLicense',
        entityId: credentialId,
        oldValue: original,
      });
      return updated;
    });
  }

  private async syncCompatibility(
    tx: Prisma.TransactionClient,
    companyId: string,
    employeeId: string,
    data: {
      employeeCode?: string;
      branchId?: string | null;
      departmentId?: string | null;
      designationId?: string | null;
      teamId?: string;
      managerEmployeeId?: string | null;
    },
    actorId: string,
    effectiveFrom: Date,
  ): Promise<void> {
    const employee = await tx.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { membershipId: true, employeeCode: true, teamId: true },
    });
    if (employee.membershipId) {
      const reportingEndDate = new Date(effectiveFrom);
      reportingEndDate.setUTCDate(reportingEndDate.getUTCDate() - 1);
      await tx.companyMembership.update({
        where: { id: employee.membershipId },
        data: {
          employeeCode: data.employeeCode ?? employee.employeeCode,
          branchId: data.branchId,
          departmentId: data.departmentId,
          designationId: data.designationId,
          teamId: data.teamId ?? employee.teamId,
          updatedBy: actorId,
        },
      });
      await tx.reportingLine.updateMany({
        where: {
          companyId,
          subordinateMembershipId: employee.membershipId,
          isPrimary: true,
          deletedAt: null,
          effectiveTo: null,
        },
        data: { effectiveTo: reportingEndDate, updatedBy: actorId },
      });
      if (data.managerEmployeeId) {
        const manager = await tx.employee.findFirst({
          where: { id: data.managerEmployeeId, companyId, deletedAt: null },
          select: { membershipId: true },
        });
        if (manager?.membershipId) {
          await tx.reportingLine.create({
            data: {
              companyId,
              subordinateMembershipId: employee.membershipId,
              managerMembershipId: manager.membershipId,
              isPrimary: true,
              effectiveFrom,
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
        }
      }
    }
    if (data.teamId) {
      await tx.employeeTeamMembership.updateMany({
        where: {
          companyId,
          employeeId,
          isPrimary: true,
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
        data: {
          status: EntityStatus.INACTIVE,
          endedAt: effectiveFrom,
          updatedBy: actorId,
        },
      });
      await tx.employeeTeamMembership.upsert({
        where: { employeeId_teamId: { employeeId, teamId: data.teamId } },
        create: {
          companyId,
          employeeId,
          teamId: data.teamId,
          isPrimary: true,
          assignedAt: effectiveFrom,
          createdBy: actorId,
          updatedBy: actorId,
        },
        update: {
          isPrimary: true,
          status: EntityStatus.ACTIVE,
          assignedAt: effectiveFrom,
          endedAt: null,
          deletedAt: null,
          updatedBy: actorId,
        },
      });
    }
  }
}
