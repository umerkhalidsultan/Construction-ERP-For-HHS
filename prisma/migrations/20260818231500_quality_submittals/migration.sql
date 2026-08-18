-- CreateEnum
CREATE TYPE "QualitySubmittalType" AS ENUM ('MATERIAL', 'METHOD_STATEMENT');

-- CreateEnum
CREATE TYPE "QualitySubmittalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'QA_REVIEW', 'TECHNICAL_REVIEW', 'CONSULTANT_REVIEW', 'CLIENT_REVIEW', 'APPROVED', 'REJECTED', 'REVISE_RESUBMIT', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "QualitySampleStatus" AS ENUM ('COLLECTED', 'STORED', 'SENT_TO_LAB', 'TESTED', 'RETAINED', 'DISPOSED');

-- AlterTable
ALTER TABLE "quality_evidence" ADD COLUMN     "submittalId" UUID;

-- CreateTable
CREATE TABLE "quality_submittals" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "submittalNumber" VARCHAR(80) NOT NULL,
    "type" "QualitySubmittalType" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activityId" UUID,
    "title" VARCHAR(255) NOT NULL,
    "materialReference" VARCHAR(200),
    "vendorReference" VARCHAR(200),
    "manufacturer" VARCHAR(200),
    "brand" VARCHAR(160),
    "specification" VARCHAR(500),
    "contractor" VARCHAR(200),
    "subcontractorReference" VARCHAR(200),
    "method" TEXT,
    "sequence" TEXT,
    "resources" JSONB NOT NULL DEFAULT '[]',
    "equipment" JSONB NOT NULL DEFAULT '[]',
    "materials" JSONB NOT NULL DEFAULT '[]',
    "safetyRequirements" TEXT,
    "qualityRequirements" TEXT,
    "inspectionRequirements" TEXT,
    "references" JSONB NOT NULL DEFAULT '[]',
    "status" "QualitySubmittalStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMPTZ(3),
    "approvedBy" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "reviewComments" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_submittals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_samples" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sampleNumber" VARCHAR(80) NOT NULL,
    "materialReference" VARCHAR(200) NOT NULL,
    "batchReference" VARCHAR(120),
    "supplierReference" VARCHAR(200),
    "location" VARCHAR(300),
    "collectedDate" DATE NOT NULL,
    "collectedBy" UUID NOT NULL,
    "quantity" DECIMAL(18,4),
    "unit" VARCHAR(40),
    "testRequired" VARCHAR(300) NOT NULL,
    "testStatus" "QualityResultStatus" NOT NULL DEFAULT 'PENDING',
    "storageLocation" VARCHAR(200),
    "disposition" VARCHAR(500),
    "status" "QualitySampleStatus" NOT NULL DEFAULT 'COLLECTED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "quality_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quality_submittals_companyId_projectId_type_status_deletedA_idx" ON "quality_submittals"("companyId", "projectId", "type", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_submittals_projectId_submittalNumber_version_key" ON "quality_submittals"("projectId", "submittalNumber", "version");

-- CreateIndex
CREATE INDEX "quality_samples_companyId_projectId_status_testStatus_delet_idx" ON "quality_samples"("companyId", "projectId", "status", "testStatus", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "quality_samples_projectId_sampleNumber_key" ON "quality_samples"("projectId", "sampleNumber");

-- AddForeignKey
ALTER TABLE "quality_evidence" ADD CONSTRAINT "quality_evidence_submittalId_fkey" FOREIGN KEY ("submittalId") REFERENCES "quality_submittals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_submittals" ADD CONSTRAINT "quality_submittals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_submittals" ADD CONSTRAINT "quality_submittals_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_submittals" ADD CONSTRAINT "quality_submittals_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_samples" ADD CONSTRAINT "quality_samples_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_samples" ADD CONSTRAINT "quality_samples_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
