import { apiRequest, toQuery } from '../lib/api-client';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED' | 'ON_HOLD' | 'CONVERTED' | 'LOST';
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export interface CatalogItem { id: string; code: string; name: string }
export interface LeadAssignee { id: string; user: { id: string; firstName: string; lastName: string; email: string } }
export interface LeadNote { id: string; note: string; createdAt: string; updatedAt: string; createdBy?: string }
export interface LeadAttachment { id: string; title?: string; description?: string; createdAt: string; file: { id: string; originalName: string; mimeType: string; sizeBytes: string; publicUrl?: string; status: string } }
export interface Lead {
  id: string; leadNumber: string; name: string; organizationName?: string; contactPerson?: string;
  phone?: string; alternatePhone?: string; email?: string; website?: string; address?: string; city?: string;
  projectLocation?: string; projectCity?: string; projectArea?: string; latitude?: string; longitude?: string;
  estimatedValue?: string; currency: string; expectedClosingDate?: string; priority: LeadPriority; status: LeadStatus;
  description?: string; lastActivityAt: string; createdAt: string; updatedAt: string;
  leadType: CatalogItem; leadSource: CatalogItem; assignedTo?: LeadAssignee; notes?: LeadNote[]; attachments?: LeadAttachment[];
  crmCompany?: { id: string; name: string; email?: string; phone?: string };
  crmContact?: { id: string; firstName: string; lastName?: string; email?: string; phone?: string; crmCompanyId?: string };
  partyLinkStatus: 'UNLINKED' | 'LINKED' | 'REVIEW_REQUIRED';
}
export interface LeadInput {
  name: string; leadTypeId: string; leadSourceId: string; organizationName?: string; contactPerson?: string;
  phone?: string; alternatePhone?: string; email?: string; website?: string; address?: string; city?: string;
  projectLocation?: string; projectCity?: string; projectArea?: string; latitude?: number; longitude?: number;
  estimatedValue?: number; currency?: string; expectedClosingDate?: string; assignedToId?: string;
  priority?: LeadPriority; description?: string; overrideDuplicate?: boolean;
  crmCompanyId?: string; crmContactId?: string;
}
export interface LeadTimeline { id: string; action: string; oldValue?: Record<string, unknown>; newValue?: Record<string, unknown>; createdAt: string; user?: { firstName: string; lastName: string } }

const root = (companyId: string) => `/companies/${companyId}/crm/leads`;
export const listLeads = (companyId: string, query: Record<string, unknown>) => apiRequest<Lead[]>(`${root(companyId)}${toQuery(query)}`);
export const getLead = (companyId: string, leadId: string) => apiRequest<Lead>(`${root(companyId)}/${leadId}`);
export const createLead = (companyId: string, body: LeadInput) => apiRequest<Lead>(root(companyId), { method: 'POST', body });
export const updateLead = (companyId: string, leadId: string, body: Partial<LeadInput>) => apiRequest<Lead>(`${root(companyId)}/${leadId}`, { method: 'PATCH', body });
export const deleteLead = (companyId: string, leadId: string) => apiRequest<Lead>(`${root(companyId)}/${leadId}`, { method: 'DELETE' });
export const getLeadCatalog = (companyId: string) => apiRequest<{ types: CatalogItem[]; sources: CatalogItem[]; defaultCurrency: string; statuses: LeadStatus[] }>(`${root(companyId)}/catalog`);
export const getLeadDashboard = (companyId: string) => apiRequest<{ total: number; byStatus: Partial<Record<LeadStatus, number>>; expectedPipelineValue: string }>(`${root(companyId)}/dashboard`);
export const getLeadAssignees = (companyId: string) => apiRequest<LeadAssignee[]>(`${root(companyId)}/assignees`);
export const checkLeadDuplicates = (companyId: string, query: Record<string, unknown>) => apiRequest<Pick<Lead, 'id' | 'leadNumber' | 'name' | 'organizationName' | 'contactPerson' | 'phone' | 'email' | 'status'>[]>(`${root(companyId)}/duplicate-check${toQuery(query)}`);
export const assignLead = (companyId: string, leadId: string, assignedToId?: string) => apiRequest<Lead>(`${root(companyId)}/${leadId}/assignment`, { method: 'PATCH', body: { assignedToId } });
export const changeLeadStatus = (companyId: string, leadId: string, status: LeadStatus) => apiRequest<Lead>(`${root(companyId)}/${leadId}/status`, { method: 'PATCH', body: { status } });
export const addLeadNote = (companyId: string, leadId: string, note: string) => apiRequest<LeadNote>(`${root(companyId)}/${leadId}/notes`, { method: 'POST', body: { note } });
export const updateLeadNote = (companyId: string, leadId: string, noteId: string, note: string) => apiRequest<LeadNote>(`${root(companyId)}/${leadId}/notes/${noteId}`, { method: 'PATCH', body: { note } });
export const deleteLeadNote = (companyId: string, leadId: string, noteId: string) => apiRequest<LeadNote>(`${root(companyId)}/${leadId}/notes/${noteId}`, { method: 'DELETE' });
export const addLeadAttachment = (companyId: string, leadId: string, body: { fileId: string; title?: string; description?: string }) => apiRequest<LeadAttachment>(`${root(companyId)}/${leadId}/attachments`, { method: 'POST', body });
export const getLeadTimeline = (companyId: string, leadId: string) => apiRequest<LeadTimeline[]>(`${root(companyId)}/${leadId}/timeline`);

export type CrmPartyStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT' | 'BLOCKED';
export type CrmContactStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export interface PartyTypeAssignment { id: string; type: CatalogItem }
export interface CrmPrimaryContact { id: string; purpose: string; label?: string; crmContact: Pick<CrmContact, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'> }
export interface PartyNote { id: string; note: string; createdAt: string; createdBy?: string }
export interface PartyAttachment { id: string; title?: string; description?: string; createdAt: string; file: { id: string; originalName: string; mimeType: string; sizeBytes: string; publicUrl?: string } }
export interface CrmCompany {
  id: string; name: string; legalName?: string; registrationNumber?: string; taxNumber?: string; industry?: string;
  website?: string; email?: string; phone?: string; alternatePhone?: string; address?: string; city?: string; country?: string;
  postalCode?: string; description?: string; status: CrmPartyStatus; assignedTo?: LeadAssignee; types: PartyTypeAssignment[];
  primaryContacts: CrmPrimaryContact[]; contacts?: CrmContact[]; leads?: Pick<Lead, 'id' | 'leadNumber' | 'name' | 'status' | 'estimatedValue' | 'currency'>[];
  notes?: PartyNote[]; attachments?: PartyAttachment[]; createdAt: string; updatedAt: string;
}
export interface CrmContact {
  id: string; firstName: string; lastName?: string; jobTitle?: string; department?: string; email?: string; alternateEmail?: string;
  phone?: string; mobile?: string; whatsapp?: string; website?: string; address?: string; city?: string; country?: string; linkedin?: string;
  notesText?: string; status: CrmContactStatus; assignedTo?: LeadAssignee; crmCompany?: Pick<CrmCompany, 'id' | 'name' | 'status'>;
  types: PartyTypeAssignment[]; primaryFor: Array<{ id: string; purpose: string; label?: string; crmCompanyId: string }>;
  leads?: Pick<Lead, 'id' | 'leadNumber' | 'name' | 'status'>[]; notes?: PartyNote[]; attachments?: PartyAttachment[]; createdAt: string; updatedAt: string;
}
export interface CrmCompanyInput { name: string; legalName?: string; registrationNumber?: string; taxNumber?: string; industry?: string; website?: string; email?: string; phone?: string; alternatePhone?: string; address?: string; city?: string; country?: string; postalCode?: string; description?: string; status?: CrmPartyStatus; assignedToId?: string; typeIds?: string[]; overrideDuplicate?: boolean }
export interface CrmContactInput { firstName: string; lastName?: string; jobTitle?: string; department?: string; crmCompanyId?: string; email?: string; alternateEmail?: string; phone?: string; mobile?: string; whatsapp?: string; website?: string; address?: string; city?: string; country?: string; linkedin?: string; notesText?: string; status?: CrmContactStatus; assignedToId?: string; typeIds?: string[]; overrideDuplicate?: boolean }

const partyRoot = (companyId: string) => `/companies/${companyId}/crm`;
export const getPartyCatalog = (companyId: string) => apiRequest<{ companyTypes: CatalogItem[]; contactTypes: CatalogItem[] }>(`${partyRoot(companyId)}/catalog`);
export const getPartyAssignees = (companyId: string) => apiRequest<LeadAssignee[]>(`${partyRoot(companyId)}/assignees`);
export const listCrmCompanies = (companyId: string, query: Record<string, unknown> = {}) => apiRequest<CrmCompany[]>(`${partyRoot(companyId)}/companies${toQuery(query)}`);
export const getCrmCompany = (companyId: string, id: string) => apiRequest<CrmCompany>(`${partyRoot(companyId)}/companies/${id}`);
export const createCrmCompany = (companyId: string, body: CrmCompanyInput) => apiRequest<CrmCompany>(`${partyRoot(companyId)}/companies`, { method: 'POST', body });
export const updateCrmCompany = (companyId: string, id: string, body: Partial<CrmCompanyInput>) => apiRequest<CrmCompany>(`${partyRoot(companyId)}/companies/${id}`, { method: 'PATCH', body });
export const deleteCrmCompany = (companyId: string, id: string) => apiRequest<CrmCompany>(`${partyRoot(companyId)}/companies/${id}`, { method: 'DELETE' });
export const checkCrmCompanyDuplicates = (companyId: string, query: Record<string, unknown>) => apiRequest<CrmCompany[]>(`${partyRoot(companyId)}/companies/duplicate-check${toQuery(query)}`);
export const setPrimaryContact = (companyId: string, id: string, body: { crmContactId: string; purpose: string; label?: string }) => apiRequest<CrmPrimaryContact>(`${partyRoot(companyId)}/companies/${id}/primary-contacts`, { method: 'POST', body });
export const addCompanyNote = (companyId: string, id: string, note: string) => apiRequest<PartyNote>(`${partyRoot(companyId)}/companies/${id}/notes`, { method: 'POST', body: { note } });
export const addCompanyAttachment = (companyId: string, id: string, body: { fileId: string; title?: string }) => apiRequest<PartyAttachment>(`${partyRoot(companyId)}/companies/${id}/attachments`, { method: 'POST', body });
export const getCompanyTimeline = (companyId: string, id: string) => apiRequest<LeadTimeline[]>(`${partyRoot(companyId)}/companies/${id}/timeline`);
export const listCrmContacts = (companyId: string, query: Record<string, unknown> = {}) => apiRequest<CrmContact[]>(`${partyRoot(companyId)}/contacts${toQuery(query)}`);
export const getCrmContact = (companyId: string, id: string) => apiRequest<CrmContact>(`${partyRoot(companyId)}/contacts/${id}`);
export const createCrmContact = (companyId: string, body: CrmContactInput) => apiRequest<CrmContact>(`${partyRoot(companyId)}/contacts`, { method: 'POST', body });
export const updateCrmContact = (companyId: string, id: string, body: Partial<CrmContactInput>) => apiRequest<CrmContact>(`${partyRoot(companyId)}/contacts/${id}`, { method: 'PATCH', body });
export const deleteCrmContact = (companyId: string, id: string) => apiRequest<CrmContact>(`${partyRoot(companyId)}/contacts/${id}`, { method: 'DELETE' });
export const checkCrmContactDuplicates = (companyId: string, query: Record<string, unknown>) => apiRequest<CrmContact[]>(`${partyRoot(companyId)}/contacts/duplicate-check${toQuery(query)}`);
export const addContactNote = (companyId: string, id: string, note: string) => apiRequest<PartyNote>(`${partyRoot(companyId)}/contacts/${id}/notes`, { method: 'POST', body: { note } });
export const addContactAttachment = (companyId: string, id: string, body: { fileId: string; title?: string }) => apiRequest<PartyAttachment>(`${partyRoot(companyId)}/contacts/${id}/attachments`, { method: 'POST', body });
export const getContactTimeline = (companyId: string, id: string) => apiRequest<LeadTimeline[]>(`${partyRoot(companyId)}/contacts/${id}/timeline`);
export const linkLeadParties = (companyId: string, leadId: string, body: { crmCompanyId?: string; crmContactId?: string }) => apiRequest<Lead>(`${partyRoot(companyId)}/leads/${leadId}/parties`, { method: 'PATCH', body });
