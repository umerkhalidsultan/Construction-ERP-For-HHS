import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { userErrorMessage } from '../../lib/api-client';
import type { ApiResponse } from '../../types/api';
import { getPartyCatalog, listCrmCompanies, listCrmContacts, type CrmCompany, type CrmContact } from '../../services/crm.service';

export function PartyListPage({ kind }: { kind: 'companies' | 'contacts' }) {
  const { companyId = '' } = useParams(); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [typeId, setTypeId] = useState(''); const [city, setCity] = useState('');
  const catalog = useQuery({ queryKey: ['party-catalog', companyId], queryFn: async () => (await getPartyCatalog(companyId)).data, enabled: Boolean(companyId) });
  const query = useQuery<ApiResponse<Array<CrmCompany | CrmContact>>>({ queryKey: ['crm-parties', kind, companyId, page, search, status, typeId, city], queryFn: async () => kind === 'companies' ? await listCrmCompanies(companyId, { page, limit: 20, search, status, typeId, city }) as ApiResponse<Array<CrmCompany | CrmContact>> : await listCrmContacts(companyId, { page, limit: 20, search, status, typeId, city }) as ApiResponse<Array<CrmCompany | CrmContact>>, enabled: Boolean(companyId) });
  const rows = query.data?.data ?? []; const pagination = query.data?.pagination; const companyRows = rows as CrmCompany[]; const contactRows = rows as CrmContact[];
  const reset = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };
  return <div><PageHeader title={`CRM · ${kind === 'companies' ? 'Companies' : 'Contacts'}`} description={kind === 'companies' ? 'External organizations and their construction-business relationships.' : 'People, decision makers and technical stakeholders.'} actions={<Link to={`/companies/${companyId}/crm/${kind}/new`}><Button><Plus className="h-4 w-4" />Add {kind === 'companies' ? 'company' : 'contact'}</Button></Link>} />
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><Input label="Search" placeholder={kind === 'companies' ? 'Name, phone, email, registration…' : 'Name, company, phone, email…'} value={search} onChange={(e) => reset(setSearch)(e.target.value)} /><Select label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...(kind === 'companies' ? ['ACTIVE', 'INACTIVE', 'PROSPECT', 'BLOCKED'] : ['ACTIVE', 'INACTIVE', 'BLOCKED']).map((x) => ({ value: x, label: x }))]} /><Select label={kind === 'companies' ? 'Company type' : 'Contact type'} value={typeId} onChange={(e) => reset(setTypeId)(e.target.value)} options={[{ value: '', label: 'All types' }, ...(kind === 'companies' ? catalog.data?.companyTypes ?? [] : catalog.data?.contactTypes ?? []).map((x) => ({ value: x.id, label: x.name }))]} /><Input label="City" value={city} onChange={(e) => reset(setCity)(e.target.value)} /></div></div>
    <div className="hidden md:block">{kind === 'companies' ? <DataTable<CrmCompany> rows={companyRows} isLoading={query.isLoading} error={query.isError ? userErrorMessage(query.error) : null} columns={[
      { key: 'name', header: 'Company', render: (x) => <div><Link className="font-medium text-primary-700 hover:underline" to={`/companies/${companyId}/crm/companies/${x.id}`}>{x.name}</Link><p className="text-xs text-slate-500">{x.legalName || x.registrationNumber || '—'}</p></div> },
      { key: 'type', header: 'Types', render: (x) => <div className="flex max-w-56 flex-wrap gap-1">{x.types.map((t) => <Badge key={t.id}>{t.type.name}</Badge>)}</div> },
      { key: 'industry', header: 'Industry', render: (x) => x.industry || '—' }, { key: 'contact', header: 'Contact', render: (x) => <span>{x.phone || x.email || '—'}</span> },
      { key: 'city', header: 'City', render: (x) => x.city || '—' }, { key: 'primary', header: 'Primary contact', render: (x) => x.primaryContacts[0] ? `${x.primaryContacts[0].crmContact.firstName} ${x.primaryContacts[0].crmContact.lastName ?? ''}` : '—' },
      { key: 'status', header: 'Status', render: (x) => <Badge tone={x.status === 'ACTIVE' ? 'green' : x.status === 'BLOCKED' ? 'red' : 'amber'}>{x.status}</Badge> }, { key: 'created', header: 'Created', render: (x) => new Date(x.createdAt).toLocaleDateString() },
    ]} /> : <DataTable<CrmContact> rows={contactRows} isLoading={query.isLoading} error={query.isError ? userErrorMessage(query.error) : null} columns={[
      { key: 'name', header: 'Name', render: (x) => <div><Link className="font-medium text-primary-700 hover:underline" to={`/companies/${companyId}/crm/contacts/${x.id}`}>{x.firstName} {x.lastName}</Link><p className="text-xs text-slate-500">{x.jobTitle || '—'}</p></div> },
      { key: 'company', header: 'Company', render: (x) => x.crmCompany?.name || 'Independent' }, { key: 'department', header: 'Department', render: (x) => x.department || '—' },
      { key: 'contact', header: 'Contact', render: (x) => <span>{x.email || x.mobile || x.phone || '—'}</span> }, { key: 'types', header: 'Roles', render: (x) => <div className="flex max-w-52 flex-wrap gap-1">{x.types.map((t) => <Badge key={t.id}>{t.type.name}</Badge>)}</div> },
      { key: 'primary', header: 'Primary', render: (x) => x.primaryFor.length ? x.primaryFor.map((p) => p.purpose).join(', ') : '—' }, { key: 'status', header: 'Status', render: (x) => <Badge tone={x.status === 'ACTIVE' ? 'green' : x.status === 'BLOCKED' ? 'red' : 'amber'}>{x.status}</Badge> },
    ]} />}</div>
    <div className="space-y-3 md:hidden">{rows.map((row) => { const isCompany = kind === 'companies'; const x = row as CrmCompany & CrmContact; return <Link key={x.id} to={`/companies/${companyId}/crm/${kind}/${x.id}`} className="block rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-start gap-3">{isCompany ? <Building2 className="h-5 w-5 text-primary-700" /> : <UserRound className="h-5 w-5 text-primary-700" />}<div className="min-w-0 flex-1"><p className="truncate font-semibold">{isCompany ? x.name : `${x.firstName} ${x.lastName ?? ''}`}</p><p className="truncate text-sm text-slate-500">{isCompany ? x.industry || x.city || 'No industry/location' : x.crmCompany?.name || x.jobTitle || 'Independent contact'}</p><div className="mt-2 flex flex-wrap gap-1">{x.types.slice(0, 3).map((t) => <Badge key={t.id}>{t.type.name}</Badge>)}</div></div><Badge tone={x.status === 'ACTIVE' ? 'green' : x.status === 'BLOCKED' ? 'red' : 'amber'}>{x.status}</Badge></div></Link>; })}</div>
    {pagination && pagination.totalPages > 1 ? <div className="mt-4 flex items-center justify-between"><p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} records</p><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Previous</Button><Button variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage((x) => x + 1)}>Next</Button></div></div> : null}
  </div>;
}
