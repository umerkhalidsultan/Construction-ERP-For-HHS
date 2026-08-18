import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { ApiError } from '../../lib/api-client';
import {
  createDocumentSequence,
  listDocumentSequences,
} from '../../services/companies.service';
import type { DocumentSequence } from '../../types/api';

const schema = z.object({
  documentType: z.string().regex(/^[A-Z][A-Z0-9_]{1,49}$/),
  prefixTemplate: z.string().min(2).max(100),
  padding: z.coerce.number().min(2).max(12),
  resetPolicy: z.enum(['NEVER', 'YEARLY', 'FISCAL_YEARLY', 'MONTHLY']),
});

type FormValues = z.infer<typeof schema>;

export function DocumentNumberingPage() {
  const { companyId = '' } = useParams();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      documentType: 'PR',
      prefixTemplate: 'PR-{YYYY}-',
      padding: 6,
      resetPolicy: 'YEARLY',
    },
  });

  const listQuery = useQuery({
    queryKey: ['document-sequences', companyId],
    queryFn: async () => (await listDocumentSequences(companyId)).data,
    enabled: Boolean(companyId),
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) =>
      createDocumentSequence(companyId, values),
    onSuccess: async () => {
      form.reset({
        documentType: 'PR',
        prefixTemplate: 'PR-{YYYY}-',
        padding: 6,
        resetPolicy: 'YEARLY',
      });
      await queryClient.invalidateQueries({
        queryKey: ['document-sequences', companyId],
      });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Document numbering"
        description="Configurable prefixes and concurrency-safe sequences for PR, PO, INV, PROJ, and EMP documents."
      />

      {createMutation.isError ? (
        <Alert>
          {createMutation.error instanceof ApiError
            ? createMutation.error.message
            : 'Unable to create numbering rule'}
        </Alert>
      ) : null}

      <form
        className="grid gap-4 border border-slate-200 bg-white p-5 md:grid-cols-2"
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <Input
          label="Document type"
          error={form.formState.errors.documentType?.message}
          {...form.register('documentType')}
        />
        <Input
          label="Prefix template"
          error={form.formState.errors.prefixTemplate?.message}
          {...form.register('prefixTemplate')}
        />
        <Input
          label="Padding"
          type="number"
          {...form.register('padding')}
        />
        <Select
          label="Reset policy"
          options={[
            { label: 'Never', value: 'NEVER' },
            { label: 'Yearly', value: 'YEARLY' },
            { label: 'Fiscal yearly', value: 'FISCAL_YEARLY' },
            { label: 'Monthly', value: 'MONTHLY' },
          ]}
          {...form.register('resetPolicy')}
        />
        <div className="md:col-span-2">
          <p className="mb-3 text-xs text-slate-500">
            Supported tokens: {'{YYYY}'}, {'{YY}'}, {'{MM}'}, {'{FY}'},{' '}
            {'{BRANCH}'}
          </p>
          <Button type="submit" disabled={createMutation.isPending}>
            Add numbering rule
          </Button>
        </div>
      </form>

      <DataTable<DocumentSequence>
        isLoading={listQuery.isLoading}
        rows={listQuery.data ?? []}
        columns={[
          {
            key: 'type',
            header: 'Type',
            render: (row) => row.documentType,
          },
          {
            key: 'prefix',
            header: 'Prefix template',
            render: (row) => row.prefixTemplate,
          },
          {
            key: 'next',
            header: 'Next number',
            render: (row) => row.nextNumber,
          },
          {
            key: 'reset',
            header: 'Reset',
            render: (row) => row.resetPolicy,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
