/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as bcrypt from 'bcrypt';
import {
  AuthenticationAppError,
  ValidationAppError,
} from '../common/errors/app-errors';
import { AuthService } from './auth.service';

// bcrypt at cost factor 12 is deliberately slow; these cases hash and compare
// several times, so they need more than Jest's 5s default.
jest.setTimeout(60_000);

describe('AuthService.changePassword', () => {
  const userId = 'user-1';
  const metadata = { ipAddress: '127.0.0.1', userAgent: 'jest' };
  let currentHash: string;

  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    session: { updateMany: jest.fn() },
    userSecurityLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const jwt = { verifyAsync: jest.fn(), signAsync: jest.fn() };
  const config = { get: jest.fn(), getOrThrow: jest.fn(() => 'secret') };
  let service: AuthService;

  beforeAll(async () => {
    currentHash = await bcrypt.hash('CurrentPass!123', 12);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockResolvedValue([]);
    prisma.user.findFirst.mockResolvedValue({
      id: userId,
      password: currentHash,
    });
    service = new AuthService(prisma as never, jwt as never, config as never);
  });

  const dto = {
    currentPassword: 'CurrentPass!123',
    newPassword: 'BrandNewPass!456',
    confirmPassword: 'BrandNewPass!456',
  };

  it('rejects mismatched new passwords before touching the database', async () => {
    await expect(
      service.changePassword(
        userId,
        { ...dto, confirmPassword: 'Different!456' },
        metadata,
      ),
    ).rejects.toThrow(ValidationAppError);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password and records a security event', async () => {
    await expect(
      service.changePassword(
        userId,
        { ...dto, currentPassword: 'WrongPass!123' },
        metadata,
      ),
    ).rejects.toThrow(ValidationAppError);
    expect(prisma.userSecurityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event: 'PASSWORD_CHANGE_FAILED',
          success: false,
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    await expect(
      service.changePassword(
        userId,
        {
          currentPassword: 'CurrentPass!123',
          newPassword: 'CurrentPass!123',
          confirmPassword: 'CurrentPass!123',
        },
        metadata,
      ),
    ).rejects.toThrow(ValidationAppError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an unavailable user account', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.changePassword(userId, dto, metadata)).rejects.toThrow(
      AuthenticationAppError,
    );
  });

  it('persists a bcrypt hash of the new password to users.password', async () => {
    await service.changePassword(userId, dto, metadata);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ updatedBy: userId }),
      }),
    );
    const written = (
      prisma.user.update.mock.calls[0] as [{ data: { password: string } }]
    )[0].data.password;
    expect(written).not.toBe(dto.newPassword);
    expect(written.startsWith('$2')).toBe(true);
    await expect(bcrypt.compare(dto.newPassword, written)).resolves.toBe(true);
    await expect(bcrypt.compare(dto.currentPassword, written)).resolves.toBe(
      false,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('revokes every other session and keeps the caller signed in', async () => {
    jwt.verifyAsync.mockResolvedValue({
      type: 'refresh',
      sessionId: 'keep-me',
    });
    await service.changePassword(userId, dto, metadata, 'refresh-token');
    expect(prisma.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId,
          revokedAt: null,
          id: { not: 'keep-me' },
        }),
      }),
    );
  });

  it('revokes all sessions when no current refresh token is supplied', async () => {
    await service.changePassword(userId, dto, metadata);
    const { where } = (
      prisma.session.updateMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ]
    )[0];
    expect(where).toEqual(expect.objectContaining({ userId, revokedAt: null }));
    expect(where).not.toHaveProperty('id');
  });
});
