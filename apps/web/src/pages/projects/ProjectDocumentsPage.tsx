import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ApiError } from '../../lib/api-client';
import {
  createDocument,
  deleteDocument,
  listDocuments,
} from '../../services/projects.service';
import type { ProjectDocument } from '../../types/api';

const CATEGORIES = [
  'CONTRACTS',
  'DRAWINGS',
  'BOQ',
  'SPECIFICATIONS',
  'SITE_PHOTOS',
  'APPROVALS',
  'INVOICES',
  'PERMITS',
  'INSPECTION_REPORTS',
  'CERTIFICATES',
  'OTHER',
];

export function ProjectDocumentsPage() {
  const { companyId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('DRAWINGS');
  const [externalUrl, setExternalUrl] = useState('');
  const [versionLabel, setVersionLabel] = useState('1.0');

  const documentsQuery = useQuery({
    queryKey: ['project-documents', companyId, projectId],
    queryFn: async () => (await listDocuments(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createDocument(companyId, projectId, {
        title,
        category,
        externalUrl: externalUrl || undefined,
        versionLabel,
      }),
    onSuccess: async () => {
      setTitle('');
      setExternalUrl('');
      await queryClient.invalidateQueries({
        queryKey: ['project-documents', companyId, projectId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) =>
      deleteDocument(companyId, projectId, documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-documents', companyId, projectId],
      });
    },
  });

  return (
    <div className="space-y-4">
      {createMutation.error instanceof ApiError ? (
        <Alert>{createMutation.error.message}</Alert>
      ) : null}

      <form
        className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <Select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={CATEGORIES.map((item) => ({ value: item, label: item }))}
        />
        <Input
          label="Version"
          value={versionLabel}
          onChange={(event) => setVersionLabel(event.target.value)}
        />
        <Input
          label="External URL"
          value={externalUrl}
          onChange={(event) => setExternalUrl(event.target.value)}
          placeholder="https://…"
        />
        <div className="flex items-end">
          <Button type="submit" disabled={createMutation.isPending}>
            Register document
          </Button>
        </div>
      </form>

      <DataTable<ProjectDocument>
        isLoading={documentsQuery.isLoading}
        rows={documentsQuery.data ?? []}
        emptyMessage="No project documents registered yet. Version control uploads come next."
        columns={[
          {
            key: 'title',
            header: 'Title',
            render: (row) => row.title,
          },
          {
            key: 'category',
            header: 'Category',
            render: (row) => <Badge tone="neutral">{row.category}</Badge>,
          },
          {
            key: 'version',
            header: 'Version',
            render: (row) => row.versionLabel,
          },
          {
            key: 'url',
            header: 'Link',
            render: (row) =>
              row.externalUrl ? (
                <a
                  href={row.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-700 hover:underline"
                >
                  Open
                </a>
              ) : (
                '—'
              ),
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <Button
                variant="ghost"
                onClick={() => deleteMutation.mutate(row.id)}
              >
                Delete
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
