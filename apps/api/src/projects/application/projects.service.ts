import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ProjectLifecycleStatus } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import type { IDocumentNumberingService } from '../../companies/application/document-numbering.service.interface';
import { DOCUMENT_NUMBERING_SERVICE } from '../../companies/application/document-numbering.service.interface';
import { PERMISSIONS } from '../../permissions/permission.constants';
import type {
  IProjectRepository,
  ProjectCreateData,
  ProjectUpdateData,
} from '../domain/project.repository';
import { PROJECT_REPOSITORY } from '../domain/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectQueryDto } from '../dto/project-query.dto';
import { UpdateProjectStatusDto } from '../dto/project-status.dto';
import {
  CreateProjectPhaseDto,
  CreateProjectTaskDto,
  UpdateProjectPhaseDto,
  UpdateProjectTaskDto,
} from '../dto/project-phase.dto';
import {
  CreateMilestoneDependencyDto,
  CreateProjectMilestoneDto,
  UpdateProjectMilestoneDto,
} from '../dto/project-milestone.dto';
import {
  AssignProjectTeamDto,
  UpdateProjectTeamDto,
} from '../dto/project-team.dto';
import {
  CreateProjectDocumentDto,
  UpdateProjectDocumentDto,
} from '../dto/project-document.dto';
import {
  CreateProjectCalendarEventDto,
  ProjectCalendarQueryDto,
  UpdateProjectCalendarEventDto,
} from '../dto/project-calendar.dto';
import { UpdateProjectSettingsDto } from '../dto/project-settings.dto';
import {
  AssignProjectTagDto,
  CreateProjectTagDto,
  UpdateProjectTagDto,
} from '../dto/project-tag.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { IProjectsService } from './projects.service.interface';

@Injectable()
export class ProjectsService implements IProjectsService {
  constructor(
    @Inject(PROJECT_REPOSITORY)
    private readonly projects: IProjectRepository,
    @Inject(DOCUMENT_NUMBERING_SERVICE)
    private readonly numbering: IDocumentNumberingService,
  ) {}

  async create(
    companyId: string,
    dto: CreateProjectDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    this.validateBudgetAndDates(dto);

    const projectType = await this.projects.findTypeById(
      dto.projectTypeId,
      companyId,
    );
    if (!projectType) {
      throw new UnprocessableEntityException('Project type is invalid');
    }

    let statusId = dto.statusId;
    let lifecycleStatus: ProjectLifecycleStatus = ProjectLifecycleStatus.DRAFT;
    if (statusId) {
      const status = await this.projects.findStatusById(statusId, companyId);
      if (!status) {
        throw new UnprocessableEntityException('Project status is invalid');
      }
      lifecycleStatus = status.lifecycle;
    } else {
      const draft = await this.projects.findSystemStatusByCode('DRAFT');
      if (!draft) {
        throw new UnprocessableEntityException(
          'System DRAFT project status is not seeded',
        );
      }
      statusId = draft.id;
      lifecycleStatus = draft.lifecycle;
    }

    await this.assertActiveMembership(companyId, dto.projectManagerId);
    if (dto.siteEngineerId) {
      await this.assertActiveMembership(companyId, dto.siteEngineerId);
    }

    const currency =
      dto.currency ??
      (await this.projects.getCompanyCurrency(companyId)) ??
      'USD';

    const allocated = await this.numbering.allocate(
      companyId,
      { documentType: 'PROJ', branchId: dto.branchId },
      principal,
    );

    const codeExists = await this.projects.projectCodeExists(
      companyId,
      allocated.value,
    );
    if (codeExists) {
      throw new UnprocessableEntityException(
        'Allocated project code already exists',
      );
    }

    const data: ProjectCreateData = {
      companyId,
      projectCode: allocated.value,
      projectName: dto.projectName,
      projectShortName: dto.projectShortName,
      projectTypeId: dto.projectTypeId,
      constructionTypeId: dto.constructionTypeId,
      statusId,
      lifecycleStatus,
      priority: dto.priority,
      clientId: dto.clientId,
      consultantId: dto.consultantId,
      architectId: dto.architectId,
      projectManagerId: dto.projectManagerId,
      siteEngineerId: dto.siteEngineerId,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      estimatedBudget: new Prisma.Decimal(dto.estimatedBudget),
      approvedBudget:
        dto.approvedBudget === undefined
          ? undefined
          : new Prisma.Decimal(dto.approvedBudget),
      estimatedCost:
        dto.estimatedCost === undefined
          ? undefined
          : new Prisma.Decimal(dto.estimatedCost),
      contractValue:
        dto.contractValue === undefined
          ? undefined
          : new Prisma.Decimal(dto.contractValue),
      currency,
      contractType: dto.contractType,
      contractNumber: dto.contractNumber,
      projectStartDate: new Date(dto.projectStartDate),
      plannedCompletionDate: new Date(dto.plannedCompletionDate),
      actualCompletionDate: dto.actualCompletionDate
        ? new Date(dto.actualCompletionDate)
        : undefined,
      defectLiabilityEndDate: dto.defectLiabilityEndDate
        ? new Date(dto.defectLiabilityEndDate)
        : undefined,
      latitude:
        dto.latitude === undefined
          ? undefined
          : new Prisma.Decimal(dto.latitude),
      longitude:
        dto.longitude === undefined
          ? undefined
          : new Prisma.Decimal(dto.longitude),
      address: dto.address,
      area: dto.area,
      city: dto.city,
      province: dto.province,
      country: dto.country,
      projectDescription: dto.projectDescription,
      scopeOfWork: dto.scopeOfWork,
      remarks: dto.remarks,
      completionPercentage:
        dto.completionPercentage === undefined
          ? undefined
          : new Prisma.Decimal(dto.completionPercentage),
      seedDefaultPhases: dto.seedDefaultPhases !== false,
    };

    return this.projects.create(data, principal.userId);
  }

  async list(
    companyId: string,
    query: ProjectQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    if (query.includeDeleted && !principal.isPlatformAdmin) {
      throw new ForbiddenException(
        'Only platform administrators can view archived projects',
      );
    }
    const result = await this.projects.list({
      companyId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      statusId: query.status,
      lifecycleStatus: query.lifecycleStatus,
      projectTypeId: query.projectTypeId,
      projectManagerId: query.projectManagerId,
      clientId: query.clientId,
      city: query.city,
      country: query.country,
      branchId: query.branchId,
      departmentId: query.departmentId,
      tagId: query.tagId,
      minBudget: query.minBudget,
      maxBudget: query.maxBudget,
      includeDeleted: query.includeDeleted,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
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
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    const project = await this.projects.findById(
      companyId,
      projectId,
      principal.isPlatformAdmin,
    );
    if (!project) {
      throw new NotFoundException('Project was not found');
    }
    return project;
  }

  async update(
    companyId: string,
    projectId: string,
    dto: UpdateProjectDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    const existing = await this.requireProject(companyId, projectId);
    this.validateBudgetAndDates(dto, existing);

    if (dto.projectTypeId) {
      const projectType = await this.projects.findTypeById(
        dto.projectTypeId,
        companyId,
      );
      if (!projectType) {
        throw new UnprocessableEntityException('Project type is invalid');
      }
    }
    if (dto.projectManagerId) {
      await this.assertActiveMembership(companyId, dto.projectManagerId);
    }
    if (dto.siteEngineerId) {
      await this.assertActiveMembership(companyId, dto.siteEngineerId);
    }

    const data: ProjectUpdateData = {
      projectName: dto.projectName,
      projectShortName: dto.projectShortName,
      projectTypeId: dto.projectTypeId,
      constructionTypeId: dto.constructionTypeId,
      priority: dto.priority,
      clientId: dto.clientId,
      consultantId: dto.consultantId,
      architectId: dto.architectId,
      projectManagerId: dto.projectManagerId,
      siteEngineerId: dto.siteEngineerId,
      branchId: dto.branchId,
      departmentId: dto.departmentId,
      estimatedBudget:
        dto.estimatedBudget === undefined
          ? undefined
          : new Prisma.Decimal(dto.estimatedBudget),
      approvedBudget:
        dto.approvedBudget === undefined
          ? undefined
          : new Prisma.Decimal(dto.approvedBudget),
      estimatedCost:
        dto.estimatedCost === undefined
          ? undefined
          : new Prisma.Decimal(dto.estimatedCost),
      contractValue:
        dto.contractValue === undefined
          ? undefined
          : new Prisma.Decimal(dto.contractValue),
      currency: dto.currency,
      contractType: dto.contractType,
      contractNumber: dto.contractNumber,
      projectStartDate: dto.projectStartDate
        ? new Date(dto.projectStartDate)
        : undefined,
      plannedCompletionDate: dto.plannedCompletionDate
        ? new Date(dto.plannedCompletionDate)
        : undefined,
      actualCompletionDate: dto.actualCompletionDate
        ? new Date(dto.actualCompletionDate)
        : undefined,
      defectLiabilityEndDate: dto.defectLiabilityEndDate
        ? new Date(dto.defectLiabilityEndDate)
        : undefined,
      latitude:
        dto.latitude === undefined
          ? undefined
          : new Prisma.Decimal(dto.latitude),
      longitude:
        dto.longitude === undefined
          ? undefined
          : new Prisma.Decimal(dto.longitude),
      address: dto.address,
      area: dto.area,
      city: dto.city,
      province: dto.province,
      country: dto.country,
      projectDescription: dto.projectDescription,
      scopeOfWork: dto.scopeOfWork,
      remarks: dto.remarks,
      completionPercentage:
        dto.completionPercentage === undefined
          ? undefined
          : new Prisma.Decimal(dto.completionPercentage),
    };

    return this.projects.update(companyId, projectId, data, principal.userId);
  }

  async delete(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.softDelete(companyId, projectId, principal.userId);
  }

  async restore(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.projects.restore(companyId, projectId, principal.userId);
  }

  async updateStatus(
    companyId: string,
    projectId: string,
    dto: UpdateProjectStatusDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    if (!dto.statusId && !dto.lifecycleStatus) {
      throw new UnprocessableEntityException(
        'statusId or lifecycleStatus is required',
      );
    }

    let lifecycleStatus = dto.lifecycleStatus;
    const statusId = dto.statusId;
    if (statusId) {
      const status = await this.projects.findStatusById(statusId, companyId);
      if (!status) {
        throw new UnprocessableEntityException('Project status is invalid');
      }
      lifecycleStatus = status.lifecycle;
    }

    if (
      lifecycleStatus === ProjectLifecycleStatus.CLOSED ||
      lifecycleStatus === ProjectLifecycleStatus.CANCELLED
    ) {
      await this.assertClosePermission(companyId, principal);
    }

    return this.projects.updateStatus(
      companyId,
      projectId,
      { statusId, lifecycleStatus },
      principal.userId,
    );
  }

  async dashboard(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    const dashboard = await this.projects.dashboard(companyId, projectId);
    if (!dashboard) {
      throw new NotFoundException('Project was not found');
    }
    return dashboard;
  }

  async timeline(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.timeline(companyId, projectId);
  }

  async listStatuses(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    return this.projects.listStatuses(companyId);
  }

  async listTypes(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    return this.projects.listTypes(companyId);
  }

  async listPhases(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.listPhases(companyId, projectId);
  }

  async createPhase(
    companyId: string,
    projectId: string,
    dto: CreateProjectPhaseDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.createPhase(
      companyId,
      projectId,
      this.toPhaseData(dto),
      principal.userId,
    );
  }

  async updatePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    dto: UpdateProjectPhaseDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.updatePhase(
      companyId,
      projectId,
      phaseId,
      this.toPhaseData(dto),
      principal.userId,
    );
  }

  async deletePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.softDeletePhase(
      companyId,
      projectId,
      phaseId,
      principal.userId,
    );
  }

  async createTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    dto: CreateProjectTaskDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    if (dto.assigneeMembershipId) {
      await this.assertActiveMembership(companyId, dto.assigneeMembershipId);
    }
    return this.projects.createTask(
      companyId,
      projectId,
      phaseId,
      this.toTaskData(dto),
      principal.userId,
    );
  }

  async updateTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    dto: UpdateProjectTaskDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    if (dto.assigneeMembershipId) {
      await this.assertActiveMembership(companyId, dto.assigneeMembershipId);
    }
    return this.projects.updateTask(
      companyId,
      projectId,
      phaseId,
      taskId,
      this.toTaskData(dto),
      principal.userId,
    );
  }

  async deleteTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.softDeleteTask(
      companyId,
      projectId,
      phaseId,
      taskId,
      principal.userId,
    );
  }

  async listMilestones(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.listMilestones(companyId, projectId);
  }

  async createMilestone(
    companyId: string,
    projectId: string,
    dto: CreateProjectMilestoneDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.createMilestone(
      companyId,
      projectId,
      {
        name: dto.name,
        description: dto.description,
        phaseId: dto.phaseId,
        targetDate: new Date(dto.targetDate),
        actualDate: dto.actualDate ? new Date(dto.actualDate) : undefined,
        status: dto.status,
        weightage:
          dto.weightage === undefined
            ? undefined
            : new Prisma.Decimal(dto.weightage),
        completionPercentage:
          dto.completionPercentage === undefined
            ? undefined
            : new Prisma.Decimal(dto.completionPercentage),
      },
      principal.userId,
    );
  }

  async updateMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dto: UpdateProjectMilestoneDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.updateMilestone(
      companyId,
      projectId,
      milestoneId,
      this.toMilestoneData(dto),
      principal.userId,
    );
  }

  async deleteMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.softDeleteMilestone(
      companyId,
      projectId,
      milestoneId,
      principal.userId,
    );
  }

  async addMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dto: CreateMilestoneDependencyDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.addMilestoneDependency(
      companyId,
      projectId,
      milestoneId,
      dto.dependsOnMilestoneId,
      principal.userId,
    );
  }

  async removeMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dependencyId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.removeMilestoneDependency(
      companyId,
      projectId,
      milestoneId,
      dependencyId,
      principal.userId,
    );
  }

  async listTeam(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.listTeam(companyId, projectId);
  }

  async assignTeam(
    companyId: string,
    projectId: string,
    dto: AssignProjectTeamDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    await this.assertActiveMembership(companyId, dto.membershipId);
    return this.projects.assignTeam(
      companyId,
      projectId,
      {
        membershipId: dto.membershipId,
        role: dto.role,
        isPrimary: dto.isPrimary,
      },
      principal.userId,
    );
  }

  async updateTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    dto: UpdateProjectTeamDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    if (dto.membershipId) {
      await this.assertActiveMembership(companyId, dto.membershipId);
    }
    return this.projects.updateTeam(
      companyId,
      projectId,
      memberId,
      {
        membershipId: dto.membershipId,
        role: dto.role,
        isPrimary: dto.isPrimary,
      },
      principal.userId,
    );
  }

  async unassignTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.unassignTeam(
      companyId,
      projectId,
      memberId,
      principal.userId,
    );
  }

  async listDocuments(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.listDocuments(companyId, projectId);
  }

  async createDocument(
    companyId: string,
    projectId: string,
    dto: CreateProjectDocumentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.createDocument(
      companyId,
      projectId,
      dto,
      principal.userId,
    );
  }

  async updateDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    dto: UpdateProjectDocumentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.updateDocument(
      companyId,
      projectId,
      documentId,
      dto,
      principal.userId,
    );
  }

  async deleteDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.softDeleteDocument(
      companyId,
      projectId,
      documentId,
      principal.userId,
    );
  }

  async listCalendar(
    companyId: string,
    projectId: string,
    query: ProjectCalendarQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.listCalendar(
      companyId,
      projectId,
      query.from ? new Date(query.from) : undefined,
      query.to ? new Date(query.to) : undefined,
    );
  }

  async createCalendarEvent(
    companyId: string,
    projectId: string,
    dto: CreateProjectCalendarEventDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.createCalendarEvent(
      companyId,
      projectId,
      {
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        allDay: dto.allDay,
        location: dto.location,
        milestoneId: dto.milestoneId,
      },
      principal.userId,
    );
  }

  async updateCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    dto: UpdateProjectCalendarEventDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.updateCalendarEvent(
      companyId,
      projectId,
      eventId,
      {
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        allDay: dto.allDay,
        location: dto.location,
        milestoneId: dto.milestoneId,
      },
      principal.userId,
    );
  }

  async deleteCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.softDeleteCalendarEvent(
      companyId,
      projectId,
      eventId,
      principal.userId,
    );
  }

  async getSettings(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    const settings = await this.projects.getSettings(companyId, projectId);
    if (!settings) {
      throw new NotFoundException('Project settings were not found');
    }
    return settings;
  }

  async updateSettings(
    companyId: string,
    projectId: string,
    dto: UpdateProjectSettingsDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    if (
      dto.workingHoursStart &&
      dto.workingHoursEnd &&
      dto.workingHoursStart >= dto.workingHoursEnd
    ) {
      throw new UnprocessableEntityException(
        'Working-hours end must be later than the start',
      );
    }
    return this.projects.updateSettings(
      companyId,
      projectId,
      {
        ...dto,
        notificationSettings: dto.notificationSettings as
          Prisma.InputJsonValue | undefined,
        approvalFlow: dto.approvalFlow as Prisma.InputJsonValue | undefined,
        calendarSettings: dto.calendarSettings as
          Prisma.InputJsonValue | undefined,
      },
      principal.userId,
    );
  }

  async listTags(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    return this.projects.listTags(companyId);
  }

  async createTag(
    companyId: string,
    dto: CreateProjectTagDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.projects.createTag(companyId, dto, principal.userId);
  }

  async updateTag(
    companyId: string,
    tagId: string,
    dto: UpdateProjectTagDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.projects.updateTag(companyId, tagId, dto, principal.userId);
  }

  async deleteTag(
    companyId: string,
    tagId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.projects.softDeleteTag(companyId, tagId, principal.userId);
  }

  async assignTag(
    companyId: string,
    projectId: string,
    dto: AssignProjectTagDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.assignTag(
      companyId,
      projectId,
      dto.tagId,
      principal.userId,
    );
  }

  async unassignTag(
    companyId: string,
    projectId: string,
    tagId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    await this.requireProject(companyId, projectId);
    return this.projects.unassignTag(
      companyId,
      projectId,
      tagId,
      principal.userId,
    );
  }

  assertCompanyAccess(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): void {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId) {
      throw new ForbiddenException('Cross-company access is denied');
    }
  }

  validateBudgetAndDates(
    dto: Partial<CreateProjectDto> | UpdateProjectDto,
    existing?: { projectStartDate: Date; plannedCompletionDate: Date },
  ): void {
    if (dto.estimatedBudget !== undefined && dto.estimatedBudget <= 0) {
      throw new UnprocessableEntityException(
        'estimatedBudget must be greater than 0',
      );
    }
    if (
      dto.completionPercentage !== undefined &&
      (dto.completionPercentage < 0 || dto.completionPercentage > 100)
    ) {
      throw new UnprocessableEntityException(
        'completionPercentage must be between 0 and 100',
      );
    }
    const startDate = dto.projectStartDate
      ? new Date(dto.projectStartDate)
      : existing?.projectStartDate;
    const completionDate = dto.plannedCompletionDate
      ? new Date(dto.plannedCompletionDate)
      : existing?.plannedCompletionDate;
    if (
      (dto.projectStartDate || dto.plannedCompletionDate) &&
      startDate &&
      completionDate &&
      completionDate < startDate
    ) {
      throw new UnprocessableEntityException(
        'plannedCompletionDate must be on or after projectStartDate',
      );
    }
  }

  private async requireProject(companyId: string, projectId: string) {
    const project = await this.projects.findById(companyId, projectId);
    if (!project) {
      throw new NotFoundException('Project was not found');
    }
    return project;
  }

  private async assertActiveMembership(
    companyId: string,
    membershipId: string,
  ): Promise<void> {
    const membership = await this.projects.findActiveMembership(
      companyId,
      membershipId,
    );
    if (!membership) {
      throw new UnprocessableEntityException(
        'Membership must belong to the company and be active',
      );
    }
  }

  private async assertClosePermission(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<void> {
    if (principal.isPlatformAdmin) {
      return;
    }
    if (!principal.membershipId) {
      throw new ForbiddenException('Project.Close permission is required');
    }
    const allowed = await this.projects.principalHasPermission(
      companyId,
      principal.membershipId,
      PERMISSIONS.PROJECT_CLOSE,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Project.Close permission is required for CLOSED/CANCELLED',
      );
    }
  }

  private toPhaseData(dto: CreateProjectPhaseDto | UpdateProjectPhaseDto) {
    return {
      code: dto.code!,
      name: dto.name!,
      description: dto.description,
      sortOrder: dto.sortOrder,
      plannedStartDate: dto.plannedStartDate
        ? new Date(dto.plannedStartDate)
        : undefined,
      plannedEndDate: dto.plannedEndDate
        ? new Date(dto.plannedEndDate)
        : undefined,
      actualStartDate: dto.actualStartDate
        ? new Date(dto.actualStartDate)
        : undefined,
      actualEndDate: dto.actualEndDate
        ? new Date(dto.actualEndDate)
        : undefined,
      budget:
        dto.budget === undefined ? undefined : new Prisma.Decimal(dto.budget),
      completionPercentage:
        dto.completionPercentage === undefined
          ? undefined
          : new Prisma.Decimal(dto.completionPercentage),
      status: dto.status,
    };
  }

  private toTaskData(dto: CreateProjectTaskDto | UpdateProjectTaskDto) {
    return {
      name: dto.name!,
      description: dto.description,
      assigneeMembershipId: dto.assigneeMembershipId,
      plannedStartDate: dto.plannedStartDate
        ? new Date(dto.plannedStartDate)
        : undefined,
      plannedEndDate: dto.plannedEndDate
        ? new Date(dto.plannedEndDate)
        : undefined,
      actualStartDate: dto.actualStartDate
        ? new Date(dto.actualStartDate)
        : undefined,
      actualEndDate: dto.actualEndDate
        ? new Date(dto.actualEndDate)
        : undefined,
      completionPercentage:
        dto.completionPercentage === undefined
          ? undefined
          : new Prisma.Decimal(dto.completionPercentage),
      status: dto.status,
      sortOrder: dto.sortOrder,
    };
  }

  private toMilestoneData(
    dto: CreateProjectMilestoneDto | UpdateProjectMilestoneDto,
  ) {
    return {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      description: dto.description,
      phaseId: dto.phaseId,
      ...(dto.targetDate !== undefined
        ? { targetDate: new Date(dto.targetDate) }
        : {}),
      actualDate: dto.actualDate ? new Date(dto.actualDate) : undefined,
      status: dto.status,
      weightage:
        dto.weightage === undefined
          ? undefined
          : new Prisma.Decimal(dto.weightage),
      completionPercentage:
        dto.completionPercentage === undefined
          ? undefined
          : new Prisma.Decimal(dto.completionPercentage),
    };
  }
}
