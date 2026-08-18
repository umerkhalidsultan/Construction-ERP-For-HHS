-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'INVITED');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('PRIVATE', 'PUBLIC', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP', 'NON_PROFIT', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "MeasurementSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "DistanceUnit" AS ENUM ('MILLIMETER', 'CENTIMETER', 'METER', 'KILOMETER', 'INCH', 'FOOT', 'YARD', 'MILE');

-- CreateEnum
CREATE TYPE "TemperatureUnit" AS ENUM ('CELSIUS', 'FAHRENHEIT');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CostCenterType" AS ENUM ('PROJECT', 'HEAD_OFFICE', 'WAREHOUSE', 'EQUIPMENT', 'ADMINISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SequenceResetPolicy" AS ENUM ('NEVER', 'YEARLY', 'FISCAL_YEARLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('COMPANY_LOGO', 'FAVICON', 'REPORT_HEADER', 'REPORT_FOOTER', 'EMAIL_LOGO', 'WATERMARK', 'PROFILE_PHOTO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'AVAILABLE', 'QUARANTINED', 'DELETED');

-- CreateEnum
CREATE TYPE "VirusScanStatus" AS ENUM ('NOT_SCANNED', 'PENDING', 'CLEAN', 'INFECTED', 'FAILED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "companyCode" VARCHAR(32) NOT NULL,
    "legalName" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "logo" VARCHAR(2048),
    "email" VARCHAR(320),
    "phone" VARCHAR(32),
    "website" VARCHAR(2048),
    "industry" VARCHAR(120),
    "companyType" "CompanyType" NOT NULL DEFAULT 'PRIVATE',
    "taxRegistrationNumber" VARCHAR(100),
    "nationalTaxNumber" VARCHAR(100),
    "registrationNumber" VARCHAR(100),
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "country" CHAR(2) NOT NULL,
    "province" VARCHAR(120),
    "city" VARCHAR(120),
    "postalCode" VARCHAR(32),
    "address" VARCHAR(500),
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscriptionPlan" VARCHAR(80),
    "employeeLimit" INTEGER,
    "projectLimit" INTEGER,
    "storageLimit" BIGINT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "workingDays" "Weekday"[] DEFAULT ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']::"Weekday"[],
    "weekendDays" "Weekday"[] DEFAULT ARRAY['SATURDAY', 'SUNDAY']::"Weekday"[],
    "workingHoursStart" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "workingHoursEnd" VARCHAR(5) NOT NULL DEFAULT '17:00',
    "fiscalYearName" VARCHAR(80),
    "financialYearStart" VARCHAR(5) NOT NULL DEFAULT '01-01',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "dateFormat" VARCHAR(32) NOT NULL DEFAULT 'YYYY-MM-DD',
    "timeFormat" VARCHAR(8) NOT NULL DEFAULT '24h',
    "measurementSystem" "MeasurementSystem" NOT NULL DEFAULT 'METRIC',
    "distanceUnit" "DistanceUnit" NOT NULL DEFAULT 'METER',
    "temperatureUnit" "TemperatureUnit" NOT NULL DEFAULT 'CELSIUS',
    "language" VARCHAR(16) NOT NULL DEFAULT 'en',
    "defaultWarehouseId" UUID,
    "autoNumberingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "documentPrefixes" JSONB NOT NULL DEFAULT '{}',
    "taxSettings" JSONB NOT NULL DEFAULT '{}',
    "approvalSettings" JSONB NOT NULL DEFAULT '{}',
    "emailSettings" JSONB NOT NULL DEFAULT '{}',
    "notificationSettings" JSONB NOT NULL DEFAULT '{}',
    "projectDefaults" JSONB NOT NULL DEFAULT '{}',
    "attendanceRules" JSONB NOT NULL DEFAULT '{}',
    "payrollRules" JSONB NOT NULL DEFAULT '{}',
    "overtimeRules" JSONB NOT NULL DEFAULT '{}',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_branding" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "logoFileId" UUID,
    "faviconFileId" UUID,
    "reportHeaderFileId" UUID,
    "reportFooterFileId" UUID,
    "emailLogoFileId" UUID,
    "watermarkFileId" UUID,
    "primaryColor" VARCHAR(9) NOT NULL DEFAULT '#0F766E',
    "secondaryColor" VARCHAR(9) NOT NULL DEFAULT '#0F172A',
    "accentColor" VARCHAR(9) NOT NULL DEFAULT '#F59E0B',
    "theme" "ThemeMode" NOT NULL DEFAULT 'LIGHT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "company_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(32),
    "password" VARCHAR(255) NOT NULL,
    "profilePhoto" VARCHAR(2048),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_memberships" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "employeeCode" VARCHAR(50),
    "designationId" UUID,
    "departmentId" UUID,
    "branchId" UUID,
    "teamId" UUID,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "isCompanyOwner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "subject" VARCHAR(80) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "managerMembershipId" UUID,
    "businessUnitId" UUID,
    "regionId" UUID,
    "phone" VARCHAR(32),
    "email" VARCHAR(320),
    "address" VARCHAR(500),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "departmentCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "headMembershipId" UUID,
    "parentDepartmentId" UUID,
    "description" VARCHAR(1000),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000),
    "rank" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_units" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "managerMembershipId" UUID,
    "description" VARCHAR(1000),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "managerMembershipId" UUID,
    "description" VARCHAR(1000),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" "CostCenterType" NOT NULL,
    "managerMembershipId" UUID,
    "parentCostCenterId" UUID,
    "externalReferenceId" UUID,
    "description" VARCHAR(1000),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "departmentId" UUID,
    "branchId" UUID,
    "leadMembershipId" UUID,
    "description" VARCHAR(1000),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_lines" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "subordinateMembershipId" UUID NOT NULL,
    "managerMembershipId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "reporting_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID,
    "documentType" VARCHAR(50) NOT NULL,
    "prefixTemplate" VARCHAR(100) NOT NULL,
    "nextNumber" BIGINT NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 6,
    "resetPolicy" "SequenceResetPolicy" NOT NULL DEFAULT 'YEARLY',
    "currentPeriod" VARCHAR(20),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "objectKey" VARCHAR(1024) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(160) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" CHAR(64) NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    "virusScanStatus" "VirusScanStatus" NOT NULL DEFAULT 'NOT_SCANNED',
    "publicUrl" VARCHAR(2048),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "userId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity" VARCHAR(120) NOT NULL,
    "entityId" UUID NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" VARCHAR(64),
    "browser" VARCHAR(1000),
    "requestId" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_status_deletedAt_idx" ON "companies"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "companies_displayName_idx" ON "companies"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_companyId_key" ON "company_settings"("companyId");

-- CreateIndex
CREATE INDEX "company_settings_companyId_deletedAt_idx" ON "company_settings"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "company_branding_companyId_key" ON "company_branding"("companyId");

-- CreateIndex
CREATE INDEX "company_branding_companyId_deletedAt_idx" ON "company_branding"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_deletedAt_idx" ON "users"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "company_memberships_companyId_status_deletedAt_idx" ON "company_memberships"("companyId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "company_memberships_companyId_employeeCode_idx" ON "company_memberships"("companyId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "company_memberships_companyId_userId_key" ON "company_memberships"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "company_memberships_id_companyId_key" ON "company_memberships"("id", "companyId");

-- CreateIndex
CREATE INDEX "roles_companyId_deletedAt_idx" ON "roles"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_deletedAt_idx" ON "permissions"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_subject_action_key" ON "permissions"("subject", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON "role_permissions"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "membership_roles_companyId_deletedAt_idx" ON "membership_roles"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "membership_roles_membershipId_roleId_key" ON "membership_roles"("membershipId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_expiresAt_idx" ON "sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "branches_companyId_branchCode_deletedAt_idx" ON "branches"("companyId", "branchCode", "deletedAt");

-- CreateIndex
CREATE INDEX "branches_companyId_status_idx" ON "branches"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_id_companyId_key" ON "branches"("id", "companyId");

-- CreateIndex
CREATE INDEX "departments_companyId_departmentCode_deletedAt_idx" ON "departments"("companyId", "departmentCode", "deletedAt");

-- CreateIndex
CREATE INDEX "departments_companyId_status_idx" ON "departments"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "departments_id_companyId_key" ON "departments"("id", "companyId");

-- CreateIndex
CREATE INDEX "designations_companyId_code_deletedAt_idx" ON "designations"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE INDEX "designations_companyId_status_idx" ON "designations"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "designations_id_companyId_key" ON "designations"("id", "companyId");

-- CreateIndex
CREATE INDEX "business_units_companyId_code_deletedAt_idx" ON "business_units"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_id_companyId_key" ON "business_units"("id", "companyId");

-- CreateIndex
CREATE INDEX "regions_companyId_code_deletedAt_idx" ON "regions"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "regions_id_companyId_key" ON "regions"("id", "companyId");

-- CreateIndex
CREATE INDEX "cost_centers_companyId_code_deletedAt_idx" ON "cost_centers"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE INDEX "cost_centers_companyId_type_status_idx" ON "cost_centers"("companyId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_id_companyId_key" ON "cost_centers"("id", "companyId");

-- CreateIndex
CREATE INDEX "teams_companyId_code_deletedAt_idx" ON "teams"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE INDEX "teams_companyId_status_idx" ON "teams"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "teams_id_companyId_key" ON "teams"("id", "companyId");

-- CreateIndex
CREATE INDEX "reporting_lines_companyId_subordinateMembershipId_deletedAt_idx" ON "reporting_lines"("companyId", "subordinateMembershipId", "deletedAt");

-- CreateIndex
CREATE INDEX "reporting_lines_companyId_managerMembershipId_deletedAt_idx" ON "reporting_lines"("companyId", "managerMembershipId", "deletedAt");

-- CreateIndex
CREATE INDEX "document_sequences_companyId_documentType_deletedAt_idx" ON "document_sequences"("companyId", "documentType", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "file_objects_objectKey_key" ON "file_objects"("objectKey");

-- CreateIndex
CREATE INDEX "file_objects_companyId_purpose_status_deletedAt_idx" ON "file_objects"("companyId", "purpose", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_entity_entityId_createdAt_idx" ON "audit_logs"("companyId", "entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_faviconFileId_fkey" FOREIGN KEY ("faviconFileId") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_reportHeaderFileId_fkey" FOREIGN KEY ("reportHeaderFileId") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_reportFooterFileId_fkey" FOREIGN KEY ("reportFooterFileId") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_emailLogoFileId_fkey" FOREIGN KEY ("emailLogoFileId") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_branding" ADD CONSTRAINT "company_branding_watermarkFileId_fkey" FOREIGN KEY ("watermarkFileId") REFERENCES "file_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_designationId_companyId_fkey" FOREIGN KEY ("designationId", "companyId") REFERENCES "designations"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_departmentId_companyId_fkey" FOREIGN KEY ("departmentId", "companyId") REFERENCES "departments"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "branches"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_teamId_companyId_fkey" FOREIGN KEY ("teamId", "companyId") REFERENCES "teams"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membershipId_companyId_fkey" FOREIGN KEY ("membershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_managerMembershipId_companyId_fkey" FOREIGN KEY ("managerMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_businessUnitId_companyId_fkey" FOREIGN KEY ("businessUnitId", "companyId") REFERENCES "business_units"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_regionId_companyId_fkey" FOREIGN KEY ("regionId", "companyId") REFERENCES "regions"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headMembershipId_companyId_fkey" FOREIGN KEY ("headMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentDepartmentId_companyId_fkey" FOREIGN KEY ("parentDepartmentId", "companyId") REFERENCES "departments"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_managerMembershipId_companyId_fkey" FOREIGN KEY ("managerMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_managerMembershipId_companyId_fkey" FOREIGN KEY ("managerMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_managerMembershipId_companyId_fkey" FOREIGN KEY ("managerMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_parentCostCenterId_companyId_fkey" FOREIGN KEY ("parentCostCenterId", "companyId") REFERENCES "cost_centers"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_departmentId_companyId_fkey" FOREIGN KEY ("departmentId", "companyId") REFERENCES "departments"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "branches"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leadMembershipId_companyId_fkey" FOREIGN KEY ("leadMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_subordinateMembershipId_companyId_fkey" FOREIGN KEY ("subordinateMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_managerMembershipId_companyId_fkey" FOREIGN KEY ("managerMembershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "branches"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Concurrency-safe platform company-code allocator.
CREATE SEQUENCE "company_code_seq" START WITH 1 INCREMENT BY 1 NO CYCLE;

-- Soft-delete-aware legal and tenant uniqueness.
CREATE UNIQUE INDEX "companies_companyCode_active_key"
  ON "companies" (UPPER("companyCode"))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "companies_taxRegistrationNumber_active_key"
  ON "companies" (UPPER("taxRegistrationNumber"))
  WHERE "taxRegistrationNumber" IS NOT NULL AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "companies_nationalTaxNumber_active_key"
  ON "companies" (UPPER("nationalTaxNumber"))
  WHERE "nationalTaxNumber" IS NOT NULL AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "companies_registrationNumber_active_key"
  ON "companies" (UPPER("registrationNumber"))
  WHERE "registrationNumber" IS NOT NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "company_memberships_employeeCode_active_key"
  ON "company_memberships" ("companyId", UPPER("employeeCode"))
  WHERE "employeeCode" IS NOT NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "roles_global_name_active_key"
  ON "roles" (LOWER("name"))
  WHERE "companyId" IS NULL AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "roles_company_name_active_key"
  ON "roles" ("companyId", LOWER("name"))
  WHERE "companyId" IS NOT NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX "branches_company_code_active_key"
  ON "branches" ("companyId", UPPER("branchCode"))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "departments_company_code_active_key"
  ON "departments" ("companyId", UPPER("departmentCode"))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "designations_company_code_active_key"
  ON "designations" ("companyId", UPPER("code"))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "business_units_company_code_active_key"
  ON "business_units" ("companyId", UPPER("code"))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "regions_company_code_active_key"
  ON "regions" ("companyId", UPPER("code"))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "cost_centers_company_code_active_key"
  ON "cost_centers" ("companyId", UPPER("code"))
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "teams_company_code_active_key"
  ON "teams" ("companyId", UPPER("code"))
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "document_sequences_scope_active_key"
  ON "document_sequences" (
    "companyId",
    "documentType",
    COALESCE("branchId", '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "reporting_lines_primary_active_key"
  ON "reporting_lines" ("companyId", "subordinateMembershipId")
  WHERE "isPrimary" = TRUE AND "deletedAt" IS NULL;

-- Defensive database checks for values also validated at the API boundary.
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_limits_positive_check"
  CHECK (
    ("employeeLimit" IS NULL OR "employeeLimit" > 0)
    AND ("projectLimit" IS NULL OR "projectLimit" > 0)
    AND ("storageLimit" IS NULL OR "storageLimit" > 0)
  );
ALTER TABLE "branches"
  ADD CONSTRAINT "branches_coordinates_check"
  CHECK (
    ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90)
    AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
  );
ALTER TABLE "document_sequences"
  ADD CONSTRAINT "document_sequences_values_check"
  CHECK ("padding" BETWEEN 2 AND 12 AND "nextNumber" > 0);
ALTER TABLE "reporting_lines"
  ADD CONSTRAINT "reporting_lines_no_self_reference_check"
  CHECK ("subordinateMembershipId" <> "managerMembershipId");
