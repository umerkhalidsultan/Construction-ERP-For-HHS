import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  CrmActivityStatus,
  CrmActivityType,
  LeadStatus,
  OpportunityStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedPrincipal } from '../common/context/request-context.types';
import { PERMISSIONS } from '../permissions/permission.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CrmDashboardQueryDto, DashboardScope } from './dashboard.dto';

/** A monetary total is always carried with its currency; never summed across. */
export interface MoneyByCurrency {
  currency: string;
  value: string;
}

interface ResolvedScope {
  scope: DashboardScope;
  /** Membership ids the caller may see, or null for "the whole company". */
  membershipIds: string[] | null;
}

const OPEN_ACTIVITY_STATUSES: CrmActivityStatus[] = [
  CrmActivityStatus.PLANNED,
  CrmActivityStatus.IN_PROGRESS,
];

@Injectable()
export class CrmDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(
    companyId: string,
    query: CrmDashboardQueryDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompany(companyId, principal);
    const permissions = await this.permissionCodes(principal);
    const scope = await this.resolveScope(
      companyId,
      query,
      principal,
      permissions,
    );
    const period = this.resolvePeriod(query);
    const canForecast = this.can(
      permissions,
      principal,
      PERMISSIONS.CRM_DASHBOARD_VIEW_FORECAST,
    );
    const canPerformance = this.can(
      permissions,
      principal,
      PERMISSIONS.CRM_DASHBOARD_VIEW_PERFORMANCE,
    );

    const [
      leads,
      opportunities,
      pipeline,
      activities,
      conversion,
      upcomingClosings,
      overdueFollowUps,
      recent,
      company,
      trends,
      lostReasons,
      pipelineHealth,
      stageAging,
    ] = await Promise.all([
      this.leadKpis(companyId, scope, period, query),
      this.opportunityKpis(companyId, scope, period, query),
      this.pipelineByStage(companyId, scope, query),
      this.activityKpis(companyId, scope),
      this.leadConversion(companyId, scope, period, query),
      this.upcomingClosings(companyId, scope, query),
      this.overdueFollowUps(companyId, scope),
      this.recentActivity(companyId),
      this.prisma.company.findFirst({
        where: { id: companyId, deletedAt: null },
        select: { currency: true },
      }),
      this.monthlyTrends(companyId, scope, query),
      this.lostReasonAnalysis(companyId, scope, period, query),
      this.pipelineHealth(companyId, scope, query),
      this.stageAging(companyId, scope),
    ]);

    const [forecast, bySource, byType, byUser] = await Promise.all([
      canForecast
        ? this.forecast(companyId, scope, query)
        : Promise.resolve(null),
      canPerformance
        ? this.sourcePerformance(companyId, scope, period, query)
        : Promise.resolve(null),
      canPerformance
        ? this.projectTypePerformance(companyId, scope, period, query)
        : Promise.resolve(null),
      canPerformance && scope.scope !== DashboardScope.OWN
        ? this.userPerformance(companyId, scope, period, query)
        : Promise.resolve(null),
    ]);

    return {
      meta: {
        scope: scope.scope,
        period: {
          from: period.from.toISOString(),
          to: period.to.toISOString(),
        },
        baseCurrency: company?.currency ?? null,
        currencyFilter: query.currency ?? null,
        capabilities: {
          forecast: canForecast,
          performance: canPerformance,
          team: scope.scope !== DashboardScope.OWN,
        },
      },
      leads,
      opportunities,
      pipeline,
      activities,
      conversion,
      forecast,
      performance: canPerformance ? { bySource, byType, byUser } : null,
      upcomingClosings,
      overdueFollowUps,
      recent,
      trends,
      lostReasons,
      pipelineHealth,
      stageAging,
    };
  }

  // ---------------------------------------------------------------- KPIs

  /** Lead counts. Status counts are snapshots; totals respect the period. */
  private async leadKpis(
    companyId: string,
    scope: ResolvedScope,
    period: { from: Date; to: Date },
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{ status: string; count: number }>
    >(Prisma.sql`
      SELECT "status"::text AS "status", COUNT(*)::int AS "count"
      FROM "leads"
      WHERE "companyId" = ${companyId}::uuid
        AND "deletedAt" IS NULL
        ${this.leadScopeSql(scope)}
        ${query.leadSourceId ? Prisma.sql`AND "leadSourceId" = ${query.leadSourceId}::uuid` : Prisma.empty}
      GROUP BY "status"
    `);
    const byStatus = Object.fromEntries(
      rows.map((row) => [row.status, row.count]),
    ) as Record<string, number>;
    const inPeriod = await this.prisma.lead.count({
      where: {
        companyId,
        deletedAt: null,
        createdAt: { gte: period.from, lte: period.to },
        ...this.leadScopeWhere(scope),
        ...(query.leadSourceId ? { leadSourceId: query.leadSourceId } : {}),
      },
    });
    return {
      total: rows.reduce((sum, row) => sum + row.count, 0),
      createdInPeriod: inPeriod,
      byStatus,
      new: byStatus[LeadStatus.NEW] ?? 0,
      qualified: byStatus[LeadStatus.QUALIFIED] ?? 0,
      converted: byStatus[LeadStatus.CONVERTED] ?? 0,
      lost: byStatus[LeadStatus.LOST] ?? 0,
    };
  }

  /**
   * Opportunity KPIs. Pipeline/weighted are snapshots of currently OPEN work;
   * won/lost are period metrics keyed on wonDate/lostDate.
   */
  private async opportunityKpis(
    companyId: string,
    scope: ResolvedScope,
    period: { from: Date; to: Date },
    query: CrmDashboardQueryDto,
  ) {
    const filters = this.opportunityFilterSql(query);
    const [open, won, lost] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          currency: string;
          count: number;
          total: string;
          weighted: string;
        }>
      >(Prisma.sql`
        SELECT "currency", COUNT(*)::int AS "count",
          COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
          COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "deletedAt" IS NULL
          AND "status"::text = 'OPEN'
          ${this.opportunityScopeSql(scope)}
          ${filters}
        GROUP BY "currency"
      `),
      this.prisma.$queryRaw<
        Array<{ currency: string; count: number; total: string }>
      >(Prisma.sql`
        SELECT "currency", COUNT(*)::int AS "count",
          COALESCE(SUM("finalContractValue"), 0)::text AS "total"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "deletedAt" IS NULL
          AND "status"::text = 'WON'
          AND "wonDate" BETWEEN ${period.from}::date AND ${period.to}::date
          ${this.opportunityScopeSql(scope)}
          ${filters}
        GROUP BY "currency"
      `),
      this.prisma.$queryRaw<
        Array<{ currency: string; count: number; total: string }>
      >(Prisma.sql`
        SELECT "currency", COUNT(*)::int AS "count",
          COALESCE(SUM("estimatedContractValue"), 0)::text AS "total"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid
          AND "deletedAt" IS NULL
          AND "status"::text = 'LOST'
          AND "lostDate" BETWEEN ${period.from}::date AND ${period.to}::date
          ${this.opportunityScopeSql(scope)}
          ${filters}
        GROUP BY "currency"
      `),
    ]);

    const wonCount = won.reduce((sum, row) => sum + row.count, 0);
    const lostCount = lost.reduce((sum, row) => sum + row.count, 0);
    return {
      activeCount: open.reduce((sum, row) => sum + row.count, 0),
      pipelineValue: this.money(open, 'total', query.currency),
      weightedPipelineValue: this.money(open, 'weighted', query.currency),
      wonCount,
      wonValue: this.money(won, 'total', query.currency),
      lostCount,
      lostValue: this.money(lost, 'total', query.currency),
      winRate: this.rate(wonCount, wonCount + lostCount),
    };
  }

  /** Opportunities grouped by pipeline stage — the funnel source. */
  private async pipelineByStage(
    companyId: string,
    scope: ResolvedScope,
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        stageId: string;
        currency: string;
        count: number;
        total: string;
        weighted: string;
      }>
    >(Prisma.sql`
      SELECT "stageId", "currency", COUNT(*)::int AS "count",
        COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
        COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
      FROM "opportunities"
      WHERE "companyId" = ${companyId}::uuid
        AND "deletedAt" IS NULL
        AND "status"::text = 'OPEN'
        ${this.opportunityScopeSql(scope)}
        ${this.opportunityFilterSql(query)}
      GROUP BY "stageId", "currency"
    `);
    const stages = await this.prisma.opportunityStageDefinition.findMany({
      where: {
        OR: [{ companyId: null }, { companyId }],
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        probability: true,
        sortOrder: true,
        isWon: true,
        isLost: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return stages
      .filter((stage) => !stage.isWon && !stage.isLost)
      .map((stage) => {
        const forStage = rows.filter((row) => row.stageId === stage.id);
        return {
          stage,
          count: forStage.reduce((sum, row) => sum + row.count, 0),
          totalValue: this.money(forStage, 'total', query.currency),
          weightedValue: this.money(forStage, 'weighted', query.currency),
        };
      });
  }

  private async activityKpis(companyId: string, scope: ResolvedScope) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(dayEnd);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const scopeWhere = this.activityScopeWhere(scope);
    const openWhere = { status: { in: OPEN_ACTIVITY_STATUSES } };
    const [dueToday, byTypeToday, upcoming, overdue, overdueFollowUps] =
      await Promise.all([
        this.prisma.crmActivity.count({
          where: {
            companyId,
            deletedAt: null,
            ...scopeWhere,
            ...openWhere,
            OR: [
              { dueDate: { gte: dayStart, lte: dayEnd } },
              { startAt: { gte: dayStart, lte: dayEnd } },
            ],
          },
        }),
        this.prisma.$queryRaw<Array<{ type: string; count: number }>>(
          Prisma.sql`
            SELECT "type"::text AS "type", COUNT(*)::int AS "count"
            FROM "crm_activities"
            WHERE "companyId" = ${companyId}::uuid
              AND "deletedAt" IS NULL
              AND "status"::text IN ('PLANNED', 'IN_PROGRESS')
              AND (
                ("dueDate" BETWEEN ${dayStart} AND ${dayEnd})
                OR ("startAt" BETWEEN ${dayStart} AND ${dayEnd})
              )
              ${this.activityScopeSql(scope)}
            GROUP BY "type"
          `,
        ),
        this.prisma.crmActivity.count({
          where: {
            companyId,
            deletedAt: null,
            ...scopeWhere,
            ...openWhere,
            dueDate: { gt: dayEnd, lte: weekEnd },
          },
        }),
        this.prisma.crmActivity.count({
          where: {
            companyId,
            deletedAt: null,
            ...scopeWhere,
            ...openWhere,
            dueDate: { lt: now },
          },
        }),
        this.prisma.crmActivity.count({
          where: {
            companyId,
            deletedAt: null,
            ...scopeWhere,
            ...openWhere,
            type: CrmActivityType.FOLLOW_UP,
            dueDate: { lt: now },
          },
        }),
      ]);

    return {
      dueToday,
      todayByType: byTypeToday.map((row) => ({
        type: row.type,
        count: row.count,
      })),
      upcomingSevenDays: upcoming,
      overdue,
      overdueFollowUps,
    };
  }

  /**
   * Conversion uses the real Lead → Opportunity foreign key, never name
   * similarity.
   */
  private async leadConversion(
    companyId: string,
    scope: ResolvedScope,
    period: { from: Date; to: Date },
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        total: number;
        qualified: number;
        converted: number;
        linked: number;
      }>
    >(Prisma.sql`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (WHERE l."status"::text = 'QUALIFIED')::int AS "qualified",
        COUNT(*) FILTER (WHERE l."status"::text = 'CONVERTED')::int AS "converted",
        COUNT(o."id")::int AS "linked"
      FROM "leads" l
      LEFT JOIN "opportunities" o
        ON o."leadId" = l."id" AND o."deletedAt" IS NULL
      WHERE l."companyId" = ${companyId}::uuid
        AND l."deletedAt" IS NULL
        AND l."createdAt" BETWEEN ${period.from} AND ${period.to}
        ${scope.membershipIds ? Prisma.sql`AND l."assignedToId" = ANY(${scope.membershipIds}::uuid[])` : Prisma.empty}
        ${query.leadSourceId ? Prisma.sql`AND l."leadSourceId" = ${query.leadSourceId}::uuid` : Prisma.empty}
    `);
    const row = rows[0] ?? { total: 0, qualified: 0, converted: 0, linked: 0 };
    return {
      totalLeads: row.total,
      qualifiedLeads: row.qualified,
      convertedLeads: row.converted,
      linkedOpportunities: row.linked,
      qualificationRate: this.rate(row.qualified, row.total),
      conversionRate: this.rate(row.linked, row.total),
    };
  }

  private async sourcePerformance(
    companyId: string,
    scope: ResolvedScope,
    period: { from: Date; to: Date },
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        sourceId: string;
        sourceName: string;
        leads: number;
        qualified: number;
        opportunities: number;
        won: number;
        lost: number;
      }>
    >(Prisma.sql`
      SELECT s."id" AS "sourceId", s."name" AS "sourceName",
        COUNT(DISTINCT l."id")::int AS "leads",
        COUNT(DISTINCT l."id") FILTER (WHERE l."status"::text = 'QUALIFIED')::int AS "qualified",
        COUNT(DISTINCT o."id")::int AS "opportunities",
        COUNT(DISTINCT o."id") FILTER (WHERE o."status"::text = 'WON')::int AS "won",
        COUNT(DISTINCT o."id") FILTER (WHERE o."status"::text = 'LOST')::int AS "lost"
      FROM "lead_source_definitions" s
      LEFT JOIN "leads" l
        ON l."leadSourceId" = s."id"
       AND l."companyId" = ${companyId}::uuid
       AND l."deletedAt" IS NULL
       AND l."createdAt" BETWEEN ${period.from} AND ${period.to}
       ${scope.membershipIds ? Prisma.sql`AND l."assignedToId" = ANY(${scope.membershipIds}::uuid[])` : Prisma.empty}
      LEFT JOIN "opportunities" o
        ON o."leadId" = l."id" AND o."deletedAt" IS NULL
      WHERE (s."companyId" = ${companyId}::uuid OR s."companyId" IS NULL)
        AND s."deletedAt" IS NULL
      GROUP BY s."id", s."name", s."sortOrder"
      HAVING COUNT(DISTINCT l."id") > 0
      ORDER BY s."sortOrder", s."name"
    `);
    void query;
    return rows.map((row) => ({
      source: { id: row.sourceId, name: row.sourceName },
      leads: row.leads,
      qualifiedLeads: row.qualified,
      opportunities: row.opportunities,
      wonOpportunities: row.won,
      lostOpportunities: row.lost,
      winRate: this.rate(row.won, row.won + row.lost),
    }));
  }

  private async projectTypePerformance(
    companyId: string,
    scope: ResolvedScope,
    period: { from: Date; to: Date },
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        typeId: string;
        typeName: string;
        currency: string;
        opportunities: number;
        won: number;
        lost: number;
        pipeline: string;
        wonValue: string;
      }>
    >(Prisma.sql`
      SELECT t."id" AS "typeId", t."name" AS "typeName", o."currency",
        COUNT(o."id")::int AS "opportunities",
        COUNT(o."id") FILTER (WHERE o."status"::text = 'WON')::int AS "won",
        COUNT(o."id") FILTER (WHERE o."status"::text = 'LOST')::int AS "lost",
        COALESCE(SUM(o."estimatedContractValue") FILTER (WHERE o."status"::text = 'OPEN'), 0)::text AS "pipeline",
        COALESCE(SUM(o."finalContractValue") FILTER (WHERE o."status"::text = 'WON' AND o."wonDate" BETWEEN ${period.from}::date AND ${period.to}::date), 0)::text AS "wonValue"
      FROM "opportunity_type_definitions" t
      JOIN "opportunities" o
        ON o."opportunityTypeId" = t."id"
       AND o."companyId" = ${companyId}::uuid
       AND o."deletedAt" IS NULL
       ${this.opportunityScopeSql(scope, 'o')}
      WHERE t."deletedAt" IS NULL
      GROUP BY t."id", t."name", t."sortOrder", o."currency"
      ORDER BY t."sortOrder", t."name"
    `);
    const byType = new Map<string, (typeof rows)[number][]>();
    for (const row of rows) {
      byType.set(row.typeId, [...(byType.get(row.typeId) ?? []), row]);
    }
    return [...byType.values()].map((group) => {
      const won = group.reduce((sum, row) => sum + row.won, 0);
      const lost = group.reduce((sum, row) => sum + row.lost, 0);
      return {
        type: { id: group[0].typeId, name: group[0].typeName },
        opportunities: group.reduce((sum, row) => sum + row.opportunities, 0),
        pipelineValue: this.money(group, 'pipeline', query.currency),
        wonValue: this.money(group, 'wonValue', query.currency),
        wonOpportunities: won,
        lostOpportunities: lost,
        winRate: this.rate(won, won + lost),
      };
    });
  }

  private async userPerformance(
    companyId: string,
    scope: ResolvedScope,
    period: { from: Date; to: Date },
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        assignedToId: string | null;
        currency: string;
        active: number;
        won: number;
        lost: number;
        pipeline: string;
        weighted: string;
        wonValue: string;
      }>
    >(Prisma.sql`
      SELECT o."assignedToId", o."currency",
        COUNT(o."id") FILTER (WHERE o."status"::text = 'OPEN')::int AS "active",
        COUNT(o."id") FILTER (WHERE o."status"::text = 'WON' AND o."wonDate" BETWEEN ${period.from}::date AND ${period.to}::date)::int AS "won",
        COUNT(o."id") FILTER (WHERE o."status"::text = 'LOST' AND o."lostDate" BETWEEN ${period.from}::date AND ${period.to}::date)::int AS "lost",
        COALESCE(SUM(o."estimatedContractValue") FILTER (WHERE o."status"::text = 'OPEN'), 0)::text AS "pipeline",
        COALESCE(SUM(o."estimatedContractValue" * o."probability" / 100) FILTER (WHERE o."status"::text = 'OPEN'), 0)::text AS "weighted",
        COALESCE(SUM(o."finalContractValue") FILTER (WHERE o."status"::text = 'WON' AND o."wonDate" BETWEEN ${period.from}::date AND ${period.to}::date), 0)::text AS "wonValue"
      FROM "opportunities" o
      WHERE o."companyId" = ${companyId}::uuid
        AND o."deletedAt" IS NULL
        ${this.opportunityScopeSql(scope, 'o')}
      GROUP BY o."assignedToId", o."currency"
    `);
    const ids = [
      ...new Set(
        rows
          .map((row) => row.assignedToId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const members = ids.length
      ? await this.prisma.companyMembership.findMany({
          where: { id: { in: ids }, companyId, deletedAt: null },
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        })
      : [];
    const grouped = new Map<string, (typeof rows)[number][]>();
    for (const row of rows) {
      const key = row.assignedToId ?? 'unassigned';
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    return [...grouped.entries()].map(([key, group]) => {
      const won = group.reduce((sum, row) => sum + row.won, 0);
      const lost = group.reduce((sum, row) => sum + row.lost, 0);
      return {
        assignee: members.find((member) => member.id === key) ?? null,
        activeOpportunities: group.reduce((sum, row) => sum + row.active, 0),
        pipelineValue: this.money(group, 'pipeline', query.currency),
        weightedPipelineValue: this.money(group, 'weighted', query.currency),
        wonOpportunities: won,
        wonValue: this.money(group, 'wonValue', query.currency),
        lostOpportunities: lost,
        winRate: this.rate(won, won + lost),
      };
    });
  }

  private async forecast(
    companyId: string,
    scope: ResolvedScope,
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        month: string;
        currency: string;
        count: number;
        total: string;
        weighted: string;
      }>
    >(Prisma.sql`
      SELECT to_char("expectedClosingDate", 'YYYY-MM') AS "month", "currency",
        COUNT(*)::int AS "count",
        COALESCE(SUM("estimatedContractValue"), 0)::text AS "total",
        COALESCE(SUM("estimatedContractValue" * "probability" / 100), 0)::text AS "weighted"
      FROM "opportunities"
      WHERE "companyId" = ${companyId}::uuid
        AND "deletedAt" IS NULL
        AND "status"::text = 'OPEN'
        AND "expectedClosingDate" IS NOT NULL
        ${this.opportunityScopeSql(scope)}
        ${this.opportunityFilterSql(query)}
      GROUP BY 1, "currency"
      ORDER BY 1
    `);
    const grouped = new Map<string, (typeof rows)[number][]>();
    for (const row of rows) {
      grouped.set(row.month, [...(grouped.get(row.month) ?? []), row]);
    }
    const byMonth = [...grouped.entries()].map(([month, group]) => ({
      month,
      count: group.reduce((sum, row) => sum + row.count, 0),
      value: this.money(group, 'total', query.currency),
      weighted: this.money(group, 'weighted', query.currency),
    }));
    const now = new Date();
    const key = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth = key(now);
    const nextMonth = key(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    return {
      note: 'CRM estimate only. Not accounting revenue.',
      byMonth,
      expectedClosingThisMonth:
        byMonth.find((row) => row.month === thisMonth) ?? null,
      expectedClosingNextMonth:
        byMonth.find((row) => row.month === nextMonth) ?? null,
    };
  }

  private async upcomingClosings(
    companyId: string,
    scope: ResolvedScope,
    query: CrmDashboardQueryDto,
  ) {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 30);
    const select = {
      id: true,
      opportunityNumber: true,
      name: true,
      estimatedContractValue: true,
      currency: true,
      probability: true,
      expectedClosingDate: true,
      crmCompany: { select: { id: true, name: true } },
      assignedTo: {
        select: {
          id: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    } satisfies Prisma.OpportunitySelect;
    const base = {
      companyId,
      deletedAt: null,
      status: OpportunityStatus.OPEN,
      ...this.opportunityScopeWhere(scope),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };
    const [upcoming, overdue] = await Promise.all([
      this.prisma.opportunity.findMany({
        where: { ...base, expectedClosingDate: { gte: now, lte: horizon } },
        select,
        orderBy: { expectedClosingDate: 'asc' },
        take: 20,
      }),
      // An overdue expected close is surfaced, never auto-marked Lost.
      this.prisma.opportunity.findMany({
        where: { ...base, expectedClosingDate: { lt: now } },
        select,
        orderBy: { expectedClosingDate: 'asc' },
        take: 20,
      }),
    ]);
    return { upcoming, overdue };
  }

  private async overdueFollowUps(companyId: string, scope: ResolvedScope) {
    return this.prisma.crmActivity.findMany({
      where: {
        companyId,
        deletedAt: null,
        type: CrmActivityType.FOLLOW_UP,
        status: { in: OPEN_ACTIVITY_STATUSES },
        dueDate: { lt: new Date() },
        ...this.activityScopeWhere(scope),
      },
      select: {
        id: true,
        subject: true,
        dueDate: true,
        priority: true,
        relatedType: true,
        lead: { select: { id: true, leadNumber: true, name: true } },
        crmCompany: { select: { id: true, name: true } },
        crmContact: { select: { id: true, firstName: true, lastName: true } },
        opportunity: {
          select: { id: true, opportunityNumber: true, name: true },
        },
        assignedTo: {
          select: {
            id: true,
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 25,
    });
  }

  /** Twelve calendar months of real CRM movement, filled with zero-value months. */
  private async monthlyTrends(
    companyId: string,
    scope: ResolvedScope,
    query: CrmDashboardQueryDto,
  ) {
    const [leads, opportunities, closed] = await Promise.all([
      this.prisma.$queryRaw<Array<{ month: string; count: number }>>(Prisma.sql`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS "month", COUNT(*)::int AS "count"
        FROM "leads"
        WHERE "companyId" = ${companyId}::uuid AND "deletedAt" IS NULL
          AND "createdAt" >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
          ${this.leadScopeSql(scope)}
          ${query.leadSourceId ? Prisma.sql`AND "leadSourceId" = ${query.leadSourceId}::uuid` : Prisma.empty}
        GROUP BY 1
      `),
      this.prisma.$queryRaw<
        Array<{ month: string; count: number; currency: string; value: string }>
      >(Prisma.sql`
        SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS "month", COUNT(*)::int AS "count", "currency",
          COALESCE(SUM("estimatedContractValue"), 0)::text AS "value"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid AND "deletedAt" IS NULL
          AND "createdAt" >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
          ${this.opportunityScopeSql(scope)} ${this.opportunityFilterSql(query)}
        GROUP BY 1, "currency"
      `),
      this.prisma.$queryRaw<
        Array<{
          month: string;
          status: string;
          count: number;
          currency: string;
          value: string;
        }>
      >(Prisma.sql`
        SELECT to_char(date_trunc('month', COALESCE("wonDate", "lostDate")), 'YYYY-MM') AS "month", "status"::text AS "status",
          COUNT(*)::int AS "count", "currency",
          COALESCE(SUM(CASE WHEN "status"::text = 'WON' THEN "finalContractValue" ELSE "estimatedContractValue" END), 0)::text AS "value"
        FROM "opportunities"
        WHERE "companyId" = ${companyId}::uuid AND "deletedAt" IS NULL
          AND "status"::text IN ('WON', 'LOST')
          AND COALESCE("wonDate", "lostDate") >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
          ${this.opportunityScopeSql(scope)} ${this.opportunityFilterSql(query)}
        GROUP BY 1, "status", "currency"
      `),
    ]);
    const monthKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (11 - index),
        1,
      );
      const month = monthKey(date);
      const created = opportunities.filter((row) => row.month === month);
      const won = closed.filter(
        (row) => row.month === month && row.status === 'WON',
      );
      const lost = closed.filter(
        (row) => row.month === month && row.status === 'LOST',
      );
      return {
        month,
        leadsCreated: leads.find((row) => row.month === month)?.count ?? 0,
        opportunitiesCreated: created.reduce((sum, row) => sum + row.count, 0),
        newPipelineValue: this.money(created, 'value', query.currency),
        wonCount: won.reduce((sum, row) => sum + row.count, 0),
        wonValue: this.money(won, 'value', query.currency),
        lostCount: lost.reduce((sum, row) => sum + row.count, 0),
      };
    });
  }

  private async lostReasonAnalysis(
    companyId: string,
    scope: ResolvedScope,
    period: { from: Date; to: Date },
    query: CrmDashboardQueryDto,
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        reasonId: string | null;
        reasonName: string;
        currency: string;
        count: number;
        value: string;
      }>
    >(Prisma.sql`
      SELECT o."lostReasonId" AS "reasonId", COALESCE(r."name", 'Unspecified') AS "reasonName", o."currency",
        COUNT(*)::int AS "count", COALESCE(SUM(o."estimatedContractValue"), 0)::text AS "value"
      FROM "opportunities" o
      LEFT JOIN "opportunity_lost_reason_definitions" r ON r."id" = o."lostReasonId" AND r."deletedAt" IS NULL
      WHERE o."companyId" = ${companyId}::uuid AND o."deletedAt" IS NULL
        AND o."status"::text = 'LOST' AND o."lostDate" BETWEEN ${period.from}::date AND ${period.to}::date
        ${this.opportunityScopeSql(scope, 'o')} ${this.opportunityFilterSql(query)}
      GROUP BY o."lostReasonId", r."name", o."currency"
    `);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const groups = new Map<string, (typeof rows)[number][]>();
    for (const row of rows)
      groups.set(row.reasonId ?? 'unspecified', [
        ...(groups.get(row.reasonId ?? 'unspecified') ?? []),
        row,
      ]);
    return [...groups.values()]
      .map((group) => ({
        reason: { id: group[0].reasonId, name: group[0].reasonName },
        count: group.reduce((sum, row) => sum + row.count, 0),
        value: this.money(group, 'value', query.currency),
        percentage: this.rate(
          group.reduce((sum, row) => sum + row.count, 0),
          total,
        ),
      }))
      .sort(
        (a, b) =>
          b.count - a.count || a.reason.name.localeCompare(b.reason.name),
      );
  }

  private async pipelineHealth(
    companyId: string,
    scope: ResolvedScope,
    query: CrmDashboardQueryDto,
  ) {
    const staleDays = query.staleDays ?? 14;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleDays);
    const base = {
      companyId,
      deletedAt: null,
      status: OpportunityStatus.OPEN,
      ...this.opportunityScopeWhere(scope),
    };
    const [
      stale,
      staleCount,
      withoutExpectedClose,
      pastExpectedClose,
      highValueWithoutActivity,
    ] = await Promise.all([
      this.prisma.opportunity.findMany({
        where: { ...base, lastActivityAt: { lt: cutoff } },
        select: {
          id: true,
          opportunityNumber: true,
          name: true,
          currency: true,
          estimatedContractValue: true,
          lastActivityAt: true,
          expectedClosingDate: true,
          stage: { select: { id: true, name: true } },
          assignedTo: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: [
          { estimatedContractValue: 'desc' },
          { lastActivityAt: 'asc' },
        ],
        take: 20,
      }),
      this.prisma.opportunity.count({
        where: { ...base, lastActivityAt: { lt: cutoff } },
      }),
      this.prisma.opportunity.count({
        where: { ...base, expectedClosingDate: null },
      }),
      this.prisma.opportunity.count({
        where: { ...base, expectedClosingDate: { lt: new Date() } },
      }),
      this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS "count" FROM "opportunities" o
        WHERE o."companyId" = ${companyId}::uuid AND o."deletedAt" IS NULL AND o."status"::text = 'OPEN'
          AND o."estimatedContractValue" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "crm_activities" a WHERE a."opportunityId" = o."id" AND a."deletedAt" IS NULL AND a."status"::text IN ('PLANNED', 'IN_PROGRESS') AND COALESCE(a."dueDate", a."startAt") >= CURRENT_TIMESTAMP)
          ${this.opportunityScopeSql(scope, 'o')} ${this.opportunityFilterSql(query)}
      `),
    ]);
    return {
      staleDays,
      staleCount,
      withoutExpectedClose,
      pastExpectedClose,
      highValueWithoutUpcomingActivity: highValueWithoutActivity[0]?.count ?? 0,
      stale: stale.map((row) => ({
        ...row,
        daysInactive: Math.floor(
          (Date.now() - row.lastActivityAt.getTime()) / 86400000,
        ),
      })),
    };
  }

  private async stageAging(companyId: string, scope: ResolvedScope) {
    return this.prisma.$queryRaw<
      Array<{
        stageId: string;
        stageName: string;
        opportunityCount: number;
        averageDays: number;
      }>
    >(Prisma.sql`
      WITH latest_stage AS (
        SELECT DISTINCT ON (h."opportunityId") h."opportunityId", h."toStageId", h."changedAt"
        FROM "opportunity_stage_history" h
        WHERE h."companyId" = ${companyId}::uuid AND h."deletedAt" IS NULL
        ORDER BY h."opportunityId", h."changedAt" DESC
      )
      SELECT s."id" AS "stageId", s."name" AS "stageName", COUNT(o."id")::int AS "opportunityCount",
        ROUND(AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - latest_stage."changedAt")) / 86400)::numeric, 1)::float AS "averageDays"
      FROM latest_stage
      JOIN "opportunities" o ON o."id" = latest_stage."opportunityId" AND o."companyId" = ${companyId}::uuid
      JOIN "opportunity_stage_definitions" s ON s."id" = latest_stage."toStageId"
      WHERE o."deletedAt" IS NULL AND o."status"::text = 'OPEN' ${this.opportunityScopeSql(scope, 'o')}
      GROUP BY s."id", s."name", s."sortOrder"
      ORDER BY s."sortOrder", s."name"
    `);
  }

  /** Reuses the existing AuditLog trail — no second event system. */
  private async recentActivity(companyId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        companyId,
        deletedAt: null,
        entity: { in: ['Lead', 'Opportunity', 'CrmActivity'] },
      },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
  }

  // ------------------------------------------------------------- helpers

  /**
   * Sums money per currency so unrelated currencies are never added together.
   * When a currency filter is supplied only that currency is returned.
   */
  private money(
    rows: Array<Record<string, unknown> & { currency: string }>,
    field: string,
    currencyFilter?: string,
  ): MoneyByCurrency[] {
    const totals = new Map<string, Prisma.Decimal>();
    for (const row of rows) {
      if (currencyFilter && row.currency !== currencyFilter) continue;
      const raw = row[field];
      const value = new Prisma.Decimal(
        typeof raw === 'string' || typeof raw === 'number' ? raw : 0,
      );
      totals.set(
        row.currency,
        (totals.get(row.currency) ?? new Prisma.Decimal(0)).plus(value),
      );
    }
    return [...totals.entries()]
      .map(([currency, value]) => ({ currency, value: value.toString() }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }

  private rate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10;
  }

  private resolvePeriod(query: CrmDashboardQueryDto): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : new Date();
    to.setHours(23, 59, 59, 999);
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getFullYear(), to.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }

  private opportunityFilterSql(query: CrmDashboardQueryDto): Prisma.Sql {
    return Prisma.join(
      [
        query.opportunityTypeId
          ? Prisma.sql`AND "opportunityTypeId" = ${query.opportunityTypeId}::uuid`
          : Prisma.empty,
        query.stageId
          ? Prisma.sql`AND "stageId" = ${query.stageId}::uuid`
          : Prisma.empty,
        query.priority
          ? Prisma.sql`AND "priority"::text = ${query.priority}`
          : Prisma.empty,
        query.crmCompanyId
          ? Prisma.sql`AND "crmCompanyId" = ${query.crmCompanyId}::uuid`
          : Prisma.empty,
        query.currency
          ? Prisma.sql`AND "currency" = ${query.currency}`
          : Prisma.empty,
      ],
      ' ',
    );
  }

  private opportunityScopeSql(scope: ResolvedScope, alias = ''): Prisma.Sql {
    if (!scope.membershipIds) return Prisma.empty;
    const column = alias
      ? Prisma.raw(`"${alias}"."assignedToId"`)
      : Prisma.raw('"assignedToId"');
    return Prisma.sql`AND ${column} = ANY(${scope.membershipIds}::uuid[])`;
  }

  private leadScopeSql(scope: ResolvedScope): Prisma.Sql {
    if (!scope.membershipIds) return Prisma.empty;
    return Prisma.sql`AND "assignedToId" = ANY(${scope.membershipIds}::uuid[])`;
  }

  private activityScopeSql(scope: ResolvedScope): Prisma.Sql {
    if (!scope.membershipIds) return Prisma.empty;
    return Prisma.sql`AND "assignedToId" = ANY(${scope.membershipIds}::uuid[])`;
  }

  private opportunityScopeWhere(scope: ResolvedScope) {
    return scope.membershipIds
      ? { assignedToId: { in: scope.membershipIds } }
      : {};
  }

  private leadScopeWhere(scope: ResolvedScope) {
    return scope.membershipIds
      ? { assignedToId: { in: scope.membershipIds } }
      : {};
  }

  private activityScopeWhere(scope: ResolvedScope) {
    return scope.membershipIds
      ? { assignedToId: { in: scope.membershipIds } }
      : {};
  }

  /**
   * Determines what the caller may actually see. The requested scope is only
   * ever narrowed, never widened, by what their permissions allow.
   */
  private async resolveScope(
    companyId: string,
    query: CrmDashboardQueryDto,
    principal: AuthenticatedPrincipal,
    permissions: Set<string>,
  ): Promise<ResolvedScope> {
    const canAll = this.can(
      permissions,
      principal,
      PERMISSIONS.CRM_DASHBOARD_VIEW_ALL,
    );
    const canTeam = this.can(
      permissions,
      principal,
      PERMISSIONS.CRM_DASHBOARD_VIEW_TEAM,
    );
    const maxScope: DashboardScope = canAll
      ? DashboardScope.ALL
      : canTeam
        ? DashboardScope.TEAM
        : DashboardScope.OWN;
    const rank: Record<DashboardScope, number> = { own: 0, team: 1, all: 2 };
    const requested = query.scope ?? maxScope;
    const effective = rank[requested] <= rank[maxScope] ? requested : maxScope;

    if (effective === DashboardScope.ALL) {
      // A specific assignee filter still narrows an otherwise company-wide view.
      if (query.assignedToId) {
        await this.assertMembership(companyId, query.assignedToId);
        return { scope: effective, membershipIds: [query.assignedToId] };
      }
      return { scope: effective, membershipIds: null };
    }

    if (effective === DashboardScope.TEAM) {
      const team = await this.teamMembershipIds(companyId, principal);
      if (query.assignedToId) {
        if (!team.includes(query.assignedToId)) {
          throw new ForbiddenException(
            "You don't have access to this team member's data.",
          );
        }
        return { scope: effective, membershipIds: [query.assignedToId] };
      }
      return { scope: effective, membershipIds: team };
    }

    const own = principal.membershipId ? [principal.membershipId] : [];
    if (query.assignedToId && !own.includes(query.assignedToId)) {
      throw new ForbiddenException(
        "You don't have permission to view another user's CRM data.",
      );
    }
    return { scope: DashboardScope.OWN, membershipIds: own };
  }

  /** Direct reports plus the manager themselves, from existing reporting lines. */
  private async teamMembershipIds(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<string[]> {
    if (!principal.membershipId) return [];
    const reports = await this.prisma.reportingLine.findMany({
      where: {
        companyId,
        managerMembershipId: principal.membershipId,
        deletedAt: null,
      },
      select: { subordinateMembershipId: true },
    });
    return [
      principal.membershipId,
      ...reports.map((line) => line.subordinateMembershipId),
    ].filter((id, index, all) => all.indexOf(id) === index);
  }

  private async assertMembership(companyId: string, membershipId: string) {
    const membership = await this.prisma.companyMembership.findFirst({
      where: { id: membershipId, companyId, deletedAt: null },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException(
        "You don't have access to this team member's data.",
      );
    }
  }

  private async permissionCodes(
    principal: AuthenticatedPrincipal,
  ): Promise<Set<string>> {
    if (principal.isPlatformAdmin || !principal.membershipId) return new Set();
    const rows = await this.prisma.permission.findMany({
      where: {
        deletedAt: null,
        roles: {
          some: {
            deletedAt: null,
            role: {
              deletedAt: null,
              memberships: {
                some: {
                  membershipId: principal.membershipId,
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      select: { code: true },
    });
    return new Set(rows.map((row) => row.code));
  }

  private can(
    permissions: Set<string>,
    principal: AuthenticatedPrincipal,
    code: string,
  ): boolean {
    return principal.isPlatformAdmin || permissions.has(code);
  }

  private assertCompany(companyId: string, principal: AuthenticatedPrincipal) {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId) {
      throw new ForbiddenException("You don't have access to this section.");
    }
  }
}
