import { DocumentNumberingService } from './document-numbering.service';

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
});
