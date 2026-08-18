import {
  CalendarEventType,
  MilestoneStatus,
  PhaseStatus,
  Prisma,
  Project,
  ProjectCalendarEvent,
  ProjectContractType,
  ProjectDocument,
  ProjectDocumentCategory,
  ProjectLifecycleStatus,
  ProjectMilestone,
  ProjectMilestoneDependency,
  ProjectPhase,
  ProjectPriority,
  ProjectSettings,
  ProjectStatusDefinition,
  ProjectTag,
  ProjectTagAssignment,
  ProjectTask,
  ProjectTeamMember,
  ProjectTeamRole,
  ProjectTypeDefinition,
  TaskStatus,
  Weekday,
} from '@prisma/client';

export const DEFAULT_PROJECT_PHASES: Array<{ code: string; name: string }> = [
  { code: 'PLANNING', name: 'Planning' },
  { code: 'SITE_PREP', name: 'Site Preparation' },
  { code: 'FOUNDATION', name: 'Foundation' },
  { code: 'STRUCTURE', name: 'Structure' },
  { code: 'BLOCK_WORK', name: 'Block Work' },
  { code: 'MEP', name: 'MEP' },
  { code: 'FINISHING', name: 'Finishing' },
  { code: 'TESTING', name: 'Testing' },
  { code: 'HANDOVER', name: 'Handover' },
  { code: 'DLP', name: 'Defect Liability' },
];

export interface ProjectCreateData {
  companyId: string;
  projectCode: string;
  projectName: string;
  projectShortName?: string;
  projectTypeId: string;
  constructionTypeId?: string;
  statusId: string;
  lifecycleStatus: ProjectLifecycleStatus;
  priority?: ProjectPriority;
  clientId?: string;
  consultantId?: string;
  architectId?: string;
  projectManagerId: string;
  siteEngineerId?: string;
  branchId?: string;
  departmentId?: string;
  estimatedBudget: Prisma.Decimal;
  approvedBudget?: Prisma.Decimal;
  estimatedCost?: Prisma.Decimal;
  contractValue?: Prisma.Decimal;
  currency: string;
  contractType?: ProjectContractType;
  contractNumber?: string;
  projectStartDate: Date;
  plannedCompletionDate: Date;
  actualCompletionDate?: Date;
  defectLiabilityEndDate?: Date;
  latitude?: Prisma.Decimal;
  longitude?: Prisma.Decimal;
  address?: string;
  area?: string;
  city?: string;
  province?: string;
  country: string;
  projectDescription?: string;
  scopeOfWork?: string;
  remarks?: string;
  completionPercentage?: Prisma.Decimal;
  seedDefaultPhases: boolean;
  timezone?: string;
}

export type ProjectUpdateData = Partial<
  Omit<
    ProjectCreateData,
    | 'companyId'
    | 'projectCode'
    | 'statusId'
    | 'lifecycleStatus'
    | 'seedDefaultPhases'
    | 'timezone'
  >
>;

export interface ProjectListCriteria {
  companyId: string;
  page: number;
  limit: number;
  search?: string;
  statusId?: string;
  lifecycleStatus?: ProjectLifecycleStatus;
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
  includeDeleted: boolean;
  sortBy:
    | 'projectName'
    | 'projectCode'
    | 'createdAt'
    | 'plannedCompletionDate'
    | 'estimatedBudget'
    | 'lifecycleStatus';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedProjects {
  items: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectStatusUpdateData {
  statusId?: string;
  lifecycleStatus?: ProjectLifecycleStatus;
}

export interface ProjectPhaseData {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  budget?: Prisma.Decimal;
  completionPercentage?: Prisma.Decimal;
  status?: PhaseStatus;
}

export interface ProjectTaskData {
  name: string;
  description?: string;
  assigneeMembershipId?: string;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  completionPercentage?: Prisma.Decimal;
  status?: TaskStatus;
  sortOrder?: number;
}

export interface ProjectMilestoneData {
  name: string;
  description?: string;
  phaseId?: string;
  targetDate: Date;
  actualDate?: Date;
  status?: MilestoneStatus;
  weightage?: Prisma.Decimal;
  completionPercentage?: Prisma.Decimal;
}

export interface ProjectTeamData {
  membershipId: string;
  role: ProjectTeamRole;
  isPrimary?: boolean;
}

export interface ProjectDocumentData {
  category: ProjectDocumentCategory;
  title: string;
  description?: string;
  phaseId?: string;
  fileObjectId?: string;
  externalUrl?: string;
  versionLabel?: string;
}

export interface ProjectCalendarData {
  title: string;
  description?: string;
  eventType: CalendarEventType;
  startsAt: Date;
  endsAt?: Date;
  allDay?: boolean;
  location?: string;
  milestoneId?: string;
}

export interface ProjectSettingsData {
  workingDays?: Weekday[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  timezone?: string;
  currency?: string;
  documentPrefix?: string;
  defaultWarehouseId?: string;
  defaultStoreId?: string;
  notificationSettings?: Prisma.InputJsonValue;
  approvalFlow?: Prisma.InputJsonValue;
  calendarSettings?: Prisma.InputJsonValue;
}

export interface ProjectTagData {
  code: string;
  name: string;
  color?: string;
}

export interface ProjectDashboard {
  projectId: string;
  projectCode: string;
  projectName: string;
  lifecycleStatus: ProjectLifecycleStatus;
  completionPercentage: string;
  estimatedBudget: string;
  approvedBudget: string | null;
  estimatedCost: string | null;
  contractValue: string | null;
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
    type: 'milestone' | 'phase';
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

export interface IProjectRepository {
  create(data: ProjectCreateData, actorId: string): Promise<Project>;
  list(criteria: ProjectListCriteria): Promise<PaginatedProjects>;
  findById(
    companyId: string,
    projectId: string,
    includeDeleted?: boolean,
  ): Promise<Project | null>;
  update(
    companyId: string,
    projectId: string,
    data: ProjectUpdateData,
    actorId: string,
  ): Promise<Project>;
  softDelete(
    companyId: string,
    projectId: string,
    actorId: string,
  ): Promise<Project>;
  restore(
    companyId: string,
    projectId: string,
    actorId: string,
  ): Promise<Project>;
  updateStatus(
    companyId: string,
    projectId: string,
    data: ProjectStatusUpdateData,
    actorId: string,
  ): Promise<Project>;
  dashboard(
    companyId: string,
    projectId: string,
  ): Promise<ProjectDashboard | null>;
  timeline(
    companyId: string,
    projectId: string,
  ): Promise<{ phases: ProjectPhase[]; milestones: ProjectMilestone[] }>;
  listStatuses(companyId: string): Promise<ProjectStatusDefinition[]>;
  listTypes(companyId: string): Promise<ProjectTypeDefinition[]>;
  findSystemStatusByCode(code: string): Promise<ProjectStatusDefinition | null>;
  findStatusById(
    statusId: string,
    companyId: string,
  ): Promise<ProjectStatusDefinition | null>;
  findTypeById(
    typeId: string,
    companyId: string,
  ): Promise<ProjectTypeDefinition | null>;
  findActiveMembership(
    companyId: string,
    membershipId: string,
  ): Promise<{ id: string; companyId: string } | null>;
  projectCodeExists(
    companyId: string,
    projectCode: string,
    excludeProjectId?: string,
  ): Promise<boolean>;
  getCompanyCurrency(companyId: string): Promise<string | null>;
  listPhases(companyId: string, projectId: string): Promise<ProjectPhase[]>;
  createPhase(
    companyId: string,
    projectId: string,
    data: ProjectPhaseData,
    actorId: string,
  ): Promise<ProjectPhase>;
  updatePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    data: Partial<ProjectPhaseData>,
    actorId: string,
  ): Promise<ProjectPhase>;
  softDeletePhase(
    companyId: string,
    projectId: string,
    phaseId: string,
    actorId: string,
  ): Promise<ProjectPhase>;
  createTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    data: ProjectTaskData,
    actorId: string,
  ): Promise<ProjectTask>;
  updateTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    data: Partial<ProjectTaskData>,
    actorId: string,
  ): Promise<ProjectTask>;
  softDeleteTask(
    companyId: string,
    projectId: string,
    phaseId: string,
    taskId: string,
    actorId: string,
  ): Promise<ProjectTask>;
  listMilestones(
    companyId: string,
    projectId: string,
  ): Promise<ProjectMilestone[]>;
  createMilestone(
    companyId: string,
    projectId: string,
    data: ProjectMilestoneData,
    actorId: string,
  ): Promise<ProjectMilestone>;
  updateMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    data: Partial<ProjectMilestoneData>,
    actorId: string,
  ): Promise<ProjectMilestone>;
  softDeleteMilestone(
    companyId: string,
    projectId: string,
    milestoneId: string,
    actorId: string,
  ): Promise<ProjectMilestone>;
  addMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dependsOnMilestoneId: string,
    actorId: string,
  ): Promise<ProjectMilestoneDependency>;
  removeMilestoneDependency(
    companyId: string,
    projectId: string,
    milestoneId: string,
    dependencyId: string,
    actorId: string,
  ): Promise<ProjectMilestoneDependency>;
  listTeam(companyId: string, projectId: string): Promise<ProjectTeamMember[]>;
  assignTeam(
    companyId: string,
    projectId: string,
    data: ProjectTeamData,
    actorId: string,
  ): Promise<ProjectTeamMember>;
  updateTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    data: Partial<ProjectTeamData>,
    actorId: string,
  ): Promise<ProjectTeamMember>;
  unassignTeam(
    companyId: string,
    projectId: string,
    memberId: string,
    actorId: string,
  ): Promise<ProjectTeamMember>;
  listDocuments(
    companyId: string,
    projectId: string,
  ): Promise<ProjectDocument[]>;
  createDocument(
    companyId: string,
    projectId: string,
    data: ProjectDocumentData,
    actorId: string,
  ): Promise<ProjectDocument>;
  updateDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    data: Partial<ProjectDocumentData>,
    actorId: string,
  ): Promise<ProjectDocument>;
  softDeleteDocument(
    companyId: string,
    projectId: string,
    documentId: string,
    actorId: string,
  ): Promise<ProjectDocument>;
  listCalendar(
    companyId: string,
    projectId: string,
    from?: Date,
    to?: Date,
  ): Promise<ProjectCalendarEvent[]>;
  createCalendarEvent(
    companyId: string,
    projectId: string,
    data: ProjectCalendarData,
    actorId: string,
  ): Promise<ProjectCalendarEvent>;
  updateCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    data: Partial<ProjectCalendarData>,
    actorId: string,
  ): Promise<ProjectCalendarEvent>;
  softDeleteCalendarEvent(
    companyId: string,
    projectId: string,
    eventId: string,
    actorId: string,
  ): Promise<ProjectCalendarEvent>;
  getSettings(
    companyId: string,
    projectId: string,
  ): Promise<ProjectSettings | null>;
  updateSettings(
    companyId: string,
    projectId: string,
    data: ProjectSettingsData,
    actorId: string,
  ): Promise<ProjectSettings>;
  listTags(companyId: string): Promise<ProjectTag[]>;
  createTag(
    companyId: string,
    data: ProjectTagData,
    actorId: string,
  ): Promise<ProjectTag>;
  updateTag(
    companyId: string,
    tagId: string,
    data: Partial<ProjectTagData>,
    actorId: string,
  ): Promise<ProjectTag>;
  softDeleteTag(
    companyId: string,
    tagId: string,
    actorId: string,
  ): Promise<ProjectTag>;
  assignTag(
    companyId: string,
    projectId: string,
    tagId: string,
    actorId: string,
  ): Promise<ProjectTagAssignment>;
  unassignTag(
    companyId: string,
    projectId: string,
    tagId: string,
    actorId: string,
  ): Promise<ProjectTagAssignment>;
  principalHasPermission(
    companyId: string,
    membershipId: string,
    permissionCode: string,
  ): Promise<boolean>;
}

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
