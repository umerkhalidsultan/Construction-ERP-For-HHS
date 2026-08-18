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
  CreateProjectPhaseDto,
  CreateProjectTaskDto,
  UpdateProjectPhaseDto,
  UpdateProjectTaskDto,
} from '../dto/project-phase.dto';

@ApiTags('Project Phases')
@ApiBearerAuth()
@Controller('companies/:companyId/projects/:projectId/phases')
export class ProjectPhasesController {
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
      data: await this.projects.listPhases(companyId, projectId, principal),
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectPhaseDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Phase created successfully',
      data: await this.projects.createPhase(
        companyId,
        projectId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':phaseId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Body() dto: UpdateProjectPhaseDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Phase updated successfully',
      data: await this.projects.updatePhase(
        companyId,
        projectId,
        phaseId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':phaseId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Phase archived successfully',
      data: await this.projects.deletePhase(
        companyId,
        projectId,
        phaseId,
        principal,
      ),
    };
  }

  @Post(':phaseId/tasks')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async createTask(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Body() dto: CreateProjectTaskDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Task created successfully',
      data: await this.projects.createTask(
        companyId,
        projectId,
        phaseId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':phaseId/tasks/:taskId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async updateTask(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateProjectTaskDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Task updated successfully',
      data: await this.projects.updateTask(
        companyId,
        projectId,
        phaseId,
        taskId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':phaseId/tasks/:taskId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async deleteTask(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Task archived successfully',
      data: await this.projects.deleteTask(
        companyId,
        projectId,
        phaseId,
        taskId,
        principal,
      ),
    };
  }
}
