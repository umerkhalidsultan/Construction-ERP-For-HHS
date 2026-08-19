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
import { listCrmCompanies, listCrmContacts } from '../../services/crm.service';
import { convertLeadToOpportunity, createOpportunity, getConvertPreview, getOpportunity, getOpportunityAssignees, getOpportunityCatalog, updateOpportunity, type OpportunityInput } from '../../services/opportunities.service';

const schema = z.object({
  name: z.string().min(2, 'Opportunity name is required.').max(255), opportunityTypeId: z.string().uuid('Please select an opportunity type.'), sourceId: z.string().uuid('Please select a source.'),
  stageId: z.string().uuid().optional().or(z.literal('')), crmCompanyId: z.string().uuid().optional().or(z.literal('')), crmContactId: z.string().uuid().optional().or(z.literal('')),
  projectLocation: z.string().max(500).optional(), city: z.string().max(120).optional(), area: z.string().max(160).optional(),
  estimatedContractValue: z.coerce.number().min(0, 'Please enter a valid estimated value.').optional().or(z.nan()),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code.'),
  probability: z.coerce.number().int().min(0).max(100).optional().or(z.nan()),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']), assignedToId: z.string().uuid().optional().or(z.literal('')),
  expectedClosingDate: z.string().optional(), expectedStartDate: z.string().optional(), expectedCompletionDate: z.string().optional(), description: z.string().optional(),
});
type Values = z.infer<typeof schema>;
const section = 'rounded-lg border border-slate-200 bg-white p-5';

export function OpportunityFormPage() {
  const { companyId = '', opportunityId } = useParams();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId') ?? undefined;
  const edit = Boolean(opportunityId);
  const converting = Boolean(leadId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', opportunityTypeId: '', sourceId: '', stageId: '', crmCompanyId: '', crmContactId: '', projectLocation: '', city: '', area: '', currency: 'USD', priority: 'MEDIUM', assignedToId: '', expectedClosingDate: '', expectedStartDate: '', expectedCompletionDate: '', description: '' } });
  const catalog = useQuery({ queryKey: ['opportunity-catalog', companyId], queryFn: async () => (await getOpportunityCatalog(companyId)).data, enabled: Boolean(companyId) });
  const assignees = useQuery({ queryKey: ['opportunity-assignees', companyId], queryFn: async () => (await getOpportunityAssignees(companyId)).data, enabled: Boolean(companyId) });
  const crmCompanies = useQuery({ queryKey: ['crm-company-options', companyId], queryFn: async () => (await listCrmCompanies(companyId, { limit: 100, sortBy: 'name', sortOrder: 'asc' })).data, enabled: Boolean(companyId) });
  const selectedCrmCompanyId = form.watch('crmCompanyId');
  const crmContacts = useQuery({ queryKey: ['crm-contact-options', companyId, selectedCrmCompanyId], queryFn: async () => (await listCrmContacts(companyId, { limit: 100, crmCompanyId: selectedCrmCompanyId || undefined, sortBy: 'firstName', sortOrder: 'asc' })).data, enabled: Boolean(companyId) });
  const opportunity = useQuery({ queryKey: ['opportunity', companyId, opportunityId], queryFn: async () => (await getOpportunity(companyId, opportunityId!)).data, enabled: edit });
  const preview = useQuery({ queryKey: ['opportunity-convert-preview', companyId, leadId], queryFn: async () => (await getConvertPreview(companyId, leadId!)).data, enabled: converting });
  useEffect(() => { if (!edit && !converting && catalog.data?.defaultCurrency) form.setValue('currency', catalog.data.defaultCurrency); }, [catalog.data, edit, converting, form]);
  useEffect(() => { const x = opportunity.data; if (!x) return; form.reset({ name: x.name, opportunityTypeId: x.opportunityType.id, sourceId: x.source.id, stageId: x.stage.id, crmCompanyId: x.crmCompany?.id ?? '', crmContactId: x.crmContact?.id ?? '', projectLocation: x.projectLocation ?? '', city: x.city ?? '', area: x.area ?? '', estimatedContractValue: x.estimatedContractValue ? Number(x.estimatedContractValue) : undefined, currency: x.currency, probability: x.probability, priority: x.priority, assignedToId: x.assignedTo?.id ?? '', expectedClosingDate: x.expectedClosingDate?.slice(0, 10) ?? '', expectedStartDate: x.expectedStartDate?.slice(0, 10) ?? '', expectedCompletionDate: x.expectedCompletionDate?.slice(0, 10) ?? '', description: x.description ?? '' }); }, [opportunity.data, form]);
  useEffect(() => { const x = preview.data; if (!x) return; const s = x.suggested; form.reset({ name: s.name, opportunityTypeId: '', sourceId: '', stageId: '', crmCompanyId: s.crmCompanyId ?? '', crmContactId: s.crmContactId ?? '', projectLocation: s.projectLocation ?? '', city: s.city ?? '', area: s.area ?? '', estimatedContractValue: s.estimatedContractValue ? Number(s.estimatedContractValue) : undefined, currency: s.currency, probability: undefined, priority: s.priority as Values['priority'] ?? 'MEDIUM', assignedToId: s.assignedToId ?? '', expectedClosingDate: s.expectedClosingDate?.slice(0, 10) ?? '', expectedStartDate: '', expectedCompletionDate: '', description: s.description ?? '' }); }, [preview.data, form]);
  const clean = (v: Values): OpportunityInput => ({ ...v, stageId: v.stageId || undefined, crmCompanyId: v.crmCompanyId || undefined, crmContactId: v.crmContactId || undefined, assignedToId: v.assignedToId || undefined, expectedClosingDate: v.expectedClosingDate || undefined, expectedStartDate: v.expectedStartDate || undefined, expectedCompletionDate: v.expectedCompletionDate || undefined, estimatedContractValue: Number.isFinite(v.estimatedContractValue) ? v.estimatedContractValue : undefined, probability: Number.isFinite(v.probability) ? v.probability : undefined });
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      if (converting && leadId) return convertLeadToOpportunity(companyId, { leadId, ...clean(values) });
      if (edit) return updateOpportunity(companyId, opportunityId!, clean(values));
      return createOpportunity(companyId, clean(values));
    },
    onSuccess: async (response) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['opportunities', companyId] }), qc.invalidateQueries({ queryKey: ['opportunity-dashboard', companyId] }), qc.invalidateQueries({ queryKey: ['opportunity-pipeline', companyId] }), qc.invalidateQueries({ queryKey: ['leads', companyId] }), qc.invalidateQueries({ queryKey: ['lead', companyId] })]);
      toast.success(converting ? 'Lead converted to opportunity.' : edit ? 'Opportunity changes saved.' : 'Opportunity created.');
      navigate(`/companies/${companyId}/crm/opportunities/${response.data.id}`);
    },
    onError: (error) => applyApiFieldErrors(form.setError, error instanceof ApiError ? error : {}),
  });
  const errors = Object.values(form.formState.errors).map((x) => x?.message).filter((x): x is string => Boolean(x));
  const title = converting ? 'Convert lead to opportunity' : edit ? 'Edit opportunity' : 'Add opportunity';
  return <div><PageHeader title={title} description={converting ? 'The qualified lead becomes an opportunity with a server-generated OPP number. The lead is marked as converted.' : 'Capture qualified construction work and place it in the sales pipeline. Opportunity number is generated securely when saved.'} />
    {mutation.isError ? <div className="mb-4"><Alert>{userErrorMessage(mutation.error)}</Alert></div> : null}
    {converting && preview.data ? <div className="mb-4"><Alert tone="info">Converting lead {preview.data.lead.leadNumber} · {preview.data.lead.name}. Fields below are pre-filled from the lead and can be adjusted.</Alert></div> : null}
    {converting && preview.isError ? <div className="mb-4"><Alert>{userErrorMessage(preview.error)}</Alert></div> : null}
    <form noValidate className="space-y-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}><FormErrorSummary messages={errors} />
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Opportunity overview</h2><div className="grid gap-4 md:grid-cols-2"><Input label="Opportunity name *" error={form.formState.errors.name?.message} {...form.register('name')} /><Select label="Priority" options={['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((x) => ({ value: x, label: x }))} {...form.register('priority')} /><Select label="Opportunity type *" error={form.formState.errors.opportunityTypeId?.message} options={[{ value: '', label: 'Select opportunity type' }, ...(converting ? (preview.data?.types ?? []) : (catalog.data?.types ?? [])).map((x) => ({ value: x.id, label: x.name }))]} {...form.register('opportunityTypeId')} /><Select label="Source *" error={form.formState.errors.sourceId?.message} options={[{ value: '', label: 'Select source' }, ...(converting ? (preview.data?.sources ?? []) : (catalog.data?.sources ?? [])).map((x) => ({ value: x.id, label: x.name }))]} {...form.register('sourceId')} />{!edit ? <Select label="Starting stage" options={[{ value: '', label: 'Default stage' }, ...(catalog.data?.stages ?? []).filter((x) => !x.isWon && !x.isLost).map((x) => ({ value: x.id, label: `${x.name} (${x.probability}%)` }))]} {...form.register('stageId')} /> : null}<Select label="Assigned to" options={[{ value: '', label: 'Unassigned' }, ...(assignees.data ?? []).map((x) => ({ value: x.id, label: `${x.user.firstName} ${x.user.lastName}` }))]} {...form.register('assignedToId')} /></div></section>
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Company &amp; contact</h2><div className="grid gap-4 md:grid-cols-2"><Select label="CRM company" options={[{ value: '', label: 'Not linked' }, ...(crmCompanies.data ?? []).map((x) => ({ value: x.id, label: x.name }))]} {...form.register('crmCompanyId')} /><Select label="CRM contact" options={[{ value: '', label: 'Not linked' }, ...(crmContacts.data ?? []).map((x) => ({ value: x.id, label: `${x.firstName} ${x.lastName ?? ''}${x.crmCompany ? ` · ${x.crmCompany.name}` : ''}` }))]} {...form.register('crmContactId')} /></div></section>
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Project information</h2><div className="grid gap-4 md:grid-cols-2"><Input label="Project location" {...form.register('projectLocation')} /><Input label="City" {...form.register('city')} /><Input label="Area" {...form.register('area')} /><Input label="Expected start date" type="date" {...form.register('expectedStartDate')} /><Input label="Expected completion date" type="date" {...form.register('expectedCompletionDate')} /><Input label="Expected closing date" type="date" {...form.register('expectedClosingDate')} /></div><label className="mt-4 block space-y-1.5"><span className="text-sm font-medium text-slate-700">Description / requirements</span><textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...form.register('description')} /></label></section>
      <section className={section}><h2 className="mb-4 font-semibold text-slate-900">Financial</h2><Alert tone="info">The weighted pipeline value is computed by the server as Estimated value × Probability ÷ 100 with exact decimal arithmetic.</Alert><div className="mt-4 grid gap-4 md:grid-cols-2"><Input label="Estimated contract value" type="number" min="0" step="0.01" error={form.formState.errors.estimatedContractValue?.message} {...form.register('estimatedContractValue')} /><Input label="Currency" maxLength={3} error={form.formState.errors.currency?.message} {...form.register('currency')} /><Input label="Probability (%)" type="number" min="0" max="100" step="1" error={form.formState.errors.probability?.message} {...form.register('probability')} /></div></section>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : converting ? 'Convert lead' : edit ? 'Save changes' : 'Create opportunity'}</Button></div>
    </form>
  </div>;
}
