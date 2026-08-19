import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, List, Plus, RefreshCw } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '../../components/feedback/Toast';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { userErrorMessage } from '../../lib/api-client';
import {
  changeOpportunityStage, getOpportunityCatalog, getOpportunityPipeline, listOpportunities,
  type Opportunity, type OpportunityStage,
} from '../../services/opportunities.service';

const money = (value?: string, currency?: string) => value ? `${currency ?? ''} ${Number(value).toLocaleString()}`.trim() : '—';
const priorityTone = (priority: string): 'blue' | 'green' | 'amber' | 'red' | 'slate' =>
  priority === 'URGENT' ? 'red' : priority === 'HIGH' ? 'amber' : priority === 'LOW' ? 'slate' : 'blue';
const overdue = (opp: Opportunity) => opp.status === 'OPEN' && opp.expectedClosingDate && new Date(opp.expectedClosingDate) < new Date();

export function OpportunityPipelinePage() {
  const { companyId = '' } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const catalog = useQuery({ queryKey: ['opportunity-catalog', companyId], queryFn: async () => (await getOpportunityCatalog(companyId)).data, enabled: Boolean(companyId) });
  const pipeline = useQuery({ queryKey: ['opportunity-pipeline', companyId], queryFn: async () => (await getOpportunityPipeline(companyId)).data, enabled: Boolean(companyId) });
  const board = useQuery({ queryKey: ['opportunities', companyId, 'board'], queryFn: () => listOpportunities(companyId, { limit: 500, sortBy: 'updatedAt', sortOrder: 'desc' }), enabled: Boolean(companyId) });
  const move = useMutation({
    mutationFn: ({ opportunityId, stageId }: { opportunityId: string; stageId: string }) => changeOpportunityStage(companyId, opportunityId, stageId, 'Moved in pipeline view'),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['opportunities', companyId, 'board'] }),
        qc.invalidateQueries({ queryKey: ['opportunity-pipeline', companyId] }),
        qc.invalidateQueries({ queryKey: ['opportunity-dashboard', companyId] }),
      ]);
      toast.success('Opportunity moved to the next stage.');
    },
    onError: (error) => toast.error(userErrorMessage(error)),
  });
  const stages: OpportunityStage[] = (catalog.data?.stages ?? []).filter((s) => !s.isWon && !s.isLost).sort((a, b) => a.sortOrder - b.sortOrder);
  const rows = board.data?.data ?? [];
  const totals = pipeline.data?.totals;
  const stageTotals = (stageId: string) => pipeline.data?.byStage.find((s) => s.stage?.id === stageId);
  const cardsFor = (stageId: string) => rows.filter((r) => r.status === 'OPEN' && r.stage.id === stageId);
  const wonCards = rows.filter((r) => r.status === 'WON');
  const lostCards = rows.filter((r) => r.status === 'LOST');
  const handleDrop = (stageId: string) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOverStage(null);
    const opportunityId = e.dataTransfer.getData('text/plain') || dragId;
    if (!opportunityId) return;
    const card = rows.find((r) => r.id === opportunityId);
    if (!card || card.status !== 'OPEN' || card.stage.id === stageId) return;
    move.mutate({ opportunityId, stageId });
  };
  const card = (opp: Opportunity) => (
    <Link
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', opp.id); e.dataTransfer.effectAllowed = 'move'; setDragId(opp.id); }}
      onDragEnd={() => { setDragId(null); setOverStage(null); }}
      to={`/companies/${companyId}/crm/opportunities/${opp.id}`}
      className={`block rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow ${dragId === opp.id ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-primary-700">{opp.opportunityNumber}</p>
        <Badge tone={priorityTone(opp.priority)}>{opp.priority}</Badge>
      </div>
      <p className="mt-1 text-sm font-medium leading-snug text-slate-900">{opp.name}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">{opp.crmCompany?.name ?? 'No company linked'}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
        <span className="font-medium">{money(opp.estimatedContractValue, opp.currency)}</span>
        <span>{opp.probability}%</span>
      </div>
      {opp.weightedValue ? <p className="mt-1 text-right text-[11px] text-slate-400">Weighted {money(opp.weightedValue, opp.currency)}</p> : null}
      {overdue(opp) ? <div className="mt-2"><Badge tone="red">Overdue</Badge></div> : null}
      {opp.expectedClosingDate ? <p className="mt-2 text-[11px] text-slate-500">Close {opp.expectedClosingDate.slice(0, 10)}</p> : null}
    </Link>
  );
  const column = (stage: OpportunityStage) => {
    const items = cardsFor(stage.id);
    const totalsForStage = stageTotals(stage.id);
    return (
      <section
        key={stage.id}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverStage(stage.id); }}
        onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
        onDrop={handleDrop(stage.id)}
        className={`flex min-h-64 w-72 shrink-0 flex-col rounded-lg border bg-slate-50 p-3 transition ${overStage === stage.id ? 'border-primary-400 bg-primary-50' : 'border-slate-200'}`}
      >
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{stage.name}</p>
            <p className="text-[11px] text-slate-500">{stage.probability}% probability</p>
          </div>
          <Badge tone="slate">{items.length}</Badge>
        </header>
        {totalsForStage ? <div className="mb-3 rounded-md bg-white px-3 py-2 text-[11px] text-slate-600 ring-1 ring-slate-200"><p>Total {money(totalsForStage.totalValue)}</p><p>Weighted {money(totalsForStage.weightedValue)}</p></div> : null}
        <div className="flex-1 space-y-2 overflow-y-auto">{items.map(card)}{!items.length ? <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Drop opportunities here</p> : null}</div>
      </section>
    );
  };
  return <div>
    <Link to={`/companies/${companyId}/crm/opportunities`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to opportunities</Link>
    <PageHeader title="Sales pipeline" description="Drag opportunities between stages. Closing to Won or Lost happens through the opportunity detail page." actions={<><Link to={`/companies/${companyId}/crm/opportunities`}><Button variant="secondary"><List className="h-4 w-4" />List view</Button></Link><Button variant="secondary" onClick={() => void Promise.all([board.refetch(), pipeline.refetch()])}><RefreshCw className="h-4 w-4" />Refresh</Button><Link to={`/companies/${companyId}/crm/opportunities/new`}><Button><Plus className="h-4 w-4" />Add opportunity</Button></Link></>} />
    {move.isError ? <div className="mb-4"><Alert>{userErrorMessage(move.error)}</Alert></div> : null}
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open opportunities</p><p className="mt-1 text-xl font-semibold text-slate-900">{totals?.count ?? 0}</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pipeline value</p><p className="mt-1 text-xl font-semibold text-slate-900">{money(totals?.totalValue)}</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Weighted pipeline</p><p className="mt-1 text-xl font-semibold text-slate-900">{money(totals?.weightedValue)}</p></div>
      <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Won / Lost (board)</p><p className="mt-1 text-xl font-semibold text-slate-900">{wonCards.length} / {lostCards.length}</p></div>
    </div>
    {board.isLoading ? <p className="text-sm text-slate-500">Loading pipeline…</p> : board.isError ? <Alert>{userErrorMessage(board.error)}</Alert> : <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map(column)}
      <section className="flex min-h-64 w-72 shrink-0 flex-col rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
        <header className="mb-3 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-emerald-900">Won</p><p className="text-[11px] text-emerald-700">100% · closed</p></div><Badge tone="green">{wonCards.length}</Badge></header>
        <div className="flex-1 space-y-2 overflow-y-auto">{wonCards.map(card)}{!wonCards.length ? <p className="rounded-md border border-dashed border-emerald-300 p-4 text-center text-xs text-emerald-600">Use “Mark as won” on the detail page</p> : null}</div>
      </section>
      <section className="flex min-h-64 w-72 shrink-0 flex-col rounded-lg border border-red-200 bg-red-50/60 p-3">
        <header className="mb-3 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-red-900">Lost</p><p className="text-[11px] text-red-700">0% · closed</p></div><Badge tone="red">{lostCards.length}</Badge></header>
        <div className="flex-1 space-y-2 overflow-y-auto">{lostCards.map(card)}{!lostCards.length ? <p className="rounded-md border border-dashed border-red-300 p-4 text-center text-xs text-red-600">Use “Mark as lost” on the detail page</p> : null}</div>
      </section>
    </div>}
  </div>;
}
