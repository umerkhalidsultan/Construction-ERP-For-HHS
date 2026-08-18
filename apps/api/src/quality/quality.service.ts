import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  QualityInspectionStatus,
  QualityNcrStatus,
  QualityPlanStatus,
  QualityResultStatus,
} from '@prisma/client';
import type { IAuditService } from '../audit/audit.interface';
import { AUDIT_SERVICE } from '../audit/audit.interface';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import {
  BusinessRuleError,
  ConflictAppError,
  NotFoundAppError,
} from '../common/errors/app-errors';
import { PrismaService } from '../prisma/prisma.service';
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
  QualityPageQueryDto,
  UpdateCorrectiveActionDto,
  UpdateItpDto,
  UpdateNcrDto,
  UpdateQualityIssueDto,
  UpdateQualityPlanDto,
  UpdateQualitySubmittalDto,
} from './quality.dto';
import { QUALITY_INTEGRATION } from './quality-integration.port';
import type { QualityIntegrationPort } from './quality-integration.port';

const terminalInspectionStatuses = new Set<QualityInspectionStatus>([
  QualityInspectionStatus.PASSED,
  QualityInspectionStatus.PASSED_WITH_COMMENTS,
  QualityInspectionStatus.REJECTED,
  QualityInspectionStatus.REINSPECTION_REQUIRED,
  QualityInspectionStatus.CANCELLED,
  QualityInspectionStatus.CLOSED,
]);
const outcomeInspectionStatuses = new Set<QualityInspectionStatus>([
  QualityInspectionStatus.PASSED,
  QualityInspectionStatus.PASSED_WITH_COMMENTS,
  QualityInspectionStatus.REJECTED,
  QualityInspectionStatus.REINSPECTION_REQUIRED,
]);

@Injectable()
export class QualityService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_SERVICE) private readonly audit: IAuditService,
    @Inject(QUALITY_INTEGRATION)
    private readonly integration: QualityIntegrationPort,
  ) {}

  async dashboard(companyId: string, projectId: string) {
    await this.requireProject(companyId, projectId);
    const now = new Date();
    const [
      inspectionGroups,
      ncrGroups,
      issueGroups,
      testGroups,
      overdueNcrs,
      rework,
    ] = await Promise.all([
      this.prisma.qualityInspection.groupBy({
        by: ['status'],
        where: { companyId, projectId, deletedAt: null },
        _count: true,
      }),
      this.prisma.qualityNcr.groupBy({
        by: ['status', 'severity'],
        where: { companyId, projectId, deletedAt: null },
        _count: true,
      }),
      this.prisma.qualityIssue.groupBy({
        by: ['type', 'status'],
        where: { companyId, projectId, deletedAt: null },
        _count: true,
      }),
      this.prisma.qualityTestResult.groupBy({
        by: ['resultStatus'],
        where: { companyId, projectId, deletedAt: null },
        _count: true,
      }),
      this.prisma.qualityNcr.count({
        where: {
          companyId,
          projectId,
          deletedAt: null,
          dueDate: { lt: now },
          status: {
            notIn: [QualityNcrStatus.CLOSED, QualityNcrStatus.CANCELLED],
          },
        },
      }),
      this.prisma.qualityRework.aggregate({
        where: { companyId, projectId, deletedAt: null },
        _count: true,
        _sum: { totalCost: true },
      }),
    ]);
    const inspectionCount = inspectionGroups.reduce(
      (sum, row) => sum + row._count,
      0,
    );
    const passed = inspectionGroups
      .filter(
        (row) =>
          row.status === 'PASSED' || row.status === 'PASSED_WITH_COMMENTS',
      )
      .reduce((sum, row) => sum + row._count, 0);
    const tests = testGroups.reduce((sum, row) => sum + row._count, 0);
    const testsPassed =
      testGroups.find((row) => row.resultStatus === 'PASS')?._count ?? 0;
    return {
      inspections: this.countMap(inspectionGroups, 'status'),
      inspectionCount,
      inspectionPassRate: inspectionCount
        ? (passed / inspectionCount) * 100
        : 0,
      ncrs: ncrGroups,
      openNcrs: ncrGroups
        .filter((row) => !['CLOSED', 'CANCELLED'].includes(row.status))
        .reduce((sum, row) => sum + row._count, 0),
      criticalNcrs: ncrGroups
        .filter((row) => row.severity === 'CRITICAL' && row.status !== 'CLOSED')
        .reduce((sum, row) => sum + row._count, 0),
      overdueNcrs,
      issues: issueGroups,
      tests: this.countMap(testGroups, 'resultStatus'),
      testPassRate: tests ? (testsPassed / tests) * 100 : 0,
      reworkCount: rework._count,
      totalReworkCost: rework._sum.totalCost ?? 0,
    };
  }

  listStandards(companyId: string) {
    return this.prisma.qualityStandard.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ active: 'desc' }, { code: 'asc' }],
    });
  }

  async createStandard(
    companyId: string,
    dto: CreateQualityStandardDto,
    actor: AuthenticatedPrincipal,
  ) {
    return this.transactionCreate(
      companyId,
      'QualityStandard',
      'QualityStandardCreated',
      actor,
      (tx) =>
        tx.qualityStandard.create({
          data: {
            ...dto,
            code: dto.code.toUpperCase(),
            companyId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
    );
  }

  listPlans(companyId: string, projectId: string) {
    return this.prisma.qualityPlan.findMany({
      where: { companyId, projectId, deletedAt: null },
      orderBy: [{ planNumber: 'asc' }, { version: 'desc' }],
    });
  }

  async createPlan(
    companyId: string,
    projectId: string,
    dto: CreateQualityPlanDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId);
    return this.transactionCreate(
      companyId,
      'QualityPlan',
      'QualityPlanCreated',
      actor,
      (tx) =>
        tx.qualityPlan.create({
          data: {
            ...dto,
            effectiveDate: this.date(dto.effectiveDate),
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async updatePlan(
    companyId: string,
    projectId: string,
    id: string,
    dto: UpdateQualityPlanDto,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.requirePlan(companyId, projectId, id);
    if (dto.status === QualityPlanStatus.APPROVED) {
      throw new BusinessRuleError(
        'Use the quality-plan approval action to approve this plan.',
      );
    }
    if (
      previous.status === QualityPlanStatus.APPROVED &&
      dto.status !== QualityPlanStatus.SUPERSEDED
    ) {
      throw new BusinessRuleError(
        'Approved quality plans are immutable. Create a new version instead.',
      );
    }
    return this.transactionUpdate(
      companyId,
      'QualityPlan',
      'QualityPlanUpdated',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityPlan.update({
          where: { id },
          data: {
            ...dto,
            effectiveDate: this.date(dto.effectiveDate),
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async approvePlan(
    companyId: string,
    projectId: string,
    id: string,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.requirePlan(companyId, projectId, id);
    if (previous.status !== QualityPlanStatus.SUBMITTED)
      throw new BusinessRuleError(
        'Only a submitted quality plan can be approved.',
      );
    return this.transactionUpdate(
      companyId,
      'QualityPlan',
      'QualityPlanApproved',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityPlan.update({
          where: { id },
          data: {
            status: QualityPlanStatus.APPROVED,
            approvedBy: actor.userId,
            approvedAt: new Date(),
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  listItps(companyId: string, projectId: string, query: QualityPageQueryDto) {
    return this.paged(query, (skip, take) =>
      this.prisma.$transaction([
        this.prisma.qualityItp.findMany({
          where: {
            companyId,
            projectId,
            deletedAt: null,
            ...(query.status ? { status: query.status as never } : {}),
          },
          include: {
            wbs: { select: { id: true, code: true, name: true } },
            activity: { select: { id: true, activityCode: true, name: true } },
            _count: { select: { inspections: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.qualityItp.count({
          where: {
            companyId,
            projectId,
            deletedAt: null,
            ...(query.status ? { status: query.status as never } : {}),
          },
        }),
      ]),
    );
  }

  async createItp(
    companyId: string,
    projectId: string,
    dto: CreateItpDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.validateProjectReferences(companyId, projectId, dto);
    return this.transactionCreate(
      companyId,
      'QualityItp',
      'ITPCreated',
      actor,
      (tx) =>
        tx.qualityItp.create({
          data: {
            ...dto,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async updateItp(
    companyId: string,
    projectId: string,
    id: string,
    dto: UpdateItpDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.validateProjectReferences(companyId, projectId, dto);
    const previous = await this.prisma.qualityItp.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('ITP not found.');
    if (dto.status === 'APPROVED' || dto.status === 'REJECTED')
      throw new BusinessRuleError(
        'Use the ITP approval or rejection action for this decision.',
      );
    if (previous.status === 'APPROVED' && dto.status !== 'SUPERSEDED')
      throw new BusinessRuleError(
        'Approved ITPs are immutable. Create a new version instead.',
      );
    return this.transactionUpdate(
      companyId,
      'QualityItp',
      'ITPUpdated',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityItp.update({
          where: { id },
          data: { ...dto, updatedBy: actor.userId },
        }),
      projectId,
    );
  }

  async decideItp(
    companyId: string,
    projectId: string,
    id: string,
    approved: boolean,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualityItp.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('ITP not found.');
    if (previous.status !== 'SUBMITTED')
      throw new BusinessRuleError(
        'Only a submitted ITP can be approved or rejected.',
      );
    return this.transactionUpdate(
      companyId,
      'QualityItp',
      approved ? 'ITPApproved' : 'ITPRejected',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityItp.update({
          where: { id },
          data: {
            status: approved ? 'APPROVED' : 'REJECTED',
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  listChecklists(companyId: string, projectId: string) {
    return this.prisma.qualityChecklistTemplate.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ projectId }, { projectId: null }],
      },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }, { version: 'desc' }],
    });
  }

  async createChecklist(
    companyId: string,
    projectId: string,
    dto: CreateChecklistTemplateDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId);
    const { questions, ...template } = dto;
    if (!questions.length)
      throw new BusinessRuleError(
        'A checklist must contain at least one question.',
      );
    return this.transactionCreate(
      companyId,
      'QualityChecklistTemplate',
      'QualityChecklistCreated',
      actor,
      (tx) =>
        tx.qualityChecklistTemplate.create({
          data: {
            ...template,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
            questions: { create: questions },
          },
          include: { questions: true },
        }),
      projectId,
    );
  }

  listInspections(
    companyId: string,
    projectId: string,
    query: QualityPageQueryDto,
  ) {
    const where: Prisma.QualityInspectionWhereInput = {
      companyId,
      projectId,
      deletedAt: null,
      ...(query.status
        ? { status: query.status as QualityInspectionStatus }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                inspectionNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.paged(query, (skip, take) =>
      this.prisma.$transaction([
        this.prisma.qualityInspection.findMany({
          where,
          include: {
            itp: {
              select: { id: true, itpNumber: true, inspectionStage: true },
            },
            activity: { select: { id: true, activityCode: true, name: true } },
            _count: { select: { responses: true, evidence: true, ncrs: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.qualityInspection.count({ where }),
      ]),
    );
  }

  async getInspection(companyId: string, projectId: string, id: string) {
    const row = await this.prisma.qualityInspection.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
      include: {
        itp: true,
        checklistTemplate: {
          include: { questions: { orderBy: { sortOrder: 'asc' } } },
        },
        responses: true,
        evidence: { include: { document: true } },
        ncrs: true,
      },
    });
    if (!row) throw new NotFoundAppError('Inspection not found.');
    return row;
  }

  async createInspection(
    companyId: string,
    projectId: string,
    dto: CreateInspectionDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.validateProjectReferences(companyId, projectId, dto);
    if (dto.clientMutationId) {
      const existing = await this.prisma.qualityInspection.findFirst({
        where: { companyId, clientMutationId: dto.clientMutationId },
      });
      if (existing) return existing;
    }
    const itp = dto.itpId
      ? await this.prisma.qualityItp.findFirst({
          where: { id: dto.itpId, companyId, projectId, deletedAt: null },
        })
      : null;
    if (dto.itpId && !itp) throw new NotFoundAppError('ITP not found.');
    return this.transactionCreate(
      companyId,
      'QualityInspection',
      'InspectionRequestCreated',
      actor,
      (tx) =>
        tx.qualityInspection.create({
          data: {
            ...dto,
            requestedDate: new Date(dto.requestedDate),
            scheduledAt: dto.scheduledAt
              ? new Date(dto.scheduledAt)
              : undefined,
            requestedBy: actor.userId,
            controlPoint: dto.controlPoint ?? itp?.controlPoint,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async completeInspection(
    companyId: string,
    projectId: string,
    id: string,
    dto: CompleteInspectionDto,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.getInspection(companyId, projectId, id);
    if (
      terminalInspectionStatuses.has(previous.status) &&
      previous.status !== dto.status
    )
      throw new BusinessRuleError(
        'A completed inspection cannot be changed to another outcome.',
      );
    if (dto.syncVersion && dto.syncVersion !== previous.syncVersion)
      throw new ConflictAppError(
        'This inspection changed after it was downloaded. Refresh it before submitting.',
      );
    if (outcomeInspectionStatuses.has(dto.status)) {
      const required =
        previous.checklistTemplate?.questions.filter((item) => item.required) ??
        [];
      const answered = new Set(
        dto.responses?.map((item) => item.questionId) ??
          previous.responses.map((item) => item.questionId),
      );
      if (required.some((item) => !answered.has(item.id)))
        throw new BusinessRuleError(
          'Complete every required checklist item before recording the inspection outcome.',
        );
      if (
        (dto.status === QualityInspectionStatus.PASSED ||
          dto.status === QualityInspectionStatus.PASSED_WITH_COMMENTS) &&
        dto.responses?.some((item) => item.compliant === false)
      )
        throw new BusinessRuleError(
          'An inspection with failed checklist items cannot be marked as passed.',
        );
    }
    const completed = await this.prisma.$transaction(async (tx) => {
      if (dto.responses?.length) {
        for (const response of dto.responses) {
          await tx.qualityInspectionResponse.upsert({
            where: {
              inspectionId_questionId: {
                inspectionId: id,
                questionId: response.questionId,
              },
            },
            create: {
              ...response,
              answer: response.answer as Prisma.InputJsonValue,
              inspectionId: id,
              answeredBy: actor.userId,
              answeredAt: new Date(),
            },
            update: {
              ...response,
              answer: response.answer as Prisma.InputJsonValue,
              answeredBy: actor.userId,
              answeredAt: new Date(),
            },
          });
        }
      }
      const row = await tx.qualityInspection.update({
        where: { id },
        data: {
          status: dto.status,
          outcomeComments: dto.outcomeComments,
          completedAt: terminalInspectionStatuses.has(dto.status)
            ? new Date()
            : undefined,
          closedAt:
            dto.status === QualityInspectionStatus.CLOSED
              ? new Date()
              : undefined,
          syncVersion: { increment: 1 },
          updatedBy: actor.userId,
        },
      });
      await this.audit.record(tx, {
        companyId,
        action: `Quality.Inspection.${dto.status}`,
        entity: 'QualityInspection',
        entityId: id,
        oldValue: previous,
        newValue: row,
      });
      return row;
    });
    await this.emit(
      dto.status === QualityInspectionStatus.PASSED
        ? 'InspectionPassed'
        : dto.status === QualityInspectionStatus.REJECTED
          ? 'InspectionFailed'
          : 'InspectionCompleted',
      companyId,
      projectId,
      id,
      actor.userId,
    );
    return completed;
  }

  listTestDefinitions(companyId: string, projectId: string) {
    return this.prisma.qualityTestDefinition.findMany({
      where: {
        companyId,
        deletedAt: null,
        OR: [{ projectId }, { projectId: null }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTestDefinition(
    companyId: string,
    projectId: string,
    dto: CreateTestDefinitionDto,
    actor: AuthenticatedPrincipal,
  ) {
    if (
      dto.minValue !== undefined &&
      dto.maxValue !== undefined &&
      dto.minValue > dto.maxValue
    )
      throw new BusinessRuleError(
        'Minimum value cannot be greater than maximum value.',
      );
    return this.transactionCreate(
      companyId,
      'QualityTestDefinition',
      'TestDefinitionCreated',
      actor,
      (tx) =>
        tx.qualityTestDefinition.create({
          data: {
            ...dto,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  listTestResults(
    companyId: string,
    projectId: string,
    query: QualityPageQueryDto,
  ) {
    const where: Prisma.QualityTestResultWhereInput = {
      companyId,
      projectId,
      deletedAt: null,
      ...(query.status
        ? { resultStatus: query.status as QualityResultStatus }
        : {}),
    };
    return this.paged(query, (skip, take) =>
      this.prisma.$transaction([
        this.prisma.qualityTestResult.findMany({
          where,
          include: {
            definition: true,
            _count: { select: { evidence: true, ncrs: true } },
          },
          orderBy: { testDate: 'desc' },
          skip,
          take,
        }),
        this.prisma.qualityTestResult.count({ where }),
      ]),
    );
  }

  async createTestResult(
    companyId: string,
    projectId: string,
    dto: CreateTestResultDto,
    actor: AuthenticatedPrincipal,
  ) {
    const definition = await this.prisma.qualityTestDefinition.findFirst({
      where: {
        id: dto.definitionId,
        companyId,
        deletedAt: null,
        OR: [{ projectId }, { projectId: null }],
      },
    });
    if (!definition) throw new NotFoundAppError('Test definition not found.');
    let calculatedStatus: QualityResultStatus = QualityResultStatus.PENDING;
    if (dto.numericResult !== undefined) {
      const minimumPass =
        definition.minValue === null ||
        dto.numericResult >= Number(definition.minValue);
      const maximumPass =
        definition.maxValue === null ||
        dto.numericResult <= Number(definition.maxValue);
      calculatedStatus =
        minimumPass && maximumPass
          ? QualityResultStatus.PASS
          : QualityResultStatus.FAIL;
    }
    return this.transactionCreate(
      companyId,
      'QualityTestResult',
      calculatedStatus === QualityResultStatus.FAIL
        ? 'TestFailed'
        : 'TestCreated',
      actor,
      (tx) =>
        tx.qualityTestResult.create({
          data: {
            ...dto,
            testDate: new Date(dto.testDate),
            companyId,
            projectId,
            calculatedStatus,
            resultStatus: calculatedStatus,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async overrideTestResult(
    companyId: string,
    projectId: string,
    id: string,
    dto: OverrideTestResultDto,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualityTestResult.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('Test result not found.');
    return this.transactionUpdate(
      companyId,
      'QualityTestResult',
      'TestResultOverridden',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityTestResult.update({
          where: { id },
          data: {
            resultStatus: QualityResultStatus.OVERRIDDEN,
            textResult: dto.pass ? 'PASS' : 'FAIL',
            overrideReason: dto.reason,
            overriddenBy: actor.userId,
            overriddenAt: new Date(),
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  listNcrs(companyId: string, projectId: string, query: QualityPageQueryDto) {
    const where: Prisma.QualityNcrWhereInput = {
      companyId,
      projectId,
      deletedAt: null,
      ...(query.status ? { status: query.status as QualityNcrStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { ncrNumber: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.paged(query, (skip, take) =>
      this.prisma.$transaction([
        this.prisma.qualityNcr.findMany({
          where,
          include: { _count: { select: { actions: true, evidence: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.qualityNcr.count({ where }),
      ]),
    );
  }

  async createNcr(
    companyId: string,
    projectId: string,
    dto: CreateNcrDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.validateProjectReferences(companyId, projectId, dto);
    return this.transactionCreate(
      companyId,
      'QualityNcr',
      'NCRCreated',
      actor,
      (tx) =>
        tx.qualityNcr.create({
          data: {
            ...dto,
            reportedDate: new Date(dto.reportedDate),
            dueDate: this.date(dto.dueDate),
            reportedBy: actor.userId,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async updateNcr(
    companyId: string,
    projectId: string,
    id: string,
    dto: UpdateNcrDto,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualityNcr.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
      include: { actions: { where: { deletedAt: null } } },
    });
    if (!previous) throw new NotFoundAppError('NCR not found.');
    if (dto.status === QualityNcrStatus.CLOSED)
      throw new BusinessRuleError(
        'Use the NCR close action to close this record.',
      );
    if (previous.status === QualityNcrStatus.CLOSED)
      throw new BusinessRuleError('A closed NCR cannot be changed.');
    const verifying = dto.status === QualityNcrStatus.ACCEPTED;
    return this.transactionUpdate(
      companyId,
      'QualityNcr',
      verifying ? 'NCRVerified' : 'NCRUpdated',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityNcr.update({
          where: { id },
          data: {
            ...dto,
            dueDate: this.date(dto.dueDate),
            verifiedBy: verifying ? actor.userId : undefined,
            verifiedAt: verifying ? new Date() : undefined,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async closeNcr(
    companyId: string,
    projectId: string,
    id: string,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualityNcr.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
      include: { actions: { where: { deletedAt: null } } },
    });
    if (!previous) throw new NotFoundAppError('NCR not found.');
    if (
      !previous.verifiedAt ||
      previous.actions.some(
        (item) => item.status !== 'VERIFIED' && item.status !== 'CLOSED',
      )
    )
      throw new BusinessRuleError(
        'Verify the NCR and all corrective actions before closing it.',
      );
    return this.transactionUpdate(
      companyId,
      'QualityNcr',
      'NCRClosed',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityNcr.update({
          where: { id },
          data: {
            status: QualityNcrStatus.CLOSED,
            closedBy: actor.userId,
            closedAt: new Date(),
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async createAction(
    companyId: string,
    projectId: string,
    ncrId: string,
    dto: CreateCorrectiveActionDto,
    actor: AuthenticatedPrincipal,
  ) {
    const ncr = await this.prisma.qualityNcr.findFirst({
      where: { id: ncrId, companyId, projectId, deletedAt: null },
    });
    if (!ncr) throw new NotFoundAppError('NCR not found.');
    return this.transactionCreate(
      companyId,
      'QualityCorrectiveAction',
      'CorrectiveActionCreated',
      actor,
      (tx) =>
        tx.qualityCorrectiveAction.create({
          data: {
            ...dto,
            dueDate: new Date(dto.dueDate),
            ncrId,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async updateAction(
    companyId: string,
    projectId: string,
    id: string,
    dto: UpdateCorrectiveActionDto,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualityCorrectiveAction.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('Corrective action not found.');
    const verified = dto.status === 'VERIFIED';
    return this.transactionUpdate(
      companyId,
      'QualityCorrectiveAction',
      verified ? 'CorrectiveActionCompleted' : 'CorrectiveActionUpdated',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityCorrectiveAction.update({
          where: { id },
          data: {
            ...dto,
            completedDate: this.date(dto.completedDate),
            verifiedBy: verified ? actor.userId : undefined,
            verifiedAt: verified ? new Date() : undefined,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  listIssues(companyId: string, projectId: string, query: QualityPageQueryDto) {
    const where: Prisma.QualityIssueWhereInput = {
      companyId,
      projectId,
      deletedAt: null,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.search
        ? { description: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    return this.paged(query, (skip, take) =>
      this.prisma.$transaction([
        this.prisma.qualityIssue.findMany({
          where,
          include: { _count: { select: { evidence: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.qualityIssue.count({ where }),
      ]),
    );
  }

  async createIssue(
    companyId: string,
    projectId: string,
    dto: CreateQualityIssueDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.validateProjectReferences(companyId, projectId, dto);
    return this.transactionCreate(
      companyId,
      'QualityIssue',
      dto.type === 'DEFECT'
        ? 'DefectCreated'
        : dto.type === 'PUNCH_ITEM'
          ? 'PunchItemCreated'
          : 'QualityObservationCreated',
      actor,
      (tx) =>
        tx.qualityIssue.create({
          data: {
            ...dto,
            reportedDate: new Date(dto.reportedDate),
            dueDate: this.date(dto.dueDate),
            reportedBy: actor.userId,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async updateIssue(
    companyId: string,
    projectId: string,
    id: string,
    dto: UpdateQualityIssueDto,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualityIssue.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('Quality issue not found.');
    if (dto.status === 'CLOSED')
      throw new BusinessRuleError(
        'Use the quality-issue close action to close this record.',
      );
    return this.transactionUpdate(
      companyId,
      'QualityIssue',
      'QualityIssueUpdated',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityIssue.update({
          where: { id },
          data: { ...dto, updatedBy: actor.userId },
        }),
      projectId,
    );
  }

  async closeIssue(
    companyId: string,
    projectId: string,
    id: string,
    verification: string,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualityIssue.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('Quality issue not found.');
    if (!verification.trim())
      throw new BusinessRuleError(
        'Verification is required before closing a quality issue.',
      );
    return this.transactionUpdate(
      companyId,
      'QualityIssue',
      previous.type === 'PUNCH_ITEM' ? 'PunchItemClosed' : 'DefectResolved',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualityIssue.update({
          where: { id },
          data: { status: 'CLOSED', verification, updatedBy: actor.userId },
        }),
      projectId,
    );
  }

  listRework(companyId: string, projectId: string) {
    return this.prisma.qualityRework.findMany({
      where: { companyId, projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  listSubmittals(
    companyId: string,
    projectId: string,
    query: QualityPageQueryDto,
  ) {
    const where: Prisma.QualitySubmittalWhereInput = {
      companyId,
      projectId,
      deletedAt: null,
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.search
        ? {
            OR: [
              {
                submittalNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { title: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.paged(query, (skip, take) =>
      this.prisma.$transaction([
        this.prisma.qualitySubmittal.findMany({
          where,
          include: { _count: { select: { evidence: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.qualitySubmittal.count({ where }),
      ]),
    );
  }

  async createSubmittal(
    companyId: string,
    projectId: string,
    dto: CreateQualitySubmittalDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.validateProjectReferences(companyId, projectId, dto);
    if (
      dto.type === 'MATERIAL' &&
      (!dto.materialReference || !dto.specification)
    ) {
      throw new BusinessRuleError(
        'Material and specification are required for a material submittal.',
      );
    }
    if (
      dto.type === 'METHOD_STATEMENT' &&
      (!dto.method || !dto.qualityRequirements)
    ) {
      throw new BusinessRuleError(
        'Method and quality requirements are required for a method statement.',
      );
    }
    return this.transactionCreate(
      companyId,
      'QualitySubmittal',
      dto.type === 'MATERIAL'
        ? 'MaterialSubmitted'
        : 'MethodStatementSubmitted',
      actor,
      (tx) =>
        tx.qualitySubmittal.create({
          data: {
            ...dto,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async updateSubmittal(
    companyId: string,
    projectId: string,
    id: string,
    dto: UpdateQualitySubmittalDto,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualitySubmittal.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('Quality submittal not found.');
    if (previous.status === 'APPROVED' || previous.status === 'SUPERSEDED') {
      throw new BusinessRuleError(
        'Approved or superseded submittals are immutable. Create a new revision instead.',
      );
    }
    if (dto.status === 'APPROVED' || dto.status === 'REJECTED')
      throw new BusinessRuleError(
        'Use the submittal approval or rejection action for this decision.',
      );
    const submitted = dto.status === 'SUBMITTED';
    return this.transactionUpdate(
      companyId,
      'QualitySubmittal',
      'QualitySubmittalUpdated',
      id,
      previous,
      actor,
      (tx) =>
        tx.qualitySubmittal.update({
          where: { id },
          data: {
            ...dto,
            submittedAt: submitted ? new Date() : undefined,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async decideSubmittal(
    companyId: string,
    projectId: string,
    id: string,
    approved: boolean,
    comments: string | undefined,
    actor: AuthenticatedPrincipal,
  ) {
    const previous = await this.prisma.qualitySubmittal.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!previous) throw new NotFoundAppError('Quality submittal not found.');
    if (
      ![
        'SUBMITTED',
        'QA_REVIEW',
        'TECHNICAL_REVIEW',
        'CONSULTANT_REVIEW',
        'CLIENT_REVIEW',
      ].includes(previous.status)
    )
      throw new BusinessRuleError(
        'This submittal is not awaiting an approval decision.',
      );
    const event = approved
      ? previous.type === 'MATERIAL'
        ? 'MaterialApproved'
        : 'MethodStatementApproved'
      : previous.type === 'MATERIAL'
        ? 'MaterialRejected'
        : 'MethodStatementRejected';
    return this.transactionUpdate(
      companyId,
      'QualitySubmittal',
      event,
      id,
      previous,
      actor,
      (tx) =>
        tx.qualitySubmittal.update({
          where: { id },
          data: {
            status: approved ? 'APPROVED' : 'REJECTED',
            reviewComments: comments,
            approvedBy: approved ? actor.userId : undefined,
            approvedAt: approved ? new Date() : undefined,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  listSamples(companyId: string, projectId: string) {
    return this.prisma.qualitySample.findMany({
      where: { companyId, projectId, deletedAt: null },
      orderBy: { collectedDate: 'desc' },
    });
  }

  async createSample(
    companyId: string,
    projectId: string,
    dto: CreateQualitySampleDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.requireProject(companyId, projectId);
    return this.transactionCreate(
      companyId,
      'QualitySample',
      'QualitySampleCollected',
      actor,
      (tx) =>
        tx.qualitySample.create({
          data: {
            ...dto,
            collectedDate: new Date(dto.collectedDate),
            collectedBy: actor.userId,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async createRework(
    companyId: string,
    projectId: string,
    dto: CreateReworkDto,
    actor: AuthenticatedPrincipal,
  ) {
    await this.validateProjectReferences(companyId, projectId, dto);
    const totalCost =
      (dto.laborCost ?? 0) +
      (dto.materialCost ?? 0) +
      (dto.equipmentCost ?? 0) +
      (dto.subcontractorCost ?? 0);
    return this.transactionCreate(
      companyId,
      'QualityRework',
      'ReworkCreated',
      actor,
      (tx) =>
        tx.qualityRework.create({
          data: {
            ...dto,
            totalCost,
            companyId,
            projectId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async linkEvidence(
    companyId: string,
    projectId: string,
    dto: LinkQualityEvidenceDto,
    actor: AuthenticatedPrincipal,
  ) {
    const document = await this.prisma.projectDocument.findFirst({
      where: { id: dto.documentId, companyId, projectId, deletedAt: null },
    });
    if (!document) throw new NotFoundAppError('Project document not found.');
    const targets = [
      dto.inspectionId,
      dto.testResultId,
      dto.ncrId,
      dto.actionId,
      dto.issueId,
      dto.submittalId,
    ].filter(Boolean);
    if (targets.length !== 1)
      throw new BusinessRuleError(
        'Evidence must be linked to exactly one quality record.',
      );
    return this.transactionCreate(
      companyId,
      'QualityEvidence',
      'QualityEvidenceLinked',
      actor,
      (tx) =>
        tx.qualityEvidence.create({
          data: {
            ...dto,
            annotationData: dto.annotationData as
              Prisma.InputJsonValue | undefined,
            capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : undefined,
            createdBy: actor.userId,
          },
        }),
      projectId,
    );
  }

  async assertActivityHoldPointsResolved(
    companyId: string,
    projectId: string,
    activityId: string,
  ): Promise<void> {
    const unresolved = await this.prisma.qualityInspection.count({
      where: {
        companyId,
        projectId,
        activityId,
        controlPoint: 'HOLD',
        deletedAt: null,
        status: {
          notIn: [
            QualityInspectionStatus.PASSED,
            QualityInspectionStatus.PASSED_WITH_COMMENTS,
            QualityInspectionStatus.CLOSED,
          ],
        },
      },
    });
    if (unresolved)
      throw new BusinessRuleError(
        'This activity cannot be completed while a required quality hold point is unresolved.',
      );
  }

  private async requireProject(companyId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundAppError('Project not found.');
    return project;
  }

  private async requirePlan(companyId: string, projectId: string, id: string) {
    const row = await this.prisma.qualityPlan.findFirst({
      where: { id, companyId, projectId, deletedAt: null },
    });
    if (!row) throw new NotFoundAppError('Quality plan not found.');
    return row;
  }

  private async validateProjectReferences(
    companyId: string,
    projectId: string,
    dto: { activityId?: string; wbsId?: string },
  ) {
    await this.requireProject(companyId, projectId);
    if (
      dto.activityId &&
      !(await this.prisma.projectTask.findFirst({
        where: { id: dto.activityId, companyId, projectId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new NotFoundAppError('Activity not found.');
    if (
      dto.wbsId &&
      !(await this.prisma.projectWbs.findFirst({
        where: { id: dto.wbsId, companyId, projectId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new NotFoundAppError('WBS item not found.');
  }

  private async transactionCreate<T extends { id: string }>(
    companyId: string,
    entity: string,
    event: string,
    actor: AuthenticatedPrincipal,
    create: (tx: Prisma.TransactionClient) => Promise<T>,
    projectId = '',
  ): Promise<T> {
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await create(tx);
      await this.audit.record(tx, {
        companyId,
        action: `Quality.${event}`,
        entity,
        entityId: created.id,
        newValue: created,
      });
      return created;
    });
    await this.emit(event, companyId, projectId, row.id, actor.userId);
    return row;
  }

  private async transactionUpdate<T extends { id: string }>(
    companyId: string,
    entity: string,
    event: string,
    id: string,
    previous: unknown,
    actor: AuthenticatedPrincipal,
    update: (tx: Prisma.TransactionClient) => Promise<T>,
    projectId = '',
  ): Promise<T> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await update(tx);
      await this.audit.record(tx, {
        companyId,
        action: `Quality.${event}`,
        entity,
        entityId: id,
        oldValue: previous,
        newValue: updated,
      });
      return updated;
    });
    await this.emit(event, companyId, projectId, id, actor.userId);
    return row;
  }

  private async emit(
    name: string,
    companyId: string,
    projectId: string,
    entityId: string,
    actorId: string,
  ) {
    const event = { name, companyId, projectId, entityId, actorId };
    await this.integration.publish(event);
    if (/Failed|Rejected|Scheduled|Created|Due/.test(name))
      await this.integration.notify(event);
  }

  private date(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  private countMap<T extends Record<string, unknown>>(
    rows: Array<T & { _count: number }>,
    key: keyof T,
  ) {
    return Object.fromEntries(
      rows.map((row) => [String(row[key]), row._count]),
    );
  }

  private async paged<T>(
    query: QualityPageQueryDto,
    load: (skip: number, take: number) => Promise<[T[], number]>,
  ) {
    const [items, total] = await load(
      (query.page - 1) * query.limit,
      query.limit,
    );
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
