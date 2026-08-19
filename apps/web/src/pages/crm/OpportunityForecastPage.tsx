import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { userErrorMessage } from '../../lib/api-client';
import { getOpportunityForecast } from '../../services/opportunities.service';

const panel = 'rounded-lg border border-slate-200 bg-white p-5';
const money = (value?: string) => value ? Number(value).toLocaleString() : '0';
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

type Row = { id: string; label: string; count: number; value: string; weighted: string };
function GroupTable({ title, rows }: { title: string; rows: Row[] }) {
  return <section className={panel}>
    <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>
    <DataTable<Row> rows={rows} columns={[
      { key: 'label', header: 'Group', render: (r) => <span className="font-medium">{r.label}</span> },
      { key: 'count', header: 'Count', render: (r) => r.count },
      { key: 'value', header: 'Value', render: (r) => money(r.value) },
      { key: 'weighted', header: 'Weighted', render: (r) => money(r.weighted) },
    ]} emptyMessage={`No ${title.toLowerCase()} data for this period.`} />
  </section>;
}

export function OpportunityForecastPage() {
  const { companyId = '' } = useParams();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const forecast = useQuery({ queryKey: ['opportunity-forecast', companyId, month], queryFn: async () => (await getOpportunityForecast(companyId, month)).data, enabled: Boolean(companyId && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) });
  const x = forecast.data;
  const kpis: Array<[string, number | string]> = [
    [`Pipeline (${x ? monthLabel(x.month) : month})`, x ? `${x.pipeline.count} · ${money(x.pipeline.value)}` : '0'],
    ['Weighted pipeline', x ? money(x.pipeline.weighted) : '0'],
    [`Closing ${x ? monthLabel(x.month) : 'this month'}`, x ? `${x.expectedClosingThisMonth.count} · ${money(x.expectedClosingThisMonth.value)}` : '0'],
    [`Closing ${x ? monthLabel(x.nextMonth) : 'next month'}`, x ? `${x.expectedClosingNextMonth.count} · ${money(x.expectedClosingNextMonth.value)}` : '0'],
    [`Won ${x ? monthLabel(x.month) : 'this month'}`, x ? `${x.wonThisMonth.count} · ${money(x.wonThisMonth.value)}` : '0'],
    [`Lost ${x ? monthLabel(x.month) : 'this month'}`, x ? `${x.lostThisMonth.count} · ${money(x.lostThisMonth.value)}` : '0'],
    ['Conversion rate', `${x?.conversionRate ?? 0}%`],
    ['Avg. sales cycle', `${x?.avgSalesCycleDays ?? 0} days`],
  ];
  const stageRows: Row[] = (x?.byStage ?? []).map((s) => ({ id: s.stage?.id ?? 'unknown', label: s.stage ? `${s.stage.name} (${s.stage.probability}%)` : 'Unknown stage', count: s.count, value: s.value, weighted: s.weighted }));
  const assigneeRows: Row[] = (x?.byAssignee ?? []).map((a, i) => ({ id: a.assignee?.id ?? `unassigned-${i}`, label: a.assignee ? `${a.assignee.user.firstName} ${a.assignee.user.lastName}` : 'Unassigned', count: a.count, value: a.value, weighted: a.weighted }));
  const monthRows: Row[] = (x?.byMonth ?? []).map((m) => ({ id: m.month, label: monthLabel(m.month), count: m.count, value: m.value, weighted: m.weighted }));
  const typeRows: Row[] = (x?.byType ?? []).map((t, i) => ({ id: t.type?.id ?? `type-${i}`, label: t.type?.name ?? 'Unknown type', count: t.count, value: t.value, weighted: t.weighted }));
  return <div>
    <Link to={`/companies/${companyId}/crm/opportunities`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to opportunities</Link>
    <PageHeader title="Sales forecast" description="Weighted pipeline projections and expected closes by month." actions={<><Input aria-label="Forecast month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" /><Button variant="secondary" onClick={() => setMonth(new Date().toISOString().slice(0, 7))}><BarChart3 className="h-4 w-4" />Current month</Button></>} />
    {forecast.isError ? <div className="mb-4"><Alert>{userErrorMessage(forecast.error)}</Alert></div> : null}
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div>)}</div>
    {forecast.isLoading ? <p className="text-sm text-slate-500">Loading forecast…</p> : x ? <div className="grid gap-5 xl:grid-cols-2">
      <GroupTable title="By stage" rows={stageRows} />
      <GroupTable title="By assignee" rows={assigneeRows} />
      <GroupTable title="By month" rows={monthRows} />
      <GroupTable title="By opportunity type" rows={typeRows} />
    </div> : null}
    {!forecast.isLoading && x && !stageRows.length && !assigneeRows.length && !monthRows.length && !typeRows.length ? <div className="rounded-lg border border-slate-200 bg-white p-6 text-center"><Badge tone="slate">No open pipeline data</Badge><p className="mt-2 text-sm text-slate-500">There are no open opportunities to forecast for this period.</p></div> : null}
  </div>;
}
