export interface ApiPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
  pagination?: ApiPagination;
  timestamp: string;
  requestId: string;
  errors?: string[];
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface AuthCompany {
  id: string;
  companyCode: string;
  displayName: string;
  status: string;
}

export interface AuthMembership {
  id: string;
  status: string;
  company: AuthCompany;
}

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  user: AuthUser;
  activeCompany: AuthCompany | null;
  memberships: AuthMembership[];
}

export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';

export interface Company {
  id: string;
  companyCode: string;
  legalName: string;
  displayName: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  companyType: string;
  taxRegistrationNumber?: string | null;
  nationalTaxNumber?: string | null;
  registrationNumber?: string | null;
  currency: string;
  timezone: string;
  country: string;
  province?: string | null;
  city?: string | null;
  postalCode?: string | null;
  address?: string | null;
  status: CompanyStatus;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan?: string | null;
  employeeLimit?: number | null;
  projectLimit?: number | null;
  storageLimit?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CompanyDashboard {
  company: Company;
  branchCount: number;
  departmentCount: number;
  employeeCount: number;
  projectCount: number;
  projectModuleAvailable: boolean;
  storageUsage: string;
  subscriptionStatus: SubscriptionStatus;
  license: {
    plan: string | null;
    employeeLimit: number | null;
    projectLimit: number | null;
    storageLimit: string | null;
  };
}

export interface CompanySettings {
  id: string;
  companyId: string;
  workingDays: string[];
  weekendDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
  fiscalYearName?: string | null;
  financialYearStart: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  measurementSystem: string;
  distanceUnit: string;
  temperatureUnit: string;
  language: string;
  defaultWarehouseId?: string | null;
  autoNumberingEnabled: boolean;
  documentPrefixes: Record<string, unknown>;
  taxSettings: Record<string, unknown>;
  approvalSettings: Record<string, unknown>;
  emailSettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
  projectDefaults: Record<string, unknown>;
  attendanceRules: Record<string, unknown>;
  payrollRules: Record<string, unknown>;
  overtimeRules: Record<string, unknown>;
}

export interface CompanyBranding {
  id: string;
  companyId: string;
  logoFileId?: string | null;
  faviconFileId?: string | null;
  reportHeaderFileId?: string | null;
  reportFooterFileId?: string | null;
  emailLogoFileId?: string | null;
  watermarkFileId?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
}

export interface Branch {
  id: string;
  companyId: string;
  branchCode: string;
  name: string;
  managerMembershipId?: string | null;
  businessUnitId?: string | null;
  regionId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  status: EntityStatus;
  deletedAt?: string | null;
}

export interface Department {
  id: string;
  companyId: string;
  departmentCode: string;
  name: string;
  headMembershipId?: string | null;
  parentDepartmentId?: string | null;
  description?: string | null;
  status: EntityStatus;
  deletedAt?: string | null;
}

export interface Designation {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  rank?: number | null;
  isDefault: boolean;
  status: EntityStatus;
  deletedAt?: string | null;
}

export interface CostCenter {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: string;
  managerMembershipId?: string | null;
  parentCostCenterId?: string | null;
  description?: string | null;
  status: EntityStatus;
  deletedAt?: string | null;
}

export interface DocumentSequence {
  id: string;
  companyId: string;
  branchId?: string | null;
  documentType: string;
  prefixTemplate: string;
  nextNumber: string;
  padding: number;
  resetPolicy: string;
  currentPeriod?: string | null;
  status: EntityStatus;
}

export interface OrganizationChartNode {
  id: string;
  employeeCode?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string | null;
  };
  designation?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  reports: OrganizationChartNode[];
}

export interface ProjectStatusDefinition {
  id: string;
  code: string;
  name: string;
  lifecycle: string;
  isSystem: boolean;
  isTerminal: boolean;
  color?: string | null;
}

export interface ProjectTypeDefinition {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
}

export interface ProjectTag {
  id: string;
  companyId: string;
  code: string;
  name: string;
  color?: string | null;
  status: EntityStatus;
}

export interface Project {
  id: string;
  companyId: string;
  projectCode: string;
  projectName: string;
  projectShortName?: string | null;
  projectTypeId: string;
  constructionTypeId?: string | null;
  statusId: string;
  lifecycleStatus: string;
  priority: string;
  projectManagerId: string;
  siteEngineerId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  estimatedBudget: string | number;
  approvedBudget?: string | number | null;
  estimatedCost?: string | number | null;
  contractValue?: string | number | null;
  currency: string;
  contractType: string;
  contractNumber?: string | null;
  projectStartDate: string;
  plannedCompletionDate: string;
  actualCompletionDate?: string | null;
  defectLiabilityEndDate?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  province?: string | null;
  country: string;
  projectDescription?: string | null;
  scopeOfWork?: string | null;
  remarks?: string | null;
  completionPercentage: string | number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  status?: ProjectStatusDefinition;
  projectType?: ProjectTypeDefinition;
  constructionType?: ProjectTypeDefinition | null;
  tagAssignments?: Array<{ tag: ProjectTag }>;
  settings?: ProjectSettings | null;
}

export interface ProjectSettings {
  id: string;
  companyId: string;
  projectId: string;
  workingDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
  timezone: string;
  currency: string;
  documentPrefix?: string | null;
  defaultWarehouseId?: string | null;
  defaultStoreId?: string | null;
  notificationSettings: Record<string, unknown>;
  approvalFlow: Record<string, unknown>;
  calendarSettings: Record<string, unknown>;
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  budget?: string | number | null;
  completionPercentage: string | number;
  status: string;
  tasks?: ProjectTask[];
}

export interface ProjectTask {
  id: string;
  phaseId: string;
  name: string;
  description?: string | null;
  completionPercentage: string | number;
  status: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  updatedAt: string;
}

export interface ProjectWbs {
  id: string;
  companyId: string;
  projectId: string;
  phaseId?: string | null;
  parentId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  _count?: { activities: number; children: number };
}

export interface PlanningActivity extends ProjectTask {
  companyId: string;
  projectId: string;
  wbsId?: string | null;
  parentTaskId?: string | null;
  activityCode?: string | null;
  activityType: 'TASK' | 'SUMMARY' | 'MILESTONE' | 'LEVEL_OF_EFFORT';
  durationDays: number;
  remainingDurationDays?: number | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  plannedQuantity?: string | number | null;
  actualQuantity?: string | number | null;
  unit?: string | null;
  priority: string;
  notes?: string | null;
  isManuallyScheduled: boolean;
  isCritical: boolean;
  totalFloatDays?: number | null;
  freeFloatDays?: number | null;
  sortOrder: number;
  wbs?: Pick<ProjectWbs, 'id' | 'code' | 'name'> | null;
  phase?: Pick<ProjectPhase, 'id' | 'code' | 'name'>;
  assignee?: ProjectTeamMember['membership'] | null;
  supervisor?: ProjectTeamMember['membership'] | null;
  predecessors?: Array<{
    id: string;
    predecessorId: string;
    successorId: string;
    type: 'FS' | 'SS' | 'FF' | 'SF';
    lagDays: number;
    predecessor: { id: string; activityCode?: string | null; name: string };
  }>;
  baseline?: {
    plannedStart?: string | null;
    plannedFinish?: string | null;
    durationDays: number;
    progress: string | number;
  } | null;
}

export interface ActivityDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
}

export interface ProjectBaseline {
  id: string;
  name: string;
  revision: number;
  status: 'DRAFT' | 'APPROVED' | 'SUPERSEDED';
  description?: string | null;
  approvedAt?: string | null;
  _count?: { activities: number };
}

export interface PlanningDashboard {
  project: {
    id: string;
    projectName: string;
    projectStartDate: string;
    plannedCompletionDate: string;
    projectManager?: { user?: { firstName: string; lastName: string } };
  };
  forecastCompletionDate?: string | null;
  originalCompletionDate?: string | null;
  baselineCompletionDate?: string | null;
  forecastVarianceDays?: number;
  baselineVarianceDays?: number | null;
  plannedProgress: number;
  actualProgress: number;
  scheduleVariance: number;
  delayedActivities: number;
  criticalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  notStartedActivities: number;
  upcomingMilestones: ProjectMilestone[];
}

export interface GanttData {
  project: { id: string; projectStartDate: string; plannedCompletionDate: string };
  wbs: ProjectWbs[];
  activities: PlanningActivity[];
  dependencies: ActivityDependency[];
  baseline?: { id: string; name: string; revision: number } | null;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  phaseId?: string | null;
  name: string;
  description?: string | null;
  targetDate: string;
  actualDate?: string | null;
  status: string;
  weightage: string | number;
  completionPercentage: string | number;
  dependsOn?: Array<{ id: string; dependsOnMilestoneId: string }>;
}

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  membershipId: string;
  role: string;
  isPrimary: boolean;
  assignedAt: string;
  unassignedAt?: string | null;
  membership?: {
    id: string;
    employeeCode?: string | null;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  phaseId?: string | null;
  category: string;
  title: string;
  description?: string | null;
  versionLabel: string;
  externalUrl?: string | null;
  status: EntityStatus;
}

export interface ProjectCalendarEvent {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  eventType: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  location?: string | null;
}

export interface ProjectDashboard {
  projectId: string;
  projectCode: string;
  projectName: string;
  lifecycleStatus: string;
  completionPercentage: string | number;
  estimatedBudget: string | number;
  approvedBudget?: string | number | null;
  estimatedCost?: string | number | null;
  contractValue?: string | number | null;
  currency: string;
  milestoneSummary: {
    total: number;
    completed: number;
    delayed: number;
    upcoming: number;
  };
  phaseSummary: {
    total: number;
    completed: number;
    inProgress: number;
  };
  teamCount: number;
  documentCount: number;
  upcomingDeadlines: Array<{
    type: string;
    id: string;
    name: string;
    date: string;
  }>;
  pendingApprovals: unknown[];
  materialRequests: unknown[];
  purchaseOrders: unknown[];
  siteAttendance: null;
  latestReports: unknown[];
  recentPhotos: ProjectDocument[];
  riskIndicators: Array<{ code: string; level: string; message: string }>;
}

export interface ProjectTimeline {
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
}
