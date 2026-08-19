import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/feedback/Toast';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { userErrorMessage } from '../../lib/api-client';
import {
  addActivityAttachment, assignActivity, cancelActivity, completeActivity, deleteActivity,
  getActivity, getActivityAssignees, getActivityTimeline, rescheduleActivity,
} from '../../services/activities.service';

const panel = 'rounded-lg border border-slate-200 bg-white p-5';
const field = (label: string, value?: string | number | null) => <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-900">{value ?? '—'}</dd></div>;
const statusTone = (status: string, isOverdue: boolean): 'blue' | 'green' | 'amber' | 'red' | 'slate' => isOverdue ? 'red' : status === 'COMPLETED' ? 'green' : status === 'CANCELLED' ? 'slate' : status === 'IN_PROGRESS' ? 'blue' : 'amber';
const relatedLink = (companyId: string, x: NonNullable<ReturnType<typeof useActivity>['data']>): { href: string; label: string } | null => {
  if (x.lead) return { href: `/companies/${companyId}/crm/leads/${x.lead.id}`, label: `Lead: ${x.lead.leadNumber} · ${x.lead.name}` };
  if (x.crmCompany) return { href: `/companies/${companyId}/crm/companies/${x.crmCompany.id}`, label: `Company: ${x.crmCompany.name}` };
  if (x.crmContact) return { href: `/companies/${companyId}/crm/contacts/${x.crmContact.id}`, label: `Contact: ${x.crmContact.firstName} ${x.crmContact.lastName ?? ''}` };
  if (x.opportunity) return { href: `/companies/${companyId}/crm/opportunities/${x.opportunity.id}`, label: `Opportunity: ${x.opportunity.opportunityNumber} · ${x.opportunity.name}` };
  return null;
};
function useActivity() { const { companyId = '', activityId = '' } = useParams(); return useQuery({ queryKey: ['activity', companyId, activityId], queryFn: async () => (await getActivity(companyId, activityId)).data, enabled: Boolean(companyId && activityId) }); }

export function ActivityDetailPage() {
  const { companyId = '', activityId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [outcome, setOutcome] = useState(''); const [nextAction, setNextAction] = useState(''); const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState(''); const [rescheduleReason, setRescheduleReason] = useState(''); const [rescheduling, setRescheduling] = useState(false);
  const [fileId, setFileId] = useState(''); const [fileTitle, setFileTitle] = useState('');

  const activity = useActivity();
  const timeline = useQuery({ queryKey: ['activity-timeline', companyId, activityId], queryFn: async () => (await getActivityTimeline(companyId, activityId)).data, enabled: Boolean(companyId && activityId) });
  const assignees = useQuery({ queryKey: ['activity-assignees', companyId], queryFn: async () => (await getActivityAssignees(companyId)).data, enabled: Boolean(companyId) });

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['activity', companyId, activityId] }), qc.invalidateQueries({ queryKey: ['activity-timeline', companyId, activityId] }), qc.invalidateQueries({ queryKey: ['crm-activities'] })]);
  const action = useMutation({ mutationFn: (job: () => Promise<unknown>) => job(), onSuccess: async () => { await refresh(); toast.success('Activity updated.'); }, onError: (error) => toast.error(userErrorMessage(error)) });

  if (activity.isLoading) return <p className="text-sm text-slate-500">Loading activity…</p>;
  if (activity.isError || !activity.data) return <Alert>{userErrorMessage(activity.error)}</Alert>;
  const x = activity.data;
  const related = relatedLink(companyId, x);
  const open = x.status === 'PLANNED' || x.status === 'IN_PROGRESS';

  const complete = () => action.mutate(async () => { await completeActivity(companyId, activityId, { outcome: outcome || undefined, nextAction: nextAction || undefined, nextFollowUpDate: nextFollowUpDate || undefined }); setOutcome(''); setNextAction(''); setNextFollowUpDate(''); });
  const cancel = () => { if (!window.confirm('Cancel this activity?')) return; action.mutate(() => cancelActivity(companyId, activityId)); };
  const submitReschedule = () => { if (!rescheduleDate || !rescheduleReason.trim()) return; action.mutate(async () => { await rescheduleActivity(companyId, activityId, { dueDate: rescheduleDate, reason: rescheduleReason.trim() }); setRescheduling(false); }); };
  const remove = () => { if (!window.confirm('Delete this activity?')) return; action.mutate(async () => { await deleteActivity(companyId, activityId); navigate(`/companies/${companyId}/crm/activities`); }); };
  const addAttachment = () => { if (!fileId.trim()) return; action.mutate(async () => { await addActivityAttachment(companyId, activityId, { fileId, title: fileTitle || undefined }); setFileId(''); setFileTitle(''); }); };

  return <div>
    <Link to={`/companies/${companyId}/crm/activities`} className="mb-3 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to activities</Link>
    <PageHeader title={x.subject} description={`${x.type.replaceAll('_', ' ')} · Created ${new Date(x.createdAt).toLocaleString()}`} actions={<><Link to={`/companies/${companyId}/crm/activities/${activityId}/edit`}><Button variant="secondary"><Pencil className="h-4 w-4" />Edit</Button></Link>{x.status !== 'COMPLETED' ? <Button variant="danger" onClick={remove}><Trash2 className="h-4 w-4" />Delete</Button> : null}</>} />
    {action.isError ? <div className="mb-4"><Alert>{userErrorMessage(action.error)}</Alert></div> : null}
    <div className="mb-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className={panel}>
        <div className="mb-4 flex flex-wrap items-center gap-2"><Badge tone={statusTone(x.status, x.isOverdue)}>{x.effectiveStatus === 'OVERDUE' ? 'Overdue' : x.status.replaceAll('_', ' ')}</Badge><Badge tone={x.priority === 'URGENT' ? 'red' : x.priority === 'HIGH' ? 'amber' : 'slate'}>{x.priority} priority</Badge></div>
        {related ? <Link to={related.href} className="mb-4 block rounded-md border border-primary-200 bg-primary-50 p-3 text-sm font-medium text-primary-800">{related.label}</Link> : null}
        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {field('Start', x.startAt ? new Date(x.startAt).toLocaleString() : null)}{field('End', x.endAt ? new Date(x.endAt).toLocaleString() : null)}{field('Due date', x.dueDate?.slice(0, 10))}
          {field('Location', x.location)}{field('Participants', x.participants)}{field('Assigned to', x.assignedTo ? `${x.assignedTo.user.firstName} ${x.assignedTo.user.lastName}` : 'Unassigned')}
          {x.type === 'CALL' ? field('Phone', x.contactPhone) : null}{x.type === 'CALL' ? field('Duration (min)', x.callDurationMinutes) : null}
          {x.type === 'EMAIL' ? field('To', x.emailTo) : null}{x.type === 'EMAIL' ? field('CC', x.emailCc) : null}
        </dl>
        {x.description ? <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{x.description}</p></div> : null}
        {x.purpose ? <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Purpose / agenda</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{x.purpose}</p></div> : null}
        {x.outcome ? <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Outcome</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{x.outcome}</p></div> : null}
        {x.nextAction ? <div className="mt-4 border-t border-slate-100 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next action</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{x.nextAction}{x.nextFollowUpDate ? ` · Next follow-up ${x.nextFollowUpDate.slice(0, 10)}` : ''}</p></div> : null}
      </section>
      <section className={panel}>
        <h2 className="mb-3 font-semibold text-slate-900">Controls</h2>
        <div className="space-y-3">
          <Select label="Reassign" value={x.assignedTo?.id ?? ''} options={[{ value: '', label: 'Select user' }, ...(assignees.data ?? []).map((a) => ({ value: a.id, label: `${a.user.firstName} ${a.user.lastName}` }))]} onChange={(e) => { if (e.target.value) action.mutate(() => assignActivity(companyId, activityId, e.target.value)); }} />
          {open ? <>
            <div className="rounded-md border border-slate-200 p-3"><p className="mb-2 text-sm font-medium text-slate-900">Complete activity</p>
              <div className="space-y-2"><textarea placeholder="Outcome" className="min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={outcome} onChange={(e) => setOutcome(e.target.value)} /><Input placeholder="Next action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} /><Input label="Next follow-up date" type="date" value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} /><Button className="w-full" disabled={action.isPending} onClick={complete}>Mark completed</Button></div>
            </div>
            {rescheduling ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3"><p className="mb-2 text-sm font-medium text-amber-900">Reschedule</p><div className="space-y-2"><Input label="New due date *" type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} /><Input label="Reason *" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} /><div className="flex gap-2"><Button disabled={!rescheduleDate || !rescheduleReason.trim() || action.isPending} onClick={submitReschedule}>Save</Button><Button variant="ghost" onClick={() => setRescheduling(false)}>Cancel</Button></div></div></div>
              : <Button variant="secondary" className="w-full" onClick={() => setRescheduling(true)}>Reschedule</Button>}
            <Button variant="ghost" className="w-full text-red-700" disabled={action.isPending} onClick={cancel}>Cancel activity</Button>
          </> : null}
        </div>
      </section>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className={panel}><h2 className="mb-4 font-semibold text-slate-900">Attachments</h2><Alert tone="info">Attach an existing secure FileObject by ID.</Alert><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label="File ID" placeholder="File UUID" value={fileId} onChange={(e) => setFileId(e.target.value)} /><Input aria-label="Attachment title" placeholder="Title (optional)" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} /><Button disabled={!fileId || action.isPending} onClick={addAttachment}>Attach</Button></div><div className="mt-4 space-y-2">{x.attachments?.map((a) => <a key={a.id} href={a.file.publicUrl || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50"><FileText className="h-5 w-5 text-slate-500" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{a.title || a.file.originalName}</span><span className="text-xs text-slate-500">{a.file.mimeType}</span></span></a>)}{!x.attachments?.length ? <p className="text-sm text-slate-500">No attachments yet.</p> : null}</div></section>
      <section className={panel}><h2 className="mb-4 font-semibold text-slate-900">History</h2><ol className="relative ml-2 border-l border-slate-200 pl-5">{timeline.data?.map((event) => <li key={event.id} className="relative mb-5 last:mb-0"><span className="absolute -left-[25px] top-1 h-2 w-2 rounded-full bg-primary-600 ring-4 ring-white" /><p className="text-sm font-medium text-slate-900">{event.action.replace('CRM.Activity.', '').replaceAll(/([A-Z])/g, ' $1').trim()}</p><p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}{event.user ? ` · ${event.user.firstName} ${event.user.lastName}` : ''}</p></li>)}{!timeline.data?.length ? <p className="text-sm text-slate-500">No history recorded.</p> : null}</ol></section>
    </div>
  </div>;
}
