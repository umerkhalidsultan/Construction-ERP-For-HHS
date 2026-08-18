import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { ApiError } from '../../lib/api-client';
import {
  createProject,
  getProject,
  listProjectTypes,
  updateProject,
} from '../../services/projects.service';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  projectName: z.string().min(2).max(255),
  projectShortName: z.string().max(80).optional().or(z.literal('')),
  projectTypeId: z.string().uuid(),
  constructionTypeId: z.string().uuid().optional().or(z.literal('')),
  priority: z.string().min(1),
  projectManagerId: z.string().uuid(),
  siteEngineerId: z.string().uuid().optional().or(z.literal('')),
  estimatedBudget: z.coerce.number().min(0.01),
  approvedBudget: z.coerce.number().min(0).optional().or(z.nan()),
  currency: z.string().length(3),
  contractType: z.string().min(1),
  contractNumber: z.string().optional(),
  projectStartDate: z.string().min(1),
  plannedCompletionDate: z.string().min(1),
  address: z.string().optional(),
  area: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().length(2),
  latitude: z.coerce.number().optional().or(z.nan()),
  longitude: z.coerce.number().optional().or(z.nan()),
  projectDescription: z.string().optional(),
  scopeOfWork: z.string().optional(),
  remarks: z.string().optional(),
  seedDefaultPhases: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProjectFormPage() {
  const { companyId = '', projectId } = useParams();
  const isEdit = Boolean(projectId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const membershipId = useAuthStore(
    (state) =>
      state.memberships.find((item) => item.company.id === companyId)?.id,
  );

  const typesQuery = useQuery({
    queryKey: ['project-types', companyId],
    queryFn: async () => (await listProjectTypes(companyId)).data,
    enabled: Boolean(companyId),
  });

  const projectQuery = useQuery({
    queryKey: ['project', companyId, projectId],
    queryFn: async () => (await getProject(companyId, projectId!)).data,
    enabled: isEdit,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectName: '',
      projectShortName: '',
      projectTypeId: '',
      constructionTypeId: '',
      priority: 'MEDIUM',
      projectManagerId: membershipId ?? '',
      siteEngineerId: '',
      estimatedBudget: 1000000,
      currency: 'USD',
      contractType: 'LUMP_SUM',
      contractNumber: '',
      projectStartDate: new Date().toISOString().slice(0, 10),
      plannedCompletionDate: new Date(Date.now() + 180 * 86400000)
        .toISOString()
        .slice(0, 10),
      address: '',
      area: '',
      city: '',
      province: '',
      country: 'PK',
      projectDescription: '',
      scopeOfWork: '',
      remarks: '',
      seedDefaultPhases: true,
    },
  });

  useEffect(() => {
    if (membershipId && !isEdit) {
      form.setValue('projectManagerId', membershipId);
    }
  }, [membershipId, isEdit, form]);

  useEffect(() => {
    const project = projectQuery.data;
    if (!project) return;
    form.reset({
      projectName: project.projectName,
      projectShortName: project.projectShortName ?? '',
      projectTypeId: project.projectTypeId,
      constructionTypeId: project.constructionTypeId ?? '',
      priority: project.priority,
      projectManagerId: project.projectManagerId,
      siteEngineerId: project.siteEngineerId ?? '',
      estimatedBudget: Number(project.estimatedBudget),
      approvedBudget: project.approvedBudget
        ? Number(project.approvedBudget)
        : undefined,
      currency: project.currency,
      contractType: project.contractType,
      contractNumber: project.contractNumber ?? '',
      projectStartDate: project.projectStartDate.slice(0, 10),
      plannedCompletionDate: project.plannedCompletionDate.slice(0, 10),
      address: project.address ?? '',
      area: project.area ?? '',
      city: project.city ?? '',
      province: project.province ?? '',
      country: project.country,
      latitude: project.latitude ? Number(project.latitude) : undefined,
      longitude: project.longitude ? Number(project.longitude) : undefined,
      projectDescription: project.projectDescription ?? '',
      scopeOfWork: project.scopeOfWork ?? '',
      remarks: project.remarks ?? '',
    });
  }, [projectQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        ...values,
        constructionTypeId: values.constructionTypeId || undefined,
        siteEngineerId: values.siteEngineerId || undefined,
        approvedBudget: Number.isFinite(values.approvedBudget)
          ? values.approvedBudget
          : undefined,
        latitude: Number.isFinite(values.latitude)
          ? values.latitude
          : undefined,
        longitude: Number.isFinite(values.longitude)
          ? values.longitude
          : undefined,
        projectShortName: values.projectShortName || undefined,
      };
      if (isEdit) {
        return updateProject(companyId, projectId!, body);
      }
      return createProject(companyId, body);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['projects', companyId] });
      navigate(`/companies/${companyId}/projects/${response.data.id}`);
    },
  });

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit project' : 'Create project'}
        description="Projects are the parent record for BOQ, procurement, inventory, labor, and site reporting."
      />

      {mutation.error instanceof ApiError ? (
        <div className="mb-4">
          <Alert>{mutation.error.message}</Alert>
        </div>
      ) : null}

      <form
        className="space-y-4 border border-slate-200 bg-white p-5"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Project name" {...form.register('projectName')} />
          <Input
            label="Short name"
            {...form.register('projectShortName')}
          />
          <Select
            label="Project type"
            options={[
              { value: '', label: 'Select type' },
              ...(typesQuery.data ?? []).map((type) => ({
                value: type.id,
                label: type.name,
              })),
            ]}
            {...form.register('projectTypeId')}
          />
          <Select
            label="Priority"
            options={[
              { value: 'LOW', label: 'LOW' },
              { value: 'MEDIUM', label: 'MEDIUM' },
              { value: 'HIGH', label: 'HIGH' },
              { value: 'CRITICAL', label: 'CRITICAL' },
            ]}
            {...form.register('priority')}
          />
          <Input
            label="Project manager membership ID"
            {...form.register('projectManagerId')}
          />
          <Input
            label="Site engineer membership ID"
            {...form.register('siteEngineerId')}
          />
          <Input
            label="Estimated budget"
            type="number"
            step="0.01"
            {...form.register('estimatedBudget')}
          />
          <Input
            label="Approved budget"
            type="number"
            step="0.01"
            {...form.register('approvedBudget')}
          />
          <Input label="Currency" {...form.register('currency')} />
          <Select
            label="Contract type"
            options={[
              { value: 'LUMP_SUM', label: 'LUMP_SUM' },
              { value: 'UNIT_RATE', label: 'UNIT_RATE' },
              { value: 'COST_PLUS', label: 'COST_PLUS' },
              { value: 'EPC', label: 'EPC' },
              { value: 'DESIGN_BUILD', label: 'DESIGN_BUILD' },
              { value: 'TURNKEY', label: 'TURNKEY' },
              { value: 'REMEASUREMENT', label: 'REMEASUREMENT' },
              { value: 'OTHER', label: 'OTHER' },
            ]}
            {...form.register('contractType')}
          />
          <Input
            label="Contract number"
            {...form.register('contractNumber')}
          />
          <Input
            label="Start date"
            type="date"
            {...form.register('projectStartDate')}
          />
          <Input
            label="Planned completion"
            type="date"
            {...form.register('plannedCompletionDate')}
          />
          <Input label="Country (ISO2)" {...form.register('country')} />
          <Input label="Province" {...form.register('province')} />
          <Input label="City" {...form.register('city')} />
          <Input label="Area" {...form.register('area')} />
          <Input label="Address" {...form.register('address')} />
          <Input
            label="Latitude"
            type="number"
            step="any"
            {...form.register('latitude')}
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            {...form.register('longitude')}
          />
        </div>
        <Input
          label="Description"
          {...form.register('projectDescription')}
        />
        <Input label="Scope of work" {...form.register('scopeOfWork')} />
        <Input label="Remarks" {...form.register('remarks')} />
        {!isEdit ? (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...form.register('seedDefaultPhases')} />
            Seed standard construction phases
          </label>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Create project'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/companies/${companyId}/projects`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
