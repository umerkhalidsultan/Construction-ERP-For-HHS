import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permission.constants';
import {
  ActivityAttachmentDto,
  ActivityCalendarQueryDto,
  ActivityQueryDto,
  AssignActivityDto,
  CancelActivityDto,
  CompleteActivityDto,
  CreateActivityDto,
  RescheduleActivityDto,
  UpdateActivityDto,
} from './activity.dto';
import { ActivityService } from './activity.service';

@ApiTags('CRM Activities')
@ApiBearerAuth()
@Controller('companies/:companyId/crm/activities')
export class ActivityController {
  constructor(private readonly activities: ActivityService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: ActivityQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = await this.activities.list(companyId, query, principal);
    return { data: result.data, pagination: result.meta };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_CREATE)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Activity created successfully.',
      data: await this.activities.create(companyId, dto, principal),
    };
  }

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_VIEW)
  async dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.activities.dashboard(companyId, principal) };
  }

  @Get('team')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_VIEW_TEAM)
  async team(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.activities.team(companyId, principal) };
  }

  @Get('calendar')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_ACTIVITY_VIEW_CALENDAR,
  )
  async calendar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: ActivityCalendarQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.activities.calendar(companyId, query, principal),
    };
  }

  @Get('catalog')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_VIEW)
  catalog() {
    return { data: this.activities.catalog() };
  }

  @Get('assignees')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_VIEW)
  async assignees(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.activities.assignees(companyId, principal) };
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_EXPORT)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="crm-activities.csv"')
  async export(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: ActivityQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.activities.exportCsv(companyId, query, principal);
  }

  @Get(':activityId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_VIEW)
  async get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.activities.get(companyId, activityId, principal),
    };
  }

  @Patch(':activityId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: UpdateActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Activity updated successfully.',
      data: await this.activities.update(companyId, activityId, dto, principal),
    };
  }

  @Delete(':activityId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_DELETE)
  async remove(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Activity deleted successfully.',
      data: await this.activities.remove(companyId, activityId, principal),
    };
  }

  @Patch(':activityId/assign')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_ASSIGN)
  async assign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: AssignActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Activity assigned successfully.',
      data: await this.activities.assign(companyId, activityId, dto, principal),
    };
  }

  @Patch(':activityId/complete')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_COMPLETE)
  async complete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: CompleteActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Activity completed successfully.',
      data: await this.activities.complete(
        companyId,
        activityId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':activityId/cancel')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_CANCEL)
  async cancel(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: CancelActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Activity cancelled successfully.',
      data: await this.activities.cancel(companyId, activityId, dto, principal),
    };
  }

  @Patch(':activityId/reschedule')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_RESCHEDULE)
  async reschedule(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: RescheduleActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Activity rescheduled successfully.',
      data: await this.activities.reschedule(
        companyId,
        activityId,
        dto,
        principal,
      ),
    };
  }

  @Get(':activityId/timeline')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_VIEW)
  async timeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.activities.timeline(companyId, activityId, principal),
    };
  }

  @Post(':activityId/attachments')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_EDIT)
  async addAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: ActivityAttachmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Attachment added successfully.',
      data: await this.activities.addAttachment(
        companyId,
        activityId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':activityId/attachments/:attachmentId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_ACTIVITY_EDIT)
  async deleteAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Attachment deleted successfully.',
      data: await this.activities.deleteAttachment(
        companyId,
        activityId,
        attachmentId,
        principal,
      ),
    };
  }
}
