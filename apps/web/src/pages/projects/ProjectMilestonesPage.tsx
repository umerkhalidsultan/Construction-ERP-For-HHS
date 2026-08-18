import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { ApiError } from '../../lib/api-client';
import {
  createMilestone,
  deleteMilestone,
  listMilestones,
} from '../../services/projects.service';
import type { ProjectMilestone } from '../../types/api';

export function ProjectMilestonesPage() {
  const { companyId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weightage, setWeightage] = useState('10');

  const milestonesQuery = useQuery({
    queryKey: ['project-milestones', companyId, projectId],
    queryFn: async () => (await listMilestones(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createMilestone(companyId, projectId, {
        name,
        targetDate,
        weightage: Number(weightage),
      }),
    onSuccess: async () => {
      setName('');
      await queryClient.invalidateQueries({
        queryKey: ['project-milestones', companyId, projectId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (milestoneId: string) =>
      deleteMilestone(companyId, projectId, milestoneId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-milestones', companyId, projectId],
      });
    },
  });

  return (
    <div className="space-y-4">
      {createMutation.error instanceof ApiError ? (
        <Alert>{createMutation.error.message}</Alert>
      ) : null}

      <form
        className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate();
        }}
      >
        <Input
          label="Milestone name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Input
          label="Target date"
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          required
        />
        <Input
          label="Weightage %"
          type="number"
          value={weightage}
          onChange={(event) => setWeightage(event.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" disabled={createMutation.isPending}>
            Add milestone
          </Button>
        </div>
      </form>

      <DataTable<ProjectMilestone>
        isLoading={milestonesQuery.isLoading}
        rows={milestonesQuery.data ?? []}
        emptyMessage="No milestones defined."
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (row) => row.name,
          },
          {
            key: 'target',
            header: 'Target',
            render: (row) => row.targetDate,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            ),
          },
          {
            key: 'weight',
            header: 'Weight',
            render: (row) => `${Number(row.weightage).toFixed(1)}%`,
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm('Delete milestone?')) {
                    deleteMutation.mutate(row.id);
                  }
                }}
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
