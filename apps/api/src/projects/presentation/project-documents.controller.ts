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
  CreateProjectDocumentDto,
  UpdateProjectDocumentDto,
} from '../dto/project-document.dto';

@ApiTags('Project Documents')
@ApiBearerAuth()
@Controller('companies/:companyId/projects/:projectId/documents')
export class ProjectDocumentsController {
  constructor(
    @Inject(PROJECTS_SERVICE)
    private readonly projects: IProjectsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PROJECT_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.projects.listDocuments(companyId, projectId, principal),
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectDocumentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Document created successfully',
      data: await this.projects.createDocument(
        companyId,
        projectId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':documentId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateProjectDocumentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Document updated successfully',
      data: await this.projects.updateDocument(
        companyId,
        projectId,
        documentId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':documentId')
  @RequirePermissions(PERMISSIONS.PROJECT_EDIT)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Document archived successfully',
      data: await this.projects.deleteDocument(
        companyId,
        projectId,
        documentId,
        principal,
      ),
    };
  }
}
