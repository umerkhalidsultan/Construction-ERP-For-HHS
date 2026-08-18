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
  CreateDesignationDto,
  OrganizationQueryDto,
  UpdateDesignationDto,
} from '../dto/organization.dto';

@ApiTags('Designations')
@ApiBearerAuth()
@Controller('companies/:companyId/designations')
@RequirePermissions(PERMISSIONS.DESIGNATION_MANAGE)
export class DesignationsController {
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
    return this.organization.list('designation', companyId, query, principal);
  }

  @Post()
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateDesignationDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Designation created successfully',
      data: await this.organization.create(
        'designation',
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
    @Body() dto: UpdateDesignationDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Designation updated successfully',
      data: await this.organization.update(
        'designation',
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
      message: 'Designation archived successfully',
      data: await this.organization.delete(
        'designation',
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
      message: 'Designation restored successfully',
      data: await this.organization.restore(
        'designation',
        companyId,
        entityId,
        principal,
      ),
    };
  }
}
