import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge, statusTone } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { getCompanyDashboard } from '../../services/companies.service';
import { useAuthStore } from '../../store/auth.store';

function formatBytes(value: string | null | undefined): string {
  if (!value) {
    return '0 B';
  }
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function DashboardPage() {
  const { user, activeCompany } = useAuthStore();
  const companyId = activeCompany?.id;

  const dashboardQuery = useQuery({
    queryKey: ['company-dashboard', companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error('No active company');
      }
      const response = await getCompanyDashboard(companyId);
      return response.data;
    },
    enabled: Boolean(companyId),
  });

  return (
    <div>
      <PageHeader
        title="Operations overview"
        description={`Welcome back, ${user?.firstName ?? 'user'}.`}
        actions={
          activeCompany ? (
            <Link
              to={`/companies/${activeCompany.id}`}
              className="text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Open company profile
            </Link>
          ) : null
        }
      />

      {!companyId ? (
        <Alert tone="info">
          No active company context. Platform administrators can create or open
          a company from{' '}
          <Link to="/companies" className="font-medium underline">
            Companies
          </Link>
          .
        </Alert>
      ) : null}

      {dashboardQuery.isError ? (
        <Alert>
          Unable to load company dashboard. Confirm your membership and API
          connectivity.
        </Alert>
      ) : null}

      {dashboardQuery.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Branches',
                value: dashboardQuery.data.branchCount,
              },
              {
                label: 'Departments',
                value: dashboardQuery.data.departmentCount,
              },
              {
                label: 'Active employees',
                value: dashboardQuery.data.employeeCount,
              },
              {
                label: 'Storage used',
                value: formatBytes(dashboardQuery.data.storageUsage),
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border border-slate-200 bg-white px-4 py-5"
              >
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Company information
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Display name</dt>
                  <dd className="font-medium text-slate-900">
                    {dashboardQuery.data.company.displayName}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Company code</dt>
                  <dd className="font-medium text-slate-900">
                    {dashboardQuery.data.company.companyCode}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <Badge tone={statusTone(dashboardQuery.data.company.status)}>
                      {dashboardQuery.data.company.status}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Country / currency</dt>
                  <dd className="font-medium text-slate-900">
                    {dashboardQuery.data.company.country} ·{' '}
                    {dashboardQuery.data.company.currency}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                License & subscription
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Subscription</dt>
                  <dd>
                    <Badge
                      tone={statusTone(
                        dashboardQuery.data.subscriptionStatus,
                      )}
                    >
                      {dashboardQuery.data.subscriptionStatus}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Plan</dt>
                  <dd className="font-medium text-slate-900">
                    {dashboardQuery.data.license.plan ?? 'Not assigned'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Employee limit</dt>
                  <dd className="font-medium text-slate-900">
                    {dashboardQuery.data.license.employeeLimit ?? 'Unlimited'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Projects</dt>
                  <dd className="font-medium text-slate-900">
                    Unavailable until Project module ships
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Storage limit</dt>
                  <dd className="font-medium text-slate-900">
                    {formatBytes(dashboardQuery.data.license.storageLimit)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      ) : null}

      {companyId && dashboardQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
