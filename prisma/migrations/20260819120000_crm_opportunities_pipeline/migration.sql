-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "OpportunityPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "OpportunityActivityType" AS ENUM ('CALL', 'MEETING', 'SITE_VISIT', 'EMAIL', 'WHATSAPP', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityActivityStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "opportunity_stage_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "probability" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_stage_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_type_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_source_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_source_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_lost_reason_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_lost_reason_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "opportunityNumber" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "leadId" UUID,
    "crmCompanyId" UUID,
    "crmContactId" UUID,
    "opportunityTypeId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "projectLocation" VARCHAR(500),
    "city" VARCHAR(120),
    "area" VARCHAR(160),
    "estimatedContractValue" DECIMAL(18,2),
    "currency" CHAR(3) NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "priority" "OpportunityPriority" NOT NULL DEFAULT 'MEDIUM',
    "expectedClosingDate" DATE,
    "expectedStartDate" DATE,
    "expectedCompletionDate" DATE,
    "assignedToId" UUID,
    "description" TEXT,
    "wonDate" DATE,
    "finalContractValue" DECIMAL(18,2),
    "winReason" VARCHAR(1000),
    "competitor" VARCHAR(255),
    "winRemarks" TEXT,
    "lostDate" DATE,
    "lostReasonId" UUID,
    "lostRemarks" TEXT,
    "lastActivityAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_stage_history" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "fromStageId" UUID,
    "toStageId" UUID NOT NULL,
    "changedById" UUID,
    "reason" VARCHAR(1000),
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_activities" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "type" "OpportunityActivityType" NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "dueDate" DATE,
    "completedDate" DATE,
    "assignedToId" UUID,
    "status" "OpportunityActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "visitDate" DATE,
    "location" VARCHAR(500),
    "participants" VARCHAR(1000),
    "purpose" TEXT,
    "observations" TEXT,
    "nextAction" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_notes" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_attachments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "opportunity_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunity_stage_definitions_companyId_code_deletedAt_idx" ON "opportunity_stage_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_stage_definitions_id_companyId_key" ON "opportunity_stage_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "opportunity_type_definitions_companyId_code_deletedAt_idx" ON "opportunity_type_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_type_definitions_id_companyId_key" ON "opportunity_type_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "opportunity_source_definitions_companyId_code_deletedAt_idx" ON "opportunity_source_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_source_definitions_id_companyId_key" ON "opportunity_source_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "opportunity_lost_reason_definitions_companyId_code_deletedAt_idx" ON "opportunity_lost_reason_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_lost_reason_definitions_id_companyId_key" ON "opportunity_lost_reason_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "opportunities_companyId_status_deletedAt_createdAt_idx" ON "opportunities"("companyId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_stageId_status_deletedAt_idx" ON "opportunities"("companyId", "stageId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_assignedToId_status_deletedAt_idx" ON "opportunities"("companyId", "assignedToId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_expectedClosingDate_deletedAt_idx" ON "opportunities"("companyId", "expectedClosingDate", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_priority_status_deletedAt_idx" ON "opportunities"("companyId", "priority", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_crmCompanyId_deletedAt_idx" ON "opportunities"("companyId", "crmCompanyId", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_crmContactId_deletedAt_idx" ON "opportunities"("companyId", "crmContactId", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_opportunityTypeId_deletedAt_idx" ON "opportunities"("companyId", "opportunityTypeId", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_sourceId_deletedAt_idx" ON "opportunities"("companyId", "sourceId", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_wonDate_deletedAt_idx" ON "opportunities"("companyId", "wonDate", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunities_companyId_lostDate_deletedAt_idx" ON "opportunities"("companyId", "lostDate", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_companyId_opportunityNumber_key" ON "opportunities"("companyId", "opportunityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_id_companyId_key" ON "opportunities"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_leadId_key" ON "opportunities"("leadId");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_companyId_opportunityId_changedAt_deletedAt_idx" ON "opportunity_stage_history"("companyId", "opportunityId", "changedAt", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunity_activities_companyId_opportunityId_status_dueDate_deletedAt_idx" ON "opportunity_activities"("companyId", "opportunityId", "status", "dueDate", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunity_activities_companyId_assignedToId_status_deletedAt_idx" ON "opportunity_activities"("companyId", "assignedToId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "opportunity_notes_companyId_opportunityId_deletedAt_createdAt_idx" ON "opportunity_notes"("companyId", "opportunityId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "opportunity_attachments_companyId_opportunityId_deletedAt_createdAt_idx" ON "opportunity_attachments"("companyId", "opportunityId", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "opportunity_attachments_opportunityId_fileId_key" ON "opportunity_attachments"("opportunityId", "fileId");

-- AddForeignKey
ALTER TABLE "opportunity_stage_definitions" ADD CONSTRAINT "opportunity_stage_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_type_definitions" ADD CONSTRAINT "opportunity_type_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_source_definitions" ADD CONSTRAINT "opportunity_source_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_lost_reason_definitions" ADD CONSTRAINT "opportunity_lost_reason_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_crmCompanyId_companyId_fkey" FOREIGN KEY ("crmCompanyId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_crmContactId_companyId_fkey" FOREIGN KEY ("crmContactId", "companyId") REFERENCES "crm_contacts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_opportunityTypeId_fkey" FOREIGN KEY ("opportunityTypeId") REFERENCES "opportunity_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "opportunity_source_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "opportunity_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "opportunity_lost_reason_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assignedToId_companyId_fkey" FOREIGN KEY ("assignedToId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_opportunityId_companyId_fkey" FOREIGN KEY ("opportunityId", "companyId") REFERENCES "opportunities"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "opportunity_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "opportunity_stage_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_changedById_companyId_fkey" FOREIGN KEY ("changedById", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_opportunityId_companyId_fkey" FOREIGN KEY ("opportunityId", "companyId") REFERENCES "opportunities"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_activities" ADD CONSTRAINT "opportunity_activities_assignedToId_companyId_fkey" FOREIGN KEY ("assignedToId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_notes" ADD CONSTRAINT "opportunity_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_notes" ADD CONSTRAINT "opportunity_notes_opportunityId_companyId_fkey" FOREIGN KEY ("opportunityId", "companyId") REFERENCES "opportunities"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_opportunityId_companyId_fkey" FOREIGN KEY ("opportunityId", "companyId") REFERENCES "opportunities"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
