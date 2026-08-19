import { apiRequest, toQuery } from '../lib/api-client';

export type ActivityRelatedType = 'LEAD' | 'CRM_COMPANY' | 'CRM_CONTACT' | 'OPPORTUNITY';
export type ActivityType = 'CALL' | 'MEETING' | 'SITE_VISIT' | 'EMAIL' | 'WHATSAPP' | 'FOLLOW_UP' | 'TASK' | 'NOTE' | 'OTHER';
export type ActivityStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ActivityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ActivityAssignee { id: string; user: { id: string; firstName: string; lastName: string; email: string } }
export interface ActivityAttachment { id: string; title?: string; description?: string; createdAt: string; file: { id: string; originalName: string; mimeType: string; sizeBytes: string; publicUrl?: string; status: string } }
export interface ActivityTimelineItem { id: string; action: string; oldValue?: Record<string, unknown>; newValue?: Record<string, unknown>; createdAt: string; user?: { id: string; firstName: string; lastName: string } | null }

export interface Activity {
  id: string; relatedType: ActivityRelatedType; type: ActivityType; subject: string; description?: string;
  status: ActivityStatus; priority: ActivityPriority; startAt?: string; endAt?: string; dueDate?: string; completedAt?: string;
  location?: string; participants?: string; contactPhone?: string; callDurationMinutes?: number;
  emailTo?: string; emailCc?: string; purpose?: string; observations?: string; outcome?: string;
  nextAction?: string; nextFollowUpDate?: string; reminderMinutesBefore?: number;
  isOverdue: boolean; effectiveStatus: string;
  assignedTo?: ActivityAssignee | null;
  lead?: { id: string; leadNumber: string; name: string } | null;
  crmCompany?: { id: string; name: string } | null;
  crmContact?: { id: string; firstName: string; lastName?: string } | null;
  opportunity?: { id: string; opportunityNumber: string; name: string } | null;
  attachments?: ActivityAttachment[];
  createdAt: string; updatedAt: string; createdBy?: string;
}

export interface ActivityInput {
  relatedType: ActivityRelatedType; leadId?: string; crmCompanyId?: string; crmContactId?: string; opportunityId?: string;
  type: ActivityType; subject: string; description?: string; assignedToId: string; priority?: ActivityPriority;
  startAt?: string; endAt?: string; dueDate?: string; location?: string; participants?: string; contactPhone?: string;
  callDurationMinutes?: number; emailTo?: string; emailCc?: string; purpose?: string; observations?: string;
  outcome?: string; nextAction?: string; nextFollowUpDate?: string; reminderMinutesBefore?: number;
}

export interface ActivityCatalog {
  types: ActivityType[]; statuses: ActivityStatus[]; priorities: ActivityPriority[]; relatedTypes: ActivityRelatedType[];
}

export interface ActivityDashboard {
  today: { total: number; byType: Array<{ type: ActivityType; count: number }> };
  overdue: number; completedThisWeek: number; pendingFollowUps: number;
}

export interface ActivityTeamRow {
  assignee: ActivityAssignee | null;
  byStatus: Array<{ status: ActivityStatus; count: number }>;
  overdue: number;
}

const root = (companyId: string) => `/companies/${companyId}/crm/activities`;
export const listActivities = (companyId: string, query: Record<string, unknown>) => apiRequest<Activity[]>(`${root(companyId)}${toQuery(query)}`);
export const getActivity = (companyId: string, activityId: string) => apiRequest<Activity>(`${root(companyId)}/${activityId}`);
export const createActivity = (companyId: string, body: ActivityInput) => apiRequest<Activity>(root(companyId), { method: 'POST', body });
export const updateActivity = (companyId: string, activityId: string, body: Partial<ActivityInput>) => apiRequest<Activity>(`${root(companyId)}/${activityId}`, { method: 'PATCH', body });
export const deleteActivity = (companyId: string, activityId: string) => apiRequest<Activity>(`${root(companyId)}/${activityId}`, { method: 'DELETE' });
export const assignActivity = (companyId: string, activityId: string, assignedToId: string) => apiRequest<Activity>(`${root(companyId)}/${activityId}/assign`, { method: 'PATCH', body: { assignedToId } });
export const completeActivity = (companyId: string, activityId: string, body: { completedAt?: string; outcome?: string; nextAction?: string; nextFollowUpDate?: string }) => apiRequest<{ activity: Activity; followUp: Activity | null }>(`${root(companyId)}/${activityId}/complete`, { method: 'PATCH', body });
export const cancelActivity = (companyId: string, activityId: string, reason?: string) => apiRequest<Activity>(`${root(companyId)}/${activityId}/cancel`, { method: 'PATCH', body: { reason } });
export const rescheduleActivity = (companyId: string, activityId: string, body: { dueDate?: string; startAt?: string; endAt?: string; reason: string }) => apiRequest<Activity>(`${root(companyId)}/${activityId}/reschedule`, { method: 'PATCH', body });
export const getActivityDashboard = (companyId: string) => apiRequest<ActivityDashboard>(`${root(companyId)}/dashboard`);
export const getActivityTeamView = (companyId: string) => apiRequest<ActivityTeamRow[]>(`${root(companyId)}/team`);
export const getActivityCalendar = (companyId: string, from: string, to: string, assignedToId?: string) => apiRequest<Activity[]>(`${root(companyId)}/calendar${toQuery({ from, to, assignedToId })}`);
export const getActivityCatalog = (companyId: string) => apiRequest<ActivityCatalog>(`${root(companyId)}/catalog`);
export const getActivityAssignees = (companyId: string) => apiRequest<ActivityAssignee[]>(`${root(companyId)}/assignees`);
export const exportActivities = (companyId: string, query: Record<string, unknown>) => fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}${root(companyId)}/export${toQuery(query)}`, { credentials: 'include' });
export const getActivityTimeline = (companyId: string, activityId: string) => apiRequest<ActivityTimelineItem[]>(`${root(companyId)}/${activityId}/timeline`);
export const addActivityAttachment = (companyId: string, activityId: string, body: { fileId: string; title?: string; description?: string }) => apiRequest<ActivityAttachment>(`${root(companyId)}/${activityId}/attachments`, { method: 'POST', body });
export const deleteActivityAttachment = (companyId: string, activityId: string, attachmentId: string) => apiRequest<ActivityAttachment>(`${root(companyId)}/${activityId}/attachments/${attachmentId}`, { method: 'DELETE' });
