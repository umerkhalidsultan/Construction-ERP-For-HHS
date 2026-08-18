import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';
import type { IProjectsService } from '../application/projects.service.interface';
import { PROJECTS_SERVICE } from '../application/projects.service.interface';
import {
  CreateMilestoneDependencyDto,
  CreateProjectMilestoneDto,
  UpdateProjectMilestoneDto,
} from '../dto/project-milestone.dto';

@ApiTags('Project Milestones')
@ApiBearerAuth()
@Controller('companies/:companyId/projects/:projectId/milestones')
export class ProjectMilestonesController {
  constructor(
    @Inject(PROJECTS_SERVICE)
    private readonly projects: IProjectsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.listMilestones(companyId, projectId, principal),
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectMilestoneDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Milestone created successfully',
      data: await this.projects.createMilestone(
        companyId,
        projectId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':milestoneId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateProjectMilestoneDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Milestone updated successfully',
      data: await this.projects.updateMilestone(
        companyId,
        projectId,
        milestoneId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':milestoneId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Milestone archived successfully',
      data: await this.projects.deleteMilestone(
        companyId,
        projectId,
        milestoneId,
        principal,
      ),
    };
  }

  @Post(':milestoneId/dependencies')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async addDependency(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: CreateMilestoneDependencyDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Milestone dependency created successfully',
      data: await this.projects.addMilestoneDependency(
        companyId,
        projectId,
        milestoneId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':milestoneId/dependencies/:dependencyId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async removeDependency(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Param('dependencyId', ParseUUIDPipe) dependencyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Milestone dependency removed successfully',
      data: await this.projects.removeMilestoneDependency(
        companyId,
        projectId,
        milestoneId,
        dependencyId,
        principal,
      ),
    };
  }
}
