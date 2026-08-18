/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PartyService } from './party.service';

describe('PartyService', () => {
  const principal = {
    userId: 'user-1',
    email: 'crm@example.com',
    companyId: 'tenant-a',
    membershipId: 'member-1',
    isPlatformAdmin: false,
  };
  const prisma = {
    crmCompany: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    crmContact: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    crmCompanyTypeDefinition: { count: jest.fn(), findMany: jest.fn() },
    crmContactTypeDefinition: { count: jest.fn(), findMany: jest.fn() },
    companyMembership: { findFirst: jest.fn(), findMany: jest.fn() },
    lead: { findFirst: jest.fn() },
    auditLog: { findMany: jest.fn() },
    fileObject: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: PartyService;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      Array.isArray(value) ? Promise.all(value) : value,
    );
    service = new PartyService(prisma as never, audit as never);
  });

  it('scopes company lists to the authenticated tenant', async () => {
    prisma.crmCompany.findMany.mockResolvedValue([]);
    prisma.crmCompany.count.mockResolvedValue(0);
    await service.listCompanies(
      'tenant-a',
      { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' } as never,
      principal,
    );
    expect(prisma.crmCompany.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'tenant-a',
          deletedAt: null,
        }),
      }),
    );
  });

  it('rejects cross-tenant contact access before querying', async () => {
    await expect(
      service.listContacts(
        'tenant-b',
        { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' } as never,
        principal,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.crmContact.findMany).not.toHaveBeenCalled();
  });

  it('requires explicit review before creating a possible duplicate company', async () => {
    prisma.crmCompany.findMany.mockResolvedValue([{ id: 'duplicate' }]);
    await expect(
      service.createCompany('tenant-a', { name: 'ABC Engineering' }, principal),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not link a primary purpose to a contact from another CRM company', async () => {
    prisma.crmCompany.findFirst.mockResolvedValue({ id: 'party-a' });
    prisma.crmContact.findFirst.mockResolvedValue({
      id: 'contact-1',
      crmCompanyId: 'party-b',
    });
    await expect(
      service.setPrimaryContact(
        'tenant-a',
        'party-a',
        { crmContactId: 'contact-1', purpose: 'BUSINESS' } as never,
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects mismatched company/contact links on a lead', async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
    prisma.crmCompany.findFirst.mockResolvedValue({ id: 'party-a' });
    prisma.crmContact.findFirst.mockResolvedValue({
      id: 'contact-1',
      crmCompanyId: 'party-b',
    });
    await expect(
      service.linkLead(
        'tenant-a',
        'lead-1',
        { crmCompanyId: 'party-a', crmContactId: 'contact-1' },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
