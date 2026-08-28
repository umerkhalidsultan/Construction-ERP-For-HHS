import { PartialType } from '@nestjs/swagger';
import {
  TenderBidDecisionType,
  TenderPriority,
  TenderRequirementStatus,
  TenderStatus,
  TenderSubmissionMethod,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateTenderDto {
  @IsString() @MinLength(1) @MaxLength(255) title!: string;
  @IsOptional() @IsString() @MaxLength(100) internalReference?: string;
  @IsOptional() @IsUUID() opportunityId?: string;
  @IsUUID() clientCompanyId!: string;
  @IsOptional() @IsUUID() primaryContactId?: string;
  @IsOptional() @IsUUID() consultantCompanyId?: string;
  @IsOptional() @IsUUID() architectCompanyId?: string;
  @IsString() @MinLength(1) @MaxLength(100) tenderType!: string;
  @IsOptional() @IsString() @MaxLength(120) projectType?: string;
  @IsOptional() @IsString() @MaxLength(500) projectLocation?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsDateString() closingDate!: string;
  @IsOptional() @IsDateString() clarificationDeadline?: string;
  @IsOptional() @IsDateString() openingDate?: string;
  @IsOptional() @IsDateString() expectedAwardDate?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;
  @IsString() @Length(3, 3) currency!: string;
  @IsOptional() @IsUUID() tenderManagerMembershipId?: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsEnum(TenderPriority) priority?: TenderPriority;
  @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @IsOptional() @IsString() @MaxLength(20000) scopeSummary?: string;
}

export class UpdateTenderDto extends PartialType(CreateTenderDto) {
  @IsOptional() opportunityId?: never;
}

export class TenderQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsEnum(TenderStatus) status?: TenderStatus;
  @IsOptional() @IsString() @MaxLength(100) tenderType?: string;
  @IsOptional() @IsString() @MaxLength(120) projectType?: string;
  @IsOptional() @IsUUID() clientCompanyId?: string;
  @IsOptional() @IsUUID() tenderManagerMembershipId?: string;
  @IsOptional() @IsEnum(TenderPriority) priority?: TenderPriority;
  @IsOptional()
  @IsEnum(TenderBidDecisionType)
  bidDecision?: TenderBidDecisionType;
  @IsOptional() @IsDateString() closingFrom?: string;
  @IsOptional() @IsDateString() closingTo?: string;
  @IsOptional()
  @IsIn([
    'tenderNumber',
    'closingDate',
    'estimatedValue',
    'createdAt',
    'priority',
    'status',
  ])
  sortBy = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
export class TenderDashboardQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsUUID() tenderManagerMembershipId?: string;
  @IsOptional() @IsString() @MaxLength(100) tenderType?: string;
  @IsOptional() @IsString() @MaxLength(120) projectType?: string;
  @IsOptional() @IsEnum(TenderPriority) priority?: TenderPriority;
}
export class TenderCalendarQueryDto {
  @IsDateString() start!: string;
  @IsDateString() end!: string;
}

export class ChangeTenderStatusDto {
  @IsEnum(TenderStatus) status!: TenderStatus;
}

export class BidDecisionDto {
  @IsEnum(TenderBidDecisionType) decision!: TenderBidDecisionType;
  @ValidateIf(
    (o: BidDecisionDto) => o.decision === TenderBidDecisionType.NO_BID,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason?: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
  @IsOptional() @IsObject() assessment?: Record<string, number>;
}

export class AssignTenderTeamDto {
  @IsUUID() membershipId!: string;
  @IsString() @MinLength(1) @MaxLength(100) role!: string;
}

export class CreateTenderRequirementDto {
  @IsString() @MinLength(1) @MaxLength(255) name!: string;
  @IsOptional() @IsString() @MaxLength(120) category?: string;
  @IsOptional() @IsBoolean() mandatory?: boolean;
  @IsOptional() @IsUUID() responsibleMembershipId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
}
export class UpdateTenderRequirementDto extends PartialType(
  CreateTenderRequirementDto,
) {}
export class ChangeRequirementStatusDto {
  @IsEnum(TenderRequirementStatus) status!: TenderRequirementStatus;
}

export class SubmitTenderDto {
  @IsDateString() submittedAt!: string;
  @IsEnum(TenderSubmissionMethod) method!: TenderSubmissionMethod;
  @IsOptional() @IsString() @MaxLength(255) reference?: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
  @IsOptional() @IsUUID() evidenceFileId?: string;
}

export class AwardTenderDto {
  @IsDateString() awardDate!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) awardValue!: number;
  @IsOptional() @IsString() @MaxLength(160) awardReference?: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
}
export class LoseTenderDto {
  @IsDateString() lostDate!: string;
  @IsString() @MinLength(1) @MaxLength(1000) lostReason!: string;
  @IsOptional() @IsUUID() competitorCompanyId?: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
}
export class CancelTenderDto {
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
}

export class TenderAttachmentDto {
  @IsUUID() fileId!: string;
  @IsOptional() @IsString() @MaxLength(120) category?: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
}

export class SiteVisitDto {
  @IsDateString() visitDate!: string;
  @IsOptional() @IsString() @MaxLength(500) location?: string;
  @IsOptional() @IsString() attendees?: string;
  @IsOptional() @IsString() siteConditions?: string;
  @IsOptional() @IsString() access?: string;
  @IsOptional() @IsString() logistics?: string;
  @IsOptional() @IsString() utilities?: string;
  @IsOptional() @IsString() constraints?: string;
  @IsOptional() @IsString() observations?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateSiteVisitDto extends PartialType(SiteVisitDto) {}
export class PreBidMeetingDto {
  @IsDateString() meetingDate!: string;
  @IsOptional() @IsString() @MaxLength(500) location?: string;
  @IsOptional() @IsString() participants?: string;
  @IsOptional() @IsString() agenda?: string;
  @IsOptional() @IsString() discussion?: string;
  @IsOptional() @IsString() decisions?: string;
  @IsOptional() @IsString() questions?: string;
  @IsOptional() @IsString() actions?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdatePreBidMeetingDto extends PartialType(PreBidMeetingDto) {}
