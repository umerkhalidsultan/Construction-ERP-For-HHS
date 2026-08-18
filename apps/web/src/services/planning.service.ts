import { apiRequest, toQuery } from '../lib/api-client';
import type {
  ActivityDependency,
  GanttData,
  PlanningActivity,
  PlanningDashboard,
  ProjectBaseline,
  ProjectWbs,
} from '../types/api';

const base = (companyId: string, projectId: string) =>
  `/companies/${companyId}/projects/${projectId}/planning`;

export const getPlanningDashboard = (companyId: string, projectId: string) =>
  apiRequest<PlanningDashboard>(`${base(companyId, projectId)}/dashboard`);
export const listWbs = (companyId: string, projectId: string) =>
  apiRequest<ProjectWbs[]>(`${base(companyId, projectId)}/wbs`);
export const createWbs = (companyId: string, projectId: string, body: Record<string, unknown>) =>
  apiRequest<ProjectWbs>(`${base(companyId, projectId)}/wbs`, { method: 'POST', body });
export const updateWbs = (companyId: string, projectId: string, id: string, body: Record<string, unknown>) =>
  apiRequest<ProjectWbs>(`${base(companyId, projectId)}/wbs/${id}`, { method: 'PATCH', body });
export const deleteWbs = (companyId: string, projectId: string, id: string) =>
  apiRequest<ProjectWbs>(`${base(companyId, projectId)}/wbs/${id}`, { method: 'DELETE' });
export const listActivities = (companyId: string, projectId: string, params: Record<string, unknown> = {}) =>
  apiRequest<PlanningActivity[]>(`${base(companyId, projectId)}/activities${toQuery(params)}`);
export const createActivity = (companyId: string, projectId: string, body: Record<string, unknown>) =>
  apiRequest<PlanningActivity>(`${base(companyId, projectId)}/activities`, { method: 'POST', body });
export const updateActivity = (companyId: string, projectId: string, id: string, body: Record<string, unknown>) =>
  apiRequest<PlanningActivity>(`${base(companyId, projectId)}/activities/${id}`, { method: 'PATCH', body });
export const deleteActivity = (companyId: string, projectId: string, id: string) =>
  apiRequest<PlanningActivity>(`${base(companyId, projectId)}/activities/${id}`, { method: 'DELETE' });
export const createDependency = (companyId: string, projectId: string, body: Record<string, unknown>) =>
  apiRequest<ActivityDependency>(`${base(companyId, projectId)}/dependencies`, { method: 'POST', body });
export const deleteDependency = (companyId: string, projectId: string, id: string) =>
  apiRequest<ActivityDependency>(`${base(companyId, projectId)}/dependencies/${id}`, { method: 'DELETE' });
export const updateProgress = (companyId: string, projectId: string, id: string, body: Record<string, unknown>) =>
  apiRequest(`${base(companyId, projectId)}/activities/${id}/progress`, { method: 'POST', body });
export const listBaselines = (companyId: string, projectId: string) =>
  apiRequest<ProjectBaseline[]>(`${base(companyId, projectId)}/baselines`);
export const createBaseline = (companyId: string, projectId: string, body: Record<string, unknown>) =>
  apiRequest<ProjectBaseline>(`${base(companyId, projectId)}/baselines`, { method: 'POST', body });
export const approveBaseline = (companyId: string, projectId: string, id: string) =>
  apiRequest<ProjectBaseline>(`${base(companyId, projectId)}/baselines/${id}/approve`, { method: 'POST' });
export const getGantt = (companyId: string, projectId: string) =>
  apiRequest<GanttData>(`${base(companyId, projectId)}/gantt`);
export const recalculateSchedule = (companyId: string, projectId: string) =>
  apiRequest(`${base(companyId, projectId)}/recalculate`, { method: 'POST' });
