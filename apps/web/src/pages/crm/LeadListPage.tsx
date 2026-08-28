import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { userErrorMessage } from '../../lib/api-client';
import { getLeadCatalog, getLeadDashboard, listLeads, type Lead } from '../../services/crm.service';

const labels: Record<string, string> = { NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', UNQUALIFIED: 'Unqualified', ON_HOLD: 'On hold', CONVERTED: 'Converted', LOST: 'Lost' };
const tones: Record<string, 'blue' | 'green' | 'amber' | 'red' | 'slate'> = { NEW: 'blue', CONTACTED: 'amber', QUALIFIED: 'green', UNQUALIFIED: 'slate', ON_HOLD: 'amber', CONVERTED: 'green', LOST: 'red' };
const money = (lead: Lead) => lead.estimatedValue ? `${lead.currency} ${Number(lead.estimatedValue).toLocaleString()}` : '—';
const assignee = (lead: Lead) => lead.assignedTo ? `${lead.assignedTo.user.firstName} ${lead.assignedTo.user.lastName}` : 'Unassigned';

export function LeadListPage() {
  const { companyId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [leadTypeId, setLeadTypeId] = useState('');
  const [leadSourceId, setLeadSourceId] = useState(
    () => searchParams.get('leadSourceId') ?? '',
  );
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const catalog = useQuery({ queryKey: ['lead-catalog', companyId], queryFn: async () => (await getLeadCatalog(companyId)).data, enabled: Boolean(companyId) });
  const dashboard = useQuery({ queryKey: ['lead-dashboard', companyId], queryFn: async () => (await getLeadDashboard(companyId)).data, enabled: Boolean(companyId) });
  const leads = useQuery({
    queryKey: ['leads', companyId, page, search, status, leadTypeId, leadSourceId, priority, sortBy],
    queryFn: () => listLeads(companyId, { page, limit: 20, search, status, leadTypeId, leadSourceId, priority, sortBy, sortOrder: 'desc' }),
    enabled: Boolean(companyId),
  });
  const rows = leads.data?.data ?? [];
  const pagination = leads.data?.pagination;
  const kpis: Array<[string, number | string]> = [
    ['Total leads', dashboard.data?.total ?? 0], ['New', dashboard.data?.byStatus.NEW ?? 0],
    ['Contacted', dashboard.data?.byStatus.CONTACTED ?? 0], ['Qualified', dashboard.data?.byStatus.QUALIFIED ?? 0],
    ['On hold', dashboard.data?.byStatus.ON_HOLD ?? 0], ['Converted', dashboard.data?.byStatus.CONVERTED ?? 0],
    ['Lost', dashboard.data?.byStatus.LOST ?? 0], ['Active pipeline', dashboard.data ? Number(dashboard.data.expectedPipelineValue).toLocaleString() : '0'],
  ];

  return <div>
    <PageHeader title="CRM · Leads" description="Pre-construction enquiries and potential project work." actions={<Link to={`/companies/${companyId}/crm/leads/new`}><Button><Plus className="h-4 w-4" />Add lead</Button></Link>} />
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{kpis.map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div>)}</div>
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Input label="Search" placeholder="Number, lead, company, contact…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: '', label: 'All statuses' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} />
        <Select label="Lead type" value={leadTypeId} onChange={(e) => { setLeadTypeId(e.target.value); setPage(1); }} options={[{ value: '', label: 'All types' }, ...(catalog.data?.types ?? []).map((x) => ({ value: x.id, label: x.name }))]} />
        <Select label="Lead source" value={leadSourceId} onChange={(e) => { setLeadSourceId(e.target.value); setPage(1); }} options={[{ value: '', label: 'All sources' }, ...(catalog.data?.sources ?? []).map((x) => ({ value: x.id, label: x.name }))]} />
        <Select label="Priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} options={[{ value: '', label: 'All priorities' }, ...['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((x) => ({ value: x, label: x }))]} />
        <Select label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={[{ value: 'createdAt', label: 'Created date' }, { value: 'expectedClosingDate', label: 'Expected close' }, { value: 'estimatedValue', label: 'Estimated value' }, { value: 'name', label: 'Lead name' }, { value: 'priority', label: 'Priority' }, { value: 'status', label: 'Status' }]} />
      </div>
    </div>
    <div className="hidden md:block"><DataTable<Lead> rows={rows} isLoading={leads.isLoading} error={leads.isError ? userErrorMessage(leads.error) : null} onRetry={() => void leads.refetch()} emptyMessage="No leads match the current filters." columns={[
      { key: 'number', header: 'Lead #', render: (r) => <Link className="font-medium text-primary-700 hover:underline" to={`/companies/${companyId}/crm/leads/${r.id}`}>{r.leadNumber}</Link> },
      { key: 'lead', header: 'Lead', render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.organizationName || 'No organization'}</p></div> },
      { key: 'contact', header: 'Contact', render: (r) => <div><p>{r.contactPerson || '—'}</p><p className="text-xs text-slate-500">{r.phone || r.email || 'No contact details'}</p></div> },
      { key: 'type', header: 'Type / Source', render: (r) => <span>{r.leadType.name}<br/><span className="text-xs text-slate-500">{r.leadSource.name}</span></span> },
      { key: 'value', header: 'Value', render: money },
      { key: 'status', header: 'Status', render: (r) => <Badge tone={tones[r.status]}>{labels[r.status]}</Badge> },
      { key: 'assigned', header: 'Assigned to', render: assignee },
      { key: 'close', header: 'Expected close', render: (r) => r.expectedClosingDate?.slice(0, 10) ?? '—' },
    ]} /></div>
    <div className="space-y-3 md:hidden">{leads.isLoading ? <p className="text-sm text-slate-500">Loading leads…</p> : rows.map((r) => <Link key={r.id} to={`/companies/${companyId}/crm/leads/${r.id}`} className="block rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-primary-700">{r.leadNumber}</p><p className="truncate font-semibold text-slate-900">{r.name}</p><p className="truncate text-sm text-slate-500">{r.organizationName || r.contactPerson || 'No company/contact'}</p></div><Badge tone={tones[r.status]}>{labels[r.status]}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600"><span>{r.leadType.name}</span><span className="text-right">{money(r)}</span><span>{assignee(r)}</span><span className="text-right">{r.priority}</span></div></Link>)}{!leads.isLoading && !rows.length ? <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500"><Search className="mx-auto mb-2 h-5 w-5" />No leads found.</div> : null}</div>
    {pagination && pagination.totalPages > 1 ? <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} leads</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</Button><Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((x) => x + 1)}>Next</Button></div></div> : null}
  </div>;
}
