import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import {
  listProjects,
  listProjectStatuses,
  listProjectTypes,
} from '../../services/projects.service';
import type { Project } from '../../types/api';

export function ProjectListPage() {
  const { companyId = '' } = useParams();
  const [search, setSearch] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState('');
  const [projectTypeId, setProjectTypeId] = useState('');
  const [city, setCity] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const statusesQuery = useQuery({
    queryKey: ['project-statuses', companyId],
    queryFn: async () => (await listProjectStatuses(companyId)).data,
    enabled: Boolean(companyId),
  });

  const typesQuery = useQuery({
    queryKey: ['project-types', companyId],
    queryFn: async () => (await listProjectTypes(companyId)).data,
    enabled: Boolean(companyId),
  });

  const projectsQuery = useQuery({
    queryKey: [
      'projects',
      companyId,
      search,
      lifecycleStatus,
      projectTypeId,
      city,
      minBudget,
      maxBudget,
    ],
    queryFn: async () => {
      const response = await listProjects(companyId, {
        search: search || undefined,
        lifecycleStatus: lifecycleStatus || undefined,
        projectTypeId: projectTypeId || undefined,
        city: city || undefined,
        minBudget: minBudget ? Number(minBudget) : undefined,
        maxBudget: maxBudget ? Number(maxBudget) : undefined,
        limit: 50,
      });
      return {
        items: response.data,
        pagination: response.pagination,
      };
    },
    enabled: Boolean(companyId),
  });

  const lifecycleOptions = useMemo(() => {
    const codes = new Set(
      (statusesQuery.data ?? []).map((item) => item.lifecycle),
    );
    return Array.from(codes).sort();
  }, [statusesQuery.data]);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Lifecycle management for every construction job under this company."
        actions={
          <Link to={`/companies/${companyId}/projects/new`}>
            <Button>Create project</Button>
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          label="Search"
          placeholder="Code, name, city, address, contract #"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label="Lifecycle status"
          value={lifecycleStatus}
          onChange={(event) => setLifecycleStatus(event.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            ...lifecycleOptions.map((status) => ({
              value: status,
              label: status,
            })),
          ]}
        />
        <Select
          label="Project type"
          value={projectTypeId}
          onChange={(event) => setProjectTypeId(event.target.value)}
          options={[
            { value: '', label: 'All types' },
            ...(typesQuery.data ?? []).map((type) => ({
              value: type.id,
              label: type.name,
            })),
          ]}
        />
        <Input
          label="City"
          placeholder="Filter by city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />
        <Input
          label="Min budget"
          type="number"
          value={minBudget}
          onChange={(event) => setMinBudget(event.target.value)}
        />
        <Input
          label="Max budget"
          type="number"
          value={maxBudget}
          onChange={(event) => setMaxBudget(event.target.value)}
        />
      </div>

      <DataTable<Project>
        isLoading={projectsQuery.isLoading}
        rows={projectsQuery.data?.items ?? []}
        emptyMessage="No projects found. Create the first project to unlock BOQ, procurement, and site modules."
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (row) => (
              <span className="font-medium text-slate-900">
                {row.projectCode}
              </span>
            ),
          },
          {
            key: 'name',
            header: 'Project',
            render: (row) => (
              <div>
                <Link
                  to={`/companies/${companyId}/projects/${row.id}`}
                  className="font-medium text-primary-700 hover:underline"
                >
                  {row.projectName}
                </Link>
                <p className="text-xs text-slate-500">
                  {row.projectType?.name ?? '—'} · {row.city || row.country}
                </p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <Badge tone={statusTone(row.lifecycleStatus)}>
                {row.lifecycleStatus}
              </Badge>
            ),
          },
          {
            key: 'budget',
            header: 'Budget',
            render: (row) =>
              `${row.currency} ${Number(row.estimatedBudget).toLocaleString()}`,
          },
          {
            key: 'progress',
            header: 'Progress',
            render: (row) => `${Number(row.completionPercentage).toFixed(1)}%`,
          },
          {
            key: 'dates',
            header: 'Plan',
            render: (row) => (
              <span className="text-xs text-slate-600">
                {row.projectStartDate.slice(0, 10)} →{' '}
                {row.plannedCompletionDate.slice(0, 10)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
