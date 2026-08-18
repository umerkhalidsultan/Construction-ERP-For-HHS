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
  AssignProjectTeamDto,
  UpdateProjectTeamDto,
} from '../dto/project-team.dto';

@ApiTags('Project Team')
@ApiBearerAuth()
@Controller('companies/:companyId/projects/:projectId/team')
export class ProjectTeamController {
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
      data: await this.projects.listTeam(companyId, projectId, principal),
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGN)
  async assign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AssignProjectTeamDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Team member assigned successfully',
      data: await this.projects.assignTeam(
        companyId,
        projectId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':memberId')
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGN)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateProjectTeamDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Team member updated successfully',
      data: await this.projects.updateTeam(
        companyId,
        projectId,
        memberId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':memberId')
  @RequirePermissions(PERMISSIONS.PROJECT_ASSIGN)
  async unassign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Team member unassigned successfully',
      data: await this.projects.unassignTeam(
        companyId,
        projectId,
        memberId,
        principal,
      ),
    };
  }
}
