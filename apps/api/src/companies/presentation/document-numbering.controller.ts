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
import type { IDocumentNumberingService } from '../application/document-numbering.service.interface';
import { DOCUMENT_NUMBERING_SERVICE } from '../application/document-numbering.service.interface';
import {
  AllocateDocumentNumberDto,
  CreateDocumentSequenceDto,
  UpdateDocumentSequenceDto,
} from '../dto/document-sequence.dto';

@ApiTags('Document Numbering')
@ApiBearerAuth()
@Controller('companies/:companyId/document-sequences')
@RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
export class DocumentNumberingController {
  constructor(
    @Inject(DOCUMENT_NUMBERING_SERVICE)
    private readonly numbering: IDocumentNumberingService,
  ) {}

  @Get()
  list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.numbering.list(companyId, principal);
  }

  @Post()
  create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateDocumentSequenceDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.numbering.create(companyId, dto, principal);
  }

  @Post('allocate')
  allocate(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: AllocateDocumentNumberDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.numbering.allocate(companyId, dto, principal);
  }

  @Patch(':sequenceId')
  update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('sequenceId', ParseUUIDPipe) sequenceId: string,
    @Body() dto: UpdateDocumentSequenceDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.numbering.update(companyId, sequenceId, dto, principal);
  }

  @Delete(':sequenceId')
  delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('sequenceId', ParseUUIDPipe) sequenceId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.numbering.delete(companyId, sequenceId, principal);
  }
}
