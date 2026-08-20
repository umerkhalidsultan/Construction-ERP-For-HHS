import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CompanyStatus, MembershipStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import {
  AuthenticationAppError,
  ValidationAppError,
} from '../common/errors/app-errors';
import { PrismaService } from '../prisma/prisma.service';
import {
  AccessTokenPayload,
  ClientMetadata,
  RefreshTokenPayload,
} from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

/** Matches the cost factor used when seeding the bootstrap administrator. */
const PASSWORD_SALT_ROUNDS = 12;

const membershipInclude = {
  company: {
    select: {
      id: true,
      companyCode: true,
      displayName: true,
      status: true,
      deletedAt: true,
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, metadata: ClientMetadata) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: dto.email.trim(), mode: 'insensitive' },
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        memberships: {
          where: {
            status: MembershipStatus.ACTIVE,
            deletedAt: null,
            company: {
              status: CompanyStatus.ACTIVE,
              deletedAt: null,
            },
          },
          include: membershipInclude,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      if (user) {
        await this.prisma.userSecurityLog.create({
          data: {
            userId: user.id,
            event: 'LOGIN_FAILED',
            success: false,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            metadata: { companyId: dto.companyId ?? null },
          },
        });
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    const activeMembership = dto.companyId
      ? user.memberships.find(
          (membership) => membership.companyId === dto.companyId,
        )
      : user.memberships[0];

    if (!activeMembership && !user.isPlatformAdmin) {
      throw new ForbiddenException('No active company membership is available');
    }

    if (dto.companyId && !activeMembership && !user.isPlatformAdmin) {
      throw new ForbiddenException('Access to the selected company is denied');
    }

    const tokens = await this.issueTokens(
      {
        id: user.id,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      activeMembership
        ? { id: activeMembership.id, companyId: activeMembership.companyId }
        : null,
      metadata,
      'LOGIN_SUCCEEDED',
      true,
    );

    const payload = {
      ...tokens,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      activeCompany: activeMembership?.company ?? null,
      memberships: user.memberships.map((membership) => ({
        id: membership.id,
        status: membership.status,
        company: membership.company,
      })),
    };
    return payload;
  }

  async refresh(refreshToken: string, metadata: ClientMetadata) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        refreshTokenHash: tokenHash,
        revokedAt: null,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            memberships: {
              where: {
                status: MembershipStatus.ACTIVE,
                deletedAt: null,
                company: {
                  status: CompanyStatus.ACTIVE,
                  deletedAt: null,
                },
              },
              include: membershipInclude,
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.user.status !== UserStatus.ACTIVE ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const revoked = await this.prisma.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date(), updatedBy: session.userId },
    });

    if (revoked.count !== 1) {
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const activeMembership = session.user.memberships[0] ?? null;
    if (!activeMembership && !session.user.isPlatformAdmin) {
      throw new ForbiddenException('No active company membership is available');
    }

    return this.issueTokens(
      {
        id: session.user.id,
        email: session.user.email,
        isPlatformAdmin: session.user.isPlatformAdmin,
      },
      activeMembership
        ? { id: activeMembership.id, companyId: activeMembership.companyId }
        : null,
      metadata,
      'TOKEN_REFRESHED',
    );
  }

  /**
   * Changes the password for the authenticated user. Passwords live only in
   * `users.password` as a bcrypt hash — the same column `login` verifies
   * against — so there is exactly one source of truth.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    metadata: ClientMetadata,
    currentRefreshToken?: string,
  ): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new ValidationAppError({
        confirmPassword: 'The new passwords do not match.',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
      select: { id: true, password: true },
    });
    if (!user) {
      throw new AuthenticationAppError();
    }

    if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
      await this.prisma.userSecurityLog.create({
        data: {
          userId: user.id,
          event: 'PASSWORD_CHANGE_FAILED',
          success: false,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
      throw new ValidationAppError({
        currentPassword: 'Your current password is incorrect.',
      });
    }

    if (await bcrypt.compare(dto.newPassword, user.password)) {
      throw new ValidationAppError({
        newPassword: 'Your new password must be different from the current one.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, PASSWORD_SALT_ROUNDS);
    const keepSessionId = currentRefreshToken
      ? await this.sessionIdFromRefreshToken(currentRefreshToken)
      : undefined;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash, updatedBy: user.id },
      }),
      // Any other session was established with the old credential.
      this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          ...(keepSessionId ? { id: { not: keepSessionId } } : {}),
        },
        data: { revokedAt: new Date(), updatedBy: user.id },
      }),
      this.prisma.userSecurityLog.create({
        data: {
          userId: user.id,
          event: 'PASSWORD_CHANGED',
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          metadata: { keptSessionId: keepSessionId ?? null },
        },
      }),
    ]);
  }

  private async sessionIdFromRefreshToken(
    token: string,
  ): Promise<string | undefined> {
    try {
      return (await this.verifyRefreshToken(token)).sessionId;
    } catch {
      return undefined;
    }
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.prisma.session.updateMany({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          refreshTokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date(), updatedBy: payload.sub },
      });
      await this.prisma.userSecurityLog.create({
        data: {
          userId: payload.sub,
          event: 'LOGOUT',
          metadata: { sessionId: payload.sessionId },
        },
      });
    } catch {
      // Logout is idempotent and intentionally does not disclose token validity.
    }
  }

  private async issueTokens(
    user: { id: string; email: string; isPlatformAdmin: boolean },
    membership: { id: string; companyId: string } | null,
    metadata: ClientMetadata,
    securityEvent: 'LOGIN_SUCCEEDED' | 'TOKEN_REFRESHED',
    recordLastLogin = false,
  ) {
    const sessionId = randomUUID();
    const accessTtl = this.config.get<number>('JWT_ACCESS_TTL_SECONDS', 900);
    const refreshTtl = this.config.get<number>(
      'JWT_REFRESH_TTL_SECONDS',
      604800,
    );

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      companyId: membership?.companyId ?? null,
      membershipId: membership?.id ?? null,
      isPlatformAdmin: user.isPlatformAdmin,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessTtl,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      }),
    ]);

    await this.prisma.$transaction([
      this.prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshTokenHash: this.hashToken(refreshToken),
          expiresAt: new Date(Date.now() + refreshTtl * 1000),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          createdBy: user.id,
          updatedBy: user.id,
        },
      }),
      this.prisma.userSecurityLog.create({
        data: {
          userId: user.id,
          event: securityEvent,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          metadata: {
            sessionId,
            companyId: membership?.companyId ?? null,
          },
        },
      }),
      ...(recordLastLogin
        ? [
            this.prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date(), updatedBy: user.id },
            }),
          ]
        : []),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: accessTtl,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
