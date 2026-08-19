import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  AssignOpportunityDto,
  ChangeOpportunityStageDto,
  ConvertLeadToOpportunityDto,
  CreateOpportunityDto,
  MarkOpportunityLostDto,
  MarkOpportunityWonDto,
  OpportunityAttachmentDto,
  OpportunityCatalogQueryDto,
  OpportunityForecastQueryDto,
  OpportunityNoteDto,
  OpportunityQueryDto,
  ReopenOpportunityDto,
  UpdateOpportunityDto,
} from './opportunity.dto';
import { OpportunityService } from './opportunity.service';

@ApiTags('CRM Opportunities')
@ApiBearerAuth()
@Controller('companies/:companyId/crm/opportunities')
export class OpportunityController {
  constructor(private readonly opportunities: OpportunityService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OpportunityQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = await this.opportunities.list(companyId, query, principal);
    return { data: result.data, pagination: result.meta };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_CREATE)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateOpportunityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Opportunity created successfully.',
      data: await this.opportunities.create(companyId, dto, principal),
    };
  }

  @Get('dashboard')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_VIEW_FORECAST,
  )
  async dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.opportunities.dashboard(companyId, principal) };
  }

  @Get('pipeline')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_VIEW_FORECAST,
  )
  async pipeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.opportunities.pipeline(companyId, principal) };
  }

  @Get('forecast')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_VIEW_FORECAST,
  )
  async forecast(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OpportunityForecastQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.opportunities.forecast(
        companyId,
        query.month,
        principal,
      ),
    };
  }

  @Get('export')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_EXPORT)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="opportunities.csv"')
  async export(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OpportunityQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.opportunities.exportCsv(companyId, query, principal);
  }

  @Get('catalog')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_VIEW)
  async catalog(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: OpportunityCatalogQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.opportunities.catalog(
        companyId,
        query.includeInactive,
        principal,
      ),
    };
  }

  @Get('assignees')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_VIEW)
  async assignees(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.opportunities.assignees(companyId, principal) };
  }

  @Get('convert-preview/:leadId')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_CONVERT_LEAD,
  )
  async convertPreview(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.opportunities.convertPreview(
        companyId,
        leadId,
        principal,
      ),
    };
  }

  @Post('convert')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_CONVERT_LEAD,
  )
  async convert(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: ConvertLeadToOpportunityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Lead converted to opportunity successfully.',
      data: await this.opportunities.convertLead(companyId, dto, principal),
    };
  }

  @Get(':opportunityId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_VIEW)
  async get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.opportunities.get(companyId, opportunityId, principal),
    };
  }

  @Patch(':opportunityId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Opportunity updated successfully.',
      data: await this.opportunities.update(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':opportunityId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_DELETE)
  async remove(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Opportunity archived successfully.',
      data: await this.opportunities.remove(
        companyId,
        opportunityId,
        principal,
      ),
    };
  }

  @Patch(':opportunityId/assignment')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_ASSIGN)
  async assign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: AssignOpportunityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: dto.assignedToId
        ? 'Opportunity assigned successfully.'
        : 'Opportunity unassigned successfully.',
      data: await this.opportunities.assign(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':opportunityId/stage')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_CHANGE_STAGE,
  )
  async changeStage(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: ChangeOpportunityStageDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Opportunity stage updated successfully.',
      data: await this.opportunities.changeStage(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':opportunityId/won')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_MARK_WON,
  )
  async markWon(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: MarkOpportunityWonDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Opportunity marked as won.',
      data: await this.opportunities.markWon(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':opportunityId/lost')
  @RequirePermissions(
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_OPPORTUNITY_MARK_LOST,
  )
  async markLost(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: MarkOpportunityLostDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Opportunity marked as lost.',
      data: await this.opportunities.markLost(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':opportunityId/reopen')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_REOPEN)
  async reopen(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: ReopenOpportunityDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Opportunity reopened successfully.',
      data: await this.opportunities.reopen(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  // Opportunity activities/follow-ups are served by the shared CRM
  // Activities API: GET/POST /companies/:companyId/crm/activities with
  // relatedType=OPPORTUNITY&opportunityId=:opportunityId. Do not add
  // per-opportunity activity routes here.

  @Post(':opportunityId/notes')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_EDIT)
  async addNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: OpportunityNoteDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Note added successfully.',
      data: await this.opportunities.addNote(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  @Patch(':opportunityId/notes/:noteId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_EDIT)
  async updateNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: OpportunityNoteDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Note updated successfully.',
      data: await this.opportunities.updateNote(
        companyId,
        opportunityId,
        noteId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':opportunityId/notes/:noteId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_EDIT)
  async deleteNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Note deleted successfully.',
      data: await this.opportunities.deleteNote(
        companyId,
        opportunityId,
        noteId,
        principal,
      ),
    };
  }

  @Post(':opportunityId/attachments')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_EDIT)
  async addAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: OpportunityAttachmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Attachment added successfully.',
      data: await this.opportunities.addAttachment(
        companyId,
        opportunityId,
        dto,
        principal,
      ),
    };
  }

  @Delete(':opportunityId/attachments/:attachmentId')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_EDIT)
  async deleteAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Attachment removed successfully.',
      data: await this.opportunities.deleteAttachment(
        companyId,
        opportunityId,
        attachmentId,
        principal,
      ),
    };
  }

  @Get(':opportunityId/timeline')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_VIEW)
  async timeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.opportunities.timeline(
        companyId,
        opportunityId,
        principal,
      ),
    };
  }

  @Get(':opportunityId/stage-history')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_OPPORTUNITY_VIEW)
  async stageHistory(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.opportunities.stageHistory(
        companyId,
        opportunityId,
        principal,
      ),
    };
  }
}
