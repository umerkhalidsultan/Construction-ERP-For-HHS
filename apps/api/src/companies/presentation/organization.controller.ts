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
import type { IOrganizationService } from '../application/organization.service.interface';
import { ORGANIZATION_SERVICE } from '../application/organization.service.interface';
import {
  CreateBusinessUnitDto,
  CreateRegionDto,
  CreateReportingLineDto,
  CreateTeamDto,
  OrganizationQueryDto,
  UpdateBusinessUnitDto,
  UpdateRegionDto,
  UpdateReportingLineDto,
  UpdateTeamDto,
} from '../dto/organization.dto';

@ApiTags('Organization Structure')
@ApiBearerAuth()
@Controller('companies/:companyId/organization')
export class OrganizationController {
  constructor(
    @Inject(ORGANIZATION_SERVICE)
    private readonly organization: IOrganizationService,
  ) {}

  @Get('business-units')
  @RequirePermissions(PERMISSIONS.BUSINESS_UNIT_MANAGE)
  listBusinessUnits(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OrganizationQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.list('businessUnit', companyId, query, principal);
  }

  @Post('business-units')
  @RequirePermissions(PERMISSIONS.BUSINESS_UNIT_MANAGE)
  async createBusinessUnit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateBusinessUnitDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Business unit created successfully',
      data: await this.organization.create(
        'businessUnit',
        companyId,
        dto,
        principal,
      ),
    };
  }

  @Patch('business-units/:entityId')
  @RequirePermissions(PERMISSIONS.BUSINESS_UNIT_MANAGE)
  updateBusinessUnit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: UpdateBusinessUnitDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.update(
      'businessUnit',
      companyId,
      entityId,
      dto,
      principal,
    );
  }

  @Delete('business-units/:entityId')
  @RequirePermissions(PERMISSIONS.BUSINESS_UNIT_MANAGE)
  deleteBusinessUnit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.delete(
      'businessUnit',
      companyId,
      entityId,
      principal,
    );
  }

  @Post('business-units/:entityId/restore')
  @RequirePermissions(PERMISSIONS.BUSINESS_UNIT_MANAGE)
  restoreBusinessUnit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.restore(
      'businessUnit',
      companyId,
      entityId,
      principal,
    );
  }

  @Get('regions')
  @RequirePermissions(PERMISSIONS.REGION_MANAGE)
  listRegions(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OrganizationQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.list('region', companyId, query, principal);
  }

  @Post('regions')
  @RequirePermissions(PERMISSIONS.REGION_MANAGE)
  async createRegion(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateRegionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Region created successfully',
      data: await this.organization.create('region', companyId, dto, principal),
    };
  }

  @Patch('regions/:entityId')
  @RequirePermissions(PERMISSIONS.REGION_MANAGE)
  updateRegion(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: UpdateRegionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.update(
      'region',
      companyId,
      entityId,
      dto,
      principal,
    );
  }

  @Delete('regions/:entityId')
  @RequirePermissions(PERMISSIONS.REGION_MANAGE)
  deleteRegion(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.delete('region', companyId, entityId, principal);
  }

  @Post('regions/:entityId/restore')
  @RequirePermissions(PERMISSIONS.REGION_MANAGE)
  restoreRegion(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.restore('region', companyId, entityId, principal);
  }

  @Get('teams')
  @RequirePermissions(PERMISSIONS.TEAM_MANAGE)
  listTeams(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OrganizationQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.list('team', companyId, query, principal);
  }

  @Post('teams')
  @RequirePermissions(PERMISSIONS.TEAM_MANAGE)
  async createTeam(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateTeamDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Team created successfully',
      data: await this.organization.create('team', companyId, dto, principal),
    };
  }

  @Patch('teams/:entityId')
  @RequirePermissions(PERMISSIONS.TEAM_MANAGE)
  updateTeam(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: UpdateTeamDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.update(
      'team',
      companyId,
      entityId,
      dto,
      principal,
    );
  }

  @Delete('teams/:entityId')
  @RequirePermissions(PERMISSIONS.TEAM_MANAGE)
  deleteTeam(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.delete('team', companyId, entityId, principal);
  }

  @Post('teams/:entityId/restore')
  @RequirePermissions(PERMISSIONS.TEAM_MANAGE)
  restoreTeam(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.restore('team', companyId, entityId, principal);
  }

  @Get('chart')
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  chart(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.organizationChart(companyId, principal);
  }

  @Post('reporting-lines')
  @RequirePermissions(PERMISSIONS.REPORTING_HIERARCHY_MANAGE)
  createReportingLine(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateReportingLineDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.createReportingLine(companyId, dto, principal);
  }

  @Patch('reporting-lines/:entityId')
  @RequirePermissions(PERMISSIONS.REPORTING_HIERARCHY_MANAGE)
  updateReportingLine(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: UpdateReportingLineDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.updateReportingLine(
      companyId,
      entityId,
      dto,
      principal,
    );
  }

  @Delete('reporting-lines/:entityId')
  @RequirePermissions(PERMISSIONS.REPORTING_HIERARCHY_MANAGE)
  deleteReportingLine(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.deleteReportingLine(
      companyId,
      entityId,
      principal,
    );
  }
}
