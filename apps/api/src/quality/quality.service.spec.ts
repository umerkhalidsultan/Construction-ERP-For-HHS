/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method */
import { QualityResultStatus } from '@prisma/client';
import type { IAuditService } from '../audit/audit.interface';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { BusinessRuleError } from '../common/errors/app-errors';
import type { QualityIntegrationPort } from './quality-integration.port';
import { QualityService } from './quality.service';

describe('QualityService', () => {
  const actor: AuthenticatedPrincipal = {
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'qa@example.com',
    companyId: '22222222-2222-4222-8222-222222222222',
    membershipId: '33333333-3333-4333-8333-333333333333',
    isPlatformAdmin: false,
  };
  const audit: jest.Mocked<IAuditService> = { record: jest.fn() };
  const integration: jest.Mocked<QualityIntegrationPort> = {
    publish: jest.fn(),
    notify: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('calculates numeric test failure and does not allow a silent override', async () => {
    const create = jest.fn(async ({ data }) => ({ id: 'result-1', ...data }));
    const transaction = jest.fn(async (callback) =>
      callback({ qualityTestResult: { create } }),
    );
    const prisma = {
      qualityTestDefinition: {
        findFirst: jest.fn(async () => ({
          id: 'definition-1',
          minValue: 30,
          maxValue: null,
        })),
      },
      $transaction: transaction,
    };
    const service = new QualityService(prisma as never, audit, integration);

    const result = await service.createTestResult(
      actor.companyId!,
      '44444444-4444-4444-8444-444444444444',
      {
        testNumber: 'CUBE-001',
        definitionId: '55555555-5555-4555-8555-555555555555',
        testDate: '2026-08-18',
        numericResult: 25,
      },
      actor,
    );

    expect(result.calculatedStatus).toBe(QualityResultStatus.FAIL);
    expect(result.resultStatus).toBe(QualityResultStatus.FAIL);
    expect(audit.record).toHaveBeenCalled();
    expect(integration.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TestFailed' }),
    );
  });

  it('returns the original inspection for a repeated offline mutation ID', async () => {
    const existing = { id: 'inspection-1', clientMutationId: 'mobile-123' };
    const prisma = {
      project: { findFirst: jest.fn(async () => ({ id: 'project-1' })) },
      qualityInspection: { findFirst: jest.fn(async () => existing) },
    };
    const service = new QualityService(prisma as never, audit, integration);
    const result = await service.createInspection(
      actor.companyId!,
      '44444444-4444-4444-8444-444444444444',
      {
        inspectionNumber: 'IR-001',
        requestedDate: '2026-08-18',
        inspectionType: 'FINAL',
        description: 'Final finish inspection',
        clientMutationId: 'mobile-123',
      },
      actor,
    );
    expect(result).toBe(existing);
  });

  it('blocks activity completion while a hold point remains unresolved', async () => {
    const prisma = {
      qualityInspection: { count: jest.fn(async () => 1) },
    };
    const service = new QualityService(prisma as never, audit, integration);
    await expect(
      service.assertActivityHoldPointsResolved(
        actor.companyId!,
        'project-1',
        'activity-1',
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('requires verification before an NCR can close', async () => {
    const prisma = {
      qualityNcr: {
        findFirst: jest.fn(async () => ({
          id: 'ncr-1',
          status: 'IMPLEMENTATION',
          verifiedAt: null,
          actions: [],
        })),
      },
    };
    const service = new QualityService(prisma as never, audit, integration);
    await expect(
      service.updateNcr(
        actor.companyId!,
        'project-1',
        'ncr-1',
        { status: 'CLOSED' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});
