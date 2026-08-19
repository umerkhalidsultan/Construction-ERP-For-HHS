/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  const principal = {
    userId: 'user-1',
    email: 'sales@example.com',
    companyId: 'company-a',
    membershipId: 'member-1',
    isPlatformAdmin: false,
  };
  const prisma = {
    crmActivity: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    crmActivityAttachment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lead: { findFirst: jest.fn() },
    crmCompany: { findFirst: jest.fn() },
    crmContact: { findFirst: jest.fn() },
    opportunity: { findFirst: jest.fn() },
    companyMembership: { findFirst: jest.fn(), findMany: jest.fn() },
    fileObject: { findFirst: jest.fn() },
    auditLog: { findMany: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: ActivityService;

  const activeMembership = { id: 'member-2', companyId: 'company-a' };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((value: unknown) =>
      typeof value === 'function'
        ? Promise.resolve((value as (client: unknown) => unknown)(prisma))
        : Promise.all(value as unknown[]),
    );
    prisma.companyMembership.findFirst.mockResolvedValue(activeMembership);
    service = new ActivityService(prisma as never, audit as never);
  });

  it('rejects access to a different company', async () => {
    await expect(
      service.list('company-a', {} as never, {
        ...principal,
        companyId: 'company-b',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('always scopes list queries to the authenticated company', async () => {
    prisma.crmActivity.findMany.mockResolvedValue([]);
    prisma.crmActivity.count.mockResolvedValue(0);
    await service.list(
      'company-a',
      { page: 1, limit: 20, sortBy: 'dueDate', sortOrder: 'asc' } as never,
      principal,
    );
    expect(prisma.crmActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-a',
          deletedAt: null,
        }),
      }),
    );
  });

  it('rejects creating an activity without a valid related record', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(
      service.create(
        'company-a',
        {
          relatedType: 'LEAD',
          leadId: 'lead-missing',
          type: 'CALL',
          subject: 'Discuss scope',
          assignedToId: 'member-2',
        } as never,
        principal,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rejects a related record belonging to another company', async () => {
    prisma.lead.findFirst.mockResolvedValue(null); // findFirst is already scoped by companyId
    await expect(
      service.create(
        'company-a',
        {
          relatedType: 'LEAD',
          leadId: 'lead-from-other-company',
          type: 'CALL',
          subject: 'Discuss scope',
          assignedToId: 'member-2',
        } as never,
        principal,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'company-a' }),
      }),
    );
  });

  it('rejects assigning to a membership without CRM.Activity permissions', async () => {
    prisma.companyMembership.findFirst.mockResolvedValue(null);
    prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
    await expect(
      service.create(
        'company-a',
        {
          relatedType: 'LEAD',
          leadId: 'lead-1',
          type: 'CALL',
          subject: 'Discuss scope',
          assignedToId: 'member-unauthorized',
        } as never,
        principal,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an end time earlier than the start time', async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
    await expect(
      service.create(
        'company-a',
        {
          relatedType: 'LEAD',
          leadId: 'lead-1',
          type: 'MEETING',
          subject: 'Site coordination',
          assignedToId: 'member-2',
          startAt: '2026-08-20T10:00:00.000Z',
          endAt: '2026-08-20T09:00:00.000Z',
        } as never,
        principal,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('creates an activity scoped to the company and audits it', async () => {
    prisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
    prisma.crmActivity.create.mockResolvedValue({
      id: 'activity-1',
      status: 'PLANNED',
      dueDate: null,
    });
    const result = await service.create(
      'company-a',
      {
        relatedType: 'LEAD',
        leadId: 'lead-1',
        type: 'CALL',
        subject: 'Discuss scope',
        assignedToId: 'member-2',
      } as never,
      principal,
    );
    expect(prisma.crmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-a',
          leadId: 'lead-1',
          crmCompanyId: null,
          crmContactId: null,
          opportunityId: null,
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'CRM.Activity.Created' }),
    );
    expect(result.isOverdue).toBe(false);
  });

  it('will not complete an already-cancelled activity', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'CANCELLED',
    });
    await expect(
      service.complete('company-a', 'activity-1', {}, principal),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('will not complete an already-completed activity', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'COMPLETED',
    });
    await expect(
      service.complete('company-a', 'activity-1', {}, principal),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('auto-creates a follow-up activity when completing with a next follow-up date', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'PLANNED',
      relatedType: 'LEAD',
      leadId: 'lead-1',
      crmCompanyId: null,
      crmContactId: null,
      opportunityId: null,
      subject: 'Discuss scope',
      assignedToId: 'member-2',
      priority: 'MEDIUM',
      outcome: null,
      nextAction: null,
      nextFollowUpDate: null,
    });
    prisma.crmActivity.update.mockResolvedValue({
      id: 'activity-1',
      status: 'COMPLETED',
      dueDate: null,
      outcome: 'Client approved site visit.',
    });
    prisma.crmActivity.create.mockResolvedValue({
      id: 'activity-2',
      type: 'FOLLOW_UP',
      status: 'PLANNED',
      dueDate: new Date('2026-08-28T00:00:00.000Z'),
    });
    const result = await service.complete(
      'company-a',
      'activity-1',
      {
        outcome: 'Client approved site visit.',
        nextAction: 'Schedule site visit.',
        nextFollowUpDate: '2026-08-28',
      },
      principal,
    );
    expect(prisma.crmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'FOLLOW_UP',
          leadId: 'lead-1',
          assignedToId: 'member-2',
        }),
      }),
    );
    expect(result.followUp?.id).toBe('activity-2');
  });

  it('will not cancel a completed activity', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'COMPLETED',
    });
    await expect(
      service.cancel('company-a', 'activity-1', {}, principal),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('will not delete a completed activity', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'COMPLETED',
      subject: 'Discuss scope',
    });
    await expect(
      service.remove('company-a', 'activity-1', principal),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('will not edit a cancelled activity', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'CANCELLED',
      startAt: null,
      endAt: null,
    });
    await expect(
      service.update(
        'company-a',
        'activity-1',
        { subject: 'Updated subject' },
        principal,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('records old and new dates when rescheduling', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'PLANNED',
      dueDate: new Date('2026-08-20T00:00:00.000Z'),
      startAt: null,
      endAt: null,
    });
    prisma.crmActivity.update.mockResolvedValue({
      id: 'activity-1',
      status: 'PLANNED',
      dueDate: new Date('2026-08-25T00:00:00.000Z'),
      startAt: null,
    });
    await service.reschedule(
      'company-a',
      'activity-1',
      { dueDate: '2026-08-25', reason: 'Client requested later date' },
      principal,
    );
    expect(audit.record).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'CRM.Activity.Rescheduled',
        oldValue: expect.objectContaining({
          dueDate: new Date('2026-08-20T00:00:00.000Z'),
        }),
      }),
    );
  });

  it('rejects rescheduling without a new date', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue({
      id: 'activity-1',
      companyId: 'company-a',
      status: 'PLANNED',
      dueDate: null,
      startAt: null,
      endAt: null,
    });
    await expect(
      service.reschedule(
        'company-a',
        'activity-1',
        { reason: 'No new date supplied' },
        principal,
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws NotFoundException for an activity outside the tenant', async () => {
    prisma.crmActivity.findFirst.mockResolvedValue(null);
    await expect(
      service.get('company-a', 'activity-missing', principal),
    ).rejects.toThrow(NotFoundException);
  });
});
