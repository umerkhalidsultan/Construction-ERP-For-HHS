import { apiRequest, toQuery } from '../lib/api-client';
import type {
  Project,
  ProjectCalendarEvent,
  ProjectDashboard,
  ProjectDocument,
  ProjectMilestone,
  ProjectPhase,
  ProjectSettings,
  ProjectStatusDefinition,
  ProjectTag,
  ProjectTeamMember,
  ProjectTimeline,
  ProjectTypeDefinition,
} from '../types/api';

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  lifecycleStatus?: string;
  statusId?: string;
  projectTypeId?: string;
  projectManagerId?: string;
  clientId?: string;
  city?: string;
  country?: string;
  branchId?: string;
  departmentId?: string;
  tagId?: string;
  minBudget?: number;
  maxBudget?: number;
  includeDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function base(companyId: string) {
  return `/companies/${companyId}/projects`;
}

export async function listProjects(
  companyId: string,
  params: ProjectListParams = {},
) {
  return apiRequest<Project[]>(`${base(companyId)}${toQuery(params)}`);
}

export async function getProject(companyId: string, projectId: string) {
  return apiRequest<Project>(`${base(companyId)}/${projectId}`);
}

export async function createProject(
  companyId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<Project>(base(companyId), { method: 'POST', body });
}

export async function updateProject(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<Project>(`${base(companyId)}/${projectId}`, {
    method: 'PATCH',
    body,
  });
}

export async function deleteProject(companyId: string, projectId: string) {
  return apiRequest<Project>(`${base(companyId)}/${projectId}`, {
    method: 'DELETE',
  });
}

export async function restoreProject(companyId: string, projectId: string) {
  return apiRequest<Project>(`${base(companyId)}/${projectId}/restore`, {
    method: 'POST',
  });
}

export async function updateProjectStatus(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<Project>(`${base(companyId)}/${projectId}/status`, {
    method: 'PATCH',
    body,
  });
}

export async function getProjectDashboard(
  companyId: string,
  projectId: string,
) {
  return apiRequest<ProjectDashboard>(
    `${base(companyId)}/${projectId}/dashboard`,
  );
}

export async function getProjectTimeline(companyId: string, projectId: string) {
  return apiRequest<ProjectTimeline>(
    `${base(companyId)}/${projectId}/timeline`,
  );
}

export async function listProjectStatuses(companyId: string) {
  return apiRequest<ProjectStatusDefinition[]>(
    `${base(companyId)}/catalog/statuses`,
  );
}

export async function listProjectTypes(companyId: string) {
  return apiRequest<ProjectTypeDefinition[]>(
    `${base(companyId)}/catalog/types`,
  );
}

export async function listPhases(companyId: string, projectId: string) {
  return apiRequest<ProjectPhase[]>(`${base(companyId)}/${projectId}/phases`);
}

export async function createPhase(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectPhase>(`${base(companyId)}/${projectId}/phases`, {
    method: 'POST',
    body,
  });
}

export async function updatePhase(
  companyId: string,
  projectId: string,
  phaseId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectPhase>(
    `${base(companyId)}/${projectId}/phases/${phaseId}`,
    { method: 'PATCH', body },
  );
}

export async function deletePhase(
  companyId: string,
  projectId: string,
  phaseId: string,
) {
  return apiRequest<ProjectPhase>(
    `${base(companyId)}/${projectId}/phases/${phaseId}`,
    { method: 'DELETE' },
  );
}

export async function createTask(
  companyId: string,
  projectId: string,
  phaseId: string,
  body: Record<string, unknown>,
) {
  return apiRequest(`${base(companyId)}/${projectId}/phases/${phaseId}/tasks`, {
    method: 'POST',
    body,
  });
}

export async function listMilestones(companyId: string, projectId: string) {
  return apiRequest<ProjectMilestone[]>(
    `${base(companyId)}/${projectId}/milestones`,
  );
}

export async function createMilestone(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectMilestone>(
    `${base(companyId)}/${projectId}/milestones`,
    { method: 'POST', body },
  );
}

export async function updateMilestone(
  companyId: string,
  projectId: string,
  milestoneId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectMilestone>(
    `${base(companyId)}/${projectId}/milestones/${milestoneId}`,
    { method: 'PATCH', body },
  );
}

export async function deleteMilestone(
  companyId: string,
  projectId: string,
  milestoneId: string,
) {
  return apiRequest<ProjectMilestone>(
    `${base(companyId)}/${projectId}/milestones/${milestoneId}`,
    { method: 'DELETE' },
  );
}

export async function listTeam(companyId: string, projectId: string) {
  return apiRequest<ProjectTeamMember[]>(
    `${base(companyId)}/${projectId}/team`,
  );
}

export async function assignTeam(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectTeamMember>(`${base(companyId)}/${projectId}/team`, {
    method: 'POST',
    body,
  });
}

export async function unassignTeam(
  companyId: string,
  projectId: string,
  memberId: string,
) {
  return apiRequest<ProjectTeamMember>(
    `${base(companyId)}/${projectId}/team/${memberId}`,
    { method: 'DELETE' },
  );
}

export async function listDocuments(companyId: string, projectId: string) {
  return apiRequest<ProjectDocument[]>(
    `${base(companyId)}/${projectId}/documents`,
  );
}

export async function createDocument(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectDocument>(
    `${base(companyId)}/${projectId}/documents`,
    { method: 'POST', body },
  );
}

export async function deleteDocument(
  companyId: string,
  projectId: string,
  documentId: string,
) {
  return apiRequest<ProjectDocument>(
    `${base(companyId)}/${projectId}/documents/${documentId}`,
    { method: 'DELETE' },
  );
}

export async function listCalendar(
  companyId: string,
  projectId: string,
  params: { from?: string; to?: string } = {},
) {
  return apiRequest<ProjectCalendarEvent[]>(
    `${base(companyId)}/${projectId}/calendar${toQuery(params)}`,
  );
}

export async function createCalendarEvent(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectCalendarEvent>(
    `${base(companyId)}/${projectId}/calendar`,
    { method: 'POST', body },
  );
}

export async function deleteCalendarEvent(
  companyId: string,
  projectId: string,
  eventId: string,
) {
  return apiRequest<ProjectCalendarEvent>(
    `${base(companyId)}/${projectId}/calendar/${eventId}`,
    { method: 'DELETE' },
  );
}

export async function getProjectSettings(companyId: string, projectId: string) {
  return apiRequest<ProjectSettings>(
    `${base(companyId)}/${projectId}/settings`,
  );
}

export async function updateProjectSettings(
  companyId: string,
  projectId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectSettings>(
    `${base(companyId)}/${projectId}/settings`,
    { method: 'PATCH', body },
  );
}

export async function listProjectTags(companyId: string) {
  return apiRequest<ProjectTag[]>(`/companies/${companyId}/project-tags`);
}

export async function createProjectTag(
  companyId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ProjectTag>(`/companies/${companyId}/project-tags`, {
    method: 'POST',
    body,
  });
}

export async function assignProjectTag(
  companyId: string,
  projectId: string,
  tagId: string,
) {
  return apiRequest(`${base(companyId)}/${projectId}/tags`, {
    method: 'POST',
    body: { tagId },
  });
}

export async function unassignProjectTag(
  companyId: string,
  projectId: string,
  tagId: string,
) {
  return apiRequest(`${base(companyId)}/${projectId}/tags/${tagId}`, {
    method: 'DELETE',
  });
}
