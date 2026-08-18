import { PartialType } from '@nestjs/swagger';
import { EntityStatus, SequenceResetPolicy } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDocumentSequenceDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @Matches(/^[A-Z][A-Z0-9_]{1,49}$/)
  documentType!: string;

  @IsString()
  @MaxLength(100)
  prefixTemplate!: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(12)
  padding?: number;

  @IsOptional()
  @IsEnum(SequenceResetPolicy)
  resetPolicy?: SequenceResetPolicy;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class UpdateDocumentSequenceDto extends PartialType(
  CreateDocumentSequenceDto,
) {}

export class AllocateDocumentNumberDto {
  @Matches(/^[A-Z][A-Z0-9_]{1,49}$/)
  documentType!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
