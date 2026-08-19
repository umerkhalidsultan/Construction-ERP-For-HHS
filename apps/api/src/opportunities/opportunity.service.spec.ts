/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { OpportunityService } from './opportunity.service';

const OpportunityStatus = {
  OPEN: 'OPEN',
  WON: 'WON',
  LOST: 'LOST',
} as const;

describe('OpportunityService', () => {
  const principal = {
    userId: 'user-1',
    email: 'sales@example.com',
    companyId: 'company-a',
    membershipId: 'member-1',
    isPlatformAdmin: false,
  };
  const prisma = {
    opportunity: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    opportunityStageDefinition: { findFirst: jest.fn(), findMany: jest.fn() },
    opportunityTypeDefinition: { findFirst: jest.fn(), findMany: jest.fn() },
    opportunitySourceDefinition: { findFirst: jest.fn(), findMany: jest.fn() },
    opportunityLostReasonDefinition: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    opportunityStageHistory: { findMany: jest.fn(), create: jest.fn() },
    opportunityActivity: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    opportunityNote: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    opportunityAttachment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lead: { findFirst: jest.fn(), update: jest.fn() },
    crmCompany: { findFirst: jest.fn() },
    crmContact: { findFirst: jest.fn() },
    company: { findFirst: jest.fn(), findUnique: jest.fn() },
    companyMembership: { findFirst: jest.fn(), findMany: jest.fn() },
    fileObject: { findFirst: jest.fn() },
    auditLog: { findMany: jest.fn() },
    documentSequence: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: OpportunityService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      Array.isArray(value) ? Promise.all(value) : value,
    );
    service = new OpportunityService(prisma as never, audit as never);
  });

  it('always scopes list queries to the authenticated company', async () => {
    prisma.opportunity.findMany.mockResolvedValue([]);
    prisma.opportunity.count.mockResolvedValue(0);
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
    expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
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
    expect(prisma.opportunity.findMany).not.toHaveBeenCalled();
  });

  it('computes exact weighted value from estimated value and probability', async () => {
    prisma.opportunity.findMany.mockResolvedValue([
      {
        id: 'opp-1',
        estimatedContractValue: new Prisma.Decimal('1234.56'),
        probability: 30,
      },
    ]);
    prisma.opportunity.count.mockResolvedValue(1);
    const result = await service.list(
      'company-a',
      { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' } as never,
      principal,
    );
    expect(result.data[0].weightedValue.toString()).toBe('370.37');
  });

  it('refuses to reach the Won stage through the kanban stage endpoint', async () => {
    const tx = {
      opportunity: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'opp-1',
          companyId: 'company-a',
          stageId: 'stage-negotiation',
          status: OpportunityStatus.OPEN,
          estimatedContractValue: null,
          probability: 75,
        }),
        update: jest.fn(),
      },
      opportunityStageDefinition: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stage-won',
          code: 'WON',
          isWon: true,
          isLost: false,
          probability: 100,
        }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: unknown) => unknown) => Promise.resolve(callback(tx)),
    );
    await expect(
      service.changeStage(
        'company-a',
        'opp-1',
        { stageId: 'stage-won', reason: 'Dragged in kanban' },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.opportunity.update).not.toHaveBeenCalled();
  });

  it('blocks stage changes on closed opportunities', async () => {
    const tx = {
      opportunity: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'opp-1',
          companyId: 'company-a',
          stageId: 'stage-won',
          status: OpportunityStatus.WON,
        }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: unknown) => unknown) => Promise.resolve(callback(tx)),
    );
    await expect(
      service.changeStage(
        'company-a',
        'opp-1',
        { stageId: 'stage-qualification' },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('allows only open opportunities to be marked as won', async () => {
    const tx = {
      opportunity: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'opp-1',
          companyId: 'company-a',
          status: OpportunityStatus.LOST,
        }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: unknown) => unknown) => Promise.resolve(callback(tx)),
    );
    await expect(
      service.markWon(
        'company-a',
        'opp-1',
        { wonDate: '2026-08-19', finalContractValue: 5000 },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('validates the lost reason before marking lost', async () => {
    prisma.opportunityLostReasonDefinition.findFirst.mockResolvedValue(null);
    await expect(
      service.markLost(
        'company-a',
        'opp-1',
        { lostReasonId: 'reason-unknown', lostDate: '2026-08-19' },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows only won or lost opportunities to be reopened', async () => {
    const tx = {
      opportunity: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'opp-1',
          companyId: 'company-a',
          status: OpportunityStatus.OPEN,
        }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: unknown) => unknown) => Promise.resolve(callback(tx)),
    );
    await expect(
      service.reopen(
        'company-a',
        'opp-1',
        { reason: 'Client came back' },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('only converts qualified leads', async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      status: LeadStatus.NEW,
    });
    await expect(
      service.convertLead(
        'company-a',
        {
          leadId: 'lead-1',
          opportunityTypeId: 'type-1',
          sourceId: 'source-1',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects converting a lead that already has an opportunity', async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      status: LeadStatus.QUALIFIED,
    });
    prisma.opportunity.findFirst.mockResolvedValue({
      id: 'opp-existing',
      opportunityNumber: 'OPP-2026-000042',
    });
    await expect(
      service.convertLead(
        'company-a',
        {
          leadId: 'lead-1',
          opportunityTypeId: 'type-1',
          sourceId: 'source-1',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allocates a concurrency-safe OPP number and defaults probability from the stage', async () => {
    prisma.company.findFirst.mockResolvedValue({ currency: 'USD' });
    prisma.opportunityTypeDefinition.findFirst.mockResolvedValue({
      id: 'type-1',
    });
    prisma.opportunitySourceDefinition.findFirst.mockResolvedValue({
      id: 'source-1',
    });
    const createdOpportunity = {
      id: 'opp-new',
      companyId: 'company-a',
      opportunityNumber: 'OPP-2026-000001',
      name: 'Villa project',
      estimatedContractValue: new Prisma.Decimal('10000'),
      probability: 10,
    };
    const tx = {
      documentSequence: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'seq-1',
          currentPeriod: '2026',
          nextNumber: 1n,
          padding: 6,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
      opportunityStageDefinition: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stage-qualification',
          code: 'QUALIFICATION',
          probability: 10,
          isWon: false,
          isLost: false,
        }),
      },
      opportunity: {
        create: jest.fn().mockResolvedValue(createdOpportunity),
      },
      opportunityStageHistory: { create: jest.fn() },
      $queryRaw: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: unknown) => unknown) => Promise.resolve(callback(tx)),
    );
    const result = await service.create(
      'company-a',
      {
        name: 'Villa project',
        opportunityTypeId: 'type-1',
        sourceId: 'source-1',
        estimatedContractValue: 10000,
      },
      principal,
    );
    expect(tx.opportunity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          opportunityNumber: 'OPP-2026-000001',
          probability: 10,
          status: OpportunityStatus.OPEN,
        }),
      }),
    );
    expect(tx.opportunityStageHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          toStageId: 'stage-qualification',
        }),
      }),
    );
    expect(result.weightedValue.toString()).toBe('1000.00');
  });

  it('sums pipeline totals with exact decimal arithmetic', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        stageId: 'stage-qualification',
        count: 2,
        total: '1000.00',
        weighted: '310.50',
      },
    ]);
    prisma.opportunityStageDefinition.findMany.mockResolvedValue([
      {
        id: 'stage-qualification',
        code: 'QUALIFICATION',
        name: 'Qualification',
        probability: 10,
        sortOrder: 10,
        isWon: false,
        isLost: false,
      },
    ]);
    const result = await service.pipeline('company-a', principal);
    expect(result.totals.count).toBe(2);
    expect(result.totals.totalValue.toString()).toBe('1000');
    expect(result.totals.weightedValue.toString()).toBe('310.5');
    expect(prisma.$queryRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.arrayContaining(['company-a', OpportunityStatus.OPEN]),
      }),
    );
  });
});
