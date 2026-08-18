import {
  Body,
  Controller,
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
  CompleteInspectionDto,
  CreateChecklistTemplateDto,
  CreateCorrectiveActionDto,
  CreateInspectionDto,
  CreateItpDto,
  CreateNcrDto,
  CreateQualityIssueDto,
  CreateQualityPlanDto,
  CreateQualitySampleDto,
  CreateQualitySubmittalDto,
  CreateQualityStandardDto,
  CreateReworkDto,
  CreateTestDefinitionDto,
  CreateTestResultDto,
  LinkQualityEvidenceDto,
  OverrideTestResultDto,
  QualityDecisionDto,
  QualityPageQueryDto,
  UpdateCorrectiveActionDto,
  UpdateItpDto,
  UpdateNcrDto,
  UpdateQualityIssueDto,
  UpdateQualityPlanDto,
  UpdateQualitySubmittalDto,
} from './quality.dto';
import { QualityService } from './quality.service';

@ApiTags('QA/QC Quality Management')
@ApiBearerAuth()
@Controller('companies/:companyId/projects/:projectId/quality')
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.wrap(this.quality.dashboard(companyId, projectId));
  }

  @Get('standards')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  standards(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.wrap(this.quality.listStandards(companyId));
  }

  @Post('standards')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createStandard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateQualityStandardDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createStandard(companyId, dto, principal),
      'Quality standard created successfully',
    );
  }

  @Get('plans')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  plans(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.wrap(this.quality.listPlans(companyId, projectId));
  }

  @Post('plans')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createPlan(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateQualityPlanDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createPlan(companyId, projectId, dto, principal),
      'Quality plan created successfully',
    );
  }

  @Patch('plans/:id')
  @RequirePermissions(PERMISSIONS.QUALITY_EDIT)
  updatePlan(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQualityPlanDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.updatePlan(companyId, projectId, id, dto, principal),
      'Quality plan updated successfully',
    );
  }

  @Post('plans/:id/approve')
  @RequirePermissions(PERMISSIONS.QUALITY_APPROVE)
  approvePlan(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.approvePlan(companyId, projectId, id, principal),
      'Quality plan approved successfully',
    );
  }

  @Get('itps')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  itps(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QualityPageQueryDto,
  ) {
    return this.page(this.quality.listItps(companyId, projectId, query));
  }

  @Post('itps')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createItp(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateItpDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createItp(companyId, projectId, dto, principal),
      'ITP created successfully',
    );
  }

  @Patch('itps/:id')
  @RequirePermissions(PERMISSIONS.QUALITY_EDIT)
  updateItp(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItpDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.updateItp(companyId, projectId, id, dto, principal),
      'ITP updated successfully',
    );
  }

  @Post('itps/:id/approve')
  @RequirePermissions(PERMISSIONS.QUALITY_APPROVE)
  approveItp(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.decideItp(companyId, projectId, id, true, principal),
      'ITP approved successfully',
    );
  }

  @Post('itps/:id/reject')
  @RequirePermissions(PERMISSIONS.QUALITY_REJECT)
  rejectItp(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.decideItp(companyId, projectId, id, false, principal),
      'ITP rejected',
    );
  }

  @Get('checklists')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  checklists(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.wrap(this.quality.listChecklists(companyId, projectId));
  }

  @Post('checklists')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createChecklist(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateChecklistTemplateDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createChecklist(companyId, projectId, dto, principal),
      'Checklist created successfully',
    );
  }

  @Get('inspections')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  inspections(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QualityPageQueryDto,
  ) {
    return this.page(this.quality.listInspections(companyId, projectId, query));
  }

  @Get('inspections/:id')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  inspection(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wrap(this.quality.getInspection(companyId, projectId, id));
  }

  @Post('inspections')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createInspection(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateInspectionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createInspection(companyId, projectId, dto, principal),
      'Inspection request created successfully',
    );
  }

  @Patch('inspections/:id/outcome')
  @RequirePermissions(PERMISSIONS.QUALITY_INSPECT)
  completeInspection(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteInspectionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.completeInspection(companyId, projectId, id, dto, principal),
      'Inspection updated successfully',
    );
  }

  @Get('test-definitions')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  testDefinitions(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.wrap(this.quality.listTestDefinitions(companyId, projectId));
  }

  @Post('test-definitions')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createTestDefinition(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTestDefinitionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createTestDefinition(companyId, projectId, dto, principal),
      'Test definition created successfully',
    );
  }

  @Get('test-results')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  testResults(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QualityPageQueryDto,
  ) {
    return this.page(this.quality.listTestResults(companyId, projectId, query));
  }

  @Post('test-results')
  @RequirePermissions(PERMISSIONS.QUALITY_TEST_CREATE)
  createTestResult(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTestResultDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createTestResult(companyId, projectId, dto, principal),
      'Test result recorded successfully',
    );
  }

  @Post('test-results/:id/override')
  @RequirePermissions(PERMISSIONS.QUALITY_TEST_APPROVE)
  overrideTest(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideTestResultDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.overrideTestResult(companyId, projectId, id, dto, principal),
      'Test result override recorded',
    );
  }

  @Get('ncrs')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  ncrs(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QualityPageQueryDto,
  ) {
    return this.page(this.quality.listNcrs(companyId, projectId, query));
  }

  @Post('ncrs')
  @RequirePermissions(PERMISSIONS.QUALITY_NCR_CREATE)
  createNcr(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateNcrDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createNcr(companyId, projectId, dto, principal),
      'NCR created successfully',
    );
  }

  @Patch('ncrs/:id')
  @RequirePermissions(PERMISSIONS.QUALITY_NCR_EDIT)
  updateNcr(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNcrDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.updateNcr(companyId, projectId, id, dto, principal),
      'NCR updated successfully',
    );
  }

  @Post('ncrs/:id/close')
  @RequirePermissions(PERMISSIONS.QUALITY_NCR_CLOSE)
  closeNcr(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.closeNcr(companyId, projectId, id, principal),
      'NCR closed successfully',
    );
  }

  @Post('ncrs/:ncrId/actions')
  @RequirePermissions(PERMISSIONS.QUALITY_NCR_EDIT)
  createAction(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('ncrId', ParseUUIDPipe) ncrId: string,
    @Body() dto: CreateCorrectiveActionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createAction(companyId, projectId, ncrId, dto, principal),
      'Corrective action created successfully',
    );
  }

  @Patch('actions/:id')
  @RequirePermissions(PERMISSIONS.QUALITY_NCR_EDIT)
  updateAction(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCorrectiveActionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.updateAction(companyId, projectId, id, dto, principal),
      'Corrective action updated successfully',
    );
  }

  @Get('issues')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  issues(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QualityPageQueryDto,
  ) {
    return this.page(this.quality.listIssues(companyId, projectId, query));
  }

  @Post('issues')
  @RequirePermissions(PERMISSIONS.QUALITY_DEFECT_CREATE)
  createIssue(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateQualityIssueDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createIssue(companyId, projectId, dto, principal),
      'Quality issue created successfully',
    );
  }

  @Patch('issues/:id')
  @RequirePermissions(PERMISSIONS.QUALITY_EDIT)
  updateIssue(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQualityIssueDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.updateIssue(companyId, projectId, id, dto, principal),
      'Quality issue updated successfully',
    );
  }

  @Post('issues/:id/close')
  @RequirePermissions(PERMISSIONS.QUALITY_DEFECT_CLOSE)
  closeIssue(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QualityDecisionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.closeIssue(
        companyId,
        projectId,
        id,
        dto.comments ?? '',
        principal,
      ),
      'Quality issue closed successfully',
    );
  }

  @Get('rework')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  rework(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.wrap(this.quality.listRework(companyId, projectId));
  }

  @Post('rework')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createRework(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateReworkDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createRework(companyId, projectId, dto, principal),
      'Rework record created successfully',
    );
  }

  @Get('submittals')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  submittals(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: QualityPageQueryDto,
  ) {
    return this.page(this.quality.listSubmittals(companyId, projectId, query));
  }

  @Post('submittals')
  @RequirePermissions(PERMISSIONS.QUALITY_CREATE)
  createSubmittal(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateQualitySubmittalDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createSubmittal(companyId, projectId, dto, principal),
      'Quality submittal created successfully',
    );
  }

  @Patch('submittals/:id')
  @RequirePermissions(PERMISSIONS.QUALITY_EDIT)
  updateSubmittal(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQualitySubmittalDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.updateSubmittal(companyId, projectId, id, dto, principal),
      'Quality submittal updated successfully',
    );
  }

  @Post('submittals/:id/approve')
  @RequirePermissions(PERMISSIONS.QUALITY_APPROVE)
  approveSubmittal(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QualityDecisionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.decideSubmittal(
        companyId,
        projectId,
        id,
        true,
        dto.comments,
        principal,
      ),
      'Submittal approved successfully',
    );
  }

  @Post('submittals/:id/reject')
  @RequirePermissions(PERMISSIONS.QUALITY_REJECT)
  rejectSubmittal(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QualityDecisionDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.decideSubmittal(
        companyId,
        projectId,
        id,
        false,
        dto.comments,
        principal,
      ),
      'Submittal rejected',
    );
  }

  @Get('samples')
  @RequirePermissions(PERMISSIONS.QUALITY_VIEW)
  samples(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.wrap(this.quality.listSamples(companyId, projectId));
  }

  @Post('samples')
  @RequirePermissions(PERMISSIONS.QUALITY_TEST_CREATE)
  createSample(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateQualitySampleDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.createSample(companyId, projectId, dto, principal),
      'Quality sample recorded successfully',
    );
  }

  @Post('evidence')
  @RequirePermissions(PERMISSIONS.QUALITY_EDIT)
  evidence(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: LinkQualityEvidenceDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.wrap(
      this.quality.linkEvidence(companyId, projectId, dto, principal),
      'Evidence linked successfully',
    );
  }

  private async wrap<T>(promise: Promise<T> | T, message?: string) {
    return { data: await promise, ...(message ? { message } : {}) };
  }
  private async page<T>(
    promise: Promise<{
      items: T[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>,
  ) {
    const result = await promise;
    return {
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }
}
