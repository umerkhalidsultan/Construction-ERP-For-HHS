-- Tender Estimation & BOQ Foundation. Additive only; existing Tender data is preserved.
CREATE TYPE "TenderEstimateStatus" AS ENUM ('DRAFT','IN_PROGRESS','UNDER_REVIEW','APPROVED','SUPERSEDED','ARCHIVED');
CREATE TYPE "TenderEstimateResourceType" AS ENUM ('MATERIAL','LABOR','EQUIPMENT','SUBCONTRACT','OTHER');

CREATE TABLE "tender_estimates" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL,
  "estimateNumber" VARCHAR(80) NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0,
  "title" VARCHAR(255) NOT NULL, "description" TEXT, "status" "TenderEstimateStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" CHAR(3) NOT NULL, "baseDate" DATE, "lockedAt" TIMESTAMPTZ(3), "lockedBy" UUID,
  "createdBy" UUID, "updatedBy" UUID, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "tender_estimates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tender_estimates_tenderId_revision_key" ON "tender_estimates"("tenderId","revision");
CREATE UNIQUE INDEX "tender_estimates_companyId_estimateNumber_key" ON "tender_estimates"("companyId","estimateNumber");
CREATE INDEX "tender_estimates_companyId_tenderId_status_deletedAt_idx" ON "tender_estimates"("companyId","tenderId","status","deletedAt");
ALTER TABLE "tender_estimates" ADD CONSTRAINT "tender_estimates_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tender_estimate_sections" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "estimateId" UUID NOT NULL, "code" VARCHAR(80),
  "title" VARCHAR(255) NOT NULL, "description" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "tender_estimate_sections_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tender_estimate_sections_companyId_estimateId_sortOrder_deletedAt_idx" ON "tender_estimate_sections"("companyId","estimateId","sortOrder","deletedAt");
ALTER TABLE "tender_estimate_sections" ADD CONSTRAINT "tender_estimate_sections_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "tender_estimates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tender_estimate_items" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "estimateId" UUID NOT NULL, "sectionId" UUID, "itemNumber" VARCHAR(100),
  "description" TEXT NOT NULL, "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0, "unit" VARCHAR(40),
  "materialCost" DECIMAL(18,4) NOT NULL DEFAULT 0, "laborCost" DECIMAL(18,4) NOT NULL DEFAULT 0, "equipmentCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "subcontractCost" DECIMAL(18,4) NOT NULL DEFAULT 0, "otherCost" DECIMAL(18,4) NOT NULL DEFAULT 0, "wastePercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "unitDirectCost" DECIMAL(18,4) NOT NULL DEFAULT 0, "totalDirectCost" DECIMAL(18,2) NOT NULL DEFAULT 0, "notes" TEXT, "sourceReference" VARCHAR(255), "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "tender_estimate_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tender_estimate_items_estimateId_itemNumber_key" ON "tender_estimate_items"("estimateId","itemNumber");
CREATE INDEX "tender_estimate_items_companyId_estimateId_sectionId_sortOrder_deletedAt_idx" ON "tender_estimate_items"("companyId","estimateId","sectionId","sortOrder","deletedAt");
ALTER TABLE "tender_estimate_items" ADD CONSTRAINT "tender_estimate_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "tender_estimates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_estimate_items" ADD CONSTRAINT "tender_estimate_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "tender_estimate_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tender_estimate_resources" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "itemId" UUID NOT NULL, "resourceType" "TenderEstimateResourceType" NOT NULL,
  "description" VARCHAR(500) NOT NULL, "quantityPerUnit" DECIMAL(18,4) NOT NULL DEFAULT 0, "unit" VARCHAR(40), "unitCost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "wastePercent" DECIMAL(8,4) NOT NULL DEFAULT 0, "totalContribution" DECIMAL(18,4) NOT NULL DEFAULT 0, "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "tender_estimate_resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tender_estimate_resources_companyId_itemId_resourceType_deletedAt_idx" ON "tender_estimate_resources"("companyId","itemId","resourceType","deletedAt");
ALTER TABLE "tender_estimate_resources" ADD CONSTRAINT "tender_estimate_resources_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "tender_estimate_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
