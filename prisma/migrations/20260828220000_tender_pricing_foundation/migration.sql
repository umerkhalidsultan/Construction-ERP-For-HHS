-- Tender commercial pricing foundation. Direct Estimate costs are referenced, never overwritten.
CREATE TYPE "TenderPricingStatus" AS ENUM ('DRAFT','IN_PROGRESS','UNDER_REVIEW','APPROVED','SUPERSEDED','ARCHIVED');
CREATE TYPE "TenderPricingBasis" AS ENUM ('FIXED_AMOUNT','PERCENT_OF_DIRECT_COST','QUANTITY_X_RATE');
CREATE TABLE "tender_pricings" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "tenderId" UUID NOT NULL, "estimateId" UUID NOT NULL,
  "pricingReference" VARCHAR(80) NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0, "title" VARCHAR(255) NOT NULL, "description" TEXT,
  "status" "TenderPricingStatus" NOT NULL DEFAULT 'DRAFT', "currency" CHAR(3) NOT NULL,
  "baseDirectCost" DECIMAL(18,2) NOT NULL DEFAULT 0, "totalIndirectCost" DECIMAL(18,2) NOT NULL DEFAULT 0, "profitAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0, "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0, "finalTenderPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "approvedAt" TIMESTAMPTZ(3), "approvedBy" UUID, "createdBy" UUID, "updatedBy" UUID, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "tender_pricings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tender_pricings_tenderId_revision_key" ON "tender_pricings"("tenderId","revision");
CREATE UNIQUE INDEX "tender_pricings_companyId_pricingReference_key" ON "tender_pricings"("companyId","pricingReference");
CREATE INDEX "tender_pricings_companyId_tenderId_status_deletedAt_idx" ON "tender_pricings"("companyId","tenderId","status","deletedAt");
ALTER TABLE "tender_pricings" ADD CONSTRAINT "tender_pricings_tenderId_companyId_fkey" FOREIGN KEY ("tenderId","companyId") REFERENCES "tenders"("id","companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tender_pricings" ADD CONSTRAINT "tender_pricings_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "tender_estimates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "tender_pricing_indirect_costs" (
  "id" UUID NOT NULL, "companyId" UUID NOT NULL, "pricingId" UUID NOT NULL, "category" VARCHAR(100) NOT NULL, "description" VARCHAR(500) NOT NULL,
  "basis" "TenderPricingBasis" NOT NULL, "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0, "unitCost" DECIMAL(18,4) NOT NULL DEFAULT 0, "percentage" DECIMAL(8,4) NOT NULL DEFAULT 0, "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "notes" TEXT, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL, "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "tender_pricing_indirect_costs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tender_pricing_indirect_costs_companyId_pricingId_sortOrder_deletedAt_idx" ON "tender_pricing_indirect_costs"("companyId","pricingId","sortOrder","deletedAt");
ALTER TABLE "tender_pricing_indirect_costs" ADD CONSTRAINT "tender_pricing_indirect_costs_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "tender_pricings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
