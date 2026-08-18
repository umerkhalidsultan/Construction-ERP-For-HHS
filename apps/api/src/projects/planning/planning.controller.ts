import {
  Body,
  Controller,
  Delete,
  Get,
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
import {
  ActivityQueryDto,
  CreateActivityDto,
  CreateBaselineDto,
  CreateDependencyDto,
  CreateWbsDto,
  UpdatePlanningActivityDto,
  UpdateProgressDto,
  UpdateWbsDto,
} from './planning.dto';
import { PlanningService } from './planning.service';

@ApiTags('Project Planning')
@ApiBearerAuth()
@Controller('companies/:companyId/projects/:projectId/planning')
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_VIEW)
  dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(this.planning.dashboard(companyId, projectId, principal));
  }

  @Get('wbs')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_VIEW)
  listWbs(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(this.planning.listWbs(companyId, projectId, principal));
  }

  @Post('wbs')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_CREATE)
  createWbs(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateWbsDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.createWbs(companyId, projectId, dto, principal),
      'WBS created successfully',
    );
  }

  @Patch('wbs/:wbsId')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_EDIT)
  updateWbs(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('wbsId', ParseUUIDPipe) wbsId: string,
    @Body() dto: UpdateWbsDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.updateWbs(companyId, projectId, wbsId, dto, principal),
      'WBS updated successfully',
    );
  }

  @Delete('wbs/:wbsId')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_DELETE)
  deleteWbs(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('wbsId', ParseUUIDPipe) wbsId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.deleteWbs(companyId, projectId, wbsId, principal),
      'WBS deleted successfully',
    );
  }

  @Get('activities')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_VIEW)
  activities(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ActivityQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.listActivities(companyId, projectId, query, principal),
    );
  }

  @Post('activities')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_CREATE)
  createActivity(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.createActivity(companyId, projectId, dto, principal),
      'Activity created successfully',
    );
  }

  @Patch('activities/:activityId')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_EDIT)
  updateActivity(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: UpdatePlanningActivityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.updateActivity(
        companyId,
        projectId,
        activityId,
        dto,
        principal,
      ),
      'Activity updated successfully',
    );
  }

  @Delete('activities/:activityId')
  @RequirePermissions(PERMISSIONS.PROJECT_PLANNING_DELETE)
  deleteActivity(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.deleteActivity(companyId, projectId, activityId, principal),
      'Activity deleted successfully',
    );
  }

  @Post('dependencies')
  @RequirePermissions(PERMISSIONS.SCHEDULE_EDIT)
  createDependency(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateDependencyDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.createDependency(companyId, projectId, dto, principal),
      'Dependency created successfully',
    );
  }

  @Delete('dependencies/:dependencyId')
  @RequirePermissions(PERMISSIONS.SCHEDULE_EDIT)
  deleteDependency(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('dependencyId', ParseUUIDPipe) dependencyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.deleteDependency(
        companyId,
        projectId,
        dependencyId,
        principal,
      ),
      'Dependency deleted successfully',
    );
  }

  @Post('activities/:activityId/progress')
  @RequirePermissions(PERMISSIONS.PROGRESS_UPDATE)
  progress(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: UpdateProgressDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.updateProgress(
        companyId,
        projectId,
        activityId,
        dto,
        principal,
      ),
      'Progress updated successfully',
    );
  }

  @Get('baselines')
  @RequirePermissions(PERMISSIONS.BASELINE_VIEW)
  baselines(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.listBaselines(companyId, projectId, principal),
    );
  }

  @Post('baselines')
  @RequirePermissions(PERMISSIONS.BASELINE_CREATE)
  createBaseline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBaselineDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.createBaseline(companyId, projectId, dto, principal),
      'Baseline captured successfully',
    );
  }

  @Post('baselines/:baselineId/approve')
  @RequirePermissions(PERMISSIONS.BASELINE_APPROVE)
  approveBaseline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('baselineId', ParseUUIDPipe) baselineId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.approveBaseline(
        companyId,
        projectId,
        baselineId,
        principal,
      ),
      'Baseline approved successfully',
    );
  }

  @Get('gantt')
  @RequirePermissions(PERMISSIONS.GANTT_VIEW)
  gantt(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(this.planning.gantt(companyId, projectId, principal));
  }

  @Post('recalculate')
  @RequirePermissions(PERMISSIONS.SCHEDULE_RECALCULATE)
  recalculate(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.planning.recalculate(companyId, projectId, principal),
      'Schedule recalculated successfully',
    );
  }

  private async wrap<T>(result: Promise<T>, message?: string) {
    return { ...(message ? { message } : {}), data: await result };
  }
}
