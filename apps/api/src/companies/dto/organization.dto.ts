import { PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { CostCenterType, EntityStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,49}$/;

export class OrganizationQueryDto {
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
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted = false;
}

export class CreateBranchDto {
  @Matches(CODE_PATTERN)
  branchCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string;

  @IsOptional()
  @IsUUID()
  businessUnitId?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9()\-\s]{7,32}$/)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}

export class CreateDepartmentDto {
  @Matches(CODE_PATTERN)
  departmentCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsUUID()
  headMembershipId?: string;

  @IsOptional()
  @IsUUID()
  parentDepartmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export class CreateDesignationDto {
  @Matches(CODE_PATTERN)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  rank?: number;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateDesignationDto extends PartialType(CreateDesignationDto) {}

export class CreateCostCenterDto {
  @Matches(CODE_PATTERN)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsEnum(CostCenterType)
  type!: CostCenterType;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string;

  @IsOptional()
  @IsUUID()
  parentCostCenterId?: string;

  @IsOptional()
  @IsUUID()
  externalReferenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateCostCenterDto extends PartialType(CreateCostCenterDto) {}

export class CreateBusinessUnitDto {
  @Matches(CODE_PATTERN)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateBusinessUnitDto extends PartialType(CreateBusinessUnitDto) {}

export class CreateRegionDto {
  @Matches(CODE_PATTERN)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsUUID()
  managerMembershipId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateRegionDto extends PartialType(CreateRegionDto) {}

export class CreateTeamDto {
  @Matches(CODE_PATTERN)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  leadMembershipId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class CreateReportingLineDto {
  @IsUUID()
  subordinateMembershipId!: string;

  @IsUUID()
  managerMembershipId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveTo?: string;
}

export class UpdateReportingLineDto extends PartialType(
  CreateReportingLineDto,
) {}
