import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedPrincipal } from '../context/request-context.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

type AuthenticatedRequest = Request & {
  user?: AuthenticatedPrincipal;
  params: Record<string, string>;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.user;
    if (!principal) {
      throw new ForbiddenException('Authenticated principal is required');
    }
    if (principal.isPlatformAdmin) {
      return true;
    }

    const routeCompanyId = request.params.companyId;
    if (
      routeCompanyId &&
      (!principal.companyId || routeCompanyId !== principal.companyId)
    ) {
      throw new ForbiddenException('Cross-company access is denied');
    }
    if (!principal.companyId || !principal.membershipId) {
      throw new ForbiddenException('An active company context is required');
    }

    const granted = await this.prisma.permission.findMany({
      where: {
        code: { in: required },
        deletedAt: null,
        roles: {
          some: {
            deletedAt: null,
            role: {
              deletedAt: null,
              OR: [{ companyId: null }, { companyId: principal.companyId }],
              memberships: {
                some: {
                  membershipId: principal.membershipId,
                  companyId: principal.companyId,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      select: { code: true },
    });

    const grantedCodes = new Set(granted.map((permission) => permission.code));
    if (!required.every((permission) => grantedCodes.has(permission))) {
      throw new ForbiddenException('Required permission is not granted');
    }
    return true;
  }
}
