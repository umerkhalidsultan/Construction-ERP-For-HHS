-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProjectLifecycleStatus" AS ENUM ('DRAFT', 'PLANNING', 'TENDER', 'AWARDED', 'MOBILIZATION', 'IN_PROGRESS', 'ON_HOLD', 'DELAYED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProjectContractType" AS ENUM ('LUMP_SUM', 'UNIT_RATE', 'COST_PLUS', 'EPC', 'DESIGN_BUILD', 'TURNKEY', 'REMEASUREMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectTeamRole" AS ENUM ('PROJECT_MANAGER', 'SITE_ENGINEER', 'QAQC_ENGINEER', 'HSE_OFFICER', 'PLANNING_ENGINEER', 'PROCUREMENT_OFFICER', 'STORE_KEEPER', 'ACCOUNTANT', 'SUBCONTRACTOR', 'CONSULTANT', 'CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectDocumentCategory" AS ENUM ('CONTRACTS', 'DRAWINGS', 'BOQ', 'SPECIFICATIONS', 'SITE_PHOTOS', 'APPROVALS', 'INVOICES', 'PERMITS', 'INSPECTION_REPORTS', 'CERTIFICATES', 'OTHER');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('HOLIDAY', 'MILESTONE', 'MEETING', 'INSPECTION', 'DELIVERY', 'WORKING_DAY_OVERRIDE', 'OTHER');

-- CreateTable
CREATE TABLE "project_status_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "lifecycle" "ProjectLifecycleStatus" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(9),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_status_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_type_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectCode" VARCHAR(50) NOT NULL,
    "projectName" VARCHAR(255) NOT NULL,
    "projectShortName" VARCHAR(80),
    "projectTypeId" UUID NOT NULL,
    "constructionTypeId" UUID,
    "statusId" UUID NOT NULL,
    "lifecycleStatus" "ProjectLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "clientId" UUID,
    "consultantId" UUID,
    "architectId" UUID,
    "projectManagerId" UUID NOT NULL,
    "siteEngineerId" UUID,
    "branchId" UUID,
    "departmentId" UUID,
    "estimatedBudget" DECIMAL(18,2) NOT NULL,
    "approvedBudget" DECIMAL(18,2),
    "estimatedCost" DECIMAL(18,2),
    "contractValue" DECIMAL(18,2),
    "currency" CHAR(3) NOT NULL,
    "contractType" "ProjectContractType" NOT NULL DEFAULT 'LUMP_SUM',
    "contractNumber" VARCHAR(100),
    "projectStartDate" DATE NOT NULL,
    "plannedCompletionDate" DATE NOT NULL,
    "actualCompletionDate" DATE,
    "defectLiabilityEndDate" DATE,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "address" VARCHAR(500),
    "area" VARCHAR(160),
    "city" VARCHAR(120),
    "province" VARCHAR(120),
    "country" CHAR(2) NOT NULL,
    "projectDescription" TEXT,
    "scopeOfWork" TEXT,
    "remarks" TEXT,
    "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_settings" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "workingDays" "Weekday"[] DEFAULT ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']::"Weekday"[],
    "workingHoursStart" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "workingHoursEnd" VARCHAR(5) NOT NULL DEFAULT '17:00',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "currency" CHAR(3) NOT NULL,
    "documentPrefix" VARCHAR(40),
    "defaultWarehouseId" UUID,
    "defaultStoreId" UUID,
    "notificationSettings" JSONB NOT NULL DEFAULT '{}',
    "approvalFlow" JSONB NOT NULL DEFAULT '{}',
    "calendarSettings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_phases" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "plannedStartDate" DATE,
    "plannedEndDate" DATE,
    "actualStartDate" DATE,
    "actualEndDate" DATE,
    "budget" DECIMAL(18,2),
    "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "phaseId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "assigneeMembershipId" UUID,
    "plannedStartDate" DATE,
    "plannedEndDate" DATE,
    "actualStartDate" DATE,
    "actualEndDate" DATE,
    "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestones" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "phaseId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "targetDate" DATE NOT NULL,
    "actualDate" DATE,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "weightage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "completionPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_milestone_dependencies" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "milestoneId" UUID NOT NULL,
    "dependsOnMilestoneId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_milestone_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_members" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "role" "ProjectTeamRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMPTZ(3),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_documents" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "phaseId" UUID,
    "fileObjectId" UUID,
    "category" "ProjectDocumentCategory" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(2000),
    "versionLabel" VARCHAR(40) NOT NULL DEFAULT '1.0',
    "externalUrl" VARCHAR(2048),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_calendar_events" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "milestoneId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "eventType" "CalendarEventType" NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" VARCHAR(255),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tags" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "color" VARCHAR(9),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tag_assignments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "project_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_status_definitions_companyId_code_deletedAt_idx" ON "project_status_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_status_definitions_id_companyId_key" ON "project_status_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "project_type_definitions_companyId_code_deletedAt_idx" ON "project_type_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_type_definitions_id_companyId_key" ON "project_type_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "projects_companyId_lifecycleStatus_deletedAt_idx" ON "projects"("companyId", "lifecycleStatus", "deletedAt");

-- CreateIndex
CREATE INDEX "projects_companyId_projectName_idx" ON "projects"("companyId", "projectName");

-- CreateIndex
CREATE INDEX "projects_companyId_projectManagerId_idx" ON "projects"("companyId", "projectManagerId");

-- CreateIndex
CREATE INDEX "projects_companyId_branchId_idx" ON "projects"("companyId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_companyId_key" ON "projects"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_projectId_key" ON "project_settings"("projectId");

-- CreateIndex
CREATE INDEX "project_settings_companyId_deletedAt_idx" ON "project_settings"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_settings_projectId_companyId_key" ON "project_settings"("projectId", "companyId");

-- CreateIndex
CREATE INDEX "project_phases_companyId_projectId_deletedAt_idx" ON "project_phases"("companyId", "projectId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_phases_id_companyId_key" ON "project_phases"("id", "companyId");

-- CreateIndex
CREATE INDEX "project_tasks_companyId_projectId_phaseId_deletedAt_idx" ON "project_tasks"("companyId", "projectId", "phaseId", "deletedAt");

-- CreateIndex
CREATE INDEX "project_milestones_companyId_projectId_targetDate_deletedAt_idx" ON "project_milestones"("companyId", "projectId", "targetDate", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_milestones_id_companyId_key" ON "project_milestones"("id", "companyId");

-- CreateIndex
CREATE INDEX "project_milestone_dependencies_companyId_projectId_deletedA_idx" ON "project_milestone_dependencies"("companyId", "projectId", "deletedAt");

-- CreateIndex
CREATE INDEX "project_team_members_companyId_projectId_deletedAt_idx" ON "project_team_members"("companyId", "projectId", "deletedAt");

-- CreateIndex
CREATE INDEX "project_team_members_companyId_membershipId_deletedAt_idx" ON "project_team_members"("companyId", "membershipId", "deletedAt");

-- CreateIndex
CREATE INDEX "project_documents_companyId_projectId_category_deletedAt_idx" ON "project_documents"("companyId", "projectId", "category", "deletedAt");

-- CreateIndex
CREATE INDEX "project_calendar_events_companyId_projectId_startsAt_delete_idx" ON "project_calendar_events"("companyId", "projectId", "startsAt", "deletedAt");

-- CreateIndex
CREATE INDEX "project_tags_companyId_code_deletedAt_idx" ON "project_tags"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_tags_id_companyId_key" ON "project_tags"("id", "companyId");

-- CreateIndex
CREATE INDEX "project_tag_assignments_companyId_projectId_deletedAt_idx" ON "project_tag_assignments"("companyId", "projectId", "deletedAt");

-- AddForeignKey
ALTER TABLE "project_status_definitions" ADD CONSTRAINT "project_status_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_type_definitions" ADD CONSTRAINT "project_type_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "project_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_constructionTypeId_fkey" FOREIGN KEY ("constructionTypeId") REFERENCES "project_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "project_status_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectManagerId_companyId_fkey" FOREIGN KEY ("projectManagerId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_siteEngineerId_companyId_fkey" FOREIGN KEY ("siteEngineerId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "branches"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_departmentId_companyId_fkey" FOREIGN KEY ("departmentId", "companyId") REFERENCES "departments"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_phases" ADD CONSTRAINT "project_phases_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_phaseId_companyId_fkey" FOREIGN KEY ("phaseId", "companyId") REFERENCES "project_phases"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigneeMembershipId_companyId_fkey" FOREIGN KEY ("assigneeMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_phaseId_companyId_fkey" FOREIGN KEY ("phaseId", "companyId") REFERENCES "project_phases"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestone_dependencies" ADD CONSTRAINT "project_milestone_dependencies_milestoneId_companyId_fkey" FOREIGN KEY ("milestoneId", "companyId") REFERENCES "project_milestones"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_milestone_dependencies" ADD CONSTRAINT "project_milestone_dependencies_dependsOnMilestoneId_compan_fkey" FOREIGN KEY ("dependsOnMilestoneId", "companyId") REFERENCES "project_milestones"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_members" ADD CONSTRAINT "project_team_members_membershipId_companyId_fkey" FOREIGN KEY ("membershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_phaseId_companyId_fkey" FOREIGN KEY ("phaseId", "companyId") REFERENCES "project_phases"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_calendar_events" ADD CONSTRAINT "project_calendar_events_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_calendar_events" ADD CONSTRAINT "project_calendar_events_milestoneId_companyId_fkey" FOREIGN KEY ("milestoneId", "companyId") REFERENCES "project_milestones"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag_assignments" ADD CONSTRAINT "project_tag_assignments_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tag_assignments" ADD CONSTRAINT "project_tag_assignments_tagId_companyId_fkey" FOREIGN KEY ("tagId", "companyId") REFERENCES "project_tags"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Soft-delete-aware uniqueness for project catalogs and codes.
CREATE UNIQUE INDEX "projects_company_code_active_key"
  ON "projects" ("companyId", UPPER("projectCode"))
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_status_definitions_system_code_active_key"
  ON "project_status_definitions" (UPPER("code"))
  WHERE "companyId" IS NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_status_definitions_company_code_active_key"
  ON "project_status_definitions" ("companyId", UPPER("code"))
  WHERE "companyId" IS NOT NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_type_definitions_system_code_active_key"
  ON "project_type_definitions" (UPPER("code"))
  WHERE "companyId" IS NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_type_definitions_company_code_active_key"
  ON "project_type_definitions" ("companyId", UPPER("code"))
  WHERE "companyId" IS NOT NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_phases_company_code_active_key"
  ON "project_phases" ("companyId", "projectId", UPPER("code"))
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_tags_company_code_active_key"
  ON "project_tags" ("companyId", UPPER("code"))
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_tag_assignments_active_key"
  ON "project_tag_assignments" ("companyId", "projectId", "tagId")
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "project_team_members_active_key"
  ON "project_team_members" ("companyId", "projectId", "membershipId", "role")
  WHERE "deletedAt" IS NULL AND "unassignedAt" IS NULL;

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_budget_positive_check"
  CHECK ("estimatedBudget" > 0);

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_completion_range_check"
  CHECK ("completionPercentage" >= 0 AND "completionPercentage" <= 100);

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_dates_check"
  CHECK ("plannedCompletionDate" >= "projectStartDate");

ALTER TABLE "project_phases"
  ADD CONSTRAINT "project_phases_completion_range_check"
  CHECK ("completionPercentage" >= 0 AND "completionPercentage" <= 100);

ALTER TABLE "project_milestones"
  ADD CONSTRAINT "project_milestones_completion_range_check"
  CHECK ("completionPercentage" >= 0 AND "completionPercentage" <= 100);

ALTER TABLE "project_milestones"
  ADD CONSTRAINT "project_milestones_weightage_range_check"
  CHECK ("weightage" >= 0 AND "weightage" <= 100);

ALTER TABLE "project_tasks"
  ADD CONSTRAINT "project_tasks_completion_range_check"
  CHECK ("completionPercentage" >= 0 AND "completionPercentage" <= 100);
