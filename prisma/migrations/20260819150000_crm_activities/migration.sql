-- AlterEnum
BEGIN;
CREATE TYPE "CrmActivityRelatedType_new" AS ENUM ('LEAD', 'CRM_COMPANY', 'CRM_CONTACT', 'OPPORTUNITY');
ALTER TABLE "crm_activities" ALTER COLUMN "relatedType" TYPE "CrmActivityRelatedType_new" USING ("relatedType"::text::"CrmActivityRelatedType_new");
ALTER TYPE "CrmActivityRelatedType" RENAME TO "CrmActivityRelatedType_old";
ALTER TYPE "CrmActivityRelatedType_new" RENAME TO "CrmActivityRelatedType";
DROP TYPE "public"."CrmActivityRelatedType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "CrmActivityStatus_new" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."crm_activities" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "crm_activities" ALTER COLUMN "status" TYPE "CrmActivityStatus_new" USING ("status"::text::"CrmActivityStatus_new");
ALTER TYPE "CrmActivityStatus" RENAME TO "CrmActivityStatus_old";
ALTER TYPE "CrmActivityStatus_new" RENAME TO "CrmActivityStatus";
DROP TYPE "public"."CrmActivityStatus_old";
ALTER TABLE "crm_activities" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
COMMIT;

-- DropForeignKey
ALTER TABLE "crm_activities" DROP CONSTRAINT "crm_activities_cancelledById_companyId_fkey";

-- DropForeignKey
ALTER TABLE "crm_activities" DROP CONSTRAINT "crm_activities_completedById_companyId_fkey";

-- DropForeignKey
ALTER TABLE "opportunity_activities" DROP CONSTRAINT "opportunity_activities_assignedToId_companyId_fkey";

-- DropForeignKey
ALTER TABLE "opportunity_activities" DROP CONSTRAINT "opportunity_activities_companyId_fkey";

-- DropForeignKey
ALTER TABLE "opportunity_activities" DROP CONSTRAINT "opportunity_activities_opportunityId_companyId_fkey";

-- DropIndex
DROP INDEX "crm_activities_companyId_type_status_deletedAt_idx";

-- AlterTable
ALTER TABLE "crm_activities" DROP COLUMN "callDuration",
DROP COLUMN "cancellationReason",
DROP COLUMN "cancelledAt",
DROP COLUMN "cancelledById",
DROP COLUMN "completedById",
DROP COLUMN "endDate",
DROP COLUMN "phoneNumber",
DROP COLUMN "reminderSent",
DROP COLUMN "rescheduledCount",
DROP COLUMN "startDate",
DROP COLUMN "typeCode",
ADD COLUMN     "callDurationMinutes" INTEGER,
ADD COLUMN     "contactPhone" VARCHAR(32),
ADD COLUMN     "endAt" TIMESTAMPTZ(3),
ADD COLUMN     "startAt" TIMESTAMPTZ(3),
ALTER COLUMN "assignedToId" SET NOT NULL,
ALTER COLUMN "emailTo" SET DATA TYPE VARCHAR(500);

-- DropTable
DROP TABLE "crm_activity_history";

-- DropTable
DROP TABLE "crm_activity_type_definitions";

-- DropTable
DROP TABLE "crm_notifications";

-- DropTable
DROP TABLE "opportunity_activities";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "OpportunityActivityStatus";

-- DropEnum
DROP TYPE "OpportunityActivityType";

-- CreateIndex
CREATE INDEX "crm_activities_companyId_nextFollowUpDate_deletedAt_idx" ON "crm_activities"("companyId", "nextFollowUpDate", "deletedAt");

-- CreateIndex
CREATE INDEX "crm_activities_companyId_type_deletedAt_idx" ON "crm_activities"("companyId", "type", "deletedAt");

-- CreateIndex
CREATE INDEX "crm_activities_companyId_createdBy_deletedAt_idx" ON "crm_activities"("companyId", "createdBy", "deletedAt");
