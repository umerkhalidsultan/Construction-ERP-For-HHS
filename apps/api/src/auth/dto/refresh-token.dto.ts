import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token fallback for non-browser clients. Browser clients use the secure cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
