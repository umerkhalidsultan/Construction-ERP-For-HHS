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
  LeadPartyLinkStatus,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { PERMISSIONS } from '../permissions/permission.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContactCompanyLinkDto,
  CreateCrmCompanyDto,
  CreateCrmContactDto,
  CrmCompanyDuplicateQueryDto,
  CrmCompanyQueryDto,
  CrmContactDuplicateQueryDto,
  CrmContactQueryDto,
  LinkLeadPartiesDto,
  PartyAssignmentDto,
  PartyAttachmentDto,
  PartyNoteDto,
  PrimaryContactDto,
  UpdateCrmCompanyDto,
  UpdateCrmContactDto,
} from './party.dto';

const assigneeSelect = {
  id: true,
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;
const companyInclude = {
  types: {
    where: { deletedAt: null },
    include: { type: { select: { id: true, code: true, name: true } } },
  },
  assignedTo: { select: assigneeSelect },
  primaryContacts: {
    where: { deletedAt: null },
    include: {
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
  },
} satisfies Prisma.CrmCompanyInclude;
const contactInclude = {
  types: {
    where: { deletedAt: null },
    include: { type: { select: { id: true, code: true, name: true } } },
  },
  assignedTo: { select: assigneeSelect },
  crmCompany: { select: { id: true, name: true, status: true } },
  primaryFor: {
    where: { deletedAt: null },
    select: { id: true, purpose: true, label: true, crmCompanyId: true },
  },
} satisfies Prisma.CrmContactInclude;

@Injectable()
export class PartyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listCompanies(
    tenantId: string,
    query: CrmCompanyQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const where: Prisma.CrmCompanyWhereInput = {
      companyId: tenantId,
      deletedAt: null,
      mergedIntoId: null,
      status: query.status,
      industry: query.industry
        ? { contains: query.industry, mode: 'insensitive' }
        : undefined,
      city: query.city
        ? { contains: query.city, mode: 'insensitive' }
        : undefined,
      assignedToId: query.assignedToId,
      types: query.typeId
        ? { some: { typeId: query.typeId, deletedAt: null } }
        : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { legalName: { contains: query.search, mode: 'insensitive' } },
            {
              registrationNumber: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            { taxNumber: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { website: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.crmCompany.findMany({
        where,
        include: companyInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.crmCompany.count({ where }),
    ]);
    return { data, meta: this.meta(query.page, query.limit, total) };
  }

  async getCompany(
    tenantId: string,
    id: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const item = await this.prisma.crmCompany.findFirst({
      where: { id, companyId: tenantId, deletedAt: null },
      include: {
        ...companyInclude,
        contacts: {
          where: { deletedAt: null, mergedIntoId: null },
          include: contactInclude,
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        },
        leads: {
          where: { deletedAt: null },
          select: {
            id: true,
            leadNumber: true,
            name: true,
            status: true,
            estimatedValue: true,
            currency: true,
          },
          orderBy: { createdAt: 'desc' },
        },
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
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!item) throw new NotFoundException('CRM company was not found.');
    return item;
  }

  async createCompany(
    tenantId: string,
    dto: CreateCrmCompanyDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    await this.validateCompanyTypes(tenantId, dto.typeIds ?? []);
    if (dto.assignedToId)
      await this.assertAssignable(tenantId, dto.assignedToId, 'company');
    const duplicates = await this.companyDuplicates(tenantId, dto);
    if (duplicates.length && !dto.overrideDuplicate)
      throw new ConflictException(
        'Possible duplicate company found. Please review the matching records.',
      );
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmCompany.create({
        data: {
          companyId: tenantId,
          ...this.companyData(dto),
          name: dto.name.trim(),
          assignedToId: dto.assignedToId,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: companyInclude,
      });
      await this.setCompanyTypes(
        tx,
        tenantId,
        item.id,
        dto.typeIds ?? [],
        principal.userId,
      );
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Company.Created',
        entity: 'CrmCompany',
        entityId: item.id,
        newValue: item,
      });
      return tx.crmCompany.findUniqueOrThrow({
        where: { id: item.id },
        include: companyInclude,
      });
    });
  }

  async updateCompany(
    tenantId: string,
    id: string,
    dto: UpdateCrmCompanyDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const previous = await this.baseCompany(tenantId, id);
    if (dto.typeIds) await this.validateCompanyTypes(tenantId, dto.typeIds);
    const duplicates = await this.companyDuplicates(tenantId, {
      ...dto,
      excludeId: id,
    });
    if (duplicates.length && !dto.overrideDuplicate)
      throw new ConflictException(
        'Possible duplicate company found. Please review the matching records.',
      );
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmCompany.update({
        where: { id },
        data: { ...this.companyData(dto), updatedBy: principal.userId },
        include: companyInclude,
      });
      if (dto.typeIds)
        await this.setCompanyTypes(
          tx,
          tenantId,
          id,
          dto.typeIds,
          principal.userId,
        );
      await this.audit.record(tx, {
        companyId: tenantId,
        action:
          previous.status !== item.status
            ? 'CRM.Company.StatusChanged'
            : 'CRM.Company.Updated',
        entity: 'CrmCompany',
        entityId: id,
        oldValue: previous,
        newValue: item,
      });
      return tx.crmCompany.findUniqueOrThrow({
        where: { id },
        include: companyInclude,
      });
    });
  }

  async deleteCompany(
    tenantId: string,
    id: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const previous = await this.baseCompany(tenantId, id);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmCompany.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Company.Deleted',
        entity: 'CrmCompany',
        entityId: id,
        oldValue: previous,
        newValue: item,
      });
      return item;
    });
  }

  async assignCompany(
    tenantId: string,
    id: string,
    dto: PartyAssignmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const previous = await this.baseCompany(tenantId, id);
    if (dto.assignedToId)
      await this.assertAssignable(tenantId, dto.assignedToId, 'company');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmCompany.update({
        where: { id },
        data: {
          assignedToId: dto.assignedToId ?? null,
          updatedBy: principal.userId,
        },
        include: companyInclude,
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Company.Assigned',
        entity: 'CrmCompany',
        entityId: id,
        oldValue: { assignedToId: previous.assignedToId },
        newValue: { assignedToId: dto.assignedToId ?? null },
      });
      return item;
    });
  }

  async listContacts(
    tenantId: string,
    query: CrmContactQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const where: Prisma.CrmContactWhereInput = {
      companyId: tenantId,
      deletedAt: null,
      mergedIntoId: null,
      crmCompanyId: query.crmCompanyId,
      status: query.status,
      assignedToId: query.assignedToId,
      department: query.department
        ? { contains: query.department, mode: 'insensitive' }
        : undefined,
      city: query.city
        ? { contains: query.city, mode: 'insensitive' }
        : undefined,
      types: query.typeId
        ? { some: { typeId: query.typeId, deletedAt: null } }
        : undefined,
      OR: query.search
        ? [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
            { mobile: { contains: query.search } },
            {
              crmCompany: {
                name: { contains: query.search, mode: 'insensitive' },
              },
            },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.crmContact.findMany({
        where,
        include: contactInclude,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.crmContact.count({ where }),
    ]);
    return { data, meta: this.meta(query.page, query.limit, total) };
  }

  async getContact(
    tenantId: string,
    id: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const item = await this.prisma.crmContact.findFirst({
      where: { id, companyId: tenantId, deletedAt: null },
      include: {
        ...contactInclude,
        leads: {
          where: { deletedAt: null },
          select: { id: true, leadNumber: true, name: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
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
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!item) throw new NotFoundException('CRM contact was not found.');
    return item;
  }

  async createContact(
    tenantId: string,
    dto: CreateCrmContactDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    await this.validateContactTypes(tenantId, dto.typeIds ?? []);
    if (dto.crmCompanyId) await this.baseCompany(tenantId, dto.crmCompanyId);
    if (dto.assignedToId)
      await this.assertAssignable(tenantId, dto.assignedToId, 'contact');
    const duplicates = await this.contactDuplicates(tenantId, dto);
    if (duplicates.length && !dto.overrideDuplicate)
      throw new ConflictException(
        'Possible duplicate contact found. Please review the matching records.',
      );
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmContact.create({
        data: {
          companyId: tenantId,
          ...this.contactData(dto),
          firstName: dto.firstName.trim(),
          crmCompanyId: dto.crmCompanyId,
          assignedToId: dto.assignedToId,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: contactInclude,
      });
      await this.setContactTypes(
        tx,
        tenantId,
        item.id,
        dto.typeIds ?? [],
        principal.userId,
      );
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Contact.Created',
        entity: 'CrmContact',
        entityId: item.id,
        newValue: item,
      });
      return tx.crmContact.findUniqueOrThrow({
        where: { id: item.id },
        include: contactInclude,
      });
    });
  }

  async updateContact(
    tenantId: string,
    id: string,
    dto: UpdateCrmContactDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const previous = await this.baseContact(tenantId, id);
    if (dto.typeIds) await this.validateContactTypes(tenantId, dto.typeIds);
    if (dto.crmCompanyId) await this.baseCompany(tenantId, dto.crmCompanyId);
    const duplicates = await this.contactDuplicates(tenantId, {
      ...dto,
      excludeId: id,
    });
    if (duplicates.length && !dto.overrideDuplicate)
      throw new ConflictException(
        'Possible duplicate contact found. Please review the matching records.',
      );
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmContact.update({
        where: { id },
        data: {
          ...this.contactData(dto),
          crmCompanyId: dto.crmCompanyId,
          updatedBy: principal.userId,
        },
        include: contactInclude,
      });
      if (dto.typeIds)
        await this.setContactTypes(
          tx,
          tenantId,
          id,
          dto.typeIds,
          principal.userId,
        );
      await this.audit.record(tx, {
        companyId: tenantId,
        action:
          previous.crmCompanyId !== item.crmCompanyId
            ? 'CRM.Contact.Linked'
            : 'CRM.Contact.Updated',
        entity: 'CrmContact',
        entityId: id,
        oldValue: previous,
        newValue: item,
      });
      return tx.crmContact.findUniqueOrThrow({
        where: { id },
        include: contactInclude,
      });
    });
  }

  async deleteContact(
    tenantId: string,
    id: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const previous = await this.baseContact(tenantId, id);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmContact.update({
        where: { id },
        data: { deletedAt: new Date(), updatedBy: principal.userId },
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Contact.Deleted',
        entity: 'CrmContact',
        entityId: id,
        oldValue: previous,
        newValue: item,
      });
      return item;
    });
  }

  async assignContact(
    tenantId: string,
    id: string,
    dto: PartyAssignmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const previous = await this.baseContact(tenantId, id);
    if (dto.assignedToId)
      await this.assertAssignable(tenantId, dto.assignedToId, 'contact');
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmContact.update({
        where: { id },
        data: {
          assignedToId: dto.assignedToId ?? null,
          updatedBy: principal.userId,
        },
        include: contactInclude,
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Contact.Assigned',
        entity: 'CrmContact',
        entityId: id,
        oldValue: { assignedToId: previous.assignedToId },
        newValue: { assignedToId: dto.assignedToId ?? null },
      });
      return item;
    });
  }

  async linkContact(
    tenantId: string,
    id: string,
    dto: ContactCompanyLinkDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const previous = await this.baseContact(tenantId, id);
    if (dto.crmCompanyId) await this.baseCompany(tenantId, dto.crmCompanyId);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmContact.update({
        where: { id },
        data: {
          crmCompanyId: dto.crmCompanyId ?? null,
          updatedBy: principal.userId,
        },
        include: contactInclude,
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: dto.crmCompanyId
          ? 'CRM.Contact.Linked'
          : 'CRM.Contact.Unlinked',
        entity: 'CrmContact',
        entityId: id,
        oldValue: { crmCompanyId: previous.crmCompanyId },
        newValue: { crmCompanyId: dto.crmCompanyId ?? null },
      });
      return item;
    });
  }

  async setPrimaryContact(
    tenantId: string,
    companyId: string,
    dto: PrimaryContactDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    await this.baseCompany(tenantId, companyId);
    const contact = await this.baseContact(tenantId, dto.crmContactId);
    if (contact.crmCompanyId !== companyId)
      throw new UnprocessableEntityException(
        'The selected contact must belong to this CRM company.',
      );
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.crmCompanyPrimaryContact.findFirst({
        where: { crmCompanyId: companyId, purpose: dto.purpose },
      });
      const item = existing
        ? await tx.crmCompanyPrimaryContact.update({
            where: { id: existing.id },
            data: {
              crmContactId: dto.crmContactId,
              label: dto.label,
              deletedAt: null,
              updatedBy: principal.userId,
            },
          })
        : await tx.crmCompanyPrimaryContact.create({
            data: {
              companyId: tenantId,
              crmCompanyId: companyId,
              crmContactId: dto.crmContactId,
              purpose: dto.purpose,
              label: dto.label,
              createdBy: principal.userId,
              updatedBy: principal.userId,
            },
          });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Company.PrimaryContactSet',
        entity: 'CrmCompany',
        entityId: companyId,
        oldValue: existing,
        newValue: item,
      });
      return item;
    });
  }

  async catalog(
    tenantId: string,
    includeInactive: boolean,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const where = {
      OR: [{ companyId: null }, { companyId: tenantId }],
      deletedAt: null,
      status: includeInactive ? undefined : EntityStatus.ACTIVE,
    };
    const [companyTypes, contactTypes] = await Promise.all([
      this.prisma.crmCompanyTypeDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.crmContactTypeDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);
    return { companyTypes, contactTypes };
  }

  async assignees(tenantId: string, principal: AuthenticatedPrincipal) {
    this.assertTenant(tenantId, principal);
    const codes = [
      PERMISSIONS.CRM_COMPANY_VIEW,
      PERMISSIONS.CRM_COMPANY_EDIT,
      PERMISSIONS.CRM_CONTACT_VIEW,
      PERMISSIONS.CRM_CONTACT_EDIT,
    ];
    return this.prisma.companyMembership.findMany({
      where: {
        companyId: tenantId,
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
                  permission: { code: { in: codes }, deletedAt: null },
                },
              },
            },
          },
        },
      },
      select: assigneeSelect,
      orderBy: { user: { firstName: 'asc' } },
    });
  }

  async globalSearch(
    tenantId: string,
    q: string,
    limit: number,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const [companies, contacts] = await Promise.all([
      this.prisma.crmCompany.findMany({
        where: {
          companyId: tenantId,
          deletedAt: null,
          mergedIntoId: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { legalName: { contains: q, mode: 'insensitive' } },
            { registrationNumber: { contains: q, mode: 'insensitive' } },
            { taxNumber: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
            { website: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
        },
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.crmContact.findMany({
        where: {
          companyId: tenantId,
          deletedAt: null,
          mergedIntoId: null,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { mobile: { contains: q } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          mobile: true,
          status: true,
          crmCompany: { select: { id: true, name: true } },
        },
        take: limit,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
    ]);
    return { companies, contacts };
  }

  companyDuplicateCheck(
    tenantId: string,
    query: CrmCompanyDuplicateQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    return this.companyDuplicates(tenantId, query);
  }
  contactDuplicateCheck(
    tenantId: string,
    query: CrmContactDuplicateQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    return this.contactDuplicates(tenantId, query);
  }

  async addCompanyNote(
    tenantId: string,
    id: string,
    dto: PartyNoteDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    await this.baseCompany(tenantId, id);
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.crmCompanyNote.create({
        data: {
          companyId: tenantId,
          crmCompanyId: id,
          note: dto.note.trim(),
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Company.NoteAdded',
        entity: 'CrmCompany',
        entityId: id,
        newValue: { noteId: note.id },
      });
      return note;
    });
  }
  async addContactNote(
    tenantId: string,
    id: string,
    dto: PartyNoteDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    await this.baseContact(tenantId, id);
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.crmContactNote.create({
        data: {
          companyId: tenantId,
          crmContactId: id,
          note: dto.note.trim(),
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Contact.NoteAdded',
        entity: 'CrmContact',
        entityId: id,
        newValue: { noteId: note.id },
      });
      return note;
    });
  }

  async addCompanyAttachment(
    tenantId: string,
    id: string,
    dto: PartyAttachmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    await this.baseCompany(tenantId, id);
    await this.assertFile(tenantId, dto.fileId);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmCompanyAttachment.create({
        data: {
          companyId: tenantId,
          crmCompanyId: id,
          fileId: dto.fileId,
          title: dto.title,
          description: dto.description,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: { file: true },
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Company.AttachmentAdded',
        entity: 'CrmCompany',
        entityId: id,
        newValue: { attachmentId: item.id, fileId: dto.fileId },
      });
      return item;
    });
  }
  async addContactAttachment(
    tenantId: string,
    id: string,
    dto: PartyAttachmentDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    await this.baseContact(tenantId, id);
    await this.assertFile(tenantId, dto.fileId);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.crmContactAttachment.create({
        data: {
          companyId: tenantId,
          crmContactId: id,
          fileId: dto.fileId,
          title: dto.title,
          description: dto.description,
          createdBy: principal.userId,
          updatedBy: principal.userId,
        },
        include: { file: true },
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Contact.AttachmentAdded',
        entity: 'CrmContact',
        entityId: id,
        newValue: { attachmentId: item.id, fileId: dto.fileId },
      });
      return item;
    });
  }

  async timeline(
    tenantId: string,
    entity: 'CrmCompany' | 'CrmContact',
    id: string,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    if (entity === 'CrmCompany') {
      await this.baseCompany(tenantId, id);
    } else {
      await this.baseContact(tenantId, id);
    }
    return this.prisma.auditLog.findMany({
      where: { companyId: tenantId, entity, entityId: id, deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async linkLead(
    tenantId: string,
    leadId: string,
    dto: LinkLeadPartiesDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertTenant(tenantId, principal);
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, companyId: tenantId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException('Lead was not found.');
    const company = dto.crmCompanyId
      ? await this.baseCompany(tenantId, dto.crmCompanyId)
      : null;
    const contact = dto.crmContactId
      ? await this.baseContact(tenantId, dto.crmContactId)
      : null;
    if (company && contact?.crmCompanyId && contact.crmCompanyId !== company.id)
      throw new UnprocessableEntityException(
        'The selected contact does not belong to the selected CRM company.',
      );
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.lead.update({
        where: { id: leadId },
        data: {
          crmCompanyId: company?.id ?? null,
          crmContactId: contact?.id ?? null,
          partyLinkStatus:
            company || contact
              ? LeadPartyLinkStatus.LINKED
              : LeadPartyLinkStatus.UNLINKED,
          updatedBy: principal.userId,
          lastActivityAt: new Date(),
        },
      });
      await this.audit.record(tx, {
        companyId: tenantId,
        action: 'CRM.Lead.PartiesLinked',
        entity: 'Lead',
        entityId: leadId,
        oldValue: {
          crmCompanyId: lead.crmCompanyId,
          crmContactId: lead.crmContactId,
        },
        newValue: {
          crmCompanyId: item.crmCompanyId,
          crmContactId: item.crmContactId,
        },
      });
      return item;
    });
  }

  private async companyDuplicates(
    tenantId: string,
    input: CrmCompanyDuplicateQueryDto,
  ) {
    const or: Prisma.CrmCompanyWhereInput[] = [];
    if (input.name)
      or.push({ name: { equals: input.name.trim(), mode: 'insensitive' } });
    if (input.legalName)
      or.push({
        legalName: { equals: input.legalName.trim(), mode: 'insensitive' },
      });
    if (input.registrationNumber)
      or.push({
        registrationNumber: {
          equals: input.registrationNumber.trim(),
          mode: 'insensitive',
        },
      });
    if (input.taxNumber)
      or.push({
        taxNumber: { equals: input.taxNumber.trim(), mode: 'insensitive' },
      });
    if (input.website)
      or.push({
        website: { equals: input.website.trim(), mode: 'insensitive' },
      });
    if (input.phone) or.push({ phone: this.phone(input.phone) });
    if (!or.length) return [];
    return this.prisma.crmCompany.findMany({
      where: {
        companyId: tenantId,
        id: input.excludeId ? { not: input.excludeId } : undefined,
        deletedAt: null,
        OR: or,
      },
      select: {
        id: true,
        name: true,
        legalName: true,
        registrationNumber: true,
        taxNumber: true,
        phone: true,
        website: true,
        status: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }
  private async contactDuplicates(
    tenantId: string,
    input: CrmContactDuplicateQueryDto,
  ) {
    const or: Prisma.CrmContactWhereInput[] = [];
    if (input.email)
      or.push({ email: { equals: input.email.trim(), mode: 'insensitive' } });
    if (input.phone)
      or.push({
        OR: [
          { phone: this.phone(input.phone) },
          { mobile: this.phone(input.phone) },
        ],
      });
    if (input.firstName && input.crmCompanyId)
      or.push({
        firstName: { equals: input.firstName.trim(), mode: 'insensitive' },
        lastName: input.lastName
          ? { equals: input.lastName.trim(), mode: 'insensitive' }
          : undefined,
        crmCompanyId: input.crmCompanyId,
      });
    if (!or.length) return [];
    return this.prisma.crmContact.findMany({
      where: {
        companyId: tenantId,
        id: input.excludeId ? { not: input.excludeId } : undefined,
        deletedAt: null,
        OR: or,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        mobile: true,
        status: true,
        crmCompany: { select: { id: true, name: true } },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }

  private companyData(dto: UpdateCrmCompanyDto) {
    return {
      name: dto.name?.trim(),
      legalName: dto.legalName?.trim(),
      registrationNumber: dto.registrationNumber?.trim(),
      taxNumber: dto.taxNumber?.trim(),
      industry: dto.industry?.trim(),
      website: dto.website?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone ? this.phone(dto.phone) : dto.phone,
      alternatePhone: dto.alternatePhone
        ? this.phone(dto.alternatePhone)
        : dto.alternatePhone,
      address: dto.address?.trim(),
      city: dto.city?.trim(),
      country: dto.country,
      postalCode: dto.postalCode?.trim(),
      description: dto.description?.trim(),
      status: dto.status,
    };
  }
  private contactData(dto: UpdateCrmContactDto) {
    return {
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      jobTitle: dto.jobTitle?.trim(),
      department: dto.department?.trim(),
      email: dto.email?.trim().toLowerCase(),
      alternateEmail: dto.alternateEmail?.trim().toLowerCase(),
      phone: dto.phone ? this.phone(dto.phone) : dto.phone,
      mobile: dto.mobile ? this.phone(dto.mobile) : dto.mobile,
      whatsapp: dto.whatsapp ? this.phone(dto.whatsapp) : dto.whatsapp,
      website: dto.website?.trim(),
      address: dto.address?.trim(),
      city: dto.city?.trim(),
      country: dto.country,
      linkedin: dto.linkedin?.trim(),
      notesText: dto.notesText?.trim(),
      status: dto.status,
    };
  }

  private async setCompanyTypes(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    typeIds: string[],
    actor: string,
  ) {
    await tx.crmCompanyTypeAssignment.updateMany({
      where: { crmCompanyId: id, typeId: { notIn: typeIds }, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: actor },
    });
    for (const typeId of typeIds) {
      const existing = await tx.crmCompanyTypeAssignment.findUnique({
        where: { crmCompanyId_typeId: { crmCompanyId: id, typeId } },
      });
      if (existing)
        await tx.crmCompanyTypeAssignment.update({
          where: { id: existing.id },
          data: { deletedAt: null, updatedBy: actor },
        });
      else
        await tx.crmCompanyTypeAssignment.create({
          data: {
            companyId: tenantId,
            crmCompanyId: id,
            typeId,
            createdBy: actor,
            updatedBy: actor,
          },
        });
    }
  }
  private async setContactTypes(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
    typeIds: string[],
    actor: string,
  ) {
    await tx.crmContactTypeAssignment.updateMany({
      where: { crmContactId: id, typeId: { notIn: typeIds }, deletedAt: null },
      data: { deletedAt: new Date(), updatedBy: actor },
    });
    for (const typeId of typeIds) {
      const existing = await tx.crmContactTypeAssignment.findUnique({
        where: { crmContactId_typeId: { crmContactId: id, typeId } },
      });
      if (existing)
        await tx.crmContactTypeAssignment.update({
          where: { id: existing.id },
          data: { deletedAt: null, updatedBy: actor },
        });
      else
        await tx.crmContactTypeAssignment.create({
          data: {
            companyId: tenantId,
            crmContactId: id,
            typeId,
            createdBy: actor,
            updatedBy: actor,
          },
        });
    }
  }
  private async validateCompanyTypes(tenantId: string, ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.crmCompanyTypeDefinition.count({
      where: {
        id: { in: ids },
        OR: [{ companyId: null }, { companyId: tenantId }],
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (count !== ids.length)
      throw new UnprocessableEntityException(
        'One or more company types are invalid.',
      );
  }
  private async validateContactTypes(tenantId: string, ids: string[]) {
    if (!ids.length) return;
    const count = await this.prisma.crmContactTypeDefinition.count({
      where: {
        id: { in: ids },
        OR: [{ companyId: null }, { companyId: tenantId }],
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (count !== ids.length)
      throw new UnprocessableEntityException(
        'One or more contact types are invalid.',
      );
  }
  private async assertAssignable(
    tenantId: string,
    membershipId: string,
    kind: 'company' | 'contact',
  ) {
    const codes =
      kind === 'company'
        ? [PERMISSIONS.CRM_COMPANY_VIEW, PERMISSIONS.CRM_COMPANY_EDIT]
        : [PERMISSIONS.CRM_CONTACT_VIEW, PERMISSIONS.CRM_CONTACT_EDIT];
    const member = await this.prisma.companyMembership.findFirst({
      where: {
        id: membershipId,
        companyId: tenantId,
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
                  permission: { code: { in: codes }, deletedAt: null },
                },
              },
            },
          },
        },
      },
    });
    if (!member)
      throw new ForbiddenException(
        `You don't have permission to assign this CRM ${kind}.`,
      );
  }
  private async assertFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileObject.findFirst({
      where: {
        id: fileId,
        companyId: tenantId,
        status: FileStatus.AVAILABLE,
        deletedAt: null,
      },
    });
    if (!file)
      throw new UnprocessableEntityException(
        'The selected file is not available for this company.',
      );
  }
  private async baseCompany(tenantId: string, id: string) {
    const item = await this.prisma.crmCompany.findFirst({
      where: { id, companyId: tenantId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('CRM company was not found.');
    return item;
  }
  private async baseContact(tenantId: string, id: string) {
    const item = await this.prisma.crmContact.findFirst({
      where: { id, companyId: tenantId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('CRM contact was not found.');
    return item;
  }
  private meta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }
  private phone(value: string) {
    return value.trim().replace(/[\s()-]/g, '');
  }
  private assertTenant(id: string, principal: AuthenticatedPrincipal) {
    if (!principal.isPlatformAdmin && principal.companyId !== id)
      throw new ForbiddenException("You don't have access to this section.");
  }
}
