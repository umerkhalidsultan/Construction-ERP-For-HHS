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
  CreateDepartmentDto,
  OrganizationQueryDto,
  UpdateDepartmentDto,
} from '../dto/organization.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('companies/:companyId/departments')
@RequirePermissions(PERMISSIONS.DEPARTMENT_MANAGE)
export class DepartmentsController {
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
    return this.organization.list('department', companyId, query, principal);
  }

  @Get(':entityId')
  get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.organization.get('department', companyId, entityId, principal);
  }

  @Post()
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Department created successfully',
      data: await this.organization.create(
        'department',
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
    @Body() dto: UpdateDepartmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Department updated successfully',
      data: await this.organization.update(
        'department',
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
      message: 'Department archived successfully',
      data: await this.organization.delete(
        'department',
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
      message: 'Department restored successfully',
      data: await this.organization.restore(
        'department',
        companyId,
        entityId,
        principal,
      ),
    };
  }
}
