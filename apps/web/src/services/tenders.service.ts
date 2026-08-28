import { apiRequest, toQuery } from "../lib/api-client";

export type TenderStatus =
  | "DRAFT"
  | "REGISTERED"
  | "UNDER_REVIEW"
  | "BID_DECISION_PENDING"
  | "BID_APPROVED"
  | "NO_BID"
  | "PREPARING"
  | "READY_FOR_SUBMISSION"
  | "SUBMITTED"
  | "CLARIFICATION"
  | "TECHNICAL_EVALUATION"
  | "COMMERCIAL_EVALUATION"
  | "NEGOTIATION"
  | "AWARDED"
  | "LOST"
  | "CANCELLED";
export type TenderPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "CRITICAL";
export type RequirementStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "READY"
  | "VERIFIED"
  | "NOT_APPLICABLE"
  | "BLOCKED";
export type SubmissionMethod =
  "ONLINE_PORTAL" | "EMAIL" | "PHYSICAL" | "COURIER" | "OTHER";

export interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  internalReference?: string | null;
  opportunityId?: string | null;
  clientCompanyId: string;
  primaryContactId?: string | null;
  consultantCompanyId?: string | null;
  architectCompanyId?: string | null;
  tenderType: string;
  projectType?: string | null;
  projectLocation?: string | null;
  city?: string | null;
  issueDate?: string | null;
  closingDate: string;
  clarificationDeadline?: string | null;
  openingDate?: string | null;
  expectedAwardDate?: string | null;
  estimatedValue?: string | null;
  awardedValue?: string | null;
  currency: string;
  tenderManagerMembershipId?: string | null;
  teamId?: string | null;
  priority: TenderPriority;
  status: TenderStatus;
  description?: string | null;
  scopeSummary?: string | null;
  awardDate?: string | null;
  awardReference?: string | null;
  awardNotes?: string | null;
  lostDate?: string | null;
  lostReason?: string | null;
  lostNotes?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  clientCompany?: { id: string; name: string } | null;
  primaryContact?: {
    id: string;
    firstName: string;
    lastName?: string | null;
  } | null;
  tenderManager?: {
    id: string;
    user: { firstName: string; lastName: string };
  } | null;
  bidDecision?: TenderBidDecision | null;
  teamMembers?: TenderTeamMember[];
  requirements?: TenderRequirement[];
  submissions?: TenderSubmission[];
  attachments?: TenderAttachment[];
  siteVisits?: TenderSiteVisit[];
  preBidMeetings?: TenderPreBidMeeting[];
}
export interface TenderInput {
  title: string;
  internalReference?: string;
  opportunityId?: string;
  clientCompanyId: string;
  primaryContactId?: string;
  consultantCompanyId?: string;
  architectCompanyId?: string;
  tenderType: string;
  projectType?: string;
  projectLocation?: string;
  city?: string;
  issueDate?: string;
  closingDate: string;
  clarificationDeadline?: string;
  openingDate?: string;
  expectedAwardDate?: string;
  estimatedValue?: number;
  currency: string;
  tenderManagerMembershipId?: string;
  teamId?: string;
  priority?: TenderPriority;
  description?: string;
  scopeSummary?: string;
}
export interface TenderBidDecision {
  id: string;
  decision: "BID" | "NO_BID";
  decisionDate: string;
  reason?: string | null;
  notes?: string | null;
  assessment: Record<string, number>;
  overallScore?: string | null;
}
export interface TenderTeamMember {
  id: string;
  membershipId: string;
  role: string;
  assignedAt: string;
  active: boolean;
}
export interface TenderRequirement {
  id: string;
  name: string;
  category?: string | null;
  mandatory: boolean;
  responsibleMembershipId?: string | null;
  dueDate?: string | null;
  status: RequirementStatus;
  notes?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}
export interface TenderAttachment { id: string; fileId: string; category?: string | null; title?: string | null; addedBy?: string | null; addedAt: string; fileObject: { id: string; originalName: string; mimeType: string; sizeBytes?: number | string | null; publicUrl?: string | null } }
export interface TenderSiteVisit { id: string; visitDate: string; location?: string | null; attendees?: string | null; siteConditions?: string | null; access?: string | null; logistics?: string | null; utilities?: string | null; constraints?: string | null; observations?: string | null; notes?: string | null; createdAt: string; updatedAt: string }
export interface TenderPreBidMeeting { id: string; meetingDate: string; location?: string | null; participants?: string | null; agenda?: string | null; discussion?: string | null; decisions?: string | null; questions?: string | null; actions?: string | null; notes?: string | null; createdAt: string; updatedAt: string }
export interface TenderSubmission {
  id: string;
  submittedAt: string;
  method: SubmissionMethod;
  reference?: string | null;
  notes?: string | null;
}
export interface TenderPrefill {
  opportunityId: string;
  title: string;
  clientCompanyId?: string | null;
  primaryContactId?: string | null;
  tenderType: string;
  projectLocation?: string | null;
  city?: string | null;
  estimatedValue?: string | null;
  currency: string;
  tenderManagerMembershipId?: string | null;
  description?: string | null;
}

const root = (companyId: string) => `/companies/${companyId}/tenders`;
export const listTenders = (
  companyId: string,
  query: Record<string, unknown>,
) => apiRequest<Tender[]>(`${root(companyId)}${toQuery(query)}`);
export const getTender = (companyId: string, tenderId: string) =>
  apiRequest<Tender>(`${root(companyId)}/${tenderId}`);
export const createTender = (companyId: string, body: TenderInput) =>
  apiRequest<Tender>(root(companyId), { method: "POST", body });
export const updateTender = (
  companyId: string,
  tenderId: string,
  body: Partial<TenderInput>,
) =>
  apiRequest<Tender>(`${root(companyId)}/${tenderId}`, {
    method: "PATCH",
    body,
  });
export const getTenderPrefill = (companyId: string, opportunityId: string) =>
  apiRequest<TenderPrefill>(
    `${root(companyId)}/opportunities/${opportunityId}/prefill`,
  );
export const changeTenderStatus = (
  companyId: string,
  tenderId: string,
  status: TenderStatus,
) =>
  apiRequest<Tender>(`${root(companyId)}/${tenderId}/status`, {
    method: "PATCH",
    body: { status },
  });
export const recordBidDecision = (
  companyId: string,
  tenderId: string,
  body: {
    decision: "BID" | "NO_BID";
    reason?: string;
    notes?: string;
    assessment?: Record<string, number>;
  },
) =>
  apiRequest<TenderBidDecision>(`${root(companyId)}/${tenderId}/bid-decision`, {
    method: "POST",
    body,
  });
export const listTenderTeam = (companyId: string, tenderId: string) =>
  apiRequest<TenderTeamMember[]>(`${root(companyId)}/${tenderId}/team`);
export const assignTenderTeam = (
  companyId: string,
  tenderId: string,
  body: { membershipId: string; role: string },
) =>
  apiRequest<TenderTeamMember>(`${root(companyId)}/${tenderId}/team`, {
    method: "POST",
    body,
  });
export const removeTenderTeam = (
  companyId: string,
  tenderId: string,
  memberId: string,
) =>
  apiRequest<TenderTeamMember>(
    `${root(companyId)}/${tenderId}/team/${memberId}`,
    { method: "DELETE" },
  );
export const listTenderRequirements = (companyId: string, tenderId: string) =>
  apiRequest<TenderRequirement[]>(
    `${root(companyId)}/${tenderId}/requirements`,
  );
export const createTenderRequirement = (
  companyId: string,
  tenderId: string,
  body: {
    name: string;
    category?: string;
    mandatory?: boolean;
    responsibleMembershipId?: string;
    dueDate?: string;
    notes?: string;
  },
) =>
  apiRequest<TenderRequirement>(`${root(companyId)}/${tenderId}/requirements`, {
    method: "POST",
    body,
  });
export const changeRequirementStatus = (
  companyId: string,
  tenderId: string,
  requirementId: string,
  status: RequirementStatus,
) =>
  apiRequest<TenderRequirement>(
    `${root(companyId)}/${tenderId}/requirements/${requirementId}/status`,
    { method: "PATCH", body: { status } },
  );
export const submitTender = (
  companyId: string,
  tenderId: string,
  body: {
    submittedAt: string;
    method: SubmissionMethod;
    reference?: string;
    notes?: string;
    evidenceFileId?: string;
  },
) =>
  apiRequest<TenderSubmission>(`${root(companyId)}/${tenderId}/submit`, {
    method: "POST",
    body,
  });
export const awardTender = (
  companyId: string,
  tenderId: string,
  body: {
    awardDate: string;
    awardValue: number;
    awardReference?: string;
    notes?: string;
  },
) =>
  apiRequest<Tender>(`${root(companyId)}/${tenderId}/award`, {
    method: "POST",
    body,
  });
export const loseTender = (
  companyId: string,
  tenderId: string,
  body: {
    lostDate: string;
    lostReason: string;
    competitorCompanyId?: string;
    notes?: string;
  },
) =>
  apiRequest<Tender>(`${root(companyId)}/${tenderId}/lost`, {
    method: "POST",
    body,
  });
export const listTenderAttachments = (companyId: string, tenderId: string) => apiRequest<TenderAttachment[]>(`${root(companyId)}/${tenderId}/attachments`);
export const attachTenderDocument = (companyId: string, tenderId: string, body: { fileId: string; category?: string; title?: string }) => apiRequest<TenderAttachment>(`${root(companyId)}/${tenderId}/attachments`, { method: "POST", body });
export const removeTenderDocument = (companyId: string, tenderId: string, attachmentId: string) => apiRequest<TenderAttachment>(`${root(companyId)}/${tenderId}/attachments/${attachmentId}`, { method: "DELETE" });
export const updateTenderRequirement = (companyId: string, tenderId: string, requirementId: string, body: { name?: string; category?: string; mandatory?: boolean; responsibleMembershipId?: string; dueDate?: string; notes?: string }) => apiRequest<TenderRequirement>(`${root(companyId)}/${tenderId}/requirements/${requirementId}`, { method: "PATCH", body });
export const listTenderSiteVisits = (companyId: string, tenderId: string) => apiRequest<TenderSiteVisit[]>(`${root(companyId)}/${tenderId}/site-visits`);
export const createTenderSiteVisit = (companyId: string, tenderId: string, body: Omit<TenderSiteVisit, "id" | "createdAt" | "updatedAt">) => apiRequest<TenderSiteVisit>(`${root(companyId)}/${tenderId}/site-visits`, { method: "POST", body });
export const updateTenderSiteVisit = (companyId: string, tenderId: string, visitId: string, body: Partial<Omit<TenderSiteVisit, "id" | "createdAt" | "updatedAt">>) => apiRequest<TenderSiteVisit>(`${root(companyId)}/${tenderId}/site-visits/${visitId}`, { method: "PATCH", body });
export const listTenderPreBidMeetings = (companyId: string, tenderId: string) => apiRequest<TenderPreBidMeeting[]>(`${root(companyId)}/${tenderId}/pre-bid-meetings`);
export const createTenderPreBidMeeting = (companyId: string, tenderId: string, body: Omit<TenderPreBidMeeting, "id" | "createdAt" | "updatedAt">) => apiRequest<TenderPreBidMeeting>(`${root(companyId)}/${tenderId}/pre-bid-meetings`, { method: "POST", body });
export const updateTenderPreBidMeeting = (companyId: string, tenderId: string, meetingId: string, body: Partial<Omit<TenderPreBidMeeting, "id" | "createdAt" | "updatedAt">>) => apiRequest<TenderPreBidMeeting>(`${root(companyId)}/${tenderId}/pre-bid-meetings/${meetingId}`, { method: "PATCH", body });
export interface TenderDashboard { activeCount: number; dueToday: number; dueThisWeek: number; byStatus: Partial<Record<TenderStatus, number>>; upcoming: Tender[]; winRate: number | null; outcomes: Partial<Record<TenderStatus, number>>; valueSummary: null }
export interface TenderCalendarEvent { id: string; tenderId: string; tenderNumber: string; title: string; eventType: string; start: string; priority: TenderPriority; status: TenderStatus }
export const getTenderDashboard = (companyId: string, filters: Record<string, unknown> = {}) => apiRequest<TenderDashboard>(`${root(companyId)}/dashboard${toQuery(filters)}`);
export const listMyTenders = (companyId: string, query: Record<string, unknown>) => apiRequest<Tender[]>(`${root(companyId)}/mine${toQuery(query)}`);
export const getTenderCalendar = (companyId: string, start: string, end: string) => apiRequest<TenderCalendarEvent[]>(`${root(companyId)}/calendar${toQuery({ start, end })}`);
export const getTenderPipeline = (companyId: string, query: Record<string, unknown> = {}) => apiRequest<Tender[]>(`${root(companyId)}/pipeline${toQuery(query)}`);
