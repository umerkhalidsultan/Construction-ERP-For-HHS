import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { userErrorMessage } from '../../lib/api-client';
import {
  getCrmDashboard,
  type CrmDashboard,
  type MoneyByCurrency,
} from '../../services/crm-dashboard.service';

const panel = 'rounded-lg border border-slate-200 bg-white p-5';

/** Renders money per currency so unrelated currencies are never added up. */
function Money({ amounts }: { amounts: MoneyByCurrency[] }) {
  if (!amounts.length) return <span className="text-slate-400">—</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
      {amounts.map((a) => (
        <span key={a.currency} className="whitespace-nowrap">
          <span className="text-xs text-slate-500">{a.currency}</span>{' '}
          {Number(a.value).toLocaleString()}
        </span>
      ))}
    </span>
  );
}

function Kpi({
  label,
  value,
  tone,
  to,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'danger' | 'default';
  to?: string;
}) {
  const content = (
    <div
      className={`rounded-lg border bg-white p-4 ${tone === 'danger' ? 'border-red-200' : 'border-slate-200'} ${to ? 'transition hover:border-primary-300 hover:bg-primary-50' : ''}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div
        className={`mt-1 text-xl font-semibold ${tone === 'danger' ? 'text-red-700' : 'text-slate-900'}`}
      >
        {value}
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

/** Lightweight inline-SVG funnel — avoids adding a chart dependency. */
function PipelineFunnel({ stages }: { stages: CrmDashboard['pipeline'] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  const withData = stages.some((s) => s.count > 0);
  if (!withData)
    return (
      <p className="text-sm text-slate-500">
        No open opportunities to chart yet.
      </p>
    );
  return (
    <div className="space-y-2">
      {stages.map((s) => {
        const pct = Math.round((s.count / max) * 100);
        return (
          <div key={s.stage.id} className="flex items-center gap-3">
            <span
              className="w-32 shrink-0 truncate text-xs text-slate-600"
              title={s.stage.name}
            >
              {s.stage.name}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="flex h-full items-center justify-end rounded bg-primary-600 px-2 text-xs font-medium text-white transition-all"
                style={{ width: `${Math.max(pct, s.count ? 8 : 0)}%` }}
              >
                {s.count > 0 ? s.count : ''}
              </div>
            </div>
            <span className="hidden w-40 shrink-0 text-right text-xs text-slate-600 sm:block">
              <Money amounts={s.totalValue} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function startOf(range: string): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (range) {
    case 'today':
      return { from: iso(now), to: iso(now) };
    case 'week': {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay());
      return { from: iso(s), to: iso(now) };
    }
    case 'quarter': {
      const s = new Date(y, Math.floor(m / 3) * 3, 1);
      return { from: iso(s), to: iso(now) };
    }
    case 'year':
      return { from: iso(new Date(y, 0, 1)), to: iso(now) };
    case 'month':
    default:
      return { from: iso(new Date(y, m, 1)), to: iso(now) };
  }
}

export function CrmDashboardPage() {
  const { companyId = '' } = useParams();
  const [range, setRange] = useState('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [currency, setCurrency] = useState('');
  const [staleDays, setStaleDays] = useState('14');

  const period = useMemo(
    () =>
      range === 'custom' && custom.from && custom.to ? custom : startOf(range),
    [range, custom],
  );

  const dash = useQuery({
    queryKey: ['crm-dashboard', companyId, period.from, period.to, currency, staleDays],
    queryFn: async () =>
      (
        await getCrmDashboard(companyId, {
          from: period.from,
          to: period.to,
          currency: currency || undefined,
          staleDays: Number(staleDays),
        })
      ).data,
    enabled: Boolean(companyId),
  });

  if (dash.isLoading)
    return (
      <div>
        <PageHeader title="CRM · Dashboard" description="Loading CRM analytics…" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
            />
          ))}
        </div>
      </div>
    );

  if (dash.isError || !dash.data)
    return (
      <div>
        <PageHeader title="CRM · Dashboard" />
        <Alert>
          {userErrorMessage(dash.error) ||
            'Unable to load CRM dashboard. Please try again.'}
        </Alert>
        <Button className="mt-3" onClick={() => void dash.refetch()}>
          Retry
        </Button>
      </div>
    );

  const x = dash.data;
  const currencies = [
    ...new Set([
      ...x.opportunities.pipelineValue.map((v) => v.currency),
      ...x.opportunities.wonValue.map((v) => v.currency),
    ]),
  ];

  return (
    <div>
      <PageHeader
        title="CRM · Dashboard"
        description={`Sales performance ${period.from} → ${period.to} · scope: ${x.meta.scope}`}
      />

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <Select
            label="Period"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
              { value: 'quarter', label: 'This quarter' },
              { value: 'year', label: 'This year' },
              { value: 'custom', label: 'Custom range' },
            ]}
          />
          {range === 'custom' ? (
            <>
              <Input
                label="From"
                type="date"
                value={custom.from}
                onChange={(e) =>
                  setCustom((c) => ({ ...c, from: e.target.value }))
                }
              />
              <Input
                label="To"
                type="date"
                value={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              />
            </>
          ) : null}
          {currencies.length > 1 ? (
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: '', label: 'All (grouped)' },
                ...currencies.map((c) => ({ value: c, label: c })),
              ]}
            />
          ) : null}
          <Select
            label="Stale after"
            value={staleDays}
            onChange={(e) => setStaleDays(e.target.value)}
            options={[
              { value: '7', label: '7 days' },
              { value: '14', label: '14 days' },
              { value: '30', label: '30 days' },
              { value: '60', label: '60 days' },
            ]}
          />
        </div>
        {currencies.length > 1 && !currency ? (
          <p className="mt-3 text-xs text-amber-700">
            Multiple currencies present. Totals are grouped by currency and are
            never added together.
          </p>
        ) : null}
      </div>

      {/* KPI cards — snapshot vs period metrics are labelled explicitly. */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total leads" value={x.leads.total} to={`/companies/${companyId}/crm/leads`} />
        <Kpi label="New leads" value={x.leads.new} to={`/companies/${companyId}/crm/leads?status=NEW`} />
        <Kpi label="Qualified leads" value={x.leads.qualified} to={`/companies/${companyId}/crm/leads?status=QUALIFIED`} />
        <Kpi label="Active opportunities" value={x.opportunities.activeCount} to={`/companies/${companyId}/crm/opportunities?status=OPEN`} />
        <Kpi
          label="Pipeline value (now)"
          value={<Money amounts={x.opportunities.pipelineValue} />}
        />
        <Kpi
          label="Weighted pipeline (now)"
          value={<Money amounts={x.opportunities.weightedPipelineValue} />}
        />
        <Kpi
          label="Won (period)"
          value={<Money amounts={x.opportunities.wonValue} />}
        />
        <Kpi
          label="Lost (period)"
          value={<Money amounts={x.opportunities.lostValue} />}
        />
        <Kpi label="Win rate (period)" value={`${x.opportunities.winRate}%`} />
        <Kpi label="Activities due today" value={x.activities.dueToday} />
        <Kpi
          label="Overdue follow-ups"
          value={x.activities.overdueFollowUps}
          tone={x.activities.overdueFollowUps > 0 ? 'danger' : 'default'}
          to={`/companies/${companyId}/crm/activities?type=FOLLOW_UP&overdueOnly=true`}
        />
        <Kpi
          label="Overdue activities"
          value={x.activities.overdue}
          tone={x.activities.overdue > 0 ? 'danger' : 'default'}
          to={`/companies/${companyId}/crm/activities?overdueOnly=true`}
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 font-semibold text-slate-900">Pipeline by stage</h2>
          <PipelineFunnel stages={x.pipeline} />
        </section>

        <section className={panel}>
          <h2 className="mb-4 font-semibold text-slate-900">Lead conversion</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs uppercase text-slate-500">Total leads</dt>
              <dd className="text-lg font-semibold">
                {x.conversion.totalLeads}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">Qualified</dt>
              <dd className="text-lg font-semibold">
                {x.conversion.qualifiedLeads}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Converted to opportunity
              </dt>
              <dd className="text-lg font-semibold">
                {x.conversion.linkedOpportunities}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-500">
                Conversion rate
              </dt>
              <dd className="text-lg font-semibold">
                {x.conversion.conversionRate}%
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Conversion is counted from real Lead → Opportunity links.
          </p>
        </section>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 font-semibold text-slate-900">Win / loss reasons</h2>
          {x.lostReasons.length ? (
            <div className="space-y-3">
              {x.lostReasons.map((reason) => (
                <div key={reason.reason.id ?? 'unspecified'}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">{reason.reason.name}</span>
                    <span className="text-slate-500">{reason.count} · {reason.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
                    <div className="h-full rounded bg-red-500" style={{ width: `${Math.max(reason.percentage, 2)}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500"><Money amounts={reason.value} /></div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No lost opportunities in this period.</p>}
        </section>

        <section className={panel}>
          <h2 className="mb-4 font-semibold text-slate-900">Stage aging</h2>
          {x.stageAging.length ? (
            <div className="space-y-3">
              {x.stageAging.map((stage) => (
                <div key={stage.stageId} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{stage.stageName}</span>
                  <span className="text-right text-slate-600">{stage.averageDays} days avg. <span className="text-xs text-slate-400">({stage.opportunityCount})</span></span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">Stage aging appears after opportunities have stage-history records.</p>}
        </section>
      </div>

      <section className={`${panel} mb-5`}>
        <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle className="h-4 w-4 text-amber-600" />Pipeline health</h2>
        <p className="mb-4 text-xs text-slate-500">Open opportunities without CRM activity for {x.pipelineHealth.staleDays} days are marked stale. These indicators do not change opportunity stages.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Stale opportunities" value={x.pipelineHealth.staleCount} tone={x.pipelineHealth.staleCount ? 'danger' : 'default'} />
          <Kpi label="No expected close" value={x.pipelineHealth.withoutExpectedClose} tone={x.pipelineHealth.withoutExpectedClose ? 'danger' : 'default'} />
          <Kpi label="Past expected close" value={x.pipelineHealth.pastExpectedClose} tone={x.pipelineHealth.pastExpectedClose ? 'danger' : 'default'} />
          <Kpi label="No upcoming activity" value={x.pipelineHealth.highValueWithoutUpcomingActivity} tone={x.pipelineHealth.highValueWithoutUpcomingActivity ? 'danger' : 'default'} />
        </div>
        {x.pipelineHealth.stale.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="pb-2">Opportunity</th><th className="pb-2">Stage</th><th className="pb-2">Value</th><th className="pb-2">Assigned</th><th className="pb-2 text-right">Inactive</th></tr></thead><tbody>{x.pipelineHealth.stale.map((opportunity) => <tr key={opportunity.id} className="border-b border-slate-100"><td className="py-2"><Link className="font-medium text-primary-700 hover:underline" to={`/companies/${companyId}/crm/opportunities/${opportunity.id}`}>{opportunity.opportunityNumber} · {opportunity.name}</Link></td><td className="py-2">{opportunity.stage.name}</td><td className="py-2">{opportunity.currency} {Number(opportunity.estimatedContractValue ?? 0).toLocaleString()}</td><td className="py-2">{opportunity.assignedTo ? `${opportunity.assignedTo.user.firstName} ${opportunity.assignedTo.user.lastName}` : 'Unassigned'}</td><td className="py-2 text-right text-amber-700">{opportunity.daysInactive}d</td></tr>)}</tbody></table></div> : null}
      </section>

      <section className={`${panel} mb-5`}>
        <h2 className="mb-4 font-semibold text-slate-900">Monthly CRM trend</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="pb-2">Month</th><th className="pb-2">Leads</th><th className="pb-2">New opportunities</th><th className="pb-2">New pipeline</th><th className="pb-2">Won</th><th className="pb-2">Lost</th></tr></thead><tbody>{x.trends.map((trend) => <tr key={trend.month} className="border-b border-slate-100"><td className="py-2 font-medium">{trend.month}</td><td className="py-2">{trend.leadsCreated}</td><td className="py-2">{trend.opportunitiesCreated}</td><td className="py-2"><Money amounts={trend.newPipelineValue} /></td><td className="py-2">{trend.wonCount}</td><td className="py-2">{trend.lostCount}</td></tr>)}</tbody></table></div>
      </section>

      {x.forecast ? (
        <section className={`${panel} mb-5`}>
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
            <TrendingUp className="h-4 w-4" />
            Sales forecast
          </h2>
          <p className="mb-4 text-xs text-amber-700">{x.forecast.note}</p>
          {x.forecast.byMonth.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="pb-2">Expected close month</th>
                    <th className="pb-2">Opportunities</th>
                    <th className="pb-2">Value</th>
                    <th className="pb-2">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {x.forecast.byMonth.map((m) => (
                    <tr key={m.month} className="border-b border-slate-100">
                      <td className="py-2">{m.month}</td>
                      <td className="py-2">{m.count}</td>
                      <td className="py-2">
                        <Money amounts={m.value} />
                      </td>
                      <td className="py-2">
                        <Money amounts={m.weighted} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No opportunities with an expected closing date yet.
            </p>
          )}
        </section>
      ) : null}

      {x.performance ? (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          <section className={panel}>
            <h2 className="mb-4 font-semibold text-slate-900">
              Performance by lead source
            </h2>
            {x.performance.bySource?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="pb-2">Source</th>
                      <th className="pb-2">Leads</th>
                      <th className="pb-2">Qualified</th>
                      <th className="pb-2">Opps</th>
                      <th className="pb-2">Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {x.performance.bySource.map((s) => (
                      <tr key={s.source.id} className="border-b border-slate-100">
                        <td className="py-2">{s.source.name}</td>
                        <td className="py-2">{s.leads}</td>
                        <td className="py-2">{s.qualifiedLeads}</td>
                        <td className="py-2">{s.opportunities}</td>
                        <td className="py-2">{s.winRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No lead source data for this period.
              </p>
            )}
          </section>

          <section className={panel}>
            <h2 className="mb-4 font-semibold text-slate-900">
              Performance by project type
            </h2>
            {x.performance.byType?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Opps</th>
                      <th className="pb-2">Pipeline</th>
                      <th className="pb-2">Won</th>
                      <th className="pb-2">Win rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {x.performance.byType.map((t) => (
                      <tr key={t.type.id} className="border-b border-slate-100">
                        <td className="py-2">{t.type.name}</td>
                        <td className="py-2">{t.opportunities}</td>
                        <td className="py-2">
                          <Money amounts={t.pipelineValue} />
                        </td>
                        <td className="py-2">
                          <Money amounts={t.wonValue} />
                        </td>
                        <td className="py-2">{t.winRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No project type data for this period.
              </p>
            )}
          </section>
        </div>
      ) : null}

      {x.performance?.byUser?.length ? (
        <section className={`${panel} mb-5`}>
          <h2 className="mb-4 font-semibold text-slate-900">
            Performance by user
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="pb-2">User</th>
                  <th className="pb-2">Active</th>
                  <th className="pb-2">Pipeline</th>
                  <th className="pb-2">Weighted</th>
                  <th className="pb-2">Won</th>
                  <th className="pb-2">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {x.performance.byUser.map((u, i) => (
                  <tr
                    key={u.assignee?.id ?? `unassigned-${i}`}
                    className="border-b border-slate-100"
                  >
                    <td className="py-2">
                      {u.assignee
                        ? `${u.assignee.user.firstName} ${u.assignee.user.lastName}`
                        : 'Unassigned'}
                    </td>
                    <td className="py-2">{u.activeOpportunities}</td>
                    <td className="py-2">
                      <Money amounts={u.pipelineValue} />
                    </td>
                    <td className="py-2">
                      <Money amounts={u.weightedPipelineValue} />
                    </td>
                    <td className="py-2">{u.wonOpportunities}</td>
                    <td className="py-2">{u.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <CalendarClock className="h-4 w-4" />
            Closing soon (next 30 days)
          </h2>
          <div className="space-y-2">
            {x.upcomingClosings.upcoming.map((o) => (
              <Link
                key={o.id}
                to={`/companies/${companyId}/crm/opportunities/${o.id}`}
                className="block rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary-700">
                      {o.opportunityNumber} · {o.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {o.crmCompany?.name ?? 'No company'} ·{' '}
                      {o.expectedClosingDate?.slice(0, 10)} · {o.probability}%
                    </p>
                  </div>
                  <span className="shrink-0 text-xs">
                    {o.currency}{' '}
                    {Number(o.estimatedContractValue ?? 0).toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
            {!x.upcomingClosings.upcoming.length ? (
              <p className="text-sm text-slate-500">
                No opportunities expected to close in the next 30 days.
              </p>
            ) : null}
          </div>
          {x.upcomingClosings.overdue.length ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-medium uppercase text-amber-700">
                Past expected close date ({x.upcomingClosings.overdue.length})
              </p>
              <p className="mb-2 text-xs text-slate-500">
                Still open — an overdue date does not mark an opportunity lost.
              </p>
              {x.upcomingClosings.overdue.slice(0, 5).map((o) => (
                <Link
                  key={o.id}
                  to={`/companies/${companyId}/crm/opportunities/${o.id}`}
                  className="block rounded-md border border-amber-200 bg-amber-50 p-2 text-sm hover:bg-amber-100"
                >
                  {o.opportunityNumber} · {o.name}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className={panel}>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Overdue follow-ups
          </h2>
          <div className="space-y-2">
            {x.overdueFollowUps.map((f) => {
              const days = f.dueDate
                ? Math.floor(
                    (Date.now() - new Date(f.dueDate).getTime()) / 86400000,
                  )
                : 0;
              const related =
                f.opportunity?.name ??
                f.lead?.name ??
                f.crmCompany?.name ??
                (f.crmContact
                  ? `${f.crmContact.firstName} ${f.crmContact.lastName ?? ''}`
                  : '—');
              return (
                <Link
                  key={f.id}
                  to={`/companies/${companyId}/crm/activities/${f.id}`}
                  className="block rounded-md border border-red-200 bg-red-50 p-3 text-sm hover:bg-red-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {f.subject}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {related} ·{' '}
                        {f.assignedTo
                          ? `${f.assignedTo.user.firstName} ${f.assignedTo.user.lastName}`
                          : 'Unassigned'}
                      </p>
                    </div>
                    <Badge tone="red">
                      {days > 0 ? `${days}d overdue` : 'Overdue'}
                    </Badge>
                  </div>
                </Link>
              );
            })}
            {!x.overdueFollowUps.length ? (
              <p className="text-sm text-slate-500">
                No overdue follow-ups. Nothing needs chasing right now.
              </p>
            ) : null}
          </div>
        </section>

        <section className={`${panel} lg:col-span-2`}>
          <h2 className="mb-4 font-semibold text-slate-900">
            Recent CRM activity
          </h2>
          <ol className="relative ml-2 border-l border-slate-200 pl-5">
            {x.recent.map((e) => (
              <li key={e.id} className="relative mb-4 last:mb-0">
                <span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-primary-600 ring-4 ring-white" />
                <p className="text-sm font-medium text-slate-900">
                  {e.action.replaceAll('.', ' · ')}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(e.createdAt).toLocaleString()}
                  {e.user ? ` · ${e.user.firstName} ${e.user.lastName}` : ''}
                </p>
              </li>
            ))}
            {!x.recent.length ? (
              <p className="text-sm text-slate-500">
                No CRM activity recorded yet.
              </p>
            ) : null}
          </ol>
        </section>
      </div>
    </div>
  );
}
