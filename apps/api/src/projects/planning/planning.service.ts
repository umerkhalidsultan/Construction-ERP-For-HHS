import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BaselineStatus,
  MilestoneStatus,
  Prisma,
  TaskStatus,
  Weekday,
} from '@prisma/client';
import { AUDIT_SERVICE } from '../../audit/audit.interface';
import type { IAuditService } from '../../audit/audit.interface';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityService } from '../../quality/quality.service';
import {
  ActivityQueryDto,
  CreateActivityDto,
  CreateBaselineDto,
  CreateDependencyDto,
  CreateWbsDto,
  UpdatePlanningActivityDto,
  UpdateProgressDto,
  UpdateWbsDto,
} from './planning.dto';
import { addWorkingDays, calculateSchedule } from './scheduling-engine';

const memberSelect = {
  id: true,
  employeeCode: true,
  user: { select: { firstName: true, lastName: true, email: true } },
} as const;

const activityInclude = {
  wbs: { select: { id: true, code: true, name: true } },
  phase: { select: { id: true, code: true, name: true } },
  assignee: { select: memberSelect },
  supervisor: { select: memberSelect },
  predecessors: {
    include: {
      predecessor: { select: { id: true, activityCode: true, name: true } },
    },
  },
} as const;

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_SERVICE) private readonly audit: IAuditService,
    private readonly quality: QualityService,
  ) {}

  async dashboard(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.requireProject(companyId, projectId, principal);
    const [activities, milestones, approvedBaseline] = await Promise.all([
      this.prisma.projectTask.findMany({
        where: { companyId, projectId, deletedAt: null },
        select: {
          status: true,
          isCritical: true,
          plannedStartDate: true,
          plannedEndDate: true,
          actualEndDate: true,
          completionPercentage: true,
          durationDays: true,
        },
      }),
      this.prisma.projectMilestone.findMany({
        where: { companyId, projectId, deletedAt: null },
        orderBy: { targetDate: 'asc' },
        take: 5,
        select: {
          id: true,
          name: true,
          targetDate: true,
          actualDate: true,
          status: true,
        },
      }),
      this.prisma.projectBaseline.findFirst({
        where: {
          companyId,
          projectId,
          status: BaselineStatus.APPROVED,
          deletedAt: null,
        },
        include: { activities: { select: { plannedFinish: true } } },
        orderBy: { revision: 'desc' },
      }),
    ]);
    const today = new Date();
    const totalWeight = activities.reduce(
      (sum, item) => sum + Math.max(1, item.durationDays),
      0,
    );
    const actualProgress = totalWeight
      ? activities.reduce(
          (sum, item) =>
            sum +
            Number(item.completionPercentage) * Math.max(1, item.durationDays),
          0,
        ) / totalWeight
      : 0;
    const plannedProgress = this.calculatePlannedProgress(activities, today);
    const forecast = activities.reduce<Date | null>(
      (latest, item) =>
        item.plannedEndDate && (!latest || item.plannedEndDate > latest)
          ? item.plannedEndDate
          : latest,
      null,
    );
    const baselineCompletion =
      approvedBaseline?.activities.reduce<Date | null>(
        (latest, item) =>
          item.plannedFinish && (!latest || item.plannedFinish > latest)
            ? item.plannedFinish
            : latest,
        null,
      ) ?? null;
    const delayed = activities.filter(
      (item) =>
        item.status !== TaskStatus.COMPLETED &&
        item.plannedEndDate &&
        item.plannedEndDate < today,
    ).length;
    return {
      project: {
        id: project.id,
        projectName: project.projectName,
        projectStartDate: project.projectStartDate,
        plannedCompletionDate: project.plannedCompletionDate,
        projectManager: project.projectManager,
      },
      forecastCompletionDate: forecast,
      originalCompletionDate: project.plannedCompletionDate,
      baselineCompletionDate: baselineCompletion,
      forecastVarianceDays: forecast
        ? this.calendarDayDifference(project.plannedCompletionDate, forecast)
        : 0,
      baselineVarianceDays:
        forecast && baselineCompletion
          ? this.calendarDayDifference(baselineCompletion, forecast)
          : null,
      plannedProgress,
      actualProgress,
      scheduleVariance: actualProgress - plannedProgress,
      delayedActivities: delayed,
      criticalActivities: activities.filter((item) => item.isCritical).length,
      completedActivities: activities.filter(
        (item) => item.status === TaskStatus.COMPLETED,
      ).length,
      inProgressActivities: activities.filter(
        (item) => item.status === TaskStatus.IN_PROGRESS,
      ).length,
      notStartedActivities: activities.filter(
        (item) => item.status === TaskStatus.TODO,
      ).length,
      upcomingMilestones: milestones,
    };
  }

  async listWbs(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    return this.prisma.projectWbs.findMany({
      where: { companyId, projectId, deletedAt: null },
      include: {
        _count: {
          select: {
            activities: { where: { deletedAt: null } },
            children: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async createWbs(
    companyId: string,
    projectId: string,
    dto: CreateWbsDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    await this.validateWbsReferences(companyId, projectId, dto);
    const duplicate = await this.prisma.projectWbs.findFirst({
      where: { companyId, projectId, code: dto.code, deletedAt: null },
    });
    if (duplicate)
      throw new ConflictException('WBS code already exists in this project');
    return this.prisma.$transaction(async (tx) => {
      const node = await tx.projectWbs.create({
        data: {
          ...dto,
          companyId,
          projectId,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.WbsCreated',
        entity: 'ProjectWbs',
        entityId: node.id,
        newValue: node,
      });
      return node;
    });
  }

  async updateWbs(
    companyId: string,
    projectId: string,
    wbsId: string,
    dto: UpdateWbsDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    const previous = await this.requireWbs(companyId, projectId, wbsId);
    if (dto.parentId === wbsId)
      throw new BadRequestException('WBS cannot be its own parent');
    await this.validateWbsReferences(companyId, projectId, dto);
    if (
      dto.parentId &&
      (await this.wouldCreateWbsCycle(
        companyId,
        projectId,
        wbsId,
        dto.parentId,
      ))
    ) {
      throw new BadRequestException('WBS hierarchy cannot contain a cycle');
    }
    if (dto.code && dto.code !== previous.code) {
      const duplicate = await this.prisma.projectWbs.findFirst({
        where: {
          companyId,
          projectId,
          code: dto.code,
          deletedAt: null,
          NOT: { id: wbsId },
        },
      });
      if (duplicate)
        throw new ConflictException('WBS code already exists in this project');
    }
    return this.prisma.$transaction(async (tx) => {
      const node = await tx.projectWbs.update({
        where: { id: wbsId },
        data: { ...dto, updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.WbsUpdated',
        entity: 'ProjectWbs',
        entityId: wbsId,
        oldValue: previous,
        newValue: node,
      });
      return node;
    });
  }

  async deleteWbs(
    companyId: string,
    projectId: string,
    wbsId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    const previous = await this.requireWbs(companyId, projectId, wbsId);
    const [children, activities] = await Promise.all([
      this.prisma.projectWbs.count({
        where: { parentId: wbsId, deletedAt: null },
      }),
      this.prisma.projectTask.count({ where: { wbsId, deletedAt: null } }),
    ]);
    if (children || activities)
      throw new ConflictException(
        'Move child WBS nodes and activities before deleting this WBS',
      );
    return this.prisma.$transaction(async (tx) => {
      const node = await tx.projectWbs.update({
        where: { id: wbsId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.WbsDeleted',
        entity: 'ProjectWbs',
        entityId: wbsId,
        oldValue: previous,
        newValue: node,
      });
      return node;
    });
  }

  async listActivities(
    companyId: string,
    projectId: string,
    query: ActivityQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    const today = new Date();
    return this.prisma.projectTask.findMany({
      where: {
        companyId,
        projectId,
        deletedAt: null,
        wbsId: query.wbsId,
        phaseId: query.phaseId,
        status: query.status,
        isCritical: query.critical,
        activityType: query.activityType,
        assigneeMembershipId: query.responsibleMembershipId,
        ...(query.delayed
          ? {
              plannedEndDate: { lt: today },
              status: { not: TaskStatus.COMPLETED },
            }
          : {}),
        ...(query.from || query.to
          ? {
              plannedStartDate: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                {
                  activityCode: { contains: query.search, mode: 'insensitive' },
                },
                {
                  wbs: {
                    name: { contains: query.search, mode: 'insensitive' },
                  },
                },
                {
                  wbs: {
                    code: { contains: query.search, mode: 'insensitive' },
                  },
                },
                {
                  assignee: {
                    user: {
                      firstName: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
                {
                  assignee: {
                    user: {
                      lastName: { contains: query.search, mode: 'insensitive' },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: activityInclude,
      orderBy: [
        { sortOrder: 'asc' },
        { plannedStartDate: 'asc' },
        { createdAt: 'asc' },
      ],
      take: query.limit ?? 1000,
    });
  }

  async createActivity(
    companyId: string,
    projectId: string,
    dto: CreateActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.requireProject(companyId, projectId, principal);
    await this.validateActivity(companyId, projectId, dto);
    const duplicate = await this.prisma.projectTask.findFirst({
      where: {
        companyId,
        projectId,
        activityCode: dto.activityCode,
        deletedAt: null,
      },
    });
    if (duplicate)
      throw new ConflictException(
        'Activity code already exists in this project',
      );
    const data = this.activityData(dto, project.projectStartDate);
    const created = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.projectTask.create({
        data: {
          ...data,
          companyId,
          projectId,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        } as Prisma.ProjectTaskUncheckedCreateInput,
      });
      if (activity.activityType === 'MILESTONE') {
        await tx.projectMilestone.create({
          data: {
            companyId,
            projectId,
            phaseId: activity.phaseId,
            activityId: activity.id,
            name: activity.name,
            description: activity.description,
            targetDate: activity.plannedStartDate ?? project.projectStartDate,
            status: MilestoneStatus.PENDING,
            completionPercentage: activity.completionPercentage,
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
        });
      }
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.ActivityCreated',
        entity: 'ProjectTask',
        entityId: activity.id,
        newValue: activity,
      });
      return activity;
    });
    await this.recalculateInternal(companyId, projectId, project);
    return this.prisma.projectTask.findUnique({
      where: { id: created.id },
      include: activityInclude,
    });
  }

  async updateActivity(
    companyId: string,
    projectId: string,
    activityId: string,
    dto: UpdatePlanningActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.requireProject(companyId, projectId, principal);
    const previous = await this.requireActivity(
      companyId,
      projectId,
      activityId,
    );
    if (
      dto.expectedUpdatedAt &&
      previous.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()
    ) {
      throw new ConflictException(
        'This activity was changed by another user. Refresh before saving your changes.',
      );
    }
    await this.validateActivity(companyId, projectId, dto, activityId);
    if (dto.parentTaskId === activityId)
      throw new BadRequestException('Activity cannot be its own parent');
    if (dto.activityCode && dto.activityCode !== previous.activityCode) {
      const duplicate = await this.prisma.projectTask.findFirst({
        where: {
          companyId,
          projectId,
          activityCode: dto.activityCode,
          deletedAt: null,
          NOT: { id: activityId },
        },
      });
      if (duplicate)
        throw new ConflictException(
          'Activity code already exists in this project',
        );
    }
    const changes = { ...dto };
    delete changes.expectedUpdatedAt;
    const data = this.activityData(
      changes,
      previous.plannedStartDate ?? project.projectStartDate,
    );
    await this.prisma.$transaction(async (tx) => {
      const activity = await tx.projectTask.update({
        where: { id: activityId },
        data: { ...data, updatedBy: principal.userId },
      });
      const linkedMilestone = await tx.projectMilestone.findUnique({
        where: { activityId },
      });
      if (activity.activityType === 'MILESTONE') {
        const milestoneData = {
          companyId,
          projectId,
          phaseId: activity.phaseId,
          name: activity.name,
          description: activity.description,
          targetDate: activity.plannedStartDate ?? project.projectStartDate,
          completionPercentage: activity.completionPercentage,
          updatedBy: principal.userId,
          deletedAt: null,
        };
        if (linkedMilestone) {
          await tx.projectMilestone.update({
            where: { id: linkedMilestone.id },
            data: milestoneData,
          });
        } else {
          await tx.projectMilestone.create({
            data: {
              ...milestoneData,
              activityId,
              status: MilestoneStatus.PENDING,
              createdBy: principal.userId,
            },
          });
        }
      } else if (linkedMilestone && !linkedMilestone.deletedAt) {
        await tx.projectMilestone.update({
          where: { id: linkedMilestone.id },
          data: { deletedAt: new Date(), updatedBy: principal.userId },
        });
      }
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.ActivityUpdated',
        entity: 'ProjectTask',
        entityId: activityId,
        oldValue: previous,
        newValue: activity,
      });
    });
    await this.recalculateInternal(companyId, projectId, project);
    return this.prisma.projectTask.findUnique({
      where: { id: activityId },
      include: activityInclude,
    });
  }

  async deleteActivity(
    companyId: string,
    projectId: string,
    activityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    const previous = await this.requireActivity(
      companyId,
      projectId,
      activityId,
    );
    const linked = await this.prisma.activityDependency.count({
      where: {
        OR: [{ predecessorId: activityId }, { successorId: activityId }],
      },
    });
    if (linked)
      throw new ConflictException(
        'Remove activity dependencies before deleting this activity',
      );
    return this.prisma.$transaction(async (tx) => {
      await tx.projectMilestone.updateMany({
        where: { activityId, deletedAt: null },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      const activity = await tx.projectTask.update({
        where: { id: activityId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.ActivityDeleted',
        entity: 'ProjectTask',
        entityId: activityId,
        oldValue: previous,
        newValue: activity,
      });
      return activity;
    });
  }

  async createDependency(
    companyId: string,
    projectId: string,
    dto: CreateDependencyDto,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.requireProject(companyId, projectId, principal);
    if (dto.predecessorId === dto.successorId)
      throw new BadRequestException('An activity cannot depend on itself');
    const dependency = await this.prisma.$transaction(
      async (tx) => {
        const [activities, dependencies] = await Promise.all([
          tx.projectTask.findMany({
            where: { companyId, projectId, deletedAt: null },
          }),
          tx.activityDependency.findMany({ where: { companyId, projectId } }),
        ]);
        if (
          !activities.some((item) => item.id === dto.predecessorId) ||
          !activities.some((item) => item.id === dto.successorId)
        ) {
          throw new NotFoundException(
            'Predecessor or successor was not found in this project',
          );
        }
        try {
          const calendar = this.calendarDates(project.calendarEvents);
          calculateSchedule(
            activities,
            [
              ...dependencies,
              { ...dto, type: dto.type ?? 'FS', lagDays: dto.lagDays ?? 0 },
            ],
            project.projectStartDate,
            this.workingDays(project.settings?.workingDays),
            calendar.holidays,
            calendar.overrides,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Invalid dependency';
          throw new BadRequestException(
            message.includes('Circular')
              ? 'Cannot create dependency because it creates a circular schedule.'
              : message,
          );
        }
        const created = await tx.activityDependency.create({
          data: {
            companyId,
            projectId,
            predecessorId: dto.predecessorId,
            successorId: dto.successorId,
            type: dto.type,
            lagDays: dto.lagDays,
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
        });
        await this.audit.record(tx, {
          companyId,
          action: 'ProjectPlanning.DependencyCreated',
          entity: 'ActivityDependency',
          entityId: created.id,
          newValue: created,
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.recalculateInternal(companyId, projectId, project);
    return dependency;
  }

  async deleteDependency(
    companyId: string,
    projectId: string,
    dependencyId: string,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.requireProject(companyId, projectId, principal);
    const previous = await this.prisma.activityDependency.findFirst({
      where: { id: dependencyId, companyId, projectId },
    });
    if (!previous) throw new NotFoundException('Dependency was not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.activityDependency.delete({ where: { id: dependencyId } });
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.DependencyDeleted',
        entity: 'ActivityDependency',
        entityId: dependencyId,
        oldValue: previous,
      });
    });
    await this.recalculateInternal(companyId, projectId, project);
    return previous;
  }

  async updateProgress(
    companyId: string,
    projectId: string,
    activityId: string,
    dto: UpdateProgressDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    const previous = await this.requireActivity(
      companyId,
      projectId,
      activityId,
    );
    if (dto.percentComplete >= 100) {
      await this.quality.assertActivityHoldPointsResolved(
        companyId,
        projectId,
        activityId,
      );
    }
    if (
      dto.actualQuantity !== undefined &&
      previous.plannedQuantity &&
      new Prisma.Decimal(dto.actualQuantity).greaterThan(
        previous.plannedQuantity,
      )
    ) {
      throw new BadRequestException(
        'Actual quantity cannot exceed planned quantity',
      );
    }
    const status =
      dto.percentComplete >= 100
        ? TaskStatus.COMPLETED
        : dto.percentComplete > 0
          ? TaskStatus.IN_PROGRESS
          : TaskStatus.TODO;
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.activityProgress.create({
        data: {
          companyId,
          projectId,
          activityId,
          progressDate: new Date(dto.progressDate),
          percentComplete: new Prisma.Decimal(dto.percentComplete),
          actualQuantity:
            dto.actualQuantity === undefined
              ? undefined
              : new Prisma.Decimal(dto.actualQuantity),
          remainingQuantity:
            dto.remainingQuantity === undefined
              ? undefined
              : new Prisma.Decimal(dto.remainingQuantity),
          notes: dto.notes,
          createdBy: principal.userId,
        },
      });
      const activity = await tx.projectTask.update({
        where: { id: activityId },
        data: {
          completionPercentage: new Prisma.Decimal(dto.percentComplete),
          actualQuantity: entry.actualQuantity,
          status,
          actualStartDate:
            dto.percentComplete > 0
              ? (previous.actualStartDate ?? new Date(dto.progressDate))
              : previous.actualStartDate,
          actualEndDate:
            dto.percentComplete >= 100 ? new Date(dto.progressDate) : null,
          remainingDurationDays: Math.ceil(
            (previous.durationDays * (100 - dto.percentComplete)) / 100,
          ),
          updatedBy: principal.userId,
        },
      });
      if (activity.activityType === 'MILESTONE') {
        await tx.projectMilestone.updateMany({
          where: { activityId, deletedAt: null },
          data: {
            completionPercentage: new Prisma.Decimal(dto.percentComplete),
            status:
              dto.percentComplete >= 100
                ? MilestoneStatus.COMPLETED
                : dto.percentComplete > 0
                  ? MilestoneStatus.IN_PROGRESS
                  : MilestoneStatus.PENDING,
            actualDate:
              dto.percentComplete >= 100 ? new Date(dto.progressDate) : null,
            updatedBy: principal.userId,
          },
        });
      }
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.ProgressUpdated',
        entity: 'ProjectTask',
        entityId: activityId,
        oldValue: previous,
        newValue: { activity, entry },
      });
      return { activity, entry };
    });
  }

  async createBaseline(
    companyId: string,
    projectId: string,
    dto: CreateBaselineDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    const activities = await this.prisma.projectTask.findMany({
      where: { companyId, projectId, deletedAt: null },
    });
    if (!activities.length)
      throw new BadRequestException(
        'Create activities before taking a baseline',
      );
    const aggregate = await this.prisma.projectBaseline.aggregate({
      where: { projectId },
      _max: { revision: true },
    });
    return this.prisma.$transaction(async (tx) => {
      const baseline = await tx.projectBaseline.create({
        data: {
          companyId,
          projectId,
          name: dto.name,
          description: dto.description,
          revision: (aggregate._max.revision ?? 0) + 1,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await tx.baselineActivity.createMany({
        data: activities.map((activity) => ({
          baselineId: baseline.id,
          activityId: activity.id,
          plannedStart: activity.plannedStartDate,
          plannedFinish: activity.plannedEndDate,
          durationDays: activity.durationDays,
          progress: activity.completionPercentage,
        })),
      });
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.BaselineCreated',
        entity: 'ProjectBaseline',
        entityId: baseline.id,
        newValue: baseline,
      });
      return tx.projectBaseline.findUnique({
        where: { id: baseline.id },
        include: { activities: true },
      });
    });
  }

  async approveBaseline(
    companyId: string,
    projectId: string,
    baselineId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    const previous = await this.prisma.projectBaseline.findFirst({
      where: { id: baselineId, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Baseline was not found');
    if (previous.status === BaselineStatus.APPROVED) return previous;
    return this.prisma.$transaction(async (tx) => {
      await tx.projectBaseline.updateMany({
        where: { companyId, projectId, status: BaselineStatus.APPROVED },
        data: {
          status: BaselineStatus.SUPERSEDED,
          updatedBy: principal.userId,
        },
      });
      const baseline = await tx.projectBaseline.update({
        where: { id: baselineId },
        data: {
          status: BaselineStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.BaselineApproved',
        entity: 'ProjectBaseline',
        entityId: baselineId,
        oldValue: previous,
        newValue: baseline,
      });
      return baseline;
    });
  }

  async listBaselines(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId, principal);
    return this.prisma.projectBaseline.findMany({
      where: { companyId, projectId, deletedAt: null },
      include: { _count: { select: { activities: true } } },
      orderBy: { revision: 'desc' },
    });
  }

  async gantt(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.requireProject(companyId, projectId, principal);
    const [wbs, activities, dependencies, baseline] = await Promise.all([
      this.listWbs(companyId, projectId, principal),
      this.listActivities(companyId, projectId, {}, principal),
      this.prisma.activityDependency.findMany({
        where: { companyId, projectId },
      }),
      this.prisma.projectBaseline.findFirst({
        where: {
          companyId,
          projectId,
          status: BaselineStatus.APPROVED,
          deletedAt: null,
        },
        include: { activities: true },
        orderBy: { revision: 'desc' },
      }),
    ]);
    const baselineByActivity = new Map(
      baseline?.activities.map((item) => [item.activityId, item]) ?? [],
    );
    return {
      project: {
        id: project.id,
        projectStartDate: project.projectStartDate,
        plannedCompletionDate: project.plannedCompletionDate,
      },
      wbs,
      dependencies,
      baseline: baseline
        ? { id: baseline.id, name: baseline.name, revision: baseline.revision }
        : null,
      activities: activities.map((activity) => ({
        ...activity,
        baseline: baselineByActivity.get(activity.id) ?? null,
      })),
    };
  }

  async recalculate(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.requireProject(companyId, projectId, principal);
    const result = await this.recalculateInternal(
      companyId,
      projectId,
      project,
    );
    await this.prisma.$transaction(async (tx) => {
      await this.audit.record(tx, {
        companyId,
        action: 'ProjectPlanning.ScheduleRecalculated',
        entity: 'Project',
        entityId: projectId,
        newValue: {
          activityCount: result.activities.length,
          warnings: result.warnings,
        },
      });
    });
    return result;
  }

  private async recalculateInternal(
    companyId: string,
    projectId: string,
    project: Awaited<ReturnType<PlanningService['requireProject']>>,
  ) {
    const [activities, dependencies] = await Promise.all([
      this.prisma.projectTask.findMany({
        where: { companyId, projectId, deletedAt: null },
      }),
      this.prisma.activityDependency.findMany({
        where: { companyId, projectId },
      }),
    ]);
    let result;
    try {
      const calendar = this.calendarDates(project.calendarEvents);
      result = calculateSchedule(
        activities,
        dependencies,
        project.projectStartDate,
        this.workingDays(project.settings?.workingDays),
        calendar.holidays,
        calendar.overrides,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Schedule cannot be calculated',
      );
    }
    await this.prisma.$transaction(
      result.map((item) =>
        this.prisma.projectTask.update({
          where: { id: item.id },
          data: {
            ...(!activities.find((activity) => activity.id === item.id)
              ?.isManuallyScheduled
              ? {
                  plannedStartDate: item.earlyStartDate,
                  plannedEndDate: item.earlyFinishDate,
                }
              : {}),
            earlyStartDate: item.earlyStartDate,
            earlyFinishDate: item.earlyFinishDate,
            lateStartDate: item.lateStartDate,
            lateFinishDate: item.lateFinishDate,
            totalFloatDays: item.totalFloatDays,
            freeFloatDays: item.freeFloatDays,
            isCritical: item.isCritical,
          },
        }),
      ),
    );
    return {
      activities: result,
      warnings: result
        .filter((item) => item.conflict)
        .map((item) => ({ activityId: item.id, message: item.conflict })),
    };
  }

  private async requireProject(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId, deletedAt: null },
      include: {
        settings: true,
        calendarEvents: {
          where: {
            deletedAt: null,
            eventType: { in: ['HOLIDAY', 'WORKING_DAY_OVERRIDE'] },
          },
          select: { eventType: true, startsAt: true },
        },
        projectManager: { select: memberSelect },
        teamMembers: {
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { membershipId: true },
        },
      },
    });
    if (!project) throw new NotFoundException('Project was not found');
    if (
      !principal.isPlatformAdmin &&
      principal.membershipId &&
      project.projectManagerId !== principal.membershipId &&
      project.siteEngineerId !== principal.membershipId &&
      !project.teamMembers.some(
        (item) => item.membershipId === principal.membershipId,
      )
    ) {
      throw new ForbiddenException('You are not assigned to this project');
    }
    return project;
  }

  private async requireWbs(companyId: string, projectId: string, id: string) {
    const node = await this.prisma.projectWbs.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!node) throw new NotFoundException('WBS was not found');
    return node;
  }

  private async requireActivity(
    companyId: string,
    projectId: string,
    id: string,
  ) {
    const activity = await this.prisma.projectTask.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!activity) throw new NotFoundException('Activity was not found');
    return activity;
  }

  private async validateWbsReferences(
    companyId: string,
    projectId: string,
    dto: Partial<CreateWbsDto>,
  ) {
    if (dto.parentId) await this.requireWbs(companyId, projectId, dto.parentId);
    if (dto.phaseId) {
      const phase = await this.prisma.projectPhase.findFirst({
        where: { id: dto.phaseId, companyId, projectId, deletedAt: null },
      });
      if (!phase) throw new NotFoundException('Phase was not found');
    }
  }

  private async wouldCreateWbsCycle(
    companyId: string,
    projectId: string,
    nodeId: string,
    parentId: string,
  ) {
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === nodeId) return true;
      const parent: { parentId: string | null } | null =
        await this.prisma.projectWbs.findFirst({
          where: { id: cursor, companyId, projectId, deletedAt: null },
          select: { parentId: true },
        });
      cursor = parent?.parentId ?? null;
    }
    return false;
  }

  private async validateActivity(
    companyId: string,
    projectId: string,
    dto: Partial<CreateActivityDto>,
    activityId?: string,
  ) {
    if (dto.phaseId) {
      const phase = await this.prisma.projectPhase.findFirst({
        where: { id: dto.phaseId, companyId, projectId, deletedAt: null },
      });
      if (!phase) throw new NotFoundException('Phase was not found');
    }
    if (dto.wbsId) await this.requireWbs(companyId, projectId, dto.wbsId);
    if (dto.parentTaskId) {
      const parent = await this.requireActivity(
        companyId,
        projectId,
        dto.parentTaskId,
      );
      if (parent.id === activityId)
        throw new BadRequestException('Activity cannot be its own parent');
    }
    if (
      dto.activityType === 'MILESTONE' &&
      dto.durationDays !== undefined &&
      dto.durationDays !== 0
    ) {
      throw new BadRequestException('Milestones must have zero duration');
    }
    if (
      dto.durationDays !== undefined &&
      dto.activityType !== 'MILESTONE' &&
      dto.durationDays < 1
    ) {
      throw new BadRequestException(
        'Activities must have a duration of at least one day',
      );
    }
    if (
      dto.plannedStartDate &&
      dto.plannedEndDate &&
      new Date(dto.plannedEndDate) < new Date(dto.plannedStartDate)
    ) {
      throw new BadRequestException(
        'Planned finish cannot be before planned start',
      );
    }
  }

  private activityData(dto: Partial<CreateActivityDto>, fallbackStart: Date) {
    const start = dto.plannedStartDate
      ? new Date(dto.plannedStartDate)
      : fallbackStart;
    const duration = dto.activityType === 'MILESTONE' ? 0 : dto.durationDays;
    const end = dto.plannedEndDate
      ? new Date(dto.plannedEndDate)
      : duration === undefined
        ? undefined
        : addWorkingDays(
            start,
            Math.max(0, duration - 1),
            new Set([1, 2, 3, 4, 5]),
          );
    return {
      phaseId: dto.phaseId,
      wbsId: dto.wbsId,
      parentTaskId: dto.parentTaskId,
      activityCode: dto.activityCode,
      name: dto.name,
      description: dto.description,
      activityType: dto.activityType,
      plannedStartDate: start,
      plannedEndDate: end,
      durationDays: duration,
      remainingDurationDays: dto.remainingDurationDays,
      actualStartDate: dto.actualStartDate
        ? new Date(dto.actualStartDate)
        : undefined,
      actualEndDate: dto.actualEndDate
        ? new Date(dto.actualEndDate)
        : undefined,
      assigneeMembershipId: dto.assigneeMembershipId,
      supervisorMembershipId: dto.supervisorMembershipId,
      priority: dto.priority,
      status: dto.status,
      plannedQuantity:
        dto.plannedQuantity === undefined
          ? undefined
          : new Prisma.Decimal(dto.plannedQuantity),
      actualQuantity:
        dto.actualQuantity === undefined
          ? undefined
          : new Prisma.Decimal(dto.actualQuantity),
      unit: dto.unit,
      notes: dto.notes,
      isManuallyScheduled: dto.isManuallyScheduled,
      sortOrder: dto.sortOrder,
    };
  }

  private workingDays(days?: Weekday[]) {
    const map: Record<Weekday, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };
    return (
      days?.length
        ? days
        : [
            Weekday.MONDAY,
            Weekday.TUESDAY,
            Weekday.WEDNESDAY,
            Weekday.THURSDAY,
            Weekday.FRIDAY,
          ]
    ).map((item) => map[item]);
  }

  private calendarDates(events: Array<{ eventType: string; startsAt: Date }>) {
    return {
      holidays: events
        .filter((event) => event.eventType === 'HOLIDAY')
        .map((event) => event.startsAt),
      overrides: events
        .filter((event) => event.eventType === 'WORKING_DAY_OVERRIDE')
        .map((event) => event.startsAt),
    };
  }

  private calendarDayDifference(from: Date, to: Date) {
    const start = Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
    );
    const end = Date.UTC(
      to.getUTCFullYear(),
      to.getUTCMonth(),
      to.getUTCDate(),
    );
    return Math.round((end - start) / 86_400_000);
  }

  private calculatePlannedProgress(
    activities: Array<{
      plannedStartDate: Date | null;
      plannedEndDate: Date | null;
      durationDays: number;
    }>,
    today: Date,
  ) {
    const total = activities.reduce(
      (sum, item) => sum + Math.max(1, item.durationDays),
      0,
    );
    if (!total) return 0;
    return (
      activities.reduce((sum, item) => {
        if (
          !item.plannedStartDate ||
          !item.plannedEndDate ||
          today < item.plannedStartDate
        )
          return sum;
        if (today >= item.plannedEndDate)
          return sum + 100 * Math.max(1, item.durationDays);
        const elapsed = Math.max(
          0,
          today.getTime() - item.plannedStartDate.getTime(),
        );
        const span = Math.max(
          1,
          item.plannedEndDate.getTime() - item.plannedStartDate.getTime(),
        );
        return (
          sum +
          Math.min(100, (elapsed / span) * 100) * Math.max(1, item.durationDays)
        );
      }, 0) / total
    );
  }
}
