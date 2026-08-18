-- Project planning phase 1: WBS, schedulable activities, dependencies,
-- immutable baseline snapshots, and progress history.

CREATE TYPE "ActivityType" AS ENUM ('TASK', 'SUMMARY', 'MILESTONE', 'LEVEL_OF_EFFORT');
CREATE TYPE "DependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');
CREATE TYPE "BaselineStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED');

CREATE TABLE "project_wbs" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "phaseId" UUID,
    "parentId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),
    CONSTRAINT "project_wbs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_wbs_id_companyId_key" ON "project_wbs"("id", "companyId");
CREATE INDEX "project_wbs_companyId_projectId_parentId_sortOrder_deletedAt_idx" ON "project_wbs"("companyId", "projectId", "parentId", "sortOrder", "deletedAt");
CREATE INDEX "project_wbs_companyId_projectId_code_deletedAt_idx" ON "project_wbs"("companyId", "projectId", "code", "deletedAt");

ALTER TABLE "project_tasks"
  ADD COLUMN "wbsId" UUID,
  ADD COLUMN "parentTaskId" UUID,
  ADD COLUMN "activityCode" VARCHAR(50),
  ADD COLUMN "activityType" "ActivityType" NOT NULL DEFAULT 'TASK',
  ADD COLUMN "durationDays" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "remainingDurationDays" INTEGER,
  ADD COLUMN "plannedQuantity" DECIMAL(18,4),
  ADD COLUMN "actualQuantity" DECIMAL(18,4),
  ADD COLUMN "unit" VARCHAR(32),
  ADD COLUMN "supervisorMembershipId" UUID,
  ADD COLUMN "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "isManuallyScheduled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isCritical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "earlyStartDate" DATE,
  ADD COLUMN "earlyFinishDate" DATE,
  ADD COLUMN "lateStartDate" DATE,
  ADD COLUMN "lateFinishDate" DATE,
  ADD COLUMN "totalFloatDays" INTEGER,
  ADD COLUMN "freeFloatDays" INTEGER;

CREATE INDEX "project_tasks_companyId_projectId_wbsId_deletedAt_idx" ON "project_tasks"("companyId", "projectId", "wbsId", "deletedAt");
CREATE INDEX "project_tasks_companyId_projectId_plannedStartDate_plannedEndDate_idx" ON "project_tasks"("companyId", "projectId", "plannedStartDate", "plannedEndDate");
CREATE INDEX "project_tasks_companyId_projectId_status_isCritical_deletedAt_idx" ON "project_tasks"("companyId", "projectId", "status", "isCritical", "deletedAt");

CREATE TABLE "activity_dependencies" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "predecessorId" UUID NOT NULL,
    "successorId" UUID NOT NULL,
    "type" "DependencyType" NOT NULL DEFAULT 'FS',
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    CONSTRAINT "activity_dependencies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "activity_dependencies_predecessorId_successorId_type_key" ON "activity_dependencies"("predecessorId", "successorId", "type");
CREATE INDEX "activity_dependencies_companyId_projectId_predecessorId_idx" ON "activity_dependencies"("companyId", "projectId", "predecessorId");
CREATE INDEX "activity_dependencies_companyId_projectId_successorId_idx" ON "activity_dependencies"("companyId", "projectId", "successorId");

CREATE TABLE "project_baselines" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" "BaselineStatus" NOT NULL DEFAULT 'DRAFT',
    "description" VARCHAR(1000),
    "approvedAt" TIMESTAMPTZ(3),
    "approvedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),
    CONSTRAINT "project_baselines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_baselines_projectId_revision_key" ON "project_baselines"("projectId", "revision");
CREATE INDEX "project_baselines_companyId_projectId_status_deletedAt_idx" ON "project_baselines"("companyId", "projectId", "status", "deletedAt");

CREATE TABLE "baseline_activities" (
    "id" UUID NOT NULL,
    "baselineId" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "plannedStart" DATE,
    "plannedFinish" DATE,
    "durationDays" INTEGER NOT NULL,
    "progress" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "baseline_activities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "baseline_activities_baselineId_activityId_key" ON "baseline_activities"("baselineId", "activityId");
CREATE INDEX "baseline_activities_activityId_idx" ON "baseline_activities"("activityId");

CREATE TABLE "activity_progress" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "activityId" UUID NOT NULL,
    "progressDate" DATE NOT NULL,
    "percentComplete" DECIMAL(5,2) NOT NULL,
    "actualQuantity" DECIMAL(18,4),
    "remainingQuantity" DECIMAL(18,4),
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,
    CONSTRAINT "activity_progress_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activity_progress_companyId_projectId_activityId_progressDate_idx" ON "activity_progress"("companyId", "projectId", "activityId", "progressDate");

ALTER TABLE "project_wbs" ADD CONSTRAINT "project_wbs_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_wbs" ADD CONSTRAINT "project_wbs_phaseId_companyId_fkey" FOREIGN KEY ("phaseId", "companyId") REFERENCES "project_phases"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_wbs" ADD CONSTRAINT "project_wbs_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "project_wbs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_wbsId_companyId_fkey" FOREIGN KEY ("wbsId", "companyId") REFERENCES "project_wbs"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_supervisorMembershipId_companyId_fkey" FOREIGN KEY ("supervisorMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_dependencies" ADD CONSTRAINT "activity_dependencies_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_dependencies" ADD CONSTRAINT "activity_dependencies_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_baselines" ADD CONSTRAINT "project_baselines_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baseline_activities" ADD CONSTRAINT "baseline_activities_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "project_baselines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "baseline_activities" ADD CONSTRAINT "baseline_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
