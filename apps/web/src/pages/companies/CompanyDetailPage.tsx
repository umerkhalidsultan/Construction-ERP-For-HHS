import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { ApiError } from '../../lib/api-client';
import {
  deleteCompany,
  getCompany,
  getCompanyDashboard,
  restoreCompany,
} from '../../services/companies.service';
import { useAuthStore } from '../../store/auth.store';

export function CompanyDetailPage() {
  const { companyId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveCompany = useAuthStore((state) => state.setActiveCompany);
  const isPlatformAdmin = useAuthStore((state) => state.user?.isPlatformAdmin);

  const companyQuery = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => (await getCompany(companyId)).data,
    enabled: Boolean(companyId),
  });

  const dashboardQuery = useQuery({
    queryKey: ['company-dashboard', companyId],
    queryFn: async () => (await getCompanyDashboard(companyId)).data,
    enabled: Boolean(companyId),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => deleteCompany(companyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => restoreCompany(companyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
  });

  const company = companyQuery.data;

  if (companyQuery.isLoading) {
    return <div className="h-40 animate-pulse border border-slate-200 bg-white" />;
  }

  if (!company) {
    return <Alert>Company was not found.</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.displayName}
        description={`${company.companyCode} · ${company.legalName}`}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveCompany({
                  id: company.id,
                  companyCode: company.companyCode,
                  displayName: company.displayName,
                  status: company.status,
                });
                navigate('/dashboard');
              }}
            >
              Set active
            </Button>
            <Link to={`/companies/${company.id}/projects`}>
              <Button>Projects</Button>
            </Link>
            <Link to={`/companies/${company.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            {isPlatformAdmin && !company.deletedAt ? (
              <Button
                variant="danger"
                disabled={archiveMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      'Archive this company? Active memberships will be deactivated.',
                    )
                  ) {
                    archiveMutation.mutate();
                  }
                }}
              >
                Archive
              </Button>
            ) : null}
            {isPlatformAdmin && company.deletedAt ? (
              <Button
                disabled={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate()}
              >
                Restore
              </Button>
            ) : null}
          </>
        }
      />

      {(archiveMutation.isError || restoreMutation.isError) && (
        <Alert>
          {(archiveMutation.error ?? restoreMutation.error) instanceof ApiError
            ? ((archiveMutation.error ?? restoreMutation.error) as ApiError)
                .message
            : 'Company mutation failed'}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="border border-slate-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Email', company.email ?? '—'],
              ['Phone', company.phone ?? '—'],
              ['Website', company.website ?? '—'],
              ['Industry', company.industry ?? '—'],
              ['Type', company.companyType],
              ['Timezone', company.timezone],
              ['Currency', company.currency],
              ['Country', company.country],
              ['Province', company.province ?? '—'],
              ['City', company.city ?? '—'],
              ['Postal code', company.postalCode ?? '—'],
              ['Tax registration', company.taxRegistrationNumber ?? '—'],
              ['National tax', company.nationalTaxNumber ?? '—'],
              ['Registration no.', company.registrationNumber ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-slate-600">
            {company.address ?? 'No address recorded.'}
          </p>
        </section>

        <section className="space-y-4">
          <div className="border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={statusTone(company.status)}>{company.status}</Badge>
              <Badge tone={statusTone(company.subscriptionStatus)}>
                {company.subscriptionStatus}
              </Badge>
            </div>
          </div>
          <div className="border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Organization snapshot
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Branches</dt>
                <dd className="font-medium">
                  {dashboardQuery.data?.branchCount ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Departments</dt>
                <dd className="font-medium">
                  {dashboardQuery.data?.departmentCount ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Employees</dt>
                <dd className="font-medium">
                  {dashboardQuery.data?.employeeCount ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Projects</dt>
                <dd className="font-medium">
                  {dashboardQuery.data?.projectCount ?? '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-2 text-sm">
              <Link
                className="text-primary-700 hover:underline"
                to={`/companies/${company.id}/projects`}
              >
                Manage projects
              </Link>
              <Link
                className="text-primary-700 hover:underline"
                to={`/companies/${company.id}/branches`}
              >
                Manage branches
              </Link>
              <Link
                className="text-primary-700 hover:underline"
                to={`/companies/${company.id}/settings`}
              >
                Company settings
              </Link>
              <Link
                className="text-primary-700 hover:underline"
                to={`/companies/${company.id}/branding`}
              >
                Branding
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
