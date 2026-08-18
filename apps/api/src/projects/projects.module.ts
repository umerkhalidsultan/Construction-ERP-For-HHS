import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CompaniesModule } from '../companies/companies.module';
import { ProjectsService } from './application/projects.service';
import { PROJECTS_SERVICE } from './application/projects.service.interface';
import { PROJECT_REPOSITORY } from './domain/project.repository';
import { PrismaProjectRepository } from './infrastructure/prisma-project.repository';
import { ProjectCalendarController } from './presentation/project-calendar.controller';
import { ProjectDocumentsController } from './presentation/project-documents.controller';
import { ProjectMilestonesController } from './presentation/project-milestones.controller';
import { ProjectPhasesController } from './presentation/project-phases.controller';
import { ProjectSettingsController } from './presentation/project-settings.controller';
import { ProjectTagsController } from './presentation/project-tags.controller';
import { ProjectTeamController } from './presentation/project-team.controller';
import { ProjectsController } from './presentation/projects.controller';
import { PlanningController } from './planning/planning.controller';
import { PlanningService } from './planning/planning.service';

@Module({
  imports: [AuditModule, CompaniesModule],
  controllers: [
    ProjectsController,
    ProjectPhasesController,
    ProjectMilestonesController,
    ProjectTeamController,
    ProjectDocumentsController,
    ProjectCalendarController,
    ProjectSettingsController,
    ProjectTagsController,
    PlanningController,
  ],
  providers: [
    ProjectsService,
    PrismaProjectRepository,
    PlanningService,
    { provide: PROJECTS_SERVICE, useExisting: ProjectsService },
    { provide: PROJECT_REPOSITORY, useExisting: PrismaProjectRepository },
  ],
  exports: [PROJECTS_SERVICE],
})
export class ProjectsModule {}
