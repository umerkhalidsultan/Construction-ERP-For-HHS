import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectQueryDto } from '../dto/project-query.dto';
import { UpdateProjectStatusDto } from '../dto/project-status.dto';
import {
  CreateProjectPhaseDto,
  CreateProjectTaskDto,
  UpdateProjectPhaseDto,
  UpdateProjectTaskDto,
} from '../dto/project-phase.dto';
import {
  CreateMilestoneDependencyDto,
  CreateProjectMilestoneDto,
  UpdateProjectMilestoneDto,
} from '../dto/project-milestone.dto';
import {
  AssignProjectTeamDto,
  UpdateProjectTeamDto,
} from '../dto/project-team.dto';
import {
  CreateProjectDocumentDto,
  UpdateProjectDocumentDto,
} from '../dto/project-document.dto';
import {
  CreateProjectCalendarEventDto,
  ProjectCalendarQueryDto,
  UpdateProjectCalendarEventDto,
} from '../dto/project-calendar.dto';
import { UpdateProjectSettingsDto } from '../dto/project-settings.dto';
import {
  AssignProjectTagDto,
  CreateProjectTagDto,
  UpdateProjectTagDto,
} from '../dto/project-tag.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';

export interface IProjectsService {
  create(
    companyId: string,
    dto: CreateProjectDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  list(
    companyId: string,
    query: ProjectQueryDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  get(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  update(
    companyId: string,
    projectId: string,
    dto: UpdateProjectDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  delete(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  restore(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateStatus(
    companyId: string,
    projectId: string,
    dto: UpdateProjectStatusDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  dashboard(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  timeline(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listStatuses(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listTypes(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listPhases(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createPhase(
    companyId: string,
    projectId: string,
    dto: CreateProjectPhaseDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updatePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    dto: UpdateProjectPhaseDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deletePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    dto: CreateProjectTaskDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    dto: UpdateProjectTaskDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listMilestones(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createMilestone(
    companyId: string,
    projectId: string,
    dto: CreateProjectMilestoneDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dto: UpdateProjectMilestoneDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  addMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dto: CreateMilestoneDependencyDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  removeMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dependencyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listTeam(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  assignTeam(
    companyId: string,
    projectId: string,
    dto: AssignProjectTeamDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    dto: UpdateProjectTeamDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  unassignTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listDocuments(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createDocument(
    companyId: string,
    projectId: string,
    dto: CreateProjectDocumentDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    dto: UpdateProjectDocumentDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listCalendar(
    companyId: string,
    projectId: string,
    query: ProjectCalendarQueryDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createCalendarEvent(
    companyId: string,
    projectId: string,
    dto: CreateProjectCalendarEventDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    dto: UpdateProjectCalendarEventDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  getSettings(
    companyId: string,
    projectId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateSettings(
    companyId: string,
    projectId: string,
    dto: UpdateProjectSettingsDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  listTags(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  createTag(
    companyId: string,
    dto: CreateProjectTagDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateTag(
    companyId: string,
    tagId: string,
    dto: UpdateProjectTagDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  deleteTag(
    companyId: string,
    tagId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  assignTag(
    companyId: string,
    projectId: string,
    dto: AssignProjectTagDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  unassignTag(
    companyId: string,
    projectId: string,
    tagId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
}

export const PROJECTS_SERVICE = Symbol('PROJECTS_SERVICE');
