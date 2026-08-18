import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityStatus,
  MembershipStatus,
  MilestoneStatus,
  PhaseStatus,
  Prisma,
  ProjectDocumentCategory,
  ProjectTeamRole,
  Weekday,
} from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_PROJECT_PHASES,
  IProjectRepository,
  PaginatedProjects,
  ProjectCalendarData,
  ProjectCreateData,
  ProjectDashboard,
  ProjectDocumentData,
  ProjectListCriteria,
  ProjectMilestoneData,
  ProjectPhaseData,
  ProjectSettingsData,
  ProjectStatusUpdateData,
  ProjectTagData,
  ProjectTaskData,
  ProjectTeamData,
  ProjectUpdateData,
} from '../domain/project.repository';

const projectDetailInclude = {
  status: true,
  projectType: true,
  constructionType: true,
  projectManager: {
    select: {
      id: true,
      companyId: true,
      userId: true,
      status: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  settings: true,
  tagAssignments: {
    where: { deletedAt: null },
    include: { tag: true },
  },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class PrismaProjectRepository implements IProjectRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(data: ProjectCreateData, actorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const project = await transaction.project.create({
        data: {
          companyId: data.companyId,
          projectCode: data.projectCode,
          projectName: data.projectName,
          projectShortName: data.projectShortName,
          projectTypeId: data.projectTypeId,
          constructionTypeId: data.constructionTypeId,
          statusId: data.statusId,
          lifecycleStatus: data.lifecycleStatus,
          priority: data.priority,
          clientId: data.clientId,
          consultantId: data.consultantId,
          architectId: data.architectId,
          projectManagerId: data.projectManagerId,
          siteEngineerId: data.siteEngineerId,
          branchId: data.branchId,
          departmentId: data.departmentId,
          estimatedBudget: data.estimatedBudget,
          approvedBudget: data.approvedBudget,
          estimatedCost: data.estimatedCost,
          contractValue: data.contractValue,
          currency: data.currency,
          contractType: data.contractType,
          contractNumber: data.contractNumber,
          projectStartDate: data.projectStartDate,
          plannedCompletionDate: data.plannedCompletionDate,
          actualCompletionDate: data.actualCompletionDate,
          defectLiabilityEndDate: data.defectLiabilityEndDate,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          area: data.area,
          city: data.city,
          province: data.province,
          country: data.country,
          projectDescription: data.projectDescription,
          scopeOfWork: data.scopeOfWork,
          remarks: data.remarks,
          completionPercentage: data.completionPercentage,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      await transaction.projectSettings.create({
        data: {
          companyId: data.companyId,
          projectId: project.id,
          currency: data.currency,
          timezone: data.timezone ?? 'UTC',
          workingDays: [
            Weekday.MONDAY,
            Weekday.TUESDAY,
            Weekday.WEDNESDAY,
            Weekday.THURSDAY,
            Weekday.FRIDAY,
          ],
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      await transaction.projectTeamMember.create({
        data: {
          companyId: data.companyId,
          projectId: project.id,
          membershipId: data.projectManagerId,
          role: ProjectTeamRole.PROJECT_MANAGER,
          isPrimary: true,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });

      if (data.seedDefaultPhases) {
        await transaction.projectPhase.createMany({
          data: DEFAULT_PROJECT_PHASES.map((phase, index) => ({
            companyId: data.companyId,
            projectId: project.id,
            code: phase.code,
            name: phase.name,
            sortOrder: (index + 1) * 10,
            createdBy: actorId,
            updatedBy: actorId,
          })),
        });
      }

      await this.audit.record(transaction, {
        companyId: data.companyId,
        action: 'Project.Create',
        entity: 'Project',
        entityId: project.id,
        newValue: project,
      });

      return transaction.project.findFirstOrThrow({
        where: { id: project.id, companyId: data.companyId },
        include: projectDetailInclude,
      });
    });
  }

  async list(criteria: ProjectListCriteria): Promise<PaginatedProjects> {
    const where: Prisma.ProjectWhereInput = {
      companyId: criteria.companyId,
      deletedAt: criteria.includeDeleted ? undefined : null,
      statusId: criteria.statusId,
      lifecycleStatus: criteria.lifecycleStatus,
      projectTypeId: criteria.projectTypeId,
      projectManagerId: criteria.projectManagerId,
      clientId: criteria.clientId,
      city: criteria.city
        ? { equals: criteria.city, mode: 'insensitive' }
        : undefined,
      country: criteria.country,
      branchId: criteria.branchId,
      departmentId: criteria.departmentId,
      estimatedBudget:
        criteria.minBudget !== undefined || criteria.maxBudget !== undefined
          ? {
              gte:
                criteria.minBudget === undefined
                  ? undefined
                  : new Prisma.Decimal(criteria.minBudget),
              lte:
                criteria.maxBudget === undefined
                  ? undefined
                  : new Prisma.Decimal(criteria.maxBudget),
            }
          : undefined,
      tagAssignments: criteria.tagId
        ? { some: { tagId: criteria.tagId, deletedAt: null } }
        : undefined,
      ...(criteria.search
        ? {
            OR: [
              {
                projectName: {
                  contains: criteria.search,
                  mode: 'insensitive',
                },
              },
              {
                projectCode: {
                  contains: criteria.search,
                  mode: 'insensitive',
                },
              },
              {
                projectShortName: {
                  contains: criteria.search,
                  mode: 'insensitive',
                },
              },
              { city: { contains: criteria.search, mode: 'insensitive' } },
              { province: { contains: criteria.search, mode: 'insensitive' } },
              { address: { contains: criteria.search, mode: 'insensitive' } },
              {
                contractNumber: {
                  contains: criteria.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const skip = (criteria.page - 1) * criteria.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        skip,
        take: criteria.limit,
        orderBy: { [criteria.sortBy]: criteria.sortOrder },
        include: {
          status: true,
          projectType: true,
          projectManager: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);
    return {
      items,
      total,
      page: criteria.page,
      limit: criteria.limit,
    };
  }

  async findById(companyId: string, projectId: string, includeDeleted = false) {
    return this.prisma.project.findFirst({
      where: {
        id: projectId,
        companyId,
        deletedAt: includeDeleted ? undefined : null,
      },
      include: projectDetailInclude,
    });
  }

  async update(
    companyId: string,
    projectId: string,
    data: ProjectUpdateData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requireProject(
        transaction,
        companyId,
        projectId,
      );
      const project = await transaction.project.update({
        where: { id: projectId },
        data: {
          ...data,
          updatedBy: actorId,
        },
        include: projectDetailInclude,
      });

      const budgetChanged =
        data.estimatedBudget !== undefined ||
        data.approvedBudget !== undefined ||
        data.estimatedCost !== undefined ||
        data.contractValue !== undefined;
      const timelineChanged =
        data.projectStartDate !== undefined ||
        data.plannedCompletionDate !== undefined ||
        data.actualCompletionDate !== undefined ||
        data.defectLiabilityEndDate !== undefined;
      const locationChanged =
        data.latitude !== undefined ||
        data.longitude !== undefined ||
        data.address !== undefined ||
        data.area !== undefined ||
        data.city !== undefined ||
        data.province !== undefined ||
        data.country !== undefined;

      const action = budgetChanged
        ? 'Project.BudgetChange'
        : timelineChanged
          ? 'Project.TimelineChange'
          : locationChanged
            ? 'Project.LocationChange'
            : 'Project.Update';

      await this.audit.record(transaction, {
        companyId,
        action,
        entity: 'Project',
        entityId: projectId,
        oldValue: previous,
        newValue: project,
      });
      return project;
    });
  }

  async softDelete(companyId: string, projectId: string, actorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requireProject(
        transaction,
        companyId,
        projectId,
      );
      const project = await transaction.project.update({
        where: { id: projectId },
        data: {
          deletedAt: new Date(),
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.Delete',
        entity: 'Project',
        entityId: projectId,
        oldValue: previous,
        newValue: project,
      });
      return project;
    });
  }

  async restore(companyId: string, projectId: string, actorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.project.findFirst({
        where: { id: projectId, companyId, deletedAt: { not: null } },
      });
      if (!previous) {
        throw new NotFoundException('Archived project was not found');
      }
      const project = await transaction.project.update({
        where: { id: projectId },
        data: {
          deletedAt: null,
          updatedBy: actorId,
        },
        include: projectDetailInclude,
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.Restore',
        entity: 'Project',
        entityId: projectId,
        oldValue: previous,
        newValue: project,
      });
      return project;
    });
  }

  async updateStatus(
    companyId: string,
    projectId: string,
    data: ProjectStatusUpdateData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requireProject(
        transaction,
        companyId,
        projectId,
      );
      const project = await transaction.project.update({
        where: { id: projectId },
        data: {
          statusId: data.statusId,
          lifecycleStatus: data.lifecycleStatus,
          updatedBy: actorId,
        },
        include: projectDetailInclude,
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.StatusChange',
        entity: 'Project',
        entityId: projectId,
        oldValue: previous,
        newValue: project,
      });
      return project;
    });
  }

  async dashboard(
    companyId: string,
    projectId: string,
  ): Promise<ProjectDashboard | null> {
    const project = await this.findById(companyId, projectId);
    if (!project) {
      return null;
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [milestones, phases, teamCount, documentCount, recentPhotos] =
      await Promise.all([
        this.prisma.projectMilestone.findMany({
          where: { companyId, projectId, deletedAt: null },
        }),
        this.prisma.projectPhase.findMany({
          where: { companyId, projectId, deletedAt: null },
        }),
        this.prisma.projectTeamMember.count({
          where: {
            companyId,
            projectId,
            deletedAt: null,
            unassignedAt: null,
            status: EntityStatus.ACTIVE,
          },
        }),
        this.prisma.projectDocument.count({
          where: { companyId, projectId, deletedAt: null },
        }),
        this.prisma.projectDocument.findMany({
          where: {
            companyId,
            projectId,
            deletedAt: null,
            category: ProjectDocumentCategory.SITE_PHOTOS,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    const upcomingDeadlines = [
      ...milestones
        .filter(
          (milestone) =>
            milestone.status !== MilestoneStatus.COMPLETED &&
            milestone.status !== MilestoneStatus.CANCELLED &&
            milestone.targetDate >= now &&
            milestone.targetDate <= in30Days,
        )
        .map((milestone) => ({
          type: 'milestone' as const,
          id: milestone.id,
          name: milestone.name,
          date: milestone.targetDate.toISOString().slice(0, 10),
        })),
      ...phases
        .filter(
          (phase) =>
            phase.plannedEndDate &&
            phase.status !== PhaseStatus.COMPLETED &&
            phase.status !== PhaseStatus.CANCELLED &&
            phase.plannedEndDate >= now &&
            phase.plannedEndDate <= in30Days,
        )
        .map((phase) => ({
          type: 'phase' as const,
          id: phase.id,
          name: phase.name,
          date: phase.plannedEndDate!.toISOString().slice(0, 10),
        })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    const riskIndicators: ProjectDashboard['riskIndicators'] = [];
    const delayedMilestones = milestones.filter(
      (milestone) =>
        milestone.status === MilestoneStatus.DELAYED ||
        (milestone.status !== MilestoneStatus.COMPLETED &&
          milestone.status !== MilestoneStatus.CANCELLED &&
          milestone.targetDate < now),
    );
    if (delayedMilestones.length > 0) {
      riskIndicators.push({
        code: 'DELAYED_MILESTONES',
        level: 'HIGH',
        message: `${delayedMilestones.length} milestone(s) are delayed`,
      });
    }
    if (
      project.estimatedCost &&
      project.approvedBudget &&
      project.estimatedCost.greaterThan(project.approvedBudget)
    ) {
      riskIndicators.push({
        code: 'BUDGET_OVERRUN',
        level: 'HIGH',
        message: 'Estimated cost exceeds approved budget',
      });
    }

    return {
      projectId: project.id,
      projectCode: project.projectCode,
      projectName: project.projectName,
      lifecycleStatus: project.lifecycleStatus,
      completionPercentage: project.completionPercentage.toString(),
      estimatedBudget: project.estimatedBudget.toString(),
      approvedBudget: project.approvedBudget?.toString() ?? null,
      estimatedCost: project.estimatedCost?.toString() ?? null,
      contractValue: project.contractValue?.toString() ?? null,
      currency: project.currency,
      milestoneSummary: {
        total: milestones.length,
        completed: milestones.filter(
          (milestone) => milestone.status === MilestoneStatus.COMPLETED,
        ).length,
        delayed: delayedMilestones.length,
        upcoming: milestones.filter(
          (milestone) =>
            milestone.status === MilestoneStatus.PENDING ||
            milestone.status === MilestoneStatus.IN_PROGRESS,
        ).length,
      },
      phaseSummary: {
        total: phases.length,
        completed: phases.filter(
          (phase) => phase.status === PhaseStatus.COMPLETED,
        ).length,
        inProgress: phases.filter(
          (phase) => phase.status === PhaseStatus.IN_PROGRESS,
        ).length,
      },
      teamCount,
      documentCount,
      upcomingDeadlines,
      pendingApprovals: [],
      materialRequests: [],
      purchaseOrders: [],
      siteAttendance: null,
      latestReports: [],
      recentPhotos,
      riskIndicators,
    };
  }

  async timeline(companyId: string, projectId: string) {
    const [phases, milestones] = await Promise.all([
      this.prisma.projectPhase.findMany({
        where: { companyId, projectId, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { plannedStartDate: 'asc' }],
        include: {
          tasks: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.projectMilestone.findMany({
        where: { companyId, projectId, deletedAt: null },
        orderBy: { targetDate: 'asc' },
        include: {
          dependsOn: { where: { deletedAt: null } },
        },
      }),
    ]);
    return { phases, milestones };
  }

  async listStatuses(companyId: string) {
    return this.prisma.projectStatusDefinition.findMany({
      where: {
        deletedAt: null,
        status: EntityStatus.ACTIVE,
        OR: [{ companyId: null, isSystem: true }, { companyId }],
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async listTypes(companyId: string) {
    return this.prisma.projectTypeDefinition.findMany({
      where: {
        deletedAt: null,
        status: EntityStatus.ACTIVE,
        OR: [{ companyId: null, isSystem: true }, { companyId }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async findSystemStatusByCode(code: string) {
    return this.prisma.projectStatusDefinition.findFirst({
      where: {
        code,
        companyId: null,
        isSystem: true,
        deletedAt: null,
      },
    });
  }

  async findStatusById(statusId: string, companyId: string) {
    return this.prisma.projectStatusDefinition.findFirst({
      where: {
        id: statusId,
        deletedAt: null,
        OR: [{ companyId: null, isSystem: true }, { companyId }],
      },
    });
  }

  async findTypeById(typeId: string, companyId: string) {
    return this.prisma.projectTypeDefinition.findFirst({
      where: {
        id: typeId,
        deletedAt: null,
        OR: [{ companyId: null, isSystem: true }, { companyId }],
      },
    });
  }

  async findActiveMembership(companyId: string, membershipId: string) {
    return this.prisma.companyMembership.findFirst({
      where: {
        id: membershipId,
        companyId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true, companyId: true },
    });
  }

  async projectCodeExists(
    companyId: string,
    projectCode: string,
    excludeProjectId?: string,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: {
        companyId,
        projectCode,
        deletedAt: null,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async getCompanyCurrency(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { currency: true },
    });
    return company?.currency ?? null;
  }

  async listPhases(companyId: string, projectId: string) {
    return this.prisma.projectPhase.findMany({
      where: { companyId, projectId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        tasks: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async createPhase(
    companyId: string,
    projectId: string,
    data: ProjectPhaseData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireProject(transaction, companyId, projectId);
      const phase = await transaction.projectPhase.create({
        data: {
          companyId,
          projectId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.PhaseCreate',
        entity: 'ProjectPhase',
        entityId: phase.id,
        newValue: phase,
      });
      return phase;
    });
  }

  async updatePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    data: Partial<ProjectPhaseData>,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requirePhase(
        transaction,
        companyId,
        projectId,
        phaseId,
      );
      const phase = await transaction.projectPhase.update({
        where: { id: phaseId },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.PhaseUpdate',
        entity: 'ProjectPhase',
        entityId: phaseId,
        oldValue: previous,
        newValue: phase,
      });
      return phase;
    });
  }

  async softDeletePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requirePhase(
        transaction,
        companyId,
        projectId,
        phaseId,
      );
      const phase = await transaction.projectPhase.update({
        where: { id: phaseId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.PhaseDelete',
        entity: 'ProjectPhase',
        entityId: phaseId,
        oldValue: previous,
        newValue: phase,
      });
      return phase;
    });
  }

  async createTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    data: ProjectTaskData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requirePhase(transaction, companyId, projectId, phaseId);
      const task = await transaction.projectTask.create({
        data: {
          companyId,
          projectId,
          phaseId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TaskCreate',
        entity: 'ProjectTask',
        entityId: task.id,
        newValue: task,
      });
      return task;
    });
  }

  async updateTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    data: Partial<ProjectTaskData>,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requireTask(
        transaction,
        companyId,
        projectId,
        phaseId,
        taskId,
      );
      const task = await transaction.projectTask.update({
        where: { id: taskId },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TaskUpdate',
        entity: 'ProjectTask',
        entityId: taskId,
        oldValue: previous,
        newValue: task,
      });
      return task;
    });
  }

  async softDeleteTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requireTask(
        transaction,
        companyId,
        projectId,
        phaseId,
        taskId,
      );
      const task = await transaction.projectTask.update({
        where: { id: taskId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TaskDelete',
        entity: 'ProjectTask',
        entityId: taskId,
        oldValue: previous,
        newValue: task,
      });
      return task;
    });
  }

  async listMilestones(companyId: string, projectId: string) {
    return this.prisma.projectMilestone.findMany({
      where: { companyId, projectId, deletedAt: null },
      orderBy: { targetDate: 'asc' },
      include: {
        dependsOn: { where: { deletedAt: null } },
        dependencyOf: { where: { deletedAt: null } },
      },
    });
  }

  async createMilestone(
    companyId: string,
    projectId: string,
    data: ProjectMilestoneData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireProject(transaction, companyId, projectId);
      if (data.phaseId) {
        await this.requirePhase(
          transaction,
          companyId,
          projectId,
          data.phaseId,
        );
      }
      const milestone = await transaction.projectMilestone.create({
        data: {
          companyId,
          projectId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.MilestoneCreate',
        entity: 'ProjectMilestone',
        entityId: milestone.id,
        newValue: milestone,
      });
      return milestone;
    });
  }

  async updateMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    data: Partial<ProjectMilestoneData>,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requireMilestone(
        transaction,
        companyId,
        projectId,
        milestoneId,
      );
      const milestone = await transaction.projectMilestone.update({
        where: { id: milestoneId },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.MilestoneUpdate',
        entity: 'ProjectMilestone',
        entityId: milestoneId,
        oldValue: previous,
        newValue: milestone,
      });
      return milestone;
    });
  }

  async softDeleteMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await this.requireMilestone(
        transaction,
        companyId,
        projectId,
        milestoneId,
      );
      const milestone = await transaction.projectMilestone.update({
        where: { id: milestoneId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.MilestoneDelete',
        entity: 'ProjectMilestone',
        entityId: milestoneId,
        oldValue: previous,
        newValue: milestone,
      });
      return milestone;
    });
  }

  async addMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dependsOnMilestoneId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      if (milestoneId === dependsOnMilestoneId) {
        throw new ConflictException('A milestone cannot depend on itself');
      }
      await this.requireMilestone(
        transaction,
        companyId,
        projectId,
        milestoneId,
      );
      await this.requireMilestone(
        transaction,
        companyId,
        projectId,
        dependsOnMilestoneId,
      );
      const dependency = await transaction.projectMilestoneDependency.create({
        data: {
          companyId,
          projectId,
          milestoneId,
          dependsOnMilestoneId,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.MilestoneDependencyCreate',
        entity: 'ProjectMilestoneDependency',
        entityId: dependency.id,
        newValue: dependency,
      });
      return dependency;
    });
  }

  async removeMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dependencyId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectMilestoneDependency.findFirst({
        where: {
          id: dependencyId,
          companyId,
          projectId,
          milestoneId,
          deletedAt: null,
        },
      });
      if (!previous) {
        throw new NotFoundException('Milestone dependency was not found');
      }
      const dependency = await transaction.projectMilestoneDependency.update({
        where: { id: dependencyId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.MilestoneDependencyDelete',
        entity: 'ProjectMilestoneDependency',
        entityId: dependencyId,
        oldValue: previous,
        newValue: dependency,
      });
      return dependency;
    });
  }

  async listTeam(companyId: string, projectId: string) {
    return this.prisma.projectTeamMember.findMany({
      where: { companyId, projectId, deletedAt: null },
      orderBy: { assignedAt: 'asc' },
      include: {
        membership: {
          select: {
            id: true,
            userId: true,
            status: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async assignTeam(
    companyId: string,
    projectId: string,
    data: ProjectTeamData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireProject(transaction, companyId, projectId);
      const member = await transaction.projectTeamMember.create({
        data: {
          companyId,
          projectId,
          membershipId: data.membershipId,
          role: data.role,
          isPrimary: data.isPrimary ?? false,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      if (
        data.role === ProjectTeamRole.PROJECT_MANAGER &&
        data.isPrimary !== false
      ) {
        await transaction.project.update({
          where: { id: projectId },
          data: {
            projectManagerId: data.membershipId,
            updatedBy: actorId,
          },
        });
      }
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TeamAssign',
        entity: 'ProjectTeamMember',
        entityId: member.id,
        newValue: member,
      });
      return member;
    });
  }

  async updateTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    data: Partial<ProjectTeamData>,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectTeamMember.findFirst({
        where: { id: memberId, companyId, projectId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Project team member was not found');
      }
      const member = await transaction.projectTeamMember.update({
        where: { id: memberId },
        data: { ...data, updatedBy: actorId },
      });
      const role = data.role ?? previous.role;
      const membershipId = data.membershipId ?? previous.membershipId;
      const isPrimary = data.isPrimary ?? previous.isPrimary;
      if (role === ProjectTeamRole.PROJECT_MANAGER && isPrimary) {
        await transaction.project.update({
          where: { id: projectId },
          data: { projectManagerId: membershipId, updatedBy: actorId },
        });
      }
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TeamUpdate',
        entity: 'ProjectTeamMember',
        entityId: memberId,
        oldValue: previous,
        newValue: member,
      });
      return member;
    });
  }

  async unassignTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectTeamMember.findFirst({
        where: { id: memberId, companyId, projectId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Project team member was not found');
      }
      const member = await transaction.projectTeamMember.update({
        where: { id: memberId },
        data: {
          deletedAt: new Date(),
          unassignedAt: new Date(),
          status: EntityStatus.INACTIVE,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TeamUnassign',
        entity: 'ProjectTeamMember',
        entityId: memberId,
        oldValue: previous,
        newValue: member,
      });
      return member;
    });
  }

  async listDocuments(companyId: string, projectId: string) {
    return this.prisma.projectDocument.findMany({
      where: { companyId, projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDocument(
    companyId: string,
    projectId: string,
    data: ProjectDocumentData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireProject(transaction, companyId, projectId);
      const document = await transaction.projectDocument.create({
        data: {
          companyId,
          projectId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.DocumentCreate',
        entity: 'ProjectDocument',
        entityId: document.id,
        newValue: document,
      });
      return document;
    });
  }

  async updateDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    data: Partial<ProjectDocumentData>,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectDocument.findFirst({
        where: { id: documentId, companyId, projectId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Project document was not found');
      }
      const document = await transaction.projectDocument.update({
        where: { id: documentId },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.DocumentUpdate',
        entity: 'ProjectDocument',
        entityId: documentId,
        oldValue: previous,
        newValue: document,
      });
      return document;
    });
  }

  async softDeleteDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectDocument.findFirst({
        where: { id: documentId, companyId, projectId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Project document was not found');
      }
      const document = await transaction.projectDocument.update({
        where: { id: documentId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.DocumentDelete',
        entity: 'ProjectDocument',
        entityId: documentId,
        oldValue: previous,
        newValue: document,
      });
      return document;
    });
  }

  async listCalendar(
    companyId: string,
    projectId: string,
    from?: Date,
    to?: Date,
  ) {
    return this.prisma.projectCalendarEvent.findMany({
      where: {
        companyId,
        projectId,
        deletedAt: null,
        ...(from || to
          ? {
              startsAt: {
                gte: from,
                lte: to,
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async createCalendarEvent(
    companyId: string,
    projectId: string,
    data: ProjectCalendarData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireProject(transaction, companyId, projectId);
      const event = await transaction.projectCalendarEvent.create({
        data: {
          companyId,
          projectId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.CalendarCreate',
        entity: 'ProjectCalendarEvent',
        entityId: event.id,
        newValue: event,
      });
      return event;
    });
  }

  async updateCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    data: Partial<ProjectCalendarData>,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectCalendarEvent.findFirst({
        where: { id: eventId, companyId, projectId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Calendar event was not found');
      }
      const event = await transaction.projectCalendarEvent.update({
        where: { id: eventId },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.CalendarUpdate',
        entity: 'ProjectCalendarEvent',
        entityId: eventId,
        oldValue: previous,
        newValue: event,
      });
      return event;
    });
  }

  async softDeleteCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectCalendarEvent.findFirst({
        where: { id: eventId, companyId, projectId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Calendar event was not found');
      }
      const event = await transaction.projectCalendarEvent.update({
        where: { id: eventId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.CalendarDelete',
        entity: 'ProjectCalendarEvent',
        entityId: eventId,
        oldValue: previous,
        newValue: event,
      });
      return event;
    });
  }

  async getSettings(companyId: string, projectId: string) {
    return this.prisma.projectSettings.findFirst({
      where: { companyId, projectId, deletedAt: null },
    });
  }

  async updateSettings(
    companyId: string,
    projectId: string,
    data: ProjectSettingsData,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectSettings.findFirst({
        where: { companyId, projectId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Project settings were not found');
      }
      const settings = await transaction.projectSettings.update({
        where: { id: previous.id },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.SettingsUpdate',
        entity: 'ProjectSettings',
        entityId: settings.id,
        oldValue: previous,
        newValue: settings,
      });
      return settings;
    });
  }

  async listTags(companyId: string) {
    return this.prisma.projectTag.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(companyId: string, data: ProjectTagData, actorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.projectTag.findFirst({
        where: { companyId, code: data.code, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('Project tag code already exists');
      }
      const tag = await transaction.projectTag.create({
        data: {
          companyId,
          ...data,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TagCreate',
        entity: 'ProjectTag',
        entityId: tag.id,
        newValue: tag,
      });
      return tag;
    });
  }

  async updateTag(
    companyId: string,
    tagId: string,
    data: Partial<ProjectTagData>,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectTag.findFirst({
        where: { id: tagId, companyId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Project tag was not found');
      }
      const tag = await transaction.projectTag.update({
        where: { id: tagId },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TagUpdate',
        entity: 'ProjectTag',
        entityId: tagId,
        oldValue: previous,
        newValue: tag,
      });
      return tag;
    });
  }

  async softDeleteTag(companyId: string, tagId: string, actorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectTag.findFirst({
        where: { id: tagId, companyId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Project tag was not found');
      }
      const tag = await transaction.projectTag.update({
        where: { id: tagId },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TagDelete',
        entity: 'ProjectTag',
        entityId: tagId,
        oldValue: previous,
        newValue: tag,
      });
      return tag;
    });
  }

  async assignTag(
    companyId: string,
    projectId: string,
    tagId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requireProject(transaction, companyId, projectId);
      const tag = await transaction.projectTag.findFirst({
        where: { id: tagId, companyId, deletedAt: null },
      });
      if (!tag) {
        throw new NotFoundException('Project tag was not found');
      }
      const existing = await transaction.projectTagAssignment.findFirst({
        where: { companyId, projectId, tagId, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('Tag is already assigned to the project');
      }
      const assignment = await transaction.projectTagAssignment.create({
        data: {
          companyId,
          projectId,
          tagId,
          createdBy: actorId,
          updatedBy: actorId,
        },
        include: { tag: true },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TagAssign',
        entity: 'ProjectTagAssignment',
        entityId: assignment.id,
        newValue: assignment,
      });
      return assignment;
    });
  }

  async unassignTag(
    companyId: string,
    projectId: string,
    tagId: string,
    actorId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.projectTagAssignment.findFirst({
        where: { companyId, projectId, tagId, deletedAt: null },
      });
      if (!previous) {
        throw new NotFoundException('Tag assignment was not found');
      }
      const assignment = await transaction.projectTagAssignment.update({
        where: { id: previous.id },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Project.TagUnassign',
        entity: 'ProjectTagAssignment',
        entityId: previous.id,
        oldValue: previous,
        newValue: assignment,
      });
      return assignment;
    });
  }

  async principalHasPermission(
    companyId: string,
    membershipId: string,
    permissionCode: string,
  ) {
    const permission = await this.prisma.permission.findFirst({
      where: {
        code: permissionCode,
        deletedAt: null,
        roles: {
          some: {
            deletedAt: null,
            role: {
              deletedAt: null,
              OR: [{ companyId: null }, { companyId }],
              memberships: {
                some: {
                  membershipId,
                  companyId,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      select: { id: true },
    });
    return Boolean(permission);
  }

  private async requireProject(
    transaction: Prisma.TransactionClient,
    companyId: string,
    projectId: string,
  ) {
    const project = await transaction.project.findFirst({
      where: { id: projectId, companyId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project was not found');
    }
    return project;
  }

  private async requirePhase(
    transaction: Prisma.TransactionClient,
    companyId: string,
    projectId: string,
    phaseId: string,
  ) {
    const phase = await transaction.projectPhase.findFirst({
      where: { id: phaseId, companyId, projectId, deletedAt: null },
    });
    if (!phase) {
      throw new NotFoundException('Project phase was not found');
    }
    return phase;
  }

  private async requireTask(
    transaction: Prisma.TransactionClient,
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
  ) {
    const task = await transaction.projectTask.findFirst({
      where: { id: taskId, companyId, projectId, phaseId, deletedAt: null },
    });
    if (!task) {
      throw new NotFoundException('Project task was not found');
    }
    return task;
  }

  private async requireMilestone(
    transaction: Prisma.TransactionClient,
    companyId: string,
    projectId: string,
    milestoneId: string,
  ) {
    const milestone = await transaction.projectMilestone.findFirst({
      where: { id: milestoneId, companyId, projectId, deletedAt: null },
    });
    if (!milestone) {
      throw new NotFoundException('Project milestone was not found');
    }
    return milestone;
  }
}
