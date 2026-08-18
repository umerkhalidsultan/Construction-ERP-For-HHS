import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ActivityType,
  DependencyType,
  ProjectPriority,
  TaskStatus,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
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

export class CreateWbsDto {
  @ApiProperty() @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/) code!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() phaseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
export class UpdateWbsDto extends PartialType(CreateWbsDto) {}

export class CreateActivityDto {
  @ApiProperty() @IsUUID() phaseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parentTaskId?: string;
  @ApiProperty()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/)
  activityCode!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
  @ApiPropertyOptional({ enum: ActivityType })
  @IsOptional()
  @IsEnum(ActivityType)
  activityType?: ActivityType;
  @ApiProperty() @IsDateString() plannedStartDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedEndDate?: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) durationDays!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  remainingDurationDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() actualStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() actualEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assigneeMembershipId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supervisorMembershipId?: string;
  @ApiPropertyOptional({ enum: ProjectPriority })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  plannedQuantity?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  actualQuantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) unit?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isManuallyScheduled?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class ConcurrencyDto {
  @ApiPropertyOptional({
    description: 'updatedAt value last read by the editor',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

// Intersection is avoided here because Swagger PartialType must retain the
// activity validation metadata while optimistic concurrency remains optional.
export class UpdatePlanningActivityDto extends UpdateActivityDto {
  @ApiPropertyOptional({
    description: 'updatedAt value last read by the editor',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class ActivityQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wbsId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() phaseId?: string;
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  critical?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  delayed?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleMembershipId?: string;
  @ApiPropertyOptional({ enum: ActivityType })
  @IsOptional()
  @IsEnum(ActivityType)
  activityType?: ActivityType;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

export class CreateDependencyDto {
  @ApiProperty() @IsUUID() predecessorId!: string;
  @ApiProperty() @IsUUID() successorId!: string;
  @ApiPropertyOptional({ enum: DependencyType })
  @IsOptional()
  @IsEnum(DependencyType)
  type?: DependencyType;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-3650)
  @Max(3650)
  lagDays?: number;
}

export class UpdateProgressDto {
  @ApiProperty() @IsDateString() progressDate!: string;
  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentComplete!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  actualQuantity?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  remainingQuantity?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateBaselineDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
