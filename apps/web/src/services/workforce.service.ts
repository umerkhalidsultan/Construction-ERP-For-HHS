import { apiRequest, toQuery } from '../lib/api-client';
import type {
  Employee,
  EmployeeCredential,
  EmployeeDocument,
  EmployeeProjectAssignment,
  EmployeeSummary,
  WorkforceCatalogItem,
  WorkforceOrgChartNode,
} from '../types/api';

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  availability?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  skillId?: string;
  projectId?: string;
  includeDeleted?: boolean;
}

function base(companyId: string) {
  return `/companies/${companyId}/workforce`;
}

export const workforceApi = {
  listEmployees: (companyId: string, params: EmployeeListParams = {}) =>
    apiRequest<EmployeeSummary[]>(
      `${base(companyId)}/employees${toQuery(params)}`,
    ),
  getEmployee: (companyId: string, employeeId: string) =>
    apiRequest<Employee>(`${base(companyId)}/employees/${employeeId}`),
  createEmployee: (companyId: string, body: Record<string, unknown>) =>
    apiRequest<Employee>(`${base(companyId)}/employees`, {
      method: 'POST',
      body,
    }),
  updateEmployee: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<Employee>(`${base(companyId)}/employees/${employeeId}`, {
      method: 'PATCH',
      body,
    }),
  deleteEmployee: (companyId: string, employeeId: string) =>
    apiRequest<Employee>(`${base(companyId)}/employees/${employeeId}`, {
      method: 'DELETE',
    }),
  transferEmployee: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<Employee>(
      `${base(companyId)}/employees/${employeeId}/transfer`,
      { method: 'POST', body },
    ),
  dashboard: (companyId: string, employeeId: string) =>
    apiRequest<Employee>(
      `${base(companyId)}/employees/${employeeId}/dashboard`,
    ),
  organizationChart: (companyId: string) =>
    apiRequest<WorkforceOrgChartNode[]>(
      `${base(companyId)}/organization-chart`,
    ),
  employmentTypes: (companyId: string) =>
    apiRequest<WorkforceCatalogItem[]>(
      `${base(companyId)}/catalog/employment-types`,
    ),
  skills: (companyId: string) =>
    apiRequest<WorkforceCatalogItem[]>(`${base(companyId)}/catalog/skills`),
  assignProject: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<EmployeeProjectAssignment>(
      `${base(companyId)}/employees/${employeeId}/project-assignments`,
      { method: 'POST', body },
    ),
  endProject: (
    companyId: string,
    employeeId: string,
    assignmentId: string,
    endDate: string,
  ) =>
    apiRequest<EmployeeProjectAssignment>(
      `${base(companyId)}/employees/${employeeId}/project-assignments/${assignmentId}`,
      { method: 'DELETE', body: { endDate } },
    ),
  assignSkill: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest(`${base(companyId)}/employees/${employeeId}/skills`, {
      method: 'POST',
      body,
    }),
  removeSkill: (companyId: string, employeeId: string, skillId: string) =>
    apiRequest(`${base(companyId)}/employees/${employeeId}/skills/${skillId}`, {
      method: 'DELETE',
    }),
  addCertification: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<EmployeeCredential>(
      `${base(companyId)}/employees/${employeeId}/certifications`,
      { method: 'POST', body },
    ),
  updateCertification: (
    companyId: string,
    employeeId: string,
    certificationId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<EmployeeCredential>(
      `${base(companyId)}/employees/${employeeId}/certifications/${certificationId}`,
      { method: 'PATCH', body },
    ),
  deleteCertification: (
    companyId: string,
    employeeId: string,
    certificationId: string,
  ) =>
    apiRequest(
      `${base(companyId)}/employees/${employeeId}/certifications/${certificationId}`,
      { method: 'DELETE' },
    ),
  addLicense: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<EmployeeCredential>(
      `${base(companyId)}/employees/${employeeId}/licenses`,
      { method: 'POST', body },
    ),
  updateLicense: (
    companyId: string,
    employeeId: string,
    licenseId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<EmployeeCredential>(
      `${base(companyId)}/employees/${employeeId}/licenses/${licenseId}`,
      { method: 'PATCH', body },
    ),
  deleteLicense: (companyId: string, employeeId: string, licenseId: string) =>
    apiRequest(
      `${base(companyId)}/employees/${employeeId}/licenses/${licenseId}`,
      { method: 'DELETE' },
    ),
  addDocument: (
    companyId: string,
    employeeId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<EmployeeDocument>(
      `${base(companyId)}/employees/${employeeId}/documents`,
      { method: 'POST', body },
    ),
  updateDocument: (
    companyId: string,
    employeeId: string,
    documentId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<EmployeeDocument>(
      `${base(companyId)}/employees/${employeeId}/documents/${documentId}`,
      { method: 'PATCH', body },
    ),
  deleteDocument: (companyId: string, employeeId: string, documentId: string) =>
    apiRequest(
      `${base(companyId)}/employees/${employeeId}/documents/${documentId}`,
      { method: 'DELETE' },
    ),
};
