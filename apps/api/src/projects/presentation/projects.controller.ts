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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';
import type { IProjectsService } from '../application/projects.service.interface';
import { PROJECTS_SERVICE } from '../application/projects.service.interface';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectQueryDto } from '../dto/project-query.dto';
import { UpdateProjectStatusDto } from '../dto/project-status.dto';
import { AssignProjectTagDto } from '../dto/project-tag.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('companies/:companyId/projects')
export class ProjectsController {
  constructor(
    @Inject(PROJECTS_SERVICE)
    private readonly projects: IProjectsService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_CREATE)
  @ApiOperation({ summary: 'Create a project with defaults and PROJ code' })
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateProjectDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project created successfully',
      data: await this.projects.create(companyId, dto, principal),
    };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'List and search projects' })
  list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: ProjectQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.projects.list(companyId, query, principal);
  }

  @Get('catalog/statuses')
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'List system and company project statuses' })
  async listStatuses(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.listStatuses(companyId, principal),
    };
  }

  @Get('catalog/types')
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  @ApiOperation({ summary: 'List system and company project types' })
  async listTypes(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.listTypes(companyId, principal),
    };
  }

  @Get(':projectId')
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.get(companyId, projectId, principal),
    };
  }

  @Patch(':projectId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project updated successfully',
      data: await this.projects.update(companyId, projectId, dto, principal),
    };
  }

  @Delete(':projectId')
  @RequirePermissions(PERMISSIONS.PROJECT_DELETE)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project archived successfully',
      data: await this.projects.delete(companyId, projectId, principal),
    };
  }

  @Post(':projectId/restore')
  @RequirePermissions(PERMISSIONS.PROJECT_DELETE)
  async restore(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project restored successfully',
      data: await this.projects.restore(companyId, projectId, principal),
    };
  }

  @Patch(':projectId/status')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  @ApiOperation({
    summary:
      'Update project status/lifecycle (Project.Close required for CLOSED/CANCELLED)',
  })
  async updateStatus(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateProjectStatusDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project status updated successfully',
      data: await this.projects.updateStatus(
        companyId,
        projectId,
        dto,
        principal,
      ),
    };
  }

  @Get(':projectId/dashboard')
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.dashboard(companyId, projectId, principal),
    };
  }

  @Get(':projectId/timeline')
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async timeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.timeline(companyId, projectId, principal),
    };
  }

  @Post(':projectId/tags')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async assignTag(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AssignProjectTagDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Tag assigned successfully',
      data: await this.projects.assignTag(companyId, projectId, dto, principal),
    };
  }

  @Delete(':projectId/tags/:tagId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async unassignTag(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Tag unassigned successfully',
      data: await this.projects.unassignTag(
        companyId,
        projectId,
        tagId,
        principal,
      ),
    };
  }
}
