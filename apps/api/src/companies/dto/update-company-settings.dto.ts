import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DistanceUnit,
  MeasurementSystem,
  TemperatureUnit,
  Weekday,
} from '@prisma/client';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ enum: Weekday, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(Weekday, { each: true })
  workingDays?: Weekday[];

  @ApiPropertyOptional({ enum: Weekday, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Weekday, { each: true })
  weekendDays?: Weekday[];

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  workingHoursStart?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  workingHoursEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  fiscalYearName?: string;

  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  financialYearStart?: string;

  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  dateFormat?: string;

  @IsOptional()
  @Matches(/^(12h|24h)$/)
  timeFormat?: string;

  @IsOptional()
  @IsEnum(MeasurementSystem)
  measurementSystem?: MeasurementSystem;

  @IsOptional()
  @IsEnum(DistanceUnit)
  distanceUnit?: DistanceUnit;

  @IsOptional()
  @IsEnum(TemperatureUnit)
  temperatureUnit?: TemperatureUnit;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  language?: string;

  @IsOptional()
  @IsUUID()
  defaultWarehouseId?: string;

  @IsOptional()
  @IsBoolean()
  autoNumberingEnabled?: boolean;

  @IsOptional()
  @IsObject()
  documentPrefixes?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  taxSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  approvalSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  emailSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  projectDefaults?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  attendanceRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  payrollRules?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  overtimeRules?: Record<string, unknown>;
}
