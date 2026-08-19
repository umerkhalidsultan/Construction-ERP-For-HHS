import { OmitType } from '@nestjs/swagger';
import { OpportunityPriority, OpportunityStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOpportunityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsUUID()
  opportunityTypeId!: string;

  @IsUUID()
  sourceId!: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  crmCompanyId?: string;

  @IsOptional()
  @IsUUID()
  crmContactId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  projectLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedContractValue?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsEnum(OpportunityPriority)
  priority?: OpportunityPriority;

  @IsOptional()
  @IsDateString()
  expectedClosingDate?: string;

  @IsOptional()
  @IsDateString()
  expectedStartDate?: string;

  @IsOptional()
  @IsDateString()
  expectedCompletionDate?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateOpportunityDto extends OmitType(CreateOpportunityDto, [
  'stageId',
]) {}

export class OpportunityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  opportunityTypeId?: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(OpportunityPriority)
  priority?: OpportunityPriority;

  @IsOptional()
  @IsDateString()
  expectedClosingFrom?: string;

  @IsOptional()
  @IsDateString()
  expectedClosingTo?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsIn([
    'createdAt',
    'updatedAt',
    'expectedClosingDate',
    'estimatedContractValue',
    'name',
    'priority',
    'probability',
    'status',
  ])
  sortBy:
    | 'createdAt'
    | 'updatedAt'
    | 'expectedClosingDate'
    | 'estimatedContractValue'
    | 'name'
    | 'priority'
    | 'probability'
    | 'status' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class AssignOpportunityDto {
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class ChangeOpportunityStageDto {
  @IsUUID()
  stageId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class MarkOpportunityWonDto {
  @IsDateString()
  wonDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalContractValue!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  winReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  competitor?: string;

  @IsOptional()
  @IsString()
  winRemarks?: string;
}

export class MarkOpportunityLostDto {
  @IsUUID()
  lostReasonId!: string;

  @IsDateString()
  lostDate!: string;

  @IsOptional()
  @IsString()
  lostRemarks?: string;
}

export class ReopenOpportunityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}

// Opportunity activities/follow-ups now live in the shared CRM Activities
// module (apps/api/src/crm/activity.*) filtered by relatedType=OPPORTUNITY.
// Do not reintroduce a per-opportunity activity DTO here.

export class OpportunityNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  note!: string;
}

export class OpportunityAttachmentDto {
  @IsUUID()
  fileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ConvertLeadToOpportunityDto {
  @IsUUID()
  leadId!: string;

  @IsUUID()
  opportunityTypeId!: string;

  @IsUUID()
  sourceId!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedContractValue?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO code' })
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsEnum(OpportunityPriority)
  priority?: OpportunityPriority;

  @IsOptional()
  @IsDateString()
  expectedClosingDate?: string;

  @IsOptional()
  @IsDateString()
  expectedStartDate?: string;

  @IsOptional()
  @IsDateString()
  expectedCompletionDate?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class OpportunityForecastQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}

export class OpportunityCatalogQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive = false;
}
