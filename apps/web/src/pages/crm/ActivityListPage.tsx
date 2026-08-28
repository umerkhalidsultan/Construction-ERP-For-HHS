import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { userErrorMessage } from '../../lib/api-client';
import {
  getActivityAssignees, getActivityCalendar, getActivityCatalog, getActivityDashboard, getActivityTeamView,
  listActivities, type Activity,
} from '../../services/activities.service';

const tones: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'slate'> = { PLANNED: 'amber', IN_PROGRESS: 'blue', COMPLETED: 'green', CANCELLED: 'slate' };
const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/^./, (x) => x.toUpperCase());
const assignee = (a: Activity) => a.assignedTo ? `${a.assignedTo.user.firstName} ${a.assignedTo.user.lastName}` : 'Unassigned';
const relatedRecord = (a: Activity) => a.lead?.name ?? a.crmCompany?.name ?? (a.crmContact ? `${a.crmContact.firstName} ${a.crmContact.lastName ?? ''}` : undefined) ?? a.opportunity?.name ?? '—';

function monthRange(offsetDays = 0) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1 - offsetDays);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0 + offsetDays);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function ActivityListPage() {
  const { companyId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'list' | 'calendar' | 'team'>('list');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState(() => searchParams.get('type') ?? '');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [relatedType, setRelatedType] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(
    () => searchParams.get('overdueOnly') === 'true',
  );
  const [sortBy, setSortBy] = useState('dueDate');

  const catalog = useQuery({ queryKey: ['activity-catalog', companyId], queryFn: async () => (await getActivityCatalog(companyId)).data, enabled: Boolean(companyId) });
  const assignees = useQuery({ queryKey: ['activity-assignees', companyId], queryFn: async () => (await getActivityAssignees(companyId)).data, enabled: Boolean(companyId) });
  const dashboard = useQuery({ queryKey: ['activity-dashboard', companyId], queryFn: async () => (await getActivityDashboard(companyId)).data, enabled: Boolean(companyId) });
  const activities = useQuery({
    queryKey: ['crm-activities-list', companyId, page, search, type, status, priority, relatedType, assignedToId, overdueOnly, sortBy],
    queryFn: () => listActivities(companyId, { page, limit: 20, search, type, status, priority, relatedType, assignedToId, overdueOnly, sortBy, sortOrder: sortBy === 'subject' ? 'asc' : 'asc' }),
    enabled: Boolean(companyId) && tab === 'list',
  });
  const range = useMemo(() => monthRange(), []);
  const calendar = useQuery({ queryKey: ['activity-calendar', companyId, range.from, range.to], queryFn: async () => (await getActivityCalendar(companyId, range.from, range.to)).data, enabled: Boolean(companyId) && tab === 'calendar' });
  const team = useQuery({ queryKey: ['activity-team', companyId], queryFn: async () => (await getActivityTeamView(companyId)).data, enabled: Boolean(companyId) && tab === 'team' });

  const rows = activities.data?.data ?? [];
  const pagination = activities.data?.pagination;
  const kpis: Array<[string, number]> = [
    ["Today's activities", dashboard.data?.today.total ?? 0], ['Overdue', dashboard.data?.overdue ?? 0],
    ['Completed this week', dashboard.data?.completedThisWeek ?? 0], ['Pending follow-ups', dashboard.data?.pendingFollowUps ?? 0],
  ];
  const calendarByDate = useMemo(() => {
    const groups = new Map<string, Activity[]>();
    for (const a of calendar.data ?? []) {
      const key = (a.startAt ?? a.dueDate ?? '').slice(0, 10);
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [calendar.data]);

  return <div>
    <PageHeader title="CRM · Activities" description="Calls, meetings, site visits, follow-ups, and communication history across leads, companies, contacts and opportunities." actions={<Link to={`/companies/${companyId}/crm/activities/new`}><Button><Plus className="h-4 w-4" />Add activity</Button></Link>} />
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([l, value]) => <div key={l} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{l}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div>)}</div>
    <div className="mb-4 flex gap-2 border-b border-slate-200">{(['list', 'calendar', 'team'] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-primary-600 text-primary-700' : 'text-slate-500 hover:text-slate-800'}`}>{t === 'list' ? 'List' : t === 'calendar' ? 'Calendar' : 'Team'}</button>)}</div>

    {tab === 'list' ? <>
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Input label="Search" placeholder="Subject, lead, company, contact…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} options={[{ value: '', label: 'All types' }, ...(catalog.data?.types ?? []).map((x) => ({ value: x, label: label(x) }))]} />
          <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: '', label: 'All statuses' }, ...(catalog.data?.statuses ?? []).map((x) => ({ value: x, label: label(x) }))]} />
          <Select label="Priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} options={[{ value: '', label: 'All priorities' }, ...(catalog.data?.priorities ?? []).map((x) => ({ value: x, label: x }))]} />
          <Select label="Related to" value={relatedType} onChange={(e) => { setRelatedType(e.target.value); setPage(1); }} options={[{ value: '', label: 'All records' }, ...(catalog.data?.relatedTypes ?? []).map((x) => ({ value: x, label: x.replaceAll('_', ' ') }))]} />
          <Select label="Assigned to" value={assignedToId} onChange={(e) => { setAssignedToId(e.target.value); setPage(1); }} options={[{ value: '', label: 'Everyone' }, ...(assignees.data ?? []).map((x) => ({ value: x.id, label: `${x.user.firstName} ${x.user.lastName}` }))]} />
          <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={[{ value: 'dueDate', label: 'Due date' }, { value: 'createdAt', label: 'Created date' }, { value: 'startAt', label: 'Start time' }, { value: 'priority', label: 'Priority' }, { value: 'status', label: 'Status' }, { value: 'subject', label: 'Subject' }]} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={overdueOnly} onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }} />Show overdue only</label>
      </div>
      <div className="hidden md:block"><DataTable<Activity> rows={rows} isLoading={activities.isLoading} error={activities.isError ? userErrorMessage(activities.error) : null} onRetry={() => void activities.refetch()} emptyMessage="No activities match the current filters." columns={[
        { key: 'activity', header: 'Activity', render: (r) => <Link className="font-medium text-primary-700 hover:underline" to={`/companies/${companyId}/crm/activities/${r.id}`}>{r.subject}</Link> },
        { key: 'type', header: 'Type', render: (r) => label(r.type) },
        { key: 'related', header: 'Related to', render: relatedRecord },
        { key: 'assigned', header: 'Assigned to', render: assignee },
        { key: 'due', header: 'Due date', render: (r) => r.dueDate?.slice(0, 10) ?? '—' },
        { key: 'priority', header: 'Priority', render: (r) => r.priority },
        { key: 'status', header: 'Status', render: (r) => <Badge tone={r.effectiveStatus === 'OVERDUE' ? 'red' : tones[r.status]}>{r.effectiveStatus === 'OVERDUE' ? 'Overdue' : label(r.status)}</Badge> },
      ]} /></div>
      <div className="space-y-3 md:hidden">{activities.isLoading ? <p className="text-sm text-slate-500">Loading activities…</p> : rows.map((r) => <Link key={r.id} to={`/companies/${companyId}/crm/activities/${r.id}`} className="block rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-primary-700">{label(r.type)}</p><p className="truncate font-semibold text-slate-900">{r.subject}</p><p className="truncate text-sm text-slate-500">{relatedRecord(r)}</p></div><Badge tone={r.effectiveStatus === 'OVERDUE' ? 'red' : tones[r.status]}>{r.effectiveStatus === 'OVERDUE' ? 'Overdue' : label(r.status)}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600"><span>{r.dueDate?.slice(0, 10) ?? 'No due date'}</span><span className="text-right">{r.priority}</span><span>{assignee(r)}</span></div></Link>)}{!activities.isLoading && !rows.length ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500"><Search className="mx-auto mb-2 h-5 w-5" />No activities found.</div> : null}</div>
      {pagination && pagination.totalPages > 1 ? <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} activities</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</Button><Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((v) => v + 1)}>Next</Button></div></div> : null}
    </> : null}

    {tab === 'calendar' ? <div className="space-y-3">
      {calendar.isLoading ? <p className="text-sm text-slate-500">Loading calendar…</p> : null}
      {calendarByDate.map(([date, items]) => <div key={date} className="rounded-lg border border-slate-200 bg-white p-4"><p className="mb-2 text-sm font-semibold text-slate-900">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p><div className="space-y-2">{items.map((a) => <Link key={a.id} to={`/companies/${companyId}/crm/activities/${a.id}`} className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-sm hover:bg-slate-50"><span>{label(a.type)} · {a.subject}</span><Badge tone={a.effectiveStatus === 'OVERDUE' ? 'red' : tones[a.status]}>{label(a.status)}</Badge></Link>)}</div></div>)}
      {!calendar.isLoading && !calendarByDate.length ? <p className="text-sm text-slate-500">No activities scheduled this month.</p> : null}
    </div> : null}

    {tab === 'team' ? <div className="rounded-lg border border-slate-200 bg-white p-4">
      {team.isLoading ? <p className="text-sm text-slate-500">Loading team activity…</p> : null}
      {team.isError ? <p className="text-sm text-red-700">{userErrorMessage(team.error)}</p> : null}
      <div className="space-y-3">{(team.data ?? []).map((row) => <div key={row.assignee?.id ?? 'unassigned'} className="rounded-md border border-slate-200 p-3">
        <p className="font-medium text-slate-900">{row.assignee ? `${row.assignee.user.firstName} ${row.assignee.user.lastName}` : 'Unassigned'}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">{row.byStatus.map((s) => <Badge key={s.status} tone={tones[s.status]}>{label(s.status)}: {s.count}</Badge>)}<Badge tone={row.overdue > 0 ? 'red' : 'slate'}>Overdue: {row.overdue}</Badge></div>
      </div>)}{!team.isLoading && !team.data?.length ? <p className="text-sm text-slate-500">No team activity yet.</p> : null}</div>
    </div> : null}
  </div>;
}
