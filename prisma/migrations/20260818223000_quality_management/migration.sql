-- CreateEnum
CREATE TYPE "QualityPlanStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QualityItpStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "QualityControlPoint" AS ENUM ('HOLD', 'WITNESS', 'REVIEW', 'NONE');

-- CreateEnum
CREATE TYPE "QualityInspectionType" AS ENUM ('RECEIVING', 'MATERIAL', 'PRE_INSTALLATION', 'IN_PROCESS', 'FINAL', 'TESTING', 'PRE_COMMISSIONING', 'COMMISSIONING', 'CLIENT', 'CONSULTANT', 'THIRD_PARTY', 'OTHER');

-- CreateEnum
CREATE TYPE "QualityInspectionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SCHEDULED', 'IN_INSPECTION', 'PASSED', 'PASSED_WITH_COMMENTS', 'REJECTED', 'REINSPECTION_REQUIRED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QualityAnswerType" AS ENUM ('YES_NO', 'PASS_FAIL', 'NUMERIC', 'TEXT', 'MULTIPLE_CHOICE', 'PHOTO_REQUIRED', 'DOCUMENT_REQUIRED');

-- CreateEnum
CREATE TYPE "QualityResultStatus" AS ENUM ('PENDING', 'PASS', 'FAIL', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "QualityNcrSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "QualityNcrStatus" AS ENUM ('CREATED', 'ASSIGNED', 'ROOT_CAUSE_ANALYSIS', 'CORRECTIVE_ACTION', 'IMPLEMENTATION', 'VERIFICATION', 'ACCEPTED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QualityActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'READY_FOR_VERIFICATION', 'VERIFIED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QualityIssueType" AS ENUM ('DEFECT', 'PUNCH_ITEM', 'POSITIVE_OBSERVATION', 'WARNING', 'POTENTIAL_DEFECT', 'IMPROVEMENT', 'QUALITY_CONCERN');

-- CreateEnum
CREATE TYPE "QualityIssueStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'READY_FOR_INSPECTION', 'REJECTED', 'RESOLVED', 'VERIFIED', 'CLOSED');

-- CreateTable
CREATE TABLE "quality_standards" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "issuingBody" VARCHAR(160),
    "edition" VARCHAR(80),
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_plans" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "planNumber" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "projectManagerId" UUID,
    "qualityManagerId" UUID,
    "applicableStandards" JSONB NOT NULL DEFAULT '[]',
    "qualityObjectives" TEXT NOT NULL,
    "inspectionStrategy" TEXT NOT NULL,
    "testingRequirements" TEXT,
    "approvalRequirements" TEXT,
    "criticalActivities" JSONB NOT NULL DEFAULT '[]',
    "criticalMaterials" JSONB NOT NULL DEFAULT '[]',
    "requiredRecords" JSONB NOT NULL DEFAULT '[]',
    "status" "QualityPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" DATE,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_itps" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "itpNumber" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "wbsId" UUID,
    "activityId" UUID,
    "boqItemId" UUID,
    "specification" VARCHAR(500),
    "inspectionStage" VARCHAR(160) NOT NULL,
    "inspectionType" "QualityInspectionType" NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "responsibleParty" VARCHAR(200) NOT NULL,
    "requiredDocuments" JSONB NOT NULL DEFAULT '[]',
    "requiredTests" JSONB NOT NULL DEFAULT '[]',
    "controlPoint" "QualityControlPoint" NOT NULL DEFAULT 'NONE',
    "status" "QualityItpStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_itps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_checklist_templates" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(120) NOT NULL,
    "activityTrade" VARCHAR(120),
    "standard" VARCHAR(200),
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_checklist_questions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "prompt" VARCHAR(1000) NOT NULL,
    "answerType" "QualityAnswerType" NOT NULL,
    "acceptanceCriteria" VARCHAR(1000),
    "required" BOOLEAN NOT NULL DEFAULT true,
    "requiredEvidence" BOOLEAN NOT NULL DEFAULT false,
    "requiredSignature" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL DEFAULT '[]',
    "minValue" DECIMAL(18,4),
    "maxValue" DECIMAL(18,4),
    "unit" VARCHAR(40),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quality_checklist_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_inspections" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "inspectionNumber" VARCHAR(80) NOT NULL,
    "itpId" UUID,
    "checklistTemplateId" UUID,
    "siteReference" VARCHAR(200),
    "areaReference" VARCHAR(200),
    "wbsId" UUID,
    "activityId" UUID,
    "boqItemId" UUID,
    "drawingReference" VARCHAR(200),
    "drawingRevision" VARCHAR(50),
    "specification" VARCHAR(500),
    "requestedBy" UUID NOT NULL,
    "requestedDate" DATE NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3),
    "inspectorId" UUID,
    "consultant" VARCHAR(200),
    "client" VARCHAR(200),
    "inspectionType" "QualityInspectionType" NOT NULL,
    "controlPoint" "QualityControlPoint" NOT NULL DEFAULT 'NONE',
    "status" "QualityInspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT NOT NULL,
    "outcomeComments" TEXT,
    "completedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "clientMutationId" VARCHAR(120),
    "syncVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_inspection_responses" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "compliant" BOOLEAN,
    "comments" VARCHAR(2000),
    "answeredBy" UUID,
    "answeredAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_inspection_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_test_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "standard" VARCHAR(200),
    "parameter" VARCHAR(160) NOT NULL,
    "unit" VARCHAR(40),
    "minValue" DECIMAL(18,4),
    "maxValue" DECIMAL(18,4),
    "acceptanceCriteria" VARCHAR(1000) NOT NULL,
    "samplingFrequency" VARCHAR(200),
    "requiredEquipment" JSONB NOT NULL DEFAULT '[]',
    "requiredLaboratory" VARCHAR(200),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_test_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_test_results" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testNumber" VARCHAR(80) NOT NULL,
    "definitionId" UUID NOT NULL,
    "activityId" UUID,
    "siteReference" VARCHAR(200),
    "areaReference" VARCHAR(200),
    "materialReference" VARCHAR(200),
    "batchReference" VARCHAR(120),
    "sampleReference" VARCHAR(120),
    "testDate" DATE NOT NULL,
    "laboratory" VARCHAR(200),
    "technician" VARCHAR(200),
    "numericResult" DECIMAL(18,4),
    "textResult" VARCHAR(1000),
    "resultStatus" "QualityResultStatus" NOT NULL DEFAULT 'PENDING',
    "calculatedStatus" "QualityResultStatus" NOT NULL DEFAULT 'PENDING',
    "overrideReason" VARCHAR(1000),
    "overriddenBy" UUID,
    "overriddenAt" TIMESTAMPTZ(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_ncrs" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "ncrNumber" VARCHAR(80) NOT NULL,
    "inspectionId" UUID,
    "testResultId" UUID,
    "siteReference" VARCHAR(200),
    "areaReference" VARCHAR(200),
    "wbsId" UUID,
    "activityId" UUID,
    "boqItemId" UUID,
    "drawingReference" VARCHAR(200),
    "specification" VARCHAR(500),
    "responsibleParty" VARCHAR(200),
    "source" VARCHAR(80) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "QualityNcrSeverity" NOT NULL,
    "status" "QualityNcrStatus" NOT NULL DEFAULT 'CREATED',
    "reportedDate" DATE NOT NULL,
    "reportedBy" UUID NOT NULL,
    "assignedTo" UUID,
    "rootCauseMethod" VARCHAR(80),
    "rootCause" TEXT,
    "immediateAction" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "dueDate" DATE,
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMPTZ(3),
    "closedBy" UUID,
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_ncrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_corrective_actions" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "ncrId" UUID NOT NULL,
    "actionNumber" VARCHAR(80) NOT NULL,
    "actionType" VARCHAR(30) NOT NULL DEFAULT 'CORRECTIVE',
    "responsiblePersonId" UUID,
    "responsibleCompany" VARCHAR(200),
    "action" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "completedDate" DATE,
    "verification" TEXT,
    "effectiveness" TEXT,
    "status" "QualityActionStatus" NOT NULL DEFAULT 'OPEN',
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_issues" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "issueNumber" VARCHAR(80) NOT NULL,
    "type" "QualityIssueType" NOT NULL,
    "siteReference" VARCHAR(200),
    "areaReference" VARCHAR(200),
    "location" VARCHAR(300),
    "activityId" UUID,
    "trade" VARCHAR(120),
    "description" TEXT NOT NULL,
    "severity" "QualityNcrSeverity" NOT NULL DEFAULT 'MINOR',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "reportedBy" UUID NOT NULL,
    "assignedTo" UUID,
    "reportedDate" DATE NOT NULL,
    "dueDate" DATE,
    "status" "QualityIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "verification" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_reworks" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "reworkNumber" VARCHAR(80) NOT NULL,
    "activityId" UUID,
    "areaReference" VARCHAR(200),
    "cause" TEXT NOT NULL,
    "responsibleParty" VARCHAR(200),
    "originalQuantity" DECIMAL(18,4),
    "reworkQuantity" DECIMAL(18,4),
    "unit" VARCHAR(40),
    "laborCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "materialCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "equipmentCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "subcontractorCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "startDate" DATE,
    "completionDate" DATE,
    "status" VARCHAR(40) NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_reworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_evidence" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "inspectionId" UUID,
    "testResultId" UUID,
    "ncrId" UUID,
    "actionId" UUID,
    "issueId" UUID,
    "evidenceType" VARCHAR(40) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "capturedAt" TIMESTAMPTZ(3),
    "annotationData" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "quality_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_outbox_events" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "eventName" VARCHAR(100) NOT NULL,
    "entityId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quality_standards_companyId_active_deletedAt_idx" ON "quality_standards"("companyId", "active", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_standards_companyId_code_key" ON "quality_standards"("companyId", "code");

-- CreateIndex
CREATE INDEX "quality_plans_companyId_projectId_status_deletedAt_idx" ON "quality_plans"("companyId", "projectId", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_plans_projectId_planNumber_version_key" ON "quality_plans"("projectId", "planNumber", "version");

-- CreateIndex
CREATE INDEX "quality_itps_companyId_projectId_status_controlPoint_delete_idx" ON "quality_itps"("companyId", "projectId", "status", "controlPoint", "deletedAt");

-- CreateIndex
CREATE INDEX "quality_itps_activityId_status_controlPoint_idx" ON "quality_itps"("activityId", "status", "controlPoint");

-- CreateIndex
CREATE UNIQUE INDEX "quality_itps_projectId_itpNumber_version_key" ON "quality_itps"("projectId", "itpNumber", "version");

-- CreateIndex
CREATE INDEX "quality_checklist_templates_companyId_category_active_delet_idx" ON "quality_checklist_templates"("companyId", "category", "active", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_checklist_templates_companyId_projectId_name_versio_key" ON "quality_checklist_templates"("companyId", "projectId", "name", "version");

-- CreateIndex
CREATE INDEX "quality_checklist_questions_templateId_sortOrder_idx" ON "quality_checklist_questions"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "quality_inspections_companyId_projectId_status_scheduledAt__idx" ON "quality_inspections"("companyId", "projectId", "status", "scheduledAt", "deletedAt");

-- CreateIndex
CREATE INDEX "quality_inspections_activityId_controlPoint_status_idx" ON "quality_inspections"("activityId", "controlPoint", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_projectId_inspectionNumber_key" ON "quality_inspections"("projectId", "inspectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspections_companyId_clientMutationId_key" ON "quality_inspections"("companyId", "clientMutationId");

-- CreateIndex
CREATE INDEX "quality_inspection_responses_inspectionId_compliant_idx" ON "quality_inspection_responses"("inspectionId", "compliant");

-- CreateIndex
CREATE UNIQUE INDEX "quality_inspection_responses_inspectionId_questionId_key" ON "quality_inspection_responses"("inspectionId", "questionId");

-- CreateIndex
CREATE INDEX "quality_test_definitions_companyId_projectId_active_deleted_idx" ON "quality_test_definitions"("companyId", "projectId", "active", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_test_definitions_companyId_projectId_code_key" ON "quality_test_definitions"("companyId", "projectId", "code");

-- CreateIndex
CREATE INDEX "quality_test_results_companyId_projectId_resultStatus_testD_idx" ON "quality_test_results"("companyId", "projectId", "resultStatus", "testDate", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_test_results_projectId_testNumber_key" ON "quality_test_results"("projectId", "testNumber");

-- CreateIndex
CREATE INDEX "quality_ncrs_companyId_projectId_status_severity_dueDate_de_idx" ON "quality_ncrs"("companyId", "projectId", "status", "severity", "dueDate", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_ncrs_projectId_ncrNumber_key" ON "quality_ncrs"("projectId", "ncrNumber");

-- CreateIndex
CREATE INDEX "quality_corrective_actions_companyId_projectId_status_dueDa_idx" ON "quality_corrective_actions"("companyId", "projectId", "status", "dueDate", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_corrective_actions_projectId_actionNumber_key" ON "quality_corrective_actions"("projectId", "actionNumber");

-- CreateIndex
CREATE INDEX "quality_issues_companyId_projectId_type_status_dueDate_dele_idx" ON "quality_issues"("companyId", "projectId", "type", "status", "dueDate", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_issues_projectId_issueNumber_key" ON "quality_issues"("projectId", "issueNumber");

-- CreateIndex
CREATE INDEX "quality_reworks_companyId_projectId_status_deletedAt_idx" ON "quality_reworks"("companyId", "projectId", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_reworks_projectId_reworkNumber_key" ON "quality_reworks"("projectId", "reworkNumber");

-- CreateIndex
CREATE INDEX "quality_evidence_documentId_idx" ON "quality_evidence"("documentId");

-- CreateIndex
CREATE INDEX "quality_evidence_inspectionId_idx" ON "quality_evidence"("inspectionId");

-- CreateIndex
CREATE INDEX "quality_evidence_testResultId_idx" ON "quality_evidence"("testResultId");

-- CreateIndex
CREATE INDEX "quality_evidence_ncrId_idx" ON "quality_evidence"("ncrId");

-- CreateIndex
CREATE INDEX "quality_outbox_events_status_availableAt_createdAt_idx" ON "quality_outbox_events"("status", "availableAt", "createdAt");

-- CreateIndex
CREATE INDEX "quality_outbox_events_companyId_projectId_eventName_created_idx" ON "quality_outbox_events"("companyId", "projectId", "eventName", "createdAt");

-- AddForeignKey
ALTER TABLE "quality_standards" ADD CONSTRAINT "quality_standards_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_plans" ADD CONSTRAINT "quality_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_plans" ADD CONSTRAINT "quality_plans_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_itps" ADD CONSTRAINT "quality_itps_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_itps" ADD CONSTRAINT "quality_itps_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_itps" ADD CONSTRAINT "quality_itps_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "project_wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_itps" ADD CONSTRAINT "quality_itps_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checklist_templates" ADD CONSTRAINT "quality_checklist_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checklist_templates" ADD CONSTRAINT "quality_checklist_templates_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checklist_questions" ADD CONSTRAINT "quality_checklist_questions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "quality_checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_itpId_fkey" FOREIGN KEY ("itpId") REFERENCES "quality_itps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "quality_checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "project_wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspections" ADD CONSTRAINT "quality_inspections_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspection_responses" ADD CONSTRAINT "quality_inspection_responses_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_inspection_responses" ADD CONSTRAINT "quality_inspection_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quality_checklist_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_test_definitions" ADD CONSTRAINT "quality_test_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_test_definitions" ADD CONSTRAINT "quality_test_definitions_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_test_results" ADD CONSTRAINT "quality_test_results_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_test_results" ADD CONSTRAINT "quality_test_results_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_test_results" ADD CONSTRAINT "quality_test_results_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "quality_test_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_test_results" ADD CONSTRAINT "quality_test_results_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_ncrs" ADD CONSTRAINT "quality_ncrs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_ncrs" ADD CONSTRAINT "quality_ncrs_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_ncrs" ADD CONSTRAINT "quality_ncrs_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_ncrs" ADD CONSTRAINT "quality_ncrs_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "quality_test_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_ncrs" ADD CONSTRAINT "quality_ncrs_wbsId_fkey" FOREIGN KEY ("wbsId") REFERENCES "project_wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_ncrs" ADD CONSTRAINT "quality_ncrs_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_corrective_actions" ADD CONSTRAINT "quality_corrective_actions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_corrective_actions" ADD CONSTRAINT "quality_corrective_actions_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_corrective_actions" ADD CONSTRAINT "quality_corrective_actions_ncrId_fkey" FOREIGN KEY ("ncrId") REFERENCES "quality_ncrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_issues" ADD CONSTRAINT "quality_issues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_issues" ADD CONSTRAINT "quality_issues_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_issues" ADD CONSTRAINT "quality_issues_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_reworks" ADD CONSTRAINT "quality_reworks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_reworks" ADD CONSTRAINT "quality_reworks_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_reworks" ADD CONSTRAINT "quality_reworks_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_evidence" ADD CONSTRAINT "quality_evidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "project_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_evidence" ADD CONSTRAINT "quality_evidence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "quality_inspections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_evidence" ADD CONSTRAINT "quality_evidence_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "quality_test_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_evidence" ADD CONSTRAINT "quality_evidence_ncrId_fkey" FOREIGN KEY ("ncrId") REFERENCES "quality_ncrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_evidence" ADD CONSTRAINT "quality_evidence_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "quality_corrective_actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_evidence" ADD CONSTRAINT "quality_evidence_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "quality_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_outbox_events" ADD CONSTRAINT "quality_outbox_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_outbox_events" ADD CONSTRAINT "quality_outbox_events_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
