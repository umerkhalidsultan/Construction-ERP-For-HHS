import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CrmActivityPriority,
  CrmActivityRelatedType,
  CrmActivityStatus,
  CrmActivityType,
  FileStatus,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from '../permissions/permission.constants';
import {
  ActivityAttachmentDto,
  ActivityCalendarQueryDto,
  ActivityQueryDto,
  AssignActivityDto,
  CancelActivityDto,
  CompleteActivityDto,
  CreateActivityDto,
  RescheduleActivityDto,
  UpdateActivityDto,
} from './activity.dto';

const activityInclude = {
  assignedTo: {
    select: {
      id: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
  lead: { select: { id: true, leadNumber: true, name: true } },
  crmCompany: { select: { id: true, name: true } },
  crmContact: { select: { id: true, firstName: true, lastName: true } },
  opportunity: {
    select: { id: true, opportunityNumber: true, name: true },
  },
} satisfies Prisma.CrmActivityInclude;

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    companyId: string,
    query: ActivityQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const where = this.buildWhere(companyId, query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.crmActivity.findMany({
        where,
        include: activityInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.crmActivity.count({ where }),
    ]);
    return {
      data: data.map((row) => this.withComputed(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async get(
    companyId: string,
    activityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const activity = await this.prisma.crmActivity.findFirst({
      where: { id: activityId, companyId, deletedAt: null },
      include: {
        ...activityInclude,
        attachments: {
          where: { deletedAt: null },
          include: {
            file: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                publicUrl: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!activity) throw new NotFoundException('Activity was not found.');
    return this.withComputed(activity);
  }

  async create(
    companyId: string,
    dto: CreateActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.assertAssignable(companyId, dto.assignedToId);
    const relatedIds = await this.assertRelatedRecord(companyId, dto);
    if (dto.startAt && dto.endAt && new Date(dto.endAt) < new Date(dto.startAt))
      throw new UnprocessableEntityException(
        'End time cannot be earlier than start time.',
      );

    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.crmActivity.create({
        data: {
          companyId,
          relatedType: dto.relatedType,
          ...relatedIds,
          type: dto.type,
          subject: dto.subject.trim(),
          description: dto.description?.trim(),
          assignedToId: dto.assignedToId,
          priority: dto.priority ?? CrmActivityPriority.MEDIUM,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          endAt: dto.endAt ? new Date(dto.endAt) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          location: dto.location?.trim(),
          participants: dto.participants?.trim(),
          contactPhone: dto.contactPhone?.trim(),
          callDurationMinutes: dto.callDurationMinutes,
          emailTo: dto.emailTo?.trim(),
          emailCc: dto.emailCc?.trim(),
          purpose: dto.purpose?.trim(),
          observations: dto.observations?.trim(),
          nextAction: dto.nextAction?.trim(),
          nextFollowUpDate: dto.nextFollowUpDate
            ? new Date(dto.nextFollowUpDate)
            : undefined,
          reminderMinutesBefore: dto.reminderMinutesBefore,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: activityInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.Created',
        entity: 'CrmActivity',
        entityId: activity.id,
        newValue: activity,
      });
      return this.withComputed(activity);
    });
  }

  async update(
    companyId: string,
    activityId: string,
    dto: UpdateActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.getBase(companyId, activityId);
    this.assertEditable(previous);
    const startAt =
      dto.startAt === undefined ? previous.startAt : new Date(dto.startAt);
    const endAt =
      dto.endAt === undefined ? previous.endAt : new Date(dto.endAt);
    if (startAt && endAt && endAt < startAt)
      throw new UnprocessableEntityException(
        'End time cannot be earlier than start time.',
      );

    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.crmActivity.update({
        where: { id: activityId },
        data: {
          type: dto.type,
          subject: dto.subject?.trim(),
          description: dto.description?.trim(),
          priority: dto.priority,
          startAt:
            dto.startAt === undefined ? undefined : new Date(dto.startAt),
          endAt: dto.endAt === undefined ? undefined : new Date(dto.endAt),
          dueDate:
            dto.dueDate === undefined ? undefined : new Date(dto.dueDate),
          location: dto.location?.trim(),
          participants: dto.participants?.trim(),
          contactPhone: dto.contactPhone?.trim(),
          callDurationMinutes: dto.callDurationMinutes,
          emailTo: dto.emailTo?.trim(),
          emailCc: dto.emailCc?.trim(),
          purpose: dto.purpose?.trim(),
          observations: dto.observations?.trim(),
          outcome: dto.outcome?.trim(),
          nextAction: dto.nextAction?.trim(),
          nextFollowUpDate:
            dto.nextFollowUpDate === undefined
              ? undefined
              : new Date(dto.nextFollowUpDate),
          reminderMinutesBefore: dto.reminderMinutesBefore,
          updatedBy: principal.userId,
        },
        include: activityInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.Updated',
        entity: 'CrmActivity',
        entityId: activityId,
        oldValue: previous,
        newValue: activity,
      });
      return this.withComputed(activity);
    });
  }

  async assign(
    companyId: string,
    activityId: string,
    dto: AssignActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.getBase(companyId, activityId);
    if (previous.status === CrmActivityStatus.CANCELLED)
      throw new UnprocessableEntityException(
        'A cancelled activity cannot be reassigned.',
      );
    await this.assertAssignable(companyId, dto.assignedToId);
    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.crmActivity.update({
        where: { id: activityId },
        data: { assignedToId: dto.assignedToId, updatedBy: principal.userId },
        include: activityInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action:
          previous.assignedToId === dto.assignedToId
            ? 'CRM.Activity.Reassigned'
            : 'CRM.Activity.Assigned',
        entity: 'CrmActivity',
        entityId: activityId,
        oldValue: { assignedToId: previous.assignedToId },
        newValue: { assignedToId: dto.assignedToId },
      });
      return this.withComputed(activity);
    });
  }

  async complete(
    companyId: string,
    activityId: string,
    dto: CompleteActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.getBase(companyId, activityId);
    if (previous.status === CrmActivityStatus.CANCELLED)
      throw new UnprocessableEntityException(
        'A cancelled activity cannot be completed.',
      );
    if (previous.status === CrmActivityStatus.COMPLETED)
      throw new UnprocessableEntityException(
        'This activity has already been completed.',
      );
    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.crmActivity.update({
        where: { id: activityId },
        data: {
          status: CrmActivityStatus.COMPLETED,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : new Date(),
          outcome: dto.outcome?.trim() ?? previous.outcome,
          nextAction: dto.nextAction?.trim() ?? previous.nextAction,
          nextFollowUpDate: dto.nextFollowUpDate
            ? new Date(dto.nextFollowUpDate)
            : previous.nextFollowUpDate,
          updatedBy: principal.userId,
        },
        include: activityInclude,
      });
      let followUp: Prisma.CrmActivityGetPayload<{
        include: typeof activityInclude;
      }> | null = null;
      if (dto.nextFollowUpDate) {
        followUp = await tx.crmActivity.create({
          data: {
            companyId,
            relatedType: previous.relatedType,
            leadId: previous.leadId,
            crmCompanyId: previous.crmCompanyId,
            crmContactId: previous.crmContactId,
            opportunityId: previous.opportunityId,
            type: CrmActivityType.FOLLOW_UP,
            subject: `Follow-up: ${previous.subject}`,
            purpose: dto.nextAction?.trim() ?? previous.nextAction,
            assignedToId: previous.assignedToId,
            priority: previous.priority,
            dueDate: new Date(dto.nextFollowUpDate),
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
          include: activityInclude,
        });
      }
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.Completed',
        entity: 'CrmActivity',
        entityId: activityId,
        oldValue: { status: previous.status },
        newValue: {
          status: activity.status,
          outcome: activity.outcome,
          followUpActivityId: followUp?.id ?? null,
        },
      });
      return { activity: this.withComputed(activity), followUp };
    });
  }

  async cancel(
    companyId: string,
    activityId: string,
    dto: CancelActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.getBase(companyId, activityId);
    if (previous.status === CrmActivityStatus.COMPLETED)
      throw new UnprocessableEntityException(
        'A completed activity cannot be cancelled.',
      );
    if (previous.status === CrmActivityStatus.CANCELLED)
      throw new UnprocessableEntityException(
        'This activity is already cancelled.',
      );
    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.crmActivity.update({
        where: { id: activityId },
        data: {
          status: CrmActivityStatus.CANCELLED,
          updatedBy: principal.userId,
        },
        include: activityInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.Cancelled',
        entity: 'CrmActivity',
        entityId: activityId,
        oldValue: { status: previous.status },
        newValue: { status: activity.status, reason: dto.reason ?? null },
      });
      return this.withComputed(activity);
    });
  }

  async reschedule(
    companyId: string,
    activityId: string,
    dto: RescheduleActivityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.getBase(companyId, activityId);
    this.assertEditable(previous);
    if (!dto.dueDate && !dto.startAt)
      throw new UnprocessableEntityException(
        'Please provide a new due date or start time to reschedule.',
      );
    const startAt = dto.startAt ? new Date(dto.startAt) : previous.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : previous.endAt;
    if (startAt && endAt && endAt < startAt)
      throw new UnprocessableEntityException(
        'End time cannot be earlier than start time.',
      );

    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.crmActivity.update({
        where: { id: activityId },
        data: {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          endAt: dto.endAt ? new Date(dto.endAt) : undefined,
          status:
            previous.status === CrmActivityStatus.PLANNED
              ? CrmActivityStatus.PLANNED
              : previous.status,
          updatedBy: principal.userId,
        },
        include: activityInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.Rescheduled',
        entity: 'CrmActivity',
        entityId: activityId,
        oldValue: { dueDate: previous.dueDate, startAt: previous.startAt },
        newValue: {
          dueDate: activity.dueDate,
          startAt: activity.startAt,
          reason: dto.reason,
        },
      });
      return this.withComputed(activity);
    });
  }

  async remove(
    companyId: string,
    activityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.getBase(companyId, activityId);
    if (previous.status === CrmActivityStatus.COMPLETED)
      throw new UnprocessableEntityException(
        'A completed activity cannot be deleted. Use Cancel for open activities instead.',
      );
    return this.prisma.$transaction(async (tx) => {
      const activity = await tx.crmActivity.update({
        where: { id: activityId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.Deleted',
        entity: 'CrmActivity',
        entityId: activityId,
        oldValue: { subject: previous.subject, status: previous.status },
      });
      return activity;
    });
  }

  async addAttachment(
    companyId: string,
    activityId: string,
    dto: ActivityAttachmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, activityId);
    const file = await this.prisma.fileObject.findFirst({
      where: {
        id: dto.fileId,
        companyId,
        status: FileStatus.AVAILABLE,
        deletedAt: null,
      },
    });
    if (!file)
      throw new UnprocessableEntityException(
        'The selected file is not available for this company.',
      );
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.crmActivityAttachment.create({
        data: {
          companyId,
          activityId,
          fileId: dto.fileId,
          title: dto.title,
          description: dto.description,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: { file: true },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.AttachmentAdded',
        entity: 'CrmActivity',
        entityId: activityId,
        newValue: { attachmentId: attachment.id, fileId: dto.fileId },
      });
      return attachment;
    });
  }

  async deleteAttachment(
    companyId: string,
    activityId: string,
    attachmentId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.prisma.crmActivityAttachment.findFirst({
      where: { id: attachmentId, activityId, companyId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Attachment was not found.');
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.crmActivityAttachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Activity.AttachmentDeleted',
        entity: 'CrmActivity',
        entityId: activityId,
        oldValue: { attachmentId, fileId: previous.fileId },
      });
      return attachment;
    });
  }

  async timeline(
    companyId: string,
    activityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, activityId);
    return this.prisma.auditLog.findMany({
      where: {
        companyId,
        entity: 'CrmActivity',
        entityId: activityId,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async dashboard(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompany(companyId, principal);
    const assignedToId = principal.membershipId ?? undefined;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const openStatuses: CrmActivityStatus[] = [
      CrmActivityStatus.PLANNED,
      CrmActivityStatus.IN_PROGRESS,
    ];

    const [today, todayByType, overdue, completedThisWeek, pendingFollowUps] =
      await Promise.all([
        this.prisma.crmActivity.count({
          where: {
            companyId,
            assignedToId,
            deletedAt: null,
            status: { in: openStatuses },
            OR: [
              { dueDate: { gte: todayStart, lte: todayEnd } },
              { startAt: { gte: todayStart, lte: todayEnd } },
            ],
          },
        }),
        this.prisma.$queryRaw<Array<{ type: string; count: number }>>(
          Prisma.sql`
            SELECT "type", COUNT(*)::int AS "count"
            FROM "crm_activities"
            WHERE "companyId" = ${companyId}::uuid
              AND "assignedToId" = ${assignedToId}::uuid
              AND "deletedAt" IS NULL
              AND "status"::text IN ('PLANNED', 'IN_PROGRESS')
              AND (
                ("dueDate" >= ${todayStart} AND "dueDate" <= ${todayEnd})
                OR ("startAt" >= ${todayStart} AND "startAt" <= ${todayEnd})
              )
            GROUP BY "type"
          `,
        ),
        this.prisma.crmActivity.count({
          where: {
            companyId,
            assignedToId,
            deletedAt: null,
            status: { in: openStatuses },
            dueDate: { lt: now },
          },
        }),
        this.prisma.crmActivity.count({
          where: {
            companyId,
            assignedToId,
            deletedAt: null,
            status: CrmActivityStatus.COMPLETED,
            completedAt: { gte: weekStart },
          },
        }),
        this.prisma.crmActivity.count({
          where: {
            companyId,
            assignedToId,
            deletedAt: null,
            type: CrmActivityType.FOLLOW_UP,
            status: { in: openStatuses },
          },
        }),
      ]);

    return {
      today: {
        total: today,
        byType: todayByType.map((row) => ({
          type: row.type,
          count: row.count,
        })),
      },
      overdue,
      completedThisWeek,
      pendingFollowUps,
    };
  }

  async team(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompany(companyId, principal);
    const rows = await this.prisma.$queryRaw<
      Array<{ assignedToId: string; status: string; count: number }>
    >(Prisma.sql`
      SELECT "assignedToId", "status"::text AS "status", COUNT(*)::int AS "count"
      FROM "crm_activities"
      WHERE "companyId" = ${companyId}::uuid AND "deletedAt" IS NULL
      GROUP BY "assignedToId", "status"
    `);
    const overdueRows = await this.prisma.$queryRaw<
      Array<{ assignedToId: string; count: number }>
    >(Prisma.sql`
      SELECT "assignedToId", COUNT(*)::int AS "count"
      FROM "crm_activities"
      WHERE "companyId" = ${companyId}::uuid
        AND "deletedAt" IS NULL
        AND "status"::text IN ('PLANNED', 'IN_PROGRESS')
        AND "dueDate" < NOW()
      GROUP BY "assignedToId"
    `);
    const memberIds = Array.from(new Set(rows.map((row) => row.assignedToId)));
    const members = memberIds.length
      ? await this.prisma.companyMembership.findMany({
          where: { id: { in: memberIds }, companyId, deletedAt: null },
          select: {
            id: true,
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : [];
    return memberIds.map((id) => ({
      assignee: members.find((member) => member.id === id) ?? null,
      byStatus: rows
        .filter((row) => row.assignedToId === id)
        .map((row) => ({ status: row.status, count: row.count })),
      overdue: overdueRows.find((row) => row.assignedToId === id)?.count ?? 0,
    }));
  }

  async calendar(
    companyId: string,
    query: ActivityCalendarQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const from = new Date(query.from);
    const to = new Date(query.to);
    to.setHours(23, 59, 59, 999);
    return this.prisma.crmActivity.findMany({
      where: {
        companyId,
        deletedAt: null,
        assignedToId: query.assignedToId,
        OR: [
          { startAt: { gte: from, lte: to } },
          { dueDate: { gte: from, lte: to } },
        ],
      },
      include: activityInclude,
      orderBy: [{ startAt: 'asc' }, { dueDate: 'asc' }],
    });
  }

  catalog() {
    return {
      types: Object.values(CrmActivityType),
      statuses: Object.values(CrmActivityStatus),
      priorities: Object.values(CrmActivityPriority),
      relatedTypes: Object.values(CrmActivityRelatedType),
    };
  }

  async assignees(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompany(companyId, principal);
    return this.prisma.companyMembership.findMany({
      where: {
        companyId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        roles: {
          some: {
            deletedAt: null,
            role: {
              deletedAt: null,
              permissions: {
                some: {
                  deletedAt: null,
                  permission: {
                    code: {
                      in: [
                        PERMISSIONS.CRM_ACTIVITY_VIEW,
                        PERMISSIONS.CRM_ACTIVITY_EDIT,
                      ],
                    },
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { user: { firstName: 'asc' } },
    });
  }

  async exportCsv(
    companyId: string,
    query: ActivityQueryDto,
    principal: AuthenticatedPrincipal,
  ): Promise<string> {
    this.assertCompany(companyId, principal);
    const where = this.buildWhere(companyId, query);
    const rows = await this.prisma.crmActivity.findMany({
      where,
      include: activityInclude,
      orderBy: { [query.sortBy]: query.sortOrder },
      take: 10000,
    });
    const header = [
      'Type',
      'Subject',
      'Related To',
      'Related Record',
      'Assigned To',
      'Due Date',
      'Priority',
      'Status',
      'Created At',
    ];
    const relatedRecordLabel = (row: (typeof rows)[number]): string =>
      row.lead?.name ??
      row.crmCompany?.name ??
      (row.crmContact
        ? `${row.crmContact.firstName} ${row.crmContact.lastName}`.trim()
        : undefined) ??
      row.opportunity?.name ??
      '';
    const lines = rows.map((row) =>
      [
        row.type,
        row.subject,
        row.relatedType,
        relatedRecordLabel(row),
        row.assignedTo
          ? `${row.assignedTo.user.firstName} ${row.assignedTo.user.lastName}`.trim()
          : '',
        row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : '',
        row.priority,
        row.status,
        row.createdAt.toISOString(),
      ]
        .map((value) => this.csvCell(value))
        .join(','),
    );
    return [
      header.map((value) => this.csvCell(value)).join(','),
      ...lines,
    ].join('\r\n');
  }

  private withComputed<
    T extends { dueDate: Date | null; status: CrmActivityStatus },
  >(activity: T): T & { isOverdue: boolean; effectiveStatus: string } {
    const isOverdue =
      !!activity.dueDate &&
      activity.dueDate.getTime() < Date.now() &&
      activity.status !== CrmActivityStatus.COMPLETED &&
      activity.status !== CrmActivityStatus.CANCELLED;
    return {
      ...activity,
      isOverdue,
      effectiveStatus: isOverdue ? 'OVERDUE' : activity.status,
    };
  }

  private assertEditable(activity: { status: CrmActivityStatus }) {
    if (activity.status === CrmActivityStatus.CANCELLED)
      throw new UnprocessableEntityException(
        'A cancelled activity cannot be edited.',
      );
    if (activity.status === CrmActivityStatus.COMPLETED)
      throw new UnprocessableEntityException(
        'A completed activity cannot be edited. Create a follow-up instead.',
      );
  }

  private async getBase(companyId: string, activityId: string) {
    const activity = await this.prisma.crmActivity.findFirst({
      where: { id: activityId, companyId, deletedAt: null },
    });
    if (!activity) throw new NotFoundException('Activity was not found.');
    return activity;
  }

  private async assertAssignable(companyId: string, membershipId: string) {
    const membership = await this.prisma.companyMembership.findFirst({
      where: {
        id: membershipId,
        companyId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        roles: {
          some: {
            deletedAt: null,
            role: {
              deletedAt: null,
              permissions: {
                some: {
                  deletedAt: null,
                  permission: {
                    code: {
                      in: [
                        PERMISSIONS.CRM_ACTIVITY_VIEW,
                        PERMISSIONS.CRM_ACTIVITY_EDIT,
                      ],
                    },
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!membership)
      throw new ForbiddenException(
        "You don't have permission to assign this activity.",
      );
  }

  private async assertRelatedRecord(
    companyId: string,
    dto: Pick<
      CreateActivityDto,
      | 'relatedType'
      | 'leadId'
      | 'crmCompanyId'
      | 'crmContactId'
      | 'opportunityId'
    >,
  ): Promise<{
    leadId: string | null;
    crmCompanyId: string | null;
    crmContactId: string | null;
    opportunityId: string | null;
  }> {
    const empty = {
      leadId: null,
      crmCompanyId: null,
      crmContactId: null,
      opportunityId: null,
    };
    switch (dto.relatedType) {
      case CrmActivityRelatedType.LEAD: {
        if (!dto.leadId)
          throw new UnprocessableEntityException(
            'Please select the record this activity is related to.',
          );
        const lead = await this.prisma.lead.findFirst({
          where: { id: dto.leadId, companyId, deletedAt: null },
        });
        if (!lead)
          throw new UnprocessableEntityException(
            'The selected lead was not found.',
          );
        return { ...empty, leadId: dto.leadId };
      }
      case CrmActivityRelatedType.CRM_COMPANY: {
        if (!dto.crmCompanyId)
          throw new UnprocessableEntityException(
            'Please select the record this activity is related to.',
          );
        const company = await this.prisma.crmCompany.findFirst({
          where: { id: dto.crmCompanyId, companyId, deletedAt: null },
        });
        if (!company)
          throw new UnprocessableEntityException(
            'The selected company was not found.',
          );
        return { ...empty, crmCompanyId: dto.crmCompanyId };
      }
      case CrmActivityRelatedType.CRM_CONTACT: {
        if (!dto.crmContactId)
          throw new UnprocessableEntityException(
            'Please select the record this activity is related to.',
          );
        const contact = await this.prisma.crmContact.findFirst({
          where: { id: dto.crmContactId, companyId, deletedAt: null },
        });
        if (!contact)
          throw new UnprocessableEntityException(
            'The selected contact was not found.',
          );
        return { ...empty, crmContactId: dto.crmContactId };
      }
      case CrmActivityRelatedType.OPPORTUNITY: {
        if (!dto.opportunityId)
          throw new UnprocessableEntityException(
            'Please select the record this activity is related to.',
          );
        const opportunity = await this.prisma.opportunity.findFirst({
          where: { id: dto.opportunityId, companyId, deletedAt: null },
        });
        if (!opportunity)
          throw new UnprocessableEntityException(
            'The selected opportunity was not found.',
          );
        return { ...empty, opportunityId: dto.opportunityId };
      }
      default:
        throw new UnprocessableEntityException(
          'Please select a valid related record type.',
        );
    }
  }

  private buildWhere(
    companyId: string,
    query: ActivityQueryDto,
  ): Prisma.CrmActivityWhereInput {
    return {
      companyId,
      deletedAt: null,
      type: query.type,
      status: query.status,
      priority: query.priority,
      relatedType: query.relatedType,
      leadId: query.leadId,
      crmCompanyId: query.crmCompanyId,
      crmContactId: query.crmContactId,
      opportunityId: query.opportunityId,
      assignedToId: query.assignedToId,
      createdBy: query.createdBy,
      dueDate:
        query.overdueOnly || query.dueFrom || query.dueTo
          ? {
              lt: query.overdueOnly ? new Date() : undefined,
              gte: query.dueFrom ? new Date(query.dueFrom) : undefined,
              lte: query.dueTo ? this.endOfDay(query.dueTo) : undefined,
            }
          : undefined,
      ...(query.overdueOnly
        ? {
            status: {
              notIn: [CrmActivityStatus.COMPLETED, CrmActivityStatus.CANCELLED],
            },
          }
        : {}),
      createdAt:
        query.createdFrom || query.createdTo
          ? {
              gte: query.createdFrom ? new Date(query.createdFrom) : undefined,
              lte: query.createdTo ? this.endOfDay(query.createdTo) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { subject: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { lead: { name: { contains: query.search, mode: 'insensitive' } } },
            {
              crmCompany: {
                name: { contains: query.search, mode: 'insensitive' },
              },
            },
            {
              crmContact: {
                OR: [
                  {
                    firstName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    lastName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
            {
              opportunity: {
                name: { contains: query.search, mode: 'insensitive' },
              },
            },
            {
              assignedTo: {
                user: {
                  OR: [
                    {
                      firstName: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      lastName: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            },
          ]
        : undefined,
    };
  }

  private endOfDay(value: string): Date {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  private csvCell(value: string | number): string {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private assertCompany(companyId: string, principal: AuthenticatedPrincipal) {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId)
      throw new ForbiddenException("You don't have access to this section.");
  }
}
