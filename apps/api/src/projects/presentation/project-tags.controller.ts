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
  CreateProjectTagDto,
  UpdateProjectTagDto,
} from '../dto/project-tag.dto';

@ApiTags('Project Tags')
@ApiBearerAuth()
@Controller('companies/:companyId/project-tags')
export class ProjectTagsController {
  constructor(
    @Inject(PROJECTS_SERVICE)
    private readonly projects: IProjectsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.listTags(companyId, principal),
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_SETTINGS)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateProjectTagDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project tag created successfully',
      data: await this.projects.createTag(companyId, dto, principal),
    };
  }

  @Patch(':tagId')
  @RequirePermissions(PERMISSIONS.PROJECT_SETTINGS)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @Body() dto: UpdateProjectTagDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project tag updated successfully',
      data: await this.projects.updateTag(companyId, tagId, dto, principal),
    };
  }

  @Delete(':tagId')
  @RequirePermissions(PERMISSIONS.PROJECT_SETTINGS)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project tag archived successfully',
      data: await this.projects.deleteTag(companyId, tagId, principal),
    };
  }
}
