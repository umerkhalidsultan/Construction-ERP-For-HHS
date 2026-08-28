import { useQuery } from '@tanstack/react-query';
import { Download, KanbanSquare, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { userErrorMessage } from '../../lib/api-client';
import { exportOpportunities, getOpportunityAssignees, getOpportunityCatalog, getOpportunityDashboard, listOpportunities, type Opportunity } from '../../services/opportunities.service';

const labels: Record<string, string> = { OPEN: 'Open', WON: 'Won', LOST: 'Lost' };
const tones: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'slate'> = { OPEN: 'blue', WON: 'green', LOST: 'red' };
const money = (opp: Opportunity) => opp.estimatedContractValue ? `${opp.currency} ${Number(opp.estimatedContractValue).toLocaleString()}` : '—';
const assignee = (opp: Opportunity) => opp.assignedTo ? `${opp.assignedTo.user.firstName} ${opp.assignedTo.user.lastName}` : 'Unassigned';
const overdue = (opp: Opportunity) => opp.status === 'OPEN' && opp.expectedClosingDate && new Date(opp.expectedClosingDate) < new Date();

export function OpportunityListPage() {
  const { companyId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [stageId, setStageId] = useState(() => searchParams.get('stageId') ?? '');
  const [opportunityTypeId, setOpportunityTypeId] = useState(
    () => searchParams.get('opportunityTypeId') ?? '',
  );
  const [sourceId, setSourceId] = useState(() => searchParams.get('sourceId') ?? '');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const catalog = useQuery({ queryKey: ['opportunity-catalog', companyId], queryFn: async () => (await getOpportunityCatalog(companyId)).data, enabled: Boolean(companyId) });
  const dashboard = useQuery({ queryKey: ['opportunity-dashboard', companyId], queryFn: async () => (await getOpportunityDashboard(companyId)).data, enabled: Boolean(companyId) });
  const assignees = useQuery({ queryKey: ['opportunity-assignees', companyId], queryFn: async () => (await getOpportunityAssignees(companyId)).data, enabled: Boolean(companyId) });
  const opportunities = useQuery({
    queryKey: ['opportunities', companyId, page, search, status, stageId, opportunityTypeId, sourceId, assignedToId, priority, sortBy],
    queryFn: () => listOpportunities(companyId, { page, limit: 20, search, status, stageId, opportunityTypeId, sourceId, assignedToId, priority, sortBy, sortOrder: 'desc' }),
    enabled: Boolean(companyId),
  });
  const rows = opportunities.data?.data ?? [];
  const pagination = opportunities.data?.pagination;
  const kpis: Array<[string, number | string]> = [
    ['Open', dashboard.data?.byStatus.OPEN ?? 0],
    ['Won', dashboard.data?.byStatus.WON ?? 0],
    ['Lost', dashboard.data?.byStatus.LOST ?? 0],
    ['Pipeline value', dashboard.data ? Number(dashboard.data.pipelineValue).toLocaleString() : '0'],
    ['Weighted pipeline', dashboard.data ? Number(dashboard.data.weightedPipeline).toLocaleString() : '0'],
    ['Overdue closes', dashboard.data?.overdueCount ?? 0],
    ['Conversion rate', `${dashboard.data?.conversionRate ?? 0}%`],
    ['Avg. sales cycle', `${dashboard.data?.avgSalesCycleDays ?? 0}d`],
  ];
  const exportCsv = async () => {
    const response = await exportOpportunities(companyId, { search, status, stageId, opportunityTypeId, sourceId, assignedToId, priority, sortBy, sortOrder: 'desc', limit: 100 });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'opportunities.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return <div>
    <PageHeader title="CRM · Opportunities" description="Qualified construction work tracked through the sales pipeline." actions={<><Link to={`/companies/${companyId}/crm/opportunities/pipeline`}><Button variant="secondary"><KanbanSquare className="h-4 w-4" />Pipeline</Button></Link><Button variant="secondary" onClick={() => void exportCsv()}><Download className="h-4 w-4" />Export</Button><Link to={`/companies/${companyId}/crm/opportunities/new`}><Button><Plus className="h-4 w-4" />Add opportunity</Button></Link></>} />
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div>)}</div>
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Input label="Search" placeholder="Number, opportunity, company…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: '', label: 'All statuses' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} />
        <Select label="Stage" value={stageId} onChange={(e) => { setStageId(e.target.value); setPage(1); }} options={[{ value: '', label: 'All stages' }, ...(catalog.data?.stages ?? []).map((x) => ({ value: x.id, label: `${x.name} (${x.probability}%)` }))]} />
        <Select label="Opportunity type" value={opportunityTypeId} onChange={(e) => { setOpportunityTypeId(e.target.value); setPage(1); }} options={[{ value: '', label: 'All types' }, ...(catalog.data?.types ?? []).map((x) => ({ value: x.id, label: x.name }))]} />
        <Select label="Source" value={sourceId} onChange={(e) => { setSourceId(e.target.value); setPage(1); }} options={[{ value: '', label: 'All sources' }, ...(catalog.data?.sources ?? []).map((x) => ({ value: x.id, label: x.name }))]} />
        <Select label="Assigned to" value={assignedToId} onChange={(e) => { setAssignedToId(e.target.value); setPage(1); }} options={[{ value: '', label: 'Anyone' }, ...(assignees.data ?? []).map((x) => ({ value: x.id, label: `${x.user.firstName} ${x.user.lastName}` }))]} />
        <Select label="Priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} options={[{ value: '', label: 'All priorities' }, ...['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((x) => ({ value: x, label: x }))]} />
        <Select label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={[{ value: 'createdAt', label: 'Created date' }, { value: 'expectedClosingDate', label: 'Expected close' }, { value: 'estimatedContractValue', label: 'Estimated value' }, { value: 'probability', label: 'Probability' }, { value: 'name', label: 'Opportunity name' }, { value: 'priority', label: 'Priority' }, { value: 'status', label: 'Status' }]} />
      </div>
    </div>
    <div className="hidden md:block"><DataTable<Opportunity> rows={rows} isLoading={opportunities.isLoading} error={opportunities.isError ? userErrorMessage(opportunities.error) : null} onRetry={() => void opportunities.refetch()} emptyMessage="No opportunities match the current filters." columns={[
      { key: 'number', header: 'Opportunity #', render: (r) => <Link className="font-medium text-primary-700 hover:underline" to={`/companies/${companyId}/crm/opportunities/${r.id}`}>{r.opportunityNumber}</Link> },
      { key: 'opportunity', header: 'Opportunity', render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.crmCompany?.name || r.crmContact ? `${r.crmContact?.firstName ?? ''} ${r.crmContact?.lastName ?? ''}`.trim() : 'No company/contact'}</p></div> },
      { key: 'stage', header: 'Stage', render: (r) => <div><p>{r.stage.name}</p><p className="text-xs text-slate-500">{r.probability}%</p></div> },
      { key: 'value', header: 'Value / Weighted', render: (r) => <div><p>{money(r)}</p><p className="text-xs text-slate-500">{r.weightedValue ? `${r.currency} ${Number(r.weightedValue).toLocaleString()}` : '—'}</p></div> },
      { key: 'status', header: 'Status', render: (r) => <div className="flex flex-col items-start gap-1"><Badge tone={tones[r.status]}>{labels[r.status]}</Badge>{overdue(r) ? <Badge tone="red">Overdue</Badge> : null}</div> },
      { key: 'assigned', header: 'Assigned to', render: assignee },
      { key: 'close', header: 'Expected close', render: (r) => r.expectedClosingDate?.slice(0, 10) ?? '—' },
    ]} /></div>
    <div className="space-y-3 md:hidden">{opportunities.isLoading ? <p className="text-sm text-slate-500">Loading opportunities…</p> : rows.map((r) => <Link key={r.id} to={`/companies/${companyId}/crm/opportunities/${r.id}`} className="block rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-primary-700">{r.opportunityNumber}</p><p className="truncate font-semibold text-slate-900">{r.name}</p><p className="truncate text-sm text-slate-500">{r.crmCompany?.name ?? 'No company'}</p></div><Badge tone={tones[r.status]}>{labels[r.status]}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600"><span>{r.stage.name} · {r.probability}%</span><span className="text-right">{money(r)}</span><span>{assignee(r)}</span><span className="text-right">{overdue(r) ? 'Overdue' : r.expectedClosingDate?.slice(0, 10) ?? ''}</span></div></Link>)}{!opportunities.isLoading && !rows.length ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500"><Search className="mx-auto mb-2 h-5 w-5" />No opportunities found.</div> : null}</div>
    {pagination && pagination.totalPages > 1 ? <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} opportunities</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</Button><Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((x) => x + 1)}>Next</Button></div></div> : null}
  </div>;
}
