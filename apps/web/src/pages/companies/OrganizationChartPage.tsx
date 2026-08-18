import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { PageHeader } from '../../components/ui/PageHeader';
import { getOrganizationChart } from '../../services/companies.service';
import type { OrganizationChartNode } from '../../types/api';

function ChartNode({ node }: { node: OrganizationChartNode }) {
  return (
    <li className="space-y-3">
      <div className="border border-slate-200 bg-white px-4 py-3">
        <p className="font-medium text-slate-900">
          {node.user.firstName} {node.user.lastName}
        </p>
        <p className="text-sm text-slate-500">
          {node.designation?.name ?? 'No designation'}
          {node.department ? ` · ${node.department.name}` : ''}
          {node.branch ? ` · ${node.branch.name}` : ''}
        </p>
        {node.employeeCode ? (
          <p className="mt-1 text-xs text-slate-400">{node.employeeCode}</p>
        ) : null}
      </div>
      {node.reports.length ? (
        <ul className="ml-6 space-y-3 border-l border-slate-200 pl-4">
          {node.reports.map((child) => (
            <ChartNode key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function OrganizationChartPage() {
  const { companyId = '' } = useParams();
  const chartQuery = useQuery({
    queryKey: ['organization-chart', companyId],
    queryFn: async () => (await getOrganizationChart(companyId)).data,
    enabled: Boolean(companyId),
  });

  return (
    <div>
      <PageHeader
        title="Organization chart"
        description="Primary reporting hierarchy derived from membership reporting lines."
      />

      {chartQuery.isError ? (
        <Alert>Unable to load organization chart.</Alert>
      ) : null}

      {chartQuery.isLoading ? (
        <div className="h-40 animate-pulse border border-slate-200 bg-white" />
      ) : null}

      {chartQuery.data && !chartQuery.data.roots.length ? (
        <Alert tone="info">
          No active memberships with reporting relationships are available yet.
        </Alert>
      ) : null}

      {chartQuery.data?.roots.length ? (
        <ul className="space-y-4">
          {chartQuery.data.roots.map((root) => (
            <ChartNode key={root.id} node={root} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
