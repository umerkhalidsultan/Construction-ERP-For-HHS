import { ForbiddenException } from '@nestjs/common';
import { CrmDashboardService } from './dashboard.service';

describe('CrmDashboardService', () => {
  const principal = {
    userId: 'user-1',
    email: 'sales@example.com',
    companyId: 'company-a',
    membershipId: 'member-1',
    isPlatformAdmin: false,
  };
  const prisma = {
    lead: { count: jest.fn().mockResolvedValue(0) },
    crmActivity: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    opportunity: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    opportunityStageDefinition: { findMany: jest.fn().mockResolvedValue([]) },
    companyMembership: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    reportingLine: { findMany: jest.fn().mockResolvedValue([]) },
    permission: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    company: { findFirst: jest.fn().mockResolvedValue({ currency: 'PKR' }) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  let service: CrmDashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.lead.count.mockResolvedValue(0);
    prisma.crmActivity.count.mockResolvedValue(0);
    prisma.crmActivity.findMany.mockResolvedValue([]);
    prisma.opportunity.findMany.mockResolvedValue([]);
    prisma.opportunity.count.mockResolvedValue(0);
    prisma.opportunityStageDefinition.findMany.mockResolvedValue([]);
    prisma.auditLog.findMany.mockResolvedValue([]);
    prisma.company.findFirst.mockResolvedValue({ currency: 'PKR' });
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.permission.findMany.mockResolvedValue([]);
    service = new CrmDashboardService(prisma as never);
  });

  it('refuses a company the caller is not scoped to', async () => {
    await expect(service.overview('company-b', {}, principal)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('falls back to own scope when the caller has no team/all permission', async () => {
    const result = await service.overview('company-a', {}, principal);
    expect(result.meta.scope).toBe('own');
  });

  it('cannot widen scope beyond permissions by asking for it', async () => {
    const result = await service.overview(
      'company-a',
      { scope: 'all' },
      principal,
    );
    expect(result.meta.scope).toBe('own');
  });

  it('lets a platform admin see the whole company', async () => {
    const result = await service.overview(
      'company-a',
      {},
      {
        ...principal,
        isPlatformAdmin: true,
      },
    );
    expect(result.meta.scope).toBe('all');
  });

  it('blocks an own-scope caller from reading another user’s data', async () => {
    await expect(
      service.overview('company-a', { assignedToId: 'member-99' }, principal),
    ).rejects.toThrow(ForbiddenException);
  });

  it('hides forecast and performance without the matching permissions', async () => {
    const result = await service.overview('company-a', {}, principal);
    expect(result.meta.capabilities.forecast).toBe(false);
    expect(result.forecast).toBeNull();
    expect(result.performance).toBeNull();
  });

  it('exposes forecast and performance when permissions are granted', async () => {
    prisma.permission.findMany.mockResolvedValue([
      { code: 'CRM.Dashboard.ViewForecast' },
      { code: 'CRM.Dashboard.ViewPerformance' },
    ]);
    const result = await service.overview('company-a', {}, principal);
    expect(result.meta.capabilities.forecast).toBe(true);
    expect(result.forecast).not.toBeNull();
    expect(result.performance).not.toBeNull();
  });

  it('returns safe zeroes rather than NaN when there is no CRM data', async () => {
    const result = await service.overview('company-a', {}, principal);
    expect(result.opportunities.winRate).toBe(0);
    expect(result.conversion.conversionRate).toBe(0);
    expect(result.opportunities.pipelineValue).toEqual([]);
    expect(Number.isNaN(result.opportunities.winRate)).toBe(false);
    expect(result.trends).toHaveLength(12);
    expect(result.pipelineHealth.staleCount).toBe(0);
  });

  it('uses the validated stale-activity threshold in pipeline health', async () => {
    const result = await service.overview(
      'company-a',
      { staleDays: 30 },
      principal,
    );
    expect(result.pipelineHealth.staleDays).toBe(30);
  });

  it('keeps currencies separate instead of summing them', async () => {
    // Two currencies for the OPEN aggregate query.
    prisma.$queryRaw.mockResolvedValue([
      { currency: 'PKR', count: 1, total: '1000', weighted: '400' },
      { currency: 'USD', count: 1, total: '50', weighted: '20' },
    ]);
    const result = await service.overview('company-a', {}, principal);
    const pipeline = result.opportunities.pipelineValue;
    expect(pipeline).toEqual(
      expect.arrayContaining([
        { currency: 'PKR', value: '1000' },
        { currency: 'USD', value: '50' },
      ]),
    );
    // Never collapsed into a single meaningless number.
    expect(pipeline).toHaveLength(2);
  });
});
