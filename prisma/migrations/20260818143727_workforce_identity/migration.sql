-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeAvailability" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ON_LEAVE', 'TRAINING', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('FUTURE', 'ACTIVE', 'SUSPENDED', 'ENDED');

-- CreateEnum
CREATE TYPE "EmployeeDocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'VISA', 'OFFER_LETTER', 'EMPLOYMENT_CONTRACT', 'EDUCATION_CERTIFICATE', 'EXPERIENCE_CERTIFICATE', 'MEDICAL_RECORD', 'TRAINING_CERTIFICATE', 'INSURANCE', 'NDA', 'OTHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMPTZ(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecretEncrypted" VARCHAR(1000);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID,
    "membershipId" UUID,
    "employeeCode" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "preferredName" VARCHAR(100),
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "dateOfBirth" DATE,
    "nationalId" VARCHAR(100),
    "passportNumber" VARCHAR(100),
    "nationality" VARCHAR(100),
    "religion" VARCHAR(100),
    "maritalStatus" "MaritalStatus" NOT NULL DEFAULT 'UNDISCLOSED',
    "bloodGroup" VARCHAR(10),
    "phone" VARCHAR(32),
    "emergencyContactName" VARCHAR(160),
    "emergencyContactPhone" VARCHAR(32),
    "emergencyContactRelationship" VARCHAR(100),
    "personalEmail" VARCHAR(320),
    "companyEmail" VARCHAR(320),
    "photoUrl" VARCHAR(2048),
    "signatureUrl" VARCHAR(2048),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "availability" "EmployeeAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "branchId" UUID,
    "departmentId" UUID,
    "designationId" UUID,
    "teamId" UUID,
    "managerEmployeeId" UUID,
    "employmentTypeId" UUID,
    "joiningDate" DATE NOT NULL,
    "confirmationDate" DATE,
    "resignationDate" DATE,
    "terminationDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_types" (
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

    CONSTRAINT "employment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "employmentTypeId" UUID NOT NULL,
    "branchId" UUID,
    "departmentId" UUID,
    "designationId" UUID,
    "managerEmployeeId" UUID,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "changeReason" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workforce_skills" (
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

    CONSTRAINT "workforce_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_skills" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "proficiencyLevel" SMALLINT,
    "yearsExperience" DECIMAL(5,2),
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_certifications" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "certificationNo" VARCHAR(100),
    "issueDate" DATE,
    "expiryDate" DATE,
    "issuingAuthority" VARCHAR(200),
    "fileObjectId" UUID,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employee_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_licenses" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "licenseType" VARCHAR(160) NOT NULL,
    "licenseNumber" VARCHAR(100),
    "issueDate" DATE,
    "expiryDate" DATE,
    "issuingAuthority" VARCHAR(200),
    "fileObjectId" UUID,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employee_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "fileObjectId" UUID,
    "documentType" "EmployeeDocumentType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "documentNumber" VARCHAR(100),
    "issuedAt" DATE,
    "expiresAt" DATE,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_project_assignments" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "role" "ProjectTeamRole" NOT NULL,
    "assignedAt" DATE NOT NULL,
    "unassignedAt" DATE,
    "allocationPct" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "workingHours" DECIMAL(6,2),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employee_project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_team_memberships" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "employee_team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_security_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "event" VARCHAR(120) NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(1000),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_membershipId_key" ON "employees"("membershipId");

-- CreateIndex
CREATE INDEX "employees_companyId_status_availability_deletedAt_idx" ON "employees"("companyId", "status", "availability", "deletedAt");

-- CreateIndex
CREATE INDEX "employees_companyId_departmentId_designationId_deletedAt_idx" ON "employees"("companyId", "departmentId", "designationId", "deletedAt");

-- CreateIndex
CREATE INDEX "employees_companyId_firstName_lastName_idx" ON "employees"("companyId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "employees_companyId_companyEmail_idx" ON "employees"("companyId", "companyEmail");

-- CreateIndex
CREATE UNIQUE INDEX "employees_id_companyId_key" ON "employees"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_membershipId_companyId_key" ON "employees"("membershipId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_employeeCode_key" ON "employees"("companyId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_userId_key" ON "employees"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyId_nationalId_key" ON "employees"("companyId", "nationalId");

-- CreateIndex
CREATE INDEX "employment_types_companyId_code_deletedAt_idx" ON "employment_types"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE INDEX "employments_companyId_employeeId_effectiveFrom_effectiveTo_idx" ON "employments"("companyId", "employeeId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "employments_companyId_status_deletedAt_idx" ON "employments"("companyId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "workforce_skills_companyId_code_deletedAt_idx" ON "workforce_skills"("companyId", "code", "deletedAt");

-- CreateIndex
CREATE INDEX "employee_skills_companyId_skillId_deletedAt_idx" ON "employee_skills"("companyId", "skillId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "employee_skills_employeeId_skillId_key" ON "employee_skills"("employeeId", "skillId");

-- CreateIndex
CREATE INDEX "employee_certifications_companyId_employeeId_expiryDate_del_idx" ON "employee_certifications"("companyId", "employeeId", "expiryDate", "deletedAt");

-- CreateIndex
CREATE INDEX "employee_licenses_companyId_employeeId_expiryDate_deletedAt_idx" ON "employee_licenses"("companyId", "employeeId", "expiryDate", "deletedAt");

-- CreateIndex
CREATE INDEX "employee_documents_companyId_employeeId_documentType_expire_idx" ON "employee_documents"("companyId", "employeeId", "documentType", "expiresAt", "deletedAt");

-- CreateIndex
CREATE INDEX "employee_project_assignments_companyId_projectId_status_del_idx" ON "employee_project_assignments"("companyId", "projectId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "employee_project_assignments_companyId_employeeId_status_de_idx" ON "employee_project_assignments"("companyId", "employeeId", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "employee_project_assignments_employeeId_projectId_role_key" ON "employee_project_assignments"("employeeId", "projectId", "role");

-- CreateIndex
CREATE INDEX "employee_team_memberships_companyId_teamId_status_deletedAt_idx" ON "employee_team_memberships"("companyId", "teamId", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "employee_team_memberships_employeeId_teamId_key" ON "employee_team_memberships"("employeeId", "teamId");

-- CreateIndex
CREATE INDEX "user_security_logs_userId_occurredAt_idx" ON "user_security_logs"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "user_security_logs_event_occurredAt_idx" ON "user_security_logs"("event", "occurredAt");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_membershipId_companyId_fkey" FOREIGN KEY ("membershipId", "companyId") REFERENCES "company_memberships"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "branches"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_companyId_fkey" FOREIGN KEY ("departmentId", "companyId") REFERENCES "departments"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designationId_companyId_fkey" FOREIGN KEY ("designationId", "companyId") REFERENCES "designations"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_managerEmployeeId_companyId_fkey" FOREIGN KEY ("managerEmployeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_employmentTypeId_fkey" FOREIGN KEY ("employmentTypeId") REFERENCES "employment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_types" ADD CONSTRAINT "employment_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_employeeId_companyId_fkey" FOREIGN KEY ("employeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_employmentTypeId_fkey" FOREIGN KEY ("employmentTypeId") REFERENCES "employment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_branchId_companyId_fkey" FOREIGN KEY ("branchId", "companyId") REFERENCES "branches"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_departmentId_companyId_fkey" FOREIGN KEY ("departmentId", "companyId") REFERENCES "departments"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_designationId_companyId_fkey" FOREIGN KEY ("designationId", "companyId") REFERENCES "designations"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employments" ADD CONSTRAINT "employments_managerEmployeeId_companyId_fkey" FOREIGN KEY ("managerEmployeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workforce_skills" ADD CONSTRAINT "workforce_skills_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employeeId_companyId_fkey" FOREIGN KEY ("employeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "workforce_skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_employeeId_companyId_fkey" FOREIGN KEY ("employeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_licenses" ADD CONSTRAINT "employee_licenses_employeeId_companyId_fkey" FOREIGN KEY ("employeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_licenses" ADD CONSTRAINT "employee_licenses_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_companyId_fkey" FOREIGN KEY ("employeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project_assignments" ADD CONSTRAINT "employee_project_assignments_employeeId_companyId_fkey" FOREIGN KEY ("employeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project_assignments" ADD CONSTRAINT "employee_project_assignments_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_team_memberships" ADD CONSTRAINT "employee_team_memberships_employeeId_companyId_fkey" FOREIGN KEY ("employeeId", "companyId") REFERENCES "employees"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_team_memberships" ADD CONSTRAINT "employee_team_memberships_teamId_companyId_fkey" FOREIGN KEY ("teamId", "companyId") REFERENCES "teams"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_security_logs" ADD CONSTRAINT "user_security_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "activity_progress_companyId_projectId_activityId_progressDate_i" RENAME TO "activity_progress_companyId_projectId_activityId_progressDa_idx";

-- RenameIndex
ALTER INDEX "project_tasks_companyId_projectId_plannedStartDate_plannedEndDa" RENAME TO "project_tasks_companyId_projectId_plannedStartDate_plannedE_idx";

-- RenameIndex
ALTER INDEX "project_tasks_companyId_projectId_status_isCritical_deletedAt_i" RENAME TO "project_tasks_companyId_projectId_status_isCritical_deleted_idx";

-- RenameIndex
ALTER INDEX "project_wbs_companyId_projectId_parentId_sortOrder_deletedAt_id" RENAME TO "project_wbs_companyId_projectId_parentId_sortOrder_deletedA_idx";
