import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProjectTagDto {
  @ApiProperty()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,49}$/)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: '#2563EB' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

export class UpdateProjectTagDto extends PartialType(CreateProjectTagDto) {}

export class AssignProjectTagDto {
  @ApiProperty()
  @IsUUID()
  tagId!: string;
}
