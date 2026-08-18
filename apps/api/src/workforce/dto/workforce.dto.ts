import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  EmployeeAvailability,
  EmployeeDocumentType,
  EmployeeStatus,
  EntityStatus,
  Gender,
  MaritalStatus,
  ProjectTeamRole,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
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

export class CreateEmployeeDto {
  @ApiProperty()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{1,49}$/)
  employeeCode!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredName?: string;
  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationalId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  passportNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  religion?: string;
  @ApiPropertyOptional({ enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContactName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  emergencyContactPhone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelationship?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  personalEmail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  companyEmail?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  signatureUrl?: string;
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
  @ApiPropertyOptional({ enum: EmployeeAvailability })
  @IsOptional()
  @IsEnum(EmployeeAvailability)
  availability?: EmployeeAvailability;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() membershipId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() designationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teamId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() managerEmployeeId?: string;
  @ApiProperty() @IsUUID() employmentTypeId!: string;
  @ApiProperty() @IsDateString() joiningDate!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  confirmationDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() resignationDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() terminationDate?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiProperty()
  @IsDateString()
  expectedUpdatedAt!: string;
}

export class EmployeeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 25;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
  @ApiPropertyOptional({ enum: EmployeeAvailability })
  @IsOptional()
  @IsEnum(EmployeeAvailability)
  availability?: EmployeeAvailability;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() designationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() skillId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeDeleted = false;
}

export class TransferEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() designationId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() managerEmployeeId?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() employmentTypeId?: string;
  @ApiProperty() @IsDateString() effectiveDate!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(1000) reason!: string;
}

export class AssignProjectDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty({ enum: ProjectTeamRole })
  @IsEnum(ProjectTeamRole)
  role!: ProjectTeamRole;
  @ApiProperty() @IsDateString() assignedAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() unassignedAt?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  allocationPct?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(168)
  workingHours?: number;
}

export class EndProjectAssignmentDto {
  @ApiProperty() @IsDateString() endDate!: string;
}

export class AssignSkillDto {
  @ApiProperty() @IsUUID() skillId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  proficiencyLevel?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(80)
  yearsExperience?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateCertificationDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certificationNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuingAuthority?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fileObjectId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateCertificationDto extends PartialType(
  CreateCertificationDto,
) {}

export class CreateLicenseDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) licenseType!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiryDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuingAuthority?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fileObjectId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateLicenseDto extends PartialType(CreateLicenseDto) {}

export class CreateEmployeeDocumentDto {
  @ApiProperty({ enum: EmployeeDocumentType })
  @IsEnum(EmployeeDocumentType)
  documentType!: EmployeeDocumentType;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(255) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() fileObjectId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issuedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateEmployeeDocumentDto extends PartialType(
  CreateEmployeeDocumentDto,
) {}

export class CreateCatalogItemDto {
  @ApiProperty() @Matches(/^[A-Z0-9][A-Z0-9_-]{1,49}$/) code!: string;
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
