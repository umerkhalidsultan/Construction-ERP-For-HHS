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
  LeadStatus,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from '../permissions/permission.constants';
import {
  AssignLeadDto,
  ChangeLeadStatusDto,
  CreateLeadDto,
  DuplicateLeadQueryDto,
  LeadAttachmentDto,
  LeadNoteDto,
  LeadQueryDto,
  UpdateLeadDto,
} from './lead.dto';

const leadInclude = {
  leadType: { select: { id: true, code: true, name: true } },
  leadSource: { select: { id: true, code: true, name: true } },
  assignedTo: {
    select: {
      id: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
  crmCompany: { select: { id: true, name: true, email: true, phone: true } },
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
} satisfies Prisma.LeadInclude;

const statusTransitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: [
    LeadStatus.CONTACTED,
    LeadStatus.UNQUALIFIED,
    LeadStatus.ON_HOLD,
    LeadStatus.LOST,
  ],
  CONTACTED: [
    LeadStatus.QUALIFIED,
    LeadStatus.UNQUALIFIED,
    LeadStatus.ON_HOLD,
    LeadStatus.LOST,
  ],
  QUALIFIED: [
    LeadStatus.CONTACTED,
    LeadStatus.ON_HOLD,
    LeadStatus.CONVERTED,
    LeadStatus.LOST,
  ],
  UNQUALIFIED: [LeadStatus.NEW, LeadStatus.LOST],
  ON_HOLD: [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFIED,
    LeadStatus.LOST,
  ],
  CONVERTED: [],
  LOST: [LeadStatus.NEW],
};

@Injectable()
export class LeadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    companyId: string,
    query: LeadQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const where: Prisma.LeadWhereInput = {
      companyId,
      deletedAt: null,
      status: query.status,
      leadTypeId: query.leadTypeId,
      leadSourceId: query.leadSourceId,
      assignedToId: query.assignedToId,
      priority: query.priority,
      projectLocation: query.projectLocation
        ? { contains: query.projectLocation, mode: 'insensitive' }
        : undefined,
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
            { leadNumber: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
            {
              organizationName: { contains: query.search, mode: 'insensitive' },
            },
            { contactPerson: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: 'insensitive' } },
            {
              projectLocation: { contains: query.search, mode: 'insensitive' },
            },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.lead.count({ where }),
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

  async get(
    companyId: string,
    leadId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, companyId, deletedAt: null },
      include: {
        ...leadInclude,
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
    if (!lead) throw new NotFoundException('Lead was not found.');
    return lead;
  }

  async create(
    companyId: string,
    dto: CreateLeadDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.validateReferences(companyId, dto.leadTypeId, dto.leadSourceId);
    await this.validatePartyLinks(
      companyId,
      dto.crmCompanyId,
      dto.crmContactId,
    );
    if (dto.assignedToId)
      await this.assertAssignable(companyId, dto.assignedToId);
    const duplicates = await this.findDuplicates(companyId, dto);
    if (duplicates.length && !dto.overrideDuplicate) {
      throw new ConflictException(
        'A similar lead already exists. Please review the possible duplicate.',
      );
    }
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { currency: true },
    });
    if (!company) throw new NotFoundException('Company was not found.');

    return this.prisma.$transaction(
      async (tx) => {
        const leadNumber = await this.allocateLeadNumber(
          tx,
          companyId,
          principal.userId,
        );
        const lead = await tx.lead.create({
          data: {
            companyId,
            leadNumber,
            ...this.mutableData(dto),
            name: dto.name.trim(),
            leadTypeId: dto.leadTypeId,
            leadSourceId: dto.leadSourceId,
            assignedToId: dto.assignedToId,
            partyLinkStatus:
              dto.crmCompanyId || dto.crmContactId ? 'LINKED' : 'UNLINKED',
            currency: dto.currency ?? company.currency,
            estimatedValue:
              dto.estimatedValue === undefined
                ? undefined
                : new Prisma.Decimal(dto.estimatedValue),
            expectedClosingDate: dto.expectedClosingDate
              ? new Date(dto.expectedClosingDate)
              : undefined,
            createdBy: principal.userId,
            updatedBy: principal.userId,
          },
          include: leadInclude,
        });
        await this.audit.record(tx, {
          companyId,
          action: 'CRM.Lead.Created',
          entity: 'Lead',
          entityId: lead.id,
          newValue: lead,
        });
        return { ...lead, possibleDuplicatesOverridden: duplicates.length };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async update(
    companyId: string,
    leadId: string,
    dto: UpdateLeadDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    if (dto.leadTypeId || dto.leadSourceId) {
      const current = await this.getBase(companyId, leadId);
      await this.validateReferences(
        companyId,
        dto.leadTypeId ?? current.leadTypeId,
        dto.leadSourceId ?? current.leadSourceId,
      );
    }
    if (dto.crmCompanyId !== undefined || dto.crmContactId !== undefined) {
      const current = await this.getBase(companyId, leadId);
      await this.validatePartyLinks(
        companyId,
        dto.crmCompanyId ?? current.crmCompanyId ?? undefined,
        dto.crmContactId ?? current.crmContactId ?? undefined,
      );
    }
    const duplicateInput = { ...dto, excludeLeadId: leadId };
    const duplicates = await this.findDuplicates(companyId, duplicateInput);
    if (duplicates.length && !dto.overrideDuplicate)
      throw new ConflictException(
        'A similar lead already exists. Please review the possible duplicate.',
      );
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.lead.findFirst({
        where: { id: leadId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Lead was not found.');
      const lead = await tx.lead.update({
        where: { id: leadId },
        data: {
          ...this.mutableData(dto),
          estimatedValue:
            dto.estimatedValue === undefined
              ? undefined
              : new Prisma.Decimal(dto.estimatedValue),
          expectedClosingDate:
            dto.expectedClosingDate === undefined
              ? undefined
              : new Date(dto.expectedClosingDate),
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: leadInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Lead.Updated',
        entity: 'Lead',
        entityId: leadId,
        oldValue: previous,
        newValue: lead,
      });
      return lead;
    });
  }

  async remove(
    companyId: string,
    leadId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.lead.findFirst({
        where: { id: leadId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Lead was not found.');
      const lead = await tx.lead.update({
        where: { id: leadId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Lead.Deleted',
        entity: 'Lead',
        entityId: leadId,
        oldValue: previous,
        newValue: lead,
      });
      return lead;
    });
  }

  async assign(
    companyId: string,
    leadId: string,
    dto: AssignLeadDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    if (dto.assignedToId)
      await this.assertAssignable(companyId, dto.assignedToId);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.lead.findFirst({
        where: { id: leadId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Lead was not found.');
      const lead = await tx.lead.update({
        where: { id: leadId },
        data: {
          assignedToId: dto.assignedToId ?? null,
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: leadInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: dto.assignedToId
          ? previous.assignedToId
            ? 'CRM.Lead.Reassigned'
            : 'CRM.Lead.Assigned'
          : 'CRM.Lead.Unassigned',
        entity: 'Lead',
        entityId: leadId,
        oldValue: { assignedToId: previous.assignedToId },
        newValue: { assignedToId: dto.assignedToId ?? null },
      });
      return lead;
    });
  }

  async changeStatus(
    companyId: string,
    leadId: string,
    dto: ChangeLeadStatusDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.lead.findFirst({
        where: { id: leadId, companyId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException('Lead was not found.');
      if (
        previous.status !== dto.status &&
        !statusTransitions[previous.status].includes(dto.status)
      ) {
        throw new UnprocessableEntityException(
          `A lead cannot move from ${previous.status} to ${dto.status}.`,
        );
      }
      const lead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: dto.status,
          lastActivityAt: new Date(),
          updatedBy: principal.userId,
        },
        include: leadInclude,
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Lead.StatusChanged',
        entity: 'Lead',
        entityId: leadId,
        oldValue: { status: previous.status },
        newValue: { status: lead.status },
      });
      return lead;
    });
  }

  async addNote(
    companyId: string,
    leadId: string,
    dto: LeadNoteDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, leadId);
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.leadNote.create({
        data: {
          companyId,
          leadId,
          note: dto.note.trim(),
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await tx.lead.update({
        where: { id: leadId },
        data: { lastActivityAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Lead.NoteAdded',
        entity: 'Lead',
        entityId: leadId,
        newValue: { noteId: note.id },
      });
      return note;
    });
  }

  async updateNote(
    companyId: string,
    leadId: string,
    noteId: string,
    dto: LeadNoteDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.prisma.leadNote.findFirst({
      where: { id: noteId, leadId, companyId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Lead note was not found.');
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.leadNote.update({
        where: { id: noteId },
        data: { note: dto.note.trim(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Lead.NoteUpdated',
        entity: 'Lead',
        entityId: leadId,
        oldValue: { noteId, note: previous.note },
        newValue: { noteId, note: note.note },
      });
      return note;
    });
  }

  async deleteNote(
    companyId: string,
    leadId: string,
    noteId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const previous = await this.prisma.leadNote.findFirst({
      where: { id: noteId, leadId, companyId, deletedAt: null },
    });
    if (!previous) throw new NotFoundException('Lead note was not found.');
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.leadNote.update({
        where: { id: noteId },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Lead.NoteDeleted',
        entity: 'Lead',
        entityId: leadId,
        oldValue: { noteId, note: previous.note },
      });
      return note;
    });
  }

  async addAttachment(
    companyId: string,
    leadId: string,
    dto: LeadAttachmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, leadId);
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
      const attachment = await tx.leadAttachment.create({
        data: {
          companyId,
          leadId,
          fileId: dto.fileId,
          title: dto.title,
          description: dto.description,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: { file: true },
      });
      await tx.lead.update({
        where: { id: leadId },
        data: { lastActivityAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId,
        action: 'CRM.Lead.AttachmentAdded',
        entity: 'Lead',
        entityId: leadId,
        newValue: { attachmentId: attachment.id, fileId: dto.fileId },
      });
      return attachment;
    });
  }

  async timeline(
    companyId: string,
    leadId: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    await this.getBase(companyId, leadId);
    return this.prisma.auditLog.findMany({
      where: { companyId, entity: 'Lead', entityId: leadId, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async dashboard(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompany(companyId, principal);
    const where = { companyId, deletedAt: null };
    const [total, grouped, pipeline] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where,
        _count: true,
        orderBy: { status: 'asc' },
      }),
      this.prisma.lead.aggregate({
        where: {
          ...where,
          status: {
            in: [
              LeadStatus.NEW,
              LeadStatus.CONTACTED,
              LeadStatus.QUALIFIED,
              LeadStatus.ON_HOLD,
            ],
          },
        },
        _sum: { estimatedValue: true },
      }),
    ]);
    return {
      total,
      byStatus: Object.fromEntries(
        grouped.map((row) => [
          row.status,
          (row._count as { _all?: number } | undefined)?._all ?? 0,
        ]),
      ),
      expectedPipelineValue:
        pipeline._sum.estimatedValue ?? new Prisma.Decimal(0),
    };
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
    const [types, sources, company] = await Promise.all([
      this.prisma.leadTypeDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.leadSourceDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { currency: true },
      }),
    ]);
    return {
      types,
      sources,
      defaultCurrency: company?.currency ?? 'USD',
      statuses: Object.values(LeadStatus),
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
                        PERMISSIONS.CRM_LEAD_VIEW,
                        PERMISSIONS.CRM_LEAD_EDIT,
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

  duplicateCheck(
    companyId: string,
    query: DuplicateLeadQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    return this.findDuplicates(companyId, query);
  }

  private async findDuplicates(
    companyId: string,
    input: DuplicateLeadQueryDto & { excludeLeadId?: string },
  ) {
    const or: Prisma.LeadWhereInput[] = [];
    if (input.email)
      or.push({ email: { equals: input.email.trim(), mode: 'insensitive' } });
    if (input.phone) or.push({ phone: this.normalizePhone(input.phone) });
    if (input.organizationName)
      or.push({
        organizationName: {
          equals: input.organizationName.trim(),
          mode: 'insensitive',
        },
      });
    if (input.contactPerson)
      or.push({
        contactPerson: {
          equals: input.contactPerson.trim(),
          mode: 'insensitive',
        },
      });
    if (!or.length) return [];
    return this.prisma.lead.findMany({
      where: {
        companyId,
        id: input.excludeLeadId ? { not: input.excludeLeadId } : undefined,
        deletedAt: null,
        OR: or,
      },
      select: {
        id: true,
        leadNumber: true,
        name: true,
        organizationName: true,
        contactPerson: true,
        phone: true,
        email: true,
        status: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  private mutableData(dto: UpdateLeadDto) {
    return {
      name: dto.name?.trim(),
      leadTypeId: dto.leadTypeId,
      leadSourceId: dto.leadSourceId,
      organizationName: dto.organizationName?.trim(),
      contactPerson: dto.contactPerson?.trim(),
      phone: dto.phone ? this.normalizePhone(dto.phone) : dto.phone,
      alternatePhone: dto.alternatePhone
        ? this.normalizePhone(dto.alternatePhone)
        : dto.alternatePhone,
      email: dto.email?.trim().toLowerCase(),
      website: dto.website?.trim(),
      address: dto.address?.trim(),
      city: dto.city?.trim(),
      projectLocation: dto.projectLocation?.trim(),
      projectCity: dto.projectCity?.trim(),
      projectArea: dto.projectArea?.trim(),
      latitude:
        dto.latitude === undefined
          ? undefined
          : new Prisma.Decimal(dto.latitude),
      longitude:
        dto.longitude === undefined
          ? undefined
          : new Prisma.Decimal(dto.longitude),
      currency: dto.currency,
      priority: dto.priority,
      description: dto.description?.trim(),
      crmCompanyId: dto.crmCompanyId,
      crmContactId: dto.crmContactId,
      partyLinkStatus:
        dto.crmCompanyId !== undefined || dto.crmContactId !== undefined
          ? dto.crmCompanyId || dto.crmContactId
            ? ('LINKED' as const)
            : ('UNLINKED' as const)
          : undefined,
    };
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

  private async validateReferences(
    companyId: string,
    typeId: string,
    sourceId: string,
  ) {
    const [type, source] = await Promise.all([
      this.prisma.leadTypeDefinition.findFirst({
        where: {
          id: typeId,
          OR: [{ companyId: null }, { companyId }],
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
      }),
      this.prisma.leadSourceDefinition.findFirst({
        where: {
          id: sourceId,
          OR: [{ companyId: null }, { companyId }],
          status: EntityStatus.ACTIVE,
          deletedAt: null,
        },
      }),
    ]);
    if (!type)
      throw new UnprocessableEntityException(
        'Please select a valid lead type.',
      );
    if (!source)
      throw new UnprocessableEntityException(
        'Please select a valid lead source.',
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
                        PERMISSIONS.CRM_LEAD_VIEW,
                        PERMISSIONS.CRM_LEAD_EDIT,
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
        "You don't have permission to assign this lead.",
      );
  }

  private async getBase(companyId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, companyId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException('Lead was not found.');
    return lead;
  }

  private async allocateLeadNumber(
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
        documentType: 'CRM_LEAD',
        deletedAt: null,
      },
    });
    sequence ??= await tx.documentSequence.create({
      data: {
        companyId,
        documentType: 'CRM_LEAD',
        prefixTemplate: 'LEAD-{YYYY}-',
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
    return `LEAD-${year}-${numeric.toString().padStart(sequence.padding, '0')}`;
  }

  private normalizePhone(value: string) {
    return value.trim().replace(/[\s()-]/g, '');
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
