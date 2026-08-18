import { apiRequest, toQuery } from "../lib/api-client";

export interface QualityDashboard {
  inspections: Record<string, number>;
  inspectionCount: number;
  inspectionPassRate: number;
  openNcrs: number;
  criticalNcrs: number;
  overdueNcrs: number;
  testPassRate: number;
  reworkCount: number;
  totalReworkCost: number | string;
  issues: Array<{ type: string; status: string; _count: number }>;
}

export interface QualityItp {
  id: string;
  itpNumber: string;
  version: number;
  inspectionStage: string;
  inspectionType: string;
  acceptanceCriteria: string;
  responsibleParty: string;
  controlPoint: string;
  status: string;
  activity?: { activityCode?: string; name: string };
  _count?: { inspections: number };
}

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  inspectionType: string;
  controlPoint: string;
  status: string;
  description: string;
  requestedDate: string;
  scheduledAt?: string;
  areaReference?: string;
  activity?: { activityCode?: string; name: string };
  _count?: { responses: number; evidence: number; ncrs: number };
}

export interface QualityTestDefinition {
  id: string;
  code: string;
  name: string;
  parameter: string;
  unit?: string;
  minValue?: number | string;
  maxValue?: number | string;
  acceptanceCriteria: string;
}

export interface QualityTestResult {
  id: string;
  testNumber: string;
  testDate: string;
  numericResult?: number | string;
  textResult?: string;
  resultStatus: string;
  calculatedStatus: string;
  materialReference?: string;
  definition: QualityTestDefinition;
}

export interface QualityNcr {
  id: string;
  ncrNumber: string;
  source: string;
  description: string;
  severity: string;
  status: string;
  reportedDate: string;
  dueDate?: string;
  responsibleParty?: string;
  _count?: { actions: number; evidence: number };
}

export interface QualityIssue {
  id: string;
  issueNumber: string;
  type: string;
  description: string;
  severity: string;
  status: string;
  reportedDate: string;
  dueDate?: string;
  areaReference?: string;
}

type PageParams = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};
const base = (companyId: string, projectId: string) =>
  `/companies/${companyId}/projects/${projectId}/quality`;

export const qualityApi = {
  dashboard: (companyId: string, projectId: string) =>
    apiRequest<QualityDashboard>(`${base(companyId, projectId)}/dashboard`),
  itps: (companyId: string, projectId: string, params: PageParams = {}) =>
    apiRequest<QualityItp[]>(
      `${base(companyId, projectId)}/itps${toQuery(params)}`,
    ),
  createItp: (
    companyId: string,
    projectId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<QualityItp>(`${base(companyId, projectId)}/itps`, {
      method: "POST",
      body,
    }),
  inspections: (
    companyId: string,
    projectId: string,
    params: PageParams = {},
  ) =>
    apiRequest<QualityInspection[]>(
      `${base(companyId, projectId)}/inspections${toQuery(params)}`,
    ),
  createInspection: (
    companyId: string,
    projectId: string,
    body: Record<string, unknown>,
    idempotencyKey: string,
  ) =>
    apiRequest<QualityInspection>(`${base(companyId, projectId)}/inspections`, {
      method: "POST",
      body,
      idempotencyKey,
    }),
  completeInspection: (
    companyId: string,
    projectId: string,
    id: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<QualityInspection>(
      `${base(companyId, projectId)}/inspections/${id}/outcome`,
      { method: "PATCH", body },
    ),
  testDefinitions: (companyId: string, projectId: string) =>
    apiRequest<QualityTestDefinition[]>(
      `${base(companyId, projectId)}/test-definitions`,
    ),
  createTestDefinition: (
    companyId: string,
    projectId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<QualityTestDefinition>(
      `${base(companyId, projectId)}/test-definitions`,
      { method: "POST", body },
    ),
  testResults: (
    companyId: string,
    projectId: string,
    params: PageParams = {},
  ) =>
    apiRequest<QualityTestResult[]>(
      `${base(companyId, projectId)}/test-results${toQuery(params)}`,
    ),
  createTestResult: (
    companyId: string,
    projectId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<QualityTestResult>(
      `${base(companyId, projectId)}/test-results`,
      { method: "POST", body },
    ),
  ncrs: (companyId: string, projectId: string, params: PageParams = {}) =>
    apiRequest<QualityNcr[]>(
      `${base(companyId, projectId)}/ncrs${toQuery(params)}`,
    ),
  createNcr: (
    companyId: string,
    projectId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<QualityNcr>(`${base(companyId, projectId)}/ncrs`, {
      method: "POST",
      body,
    }),
  issues: (companyId: string, projectId: string, params: PageParams = {}) =>
    apiRequest<QualityIssue[]>(
      `${base(companyId, projectId)}/issues${toQuery(params)}`,
    ),
  createIssue: (
    companyId: string,
    projectId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest<QualityIssue>(`${base(companyId, projectId)}/issues`, {
      method: "POST",
      body,
    }),
};
