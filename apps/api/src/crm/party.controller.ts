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
  ContactCompanyLinkDto,
  CreateCrmCompanyDto,
  CreateCrmContactDto,
  CrmCompanyDuplicateQueryDto,
  CrmCompanyQueryDto,
  CrmContactDuplicateQueryDto,
  CrmContactQueryDto,
  CrmGlobalSearchDto,
  LinkLeadPartiesDto,
  PartyAssignmentDto,
  PartyAttachmentDto,
  PartyCatalogQueryDto,
  PartyNoteDto,
  PrimaryContactDto,
  UpdateCrmCompanyDto,
  UpdateCrmContactDto,
} from './party.dto';
import { PartyService } from './party.service';

@ApiTags('CRM Companies & Contacts')
@ApiBearerAuth()
@Controller('companies/:companyId/crm')
export class PartyController {
  constructor(private readonly parties: PartyService) {}

  @Get('search')
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  async search(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: CrmGlobalSearchDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.globalSearch(
        companyId,
        query.q,
        query.limit,
        principal,
      ),
    };
  }

  @Get('catalog')
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  async catalog(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: PartyCatalogQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.catalog(
        companyId,
        query.includeInactive,
        principal,
      ),
    };
  }
  @Get('assignees')
  @RequirePermissions(PERMISSIONS.CRM_VIEW)
  async assignees(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.parties.assignees(companyId, principal) };
  }

  @Get('companies')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_VIEW)
  async listCompanies(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: CrmCompanyQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = await this.parties.listCompanies(
      companyId,
      query,
      principal,
    );
    return { data: result.data, pagination: result.meta };
  }
  @Post('companies')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_CREATE)
  async createCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCrmCompanyDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'CRM company created successfully.',
      data: await this.parties.createCompany(companyId, dto, principal),
    };
  }
  @Get('companies/duplicate-check')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_VIEW)
  async companyDuplicates(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: CrmCompanyDuplicateQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.companyDuplicateCheck(
        companyId,
        query,
        principal,
      ),
    };
  }
  @Get('companies/:id')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_VIEW)
  async getCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.parties.getCompany(companyId, id, principal) };
  }
  @Patch('companies/:id')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_EDIT)
  async updateCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmCompanyDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'CRM company updated successfully.',
      data: await this.parties.updateCompany(companyId, id, dto, principal),
    };
  }
  @Delete('companies/:id')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_DELETE)
  async deleteCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'CRM company archived successfully.',
      data: await this.parties.deleteCompany(companyId, id, principal),
    };
  }
  @Patch('companies/:id/assignment')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_ASSIGN)
  async assignCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartyAssignmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.assignCompany(companyId, id, dto, principal),
    };
  }
  @Post('companies/:id/primary-contacts')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_EDIT)
  async primaryContact(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrimaryContactDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.setPrimaryContact(companyId, id, dto, principal),
    };
  }
  @Post('companies/:id/notes')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_EDIT)
  async companyNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartyNoteDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.addCompanyNote(companyId, id, dto, principal),
    };
  }
  @Post('companies/:id/attachments')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_EDIT)
  async companyAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartyAttachmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.addCompanyAttachment(
        companyId,
        id,
        dto,
        principal,
      ),
    };
  }
  @Get('companies/:id/timeline')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_COMPANY_VIEW)
  async companyTimeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.timeline(companyId, 'CrmCompany', id, principal),
    };
  }

  @Get('contacts')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_VIEW)
  async listContacts(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: CrmContactQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = await this.parties.listContacts(companyId, query, principal);
    return { data: result.data, pagination: result.meta };
  }
  @Post('contacts')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_CREATE)
  async createContact(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCrmContactDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'CRM contact created successfully.',
      data: await this.parties.createContact(companyId, dto, principal),
    };
  }
  @Get('contacts/duplicate-check')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_VIEW)
  async contactDuplicates(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: CrmContactDuplicateQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.contactDuplicateCheck(
        companyId,
        query,
        principal,
      ),
    };
  }
  @Get('contacts/:id')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_VIEW)
  async getContact(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.parties.getContact(companyId, id, principal) };
  }
  @Patch('contacts/:id')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_EDIT)
  async updateContact(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmContactDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'CRM contact updated successfully.',
      data: await this.parties.updateContact(companyId, id, dto, principal),
    };
  }
  @Delete('contacts/:id')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_DELETE)
  async deleteContact(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'CRM contact archived successfully.',
      data: await this.parties.deleteContact(companyId, id, principal),
    };
  }
  @Patch('contacts/:id/assignment')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_ASSIGN)
  async assignContact(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartyAssignmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.assignContact(companyId, id, dto, principal),
    };
  }
  @Patch('contacts/:id/company')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_EDIT)
  async linkContact(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContactCompanyLinkDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.linkContact(companyId, id, dto, principal),
    };
  }
  @Post('contacts/:id/notes')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_EDIT)
  async contactNote(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartyNoteDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.addContactNote(companyId, id, dto, principal),
    };
  }
  @Post('contacts/:id/attachments')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_EDIT)
  async contactAttachment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PartyAttachmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.addContactAttachment(
        companyId,
        id,
        dto,
        principal,
      ),
    };
  }
  @Get('contacts/:id/timeline')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_CONTACT_VIEW)
  async contactTimeline(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.parties.timeline(companyId, 'CrmContact', id, principal),
    };
  }

  @Patch('leads/:leadId/parties')
  @RequirePermissions(PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_LEAD_EDIT)
  async linkLead(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: LinkLeadPartiesDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Lead company/contact links updated.',
      data: await this.parties.linkLead(companyId, leadId, dto, principal),
    };
  }
}
