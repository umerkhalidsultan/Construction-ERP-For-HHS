-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'ON_HOLD', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "lead_type_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(50) NOT NULL,
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

    CONSTRAINT "lead_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_source_definitions" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "code" VARCHAR(50) NOT NULL,
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

    CONSTRAINT "lead_source_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "leadNumber" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "leadTypeId" UUID NOT NULL,
    "leadSourceId" UUID NOT NULL,
    "organizationName" VARCHAR(255),
    "contactPerson" VARCHAR(200),
    "phone" VARCHAR(32),
    "alternatePhone" VARCHAR(32),
    "email" VARCHAR(320),
    "website" VARCHAR(2048),
    "address" VARCHAR(500),
    "city" VARCHAR(120),
    "projectLocation" VARCHAR(500),
    "projectCity" VARCHAR(120),
    "projectArea" VARCHAR(160),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "estimatedValue" DECIMAL(18,2),
    "currency" CHAR(3) NOT NULL,
    "expectedClosingDate" DATE,
    "assignedToId" UUID,
    "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "description" TEXT,
    "lastActivityAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_attachments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "lead_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_type_definitions_companyId_code_deletedAt_idx" ON "lead_type_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lead_type_definitions_id_companyId_key" ON "lead_type_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "lead_source_definitions_companyId_code_deletedAt_idx" ON "lead_source_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "lead_source_definitions_id_companyId_key" ON "lead_source_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "leads_companyId_status_deletedAt_createdAt_idx" ON "leads"("companyId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "leads_companyId_assignedToId_status_deletedAt_idx" ON "leads"("companyId", "assignedToId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "leads_companyId_leadTypeId_deletedAt_idx" ON "leads"("companyId", "leadTypeId", "deletedAt");

-- CreateIndex
CREATE INDEX "leads_companyId_leadSourceId_deletedAt_idx" ON "leads"("companyId", "leadSourceId", "deletedAt");

-- CreateIndex
CREATE INDEX "leads_companyId_expectedClosingDate_deletedAt_idx" ON "leads"("companyId", "expectedClosingDate", "deletedAt");

-- CreateIndex
CREATE INDEX "leads_companyId_name_idx" ON "leads"("companyId", "name");

-- CreateIndex
CREATE INDEX "leads_companyId_email_idx" ON "leads"("companyId", "email");

-- CreateIndex
CREATE INDEX "leads_companyId_phone_idx" ON "leads"("companyId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "leads_companyId_leadNumber_key" ON "leads"("companyId", "leadNumber");

-- CreateIndex
CREATE UNIQUE INDEX "leads_id_companyId_key" ON "leads"("id", "companyId");

-- CreateIndex
CREATE INDEX "lead_notes_companyId_leadId_deletedAt_createdAt_idx" ON "lead_notes"("companyId", "leadId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "lead_attachments_companyId_leadId_deletedAt_createdAt_idx" ON "lead_attachments"("companyId", "leadId", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "lead_attachments_leadId_fileId_key" ON "lead_attachments"("leadId", "fileId");

-- AddForeignKey
ALTER TABLE "lead_type_definitions" ADD CONSTRAINT "lead_type_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_source_definitions" ADD CONSTRAINT "lead_source_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_leadTypeId_fkey" FOREIGN KEY ("leadTypeId") REFERENCES "lead_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_leadSourceId_fkey" FOREIGN KEY ("leadSourceId") REFERENCES "lead_source_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_companyId_fkey" FOREIGN KEY ("assignedToId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_leadId_companyId_fkey" FOREIGN KEY ("leadId", "companyId") REFERENCES "leads"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_leadId_companyId_fkey" FOREIGN KEY ("leadId", "companyId") REFERENCES "leads"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_attachments" ADD CONSTRAINT "lead_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
