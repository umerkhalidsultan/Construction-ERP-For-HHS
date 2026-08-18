import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, statusTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { listCompanies } from '../../services/companies.service';
import { useAuthStore } from '../../store/auth.store';
import type { Company } from '../../types/api';
import { userErrorMessage } from '../../lib/api-client';

export function CompanyListPage() {
  const [search, setSearch] = useState('');
  const isPlatformAdmin = useAuthStore((state) => state.user?.isPlatformAdmin);

  const companiesQuery = useQuery({
    queryKey: ['companies', search],
    queryFn: async () => {
      const response = await listCompanies({
        search: search || undefined,
        limit: 50,
      });
      return {
        items: response.data,
        pagination: response.pagination,
      };
    },
  });

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Tenant organizations that own projects, employees, and documents."
        actions={
          isPlatformAdmin ? (
            <Link to="/companies/new">
              <Button>Create company</Button>
            </Link>
          ) : null
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          label="Search"
          placeholder="Name or company code"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <DataTable<Company>
        isLoading={companiesQuery.isLoading}
        error={
          companiesQuery.isError
            ? userErrorMessage(companiesQuery.error)
            : null
        }
        onRetry={() => void companiesQuery.refetch()}
        rows={companiesQuery.data?.items ?? []}
        emptyMessage="No companies available for your account."
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (row) => (
              <span className="font-medium text-slate-900">
                {row.companyCode}
              </span>
            ),
          },
          {
            key: 'name',
            header: 'Company',
            render: (row) => (
              <div>
                <Link
                  to={`/companies/${row.id}`}
                  className="font-medium text-primary-700 hover:underline"
                >
                  {row.displayName}
                </Link>
                <p className="text-xs text-slate-500">{row.legalName}</p>
              </div>
            ),
          },
          {
            key: 'country',
            header: 'Country',
            render: (row) => row.country,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            ),
          },
          {
            key: 'subscription',
            header: 'Subscription',
            render: (row) => (
              <Badge tone={statusTone(row.subscriptionStatus)}>
                {row.subscriptionStatus}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
