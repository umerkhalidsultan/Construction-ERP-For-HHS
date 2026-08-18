import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const REFRESH_COOKIE = 'erp_refresh_token';

type CookieRequest = Request & {
  cookies?: Record<string, string>;
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate and create a secure session' })
  @ApiResponse({ status: 201, description: 'Authentication successful' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto, this.clientMetadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _refreshToken, ...data } = result;
    return { message: 'Authentication successful', data };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new session' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const result = await this.auth.refresh(
      refreshToken,
      this.clientMetadata(request),
    );
    this.setRefreshCookie(response, result.refreshToken);
    const { refreshToken: _refreshToken, ...data } = result;
    return { message: 'Session refreshed', data };
  }

  @Public()
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current refresh-token session' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(
      request.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken,
    );
    response.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    return { message: 'Logged out successfully', data: null };
  }

  private setRefreshCookie(response: Response, token: string): void {
    const ttl = this.config.get<number>('JWT_REFRESH_TTL_SECONDS', 604800);
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: ttl * 1000,
    });
  }

  private clientMetadata(request: Request) {
    return {
      ipAddress: request.ip || request.socket.remoteAddress || null,
      userAgent: request.header('user-agent') ?? null,
    };
  }
}
