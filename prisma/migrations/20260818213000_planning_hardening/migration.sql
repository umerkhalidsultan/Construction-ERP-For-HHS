-- Link network milestones to the ERP's existing canonical milestone records.
ALTER TABLE "project_milestones" ADD COLUMN "activityId" UUID;
CREATE UNIQUE INDEX "project_milestones_activityId_key" ON "project_milestones"("activityId");
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
