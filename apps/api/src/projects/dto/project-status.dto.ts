import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectLifecycleStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateProjectStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  statusId?: string;

  @ApiPropertyOptional({ enum: ProjectLifecycleStatus })
  @IsOptional()
  @IsEnum(ProjectLifecycleStatus)
  lifecycleStatus?: ProjectLifecycleStatus;
}
