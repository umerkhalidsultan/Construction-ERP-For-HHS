import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { FormErrorSummary } from '../../components/feedback/FormErrorSummary';
import { useToast } from '../../components/feedback/Toast';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { ApiError, userErrorMessage } from '../../lib/api-client';
import { applyApiFieldErrors } from '../../lib/errors/apply-field-errors';
import { listCrmCompanies, listCrmContacts, listLeads } from '../../services/crm.service';
import { listOpportunities } from '../../services/opportunities.service';
import { createActivity, getActivity, getActivityAssignees, getActivityCatalog, updateActivity, type ActivityInput, type ActivityRelatedType } from '../../services/activities.service';

const schema = z.object({
  relatedType: z.enum(['LEAD', 'CRM_COMPANY', 'CRM_CONTACT', 'OPPORTUNITY']),
  leadId: z.string().uuid().optional().or(z.literal('')), crmCompanyId: z.string().uuid().optional().or(z.literal('')),
  crmContactId: z.string().uuid().optional().or(z.literal('')), opportunityId: z.string().uuid().optional().or(z.literal('')),
  type: z.enum(['CALL', 'MEETING', 'SITE_VISIT', 'EMAIL', 'WHATSAPP', 'FOLLOW_UP', 'TASK', 'NOTE', 'OTHER']),
  subject: z.string().min(2, 'Activity subject is required.').max(255), description: z.string().optional(),
  assignedToId: z.string().uuid('Please select who this activity is assigned to.'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  startAt: z.string().optional(), endAt: z.string().optional(), dueDate: z.string().optional(),
  location: z.string().max(500).optional(), participants: z.string().max(1000).optional(),
  contactPhone: z.string().max(32).optional(), callDurationMinutes: z.coerce.number().int().min(0).optional().or(z.nan()),
  emailTo: z.string().max(500).optional(), emailCc: z.string().max(500).optional(), purpose: z.string().optional(),
  reminderMinutesBefore: z.coerce.number().int().min(0).optional().or(z.nan()),
}).refine((v) => !v.startAt || !v.endAt || new Date(v.endAt) >= new Date(v.startAt), { message: 'End time cannot be earlier than start time.', path: ['endAt'] });
type Values = z.infer<typeof schema>;
const section = 'rounded-lg border border-slate-200 bg-white p-5';
const reminderOptions = [{ value: '', label: 'No reminder' }, { value: '15', label: '15 minutes before' }, { value: '30', label: '30 minutes before' }, { value: '60', label: '1 hour before' }, { value: '1440', label: '1 day before' }];

export function ActivityFormPage() {
  const { companyId = '', activityId } = useParams();
  const [searchParams] = useSearchParams();
  const edit = Boolean(activityId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      relatedType: (searchParams.get('relatedType') as ActivityRelatedType) ?? 'LEAD',
      leadId: searchParams.get('leadId') ?? '', crmCompanyId: searchParams.get('crmCompanyId') ?? '',
      crmContactId: searchParams.get('crmContactId') ?? '', opportunityId: searchParams.get('opportunityId') ?? '',
      type: 'CALL', subject: '', description: '', assignedToId: '', priority: 'MEDIUM',
      startAt: '', endAt: '', dueDate: '', location: '', participants: '', contactPhone: '',
      emailTo: '', emailCc: '', purpose: '',
    },
  });
  const relatedType = form.watch('relatedType');
  const catalog = useQuery({ queryKey: ['activity-catalog', companyId], queryFn: async () => (await getActivityCatalog(companyId)).data, enabled: Boolean(companyId) });
  const assignees = useQuery({ queryKey: ['activity-assignees', companyId], queryFn: async () => (await getActivityAssignees(companyId)).data, enabled: Boolean(companyId) });
  const leads = useQuery({ queryKey: ['lead-options', companyId], queryFn: () => listLeads(companyId, { limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }), enabled: Boolean(companyId) && relatedType === 'LEAD' });
  const crmCompanies = useQuery({ queryKey: ['crm-company-options', companyId], queryFn: async () => (await listCrmCompanies(companyId, { limit: 100, sortBy: 'name', sortOrder: 'asc' })).data, enabled: Boolean(companyId) && relatedType === 'CRM_COMPANY' });
  const crmContacts = useQuery({ queryKey: ['crm-contact-options', companyId], queryFn: async () => (await listCrmContacts(companyId, { limit: 100, sortBy: 'firstName', sortOrder: 'asc' })).data, enabled: Boolean(companyId) && relatedType === 'CRM_CONTACT' });
  const opportunities = useQuery({ queryKey: ['opportunity-options', companyId], queryFn: () => listOpportunities(companyId, { limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }), enabled: Boolean(companyId) && relatedType === 'OPPORTUNITY' });
  const activity = useQuery({ queryKey: ['activity', companyId, activityId], queryFn: async () => (await getActivity(companyId, activityId!)).data, enabled: edit });
  useEffect(() => {
    const x = activity.data; if (!x) return;
    form.reset({
      relatedType: x.relatedType, leadId: x.lead?.id ?? '', crmCompanyId: x.crmCompany?.id ?? '', crmContactId: x.crmContact?.id ?? '', opportunityId: x.opportunity?.id ?? '',
      type: x.type, subject: x.subject, description: x.description ?? '', assignedToId: x.assignedTo?.id ?? '', priority: x.priority,
      startAt: x.startAt?.slice(0, 16) ?? '', endAt: x.endAt?.slice(0, 16) ?? '', dueDate: x.dueDate?.slice(0, 10) ?? '',
      location: x.location ?? '', participants: x.participants ?? '', contactPhone: x.contactPhone ?? '', callDurationMinutes: x.callDurationMinutes,
      emailTo: x.emailTo ?? '', emailCc: x.emailCc ?? '', purpose: x.purpose ?? '', reminderMinutesBefore: x.reminderMinutesBefore,
    });
  }, [activity.data, form]);
  const clean = (v: Values): ActivityInput => ({
    relatedType: v.relatedType, leadId: v.relatedType === 'LEAD' ? v.leadId || undefined : undefined,
    crmCompanyId: v.relatedType === 'CRM_COMPANY' ? v.crmCompanyId || undefined : undefined,
    crmContactId: v.relatedType === 'CRM_CONTACT' ? v.crmContactId || undefined : undefined,
    opportunityId: v.relatedType === 'OPPORTUNITY' ? v.opportunityId || undefined : undefined,
    type: v.type, subject: v.subject, description: v.description || undefined, assignedToId: v.assignedToId, priority: v.priority,
    startAt: v.startAt || undefined, endAt: v.endAt || undefined, dueDate: v.dueDate || undefined,
    location: v.location || undefined, participants: v.participants || undefined, contactPhone: v.contactPhone || undefined,
    callDurationMinutes: Number.isFinite(v.callDurationMinutes) ? v.callDurationMinutes : undefined,
    emailTo: v.emailTo || undefined, emailCc: v.emailCc || undefined, purpose: v.purpose || undefined,
    reminderMinutesBefore: Number.isFinite(v.reminderMinutesBefore) ? v.reminderMinutesBefore : undefined,
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => edit ? updateActivity(companyId, activityId!, clean(values)) : createActivity(companyId, clean(values)),
    onSuccess: async (response) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['crm-activities'] }), qc.invalidateQueries({ queryKey: ['activity-dashboard', companyId] })]);
      toast.success(edit ? 'Activity changes saved.' : 'Activity created.');
      navigate(`/companies/${companyId}/crm/activities/${response.data.id}`);
    },
    onError: (error) => applyApiFieldErrors(form.setError, error instanceof ApiError ? error : {}),
  });
  const errors = Object.values(form.formState.errors).map((x) => x?.message).filter((x): x is string => Boolean(x));
  return <div><PageHeader title={edit ? 'Edit activity' : 'Add activity'} description="Record a call, meeting, site visit, email, WhatsApp update, follow-up, task, or note against a CRM record." />
    {mutation.isError ? <div className="mb-4"><Alert>{userErrorMessage(mutation.error)}</Alert></div> : null}
    <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}><FormErrorSummary messages={errors} />
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Related to</h2><div className="grid gap-4 md:grid-cols-2">
        <Select label="Related to *" options={(catalog.data?.relatedTypes ?? ['LEAD', 'CRM_COMPANY', 'CRM_CONTACT', 'OPPORTUNITY']).map((x) => ({ value: x, label: x.replaceAll('_', ' ') }))} {...form.register('relatedType')} />
        {relatedType === 'LEAD' ? <Select label="Lead *" error={form.formState.errors.leadId?.message} options={[{ value: '', label: 'Select lead' }, ...(leads.data?.data ?? []).map((x) => ({ value: x.id, label: `${x.leadNumber} · ${x.name}` }))]} {...form.register('leadId')} /> : null}
        {relatedType === 'CRM_COMPANY' ? <Select label="Company *" error={form.formState.errors.crmCompanyId?.message} options={[{ value: '', label: 'Select company' }, ...(crmCompanies.data ?? []).map((x) => ({ value: x.id, label: x.name }))]} {...form.register('crmCompanyId')} /> : null}
        {relatedType === 'CRM_CONTACT' ? <Select label="Contact *" error={form.formState.errors.crmContactId?.message} options={[{ value: '', label: 'Select contact' }, ...(crmContacts.data ?? []).map((x) => ({ value: x.id, label: `${x.firstName} ${x.lastName ?? ''}` }))]} {...form.register('crmContactId')} /> : null}
        {relatedType === 'OPPORTUNITY' ? <Select label="Opportunity *" error={form.formState.errors.opportunityId?.message} options={[{ value: '', label: 'Select opportunity' }, ...(opportunities.data?.data ?? []).map((x) => ({ value: x.id, label: `${x.opportunityNumber} · ${x.name}` }))]} {...form.register('opportunityId')} /> : null}
      </div></section>
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Activity</h2><div className="grid gap-4 md:grid-cols-2">
        <Select label="Activity type *" options={(catalog.data?.types ?? []).map((x) => ({ value: x, label: x.replaceAll('_', ' ') }))} {...form.register('type')} />
        <Select label="Priority" options={(catalog.data?.priorities ?? ['LOW', 'MEDIUM', 'HIGH', 'URGENT']).map((x) => ({ value: x, label: x }))} {...form.register('priority')} />
        <Input label="Subject *" error={form.formState.errors.subject?.message} {...form.register('subject')} />
        <Select label="Assigned to *" error={form.formState.errors.assignedToId?.message} options={[{ value: '', label: 'Select user' }, ...(assignees.data ?? []).map((x) => ({ value: x.id, label: `${x.user.firstName} ${x.user.lastName}` }))]} {...form.register('assignedToId')} />
      </div><label className="mt-4 block space-y-1.5"><span className="text-sm font-medium text-slate-700">Description</span><textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...form.register('description')} /></label></section>
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Schedule</h2><div className="grid gap-4 md:grid-cols-3">
        <Input label="Start" type="datetime-local" {...form.register('startAt')} />
        <Input label="End" type="datetime-local" error={form.formState.errors.endAt?.message} {...form.register('endAt')} />
        <Input label="Due date" type="date" {...form.register('dueDate')} />
        <Select label="Reminder" options={reminderOptions} {...form.register('reminderMinutesBefore')} />
      </div></section>
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Details</h2><div className="grid gap-4 md:grid-cols-2">
        <Input label="Location" {...form.register('location')} />
        <Input label="Participants" {...form.register('participants')} />
        <Input label="Contact phone (call)" {...form.register('contactPhone')} />
        <Input label="Call duration (minutes)" type="number" min="0" {...form.register('callDurationMinutes')} />
        <Input label="Email to" {...form.register('emailTo')} />
        <Input label="Email CC" {...form.register('emailCc')} />
      </div><label className="mt-4 block space-y-1.5"><span className="text-sm font-medium text-slate-700">Purpose / agenda</span><textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...form.register('purpose')} /></label></section>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : edit ? 'Save changes' : 'Create activity'}</Button></div>
    </form>
  </div>;
}
