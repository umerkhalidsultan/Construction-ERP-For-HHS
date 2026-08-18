import { ThemeMode } from '@prisma/client';
import { IsEnum, IsOptional, Matches } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)
  primaryColor?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)
  secondaryColor?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)
  accentColor?: string;

  @IsOptional()
  @IsEnum(ThemeMode)
  theme?: ThemeMode;
}
