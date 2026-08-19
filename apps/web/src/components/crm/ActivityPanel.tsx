import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Phone, StickyNote, Users, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../feedback/Toast';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { userErrorMessage } from '../../lib/api-client';
import {
  cancelActivity, completeActivity, createActivity, getActivityAssignees, listActivities,
  rescheduleActivity, type Activity, type ActivityRelatedType, type ActivityType,
} from '../../services/activities.service';

const relatedIdParam: Record<ActivityRelatedType, string> = {
  LEAD: 'leadId', CRM_COMPANY: 'crmCompanyId', CRM_CONTACT: 'crmContactId', OPPORTUNITY: 'opportunityId',
};
const quickActions: Array<{ type: ActivityType; label: string; icon: typeof Phone }> = [
  { type: 'CALL', label: 'Log call', icon: Phone },
  { type: 'MEETING', label: 'Schedule meeting', icon: Calendar },
  { type: 'SITE_VISIT', label: 'Schedule site visit', icon: MapPin },
  { type: 'FOLLOW_UP', label: 'Create follow-up', icon: Users },
  { type: 'NOTE', label: 'Add note', icon: StickyNote },
];
const statusTone = (activity: Activity): 'blue' | 'green' | 'amber' | 'red' | 'slate' =>
  activity.effectiveStatus === 'OVERDUE' ? 'red' : activity.status === 'COMPLETED' ? 'green' : activity.status === 'CANCELLED' ? 'slate' : 'amber';
const typeLabel = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/^./, (x) => x.toUpperCase());

export function ActivityPanel({ companyId, relatedType, relatedId }: { companyId: string; relatedType: ActivityRelatedType; relatedId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [creatingType, setCreatingType] = useState<ActivityType | null>(null);
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [description, setDescription] = useState('');
  const [rescheduleId, setRescheduleId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const queryKey = ['crm-activities', companyId, relatedType, relatedId];
  const activities = useQuery({
    queryKey,
    queryFn: async () => (await listActivities(companyId, { [relatedIdParam[relatedType]]: relatedId, relatedType, sortBy: 'dueDate', sortOrder: 'asc', limit: 50 })).data,
    enabled: Boolean(companyId && relatedId),
  });
  const assignees = useQuery({ queryKey: ['activity-assignees', companyId], queryFn: async () => (await getActivityAssignees(companyId)).data, enabled: Boolean(companyId) });

  const refresh = () => qc.invalidateQueries({ queryKey });
  const action = useMutation({
    mutationFn: (job: () => Promise<unknown>) => job(),
    onSuccess: async () => { await refresh(); toast.success('Activity updated.'); },
    onError: (error) => toast.error(userErrorMessage(error)),
  });

  const startQuickCreate = (type: ActivityType) => { setCreatingType(type); setSubject(''); setDueDate(''); setDescription(''); setAssignedToId(''); };
  const submitQuickCreate = () => {
    if (!creatingType || !subject.trim() || !assignedToId) return;
    action.mutate(async () => {
      await createActivity(companyId, {
        relatedType, [relatedIdParam[relatedType]]: relatedId,
        type: creatingType, subject: subject.trim(), description: description || undefined,
        assignedToId, dueDate: dueDate || undefined,
      } as Parameters<typeof createActivity>[1]);
      setCreatingType(null);
    });
  };
  const complete = (activityId: string) => action.mutate(() => completeActivity(companyId, activityId, {}));
  const cancel = (activityId: string) => { if (!window.confirm('Cancel this activity?')) return; action.mutate(() => cancelActivity(companyId, activityId)); };
  const startReschedule = (activity: Activity) => { setRescheduleId(activity.id); setRescheduleDate(activity.dueDate?.slice(0, 10) ?? ''); setRescheduleReason(''); };
  const submitReschedule = () => {
    if (!rescheduleDate || !rescheduleReason.trim()) return;
    action.mutate(async () => { await rescheduleActivity(companyId, rescheduleId, { dueDate: rescheduleDate, reason: rescheduleReason.trim() }); setRescheduleId(''); });
  };

  const rows = activities.data ?? [];
  return <section className="rounded-lg border border-slate-200 bg-white p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold text-slate-900">Activities &amp; communication history</h2>
      <Link to={`/companies/${companyId}/crm/activities/new?relatedType=${relatedType}&${relatedIdParam[relatedType]}=${relatedId}`} className="text-sm font-medium text-primary-700 hover:underline">Full activity form →</Link>
    </div>
    <div className="mb-4 flex flex-wrap gap-2">
      {quickActions.map(({ type, label, icon: Icon }) => <Button key={type} variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => startQuickCreate(type)}><Icon className="h-3.5 w-3.5" />{label}</Button>)}
    </div>
    {creatingType ? <div className="mb-4 space-y-3 rounded-md border border-primary-200 bg-primary-50 p-3">
      <p className="text-sm font-medium text-primary-900">{quickActions.find((q) => q.type === creatingType)?.label}</p>
      <Input label="Subject *" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Discuss revised quotation" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Assigned to *" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} options={[{ value: '', label: 'Select user' }, ...(assignees.data ?? []).map((a) => ({ value: a.id, label: `${a.user.firstName} ${a.user.lastName}` }))]} />
        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">Notes</span><textarea className="min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div className="flex gap-2"><Button disabled={!subject.trim() || !assignedToId || action.isPending} onClick={submitQuickCreate}>Save</Button><Button variant="ghost" onClick={() => setCreatingType(null)}>Cancel</Button></div>
    </div> : null}
    {rescheduleId ? <div className="mb-4 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-900">Reschedule activity</p>
      <div className="grid gap-3 sm:grid-cols-2"><Input label="New due date *" type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} /><Input label="Reason *" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} placeholder="Client requested later date" /></div>
      <div className="flex gap-2"><Button disabled={!rescheduleDate || !rescheduleReason.trim() || action.isPending} onClick={submitReschedule}>Save</Button><Button variant="ghost" onClick={() => setRescheduleId('')}>Cancel</Button></div>
    </div> : null}
    {action.isError ? <div className="mb-3"><Alert>{userErrorMessage(action.error)}</Alert></div> : null}
    <div className="space-y-3">
      {activities.isLoading ? <p className="text-sm text-slate-500">Loading activities…</p> : rows.map((a) => <article key={a.id} className="rounded-md border border-slate-200 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone(a)}>{a.effectiveStatus === 'OVERDUE' ? 'Overdue' : typeLabel(a.status)}</Badge><p className="text-sm font-medium text-slate-900">{typeLabel(a.type)} · {a.subject}</p></div>
            {a.description ? <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.description}</p> : null}
            {a.outcome ? <p className="mt-1 text-sm text-slate-700"><strong>Outcome:</strong> {a.outcome}</p> : null}
            {a.nextAction ? <p className="mt-1 text-sm text-slate-700"><strong>Next action:</strong> {a.nextAction}{a.nextFollowUpDate ? ` (by ${a.nextFollowUpDate.slice(0, 10)})` : ''}</p> : null}
            <p className="mt-1 text-xs text-slate-500">{a.dueDate ? `Due ${a.dueDate.slice(0, 10)}` : 'No due date'}{a.completedAt ? ` · Completed ${a.completedAt.slice(0, 10)}` : ''}{a.assignedTo ? ` · ${a.assignedTo.user.firstName} ${a.assignedTo.user.lastName}` : ''}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {a.status === 'PLANNED' || a.status === 'IN_PROGRESS' ? <>
              <Button variant="secondary" className="px-2 py-1 text-xs" disabled={action.isPending} onClick={() => complete(a.id)}>Complete</Button>
              <Button variant="ghost" className="px-2 py-1 text-xs" disabled={action.isPending} onClick={() => startReschedule(a)}>Reschedule</Button>
              <Button variant="ghost" className="px-2 py-1 text-xs text-red-700" disabled={action.isPending} onClick={() => cancel(a.id)}>Cancel</Button>
            </> : null}
          </div>
        </div>
      </article>)}
      {!activities.isLoading && !rows.length ? <p className="text-sm text-slate-500">No activities logged yet.</p> : null}
    </div>
  </section>;
}
