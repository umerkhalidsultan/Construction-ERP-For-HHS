import { useQuery } from '@tanstack/react-query';
import { Network, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { workforceApi } from '../../services/workforce.service';
import type { EmployeeSummary } from '../../types/api';
import { userErrorMessage } from '../../lib/api-client';

const statuses = [
  'ACTIVE',
  'PROBATION',
  'ON_LEAVE',
  'SUSPENDED',
  'RESIGNED',
  'TERMINATED',
  'INACTIVE',
];
const availabilityOptions = [
  'AVAILABLE',
  'ASSIGNED',
  'ON_LEAVE',
  'TRAINING',
  'SUSPENDED',
  'INACTIVE',
];

export function EmployeeListPage() {
  const { companyId = '' } = useParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [availability, setAvailability] = useState('');

  const employees = useQuery({
    queryKey: ['employees', companyId, search, status, availability],
    queryFn: async () =>
      workforceApi.listEmployees(companyId, {
        search: search || undefined,
        status: status || undefined,
        availability: availability || undefined,
        limit: 100,
      }),
    enabled: Boolean(companyId),
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Workforce directory, employment placement, skills, credentials, and project availability."
        actions={
          <div className="flex gap-2">
            <Link to={`/companies/${companyId}/workforce/organization-chart`}>
              <Button variant="secondary">
                <Network className="h-4 w-4" />
                Org chart
              </Button>
            </Link>
            <Link to={`/companies/${companyId}/employees/new`}>
              <Button>
                <Plus className="h-4 w-4" />
                Add employee
              </Button>
            </Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-slate-400" />
          <Input
            label="Search"
            className="pl-9"
            placeholder="Name, code, email, skill, project"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          label="Employment status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            ...statuses.map((value) => ({
              value,
              label: value.replaceAll('_', ' '),
            })),
          ]}
        />
        <Select
          label="Availability"
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
          options={[
            { value: '', label: 'All availability' },
            ...availabilityOptions.map((value) => ({
              value,
              label: value.replaceAll('_', ' '),
            })),
          ]}
        />
      </div>
      <DataTable<EmployeeSummary>
        isLoading={employees.isLoading}
        error={employees.isError ? userErrorMessage(employees.error) : null}
        onRetry={() => void employees.refetch()}
        rows={employees.data?.data ?? []}
        emptyMessage="No employees have been added yet."
        columns={[
          {
            key: 'employee',
            header: 'Employee',
            render: (row) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-800">
                  {row.firstName[0]}
                  {row.lastName[0]}
                </div>
                <div>
                  <Link
                    className="font-medium text-primary-700 hover:underline"
                    to={`/companies/${companyId}/employees/${row.id}`}
                  >
                    {row.preferredName || `${row.firstName} ${row.lastName}`}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {row.employeeCode} ·{' '}
                    {row.companyEmail || row.phone || 'No contact'}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'Placement',
            render: (row) => (
              <div>
                <p>{row.designation?.name ?? '—'}</p>
                <p className="text-xs text-slate-500">
                  {row.department?.name ?? 'No department'}
                </p>
              </div>
            ),
          },
          {
            key: 'manager',
            header: 'Manager',
            render: (row) =>
              row.manager
                ? `${row.manager.firstName} ${row.manager.lastName}`
                : '—',
          },
          {
            key: 'skills',
            header: 'Skills',
            render: (row) => (
              <div className="flex max-w-xs flex-wrap gap-1">
                {row.skills.slice(0, 3).map(({ skill }) => (
                  <Badge key={skill.id}>{skill.name}</Badge>
                ))}
                {row.skills.length > 3 ? (
                  <span className="text-xs text-slate-500">
                    +{row.skills.length - 3}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: 'availability',
            header: 'Availability',
            render: (row) => (
              <Badge tone={statusTone(row.availability)}>
                {row.availability.replaceAll('_', ' ')}
              </Badge>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <Badge tone={statusTone(row.status)}>
                {row.status.replaceAll('_', ' ')}
              </Badge>
            ),
          },
        ]}
      />
      {employees.data?.pagination ? (
        <p className="mt-3 text-xs text-slate-500">
          {employees.data.pagination.total} employee
          {employees.data.pagination.total === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  );
}
