/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  TenderBidDecisionType,
  TenderRequirementStatus,
  TenderStatus,
  TenderSubmissionMethod,
} from '@prisma/client';
import { TenderService } from './tender.service';

describe('TenderService', () => {
  const principal = {
    userId: 'user-a',
    email: 'a@example.com',
    companyId: 'company-a',
    membershipId: 'member-a',
    isPlatformAdmin: false,
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const numbering = {
    allocate: jest.fn().mockResolvedValue({
      value: 'TND-2026-000001',
      sequenceId: 'sequence-a',
      numericValue: '1',
    }),
  };
  let prisma: any;
  let service: TenderService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      $transaction: jest.fn((value: any) =>
        Promise.resolve(
          typeof value === 'function' ? value(prisma) : Promise.all(value),
        ),
      ),
      tender: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      opportunity: { findFirst: jest.fn() },
      crmCompany: { findFirst: jest.fn() },
      crmContact: { findFirst: jest.fn() },
      companyMembership: { findFirst: jest.fn() },
      team: { findFirst: jest.fn() },
      fileObject: { findFirst: jest.fn() },
      tenderBidDecision: { create: jest.fn() },
      tenderRequirement: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenderSubmission: { create: jest.fn() },
      tenderTeamMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenderAttachment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenderSiteVisit: { create: jest.fn() },
      tenderPreBidMeeting: { create: jest.fn() },
    };
    service = new TenderService(prisma, audit as never, numbering as never);
  });

  it('creates a direct Tender with a number from DocumentNumberingService', async () => {
    prisma.crmCompany.findFirst.mockResolvedValue({ id: 'client-a' });
    prisma.tender.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'tender-a', status: TenderStatus.DRAFT, ...data }),
    );
    const dto = {
      title: 'Hospital Extension',
      clientCompanyId: 'client-a',
      tenderType: 'OPEN',
      closingDate: '2026-10-01T10:00:00.000Z',
      currency: 'usd',
    };
    const result = await service.create('company-a', dto, principal);
    expect(numbering.allocate).toHaveBeenCalledWith(
      'company-a',
      { documentType: 'TENDER' },
      principal,
    );
    expect(result).toMatchObject({
      tenderNumber: 'TND-2026-000001',
      currency: 'USD',
    });
    expect(audit.record).toHaveBeenCalled();
  });

  it('rejects a different active company before querying', async () => {
    await expect(
      service.list(
        'company-b',
        { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' },
        principal,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.tender.findMany).not.toHaveBeenCalled();
  });

  it('returns an authorized Opportunity prefill without creating a Tender', async () => {
    prisma.opportunity.findFirst.mockResolvedValue({
      id: 'opp-a',
      name: 'Airport Works',
      crmCompanyId: 'client-a',
      crmContactId: 'contact-a',
      crmCompany: {},
      crmContact: {},
      opportunityType: { name: 'PUBLIC' },
      projectLocation: 'Karachi',
      city: 'Karachi',
      estimatedContractValue: '1000.00',
      currency: 'PKR',
      assignedToId: 'member-a',
      description: 'Scope',
    });
    const result = await service.prefill('company-a', 'opp-a', principal);
    expect(result).toMatchObject({
      opportunityId: 'opp-a',
      title: 'Airport Works',
      estimatedValue: '1000.00',
    });
    expect(prisma.tender.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid cross-company Opportunity on create', async () => {
    prisma.crmCompany.findFirst.mockResolvedValue({ id: 'client-a' });
    prisma.opportunity.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        'company-a',
        {
          title: 'T',
          clientCompanyId: 'client-a',
          opportunityId: 'foreign',
          tenderType: 'OPEN',
          closingDate: '2026-10-01',
          currency: 'PKR',
        },
        principal,
      ),
    ).rejects.toThrow('Opportunity is not available');
  });

  it.each([
    [TenderBidDecisionType.BID, undefined, TenderStatus.BID_APPROVED],
    [TenderBidDecisionType.NO_BID, 'Commercial risk', TenderStatus.NO_BID],
  ])(
    'records %s independently from assessment score',
    async (decision, reason, expectedStatus) => {
      prisma.tender.findFirst.mockResolvedValue({
        id: 'tender-a',
        status: TenderStatus.BID_DECISION_PENDING,
      });
      prisma.tenderBidDecision.create.mockResolvedValue({
        id: 'decision-a',
        decision,
      });
      prisma.tender.update.mockResolvedValue({
        id: 'tender-a',
        status: expectedStatus,
      });
      await service.bidDecision(
        'company-a',
        'tender-a',
        { decision, reason, assessment: { risk: 3, strategicFit: 9 } },
        principal,
      );
      expect(prisma.tender.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expectedStatus }),
        }),
      );
    },
  );

  it('rejects invalid status transitions', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.DRAFT,
    });
    await expect(
      service.changeStatus(
        'company-a',
        'tender-a',
        { status: TenderStatus.SUBMITTED },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('assigns only an active company membership', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.PREPARING,
    });
    prisma.companyMembership.findFirst.mockResolvedValue({ id: 'member-b' });
    prisma.tenderTeamMember.create.mockResolvedValue({ id: 'assignment-a' });
    await service.assignTeam(
      'company-a',
      'tender-a',
      { membershipId: 'member-b', role: 'Estimator' },
      principal,
    );
    expect(prisma.companyMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-a' }),
      }),
    );
  });

  it('blocks submission while a mandatory requirement is incomplete', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.READY_FOR_SUBMISSION,
      bidDecision: { decision: TenderBidDecisionType.BID },
    });
    prisma.tenderRequirement.count.mockResolvedValue(1);
    await expect(
      service.submit(
        'company-a',
        'tender-a',
        {
          submittedAt: '2026-10-01',
          method: TenderSubmissionMethod.ONLINE_PORTAL,
        },
        principal,
      ),
    ).rejects.toThrow('Mandatory Tender requirements are incomplete');
  });

  it('submits atomically after readiness validation', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.READY_FOR_SUBMISSION,
      bidDecision: { decision: TenderBidDecisionType.BID },
    });
    prisma.tenderRequirement.count.mockResolvedValue(0);
    prisma.tenderSubmission.create.mockResolvedValue({ id: 'submission-a' });
    prisma.tender.update.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.SUBMITTED,
    });
    const result = await service.submit(
      'company-a',
      'tender-a',
      { submittedAt: '2026-10-01', method: TenderSubmissionMethod.EMAIL },
      principal,
    );
    expect(result).toEqual({ id: 'submission-a' });
    expect(prisma.tender.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: TenderStatus.SUBMITTED }),
      }),
    );
  });

  it('authorizes FileObject attachments by company', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.PREPARING,
    });
    prisma.fileObject.findFirst.mockResolvedValue(null);
    await expect(
      service.attach(
        'company-a',
        'tender-a',
        { fileId: 'foreign-file' },
        principal,
      ),
    ).rejects.toThrow('file is not available in this company');
  });

  it('returns attached FileObject metadata through the Tender document query', async () => {
    prisma.tender.findFirst.mockResolvedValue({ id: 'tender-a' });
    prisma.tenderAttachment.findMany.mockResolvedValue([]);
    await service.attachments('company-a', 'tender-a', principal);
    expect(prisma.tenderAttachment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { fileObject: true } }),
    );
  });

  it('only accepts satisfied statuses in the submission query', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.READY_FOR_SUBMISSION,
      bidDecision: { decision: TenderBidDecisionType.BID },
    });
    prisma.tenderRequirement.count.mockResolvedValue(0);
    await service.validateTenderReadyForSubmission('company-a', 'tender-a', {
      submittedAt: '2026-10-01',
      method: TenderSubmissionMethod.PHYSICAL,
    });
    expect(prisma.tenderRequirement.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: {
          notIn: [
            TenderRequirementStatus.VERIFIED,
            TenderRequirementStatus.NOT_APPLICABLE,
          ],
        },
      }),
    });
  });

  it('applies pagination, filters, safe search and sorting in the database', async () => {
    prisma.tender.findMany.mockResolvedValue([]);
    prisma.tender.count.mockResolvedValue(0);
    await service.list(
      'company-a',
      {
        page: 2,
        limit: 10,
        search: 'hospital',
        status: TenderStatus.DRAFT,
        sortBy: 'closingDate',
        sortOrder: 'asc',
      },
      principal,
    );
    expect(prisma.tender.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { closingDate: 'asc' },
        where: expect.objectContaining({
          companyId: 'company-a',
          status: TenderStatus.DRAFT,
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('creates and verifies a requirement with audit history', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.PREPARING,
    });
    prisma.tenderRequirement.create.mockResolvedValue({
      id: 'requirement-a',
      status: TenderRequirementStatus.NOT_STARTED,
    });
    prisma.tenderRequirement.findFirst.mockResolvedValue({
      id: 'requirement-a',
      status: TenderRequirementStatus.READY,
    });
    prisma.tenderRequirement.update.mockResolvedValue({
      id: 'requirement-a',
      status: TenderRequirementStatus.VERIFIED,
    });
    await service.createRequirement(
      'company-a',
      'tender-a',
      { name: 'Bid bond', mandatory: true },
      principal,
    );
    await service.requirementStatus(
      'company-a',
      'tender-a',
      'requirement-a',
      { status: TenderRequirementStatus.VERIFIED },
      principal,
    );
    expect(prisma.tenderRequirement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verifiedBy: 'member-a' }),
      }),
    );
  });

  it('marks an eligible submitted Tender as awarded using Decimal value', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.SUBMITTED,
      description: null,
    });
    prisma.tender.update.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.AWARDED,
    });
    await service.award(
      'company-a',
      'tender-a',
      {
        awardDate: '2026-11-01',
        awardValue: 125000.5,
        awardReference: 'LOA-1',
      },
      principal,
    );
    expect(prisma.tender.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TenderStatus.AWARDED,
          awardedValue: expect.anything(),
        }),
      }),
    );
  });

  it('marks an eligible evaluation Tender lost after competitor tenant validation', async () => {
    prisma.tender.findFirst.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.COMMERCIAL_EVALUATION,
      description: null,
    });
    prisma.crmCompany.findFirst.mockResolvedValue({ id: 'competitor-a' });
    prisma.tender.update.mockResolvedValue({
      id: 'tender-a',
      status: TenderStatus.LOST,
    });
    await service.lose(
      'company-a',
      'tender-a',
      {
        lostDate: '2026-11-01',
        lostReason: 'Price',
        competitorCompanyId: 'competitor-a',
      },
      principal,
    );
    expect(prisma.tender.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: TenderStatus.LOST }),
      }),
    );
  });
});
