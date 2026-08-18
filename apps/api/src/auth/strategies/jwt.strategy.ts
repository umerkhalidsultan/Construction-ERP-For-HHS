import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { CompanyStatus, MembershipStatus, UserStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { RequestContextService } from '../../common/context/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessTokenPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedPrincipal> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        email: payload.email,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        isPlatformAdmin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    if (payload.membershipId || payload.companyId) {
      if (!payload.membershipId || !payload.companyId) {
        throw new UnauthorizedException('Invalid company context');
      }

      const membership = await this.prisma.companyMembership.findFirst({
        where: {
          id: payload.membershipId,
          companyId: payload.companyId,
          userId: user.id,
          status: MembershipStatus.ACTIVE,
          deletedAt: null,
          company: {
            status: CompanyStatus.ACTIVE,
            deletedAt: null,
          },
        },
        select: { id: true },
      });

      if (!membership) {
        throw new UnauthorizedException('Company membership is unavailable');
      }
    } else if (!user.isPlatformAdmin) {
      throw new UnauthorizedException('Company context is required');
    }

    const principal: AuthenticatedPrincipal = {
      userId: user.id,
      email: user.email,
      companyId: payload.companyId,
      membershipId: payload.membershipId,
      isPlatformAdmin: user.isPlatformAdmin,
    };
    this.requestContext.setPrincipal(principal);
    return principal;
  }
}
