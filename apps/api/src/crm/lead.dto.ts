import { PartialType } from '@nestjs/swagger';
import { LeadPriority, LeadStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(255) name!: string;
  @IsUUID() leadTypeId!: string;
  @IsUUID() leadSourceId!: string;
  @IsOptional() @IsString() @MaxLength(255) organizationName?: string;
  @IsOptional() @IsString() @MaxLength(200) contactPerson?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(32) alternatePhone?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  website?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(500) projectLocation?: string;
  @IsOptional() @IsString() @MaxLength(120) projectCity?: string;
  @IsOptional() @IsString() @MaxLength(160) projectArea?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsDateString() expectedClosingDate?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsUUID() crmCompanyId?: string;
  @IsOptional() @IsUUID() crmContactId?: string;
  @IsOptional() @IsEnum(LeadPriority) priority?: LeadPriority;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() overrideDuplicate?: boolean;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}

export class LeadQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsUUID() leadTypeId?: string;
  @IsOptional() @IsUUID() leadSourceId?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsEnum(LeadPriority) priority?: LeadPriority;
  @IsOptional() @IsString() @MaxLength(500) projectLocation?: string;
  @IsOptional() @IsDateString() expectedClosingFrom?: string;
  @IsOptional() @IsDateString() expectedClosingTo?: string;
  @IsOptional() @IsDateString() createdFrom?: string;
  @IsOptional() @IsDateString() createdTo?: string;
  @IsOptional()
  @IsIn([
    'createdAt',
    'expectedClosingDate',
    'estimatedValue',
    'name',
    'priority',
    'status',
  ])
  sortBy:
    | 'createdAt'
    | 'expectedClosingDate'
    | 'estimatedValue'
    | 'name'
    | 'priority'
    | 'status' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}

export class DuplicateLeadQueryDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) organizationName?: string;
  @IsOptional() @IsString() @MaxLength(200) contactPerson?: string;
  @IsOptional() @IsUUID() excludeLeadId?: string;
}

export class AssignLeadDto {
  @IsOptional() @IsUUID() assignedToId?: string;
}

export class ChangeLeadStatusDto {
  @IsEnum(LeadStatus) status!: LeadStatus;
}

export class LeadNoteDto {
  @IsString() @MinLength(1) @MaxLength(10000) note!: string;
}

export class LeadAttachmentDto {
  @IsUUID() fileId!: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class CatalogQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive = false;
}
