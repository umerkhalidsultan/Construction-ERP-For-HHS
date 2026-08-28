import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permission.constants';
import { CrmDashboardQueryDto } from './dashboard.dto';
import { CrmDashboardService } from './dashboard.service';

@ApiTags('CRM Dashboard')
@ApiBearerAuth()
@Controller('companies/:companyId/crm/dashboard')
export class CrmDashboardController {
  constructor(private readonly dashboard: CrmDashboardService) {}

  /**
   * One aggregated payload for the whole dashboard. Sections the caller is not
   * permitted to see are returned as null rather than omitted, so the client
   * can render a stable layout.
   */
  @Get()
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Aggregated CRM dashboard for the active company' })
  async overview(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: CrmDashboardQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.dashboard.overview(companyId, query, principal),
    };
  }
}
