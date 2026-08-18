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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';
import type { IProjectsService } from '../application/projects.service.interface';
import { PROJECTS_SERVICE } from '../application/projects.service.interface';
import {
  CreateProjectCalendarEventDto,
  ProjectCalendarQueryDto,
  UpdateProjectCalendarEventDto,
} from '../dto/project-calendar.dto';

@ApiTags('Project Calendar')
@ApiBearerAuth()
@Controller('companies/:companyId/projects/:projectId/calendar')
export class ProjectCalendarController {
  constructor(
    @Inject(PROJECTS_SERVICE)
    private readonly projects: IProjectsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ProjectCalendarQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.listCalendar(
        companyId,
        projectId,
        query,
        principal,
      ),
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectCalendarEventDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Calendar event created successfully',
      data: await this.projects.createCalendarEvent(
        companyId,
        projectId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':eventId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: UpdateProjectCalendarEventDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Calendar event updated successfully',
      data: await this.projects.updateCalendarEvent(
        companyId,
        projectId,
        eventId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':eventId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Calendar event archived successfully',
      data: await this.projects.deleteCalendarEvent(
        companyId,
        projectId,
        eventId,
        principal,
      ),
    };
  }
}
