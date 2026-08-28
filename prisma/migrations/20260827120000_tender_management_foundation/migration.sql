-- Tender Management Foundation (2.2.1A). All changes are additive.
CREATE TYPE "TenderStatus" AS ENUM ('DRAFT','REGISTERED','UNDER_REVIEW','BID_DECISION_PENDING','BID_APPROVED','NO_BID','PREPARING','READY_FOR_SUBMISSION','SUBMITTED','CLARIFICATION','TECHNICAL_EVALUATION','COMMERCIAL_EVALUATION','NEGOTIATION','AWARDED','LOST','CANCELLED');
CREATE TYPE "TenderPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT','CRITICAL');
CREATE TYPE "TenderRequirementStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','READY','VERIFIED','NOT_APPLICABLE','BLOCKED');
CREATE TYPE "TenderBidDecisionType" AS ENUM ('BID','NO_BID');
CREATE TYPE "TenderSubmissionMethod" AS ENUM ('ONLINE_PORTAL','EMAIL','PHYSICAL','COURIER','OTHER');

CREATE TABLE "tenders" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderNumber" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL, "internalReference" VARCHAR(100), "opportunityId" UUID,
  "clientCompanyId" UUID NOT NULL, "primaryContactId" UUID, "consultantCompanyId" UUID,
  "architectCompanyId" UUID, "tenderType" VARCHAR(100) NOT NULL, "projectType" VARCHAR(120),
  "projectLocation" VARCHAR(500), "city" VARCHAR(120), "issueDate" DATE,
  "closingDate" TIMESTAMPTZ(3) NOT NULL, "clarificationDeadline" TIMESTAMPTZ(3), "openingDate" TIMESTAMPTZ(3),
  "expectedAwardDate" DATE, "estimatedValue" DECIMAL(18,2), "awardedValue" DECIMAL(18,2),
  "currency" CHAR(3) NOT NULL, "tenderManagerMembershipId" UUID, "teamId" UUID,
  "priority" "TenderPriority" NOT NULL DEFAULT 'MEDIUM', "status" "TenderStatus" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT, "scopeSummary" TEXT, "awardDate" DATE, "awardReference" VARCHAR(160), "awardNotes" TEXT,
  "lostDate" DATE, "lostReason" VARCHAR(1000), "lostNotes" TEXT, "competitorCompanyId" UUID, "cancellationReason" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdBy" UUID, "updatedBy" UUID, "deletedAt" TIMESTAMPTZ(3), CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenders_companyId_tenderNumber_key" ON "tenders"("companyId","tenderNumber");
CREATE UNIQUE INDEX "tenders_id_companyId_key" ON "tenders"("id","companyId");
CREATE INDEX "tenders_companyId_status_deletedAt_closingDate_idx" ON "tenders"("companyId","status","deletedAt","closingDate");
CREATE INDEX "tenders_companyId_tenderManagerMembershipId_deletedAt_idx" ON "tenders"("companyId","tenderManagerMembershipId","deletedAt");
CREATE INDEX "tenders_companyId_clientCompanyId_deletedAt_idx" ON "tenders"("companyId","clientCompanyId","deletedAt");
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_opportunityId_companyId_fkey" FOREIGN KEY ("opportunityId","companyId") REFERENCES "opportunities"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_clientCompanyId_companyId_fkey" FOREIGN KEY ("clientCompanyId","companyId") REFERENCES "crm_companies"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_primaryContactId_companyId_fkey" FOREIGN KEY ("primaryContactId","companyId") REFERENCES "crm_contacts"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_consultantCompanyId_companyId_fkey" FOREIGN KEY ("consultantCompanyId","companyId") REFERENCES "crm_companies"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_architectCompanyId_companyId_fkey" FOREIGN KEY ("architectCompanyId","companyId") REFERENCES "crm_companies"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_competitorCompanyId_companyId_fkey" FOREIGN KEY ("competitorCompanyId","companyId") REFERENCES "crm_companies"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_tenderManagerMembershipId_companyId_fkey" FOREIGN KEY ("tenderManagerMembershipId","companyId") REFERENCES "company_memberships"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_teamId_companyId_fkey" FOREIGN KEY ("teamId","companyId") REFERENCES "teams"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tender_team_members" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "membershipId" UUID NOT NULL,
  "role" VARCHAR(100) NOT NULL, "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" UUID, "active" BOOLEAN NOT NULL DEFAULT true, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "tender_team_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tender_team_members_tenderId_membershipId_role_key" ON "tender_team_members"("tenderId","membershipId","role");
CREATE INDEX "tender_team_members_companyId_membershipId_active_idx" ON "tender_team_members"("companyId","membershipId","active");

CREATE TABLE "tender_requirements" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "name" VARCHAR(255) NOT NULL,
  "category" VARCHAR(120), "mandatory" BOOLEAN NOT NULL DEFAULT false, "responsibleMembershipId" UUID,
  "dueDate" TIMESTAMPTZ(3), "status" "TenderRequirementStatus" NOT NULL DEFAULT 'NOT_STARTED', "notes" TEXT,
  "verifiedAt" TIMESTAMPTZ(3), "verifiedBy" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3), CONSTRAINT "tender_requirements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tender_requirements_companyId_tenderId_status_deletedAt_idx" ON "tender_requirements"("companyId","tenderId","status","deletedAt");

CREATE TABLE "tender_bid_decisions" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "decision" "TenderBidDecisionType" NOT NULL,
  "decisionDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "decidedBy" UUID NOT NULL, "reason" VARCHAR(1000),
  "notes" TEXT, "assessment" JSONB NOT NULL DEFAULT '{}', "overallScore" DECIMAL(5,2), CONSTRAINT "tender_bid_decisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tender_bid_decisions_tenderId_key" ON "tender_bid_decisions"("tenderId");
CREATE UNIQUE INDEX "tender_bid_decisions_tenderId_companyId_key" ON "tender_bid_decisions"("tenderId","companyId");
CREATE INDEX "tender_bid_decisions_companyId_decision_idx" ON "tender_bid_decisions"("companyId","decision");

CREATE TABLE "tender_submissions" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "submittedAt" TIMESTAMPTZ(3) NOT NULL,
  "submittedBy" UUID NOT NULL, "method" "TenderSubmissionMethod" NOT NULL, "reference" VARCHAR(255), "notes" TEXT,
  "evidenceFileId" UUID, CONSTRAINT "tender_submissions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tender_submissions_companyId_tenderId_submittedAt_idx" ON "tender_submissions"("companyId","tenderId","submittedAt");

CREATE TABLE "tender_attachments" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "fileId" UUID NOT NULL,
  "category" VARCHAR(120), "title" VARCHAR(255), "addedBy" UUID, "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ(3), CONSTRAINT "tender_attachments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tender_attachments_tenderId_fileId_key" ON "tender_attachments"("tenderId","fileId");
CREATE INDEX "tender_attachments_companyId_tenderId_deletedAt_idx" ON "tender_attachments"("companyId","tenderId","deletedAt");

CREATE TABLE "tender_site_visits" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "visitDate" TIMESTAMPTZ(3) NOT NULL,
  "location" VARCHAR(500), "attendees" TEXT, "siteConditions" TEXT, "access" TEXT, "logistics" TEXT, "utilities" TEXT,
  "constraints" TEXT, "observations" TEXT, "notes" TEXT, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3), CONSTRAINT "tender_site_visits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tender_site_visits_companyId_tenderId_visitDate_idx" ON "tender_site_visits"("companyId","tenderId","visitDate");

CREATE TABLE "tender_pre_bid_meetings" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "meetingDate" TIMESTAMPTZ(3) NOT NULL,
  "location" VARCHAR(500), "participants" TEXT, "agenda" TEXT, "discussion" TEXT, "decisions" TEXT, "questions" TEXT,
  "actions" TEXT, "notes" TEXT, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3), CONSTRAINT "tender_pre_bid_meetings_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tender_pre_bid_meetings_companyId_tenderId_meetingDate_idx" ON "tender_pre_bid_meetings"("companyId","tenderId","meetingDate");

ALTER TABLE "tender_team_members" ADD CONSTRAINT "tender_team_members_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_requirements" ADD CONSTRAINT "tender_requirements_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_bid_decisions" ADD CONSTRAINT "tender_bid_decisions_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_submissions" ADD CONSTRAINT "tender_submissions_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_attachments" ADD CONSTRAINT "tender_attachments_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_site_visits" ADD CONSTRAINT "tender_site_visits_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_pre_bid_meetings" ADD CONSTRAINT "tender_pre_bid_meetings_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Configure the existing concurrency-safe numbering service for existing tenants.
INSERT INTO "document_sequences" ("id","companyId","documentType","prefixTemplate","nextNumber","padding","resetPolicy","status","createdAt","updatedAt")
SELECT gen_random_uuid(), c."id", 'TENDER', 'TND-{YYYY}-', 1, 6, 'YEARLY', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "companies" c
WHERE c."deletedAt" IS NULL AND NOT EXISTS (
  SELECT 1 FROM "document_sequences" ds WHERE ds."companyId" = c."id" AND ds."branchId" IS NULL AND ds."documentType" = 'TENDER' AND ds."deletedAt" IS NULL
);
