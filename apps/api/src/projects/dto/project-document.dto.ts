import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProjectDocumentCategory } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProjectDocumentDto {
  @ApiProperty({ enum: ProjectDocumentCategory })
  @IsEnum(ProjectDocumentCategory)
  category!: ProjectDocumentCategory;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fileObjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  externalUrl?: string;

  @ApiPropertyOptional({ default: '1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  versionLabel?: string;
}

export class UpdateProjectDocumentDto extends PartialType(
  CreateProjectDocumentDto,
) {}
