import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  EntityStatus,
  FileStatus,
  LeadPriority,
  LeadStatus,
  MembershipStatus,
  OpportunityPriority,
  OpportunityStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from '../permissions/permission.constants';
import {
  AssignOpportunityDto,
  ChangeOpportunityStageDto,
  ConvertLeadToOpportunityDto,
  CreateOpportunityDto,
  MarkOpportunityLostDto,
  MarkOpportunityWonDto,
  OpportunityAttachmentDto,
  OpportunityNoteDto,
  OpportunityQueryDto,
  ReopenOpportunityDto,
  UpdateOpportunityDto,
} from './opportunity.dto';

const opportunityInclude = {
  stage: {
    select: {
      id: true,
      code: true,
      name: true,
      probability: true,
      isWon: true,
      isLost: true,
    },
  },
  opportunityType: { select: { id: true, code: true, name: true } },
  source: { select: { id: true, code: true, name: true } },
  lostReason: { select: { id: true, code: true, name: true } },
  assignedTo: {
    select: {
      id: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
  crmCompany: {
    select: { id: true, name: true, email: true, phone: true, city: true },
  },
  crmContact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      crmCompanyId: true,
    },
  },
  lead: {
    select: { id: true, leadNumber: true, name: true, status: true },
  },
} satisfies Prisma.OpportunityInclude;

const leadPriorityToOpportunityPriority: Record<
  LeadPriority,
  OpportunityPriority
> = {
  LOW: OpportunityPriority.LOW,
  MEDIUM: OpportunityPriority.MEDIUM,
  HIGH: OpportunityPriority.HIGH,
  URGENT: OpportunityPriority.URGENT,
};

type MoneyRow = { count: number; total: string; weighted?: string };

@Injectable()
export class OpportunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    companyId: string,
    query: OpportunityQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const where = this.buildWhere(companyId, query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        include: opportunityInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    return {
      data: data.map((row) => this.withWeightedValue(row)),
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
    opportunityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, companyId, deletedAt: null },
      include: {
        ...opportunityInclude,
        notes: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
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
    if (!opportunity) throw new NotFoundException('Opportunity was not found.');
    return this.withWeightedValue(opportunity);
  }

  async create(
    companyId: string,
    dto: CreateOpportunityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.validateReferences(companyId, {
      typeId: dto.opportunityTypeId,
      sourceId: dto.sourceId,
      stageId: dto.stageId,
    });
    await this.validatePartyLinks(
      companyId,
      dto.crmCompanyId,
      dto.crmContactId,
    );
    if (dto.assignedToId)
      await this.assertAssignable(companyId, dto.assignedToId);
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { currency: true },
    });
    if (!company) throw new NotFoundException('Company was not found.');

    return this.prisma.$transaction(
      async (tx) => {
        const opportunityNumber = await this.allocateOpportunityNumber(
          tx,
          companyId,
          principal.userId,
        );
        const stage = dto.stageId
          ? await tx.opportunityStageDefinition.findFirst({
              where: {
                id: dto.stageId,
                OR: [{ companyId: null }, { companyId }],
                status: EntityStatus.ACTIVE,
                deletedAt: null,
              },
            })
          : await this.defaultStage(companyId, tx);
        if (!stage)
          throw new UnprocessableEntityException(
            'Please select a valid pipeline stage.',
          );
        if (stage.isWon || stage.isLost)
          throw new UnprocessableEntityException(
            'New opportunities must start in a non-terminal stage.',
          );
        const opportunity = await tx.opportunity.create({
          data: {
            companyId,
            opportunityNumber,
            stageId: stage.id,
            status: OpportunityStatus.OPEN,
            name: dto.name.trim(),
            opportunityTypeId: dto.opportunityTypeId,
            sourceId: dto.sourceId,
            crmCompanyId: dto.crmCompanyId,
            crmContactId: dto.crmContactId,
            projectLocation: dto.projectLocation?.trim(),
            city: dto.city?.trim(),
            area: dto.area?.trim(),
            estimatedContractValue:
              dto.estimatedContractValue === undefined
                ? undefined
                : new Prisma.Decimal(dto.estimatedContractValue),
            currency: dto.currency ?? company.currency,
            probability: dto.probability ?? stage.probability,
            priority: dto.priority,
            expectedClosingDate: dto.expectedClosingDate
              ? new Date(dto.expectedClosingDate)
              : undefined,
            expectedStartDate: dto.expectedStartDate
              ? new Date(dto.expectedStartDate)
              : undefined,
            expectedCompletionDate: dto.expectedCompletionDate
              ? new Date(dto.expectedCompletionDate)
              : undefined,
            assignedToId: dto.assignedToId,
            description: dto.description?.trim(),
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
          include: opportunityInclude,
        });
        await tx.opportunityStageHistory.create({
          data: {
            companyId,
            opportunityId: opportunity.id,
            toStageId: stage.id,
            changedById: principal.membershipId,
            reason: 'Opportunity created',
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
        });
        await this.audit.record(tx, {
          companyId,
          action: 'CRM.Opportunity.Created',
          entity: 'Opportunity',
          entityId: opportunity.id,
          newValue: opportunity,
        });
        return this.withWeightedValue(opportunity);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async update(
    companyId: string,
    opportunityId: string,
    dto: UpdateOpportunityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const current = await this.getBase(companyId, opportunityId);
    await this.validateReferences(companyId, {
      typeId: dto.opportunityTypeId ?? current.opportunityTypeId,
      sourceId: dto.sourceId ?? current.sourceId,
    });
    if (dto.crmCompanyId !== undefined || dto.crmContactId !== undefined) {
      await this.validatePartyLinks(
        companyId,
        dto.crmCompanyId ?? current.crmCompanyId ?? undefined,
        dto.crmContactId ?? current.crmContactId ?? undefined,
      );
    }
    if (dto.assignedToId)
      await this.assertAssignable(companyId, dto.assignedToId);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Opportunity was not found.');
      const opportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          ...this.mutableData(dto),
          estimatedContractValue:
            dto.estimatedContractValue === undefined
              ? undefined
              : new Prisma.Decimal(dto.estimatedContractValue),
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: opportunityInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.Updated',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: previous,
        newValue: opportunity,
      });
      return this.withWeightedValue(opportunity);
    });
  }

  async remove(
    companyId: string,
    opportunityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Opportunity was not found.');
      const opportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.Archived',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: {
          opportunityNumber: previous.opportunityNumber,
          name: previous.name,
        },
        newValue: { deletedAt: opportunity.deletedAt },
      });
      return opportunity;
    });
  }

  async assign(
    companyId: string,
    opportunityId: string,
    dto: AssignOpportunityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    if (dto.assignedToId)
      await this.assertAssignable(companyId, dto.assignedToId);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Opportunity was not found.');
      const opportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          assignedToId: dto.assignedToId ?? null,
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: opportunityInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: dto.assignedToId
          ? previous.assignedToId
            ? 'CRM.Opportunity.Reassigned'
            : 'CRM.Opportunity.Assigned'
          : 'CRM.Opportunity.Unassigned',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { assignedToId: previous.assignedToId },
        newValue: { assignedToId: dto.assignedToId ?? null },
      });
      return this.withWeightedValue(opportunity);
    });
  }

  async changeStage(
    companyId: string,
    opportunityId: string,
    dto: ChangeOpportunityStageDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Opportunity was not found.');
      if (previous.status !== OpportunityStatus.OPEN)
        throw new UnprocessableEntityException(
          'Only open opportunities can change stages.',
        );
      const stage = await tx.opportunityStageDefinition.findFirst({
        where: {
          id: dto.stageId,
          OR: [{ companyId: null }, { companyId }],
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
      });
      if (!stage)
        throw new UnprocessableEntityException(
          'Please select a valid pipeline stage.',
        );
      if (stage.id === previous.stageId) {
        const current = await tx.opportunity.findFirst({
          where: { id: opportunityId, companyId, deletedAt: null },
          include: opportunityInclude,
        });
        return this.withWeightedValue(current!);
      }
      if (stage.isWon)
        throw new UnprocessableEntityException(
          'Use "Mark as Won" to move an opportunity to the Won stage.',
        );
      if (stage.isLost)
        throw new UnprocessableEntityException(
          'Use "Mark as Lost" to move an opportunity to the Lost stage.',
        );
      const opportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          stageId: stage.id,
          probability: stage.probability,
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: opportunityInclude,
      });
      await tx.opportunityStageHistory.create({
        data: {
          companyId,
          opportunityId,
          fromStageId: previous.stageId,
          toStageId: stage.id,
          changedById: principal.membershipId,
          reason: dto.reason?.trim(),
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.StageChanged',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { stageId: previous.stageId },
        newValue: { stageId: stage.id, reason: dto.reason ?? null },
      });
      return this.withWeightedValue(opportunity);
    });
  }

  async markWon(
    companyId: string,
    opportunityId: string,
    dto: MarkOpportunityWonDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Opportunity was not found.');
      if (previous.status !== OpportunityStatus.OPEN)
        throw new UnprocessableEntityException(
          'Only open opportunities can be marked as won.',
        );
      const wonStage = await this.terminalStage(companyId, tx, true);
      const opportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          status: OpportunityStatus.WON,
          stageId: wonStage.id,
          probability: 100,
          wonDate: new Date(dto.wonDate),
          finalContractValue: new Prisma.Decimal(dto.finalContractValue),
          winReason: dto.winReason?.trim(),
          competitor: dto.competitor?.trim(),
          winRemarks: dto.winRemarks?.trim(),
          lostDate: null,
          lostReasonId: null,
          lostRemarks: null,
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: opportunityInclude,
      });
      await tx.opportunityStageHistory.create({
        data: {
          companyId,
          opportunityId,
          fromStageId: previous.stageId,
          toStageId: wonStage.id,
          changedById: principal.membershipId,
          reason: 'Opportunity won',
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.MarkedWon',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { status: previous.status, stageId: previous.stageId },
        newValue: {
          status: OpportunityStatus.WON,
          wonDate: dto.wonDate,
          finalContractValue: dto.finalContractValue,
        },
      });
      return this.withWeightedValue(opportunity);
    });
  }

  async markLost(
    companyId: string,
    opportunityId: string,
    dto: MarkOpportunityLostDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const lostReason =
      await this.prisma.opportunityLostReasonDefinition.findFirst({
        where: {
          id: dto.lostReasonId,
          OR: [{ companyId: null }, { companyId }],
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
      });
    if (!lostReason)
      throw new UnprocessableEntityException(
        'Please select a valid lost reason.',
      );
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Opportunity was not found.');
      if (previous.status !== OpportunityStatus.OPEN)
        throw new UnprocessableEntityException(
          'Only open opportunities can be marked as lost.',
        );
      const lostStage = await this.terminalStage(companyId, tx, false);
      const opportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          status: OpportunityStatus.LOST,
          stageId: lostStage.id,
          probability: 0,
          lostDate: new Date(dto.lostDate),
          lostReasonId: lostReason.id,
          lostRemarks: dto.lostRemarks?.trim(),
          wonDate: null,
          finalContractValue: null,
          winReason: null,
          competitor: null,
          winRemarks: null,
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: opportunityInclude,
      });
      await tx.opportunityStageHistory.create({
        data: {
          companyId,
          opportunityId,
          fromStageId: previous.stageId,
          toStageId: lostStage.id,
          changedById: principal.membershipId,
          reason: `Opportunity lost: ${lostReason.name}`,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.MarkedLost',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { status: previous.status, stageId: previous.stageId },
        newValue: {
          status: OpportunityStatus.LOST,
          lostDate: dto.lostDate,
          lostReasonId: lostReason.id,
        },
      });
      return this.withWeightedValue(opportunity);
    });
  }

  async reopen(
    companyId: string,
    opportunityId: string,
    dto: ReopenOpportunityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Opportunity was not found.');
      if (
        previous.status !== OpportunityStatus.WON &&
        previous.status !== OpportunityStatus.LOST
      )
        throw new UnprocessableEntityException(
          'Only won or lost opportunities can be reopened.',
        );
      const history = await tx.opportunityStageHistory.findMany({
        where: { companyId, opportunityId, deletedAt: null },
        include: {
          toStage: {
            select: { id: true, isWon: true, isLost: true, probability: true },
          },
        },
        orderBy: { changedAt: 'desc' },
      });
      let targetStage = history
        .map((entry) => entry.toStage)
        .find((stage) => !stage.isWon && !stage.isLost);
      if (!targetStage) targetStage = await this.defaultStage(companyId, tx);
      const opportunity = await tx.opportunity.update({
        where: { id: opportunityId },
        data: {
          status: OpportunityStatus.OPEN,
          stageId: targetStage.id,
          probability: targetStage.probability,
          wonDate: null,
          finalContractValue: null,
          winReason: null,
          competitor: null,
          winRemarks: null,
          lostDate: null,
          lostReasonId: null,
          lostRemarks: null,
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: opportunityInclude,
      });
      await tx.opportunityStageHistory.create({
        data: {
          companyId,
          opportunityId,
          fromStageId: previous.stageId,
          toStageId: targetStage.id,
          changedById: principal.membershipId,
          reason: `Reopened: ${dto.reason.trim()}`,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.Reopened',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { status: previous.status, stageId: previous.stageId },
        newValue: {
          status: OpportunityStatus.OPEN,
          stageId: targetStage.id,
          reason: dto.reason.trim(),
        },
      });
      return this.withWeightedValue(opportunity);
    });
  }

  // Opportunity activities/follow-ups live in the shared CRM Activities
  // module (see apps/api/src/crm/activity.service.ts), filtered by
  // relatedType=OPPORTUNITY. Do not reintroduce per-opportunity activity
  // methods here.

  async addNote(
    companyId: string,
    opportunityId: string,
    dto: OpportunityNoteDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, opportunityId);
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.opportunityNote.create({
        data: {
          companyId,
          opportunityId,
          note: dto.note.trim(),
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await tx.opportunity.update({
        where: { id: opportunityId },
        data: { lastActivityAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.NoteAdded',
        entity: 'Opportunity',
        entityId: opportunityId,
        newValue: { noteId: note.id },
      });
      return note;
    });
  }

  async updateNote(
    companyId: string,
    opportunityId: string,
    noteId: string,
    dto: OpportunityNoteDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.prisma.opportunityNote.findFirst({
      where: { id: noteId, opportunityId, companyId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Note was not found.');
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.opportunityNote.update({
        where: { id: noteId },
        data: { note: dto.note.trim(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.NoteUpdated',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { noteId, note: previous.note },
        newValue: { noteId, note: note.note },
      });
      return note;
    });
  }

  async deleteNote(
    companyId: string,
    opportunityId: string,
    noteId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.prisma.opportunityNote.findFirst({
      where: { id: noteId, opportunityId, companyId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Note was not found.');
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.opportunityNote.update({
        where: { id: noteId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.NoteDeleted',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { noteId, note: previous.note },
      });
      return note;
    });
  }

  async addAttachment(
    companyId: string,
    opportunityId: string,
    dto: OpportunityAttachmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, opportunityId);
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
      const attachment = await tx.opportunityAttachment.create({
        data: {
          companyId,
          opportunityId,
          fileId: dto.fileId,
          title: dto.title,
          description: dto.description,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: { file: true },
      });
      await tx.opportunity.update({
        where: { id: opportunityId },
        data: { lastActivityAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.AttachmentAdded',
        entity: 'Opportunity',
        entityId: opportunityId,
        newValue: { attachmentId: attachment.id, fileId: dto.fileId },
      });
      return attachment;
    });
  }

  async deleteAttachment(
    companyId: string,
    opportunityId: string,
    attachmentId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.prisma.opportunityAttachment.findFirst({
      where: { id: attachmentId, opportunityId, companyId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Attachment was not found.');
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.opportunityAttachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Opportunity.AttachmentDeleted',
        entity: 'Opportunity',
        entityId: opportunityId,
        oldValue: { attachmentId, fileId: previous.fileId },
      });
      return attachment;
    });
  }

  async timeline(
    companyId: string,
    opportunityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, opportunityId);
    return this.prisma.auditLog.findMany({
      where: {
        companyId,
        entity: 'Opportunity',
        entityId: opportunityId,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async stageHistory(
    companyId: string,
    opportunityId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, opportunityId);
    return this.prisma.opportunityStageHistory.findMany({
      where: { companyId, opportunityId, deletedAt: null },
      include: {
        fromStage: { select: { id: true, code: true, name: true } },
        toStage: {
          select: {
            id: true,
            code: true,
            name: true,
            probability: true,
            isWon: true,
            isLost: true,
          },
        },
        changedBy: {
          select: {
            id: true,
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { changedAt: 'desc' },
      take: 100,
    });
  }

  async dashboard(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompany(companyId, principal);
    const [open, won, lost, overdue, cycle] = await Promise.all([
      this.moneyAggregate(companyId, OpportunityStatus.OPEN),
      this.moneyAggregate(companyId, OpportunityStatus.WON),
      this.moneyAggregate(companyId, OpportunityStatus.LOST),
      this.prisma.opportunity.count({
        where: {
          companyId,
          status: OpportunityStatus.OPEN,
          deletedAt: null,
          expectedClosingDate: { lt: new Date() },
        },
      }),
      this.prisma.$queryRaw<Array<{ days: string }>>(Prisma.sql`
        SELECT COALESCE(AVG("wonDate" - "createdAt"::date), 0)::text AS "days"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${OpportunityStatus.WON}
          AND "wonDate" IS NOT NULL
          AND "deletedAt" IS NULL
      `),
    ]);
    const closed = won.count + lost.count;
    const conversionRate =
      closed > 0 ? Math.round((won.count / closed) * 1000) / 10 : 0;
    return {
      byStatus: {
        OPEN: open.count,
        WON: won.count,
        LOST: lost.count,
      },
      pipelineValue: this.dec(open.total),
      weightedPipeline: this.dec(open.weighted ?? '0'),
      wonValue: this.dec(won.total),
      lostValue: this.dec(lost.total),
      conversionRate,
      overdueCount: overdue,
      avgSalesCycleDays: Math.round(Number(cycle[0]?.days ?? 0) * 10) / 10,
    };
  }

  async pipeline(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompany(companyId, principal);
    const rows = await this.prisma.$queryRaw<
      Array<{ stageId: string; count: number; total: string; weighted: string }>
    >(Prisma.sql`
      SELECT "stageId",
        COUNT(*)::int AS "count",
        COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
        COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
      FROM "opportunities"
      WHERE "companyId" = ${companyId}::uuid
        AND "status"::text = ${OpportunityStatus.OPEN}
        AND "deletedAt" IS NULL
      GROUP BY "stageId"
    `);
    const stageIds = rows.map((row) => row.stageId);
    const stages = stageIds.length
      ? await this.prisma.opportunityStageDefinition.findMany({
          where: { id: { in: stageIds }, deletedAt: null },
          select: {
            id: true,
            code: true,
            name: true,
            probability: true,
            sortOrder: true,
            isWon: true,
            isLost: true,
          },
        })
      : [];
    const byStage = rows.map((row) => ({
      stage: stages.find((stage) => stage.id === row.stageId) ?? null,
      count: row.count,
      totalValue: this.dec(row.total),
      weightedValue: this.dec(row.weighted),
    }));
    return {
      byStage,
      totals: {
        count: rows.reduce((sum, row) => sum + row.count, 0),
        totalValue: rows.reduce(
          (sum, row) => sum.plus(row.total),
          new Prisma.Decimal(0),
        ),
        weightedValue: rows.reduce(
          (sum, row) => sum.plus(row.weighted),
          new Prisma.Decimal(0),
        ),
      },
    };
  }

  async forecast(
    companyId: string,
    month: string | undefined,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const current = month ?? this.currentMonth();
    const next = this.nextMonth(current);
    const { start: startMonth, end: endMonth } = this.monthRange(current);
    const { start: startNext, end: endNext } = this.monthRange(next);
    const [
      open,
      closingThisMonth,
      closingNextMonth,
      wonThisMonth,
      wonNextMonth,
      lostThisMonth,
      lostNextMonth,
      won,
      lost,
      cycle,
      byStageRaw,
      byAssigneeRaw,
      byMonthRaw,
      byTypeRaw,
    ] = await Promise.all([
      this.moneyAggregate(companyId, OpportunityStatus.OPEN),
      this.moneyAggregate(
        companyId,
        OpportunityStatus.OPEN,
        startMonth,
        endMonth,
      ),
      this.moneyAggregate(
        companyId,
        OpportunityStatus.OPEN,
        startNext,
        endNext,
      ),
      this.moneyAggregate(
        companyId,
        OpportunityStatus.WON,
        startMonth,
        endMonth,
      ),
      this.moneyAggregate(companyId, OpportunityStatus.WON, startNext, endNext),
      this.moneyAggregate(
        companyId,
        OpportunityStatus.LOST,
        startMonth,
        endMonth,
      ),
      this.moneyAggregate(
        companyId,
        OpportunityStatus.LOST,
        startNext,
        endNext,
      ),
      this.prisma.opportunity.count({
        where: { companyId, status: OpportunityStatus.WON, deletedAt: null },
      }),
      this.prisma.opportunity.count({
        where: { companyId, status: OpportunityStatus.LOST, deletedAt: null },
      }),
      this.prisma.$queryRaw<Array<{ days: string }>>(Prisma.sql`
        SELECT COALESCE(AVG("wonDate" - "createdAt"::date), 0)::text AS "days"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${OpportunityStatus.WON}
          AND "wonDate" IS NOT NULL
          AND "deletedAt" IS NULL
      `),
      this.prisma.$queryRaw<
        Array<{
          stageId: string;
          count: number;
          total: string;
          weighted: string;
        }>
      >(Prisma.sql`
        SELECT "stageId", COUNT(*)::int AS "count",
          COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
          COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${OpportunityStatus.OPEN}
          AND "deletedAt" IS NULL
        GROUP BY "stageId"
      `),
      this.prisma.$queryRaw<
        Array<{
          assignedToId: string | null;
          count: number;
          total: string;
          weighted: string;
        }>
      >(Prisma.sql`
        SELECT "assignedToId", COUNT(*)::int AS "count",
          COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
          COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${OpportunityStatus.OPEN}
          AND "deletedAt" IS NULL
        GROUP BY "assignedToId"
        ORDER BY "assignedToId"
      `),
      this.prisma.$queryRaw<
        Array<{
          month: string;
          count: number;
          total: string;
          weighted: string;
        }>
      >(Prisma.sql`
        SELECT to_char("expectedClosingDate", 'YYYY-MM') AS "month",
          COUNT(*)::int AS "count",
          COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
          COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${OpportunityStatus.OPEN}
          AND "expectedClosingDate" IS NOT NULL
          AND "deletedAt" IS NULL
        GROUP BY 1
        ORDER BY 1
      `),
      this.prisma.$queryRaw<
        Array<{
          opportunityTypeId: string;
          count: number;
          total: string;
          weighted: string;
        }>
      >(Prisma.sql`
        SELECT "opportunityTypeId", COUNT(*)::int AS "count",
          COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
          COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${OpportunityStatus.OPEN}
          AND "deletedAt" IS NULL
        GROUP BY "opportunityTypeId"
      `),
    ]);

    const stageIds = byStageRaw.map((row) => row.stageId);
    const [stages, memberships, types] = await Promise.all([
      stageIds.length
        ? this.prisma.opportunityStageDefinition.findMany({
            where: { id: { in: stageIds }, deletedAt: null },
            select: {
              id: true,
              code: true,
              name: true,
              probability: true,
              sortOrder: true,
            },
          })
        : [],
      this.prisma.companyMembership.findMany({
        where: {
          companyId,
          deletedAt: null,
          id: {
            in: byAssigneeRaw
              .map((row) => row.assignedToId)
              .filter((id): id is string => id !== null),
          },
        },
        select: {
          id: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.opportunityTypeDefinition.findMany({
        where: { id: { in: byTypeRaw.map((row) => row.opportunityTypeId) } },
        select: { id: true, code: true, name: true },
      }),
    ]);
    const closed = won + lost;
    return {
      month: current,
      nextMonth: next,
      pipeline: {
        count: open.count,
        value: this.dec(open.total),
        weighted: this.dec(open.weighted ?? '0'),
      },
      expectedClosingThisMonth: {
        count: closingThisMonth.count,
        value: this.dec(closingThisMonth.total),
        weighted: this.dec(closingThisMonth.weighted ?? '0'),
      },
      expectedClosingNextMonth: {
        count: closingNextMonth.count,
        value: this.dec(closingNextMonth.total),
        weighted: this.dec(closingNextMonth.weighted ?? '0'),
      },
      wonThisMonth: {
        count: wonThisMonth.count,
        value: this.dec(wonThisMonth.total),
      },
      wonNextMonth: {
        count: wonNextMonth.count,
        value: this.dec(wonNextMonth.total),
      },
      lostThisMonth: {
        count: lostThisMonth.count,
        value: this.dec(lostThisMonth.total),
      },
      lostNextMonth: {
        count: lostNextMonth.count,
        value: this.dec(lostNextMonth.total),
      },
      conversionRate: closed > 0 ? Math.round((won / closed) * 1000) / 10 : 0,
      avgSalesCycleDays: Math.round(Number(cycle[0]?.days ?? 0) * 10) / 10,
      byStage: byStageRaw.map((row) => ({
        stage: stages.find((stage) => stage.id === row.stageId) ?? null,
        count: row.count,
        value: this.dec(row.total),
        weighted: this.dec(row.weighted),
      })),
      byAssignee: byAssigneeRaw.map((row) => ({
        assignee: row.assignedToId
          ? (memberships.find((member) => member.id === row.assignedToId) ??
            null)
          : null,
        count: row.count,
        value: this.dec(row.total),
        weighted: this.dec(row.weighted),
      })),
      byMonth: byMonthRaw.map((row) => ({
        month: row.month,
        count: row.count,
        value: this.dec(row.total),
        weighted: this.dec(row.weighted),
      })),
      byType: byTypeRaw.map((row) => ({
        type: types.find((type) => type.id === row.opportunityTypeId) ?? null,
        count: row.count,
        value: this.dec(row.total),
        weighted: this.dec(row.weighted),
      })),
    };
  }

  async exportCsv(
    companyId: string,
    query: OpportunityQueryDto,
    principal: AuthenticatedPrincipal,
  ): Promise<string> {
    this.assertCompany(companyId, principal);
    const where = this.buildWhere(companyId, query);
    const rows = await this.prisma.opportunity.findMany({
      where,
      include: opportunityInclude,
      orderBy: { [query.sortBy]: query.sortOrder },
      take: 10000,
    });
    const header = [
      'Number',
      'Name',
      'Status',
      'Stage',
      'Probability',
      'Priority',
      'Type',
      'Source',
      'Company',
      'Contact',
      'Project Location',
      'City',
      'Area',
      'Estimated Value',
      'Currency',
      'Expected Closing Date',
      'Assigned To',
      'Won Date',
      'Final Contract Value',
      'Lost Date',
      'Lost Reason',
      'Created At',
    ];
    const lines = rows.map((row) =>
      [
        row.opportunityNumber,
        row.name,
        row.status,
        row.stage.name,
        row.probability,
        row.priority,
        row.opportunityType.name,
        row.source.name,
        row.crmCompany?.name ?? '',
        row.crmContact
          ? `${row.crmContact.firstName} ${row.crmContact.lastName}`.trim()
          : '',
        row.projectLocation ?? '',
        row.city ?? '',
        row.area ?? '',
        row.estimatedContractValue?.toString() ?? '',
        row.currency,
        row.expectedClosingDate
          ? new Date(row.expectedClosingDate).toISOString().slice(0, 10)
          : '',
        row.assignedTo
          ? `${row.assignedTo.user.firstName} ${row.assignedTo.user.lastName}`.trim()
          : '',
        row.wonDate ? new Date(row.wonDate).toISOString().slice(0, 10) : '',
        row.finalContractValue?.toString() ?? '',
        row.lostDate ? new Date(row.lostDate).toISOString().slice(0, 10) : '',
        row.lostReason?.name ?? '',
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

  async catalog(
    companyId: string,
    includeInactive: boolean,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const where = {
      OR: [{ companyId: null }, { companyId }],
      deletedAt: null,
      status: includeInactive ? undefined : EntityStatus.ACTIVE,
    };
    const [stages, types, sources, lostReasons, company] = await Promise.all([
      this.prisma.opportunityStageDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.opportunityTypeDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.opportunitySourceDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.opportunityLostReasonDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { currency: true },
      }),
    ]);
    return {
      stages,
      types,
      sources,
      lostReasons,
      statuses: Object.values(OpportunityStatus),
      priorities: Object.values(OpportunityPriority),
      defaultCurrency: company?.currency ?? 'USD',
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
                        PERMISSIONS.CRM_OPPORTUNITY_VIEW,
                        PERMISSIONS.CRM_OPPORTUNITY_EDIT,
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

  async convertPreview(
    companyId: string,
    leadId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const lead = await this.convertibleLead(companyId, leadId);
    const [types, sources, company] = await Promise.all([
      this.prisma.opportunityTypeDefinition.findMany({
        where: {
          OR: [{ companyId: null }, { companyId }],
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.opportunitySourceDefinition.findMany({
        where: {
          OR: [{ companyId: null }, { companyId }],
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { currency: true },
      }),
    ]);
    return {
      lead,
      types,
      sources,
      defaultCurrency: company?.currency ?? 'USD',
      suggested: {
        name:
          lead.name ||
          lead.organizationName ||
          lead.projectLocation ||
          'New opportunity',
        estimatedContractValue: lead.estimatedValue,
        currency: lead.currency,
        priority: lead.priority,
        expectedClosingDate: lead.expectedClosingDate,
        assignedToId: lead.assignedToId,
        crmCompanyId: lead.crmCompanyId,
        crmContactId: lead.crmContactId,
        projectLocation: lead.projectLocation,
        city: lead.projectCity,
        area: lead.projectArea,
        description: lead.description,
      },
    };
  }

  async convertLead(
    companyId: string,
    dto: ConvertLeadToOpportunityDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const lead = await this.convertibleLead(companyId, dto.leadId);
    await this.validateReferences(companyId, {
      typeId: dto.opportunityTypeId,
      sourceId: dto.sourceId,
    });
    if (dto.assignedToId)
      await this.assertAssignable(companyId, dto.assignedToId);
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { currency: true },
    });
    if (!company) throw new NotFoundException('Company was not found.');

    return this.prisma.$transaction(
      async (tx) => {
        const opportunityNumber = await this.allocateOpportunityNumber(
          tx,
          companyId,
          principal.userId,
        );
        const stage = await this.defaultStage(companyId, tx);
        const name = (
          dto.name ??
          (lead.name ||
            lead.organizationName ||
            lead.projectLocation ||
            `Opportunity from ${lead.leadNumber}`)
        ).trim();
        const opportunity = await tx.opportunity.create({
          data: {
            companyId,
            opportunityNumber,
            name,
            leadId: lead.id,
            crmCompanyId: lead.crmCompanyId,
            crmContactId: lead.crmContactId,
            opportunityTypeId: dto.opportunityTypeId,
            sourceId: dto.sourceId,
            stageId: stage.id,
            status: OpportunityStatus.OPEN,
            projectLocation: lead.projectLocation,
            city: lead.projectCity,
            area: lead.projectArea,
            estimatedContractValue:
              dto.estimatedContractValue === undefined
                ? lead.estimatedValue
                : new Prisma.Decimal(dto.estimatedContractValue),
            currency: dto.currency ?? company.currency,
            probability: dto.probability ?? stage.probability,
            priority:
              dto.priority ?? leadPriorityToOpportunityPriority[lead.priority],
            expectedClosingDate: dto.expectedClosingDate
              ? new Date(dto.expectedClosingDate)
              : lead.expectedClosingDate,
            expectedStartDate: dto.expectedStartDate
              ? new Date(dto.expectedStartDate)
              : undefined,
            expectedCompletionDate: dto.expectedCompletionDate
              ? new Date(dto.expectedCompletionDate)
              : undefined,
            assignedToId:
              dto.assignedToId !== undefined
                ? dto.assignedToId
                : lead.assignedToId,
            description: dto.description?.trim() ?? lead.description,
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
          include: opportunityInclude,
        });
        await tx.opportunityStageHistory.create({
          data: {
            companyId,
            opportunityId: opportunity.id,
            toStageId: stage.id,
            changedById: principal.membershipId,
            reason: 'Converted from lead',
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
        });
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.CONVERTED, updatedBy: principal.userId },
        });
        await this.audit.record(tx, {
          companyId,
          action: 'CRM.Opportunity.ConvertedFromLead',
          entity: 'Opportunity',
          entityId: opportunity.id,
          newValue: { opportunityNumber, leadId: lead.id },
        });
        await this.audit.record(tx, {
          companyId,
          action: 'CRM.Lead.Converted',
          entity: 'Lead',
          entityId: lead.id,
          oldValue: { status: LeadStatus.QUALIFIED },
          newValue: {
            status: LeadStatus.CONVERTED,
            opportunityId: opportunity.id,
          },
        });
        return this.withWeightedValue(opportunity);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async convertibleLead(companyId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, companyId, deletedAt: null },
      include: {
        crmCompany: {
          select: { id: true, name: true, email: true, phone: true },
        },
        crmContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead was not found.');
    if (lead.status !== LeadStatus.QUALIFIED)
      throw new UnprocessableEntityException(
        'Only qualified leads can be converted to opportunities.',
      );
    const existing = await this.prisma.opportunity.findFirst({
      where: { leadId: lead.id, deletedAt: null },
      select: { id: true, opportunityNumber: true },
    });
    if (existing)
      throw new ConflictException(
        `This lead has already been converted to opportunity ${existing.opportunityNumber}.`,
      );
    return lead;
  }

  private async moneyAggregate(
    companyId: string,
    status: OpportunityStatus,
    start?: Date,
    end?: Date,
  ): Promise<MoneyRow> {
    const dateColumn =
      status === OpportunityStatus.WON
        ? '"wonDate"'
        : status === OpportunityStatus.LOST
          ? '"lostDate"'
          : '"expectedClosingDate"';
    const valueSql =
      status === OpportunityStatus.WON
        ? 'COALESCE("finalContractValue", "estimatedContractValue")'
        : '"estimatedContractValue"';
    const hasRange = Boolean(start && end);
    const sql = hasRange
      ? Prisma.sql`
        SELECT COUNT(*)::int AS "count",
          COALESCE(SUM(${Prisma.raw(valueSql)}), 0)::text AS "total",
          ${
            status === OpportunityStatus.OPEN
              ? Prisma.sql`COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted",`
              : Prisma.empty
          }
          '' AS "unused"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${status}
          AND ${Prisma.raw(dateColumn)} >= ${start!}::date
          AND ${Prisma.raw(dateColumn)} <= ${end!}::date
          AND "deletedAt" IS NULL
      `
      : Prisma.sql`
        SELECT COUNT(*)::int AS "count",
          COALESCE(SUM(${Prisma.raw(valueSql)}), 0)::text AS "total",
          ${
            status === OpportunityStatus.OPEN
              ? Prisma.sql`COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"`
              : Prisma.sql`'0'::text AS "weighted"`
          }
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "status"::text = ${status}
          AND "deletedAt" IS NULL
      `;
    const rows = await this.prisma.$queryRaw<MoneyRow[]>(sql);
    return rows[0] ?? { count: 0, total: '0', weighted: '0' };
  }

  private buildWhere(
    companyId: string,
    query: OpportunityQueryDto,
  ): Prisma.OpportunityWhereInput {
    return {
      companyId,
      deletedAt: null,
      status: query.status,
      stageId: query.stageId,
      opportunityTypeId: query.opportunityTypeId,
      sourceId: query.sourceId,
      assignedToId: query.assignedToId,
      priority: query.priority,
      expectedClosingDate:
        query.expectedClosingFrom || query.expectedClosingTo
          ? {
              gte: query.expectedClosingFrom
                ? new Date(query.expectedClosingFrom)
                : undefined,
              lte: query.expectedClosingTo
                ? new Date(query.expectedClosingTo)
                : undefined,
            }
          : undefined,
      createdAt:
        query.createdFrom || query.createdTo
          ? {
              gte: query.createdFrom ? new Date(query.createdFrom) : undefined,
              lte: query.createdTo ? this.endOfDay(query.createdTo) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            {
              opportunityNumber: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            { name: { contains: query.search, mode: 'insensitive' } },
            {
              projectLocation: { contains: query.search, mode: 'insensitive' },
            },
            { city: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }

  private mutableData(dto: UpdateOpportunityDto) {
    return {
      name: dto.name?.trim(),
      opportunityTypeId: dto.opportunityTypeId,
      sourceId: dto.sourceId,
      crmCompanyId: dto.crmCompanyId,
      crmContactId: dto.crmContactId,
      projectLocation: dto.projectLocation?.trim(),
      city: dto.city?.trim(),
      area: dto.area?.trim(),
      currency: dto.currency,
      probability: dto.probability,
      priority: dto.priority,
      expectedClosingDate:
        dto.expectedClosingDate === undefined
          ? undefined
          : new Date(dto.expectedClosingDate),
      expectedStartDate:
        dto.expectedStartDate === undefined
          ? undefined
          : new Date(dto.expectedStartDate),
      expectedCompletionDate:
        dto.expectedCompletionDate === undefined
          ? undefined
          : new Date(dto.expectedCompletionDate),
      assignedToId: dto.assignedToId,
      description: dto.description?.trim(),
    };
  }

  private async validateReferences(
    companyId: string,
    input: { typeId?: string; sourceId?: string; stageId?: string },
  ) {
    const [type, source, stage] = await Promise.all([
      input.typeId
        ? this.prisma.opportunityTypeDefinition.findFirst({
            where: {
              id: input.typeId,
              OR: [{ companyId: null }, { companyId }],
              status: EntityStatus.ACTIVE,
              deletedAt: null,
            },
          })
        : null,
      input.sourceId
        ? this.prisma.opportunitySourceDefinition.findFirst({
            where: {
              id: input.sourceId,
              OR: [{ companyId: null }, { companyId }],
              status: EntityStatus.ACTIVE,
              deletedAt: null,
            },
          })
        : null,
      input.stageId
        ? this.prisma.opportunityStageDefinition.findFirst({
            where: {
              id: input.stageId,
              OR: [{ companyId: null }, { companyId }],
              status: EntityStatus.ACTIVE,
              deletedAt: null,
            },
          })
        : null,
    ]);
    if (input.typeId && !type)
      throw new UnprocessableEntityException(
        'Please select a valid opportunity type.',
      );
    if (input.sourceId && !source)
      throw new UnprocessableEntityException(
        'Please select a valid opportunity source.',
      );
    if (input.stageId && !stage)
      throw new UnprocessableEntityException(
        'Please select a valid pipeline stage.',
      );
  }

  private async validatePartyLinks(
    companyId: string,
    crmCompanyId?: string,
    crmContactId?: string,
  ) {
    const [company, contact] = await Promise.all([
      crmCompanyId
        ? this.prisma.crmCompany.findFirst({
            where: { id: crmCompanyId, companyId, deletedAt: null },
          })
        : null,
      crmContactId
        ? this.prisma.crmContact.findFirst({
            where: { id: crmContactId, companyId, deletedAt: null },
          })
        : null,
    ]);
    if (crmCompanyId && !company)
      throw new UnprocessableEntityException(
        'Please select a valid CRM company.',
      );
    if (crmContactId && !contact)
      throw new UnprocessableEntityException(
        'Please select a valid CRM contact.',
      );
    if (company && contact?.crmCompanyId && contact.crmCompanyId !== company.id)
      throw new UnprocessableEntityException(
        'The selected contact does not belong to the selected CRM company.',
      );
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
                        PERMISSIONS.CRM_OPPORTUNITY_VIEW,
                        PERMISSIONS.CRM_OPPORTUNITY_EDIT,
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
        "You don't have permission to assign this opportunity.",
      );
  }

  private async getBase(companyId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, companyId, deletedAt: null },
    });
    if (!opportunity) throw new NotFoundException('Opportunity was not found.');
    return opportunity;
  }

  private async defaultStage(companyId: string, tx: Prisma.TransactionClient) {
    const stage = await tx.opportunityStageDefinition.findFirst({
      where: {
        OR: [{ companyId: null }, { companyId }],
        status: EntityStatus.ACTIVE,
        isWon: false,
        isLost: false,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });
    if (!stage)
      throw new UnprocessableEntityException(
        'No active pipeline stage is configured for new opportunities.',
      );
    return stage;
  }

  private async terminalStage(
    companyId: string,
    tx: Prisma.TransactionClient,
    isWon: boolean,
  ) {
    const stage = await tx.opportunityStageDefinition.findFirst({
      where: {
        OR: [{ companyId: null }, { companyId }],
        status: EntityStatus.ACTIVE,
        isWon,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });
    if (!stage)
      throw new UnprocessableEntityException(
        isWon
          ? 'The Won stage is not configured in the pipeline.'
          : 'The Lost stage is not configured in the pipeline.',
      );
    return stage;
  }

  private async allocateOpportunityNumber(
    tx: Prisma.TransactionClient,
    companyId: string,
    actorId: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "companies" WHERE "id" = ${companyId}::uuid FOR UPDATE`,
    );
    const year = String(new Date().getUTCFullYear());
    let sequence = await tx.documentSequence.findFirst({
      where: {
        companyId,
        branchId: null,
        documentType: 'CRM_OPPORTUNITY',
        deletedAt: null,
      },
    });
    sequence ??= await tx.documentSequence.create({
      data: {
        companyId,
        documentType: 'CRM_OPPORTUNITY',
        prefixTemplate: 'OPP-{YYYY}-',
        padding: 6,
        currentPeriod: year,
        nextNumber: 1n,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    const numeric = sequence.currentPeriod === year ? sequence.nextNumber : 1n;
    await tx.documentSequence.update({
      where: { id: sequence.id },
      data: {
        currentPeriod: year,
        nextNumber: numeric + 1n,
        updatedBy: actorId,
      },
    });
    return `OPP-${year}-${numeric.toString().padStart(sequence.padding, '0')}`;
  }

  private withWeightedValue<
    T extends { estimatedContractValue: unknown; probability: number },
  >(opportunity: T) {
    const value =
      opportunity.estimatedContractValue == null
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal(
            opportunity.estimatedContractValue as Prisma.Decimal.Value,
          );
    return {
      ...opportunity,
      weightedValue: value.mul(opportunity.probability).div(100).toFixed(2),
    };
  }

  private dec(value: string): Prisma.Decimal {
    return new Prisma.Decimal(value || '0').toDecimalPlaces(2);
  }

  private csvCell(value: string | number): string {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  private monthRange(month: string) {
    const [year, monthIndex] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthIndex - 1, 1));
    const end = new Date(Date.UTC(year, monthIndex, 0, 23, 59, 59, 999));
    return { start, end };
  }

  private currentMonth() {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private nextMonth(month: string) {
    const [year, monthIndex] = month.split('-').map(Number);
    return monthIndex === 12
      ? `${year + 1}-01`
      : `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  }

  private endOfDay(value: string) {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);
    return date;
  }

  private assertCompany(companyId: string, principal: AuthenticatedPrincipal) {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId)
      throw new ForbiddenException("You don't have access to this section.");
  }
}
