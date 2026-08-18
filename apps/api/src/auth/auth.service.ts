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
import { PrismaService } from '../prisma/prisma.service';
import {
  AccessTokenPayload,
  ClientMetadata,
  RefreshTokenPayload,
} from './auth.types';
import { LoginDto } from './dto/login.dto';

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
    );
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
    } catch {
      // Logout is idempotent and intentionally does not disclose token validity.
    }
  }

  private async issueTokens(
    user: { id: string; email: string; isPlatformAdmin: boolean },
    membership: { id: string; companyId: string } | null,
    metadata: ClientMetadata,
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

    await this.prisma.session.create({
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
    });

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
