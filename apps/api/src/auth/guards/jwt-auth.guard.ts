import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import {
  AppError,
  AuthenticationAppError,
} from '../../common/errors/app-errors';
import { ErrorCode } from '../../common/errors/error-codes';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | undefined, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof AppError
        ? err
        : new AuthenticationAppError(
            'Your session has expired. Please sign in again.',
            ErrorCode.AUTH_EXPIRED,
          );
    }
    return user;
  }
}
