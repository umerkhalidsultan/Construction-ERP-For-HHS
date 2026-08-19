import {
  CrmActivityPriority,
  CrmActivityRelatedType,
  CrmActivityStatus,
  CrmActivityType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateActivityDto {
  @IsEnum(CrmActivityRelatedType)
  relatedType!: CrmActivityRelatedType;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  crmCompanyId?: string;

  @IsOptional()
  @IsUUID()
  crmContactId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsEnum(CrmActivityType)
  type!: CrmActivityType;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  subject!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  assignedToId!: string;

  @IsOptional()
  @IsEnum(CrmActivityPriority)
  priority?: CrmActivityPriority;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  participants?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  callDurationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  emailTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  emailCc?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  nextAction?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(43200)
  reminderMinutesBefore?: number;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsEnum(CrmActivityType)
  type?: CrmActivityType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CrmActivityPriority)
  priority?: CrmActivityPriority;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  participants?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  contactPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  callDurationMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  emailTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  emailCc?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  nextAction?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(43200)
  reminderMinutesBefore?: number;
}

export class AssignActivityDto {
  @IsUUID()
  assignedToId!: string;
}

export class CompleteActivityDto {
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  nextAction?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;
}

export class CancelActivityDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class RescheduleActivityDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}

export class ActivityAttachmentDto {
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

export class ActivityQueryDto {
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
  @IsEnum(CrmActivityType)
  type?: CrmActivityType;

  @IsOptional()
  @IsEnum(CrmActivityStatus)
  status?: CrmActivityStatus;

  @IsOptional()
  @IsEnum(CrmActivityPriority)
  priority?: CrmActivityPriority;

  @IsOptional()
  @IsEnum(CrmActivityRelatedType)
  relatedType?: CrmActivityRelatedType;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  crmCompanyId?: string;

  @IsOptional()
  @IsUUID()
  crmContactId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdueOnly = false;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsIn(['createdAt', 'dueDate', 'startAt', 'priority', 'status', 'subject'])
  sortBy:
    'createdAt' | 'dueDate' | 'startAt' | 'priority' | 'status' | 'subject' =
    'dueDate';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}

export class ActivityCalendarQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
