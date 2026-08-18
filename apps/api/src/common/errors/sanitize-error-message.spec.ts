import { looksTechnical, sanitizeUserMessage } from './sanitize-error-message';

describe('sanitizeUserMessage', () => {
  it('strips Prisma and SQL leaks', () => {
    expect(looksTechnical('PrismaClientValidationError')).toBe(true);
    expect(
      looksTechnical('23505 duplicate key value violates unique constraint'),
    ).toBe(true);
    expect(
      sanitizeUserMessage('ECONNREFUSED 127.0.0.1:5432', 'Please try again.'),
    ).toBe('Please try again.');
  });

  it('keeps professional business messages', () => {
    expect(
      sanitizeUserMessage(
        'This project cannot be deleted because it contains financial transactions.',
        'fallback',
      ),
    ).toContain('financial transactions');
  });

  it('rejects stack traces and runtime implementation details', () => {
    expect(
      looksTechnical('TypeError: Cannot read properties of undefined'),
    ).toBe(true);
    expect(looksTechnical('Error at node_modules/service.js:42:10')).toBe(true);
  });
});
