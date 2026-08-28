import { apiRequest, toQuery } from '../lib/api-client';

export type DashboardScope = 'own' | 'team' | 'all';

/** Money is always carried with its currency — never summed across currencies. */
export interface MoneyByCurrency {
  currency: string;
  value: string;
}

export interface DashboardAssignee {
  id: string;
  user: { id: string; firstName: string; lastName: string };
}

export interface CrmDashboard {
  meta: {
    scope: DashboardScope;
    period: { from: string; to: string };
    baseCurrency: string | null;
    currencyFilter: string | null;
    capabilities: { forecast: boolean; performance: boolean; team: boolean };
  };
  leads: {
    total: number;
    createdInPeriod: number;
    byStatus: Record<string, number>;
    new: number;
    qualified: number;
    converted: number;
    lost: number;
  };
  opportunities: {
    activeCount: number;
    pipelineValue: MoneyByCurrency[];
    weightedPipelineValue: MoneyByCurrency[];
    wonCount: number;
    wonValue: MoneyByCurrency[];
    lostCount: number;
    lostValue: MoneyByCurrency[];
    winRate: number;
  };
  pipeline: Array<{
    stage: { id: string; code: string; name: string; probability: number };
    count: number;
    totalValue: MoneyByCurrency[];
    weightedValue: MoneyByCurrency[];
  }>;
  activities: {
    dueToday: number;
    todayByType: Array<{ type: string; count: number }>;
    upcomingSevenDays: number;
    overdue: number;
    overdueFollowUps: number;
  };
  conversion: {
    totalLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    linkedOpportunities: number;
    qualificationRate: number;
    conversionRate: number;
  };
  forecast: {
    note: string;
    byMonth: Array<{
      month: string;
      count: number;
      value: MoneyByCurrency[];
      weighted: MoneyByCurrency[];
    }>;
    expectedClosingThisMonth: { month: string; count: number; value: MoneyByCurrency[]; weighted: MoneyByCurrency[] } | null;
    expectedClosingNextMonth: { month: string; count: number; value: MoneyByCurrency[]; weighted: MoneyByCurrency[] } | null;
  } | null;
  performance: {
    bySource: Array<{
      source: { id: string; name: string };
      leads: number;
      qualifiedLeads: number;
      opportunities: number;
      wonOpportunities: number;
      lostOpportunities: number;
      winRate: number;
    }> | null;
    byType: Array<{
      type: { id: string; name: string };
      opportunities: number;
      pipelineValue: MoneyByCurrency[];
      wonValue: MoneyByCurrency[];
      wonOpportunities: number;
      lostOpportunities: number;
      winRate: number;
    }> | null;
    byUser: Array<{
      assignee: DashboardAssignee | null;
      activeOpportunities: number;
      pipelineValue: MoneyByCurrency[];
      weightedPipelineValue: MoneyByCurrency[];
      wonOpportunities: number;
      wonValue: MoneyByCurrency[];
      lostOpportunities: number;
      winRate: number;
    }> | null;
  } | null;
  upcomingClosings: {
    upcoming: DashboardOpportunityRow[];
    overdue: DashboardOpportunityRow[];
  };
  overdueFollowUps: Array<{
    id: string;
    subject: string;
    dueDate: string | null;
    priority: string;
    relatedType: string;
    lead?: { id: string; leadNumber: string; name: string } | null;
    crmCompany?: { id: string; name: string } | null;
    crmContact?: { id: string; firstName: string; lastName?: string } | null;
    opportunity?: { id: string; opportunityNumber: string; name: string } | null;
    assignedTo?: DashboardAssignee | null;
  }>;
  recent: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    createdAt: string;
    user?: { id: string; firstName: string; lastName: string } | null;
  }>;
  trends: Array<{
    month: string;
    leadsCreated: number;
    opportunitiesCreated: number;
    newPipelineValue: MoneyByCurrency[];
    wonCount: number;
    wonValue: MoneyByCurrency[];
    lostCount: number;
  }>;
  lostReasons: Array<{
    reason: { id: string | null; name: string };
    count: number;
    value: MoneyByCurrency[];
    percentage: number;
  }>;
  pipelineHealth: {
    staleDays: number;
    staleCount: number;
    withoutExpectedClose: number;
    pastExpectedClose: number;
    highValueWithoutUpcomingActivity: number;
    stale: Array<{
      id: string;
      opportunityNumber: string;
      name: string;
      currency: string;
      estimatedContractValue: string | null;
      lastActivityAt: string;
      expectedClosingDate: string | null;
      daysInactive: number;
      stage: { id: string; name: string };
      assignedTo: DashboardAssignee | null;
    }>;
  };
  stageAging: Array<{
    stageId: string;
    stageName: string;
    opportunityCount: number;
    averageDays: number;
  }>;
}

export interface DashboardOpportunityRow {
  id: string;
  opportunityNumber: string;
  name: string;
  estimatedContractValue: string | null;
  currency: string;
  probability: number;
  expectedClosingDate: string | null;
  crmCompany?: { id: string; name: string } | null;
  assignedTo?: DashboardAssignee | null;
}

export interface CrmDashboardFilters {
  scope?: DashboardScope;
  from?: string;
  to?: string;
  assignedToId?: string;
  leadSourceId?: string;
  opportunityTypeId?: string;
  stageId?: string;
  priority?: string;
  currency?: string;
  staleDays?: number;
}

export const getCrmDashboard = (
  companyId: string,
  filters: CrmDashboardFilters = {},
) =>
  apiRequest<CrmDashboard>(
    `/companies/${companyId}/crm/dashboard${toQuery(filters as Record<string, unknown>)}`,
  );
