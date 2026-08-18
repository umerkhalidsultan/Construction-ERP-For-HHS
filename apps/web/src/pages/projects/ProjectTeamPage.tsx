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
  assignTeam,
  listTeam,
  unassignTeam,
} from '../../services/projects.service';
import type { ProjectTeamMember } from '../../types/api';

const ROLES = [
  'PROJECT_MANAGER',
  'SITE_ENGINEER',
  'QAQC_ENGINEER',
  'HSE_OFFICER',
  'PLANNING_ENGINEER',
  'PROCUREMENT_OFFICER',
  'STORE_KEEPER',
  'ACCOUNTANT',
  'SUBCONTRACTOR',
  'CONSULTANT',
  'CLIENT',
  'OTHER',
];

export function ProjectTeamPage() {
  const { companyId = '', projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [membershipId, setMembershipId] = useState('');
  const [role, setRole] = useState('SITE_ENGINEER');
  const [isPrimary, setIsPrimary] = useState(false);

  const teamQuery = useQuery({
    queryKey: ['project-team', companyId, projectId],
    queryFn: async () => (await listTeam(companyId, projectId)).data,
    enabled: Boolean(companyId && projectId),
  });

  const assignMutation = useMutation({
    mutationFn: async () =>
      assignTeam(companyId, projectId, { membershipId, role, isPrimary }),
    onSuccess: async () => {
      setMembershipId('');
      await queryClient.invalidateQueries({
        queryKey: ['project-team', companyId, projectId],
      });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (memberId: string) =>
      unassignTeam(companyId, projectId, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-team', companyId, projectId],
      });
    },
  });

  return (
    <div className="space-y-4">
      {assignMutation.error instanceof ApiError ? (
        <Alert>{assignMutation.error.message}</Alert>
      ) : null}

      <form
        className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          assignMutation.mutate();
        }}
      >
        <Input
          label="Membership ID"
          value={membershipId}
          onChange={(event) => setMembershipId(event.target.value)}
          required
        />
        <Select
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          options={ROLES.map((item) => ({ value: item, label: item }))}
        />
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(event) => setIsPrimary(event.target.checked)}
          />
          Primary for role
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={assignMutation.isPending}>
            Assign
          </Button>
        </div>
      </form>

      <DataTable<ProjectTeamMember>
        isLoading={teamQuery.isLoading}
        rows={teamQuery.data ?? []}
        emptyMessage="No team members assigned."
        columns={[
          {
            key: 'member',
            header: 'Member',
            render: (row) =>
              row.membership?.user
                ? `${row.membership.user.firstName} ${row.membership.user.lastName}`
                : row.membershipId,
          },
          {
            key: 'role',
            header: 'Role',
            render: (row) => <Badge tone="neutral">{row.role}</Badge>,
          },
          {
            key: 'primary',
            header: 'Primary',
            render: (row) => (row.isPrimary ? 'Yes' : 'No'),
          },
          {
            key: 'assigned',
            header: 'Assigned',
            render: (row) => new Date(row.assignedAt).toLocaleDateString(),
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <Button
                variant="ghost"
                onClick={() => unassignMutation.mutate(row.id)}
              >
                Unassign
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
