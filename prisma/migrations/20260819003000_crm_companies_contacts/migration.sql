-- CreateEnum
CREATE TYPE "CrmPartyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CrmContactStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CrmPrimaryContactPurpose" AS ENUM ('BUSINESS', 'ACCOUNTS', 'TECHNICAL', 'PROCUREMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadPartyLinkStatus" AS ENUM ('UNLINKED', 'LINKED', 'REVIEW_REQUIRED');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "crmCompanyId" UUID,
ADD COLUMN     "crmContactId" UUID,
ADD COLUMN     "partyLinkStatus" "LeadPartyLinkStatus" NOT NULL DEFAULT 'UNLINKED';

-- CreateTable
CREATE TABLE "crm_company_type_definitions" (
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

    CONSTRAINT "crm_company_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contact_type_definitions" (
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

    CONSTRAINT "crm_contact_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_companies" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "legalName" VARCHAR(255),
    "registrationNumber" VARCHAR(120),
    "taxNumber" VARCHAR(120),
    "industry" VARCHAR(160),
    "website" VARCHAR(2048),
    "email" VARCHAR(320),
    "phone" VARCHAR(32),
    "alternatePhone" VARCHAR(32),
    "address" VARCHAR(500),
    "city" VARCHAR(120),
    "country" CHAR(2),
    "postalCode" VARCHAR(32),
    "description" TEXT,
    "status" "CrmPartyStatus" NOT NULL DEFAULT 'PROSPECT',
    "assignedToId" UUID,
    "mergedIntoId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_company_type_assignments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID NOT NULL,
    "typeId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_company_type_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contacts" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID,
    "firstName" VARCHAR(120) NOT NULL,
    "lastName" VARCHAR(120),
    "jobTitle" VARCHAR(160),
    "department" VARCHAR(160),
    "email" VARCHAR(320),
    "alternateEmail" VARCHAR(320),
    "phone" VARCHAR(32),
    "mobile" VARCHAR(32),
    "whatsapp" VARCHAR(32),
    "website" VARCHAR(2048),
    "address" VARCHAR(500),
    "city" VARCHAR(120),
    "country" CHAR(2),
    "linkedin" VARCHAR(2048),
    "notesText" TEXT,
    "status" "CrmContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedToId" UUID,
    "mergedIntoId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contact_type_assignments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmContactId" UUID NOT NULL,
    "typeId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_contact_type_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_company_primary_contacts" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID NOT NULL,
    "crmContactId" UUID NOT NULL,
    "purpose" "CrmPrimaryContactPurpose" NOT NULL,
    "label" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_company_primary_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_company_notes" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_company_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contact_notes" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmContactId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_contact_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_company_attachments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmCompanyId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_company_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contact_attachments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "crmContactId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "crm_contact_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_company_type_definitions_companyId_code_deletedAt_idx" ON "crm_company_type_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_company_type_definitions_id_companyId_key" ON "crm_company_type_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "crm_contact_type_definitions_companyId_code_deletedAt_idx" ON "crm_contact_type_definitions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contact_type_definitions_id_companyId_key" ON "crm_contact_type_definitions"("id", "companyId");

-- CreateIndex
CREATE INDEX "crm_companies_companyId_status_deletedAt_createdAt_idx" ON "crm_companies"("companyId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "crm_companies_companyId_assignedToId_status_deletedAt_idx" ON "crm_companies"("companyId", "assignedToId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "crm_companies_companyId_name_idx" ON "crm_companies"("companyId", "name");

-- CreateIndex
CREATE INDEX "crm_companies_companyId_legalName_idx" ON "crm_companies"("companyId", "legalName");

-- CreateIndex
CREATE INDEX "crm_companies_companyId_phone_idx" ON "crm_companies"("companyId", "phone");

-- CreateIndex
CREATE INDEX "crm_companies_companyId_email_idx" ON "crm_companies"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "crm_companies_id_companyId_key" ON "crm_companies"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_companies_companyId_registrationNumber_key" ON "crm_companies"("companyId", "registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "crm_companies_companyId_taxNumber_key" ON "crm_companies"("companyId", "taxNumber");

-- CreateIndex
CREATE INDEX "crm_company_type_assignments_companyId_typeId_deletedAt_idx" ON "crm_company_type_assignments"("companyId", "typeId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_company_type_assignments_crmCompanyId_typeId_key" ON "crm_company_type_assignments"("crmCompanyId", "typeId");

-- CreateIndex
CREATE INDEX "crm_contacts_companyId_status_deletedAt_createdAt_idx" ON "crm_contacts"("companyId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "crm_contacts_companyId_crmCompanyId_deletedAt_idx" ON "crm_contacts"("companyId", "crmCompanyId", "deletedAt");

-- CreateIndex
CREATE INDEX "crm_contacts_companyId_assignedToId_status_deletedAt_idx" ON "crm_contacts"("companyId", "assignedToId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "crm_contacts_companyId_firstName_lastName_idx" ON "crm_contacts"("companyId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "crm_contacts_companyId_email_idx" ON "crm_contacts"("companyId", "email");

-- CreateIndex
CREATE INDEX "crm_contacts_companyId_phone_idx" ON "crm_contacts"("companyId", "phone");

-- CreateIndex
CREATE INDEX "crm_contacts_companyId_mobile_idx" ON "crm_contacts"("companyId", "mobile");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contacts_id_companyId_key" ON "crm_contacts"("id", "companyId");

-- CreateIndex
CREATE INDEX "crm_contact_type_assignments_companyId_typeId_deletedAt_idx" ON "crm_contact_type_assignments"("companyId", "typeId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contact_type_assignments_crmContactId_typeId_key" ON "crm_contact_type_assignments"("crmContactId", "typeId");

-- CreateIndex
CREATE INDEX "crm_company_primary_contacts_companyId_crmContactId_deleted_idx" ON "crm_company_primary_contacts"("companyId", "crmContactId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_company_primary_contacts_crmCompanyId_purpose_key" ON "crm_company_primary_contacts"("crmCompanyId", "purpose");

-- CreateIndex
CREATE INDEX "crm_company_notes_companyId_crmCompanyId_deletedAt_createdA_idx" ON "crm_company_notes"("companyId", "crmCompanyId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "crm_contact_notes_companyId_crmContactId_deletedAt_createdA_idx" ON "crm_contact_notes"("companyId", "crmContactId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "crm_company_attachments_companyId_crmCompanyId_deletedAt_cr_idx" ON "crm_company_attachments"("companyId", "crmCompanyId", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_company_attachments_crmCompanyId_fileId_key" ON "crm_company_attachments"("crmCompanyId", "fileId");

-- CreateIndex
CREATE INDEX "crm_contact_attachments_companyId_crmContactId_deletedAt_cr_idx" ON "crm_contact_attachments"("companyId", "crmContactId", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_contact_attachments_crmContactId_fileId_key" ON "crm_contact_attachments"("crmContactId", "fileId");

-- CreateIndex
CREATE INDEX "leads_companyId_crmCompanyId_deletedAt_idx" ON "leads"("companyId", "crmCompanyId", "deletedAt");

-- CreateIndex
CREATE INDEX "leads_companyId_crmContactId_deletedAt_idx" ON "leads"("companyId", "crmContactId", "deletedAt");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_crmCompanyId_companyId_fkey" FOREIGN KEY ("crmCompanyId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_crmContactId_companyId_fkey" FOREIGN KEY ("crmContactId", "companyId") REFERENCES "crm_contacts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_type_definitions" ADD CONSTRAINT "crm_company_type_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_type_definitions" ADD CONSTRAINT "crm_contact_type_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_assignedToId_companyId_fkey" FOREIGN KEY ("assignedToId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_mergedIntoId_companyId_fkey" FOREIGN KEY ("mergedIntoId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_type_assignments" ADD CONSTRAINT "crm_company_type_assignments_crmCompanyId_companyId_fkey" FOREIGN KEY ("crmCompanyId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_type_assignments" ADD CONSTRAINT "crm_company_type_assignments_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "crm_company_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_crmCompanyId_companyId_fkey" FOREIGN KEY ("crmCompanyId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_assignedToId_companyId_fkey" FOREIGN KEY ("assignedToId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacts" ADD CONSTRAINT "crm_contacts_mergedIntoId_companyId_fkey" FOREIGN KEY ("mergedIntoId", "companyId") REFERENCES "crm_contacts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_type_assignments" ADD CONSTRAINT "crm_contact_type_assignments_crmContactId_companyId_fkey" FOREIGN KEY ("crmContactId", "companyId") REFERENCES "crm_contacts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_type_assignments" ADD CONSTRAINT "crm_contact_type_assignments_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "crm_contact_type_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_primary_contacts" ADD CONSTRAINT "crm_company_primary_contacts_crmCompanyId_companyId_fkey" FOREIGN KEY ("crmCompanyId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_primary_contacts" ADD CONSTRAINT "crm_company_primary_contacts_crmContactId_companyId_fkey" FOREIGN KEY ("crmContactId", "companyId") REFERENCES "crm_contacts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_notes" ADD CONSTRAINT "crm_company_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_notes" ADD CONSTRAINT "crm_company_notes_crmCompanyId_companyId_fkey" FOREIGN KEY ("crmCompanyId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_notes" ADD CONSTRAINT "crm_contact_notes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_notes" ADD CONSTRAINT "crm_contact_notes_crmContactId_companyId_fkey" FOREIGN KEY ("crmContactId", "companyId") REFERENCES "crm_contacts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_attachments" ADD CONSTRAINT "crm_company_attachments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_attachments" ADD CONSTRAINT "crm_company_attachments_crmCompanyId_companyId_fkey" FOREIGN KEY ("crmCompanyId", "companyId") REFERENCES "crm_companies"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_company_attachments" ADD CONSTRAINT "crm_company_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_attachments" ADD CONSTRAINT "crm_contact_attachments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_attachments" ADD CONSTRAINT "crm_contact_attachments_crmContactId_companyId_fkey" FOREIGN KEY ("crmContactId", "companyId") REFERENCES "crm_contacts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contact_attachments" ADD CONSTRAINT "crm_contact_attachments_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
