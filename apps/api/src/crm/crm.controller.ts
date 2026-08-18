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
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { CurrentPrincipal } from '../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../permissions/permission.constants';
import {
  AssignLeadDto,
  CatalogQueryDto,
  ChangeLeadStatusDto,
  CreateLeadDto,
  DuplicateLeadQueryDto,
  LeadAttachmentDto,
  LeadNoteDto,
  LeadQueryDto,
  UpdateLeadDto,
} from './lead.dto';
import { LeadService } from './lead.service';

@ApiTags('CRM Leads')
@ApiBearerAuth()
@Controller('companies/:companyId/crm/leads')
export class CrmController {
  constructor(private readonly leads: LeadService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: LeadQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = await this.leads.list(companyId, query, principal);
    return { data: result.data, pagination: result.meta };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_CREATE)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateLeadDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Lead created successfully.',
      data: await this.leads.create(companyId, dto, principal),
    };
  }

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_VIEW)
  async dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.leads.dashboard(companyId, principal) };
  }

  @Get('catalog')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_VIEW)
  async catalog(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: CatalogQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.leads.catalog(
        companyId,
        query.includeInactive,
        principal,
      ),
    };
  }

  @Get('assignees')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_VIEW)
  async assignees(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.leads.assignees(companyId, principal) };
  }

  @Get('duplicate-check')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_VIEW)
  async duplicateCheck(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: DuplicateLeadQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.leads.duplicateCheck(companyId, query, principal),
    };
  }

  @Get(':leadId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_VIEW)
  async get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.leads.get(companyId, leadId, principal) };
  }

  @Patch(':leadId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: UpdateLeadDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Lead updated successfully.',
      data: await this.leads.update(companyId, leadId, dto, principal),
    };
  }

  @Delete(':leadId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_DELETE)
  async remove(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Lead archived successfully.',
      data: await this.leads.remove(companyId, leadId, principal),
    };
  }

  @Patch(':leadId/assignment')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_ASSIGN)
  async assign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: AssignLeadDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: dto.assignedToId
        ? 'Lead assigned successfully.'
        : 'Lead unassigned successfully.',
      data: await this.leads.assign(companyId, leadId, dto, principal),
    };
  }

  @Patch(':leadId/status')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_CHANGE_STATUS)
  async changeStatus(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: ChangeLeadStatusDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Lead status updated successfully.',
      data: await this.leads.changeStatus(companyId, leadId, dto, principal),
    };
  }

  @Post(':leadId/notes')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_EDIT)
  async addNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: LeadNoteDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Note added successfully.',
      data: await this.leads.addNote(companyId, leadId, dto, principal),
    };
  }

  @Patch(':leadId/notes/:noteId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_EDIT)
  async updateNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: LeadNoteDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Note updated successfully.',
      data: await this.leads.updateNote(
        companyId,
        leadId,
        noteId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':leadId/notes/:noteId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_DELETE)
  async deleteNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Note deleted successfully.',
      data: await this.leads.deleteNote(companyId, leadId, noteId, principal),
    };
  }

  @Post(':leadId/attachments')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_EDIT)
  async addAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: LeadAttachmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Attachment added successfully.',
      data: await this.leads.addAttachment(companyId, leadId, dto, principal),
    };
  }

  @Get(':leadId/timeline')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_VIEW)
  async timeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.leads.timeline(companyId, leadId, principal) };
  }
}
