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
  CreateCostCenterDto,
  OrganizationQueryDto,
  UpdateCostCenterDto,
} from '../dto/organization.dto';

@ApiTags('Cost Centers')
@ApiBearerAuth()
@Controller('companies/:companyId/cost-centers')
@RequirePermissions(PERMISSIONS.COST_CENTER_MANAGE)
export class CostCentersController {
  constructor(
    @Inject(ORGANIZATION_SERVICE)
    private readonly organization: IOrganizationService,
  ) {}

  @Get()
  list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OrganizationQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.list('costCenter', companyId, query, principal);
  }

  @Post()
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCostCenterDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Cost center created successfully',
      data: await this.organization.create(
        'costCenter',
        companyId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':entityId')
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: UpdateCostCenterDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Cost center updated successfully',
      data: await this.organization.update(
        'costCenter',
        companyId,
        entityId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':entityId')
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Cost center archived successfully',
      data: await this.organization.delete(
        'costCenter',
        companyId,
        entityId,
        principal,
      ),
    };
  }

  @Post(':entityId/restore')
  async restore(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Cost center restored successfully',
      data: await this.organization.restore(
        'costCenter',
        companyId,
        entityId,
        principal,
      ),
    };
  }
}
