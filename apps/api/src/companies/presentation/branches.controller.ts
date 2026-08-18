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
  CreateBranchDto,
  OrganizationQueryDto,
  UpdateBranchDto,
} from '../dto/organization.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('companies/:companyId/branches')
@RequirePermissions(PERMISSIONS.BRANCH_MANAGE)
export class BranchesController {
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
    return this.organization.list('branch', companyId, query, principal);
  }

  @Get(':entityId')
  get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.get('branch', companyId, entityId, principal);
  }

  @Post()
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateBranchDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Branch created successfully',
      data: await this.organization.create('branch', companyId, dto, principal),
    };
  }

  @Patch(':entityId')
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: UpdateBranchDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Branch updated successfully',
      data: await this.organization.update(
        'branch',
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
      message: 'Branch archived successfully',
      data: await this.organization.delete(
        'branch',
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
      message: 'Branch restored successfully',
      data: await this.organization.restore(
        'branch',
        companyId,
        entityId,
        principal,
      ),
    };
  }
}
