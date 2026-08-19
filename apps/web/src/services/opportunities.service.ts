import { apiRequest, toQuery } from '../lib/api-client';

export type OpportunityStatus = 'OPEN' | 'WON' | 'LOST';
export type OpportunityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface CatalogItem { id: string; code: string; name: string }
export interface OpportunityStage { id: string; code: string; name: string; probability: number; sortOrder: number; isWon: boolean; isLost: boolean }
export interface OpportunityAssignee { id: string; user: { id: string; firstName: string; lastName: string; email: string } }
export interface OpportunityNote { id: string; note: string; createdAt: string; updatedAt: string; createdBy?: string }
export interface OpportunityAttachment { id: string; title?: string; description?: string; createdAt: string; file: { id: string; originalName: string; mimeType: string; sizeBytes: string; publicUrl?: string; status: string } }
export interface OpportunityStageHistoryItem {
  id: string; fromStage?: { id: string; code: string; name: string } | null; toStage: { id: string; code: string; name: string; probability: number; isWon: boolean; isLost: boolean };
  reason?: string; changedAt: string; changedBy?: { id: string; user: { id: string; firstName: string; lastName: string } } | null;
}
export interface OpportunityTimelineItem { id: string; action: string; oldValue?: Record<string, unknown>; newValue?: Record<string, unknown>; createdAt: string; user?: { id: string; firstName: string; lastName: string } | null }

export interface Opportunity {
  id: string; opportunityNumber: string; name: string; status: OpportunityStatus; priority: OpportunityPriority;
  projectLocation?: string; city?: string; area?: string; estimatedContractValue?: string; currency: string;
  probability: number; weightedValue?: string; expectedClosingDate?: string; expectedStartDate?: string; expectedCompletionDate?: string;
  description?: string; wonDate?: string; finalContractValue?: string; winReason?: string; competitor?: string; winRemarks?: string;
  lostDate?: string; lostRemarks?: string; leadId?: string; lastActivityAt: string; createdAt: string; updatedAt: string;
  stage: { id: string; code: string; name: string; probability: number; isWon: boolean; isLost: boolean };
  opportunityType: CatalogItem; source: CatalogItem; lostReason?: CatalogItem | null;
  assignedTo?: OpportunityAssignee | null;
  crmCompany?: { id: string; name: string; email?: string; phone?: string; city?: string } | null;
  crmContact?: { id: string; firstName: string; lastName?: string; email?: string; phone?: string; crmCompanyId?: string } | null;
  lead?: { id: string; leadNumber: string; name: string; status: string } | null;
  notes?: OpportunityNote[]; attachments?: OpportunityAttachment[];
}
export interface OpportunityInput {
  name: string; opportunityTypeId: string; sourceId: string; stageId?: string; crmCompanyId?: string; crmContactId?: string;
  projectLocation?: string; city?: string; area?: string; estimatedContractValue?: number; currency?: string;
  probability?: number; priority?: OpportunityPriority; expectedClosingDate?: string; expectedStartDate?: string;
  expectedCompletionDate?: string; assignedToId?: string; description?: string;
}
export interface ConvertLeadInput {
  leadId: string; opportunityTypeId: string; sourceId: string; name?: string; estimatedContractValue?: number; currency?: string;
  probability?: number; priority?: OpportunityPriority; expectedClosingDate?: string; expectedStartDate?: string;
  expectedCompletionDate?: string; assignedToId?: string; description?: string;
}

export interface OpportunityDashboard {
  byStatus: { OPEN: number; WON: number; LOST: number };
  pipelineValue: string; weightedPipeline: string; wonValue: string; lostValue: string;
  conversionRate: number; overdueCount: number; avgSalesCycleDays: number;
}
export interface OpportunityPipeline {
  byStage: Array<{ stage: OpportunityStage | null; count: number; totalValue: string; weightedValue: string }>;
  totals: { count: number; totalValue: string; weightedValue: string };
}
export interface OpportunityForecast {
  month: string; nextMonth: string;
  pipeline: { count: number; value: string; weighted: string };
  expectedClosingThisMonth: { count: number; value: string; weighted: string };
  expectedClosingNextMonth: { count: number; value: string; weighted: string };
  wonThisMonth: { count: number; value: string };
  wonNextMonth: { count: number; value: string };
  lostThisMonth: { count: number; value: string };
  lostNextMonth: { count: number; value: string };
  conversionRate: number; avgSalesCycleDays: number;
  byStage: Array<{ stage: { id: string; code: string; name: string; probability: number; sortOrder: number } | null; count: number; value: string; weighted: string }>;
  byAssignee: Array<{ assignee: OpportunityAssignee | null; count: number; value: string; weighted: string }>;
  byMonth: Array<{ month: string; count: number; value: string; weighted: string }>;
  byType: Array<{ type: CatalogItem | null; count: number; value: string; weighted: string }>;
}
export interface OpportunityCatalog {
  stages: OpportunityStage[]; types: CatalogItem[]; sources: CatalogItem[]; lostReasons: CatalogItem[];
  statuses: OpportunityStatus[]; priorities: OpportunityPriority[]; defaultCurrency: string;
}
export interface ConvertPreview {
  lead: { id: string; leadNumber: string; name: string; organizationName?: string; projectLocation?: string; projectCity?: string; projectArea?: string; estimatedValue?: string; currency: string; priority: string; expectedClosingDate?: string; assignedToId?: string; crmCompanyId?: string; crmContactId?: string; description?: string; status: string };
  types: CatalogItem[]; sources: CatalogItem[]; defaultCurrency: string;
  suggested: { name: string; estimatedContractValue?: string; currency: string; priority: string; expectedClosingDate?: string; assignedToId?: string; crmCompanyId?: string; crmContactId?: string; projectLocation?: string; city?: string; area?: string; description?: string };
}

const root = (companyId: string) => `/companies/${companyId}/crm/opportunities`;
export const listOpportunities = (companyId: string, query: Record<string, unknown>) => apiRequest<Opportunity[]>(`${root(companyId)}${toQuery(query)}`);
export const getOpportunity = (companyId: string, opportunityId: string) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}`);
export const createOpportunity = (companyId: string, body: OpportunityInput) => apiRequest<Opportunity>(root(companyId), { method: 'POST', body });
export const updateOpportunity = (companyId: string, opportunityId: string, body: Partial<OpportunityInput>) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}`, { method: 'PATCH', body });
export const deleteOpportunity = (companyId: string, opportunityId: string) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}`, { method: 'DELETE' });
export const getOpportunityDashboard = (companyId: string) => apiRequest<OpportunityDashboard>(`${root(companyId)}/dashboard`);
export const getOpportunityPipeline = (companyId: string) => apiRequest<OpportunityPipeline>(`${root(companyId)}/pipeline`);
export const getOpportunityForecast = (companyId: string, month?: string) => apiRequest<OpportunityForecast>(`${root(companyId)}/forecast${toQuery({ month })}`);
export const exportOpportunities = (companyId: string, query: Record<string, unknown>) => fetch(`${import.meta.env.VITE_API_URL ?? '/api/v1'}${root(companyId)}/export${toQuery(query)}`, { credentials: 'include' });
export const getOpportunityCatalog = (companyId: string) => apiRequest<OpportunityCatalog>(`${root(companyId)}/catalog`);
export const getOpportunityAssignees = (companyId: string) => apiRequest<OpportunityAssignee[]>(`${root(companyId)}/assignees`);
export const getConvertPreview = (companyId: string, leadId: string) => apiRequest<ConvertPreview>(`${root(companyId)}/convert-preview/${leadId}`);
export const convertLeadToOpportunity = (companyId: string, body: ConvertLeadInput) => apiRequest<Opportunity>(`${root(companyId)}/convert`, { method: 'POST', body });
export const assignOpportunity = (companyId: string, opportunityId: string, assignedToId?: string) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}/assignment`, { method: 'PATCH', body: { assignedToId } });
export const changeOpportunityStage = (companyId: string, opportunityId: string, stageId: string, reason?: string) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}/stage`, { method: 'PATCH', body: { stageId, reason } });
export const markOpportunityWon = (companyId: string, opportunityId: string, body: { wonDate: string; finalContractValue: number; winReason?: string; competitor?: string; winRemarks?: string }) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}/won`, { method: 'PATCH', body });
export const markOpportunityLost = (companyId: string, opportunityId: string, body: { lostReasonId: string; lostDate: string; lostRemarks?: string }) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}/lost`, { method: 'PATCH', body });
export const reopenOpportunity = (companyId: string, opportunityId: string, reason: string) => apiRequest<Opportunity>(`${root(companyId)}/${opportunityId}/reopen`, { method: 'PATCH', body: { reason } });
export const addOpportunityNote =(companyId: string, opportunityId: string, note: string) => apiRequest<OpportunityNote>(`${root(companyId)}/${opportunityId}/notes`, { method: 'POST', body: { note } });
export const updateOpportunityNote = (companyId: string, opportunityId: string, noteId: string, note: string) => apiRequest<OpportunityNote>(`${root(companyId)}/${opportunityId}/notes/${noteId}`, { method: 'PATCH', body: { note } });
export const deleteOpportunityNote = (companyId: string, opportunityId: string, noteId: string) => apiRequest<OpportunityNote>(`${root(companyId)}/${opportunityId}/notes/${noteId}`, { method: 'DELETE' });
export const addOpportunityAttachment = (companyId: string, opportunityId: string, body: { fileId: string; title?: string; description?: string }) => apiRequest<OpportunityAttachment>(`${root(companyId)}/${opportunityId}/attachments`, { method: 'POST', body });
export const deleteOpportunityAttachment = (companyId: string, opportunityId: string, attachmentId: string) => apiRequest<OpportunityAttachment>(`${root(companyId)}/${opportunityId}/attachments/${attachmentId}`, { method: 'DELETE' });
export const getOpportunityTimeline = (companyId: string, opportunityId: string) => apiRequest<OpportunityTimelineItem[]>(`${root(companyId)}/${opportunityId}/timeline`);
export const getOpportunityStageHistory = (companyId: string, opportunityId: string) => apiRequest<OpportunityStageHistoryItem[]>(`${root(companyId)}/${opportunityId}/stage-history`);
