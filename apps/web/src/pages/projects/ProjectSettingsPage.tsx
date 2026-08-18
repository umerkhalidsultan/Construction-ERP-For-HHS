import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ApiError } from '../../lib/api-client';
import {
  assignProjectTag,
  createProjectTag,
  getProject,
  getProjectSettings,
  listProjectTags,
  unassignProjectTag,
  updateProjectSettings,
} from '../../services/projects.service';

const schema = z.object({
  workingHoursStart: z.string().min(4).max(5),
  workingHoursEnd: z.string().min(4).max(5),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  documentPrefix: z.string().optional(),
  defaultWarehouseId: z.string().optional(),
  defaultStoreId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProjectSettingsPage() {
  const { companyId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['project-settings', companyId, projectId],
    queryFn: async () => (await getProjectSettings(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      workingHoursStart: '08:00',
      workingHoursEnd: '17:00',
      timezone: 'UTC',
      currency: 'USD',
      documentPrefix: '',
      defaultWarehouseId: '',
      defaultStoreId: '',
    },
  });

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    form.reset({
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      timezone: settings.timezone,
      currency: settings.currency,
      documentPrefix: settings.documentPrefix ?? '',
      defaultWarehouseId: settings.defaultWarehouseId ?? '',
      defaultStoreId: settings.defaultStoreId ?? '',
    });
  }, [settingsQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) =>
      updateProjectSettings(companyId, projectId, {
        ...values,
        documentPrefix: values.documentPrefix || undefined,
        defaultWarehouseId: values.defaultWarehouseId || undefined,
        defaultStoreId: values.defaultStoreId || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-settings', companyId, projectId],
      });
    },
  });

  return (
    <div className="space-y-4">
      {mutation.error instanceof ApiError ? (
        <Alert>{mutation.error.message}</Alert>
      ) : null}
      {mutation.isSuccess ? (
        <Alert tone="success">Project settings saved.</Alert>
      ) : null}

      <form
        className="grid gap-4 border border-slate-200 bg-white p-5 md:grid-cols-2"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <Input
          label="Working hours start"
          {...form.register('workingHoursStart')}
        />
        <Input
          label="Working hours end"
          {...form.register('workingHoursEnd')}
        />
        <Input label="Timezone" {...form.register('timezone')} />
        <Input label="Project currency" {...form.register('currency')} />
        <Input
          label="Document prefix"
          {...form.register('documentPrefix')}
        />
        <Input
          label="Default warehouse ID"
          {...form.register('defaultWarehouseId')}
          placeholder="Future inventory module"
        />
        <Input
          label="Default store ID"
          {...form.register('defaultStoreId')}
          placeholder="Future inventory module"
        />
        <div className="md:col-span-2">
          <p className="mb-3 text-sm text-slate-500">
            Working days, notification settings, and approval flow JSON are
            available via API; UI editors for those maps will expand with the
            Approvals module.
          </p>
          <Button type="submit" disabled={mutation.isPending}>
            Save settings
          </Button>
        </div>
      </form>

      <ProjectTagsSection companyId={companyId} projectId={projectId} />
    </div>
  );
}

function ProjectTagsSection({
  companyId,
  projectId,
}: {
  companyId: string;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#2563eb');

  const projectQuery = useQuery({
    queryKey: ['project', companyId, projectId],
    queryFn: async () => (await getProject(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const catalogQuery = useQuery({
    queryKey: ['project-tags', companyId],
    queryFn: async () => (await listProjectTags(companyId)).data,
    enabled: Boolean(companyId),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['project', companyId, projectId],
      }),
      queryClient.invalidateQueries({ queryKey: ['project-tags', companyId] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      createProjectTag(companyId, {
        code: newTagName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
        name: newTagName.trim(),
        color: newTagColor,
      }),
    onSuccess: async () => {
      setNewTagName('');
      await invalidate();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (tagId: string) =>
      assignProjectTag(companyId, projectId, tagId),
    onSuccess: invalidate,
  });

  const unassignMutation = useMutation({
    mutationFn: async (tagId: string) =>
      unassignProjectTag(companyId, projectId, tagId),
    onSuccess: invalidate,
  });

  const assignedTagIds = new Set(
    (projectQuery.data?.tagAssignments ?? []).map((a) => a.tag.id),
  );

  return (
    <div className="space-y-4 border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Tags</h2>
        <p className="text-xs text-slate-500">
          Custom labels such as VIP Client, Fast Track, or Government to
          classify this project.
        </p>
      </div>

      {createMutation.error instanceof ApiError ? (
        <Alert>{createMutation.error.message}</Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(catalogQuery.data ?? []).map((tag) => {
          const assigned = assignedTagIds.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() =>
                assigned
                  ? unassignMutation.mutate(tag.id)
                  : assignMutation.mutate(tag.id)
              }
              disabled={assignMutation.isPending || unassignMutation.isPending}
              title={assigned ? 'Click to remove from project' : 'Click to assign to project'}
            >
              <Badge tone={assigned ? 'green' : 'slate'}>{tag.name}</Badge>
            </button>
          );
        })}
        {(catalogQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">
            No tags defined for this company yet.
          </p>
        ) : null}
      </div>

      <div className="flex items-end gap-3">
        <Input
          label="New tag name"
          placeholder="e.g. High Priority"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
        />
        <input
          type="color"
          value={newTagColor}
          onChange={(event) => setNewTagColor(event.target.value)}
          className="h-10 w-12 border border-slate-300"
          aria-label="Tag color"
        />
        <Button
          type="button"
          disabled={!newTagName.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          Add tag
        </Button>
      </div>
    </div>
  );
}
