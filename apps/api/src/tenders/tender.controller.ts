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
  AssignTenderTeamDto,
  AwardTenderDto,
  BidDecisionDto,
  CancelTenderDto,
  ChangeRequirementStatusDto,
  ChangeTenderStatusDto,
  CreateTenderDto,
  CreateTenderRequirementDto,
  LoseTenderDto,
  PreBidMeetingDto,
  SiteVisitDto,
  SubmitTenderDto,
  TenderAttachmentDto,
  TenderCalendarQueryDto,
  TenderDashboardQueryDto,
  TenderQueryDto,
  UpdateTenderDto,
  UpdatePreBidMeetingDto,
  UpdateSiteVisitDto,
  UpdateTenderRequirementDto,
} from './tender.dto';
import { TenderService } from './tender.service';

@ApiTags('Tenders')
@ApiBearerAuth()
@Controller('companies/:companyId/tenders')
export class TenderController {
  constructor(private readonly tenders: TenderService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: TenderQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = await this.tenders.list(companyId, query, principal);
    return { data: result.data, pagination: result.meta };
  }
  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: TenderDashboardQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.tenders.dashboard(companyId, query, principal) };
  }
  @Get('mine')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async mine(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: TenderQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = await this.tenders.mine(companyId, query, principal);
    return { data: result.data, pagination: result.meta };
  }
  @Get('calendar')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async calendar(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: TenderCalendarQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.tenders.calendar(companyId, query, principal) };
  }
  @Get('pipeline')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async pipeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: TenderQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.tenders.pipeline(companyId, query, principal) };
  }
  @Post()
  @RequirePermissions(PERMISSIONS.TENDER_CREATE)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateTenderDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Tender created successfully.',
      data: await this.tenders.create(companyId, dto, principal),
    };
  }
  @Get('opportunities/:opportunityId/prefill')
  @RequirePermissions(
    PERMISSIONS.TENDER_CREATE,
    PERMISSIONS.CRM_OPPORTUNITY_VIEW,
  )
  async prefill(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.prefill(companyId, opportunityId, principal),
    };
  }
  @Get(':tenderId')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.tenders.get(companyId, tenderId, principal) };
  }
  @Patch(':tenderId')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: UpdateTenderDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Tender updated successfully.',
      data: await this.tenders.update(companyId, tenderId, dto, principal),
    };
  }
  @Delete(':tenderId')
  @RequirePermissions(PERMISSIONS.TENDER_DELETE)
  async archive(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Tender archived successfully.',
      data: await this.tenders.archive(companyId, tenderId, principal),
    };
  }
  @Patch(':tenderId/status')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async status(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: ChangeTenderStatusDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.changeStatus(
        companyId,
        tenderId,
        dto,
        principal,
      ),
    };
  }
  @Post(':tenderId/bid-decision')
  @RequirePermissions(PERMISSIONS.TENDER_BID_DECISION)
  async bid(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: BidDecisionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.bidDecision(companyId, tenderId, dto, principal),
    };
  }

  @Get(':tenderId/team')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async team(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.tenders.team(companyId, tenderId, principal) };
  }
  @Post(':tenderId/team')
  @RequirePermissions(PERMISSIONS.TENDER_ASSIGN)
  async assign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: AssignTenderTeamDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.assignTeam(companyId, tenderId, dto, principal),
    };
  }
  @Delete(':tenderId/team/:memberId')
  @RequirePermissions(PERMISSIONS.TENDER_ASSIGN)
  async unassign(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.removeTeam(
        companyId,
        tenderId,
        memberId,
        principal,
      ),
    };
  }

  @Get(':tenderId/requirements')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async requirements(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.requirements(companyId, tenderId, principal),
    };
  }
  @Post(':tenderId/requirements')
  @RequirePermissions(PERMISSIONS.TENDER_REQUIREMENTS)
  async createRequirement(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: CreateTenderRequirementDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.createRequirement(
        companyId,
        tenderId,
        dto,
        principal,
      ),
    };
  }
  @Patch(':tenderId/requirements/:requirementId')
  @RequirePermissions(PERMISSIONS.TENDER_REQUIREMENTS)
  async updateRequirement(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: UpdateTenderRequirementDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.updateRequirement(
        companyId,
        tenderId,
        requirementId,
        dto,
        principal,
      ),
    };
  }
  @Patch(':tenderId/requirements/:requirementId/status')
  @RequirePermissions(PERMISSIONS.TENDER_REQUIREMENTS)
  async requirementStatus(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: ChangeRequirementStatusDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.requirementStatus(
        companyId,
        tenderId,
        requirementId,
        dto,
        principal,
      ),
    };
  }
  @Delete(':tenderId/requirements/:requirementId')
  @RequirePermissions(PERMISSIONS.TENDER_REQUIREMENTS)
  async deleteRequirement(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.deleteRequirement(
        companyId,
        tenderId,
        requirementId,
        principal,
      ),
    };
  }

  @Post(':tenderId/submit')
  @RequirePermissions(PERMISSIONS.TENDER_SUBMIT)
  async submit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: SubmitTenderDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Tender submitted successfully.',
      data: await this.tenders.submit(companyId, tenderId, dto, principal),
    };
  }
  @Post(':tenderId/award')
  @RequirePermissions(PERMISSIONS.TENDER_MARK_AWARDED)
  async award(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: AwardTenderDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.award(companyId, tenderId, dto, principal),
    };
  }
  @Post(':tenderId/lost')
  @RequirePermissions(PERMISSIONS.TENDER_MARK_LOST)
  async lose(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: LoseTenderDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.lose(companyId, tenderId, dto, principal),
    };
  }
  @Post(':tenderId/cancel')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async cancel(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: CancelTenderDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.cancel(companyId, tenderId, dto, principal),
    };
  }

  @Get(':tenderId/attachments')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async attachments(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.attachments(companyId, tenderId, principal),
    };
  }
  @Post(':tenderId/attachments')
  @RequirePermissions(PERMISSIONS.TENDER_DOCUMENTS)
  async attach(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: TenderAttachmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.attach(companyId, tenderId, dto, principal),
    };
  }
  @Delete(':tenderId/attachments/:attachmentId')
  @RequirePermissions(PERMISSIONS.TENDER_DOCUMENTS)
  async removeAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.removeAttachment(
        companyId,
        tenderId,
        attachmentId,
        principal,
      ),
    };
  }
  @Post(':tenderId/site-visits')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async siteVisit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: SiteVisitDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.addSiteVisit(
        companyId,
        tenderId,
        dto,
        principal,
      ),
    };
  }
  @Get(':tenderId/site-visits')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async siteVisits(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.siteVisits(companyId, tenderId, principal),
    };
  }
  @Patch(':tenderId/site-visits/:visitId')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async updateSiteVisit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: UpdateSiteVisitDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.updateSiteVisit(
        companyId,
        tenderId,
        visitId,
        dto,
        principal,
      ),
    };
  }
  @Delete(':tenderId/site-visits/:visitId')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async archiveSiteVisit(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.archiveSiteVisit(
        companyId,
        tenderId,
        visitId,
        principal,
      ),
    };
  }
  @Post(':tenderId/pre-bid-meetings')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async preBid(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Body() dto: PreBidMeetingDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.addPreBidMeeting(
        companyId,
        tenderId,
        dto,
        principal,
      ),
    };
  }
  @Get(':tenderId/pre-bid-meetings')
  @RequirePermissions(PERMISSIONS.TENDER_VIEW)
  async preBidMeetings(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.preBidMeetings(companyId, tenderId, principal),
    };
  }
  @Patch(':tenderId/pre-bid-meetings/:meetingId')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async updatePreBidMeeting(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: UpdatePreBidMeetingDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.updatePreBidMeeting(
        companyId,
        tenderId,
        meetingId,
        dto,
        principal,
      ),
    };
  }
  @Delete(':tenderId/pre-bid-meetings/:meetingId')
  @RequirePermissions(PERMISSIONS.TENDER_EDIT)
  async archivePreBidMeeting(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('tenderId', ParseUUIDPipe) tenderId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.tenders.archivePreBidMeeting(
        companyId,
        tenderId,
        meetingId,
        principal,
      ),
    };
  }
}
