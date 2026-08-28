import { DocumentNumberingService } from './document-numbering.service';
import { EntityStatus, SequenceResetPolicy } from '@prisma/client';

describe('DocumentNumberingService formatting', () => {
  const service = new DocumentNumberingService({} as never, {} as never);

  it('formats yearly prefixes with padded sequence values', () => {
    const formatted = (
      service as unknown as {
        formatNumber: (
          sequence: {
            prefixTemplate: string;
            padding: number;
            branch?: { branchCode: string } | null;
          },
          numericValue: bigint,
          period: string,
          date: Date,
        ) => string;
      }
    ).formatNumber(
      {
        prefixTemplate: 'PO-{YYYY}-{BRANCH}-',
        padding: 6,
        branch: { branchCode: 'HO' },
      },
      12n,
      '2026',
      new Date('2026-03-15T00:00:00.000Z'),
    );

    expect(formatted).toBe('PO-2026-HO-000012');
  });

  it('allocates unique Tender numbers under concurrent requests', async () => {
    let nextNumber = 1n;
    let transactionQueue = Promise.resolve();
    const sequence = {
      id: 'sequence-a',
      companyId: 'company-a',
      branchId: null,
      documentType: 'TENDER',
      prefixTemplate: 'TND-{YYYY}-',
      padding: 6,
      resetPolicy: SequenceResetPolicy.YEARLY,
      currentPeriod: '2026',
      status: EntityStatus.ACTIVE,
      nextNumber,
      branch: null,
    };
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      documentSequence: {
        findUniqueOrThrow: jest.fn(() =>
          Promise.resolve({ ...sequence, nextNumber }),
        ),
        update: jest.fn(({ data }: { data: { nextNumber: bigint } }) => {
          nextNumber = data.nextNumber;
          return Promise.resolve({ ...sequence, nextNumber });
        }),
      },
    };
    const prisma = {
      documentSequence: { findFirst: jest.fn().mockResolvedValue(sequence) },
      $transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) => {
          const result = transactionQueue.then(() => callback(transaction));
          transactionQueue = result.then(
            () => undefined,
            () => undefined,
          );
          return result;
        },
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const concurrentService = new DocumentNumberingService(
      prisma as never,
      audit as never,
    );
    const principal = {
      userId: 'user-a',
      email: 'a@example.com',
      companyId: 'company-a',
      membershipId: 'member-a',
      isPlatformAdmin: false,
    };

    const allocations = await Promise.all(
      Array.from({ length: 5 }, () =>
        concurrentService.allocate(
          'company-a',
          { documentType: 'TENDER' },
          principal,
        ),
      ),
    );

    expect(new Set(allocations.map((item) => item.value)).size).toBe(5);
    expect(allocations.map((item) => item.value)).toEqual([
      'TND-2026-000001',
      'TND-2026-000002',
      'TND-2026-000003',
      'TND-2026-000004',
      'TND-2026-000005',
    ]);
  });
});
