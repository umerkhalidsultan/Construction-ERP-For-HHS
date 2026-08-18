import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ChevronDown,
  ChevronRight, Clock3, Flag, GitBranch, Plus, Save, Search, Target, X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ApiError } from '../../lib/api-client';
import {
  approveBaseline, createActivity, createBaseline, createDependency, createWbs,
  deleteActivity, deleteDependency, deleteWbs, getGantt, getPlanningDashboard,
  listActivities, listBaselines, listWbs, recalculateSchedule, updateActivity,
  updateProgress, updateWbs,
} from '../../services/planning.service';
import { listPhases, listTeam } from '../../services/projects.service';
import type {
  ActivityDependency, GanttData, PlanningActivity, PlanningDashboard,
  ProjectBaseline, ProjectPhase, ProjectTeamMember, ProjectWbs,
} from '../../types/api';

type Tab = 'overview' | 'wbs' | 'gantt' | 'activities' | 'baselines';
type Modal = 'wbs' | 'activity' | 'dependency' | 'progress' | 'baseline' | null;
type Zoom = 'day' | 'week' | 'month' | 'quarter' | 'year';

const dateOnly = (value?: string | null) => value ? value.slice(0, 10) : '';
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const number = (value?: string | number | null) => Number(value ?? 0);
const shiftDate = (value: string, days: number) => {
  const result = new Date(`${dateOnly(value)}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};
const dayDiff = (from: string, to: string) => Math.round((new Date(`${dateOnly(to)}T00:00:00Z`).getTime() - new Date(`${dateOnly(from)}T00:00:00Z`).getTime()) / 86_400_000);

export function ProjectPlanningPage() {
  const { companyId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<PlanningActivity | null>(null);
  const [editingWbs, setEditingWbs] = useState<ProjectWbs | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const key = ['planning', companyId, projectId];
  const dashboard = useQuery({ queryKey: [...key, 'dashboard'], queryFn: async () => (await getPlanningDashboard(companyId, projectId)).data });
  const wbs = useQuery({ queryKey: [...key, 'wbs'], queryFn: async () => (await listWbs(companyId, projectId)).data });
  const phases = useQuery({ queryKey: ['phases', companyId, projectId], queryFn: async () => (await listPhases(companyId, projectId)).data });
  const team = useQuery({ queryKey: ['team', companyId, projectId], queryFn: async () => (await listTeam(companyId, projectId)).data });
  const activities = useQuery({
    queryKey: [...key, 'activities', search, status],
    queryFn: async () => (await listActivities(companyId, projectId, { search, status, limit: 5000 })).data,
  });
  const gantt = useQuery({ queryKey: [...key, 'gantt'], queryFn: async () => (await getGantt(companyId, projectId)).data });
  const baselines = useQuery({ queryKey: [...key, 'baselines'], queryFn: async () => (await listBaselines(companyId, projectId)).data });

  const action = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      setError(''); setNotice('Changes saved to the schedule.'); setModal(null); setSelected(null); setEditingWbs(null);
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (cause) => setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Unable to save the change'),
  });

  const open = (next: Modal, activity?: PlanningActivity) => { setError(''); setNotice(''); setSelected(activity ?? null); setModal(next); };
  const tabs: Array<[Tab, string]> = [['overview', 'Overview'], ['wbs', 'WBS'], ['gantt', 'Gantt'], ['activities', 'Activities'], ['baselines', 'Baselines']];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">Project controls</p>
          <h2 className="text-xl font-semibold text-slate-950">Planning & Scheduling</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => open('dependency')}><GitBranch size={16} /> Dependency</Button>
          <Button variant="secondary" onClick={() => open('wbs')}><Plus size={16} /> WBS</Button>
          <Button onClick={() => open('activity')}><Plus size={16} /> Activity</Button>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2">
        {tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${tab === value ? 'border-primary-700 text-primary-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {tab === 'overview' ? <Overview data={dashboard.data} loading={dashboard.isLoading} onRecalculate={() => action.mutate(() => recalculateSchedule(companyId, projectId))} /> : null}
      {tab === 'wbs' ? <WbsView nodes={wbs.data ?? []} onAdd={(parentId) => { setEditingWbs(parentId ? { parentId } as ProjectWbs : null); open('wbs'); }} onEdit={(node) => { setEditingWbs(node); setModal('wbs'); }} onDelete={(id) => action.mutate(() => deleteWbs(companyId, projectId, id))} /> : null}
      {tab === 'gantt' ? <GanttView data={gantt.data} search={search} onSearch={setSearch} onSave={(id, body) => action.mutate(() => updateActivity(companyId, projectId, id, body))} onEdit={(item) => open('activity', item)} /> : null}
      {tab === 'activities' ? <ActivitiesView items={activities.data ?? []} team={team.data ?? []} search={search} status={status} onSearch={setSearch} onStatus={setStatus} onSave={(item, body) => action.mutate(() => updateActivity(companyId, projectId, item.id, { ...body, expectedUpdatedAt: item.updatedAt }))} onProgress={(item) => open('progress', item)} onDelete={(id) => action.mutate(() => deleteActivity(companyId, projectId, id))} onRemoveDependency={(id) => action.mutate(() => deleteDependency(companyId, projectId, id))} /> : null}
      {tab === 'baselines' ? <BaselinesView items={baselines.data ?? []} onCreate={() => open('baseline')} onApprove={(id) => action.mutate(() => approveBaseline(companyId, projectId, id))} /> : null}

      {modal === 'wbs' ? <WbsModal node={editingWbs} nodes={wbs.data ?? []} phases={phases.data ?? []} busy={action.isPending} onClose={() => setModal(null)} onSubmit={(body) => action.mutate(() => editingWbs?.id ? updateWbs(companyId, projectId, editingWbs.id, body) : createWbs(companyId, projectId, body))} /> : null}
      {modal === 'activity' ? <ActivityModal activity={selected} nodes={wbs.data ?? []} phases={phases.data ?? []} team={team.data ?? []} busy={action.isPending} onClose={() => setModal(null)} onSubmit={(body) => action.mutate(() => selected ? updateActivity(companyId, projectId, selected.id, { ...body, expectedUpdatedAt: selected.updatedAt }) : createActivity(companyId, projectId, body))} /> : null}
      {modal === 'dependency' ? <DependencyModal activities={activities.data ?? []} busy={action.isPending} onClose={() => setModal(null)} onSubmit={(body) => action.mutate(() => createDependency(companyId, projectId, body))} /> : null}
      {modal === 'progress' && selected ? <ProgressModal activity={selected} busy={action.isPending} onClose={() => setModal(null)} onSubmit={(body) => action.mutate(() => updateProgress(companyId, projectId, selected.id, body))} /> : null}
      {modal === 'baseline' ? <BaselineModal busy={action.isPending} onClose={() => setModal(null)} onSubmit={(body) => action.mutate(() => createBaseline(companyId, projectId, body))} /> : null}
    </div>
  );
}

function Overview({ data, loading, onRecalculate }: { data?: PlanningDashboard; loading: boolean; onRecalculate: () => void }) {
  if (loading || !data) return <Panel><p className="text-sm text-slate-500">Calculating schedule controls…</p></Panel>;
  const variance = data.scheduleVariance;
  const cards = [
    ['Planned progress', `${data.plannedProgress.toFixed(1)}%`, CalendarDays, 'text-sky-700 bg-sky-50'],
    ['Actual progress', `${data.actualProgress.toFixed(1)}%`, Target, 'text-emerald-700 bg-emerald-50'],
    ['Progress variance', `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%`, ArrowRight, variance < 0 ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50'],
    ['Critical activities', String(data.criticalActivities), AlertTriangle, 'text-red-700 bg-red-50'],
    ['Delayed activities', String(data.delayedActivities), Clock3, 'text-amber-700 bg-amber-50'],
    ['Completed', String(data.completedActivities), CheckCircle2, 'text-emerald-700 bg-emerald-50'],
  ] as const;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, Icon, tone]) => <div key={label} className="border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div><span className={`rounded-lg p-2 ${tone}`}><Icon size={19} /></span></div></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel title="Schedule forecast" action={<Button variant="secondary" onClick={onRecalculate}>Recalculate schedule</Button>}>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Metric label="Original completion" value={formatDate(data.originalCompletionDate ?? data.project.plannedCompletionDate)} />
          <Metric label="Approved baseline" value={formatDate(data.baselineCompletionDate)} />
          <Metric label="Current forecast" value={formatDate(data.forecastCompletionDate)} />
        </dl>
        <p className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${(data.forecastVarianceDays ?? 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{(data.forecastVarianceDays ?? 0) > 0 ? `${data.forecastVarianceDays} days behind original completion` : 'On or ahead of the original completion date'}</p>
      </Panel>
      <Panel title="Upcoming milestones">{data.upcomingMilestones.length ? <div className="space-y-3">{data.upcomingMilestones.map((item) => <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm"><span className="font-medium text-slate-800">{item.name}</span><span className="text-slate-500">{formatDate(item.targetDate)}</span></div>)}</div> : <Empty text="No upcoming milestones" />}</Panel>
    </div>
  </div>;
}

function WbsView({ nodes, onAdd, onEdit, onDelete }: { nodes: ProjectWbs[]; onAdd: (parent?: string) => void; onEdit: (node: ProjectWbs) => void; onDelete: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const rows = useMemo(() => flattenWbs(nodes, collapsed), [nodes, collapsed]);
  return <Panel title="Work breakdown structure" action={<Button onClick={() => onAdd()}><Plus size={15} /> WBS node</Button>}>
    {rows.length ? <div className="divide-y divide-slate-100">{rows.map(({ node, depth, hasChildren }) => <div key={node.id} className="flex items-center gap-3 py-2.5" style={{ paddingLeft: depth * 24 }}>
      <button className="text-slate-400" onClick={() => setCollapsed((current) => { const next = new Set(current); next.has(node.id) ? next.delete(node.id) : next.add(node.id); return next; })}>{hasChildren ? (collapsed.has(node.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />) : <span className="block w-4" />}</button>
      <span className="w-24 font-mono text-xs font-semibold text-primary-700">{node.code}</span><span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{node.name}</span><span className="text-xs text-slate-500">{node._count?.activities ?? 0} activities</span>
      <Button variant="ghost" className="px-2 py-1" onClick={() => onAdd(node.id)}>Add child</Button><Button variant="ghost" className="px-2 py-1" onClick={() => onEdit(node)}>Edit</Button><Button variant="ghost" className="px-2 py-1 text-red-700" onClick={() => onDelete(node.id)}>Delete</Button>
    </div>)}</div> : <Empty text="Build the project WBS to organize schedule activities." />}
  </Panel>;
}

function ActivitiesView({ items, team, search, status, onSearch, onStatus, onSave, onProgress, onDelete, onRemoveDependency }: { items: PlanningActivity[]; team: ProjectTeamMember[]; search: string; status: string; onSearch: (v: string) => void; onStatus: (v: string) => void; onSave: (item: PlanningActivity, body: Record<string, unknown>) => void; onProgress: (item: PlanningActivity) => void; onDelete: (id: string) => void; onRemoveDependency: (id: string) => void }) {
  const [visible, setVisible] = useState(100);
  return <Panel title="Activity register">
    <div className="mb-4 flex flex-wrap gap-2"><SearchBox value={search} onChange={onSearch} /><select value={status} onChange={(e) => onStatus(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="TODO">Not started</option><option value="IN_PROGRESS">In progress</option><option value="BLOCKED">On hold</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div>
    <div className="overflow-x-auto"><table className="min-w-[1250px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">ID / Activity</th><th className="px-3 py-2">Start</th><th className="px-3 py-2">Duration</th><th className="px-3 py-2">Progress</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Responsible</th><th className="px-3 py-2">Float</th><th className="px-3 py-2">Predecessors</th><th className="px-3 py-2" /></tr></thead><tbody className="divide-y divide-slate-100">{items.slice(0, visible).map((item) => <InlineActivityRow key={`${item.id}-${item.updatedAt}`} item={item} team={team} onSave={onSave} onProgress={onProgress} onDelete={onDelete} onRemoveDependency={onRemoveDependency} />)}</tbody></table></div>
    {visible < items.length ? <div className="mt-4 text-center"><Button variant="secondary" onClick={() => setVisible((v) => v + 100)}>Load 100 more</Button></div> : null}
  </Panel>;
}

function InlineActivityRow({ item, team, onSave, onProgress, onDelete, onRemoveDependency }: { item: PlanningActivity; team: ProjectTeamMember[]; onSave: (item: PlanningActivity, body: Record<string, unknown>) => void; onProgress: (item: PlanningActivity) => void; onDelete: (id: string) => void; onRemoveDependency: (id: string) => void }) {
  const [name, setName] = useState(item.name); const [start, setStart] = useState(dateOnly(item.plannedStartDate)); const [duration, setDuration] = useState(item.durationDays); const [status, setStatus] = useState(item.status); const [assignee, setAssignee] = useState(item.assignee?.id ?? '');
  return <tr className={item.isCritical ? 'bg-red-50/50' : ''}><td className="px-3 py-2"><p className="font-mono text-xs text-primary-700">{item.activityCode}</p><input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-64 border-b border-transparent bg-transparent font-medium text-slate-900 focus:border-primary-500 focus:outline-none" /></td><td className="px-3 py-2"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded border border-slate-200 px-2 py-1" /></td><td className="px-3 py-2"><input type="number" min={item.activityType === 'MILESTONE' ? 0 : 1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-16 rounded border border-slate-200 px-2 py-1" /></td><td className="px-3 py-2"><button onClick={() => onProgress(item)} className="w-20 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-700">{number(item.completionPercentage).toFixed(0)}%</button></td><td className="px-3 py-2"><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-200 px-2 py-1"><option value="TODO">Not started</option><option value="IN_PROGRESS">In progress</option><option value="BLOCKED">On hold</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></td><td className="px-3 py-2"><select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="max-w-44 rounded border border-slate-200 px-2 py-1"><option value="">Unassigned</option>{team.map((member) => <option key={member.membershipId} value={member.membershipId}>{memberName(member)}</option>)}</select></td><td className="px-3 py-2"><span className={item.isCritical ? 'font-semibold text-red-700' : 'text-slate-600'}>{item.totalFloatDays ?? '—'}d</span></td><td className="px-3 py-2"><div className="flex max-w-48 flex-wrap gap-1">{item.predecessors?.map((edge) => <button title="Remove dependency" onClick={() => onRemoveDependency(edge.id)} key={edge.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{edge.predecessor.activityCode ?? edge.predecessor.name} {edge.type}{edge.lagDays ? `${edge.lagDays > 0 ? '+' : ''}${edge.lagDays}` : ''} ×</button>)}</div></td><td className="px-3 py-2"><div className="flex"><Button title="Save inline changes" variant="ghost" className="px-2" onClick={() => onSave(item, { name, plannedStartDate: start, durationDays: duration, status, assigneeMembershipId: assignee || null })}><Save size={15} /></Button><Button title="Delete activity" variant="ghost" className="px-2 text-red-700" onClick={() => onDelete(item.id)}><X size={15} /></Button></div></td></tr>;
}

function GanttView({ data, search, onSearch, onSave, onEdit }: { data?: GanttData; search: string; onSearch: (v: string) => void; onSave: (id: string, body: Record<string, unknown>) => void; onEdit: (item: PlanningActivity) => void }) {
  const [zoom, setZoom] = useState<Zoom>('week'); const [visible, setVisible] = useState(250);
  const scale = { day: 34, week: 12, month: 4, quarter: 1.8, year: 0.8 }[zoom];
  const rows = useMemo(() => (data?.activities ?? []).filter((item) => !search || `${item.activityCode} ${item.name} ${item.wbs?.code ?? ''}`.toLowerCase().includes(search.toLowerCase())).slice(0, visible), [data, search, visible]);
  if (!data) return <Panel><p className="text-sm text-slate-500">Loading schedule…</p></Panel>;
  const dated = rows.filter((item) => item.plannedStartDate && item.plannedEndDate);
  const rangeStart = [data.project.projectStartDate, ...dated.map((item) => item.plannedStartDate!)].sort()[0];
  const rangeEnd = [data.project.plannedCompletionDate, ...dated.map((item) => item.plannedEndDate!)].sort().at(-1)!;
  const width = Math.max(900, (dayDiff(rangeStart, rangeEnd) + 30) * scale);
  const todayLeft = dayDiff(rangeStart, new Date().toISOString()) * scale;
  const activityCode = new Map(data.activities.map((item) => [item.id, item.activityCode ?? item.name]));
  const predecessors = (id: string) => data.dependencies.filter((edge) => edge.successorId === id).map((edge) => `${activityCode.get(edge.predecessorId)} ${edge.type}${edge.lagDays ? `${edge.lagDays > 0 ? '+' : ''}${edge.lagDays}` : ''}`).join(', ');
  const successors = (id: string) => data.dependencies.filter((edge) => edge.predecessorId === id).map((edge) => `${activityCode.get(edge.successorId)} ${edge.type}${edge.lagDays ? `${edge.lagDays > 0 ? '+' : ''}${edge.lagDays}` : ''}`).join(', ');
  return <Panel title="Interactive Gantt schedule">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><SearchBox value={search} onChange={onSearch} /><div className="flex rounded-md border border-slate-200 bg-slate-50 p-1">{(['day', 'week', 'month', 'quarter', 'year'] as Zoom[]).map((item) => <button key={item} onClick={() => setZoom(item)} className={`rounded px-2.5 py-1 text-xs font-medium capitalize ${zoom === item ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-500'}`}>{item}</button>)}</div></div>
    <div className="max-h-[650px] overflow-auto border border-slate-200"><div className="grid min-w-max" style={{ gridTemplateColumns: `1015px ${width}px` }}><div className="sticky left-0 top-0 z-30 grid grid-cols-[60px_70px_180px_70px_70px_40px_50px_75px_80px_80px_70px_70px] border-b border-r border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-semibold uppercase text-slate-600"><span>WBS</span><span>ID</span><span>Activity</span><span>Start</span><span>Finish</span><span>Dur.</span><span>Prog.</span><span>Status</span><span>Pred.</span><span>Succ.</span><span>BL Start</span><span>BL Finish</span></div><TimelineHeader start={rangeStart} width={width} scale={scale} zoom={zoom} />
      <div className="sticky left-0 z-20 border-r border-slate-200 bg-white">{rows.map((item) => <button key={item.id} onDoubleClick={() => onEdit(item)} className={`grid h-11 w-full grid-cols-[60px_70px_180px_70px_70px_40px_50px_75px_80px_80px_70px_70px] items-center border-b border-slate-100 px-2 text-left text-[10px] hover:bg-slate-50 ${item.isCritical ? 'bg-red-50/60' : ''}`}><span className="truncate font-mono text-slate-500">{item.wbs?.code ?? '—'}</span><span className="truncate font-mono font-semibold text-primary-700">{item.activityCode}</span><span className="truncate pr-2 text-xs font-medium text-slate-800" title={item.name}>{item.name}</span><span className="text-slate-500">{dateOnly(item.plannedStartDate).slice(5)}</span><span className="text-slate-500">{dateOnly(item.plannedEndDate).slice(5)}</span><span>{item.durationDays}d</span><span>{number(item.completionPercentage).toFixed(0)}%</span><span className="truncate">{item.status.replace('_', ' ')}</span><span className="truncate" title={predecessors(item.id)}>{predecessors(item.id) || '—'}</span><span className="truncate" title={successors(item.id)}>{successors(item.id) || '—'}</span><span>{dateOnly(item.baseline?.plannedStart).slice(5) || '—'}</span><span>{dateOnly(item.baseline?.plannedFinish).slice(5) || '—'}</span></button>)}</div>
      <div className="relative" style={{ width, height: rows.length * 44 }}><div className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-rose-500" style={{ left: todayLeft }}><span className="absolute -left-5 top-1 bg-rose-500 px-1 text-[9px] font-semibold text-white">TODAY</span></div><DependencyLines rows={rows} dependencies={data.dependencies} rangeStart={rangeStart} scale={scale} width={width} />{rows.map((item, index) => <GanttBar key={item.id} item={item} row={index} rangeStart={rangeStart} scale={scale} onSave={onSave} />)}</div></div></div>
    {(data.activities.length > visible) ? <div className="mt-3 text-center"><Button variant="secondary" onClick={() => setVisible((v) => v + 250)}>Render next 250 activities</Button></div> : null}
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><Legend color="bg-primary-600" text="Current" /><Legend color="bg-red-600" text="Critical" /><Legend color="bg-amber-500" text="Delayed" /><Legend color="bg-slate-300" text="Approved baseline" /></div>
  </Panel>;
}

function GanttBar({ item, row, rangeStart, scale, onSave }: { item: PlanningActivity; row: number; rangeStart: string; scale: number; onSave: (id: string, body: Record<string, unknown>) => void }) {
  if (!item.plannedStartDate || !item.plannedEndDate) return null;
  const left = dayDiff(rangeStart, item.plannedStartDate) * scale; const days = Math.max(1, dayDiff(item.plannedStartDate, item.plannedEndDate) + 1); const width = Math.max(10, days * scale); const delayed = item.status !== 'COMPLETED' && new Date(item.plannedEndDate) < new Date();
  const drag = (event: ReactPointerEvent<HTMLDivElement>, resize: boolean) => { event.preventDefault(); event.stopPropagation(); const target = event.currentTarget; target.setPointerCapture(event.pointerId); const startX = event.clientX; const originalDuration = item.durationDays; const finish = (up: ReactPointerEvent<HTMLDivElement>) => { const delta = Math.round((up.clientX - startX) / scale); if (!delta) return; resize ? onSave(item.id, { durationDays: Math.max(item.activityType === 'MILESTONE' ? 0 : 1, originalDuration + delta), expectedUpdatedAt: item.updatedAt }) : onSave(item.id, { plannedStartDate: shiftDate(item.plannedStartDate!, delta), isManuallyScheduled: true, expectedUpdatedAt: item.updatedAt }); }; target.onpointerup = finish as unknown as ((event: PointerEvent) => void); };
  const tone = item.isCritical ? 'bg-red-600' : delayed ? 'bg-amber-500' : 'bg-primary-600';
  return <><div className="absolute h-2 rounded-sm bg-slate-300" style={{ top: row * 44 + 31, left: item.baseline?.plannedStart ? dayDiff(rangeStart, item.baseline.plannedStart) * scale : left, width: item.baseline?.plannedStart && item.baseline.plannedFinish ? Math.max(8, (dayDiff(item.baseline.plannedStart, item.baseline.plannedFinish) + 1) * scale) : 0 }} />{item.activityType === 'MILESTONE' ? <div title={`${item.name} · ${formatDate(item.plannedStartDate)}`} className={`absolute z-20 h-4 w-4 rotate-45 ${tone}`} style={{ top: row * 44 + 14, left }} /> : <div title={`${item.name}\n${formatDate(item.plannedStartDate)} → ${formatDate(item.plannedEndDate)}\nFloat: ${item.totalFloatDays ?? '—'} days`} onPointerDown={(e) => drag(e, false)} className={`absolute z-20 h-5 cursor-grab overflow-hidden rounded-sm shadow-sm ${tone}`} style={{ top: row * 44 + 11, left, width }}><span className="block h-full bg-slate-950/25" style={{ width: `${Math.min(100, number(item.completionPercentage))}%` }} /><div onPointerDown={(e) => drag(e, true)} className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-white/30" /></div>}</>;
}

function DependencyLines({ rows, dependencies, rangeStart, scale, width }: { rows: PlanningActivity[]; dependencies: ActivityDependency[]; rangeStart: string; scale: number; width: number }) {
  const byId = new Map(rows.map((item, index) => [item.id, { item, index }]));
  return <svg className="pointer-events-none absolute inset-0 z-[15]" width={width} height={rows.length * 44}><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#64748b" /></marker></defs>{dependencies.map((edge) => { const pred = byId.get(edge.predecessorId); const succ = byId.get(edge.successorId); if (!pred || !succ || !pred.item.plannedEndDate || !succ.item.plannedStartDate) return null; const x1 = (dayDiff(rangeStart, pred.item.plannedEndDate) + 1) * scale; const x2 = dayDiff(rangeStart, succ.item.plannedStartDate) * scale; const y1 = pred.index * 44 + 21; const y2 = succ.index * 44 + 21; const mid = Math.max(x1 + 8, (x1 + x2) / 2); return <path key={edge.id} d={`M${x1},${y1} H${mid} V${y2} H${x2}`} fill="none" stroke="#64748b" strokeWidth="1" markerEnd="url(#arrow)" />; })}</svg>;
}

function TimelineHeader({ start, width, scale, zoom }: { start: string; width: number; scale: number; zoom: Zoom }) { const step = zoom === 'day' ? 1 : zoom === 'week' ? 7 : zoom === 'month' ? 30 : zoom === 'quarter' ? 91 : 365; const count = Math.ceil(width / (step * scale)); return <div className="sticky top-0 z-20 h-9 border-b border-slate-200 bg-slate-100" style={{ width }}>{Array.from({ length: count }).map((_, index) => { const value = shiftDate(start, index * step); return <span key={value} className="absolute top-0 h-9 border-l border-slate-200 px-1 pt-2 text-[10px] font-medium text-slate-500" style={{ left: index * step * scale, width: step * scale }}>{formatDate(value)}</span>; })}</div>; }

function BaselinesView({ items, onCreate, onApprove }: { items: ProjectBaseline[]; onCreate: () => void; onApprove: (id: string) => void }) { return <Panel title="Schedule baselines" action={<Button onClick={onCreate}><Flag size={15} /> Capture baseline</Button>}>{items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-slate-900">Revision {String(item.revision).padStart(2, '0')} · {item.name}</p><p className="text-xs text-slate-500">{item._count?.activities ?? 0} activity snapshots · {item.approvedAt ? `Approved ${formatDate(item.approvedAt)}` : 'Awaiting approval'}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'SUPERSEDED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span>{item.status === 'DRAFT' ? <Button variant="secondary" onClick={() => onApprove(item.id)}>Approve</Button> : null}</div></div>)}</div> : <Empty text="Capture a baseline to compare the approved plan against the live forecast." />}</Panel>; }

function WbsModal({ node, nodes, phases, busy, onClose, onSubmit }: { node: ProjectWbs | null; nodes: ProjectWbs[]; phases: ProjectPhase[]; busy: boolean; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSubmit({ code: data.get('code'), name: data.get('name'), description: data.get('description') || undefined, parentId: data.get('parentId') || undefined, phaseId: data.get('phaseId') || undefined, sortOrder: Number(data.get('sortOrder') || 0) }); }; return <ModalShell title={node?.id ? 'Edit WBS node' : 'Create WBS node'} onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Input name="code" label="WBS code" required defaultValue={node?.code ?? ''} /><Input name="name" label="WBS name" required defaultValue={node?.name ?? ''} /></div><Input name="description" label="Description" defaultValue={node?.description ?? ''} /><div className="grid gap-4 sm:grid-cols-3"><FieldSelect name="parentId" label="Parent WBS" defaultValue={node?.parentId ?? ''} options={[['', 'Top level'], ...nodes.filter((item) => item.id !== node?.id).map((item) => [item.id, `${item.code} · ${item.name}`])]} /><FieldSelect name="phaseId" label="Project phase" defaultValue={node?.phaseId ?? ''} options={[['', 'No phase'], ...phases.map((item) => [item.id, `${item.code} · ${item.name}`])]} /><Input name="sortOrder" type="number" min={0} label="Sort order" defaultValue={node?.sortOrder ?? 0} /></div><ModalActions busy={busy} onClose={onClose} /></form></ModalShell>; }

function ActivityModal({ activity, nodes, phases, team, busy, onClose, onSubmit }: { activity: PlanningActivity | null; nodes: ProjectWbs[]; phases: ProjectPhase[]; team: ProjectTeamMember[]; busy: boolean; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const type = String(data.get('activityType')); onSubmit({ activityCode: data.get('activityCode'), name: data.get('name'), description: data.get('description') || undefined, phaseId: data.get('phaseId'), wbsId: data.get('wbsId') || undefined, activityType: type, plannedStartDate: data.get('plannedStartDate'), durationDays: type === 'MILESTONE' ? 0 : Number(data.get('durationDays')), plannedQuantity: data.get('plannedQuantity') ? Number(data.get('plannedQuantity')) : undefined, unit: data.get('unit') || undefined, assigneeMembershipId: data.get('assigneeMembershipId') || undefined, priority: data.get('priority'), isManuallyScheduled: data.get('isManuallyScheduled') === 'on' }); }; return <ModalShell title={activity ? 'Edit activity' : 'Create schedule activity'} onClose={onClose} wide><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Input name="activityCode" label="Activity ID" required defaultValue={activity?.activityCode ?? ''} /><Input name="name" label="Activity name" required defaultValue={activity?.name ?? ''} /></div><Input name="description" label="Description" defaultValue={activity?.description ?? ''} /><div className="grid gap-4 sm:grid-cols-3"><FieldSelect required name="phaseId" label="Phase" defaultValue={activity?.phaseId ?? ''} options={[['', 'Select phase'], ...phases.map((item) => [item.id, `${item.code} · ${item.name}`])]} /><FieldSelect name="wbsId" label="WBS" defaultValue={activity?.wbsId ?? ''} options={[['', 'Unassigned'], ...nodes.map((item) => [item.id, `${item.code} · ${item.name}`])]} /><FieldSelect name="activityType" label="Type" defaultValue={activity?.activityType ?? 'TASK'} options={[[ 'TASK', 'Task' ], ['SUMMARY', 'Summary task'], ['MILESTONE', 'Milestone'], ['LEVEL_OF_EFFORT', 'Level of effort']]} /></div><div className="grid gap-4 sm:grid-cols-3"><Input name="plannedStartDate" type="date" label="Planned start" required defaultValue={dateOnly(activity?.plannedStartDate) || new Date().toISOString().slice(0, 10)} /><Input name="durationDays" type="number" min={0} label="Duration (working days)" required defaultValue={activity?.durationDays ?? 1} /><FieldSelect name="priority" label="Priority" defaultValue={activity?.priority ?? 'MEDIUM'} options={[[ 'LOW', 'Low' ], ['MEDIUM', 'Medium'], ['HIGH', 'High'], ['CRITICAL', 'Critical']]} /></div><div className="grid gap-4 sm:grid-cols-3"><Input name="plannedQuantity" type="number" min={0} step="0.0001" label="Planned quantity" defaultValue={activity?.plannedQuantity ?? ''} /><Input name="unit" label="Unit" defaultValue={activity?.unit ?? ''} /><FieldSelect name="assigneeMembershipId" label="Responsible person" defaultValue={activity?.assignee?.id ?? ''} options={[['', 'Unassigned'], ...team.map((item) => [item.membershipId, memberName(item)])]} /></div><label className="flex items-center gap-2 text-sm text-slate-700"><input name="isManuallyScheduled" type="checkbox" defaultChecked={activity?.isManuallyScheduled} /> Lock activity start date</label><ModalActions busy={busy} onClose={onClose} /></form></ModalShell>; }

function DependencyModal({ activities, busy, onClose, onSubmit }: { activities: PlanningActivity[]; busy: boolean; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSubmit({ predecessorId: data.get('predecessorId'), successorId: data.get('successorId'), type: data.get('type'), lagDays: Number(data.get('lagDays') || 0) }); }; const options = activities.map((item) => [item.id, `${item.activityCode} · ${item.name}`]); return <ModalShell title="Create dependency" onClose={onClose}><form onSubmit={submit} className="space-y-4"><FieldSelect required name="predecessorId" label="Predecessor" options={[['', 'Select predecessor'], ...options]} /><div className="grid gap-4 sm:grid-cols-2"><FieldSelect name="type" label="Relationship" defaultValue="FS" options={[[ 'FS', 'Finish to Start (FS)' ], ['SS', 'Start to Start (SS)'], ['FF', 'Finish to Finish (FF)'], ['SF', 'Start to Finish (SF)']]} /><Input name="lagDays" type="number" label="Lag / lead (days)" defaultValue={0} /></div><FieldSelect required name="successorId" label="Successor" options={[['', 'Select successor'], ...options]} /><p className="text-xs text-slate-500">Use a negative lag for lead. The complete project graph is validated before this relationship is committed.</p><ModalActions busy={busy} onClose={onClose} /></form></ModalShell>; }

function ProgressModal({ activity, busy, onClose, onSubmit }: { activity: PlanningActivity; busy: boolean; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const actual = data.get('actualQuantity'); const planned = number(activity.plannedQuantity); const percent = actual && planned ? Number(actual) / planned * 100 : Number(data.get('percentComplete')); onSubmit({ progressDate: data.get('progressDate'), percentComplete: Math.min(100, percent), actualQuantity: actual ? Number(actual) : undefined, remainingQuantity: actual && planned ? Math.max(0, planned - Number(actual)) : undefined, notes: data.get('notes') || undefined }); }; return <ModalShell title={`Update progress · ${activity.activityCode}`} onClose={onClose}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Input name="progressDate" type="date" label="Progress date" required defaultValue={new Date().toISOString().slice(0, 10)} /><Input name="percentComplete" type="number" min={0} max={100} step="0.01" label="Percent complete" required defaultValue={number(activity.completionPercentage)} /></div>{activity.plannedQuantity ? <div className="grid gap-4 sm:grid-cols-2"><Input name="actualQuantity" type="number" min={0} max={number(activity.plannedQuantity)} step="0.0001" label={`Completed quantity (${activity.unit ?? 'units'})`} defaultValue={activity.actualQuantity ?? ''} /><div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Planned quantity<br /><strong className="text-slate-900">{number(activity.plannedQuantity).toLocaleString()} {activity.unit}</strong></div></div> : null}<Input name="notes" label="Progress notes" /><ModalActions busy={busy} onClose={onClose} /></form></ModalShell>; }

function BaselineModal({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSubmit({ name: data.get('name'), description: data.get('description') || undefined }); }; return <ModalShell title="Capture schedule baseline" onClose={onClose}><form onSubmit={submit} className="space-y-4"><Alert tone="info">A baseline is an immutable snapshot. Approving it will supersede the currently approved baseline without changing its history.</Alert><Input name="name" label="Baseline name" required placeholder="Contract baseline" /><Input name="description" label="Description" /><ModalActions busy={busy} onClose={onClose} /></form></ModalShell>; }

function ModalShell({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className={`max-h-[92vh] w-full overflow-y-auto rounded-lg bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-xl'}`}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><h3 className="text-lg font-semibold text-slate-950">{title}</h3><button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><div className="p-5">{children}</div></div></div>; }
function ModalActions({ busy, onClose }: { busy: boolean; onClose: () => void }) { return <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></div>; }
function FieldSelect({ label, options, ...props }: { label: string; options: string[][] } & SelectHTMLAttributes<HTMLSelectElement>) { return <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">{label}</span><select {...props} className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className="relative block min-w-64"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search ID, activity, WBS, person…" className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>; }
function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) { return <section className="border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between gap-3">{title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : <span />}{action}</div>{children}</section>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd></div>; }
function Empty({ text }: { text: string }) { return <div className="py-10 text-center text-sm text-slate-500">{text}</div>; }
function Legend({ color, text }: { color: string; text: string }) { return <span className="flex items-center gap-1.5"><i className={`h-2.5 w-5 rounded-sm ${color}`} />{text}</span>; }
function memberName(member: ProjectTeamMember) { const user = member.membership?.user; return user ? `${user.firstName} ${user.lastName}` : member.membershipId; }
function flattenWbs(nodes: ProjectWbs[], collapsed: Set<string>) { const children = new Map<string | null, ProjectWbs[]>(); nodes.forEach((node) => children.set(node.parentId ?? null, [...(children.get(node.parentId ?? null) ?? []), node])); const result: Array<{ node: ProjectWbs; depth: number; hasChildren: boolean }> = []; const visit = (parent: string | null, depth: number) => (children.get(parent) ?? []).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)).forEach((node) => { const hasChildren = (children.get(node.id) ?? []).length > 0; result.push({ node, depth, hasChildren }); if (!collapsed.has(node.id)) visit(node.id, depth + 1); }); visit(null, 0); return result; }
