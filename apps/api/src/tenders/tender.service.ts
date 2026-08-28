import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  TenderBidDecisionType,
  TenderRequirementStatus,
  TenderStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { IDocumentNumberingService } from '../companies/application/document-numbering.service.interface';
import { DOCUMENT_NUMBERING_SERVICE } from '../companies/application/document-numbering.service.interface';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignTenderTeamDto,
  AwardTenderDto,
  BidDecisionDto,
  CancelTenderDto,
  ChangeRequirementStatusDto,
  ChangeTenderStatusDto,
  CreateTenderDto,
  CreateTenderRequirementDto,
  LoseTenderDto,
  PreBidMeetingDto,
  SiteVisitDto,
  SubmitTenderDto,
  TenderAttachmentDto,
  TenderCalendarQueryDto,
  TenderDashboardQueryDto,
  TenderQueryDto,
  UpdateTenderDto,
  UpdatePreBidMeetingDto,
  UpdateSiteVisitDto,
  UpdateTenderRequirementDto,
} from './tender.dto';
import {
  assertTenderTransition,
  TERMINAL_TENDER_STATUSES,
} from './tender.transitions';

const tenderInclude = {
  clientCompany: true,
  primaryContact: true,
  consultant: true,
  architect: true,
  competitor: true,
  opportunity: true,
  bidDecision: true,
  teamMembers: { where: { deletedAt: null, active: true } },
  requirements: { where: { deletedAt: null } },
  submissions: { orderBy: { submittedAt: 'desc' as const } },
  attachments: {
    where: { deletedAt: null },
    include: { fileObject: true },
  },
  siteVisits: { orderBy: { visitDate: 'desc' as const } },
  preBidMeetings: { orderBy: { meetingDate: 'desc' as const } },
} satisfies Prisma.TenderInclude;

@Injectable()
export class TenderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(DOCUMENT_NUMBERING_SERVICE)
    private readonly numbering: IDocumentNumberingService,
  ) {}

  async list(
    companyId: string,
    query: TenderQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const where: Prisma.TenderWhereInput = {
      companyId,
      deletedAt: null,
      status: query.status,
      tenderType: query.tenderType,
      projectType: query.projectType,
      clientCompanyId: query.clientCompanyId,
      tenderManagerMembershipId: query.tenderManagerMembershipId,
      priority: query.priority,
      bidDecision: query.bidDecision
        ? { decision: query.bidDecision }
        : undefined,
      closingDate:
        query.closingFrom || query.closingTo
          ? {
              gte: query.closingFrom ? new Date(query.closingFrom) : undefined,
              lte: query.closingTo ? new Date(query.closingTo) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { tenderNumber: { contains: query.search, mode: 'insensitive' } },
            { title: { contains: query.search, mode: 'insensitive' } },
            {
              internalReference: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              projectLocation: { contains: query.search, mode: 'insensitive' },
            },
            { city: { contains: query.search, mode: 'insensitive' } },
            {
              clientCompany: {
                name: { contains: query.search, mode: 'insensitive' },
              },
            },
          ]
        : undefined,
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.tender.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          bidDecision: true,
          clientCompany: { select: { id: true, name: true } },
          tenderManager: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.tender.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async mine(
    companyId: string,
    query: TenderQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const membershipId = this.actorMembership(principal);
    const where: Prisma.TenderWhereInput = {
      companyId,
      deletedAt: null,
      status: query.status,
      priority: query.priority,
      OR: [
        { tenderManagerMembershipId: membershipId },
        {
          teamMembers: {
            some: { membershipId, active: true, deletedAt: null },
          },
        },
        {
          requirements: {
            some: { responsibleMembershipId: membershipId, deletedAt: null },
          },
        },
      ],
    };
    if (query.search)
      where.AND = [
        {
          OR: [
            { tenderNumber: { contains: query.search, mode: 'insensitive' } },
            { title: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.tender.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          clientCompany: { select: { id: true, name: true } },
          tenderManager: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          teamMembers: {
            where: { membershipId, active: true, deletedAt: null },
          },
          requirements: {
            where: { responsibleMembershipId: membershipId, deletedAt: null },
          },
        },
      }),
      this.prisma.tender.count({ where }),
    ]);
    return {
      data: data.map((item) => ({
        ...item,
        relevance:
          item.tenderManagerMembershipId === membershipId
            ? 'TENDER_MANAGER'
            : item.teamMembers.length
              ? 'TEAM_MEMBER'
              : 'REQUIREMENT_OWNER',
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async dashboard(
    companyId: string,
    query: TenderDashboardQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const week = new Date(now);
    week.setDate(now.getDate() + 7);
    const filters: Prisma.TenderWhereInput = {
      companyId,
      deletedAt: null,
      tenderManagerMembershipId: query.tenderManagerMembershipId,
      tenderType: query.tenderType,
      projectType: query.projectType,
      priority: query.priority,
      closingDate:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
    };
    const active = {
      ...filters,
      status: {
        notIn: [
          TenderStatus.NO_BID,
          TenderStatus.AWARDED,
          TenderStatus.LOST,
          TenderStatus.CANCELLED,
        ],
      },
    };
    const [byStatus, activeCount, dueToday, dueWeek, upcoming, outcomes] =
      await this.prisma.$transaction([
        this.prisma.tender.groupBy({
          by: ['status'],
          orderBy: { status: 'asc' },
          where: filters,
          _count: { _all: true },
        }),
        this.prisma.tender.count({ where: active }),
        this.prisma.tender.count({
          where: { ...active, closingDate: { gte: now, lt: tomorrow } },
        }),
        this.prisma.tender.count({
          where: { ...active, closingDate: { gte: now, lte: week } },
        }),
        this.prisma.tender.findMany({
          where: { ...active, closingDate: { gte: now } },
          take: 10,
          orderBy: { closingDate: 'asc' },
          include: {
            clientCompany: { select: { id: true, name: true } },
            tenderManager: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
        this.prisma.tender.groupBy({
          by: ['status'],
          orderBy: { status: 'asc' },
          where: filters,
          _count: { _all: true },
        }),
      ]);
    const counts = Object.fromEntries(
      byStatus.map((row) => [
        row.status,
        (row._count as { _all: number })._all,
      ]),
    );
    const awarded = counts[TenderStatus.AWARDED] ?? 0;
    const lost = counts[TenderStatus.LOST] ?? 0;
    return {
      activeCount,
      dueToday,
      dueThisWeek: dueWeek,
      byStatus: counts,
      upcoming,
      winRate:
        awarded + lost
          ? Math.round((awarded / (awarded + lost)) * 10000) / 100
          : null,
      outcomes: Object.fromEntries(
        outcomes.map((row) => [
          row.status,
          (row._count as { _all: number })._all,
        ]),
      ),
      valueSummary: null,
    };
  }

  async calendar(
    companyId: string,
    query: TenderCalendarQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const start = new Date(query.start);
    const end = new Date(query.end);
    const tenders = await this.prisma.tender.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { closingDate: { gte: start, lte: end } },
          { clarificationDeadline: { gte: start, lte: end } },
          { openingDate: { gte: start, lte: end } },
          { expectedAwardDate: { gte: start, lte: end } },
          {
            siteVisits: {
              some: { visitDate: { gte: start, lte: end }, deletedAt: null },
            },
          },
          {
            preBidMeetings: {
              some: { meetingDate: { gte: start, lte: end }, deletedAt: null },
            },
          },
        ],
      },
      select: {
        id: true,
        tenderNumber: true,
        title: true,
        status: true,
        priority: true,
        closingDate: true,
        clarificationDeadline: true,
        openingDate: true,
        expectedAwardDate: true,
        siteVisits: {
          where: { deletedAt: null, visitDate: { gte: start, lte: end } },
          select: { id: true, visitDate: true },
        },
        preBidMeetings: {
          where: { deletedAt: null, meetingDate: { gte: start, lte: end } },
          select: { id: true, meetingDate: true },
        },
      },
      take: 200,
    });
    return tenders.flatMap((tender) =>
      [
        {
          date: tender.closingDate,
          type: 'SUBMISSION_DEADLINE',
          id: undefined as string | undefined,
        },
        {
          date: tender.clarificationDeadline,
          type: 'CLARIFICATION_DEADLINE',
          id: undefined as string | undefined,
        },
        {
          date: tender.openingDate,
          type: 'TENDER_OPENING',
          id: undefined as string | undefined,
        },
        {
          date: tender.expectedAwardDate,
          type: 'EXPECTED_AWARD',
          id: undefined as string | undefined,
        },
        ...tender.siteVisits.map((visit) => ({
          date: visit.visitDate,
          type: 'SITE_VISIT',
          id: visit.id,
        })),
        ...tender.preBidMeetings.map((meeting) => ({
          date: meeting.meetingDate,
          type: 'PRE_BID_MEETING',
          id: meeting.id,
        })),
      ]
        .filter((event) => event.date)
        .map((event) => ({
          id: event.id ?? `${tender.id}-${event.type}`,
          tenderId: tender.id,
          tenderNumber: tender.tenderNumber,
          title: tender.title,
          eventType: event.type,
          start: event.date,
          priority: tender.priority,
          status: tender.status,
        })),
    );
  }

  async pipeline(
    companyId: string,
    query: TenderQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.prisma.tender.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: query.status,
        priority: query.priority,
      },
      take: Math.min(query.limit ?? 100, 100),
      orderBy: { closingDate: 'asc' },
      include: {
        clientCompany: { select: { id: true, name: true } },
        tenderManager: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async get(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const tender = await this.prisma.tender.findFirst({
      where: { id: tenderId, companyId, deletedAt: null },
      include: tenderInclude,
    });
    if (!tender) throw new NotFoundException('Tender not found.');
    return tender;
  }

  async create(
    companyId: string,
    dto: CreateTenderDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.validateReferences(companyId, dto);
    this.validateDates(dto);
    const allocated = await this.numbering.allocate(
      companyId,
      { documentType: 'TENDER' },
      principal,
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        const tender = await tx.tender.create({
          data: {
            companyId,
            tenderNumber: allocated.value,
            title: dto.title.trim(),
            internalReference: dto.internalReference,
            opportunityId: dto.opportunityId,
            clientCompanyId: dto.clientCompanyId,
            primaryContactId: dto.primaryContactId,
            consultantCompanyId: dto.consultantCompanyId,
            architectCompanyId: dto.architectCompanyId,
            tenderType: dto.tenderType,
            projectType: dto.projectType,
            projectLocation: dto.projectLocation,
            city: dto.city,
            issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
            closingDate: new Date(dto.closingDate),
            clarificationDeadline: dto.clarificationDeadline
              ? new Date(dto.clarificationDeadline)
              : undefined,
            openingDate: dto.openingDate
              ? new Date(dto.openingDate)
              : undefined,
            expectedAwardDate: dto.expectedAwardDate
              ? new Date(dto.expectedAwardDate)
              : undefined,
            estimatedValue:
              dto.estimatedValue === undefined
                ? undefined
                : new Prisma.Decimal(dto.estimatedValue),
            currency: dto.currency.toUpperCase(),
            tenderManagerMembershipId: dto.tenderManagerMembershipId,
            teamId: dto.teamId,
            priority: dto.priority,
            description: dto.description,
            scopeSummary: dto.scopeSummary,
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
        });
        await this.record(
          tx,
          companyId,
          'Tender.Created',
          tender.id,
          undefined,
          tender,
        );
        return tender;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new UnprocessableEntityException(
          'The generated Tender number is already in use.',
        );
      throw error;
    }
  }

  async update(
    companyId: string,
    tenderId: string,
    dto: UpdateTenderDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.base(companyId, tenderId);
    if (TERMINAL_TENDER_STATUSES.has(previous.status))
      throw new UnprocessableEntityException(
        'Closed Tenders cannot be edited.',
      );
    await this.validateReferences(companyId, dto);
    this.validateDates(dto);
    return this.prisma.$transaction(async (tx) => {
      const tender = await tx.tender.update({
        where: { id: tenderId },
        data: this.mutableData(dto, principal.userId),
      });
      await this.record(
        tx,
        companyId,
        'Tender.Updated',
        tenderId,
        previous,
        tender,
      );
      return tender;
    });
  }

  async archive(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.base(companyId, tenderId);
    return this.prisma.$transaction(async (tx) => {
      const tender = await tx.tender.update({
        where: { id: tenderId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.record(
        tx,
        companyId,
        'Tender.Archived',
        tenderId,
        previous,
        tender,
      );
      return tender;
    });
  }

  async changeStatus(
    companyId: string,
    tenderId: string,
    dto: ChangeTenderStatusDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.base(companyId, tenderId);
    assertTenderTransition(previous.status, dto.status);
    const dedicatedStatuses = new Set<TenderStatus>([
      TenderStatus.SUBMITTED,
      TenderStatus.AWARDED,
      TenderStatus.LOST,
      TenderStatus.NO_BID,
    ]);
    if (dedicatedStatuses.has(dto.status)) {
      throw new UnprocessableEntityException(
        'Use the dedicated business operation for this status.',
      );
    }
    return this.setStatus(
      companyId,
      tenderId,
      previous,
      dto.status,
      principal.userId,
    );
  }

  async prefill(
    companyId: string,
    opportunityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, companyId, deletedAt: null },
      include: { crmCompany: true, crmContact: true, opportunityType: true },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found.');
    return {
      opportunityId: opportunity.id,
      title: opportunity.name,
      clientCompanyId: opportunity.crmCompanyId,
      clientCompany: opportunity.crmCompany,
      primaryContactId: opportunity.crmContactId,
      primaryContact: opportunity.crmContact,
      tenderType: opportunity.opportunityType.name,
      projectLocation: opportunity.projectLocation,
      city: opportunity.city,
      estimatedValue: opportunity.estimatedContractValue,
      currency: opportunity.currency,
      tenderManagerMembershipId: opportunity.assignedToId,
      description: opportunity.description,
    };
  }

  async bidDecision(
    companyId: string,
    tenderId: string,
    dto: BidDecisionDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const actorMembershipId = this.actorMembership(principal);
    const previous = await this.base(companyId, tenderId);
    if (previous.status !== TenderStatus.BID_DECISION_PENDING)
      throw new UnprocessableEntityException(
        'A Bid decision can only be recorded while pending.',
      );
    const assessment = dto.assessment ?? {};
    const scores = Object.values(assessment);
    if (
      scores.some(
        (score) =>
          typeof score !== 'number' ||
          !Number.isFinite(score) ||
          score < 0 ||
          score > 10,
      )
    )
      throw new BadRequestException(
        'Assessment scores must be between 0 and 10.',
      );
    const overallScore = scores.length
      ? new Prisma.Decimal(scores.reduce((a, b) => a + b, 0) / scores.length)
      : undefined;
    const status =
      dto.decision === TenderBidDecisionType.BID
        ? TenderStatus.BID_APPROVED
        : TenderStatus.NO_BID;
    assertTenderTransition(previous.status, status);
    return this.prisma.$transaction(async (tx) => {
      const decision = await tx.tenderBidDecision.create({
        data: {
          companyId,
          tenderId,
          decision: dto.decision,
          decidedBy: actorMembershipId,
          reason: dto.reason,
          notes: dto.notes,
          assessment,
          overallScore,
        },
      });
      await tx.tender.update({
        where: { id: tenderId },
        data: { status, updatedBy: principal.userId },
      });
      await this.record(
        tx,
        companyId,
        'Tender.BidDecisionRecorded',
        tenderId,
        { status: previous.status },
        { status, decision },
      );
      return decision;
    });
  }

  async team(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    return this.prisma.tenderTeamMember.findMany({
      where: { companyId, tenderId, deletedAt: null, active: true },
      orderBy: { assignedAt: 'asc' },
    });
  }

  async assignTeam(
    companyId: string,
    tenderId: string,
    dto: AssignTenderTeamDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    await this.assertMembership(companyId, dto.membershipId);
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.tenderTeamMember.create({
        data: {
          companyId,
          tenderId,
          membershipId: dto.membershipId,
          role: dto.role,
          assignedBy: principal.membershipId,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.TeamAssigned',
        tenderId,
        undefined,
        member,
      );
      return member;
    });
  }

  async removeTeam(
    companyId: string,
    tenderId: string,
    memberId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const member = await this.prisma.tenderTeamMember.findFirst({
      where: { id: memberId, tenderId, companyId, deletedAt: null },
    });
    if (!member) throw new NotFoundException('Tender team member not found.');
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.tenderTeamMember.update({
        where: { id: memberId },
        data: { active: false, deletedAt: new Date() },
      });
      await this.record(
        tx,
        companyId,
        'Tender.TeamRemoved',
        tenderId,
        member,
        removed,
      );
      return removed;
    });
  }

  async requirements(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    return this.prisma.tenderRequirement.findMany({
      where: { companyId, tenderId, deletedAt: null },
      orderBy: [{ mandatory: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async createRequirement(
    companyId: string,
    tenderId: string,
    dto: CreateTenderRequirementDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    if (dto.responsibleMembershipId)
      await this.assertMembership(companyId, dto.responsibleMembershipId);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.tenderRequirement.create({
        data: {
          companyId,
          tenderId,
          name: dto.name,
          category: dto.category,
          mandatory: dto.mandatory,
          responsibleMembershipId: dto.responsibleMembershipId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.RequirementCreated',
        tenderId,
        undefined,
        item,
      );
      return item;
    });
  }

  async updateRequirement(
    companyId: string,
    tenderId: string,
    requirementId: string,
    dto: UpdateTenderRequirementDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.requirement(companyId, tenderId, requirementId);
    if (dto.responsibleMembershipId)
      await this.assertMembership(companyId, dto.responsibleMembershipId);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.tenderRequirement.update({
        where: { id: requirementId },
        data: {
          ...dto,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.RequirementUpdated',
        tenderId,
        previous,
        item,
      );
      return item;
    });
  }

  async requirementStatus(
    companyId: string,
    tenderId: string,
    requirementId: string,
    dto: ChangeRequirementStatusDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.requirement(companyId, tenderId, requirementId);
    const verified = dto.status === TenderRequirementStatus.VERIFIED;
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.tenderRequirement.update({
        where: { id: requirementId },
        data: {
          status: dto.status,
          verifiedAt: verified ? new Date() : null,
          verifiedBy: verified ? principal.membershipId : null,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.RequirementStatusChanged',
        tenderId,
        { id: requirementId, status: previous.status },
        { status: dto.status },
      );
      return item;
    });
  }

  async deleteRequirement(
    companyId: string,
    tenderId: string,
    requirementId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.requirement(companyId, tenderId, requirementId);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.tenderRequirement.update({
        where: { id: requirementId },
        data: { deletedAt: new Date() },
      });
      await this.record(
        tx,
        companyId,
        'Tender.RequirementArchived',
        tenderId,
        previous,
        item,
      );
      return item;
    });
  }

  async validateTenderReadyForSubmission(
    companyId: string,
    tenderId: string,
    dto: SubmitTenderDto,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const tender = await tx.tender.findFirst({
      where: { id: tenderId, companyId, deletedAt: null },
      include: { bidDecision: true },
    });
    if (!tender) throw new NotFoundException('Tender not found.');
    if (tender.status !== TenderStatus.READY_FOR_SUBMISSION)
      throw new UnprocessableEntityException(
        'Tender is not ready for submission.',
      );
    if (tender.bidDecision?.decision !== TenderBidDecisionType.BID)
      throw new UnprocessableEntityException(
        'The Bid decision does not permit submission.',
      );
    const incomplete = await tx.tenderRequirement.count({
      where: {
        companyId,
        tenderId,
        mandatory: true,
        deletedAt: null,
        status: {
          notIn: [
            TenderRequirementStatus.VERIFIED,
            TenderRequirementStatus.NOT_APPLICABLE,
          ],
        },
      },
    });
    if (incomplete)
      throw new UnprocessableEntityException(
        'Mandatory Tender requirements are incomplete.',
      );
    if (dto.evidenceFileId)
      await this.assertFile(companyId, dto.evidenceFileId, tx);
    return tender;
  }

  async submit(
    companyId: string,
    tenderId: string,
    dto: SubmitTenderDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const actorMembershipId = this.actorMembership(principal);
    return this.prisma.$transaction(async (tx) => {
      const tender = await this.validateTenderReadyForSubmission(
        companyId,
        tenderId,
        dto,
        tx,
      );
      const submission = await tx.tenderSubmission.create({
        data: {
          companyId,
          tenderId,
          submittedAt: new Date(dto.submittedAt),
          submittedBy: actorMembershipId,
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
          evidenceFileId: dto.evidenceFileId,
        },
      });
      await tx.tender.update({
        where: { id: tenderId },
        data: { status: TenderStatus.SUBMITTED, updatedBy: principal.userId },
      });
      await this.record(
        tx,
        companyId,
        'Tender.Submitted',
        tenderId,
        { status: tender.status },
        { status: TenderStatus.SUBMITTED, submission },
      );
      return submission;
    });
  }

  async award(
    companyId: string,
    tenderId: string,
    dto: AwardTenderDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.base(companyId, tenderId);
    assertTenderTransition(previous.status, TenderStatus.AWARDED);
    return this.prisma.$transaction(async (tx) => {
      const tender = await tx.tender.update({
        where: { id: tenderId },
        data: {
          status: TenderStatus.AWARDED,
          awardDate: new Date(dto.awardDate),
          awardedValue: new Prisma.Decimal(dto.awardValue),
          awardReference: dto.awardReference,
          awardNotes: dto.notes,
          updatedBy: principal.userId,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.Awarded',
        tenderId,
        previous,
        tender,
      );
      return tender;
    });
  }

  async lose(
    companyId: string,
    tenderId: string,
    dto: LoseTenderDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.base(companyId, tenderId);
    assertTenderTransition(previous.status, TenderStatus.LOST);
    if (dto.competitorCompanyId)
      await this.assertCrmCompany(
        companyId,
        dto.competitorCompanyId,
        'competitor',
      );
    return this.prisma.$transaction(async (tx) => {
      const tender = await tx.tender.update({
        where: { id: tenderId },
        data: {
          status: TenderStatus.LOST,
          lostDate: new Date(dto.lostDate),
          lostReason: dto.lostReason,
          competitorCompanyId: dto.competitorCompanyId,
          lostNotes: dto.notes,
          updatedBy: principal.userId,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.Lost',
        tenderId,
        previous,
        tender,
      );
      return tender;
    });
  }

  async cancel(
    companyId: string,
    tenderId: string,
    dto: CancelTenderDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.base(companyId, tenderId);
    assertTenderTransition(previous.status, TenderStatus.CANCELLED);
    return this.prisma.$transaction(async (tx) => {
      const tender = await tx.tender.update({
        where: { id: tenderId },
        data: {
          status: TenderStatus.CANCELLED,
          cancellationReason: dto.reason,
          updatedBy: principal.userId,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.Cancelled',
        tenderId,
        previous,
        tender,
      );
      return tender;
    });
  }

  async attachments(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    return this.prisma.tenderAttachment.findMany({
      where: { companyId, tenderId, deletedAt: null },
      include: { fileObject: true },
      orderBy: { addedAt: 'desc' },
    });
  }
  async attach(
    companyId: string,
    tenderId: string,
    dto: TenderAttachmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    await this.assertFile(companyId, dto.fileId, this.prisma);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.tenderAttachment.create({
        data: {
          companyId,
          tenderId,
          fileId: dto.fileId,
          category: dto.category,
          title: dto.title,
          addedBy: principal.membershipId,
        },
      });
      await this.record(
        tx,
        companyId,
        'Tender.AttachmentAdded',
        tenderId,
        undefined,
        item,
      );
      return item;
    });
  }
  async removeAttachment(
    companyId: string,
    tenderId: string,
    attachmentId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.prisma.tenderAttachment.findFirst({
      where: { id: attachmentId, companyId, tenderId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Tender attachment not found.');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.tenderAttachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date() },
      });
      await this.record(
        tx,
        companyId,
        'Tender.AttachmentRemoved',
        tenderId,
        previous,
        item,
      );
      return item;
    });
  }

  async addSiteVisit(
    companyId: string,
    tenderId: string,
    dto: SiteVisitDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    return this.prisma.tenderSiteVisit.create({
      data: { ...dto, companyId, tenderId, visitDate: new Date(dto.visitDate) },
    });
  }
  async siteVisits(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    return this.prisma.tenderSiteVisit.findMany({
      where: { companyId, tenderId, deletedAt: null },
      orderBy: { visitDate: 'desc' },
    });
  }
  async updateSiteVisit(
    companyId: string,
    tenderId: string,
    visitId: string,
    dto: UpdateSiteVisitDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.prisma.tenderSiteVisit.findFirst({
      where: { id: visitId, companyId, tenderId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Tender site visit not found.');
    return this.prisma.tenderSiteVisit.update({
      where: { id: visitId },
      data: {
        ...dto,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : undefined,
      },
    });
  }
  async archiveSiteVisit(
    companyId: string,
    tenderId: string,
    visitId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.prisma.tenderSiteVisit.findFirst({
      where: { id: visitId, companyId, tenderId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Tender site visit not found.');
    return this.prisma.tenderSiteVisit.update({
      where: { id: visitId },
      data: { deletedAt: new Date() },
    });
  }
  async addPreBidMeeting(
    companyId: string,
    tenderId: string,
    dto: PreBidMeetingDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    return this.prisma.tenderPreBidMeeting.create({
      data: {
        ...dto,
        companyId,
        tenderId,
        meetingDate: new Date(dto.meetingDate),
      },
    });
  }
  async preBidMeetings(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    return this.prisma.tenderPreBidMeeting.findMany({
      where: { companyId, tenderId, deletedAt: null },
      orderBy: { meetingDate: 'desc' },
    });
  }
  async updatePreBidMeeting(
    companyId: string,
    tenderId: string,
    meetingId: string,
    dto: UpdatePreBidMeetingDto,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.prisma.tenderPreBidMeeting.findFirst({
      where: { id: meetingId, companyId, tenderId, deletedAt: null },
    });
    if (!previous)
      throw new NotFoundException('Tender pre-bid meeting not found.');
    return this.prisma.tenderPreBidMeeting.update({
      where: { id: meetingId },
      data: {
        ...dto,
        meetingDate: dto.meetingDate ? new Date(dto.meetingDate) : undefined,
      },
    });
  }
  async archivePreBidMeeting(
    companyId: string,
    tenderId: string,
    meetingId: string,
    principal: AuthenticatedPrincipal,
  ) {
    await this.authorizedBase(companyId, tenderId, principal);
    const previous = await this.prisma.tenderPreBidMeeting.findFirst({
      where: { id: meetingId, companyId, tenderId, deletedAt: null },
    });
    if (!previous)
      throw new NotFoundException('Tender pre-bid meeting not found.');
    return this.prisma.tenderPreBidMeeting.update({
      where: { id: meetingId },
      data: { deletedAt: new Date() },
    });
  }

  private async setStatus(
    companyId: string,
    tenderId: string,
    previous: { status: TenderStatus },
    status: TenderStatus,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const tender = await tx.tender.update({
        where: { id: tenderId },
        data: { status, updatedBy: userId },
      });
      await this.record(
        tx,
        companyId,
        'Tender.StatusChanged',
        tenderId,
        { status: previous.status },
        { status },
      );
      return tender;
    });
  }
  private async authorizedBase(
    companyId: string,
    tenderId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.base(companyId, tenderId);
  }
  private async base(companyId: string, tenderId: string) {
    const tender = await this.prisma.tender.findFirst({
      where: { id: tenderId, companyId, deletedAt: null },
    });
    if (!tender) throw new NotFoundException('Tender not found.');
    return tender;
  }
  private async requirement(companyId: string, tenderId: string, id: string) {
    const item = await this.prisma.tenderRequirement.findFirst({
      where: { id, companyId, tenderId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Tender requirement not found.');
    return item;
  }
  private assertCompany(companyId: string, principal: AuthenticatedPrincipal) {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId)
      throw new ForbiddenException('You do not have access to this company.');
    if (!principal.membershipId && !principal.isPlatformAdmin)
      throw new ForbiddenException('An active company membership is required.');
  }
  private actorMembership(principal: AuthenticatedPrincipal): string {
    if (!principal.membershipId)
      throw new ForbiddenException(
        'An active company membership is required for this operation.',
      );
    return principal.membershipId;
  }
  private async assertMembership(companyId: string, id: string) {
    const member = await this.prisma.companyMembership.findFirst({
      where: {
        id,
        companyId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        user: { deletedAt: null },
      },
    });
    if (!member)
      throw new UnprocessableEntityException(
        'The selected membership is not active in this company.',
      );
  }
  private async assertCrmCompany(
    companyId: string,
    id: string,
    label = 'company',
  ) {
    if (
      !(await this.prisma.crmCompany.findFirst({
        where: { id, companyId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new UnprocessableEntityException(
        `The selected ${label} is not available in this company.`,
      );
  }
  private async assertFile(
    companyId: string,
    id: string,
    tx: Prisma.TransactionClient | PrismaService,
  ) {
    if (
      !(await tx.fileObject.findFirst({
        where: { id, companyId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new UnprocessableEntityException(
        'The selected file is not available in this company.',
      );
  }
  private async validateReferences(
    companyId: string,
    dto: Partial<CreateTenderDto>,
  ) {
    if (dto.clientCompanyId)
      await this.assertCrmCompany(companyId, dto.clientCompanyId, 'client');
    if (dto.consultantCompanyId)
      await this.assertCrmCompany(
        companyId,
        dto.consultantCompanyId,
        'consultant',
      );
    if (dto.architectCompanyId)
      await this.assertCrmCompany(
        companyId,
        dto.architectCompanyId,
        'architect',
      );
    if (
      dto.opportunityId &&
      !(await this.prisma.opportunity.findFirst({
        where: { id: dto.opportunityId, companyId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new UnprocessableEntityException(
        'The selected Opportunity is not available in this company.',
      );
    if (
      dto.primaryContactId &&
      !(await this.prisma.crmContact.findFirst({
        where: { id: dto.primaryContactId, companyId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new UnprocessableEntityException(
        'The selected contact is not available in this company.',
      );
    if (dto.tenderManagerMembershipId)
      await this.assertMembership(companyId, dto.tenderManagerMembershipId);
    if (
      dto.teamId &&
      !(await this.prisma.team.findFirst({
        where: { id: dto.teamId, companyId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new UnprocessableEntityException(
        'The selected team is not available in this company.',
      );
  }
  private validateDates(dto: Partial<CreateTenderDto>) {
    if (
      dto.issueDate &&
      dto.closingDate &&
      new Date(dto.issueDate) > new Date(dto.closingDate)
    )
      throw new BadRequestException(
        'Closing date must be on or after the issue date.',
      );
  }
  private mutableData(
    dto: UpdateTenderDto,
    userId: string,
  ): Prisma.TenderUpdateInput {
    const data: Prisma.TenderUncheckedUpdateInput = {
      ...dto,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
      closingDate: dto.closingDate ? new Date(dto.closingDate) : undefined,
      clarificationDeadline: dto.clarificationDeadline
        ? new Date(dto.clarificationDeadline)
        : undefined,
      openingDate: dto.openingDate ? new Date(dto.openingDate) : undefined,
      expectedAwardDate: dto.expectedAwardDate
        ? new Date(dto.expectedAwardDate)
        : undefined,
      estimatedValue:
        dto.estimatedValue === undefined
          ? undefined
          : new Prisma.Decimal(dto.estimatedValue),
      currency: dto.currency?.toUpperCase(),
      updatedBy: userId,
    };
    delete data.opportunityId;
    return data;
  }
  private record(
    tx: Prisma.TransactionClient,
    companyId: string,
    action: string,
    entityId: string,
    oldValue?: unknown,
    newValue?: unknown,
  ) {
    return this.audit.record(tx, {
      companyId,
      action,
      entity: 'Tender',
      entityId,
      oldValue,
      newValue,
    });
  }
}
