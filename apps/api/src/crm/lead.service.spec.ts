/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { LeadService } from './lead.service';

describe('LeadService', () => {
  const principal = {
    userId: 'user-1',
    email: 'sales@example.com',
    companyId: 'company-a',
    membershipId: 'member-1',
    isPlatformAdmin: false,
  };
  const prisma = {
    lead: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    leadTypeDefinition: { findFirst: jest.fn(), findMany: jest.fn() },
    leadSourceDefinition: { findFirst: jest.fn(), findMany: jest.fn() },
    company: { findFirst: jest.fn(), findUnique: jest.fn() },
    companyMembership: { findFirst: jest.fn(), findMany: jest.fn() },
    auditLog: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: LeadService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      Array.isArray(value) ? Promise.all(value) : value,
    );
    service = new LeadService(prisma as never, audit as never);
  });

  it('always scopes list queries to the authenticated company', async () => {
    prisma.lead.findMany.mockResolvedValue([]);
    prisma.lead.count.mockResolvedValue(0);
    await service.list(
      'company-a',
      {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: 'tower',
      } as never,
      principal,
    );
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-a',
          deletedAt: null,
        }),
      }),
    );
  });

  it('rejects cross-company access before querying data', async () => {
    await expect(
      service.list(
        'company-b',
        { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' } as never,
        principal,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.lead.findMany).not.toHaveBeenCalled();
  });

  it('requires explicit duplicate override when a possible match exists', async () => {
    prisma.lead.findMany.mockResolvedValue([{ id: 'lead-existing' }]);
    prisma.leadTypeDefinition.findFirst.mockResolvedValue({ id: 'type-1' });
    prisma.leadSourceDefinition.findFirst.mockResolvedValue({ id: 'source-1' });
    await expect(
      service.create(
        'company-a',
        {
          name: 'Tower',
          leadTypeId: 'type-1',
          leadSourceId: 'source-1',
          email: 'same@example.com',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks invalid controlled status transitions', async () => {
    const tx = {
      lead: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'lead-1', status: LeadStatus.NEW }),
        update: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: unknown) => unknown) => Promise.resolve(callback(tx)),
    );
    await expect(
      service.changeStatus(
        'company-a',
        'lead-1',
        { status: LeadStatus.CONVERTED },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.lead.update).not.toHaveBeenCalled();
  });

  it('calculates pipeline value only from active lead statuses', async () => {
    prisma.lead.count.mockResolvedValue(3);
    prisma.lead.groupBy.mockResolvedValue([
      { status: LeadStatus.NEW, _count: { _all: 2 } },
    ]);
    prisma.lead.aggregate.mockResolvedValue({
      _sum: { estimatedValue: new Prisma.Decimal(5000) },
    });
    const result = await service.dashboard('company-a', principal);
    expect(prisma.lead.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              LeadStatus.NEW,
              LeadStatus.CONTACTED,
              LeadStatus.QUALIFIED,
              LeadStatus.ON_HOLD,
            ],
          },
        }),
      }),
    );
    expect(result.expectedPipelineValue.toString()).toBe('5000');
  });
});
