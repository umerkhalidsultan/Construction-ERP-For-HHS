import { apiRequest, toQuery } from '../lib/api-client';
import type {
  Branch,
  Company,
  CompanyBranding,
  CompanyDashboard,
  CompanySettings,
  CostCenter,
  Department,
  Designation,
  DocumentSequence,
  OrganizationChartNode,
} from '../types/api';

export interface CompanyListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  includeDeleted?: boolean;
}

export async function listCompanies(params: CompanyListParams = {}) {
  return apiRequest<Company[]>(`/companies${toQuery(params)}`);
}

export async function getCompany(companyId: string) {
  return apiRequest<Company>(`/companies/${companyId}`);
}

export async function createCompany(body: Record<string, unknown>) {
  return apiRequest<Company>('/companies', { method: 'POST', body });
}

export async function updateCompany(
  companyId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<Company>(`/companies/${companyId}`, {
    method: 'PATCH',
    body,
  });
}

export async function deleteCompany(companyId: string) {
  return apiRequest<Company>(`/companies/${companyId}`, { method: 'DELETE' });
}

export async function restoreCompany(companyId: string) {
  return apiRequest<Company>(`/companies/${companyId}/restore`, {
    method: 'POST',
  });
}

export async function getCompanyDashboard(companyId: string) {
  return apiRequest<CompanyDashboard>(`/companies/${companyId}/dashboard`);
}

export async function getCompanySettings(companyId: string) {
  return apiRequest<CompanySettings>(`/companies/${companyId}/settings`);
}

export async function updateCompanySettings(
  companyId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<CompanySettings>(`/companies/${companyId}/settings`, {
    method: 'PATCH',
    body,
  });
}

export async function getCompanyBranding(companyId: string) {
  return apiRequest<CompanyBranding>(`/companies/${companyId}/branding`);
}

export async function updateCompanyBranding(
  companyId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<CompanyBranding>(`/companies/${companyId}/branding`, {
    method: 'PATCH',
    body,
  });
}

export async function uploadBrandAsset(
  companyId: string,
  purpose: string,
  file: File,
) {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<{ branding: CompanyBranding }>(
    `/companies/${companyId}/branding/assets/${purpose}`,
    { method: 'POST', body: form },
  );
}

async function listOrgEntity<T>(
  companyId: string,
  resource: string,
  params: CompanyListParams = {},
) {
  return apiRequest<T[]>(
    `/companies/${companyId}/${resource}${toQuery(params)}`,
  );
}

async function mutateOrgEntity<T>(
  companyId: string,
  resource: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
  entityId?: string,
) {
  const path = entityId
    ? `/companies/${companyId}/${resource}/${entityId}`
    : `/companies/${companyId}/${resource}`;
  return apiRequest<T>(path, { method, body });
}

export const branchesApi = {
  list: (companyId: string, params?: CompanyListParams) =>
    listOrgEntity<Branch>(companyId, 'branches', params),
  create: (companyId: string, body: Record<string, unknown>) =>
    mutateOrgEntity<Branch>(companyId, 'branches', 'POST', body),
  update: (companyId: string, id: string, body: Record<string, unknown>) =>
    mutateOrgEntity<Branch>(companyId, 'branches', 'PATCH', body, id),
  remove: (companyId: string, id: string) =>
    mutateOrgEntity<Branch>(companyId, 'branches', 'DELETE', undefined, id),
};

export const departmentsApi = {
  list: (companyId: string, params?: CompanyListParams) =>
    listOrgEntity<Department>(companyId, 'departments', params),
  create: (companyId: string, body: Record<string, unknown>) =>
    mutateOrgEntity<Department>(companyId, 'departments', 'POST', body),
  update: (companyId: string, id: string, body: Record<string, unknown>) =>
    mutateOrgEntity<Department>(companyId, 'departments', 'PATCH', body, id),
  remove: (companyId: string, id: string) =>
    mutateOrgEntity<Department>(
      companyId,
      'departments',
      'DELETE',
      undefined,
      id,
    ),
};

export const designationsApi = {
  list: (companyId: string, params?: CompanyListParams) =>
    listOrgEntity<Designation>(companyId, 'designations', params),
  create: (companyId: string, body: Record<string, unknown>) =>
    mutateOrgEntity<Designation>(companyId, 'designations', 'POST', body),
  update: (companyId: string, id: string, body: Record<string, unknown>) =>
    mutateOrgEntity<Designation>(companyId, 'designations', 'PATCH', body, id),
  remove: (companyId: string, id: string) =>
    mutateOrgEntity<Designation>(
      companyId,
      'designations',
      'DELETE',
      undefined,
      id,
    ),
};

export const costCentersApi = {
  list: (companyId: string, params?: CompanyListParams) =>
    listOrgEntity<CostCenter>(companyId, 'cost-centers', params),
  create: (companyId: string, body: Record<string, unknown>) =>
    mutateOrgEntity<CostCenter>(companyId, 'cost-centers', 'POST', body),
  update: (companyId: string, id: string, body: Record<string, unknown>) =>
    mutateOrgEntity<CostCenter>(companyId, 'cost-centers', 'PATCH', body, id),
  remove: (companyId: string, id: string) =>
    mutateOrgEntity<CostCenter>(
      companyId,
      'cost-centers',
      'DELETE',
      undefined,
      id,
    ),
};

export async function listDocumentSequences(companyId: string) {
  return apiRequest<DocumentSequence[]>(
    `/companies/${companyId}/document-sequences`,
  );
}

export async function createDocumentSequence(
  companyId: string,
  body: Record<string, unknown>,
) {
  return apiRequest<DocumentSequence>(
    `/companies/${companyId}/document-sequences`,
    { method: 'POST', body },
  );
}

export async function getOrganizationChart(companyId: string) {
  return apiRequest<{
    roots: OrganizationChartNode[];
    secondaryReportingLines: unknown[];
  }>(`/companies/${companyId}/organization/chart`);
}
