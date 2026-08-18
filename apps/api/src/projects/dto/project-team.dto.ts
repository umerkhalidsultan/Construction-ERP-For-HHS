import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProjectTeamRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AssignProjectTeamDto {
  @ApiProperty()
  @IsUUID()
  membershipId!: string;

  @ApiProperty({ enum: ProjectTeamRole })
  @IsEnum(ProjectTeamRole)
  role!: ProjectTeamRole;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateProjectTeamDto extends PartialType(AssignProjectTeamDto) {}
