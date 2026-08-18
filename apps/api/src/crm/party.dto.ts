import { PartialType } from '@nestjs/swagger';
import {
  CrmContactStatus,
  CrmPartyStatus,
  CrmPrimaryContactPurpose,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
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

export class CreateCrmCompanyDto {
  @IsString() @MinLength(2) @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(255) legalName?: string;
  @IsOptional() @IsString() @MaxLength(120) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) taxNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) industry?: string;
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  website?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(32) alternatePhone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) country?: string;
  @IsOptional() @IsString() @MaxLength(32) postalCode?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(CrmPartyStatus) status?: CrmPartyStatus;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  typeIds?: string[];
  @IsOptional() @IsBoolean() overrideDuplicate?: boolean;
}
export class UpdateCrmCompanyDto extends PartialType(CreateCrmCompanyDto) {}

export class CrmCompanyQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsUUID() typeId?: string;
  @IsOptional() @IsString() @MaxLength(160) industry?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsEnum(CrmPartyStatus) status?: CrmPartyStatus;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional()
  @IsIn(['createdAt', 'name', 'legalName', 'industry', 'city', 'status'])
  sortBy: 'createdAt' | 'name' | 'legalName' | 'industry' | 'city' | 'status' =
    'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}

export class CrmCompanyDuplicateQueryDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) legalName?: string;
  @IsOptional() @IsString() @MaxLength(120) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) taxNumber?: string;
  @IsOptional() @IsString() @MaxLength(2048) website?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsUUID() excludeId?: string;
}

export class CreateCrmContactDto {
  @IsString() @MinLength(1) @MaxLength(120) firstName!: string;
  @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @IsOptional() @IsString() @MaxLength(160) jobTitle?: string;
  @IsOptional() @IsString() @MaxLength(160) department?: string;
  @IsOptional() @IsUUID() crmCompanyId?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsEmail() @MaxLength(320) alternateEmail?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(32) mobile?: string;
  @IsOptional() @IsString() @MaxLength(32) whatsapp?: string;
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  website?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) country?: string;
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  linkedin?: string;
  @IsOptional() @IsString() notesText?: string;
  @IsOptional() @IsEnum(CrmContactStatus) status?: CrmContactStatus;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  typeIds?: string[];
  @IsOptional() @IsBoolean() overrideDuplicate?: boolean;
}
export class UpdateCrmContactDto extends PartialType(CreateCrmContactDto) {}

export class CrmContactQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(160) search?: string;
  @IsOptional() @IsUUID() crmCompanyId?: string;
  @IsOptional() @IsUUID() typeId?: string;
  @IsOptional() @IsString() @MaxLength(160) department?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsEnum(CrmContactStatus) status?: CrmContactStatus;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional()
  @IsIn([
    'createdAt',
    'firstName',
    'lastName',
    'jobTitle',
    'department',
    'city',
    'status',
  ])
  sortBy:
    | 'createdAt'
    | 'firstName'
    | 'lastName'
    | 'jobTitle'
    | 'department'
    | 'city'
    | 'status' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}

export class CrmContactDuplicateQueryDto {
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(120) firstName?: string;
  @IsOptional() @IsString() @MaxLength(120) lastName?: string;
  @IsOptional() @IsUUID() crmCompanyId?: string;
  @IsOptional() @IsUUID() excludeId?: string;
}

export class PartyAssignmentDto {
  @IsOptional() @IsUUID() assignedToId?: string;
}
export class ContactCompanyLinkDto {
  @IsOptional() @IsUUID() crmCompanyId?: string;
}
export class PrimaryContactDto {
  @IsUUID() crmContactId!: string;
  @IsEnum(CrmPrimaryContactPurpose) purpose!: CrmPrimaryContactPurpose;
  @IsOptional() @IsString() @MaxLength(120) label?: string;
}
export class PartyNoteDto {
  @IsString() @MinLength(1) @MaxLength(10000) note!: string;
}
export class PartyAttachmentDto {
  @IsUUID() fileId!: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}
export class PartyCatalogQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive = false;
}
export class LinkLeadPartiesDto {
  @IsOptional() @IsUUID() crmCompanyId?: string;
  @IsOptional() @IsUUID() crmContactId?: string;
}
export class CrmGlobalSearchDto {
  @IsString() @MinLength(1) @MaxLength(160) q!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 10;
}
