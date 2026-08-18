import { ApiPropertyOptional } from '@nestjs/swagger';
import { Weekday } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProjectSettingsDto {
  @ApiPropertyOptional({ enum: Weekday, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Weekday, { each: true })
  workingDays?: Weekday[];

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  workingHoursStart?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  workingHoursEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  documentPrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  defaultWarehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  defaultStoreId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  approvalFlow?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  calendarSettings?: Record<string, unknown>;
}
