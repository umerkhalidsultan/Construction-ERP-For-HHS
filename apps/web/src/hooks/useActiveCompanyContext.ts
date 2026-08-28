import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getCompany, listCompanies } from '../services/companies.service';
import { useAuthStore } from '../store/auth.store';
import type { AuthCompany, Company } from '../types/api';

const toAuthCompany = (company: Company): AuthCompany => ({
  id: company.id,
  companyCode: company.companyCode,
  displayName: company.displayName,
  status: company.status,
});

/**
 * Keeps the single Zustand `activeCompany` in sync with the company the user is
 * actually working in.
 *
 * The login response only carries an active company when the user has a
 * `CompanyMembership`; a platform administrator has none, so it comes back null
 * and every authenticated surface would otherwise believe no company is
 * selected. Rather than trusting a client-held id, both branches below resolve
 * the company through the API so the server re-validates access:
 *
 * - A `:companyId` route param is confirmed with `GET /companies/:companyId`,
 *   which runs `assertCompanyAccess` server-side. A cross-tenant id fails there
 *   and is never adopted.
 * - With no route param and no active company, `GET /companies` returns only
 *   the companies the principal may see (platform admins all, members their
 *   own), so adopting the first entry cannot leak another tenant.
 */
export function useActiveCompanyContext(): void {
  const params = useParams();
  const routeCompanyId = params.companyId;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeCompany = useAuthStore((state) => state.activeCompany);
  const setActiveCompany = useAuthStore((state) => state.setActiveCompany);
  // The React Query cache is not cleared on logout, so both keys are scoped by
  // user id. Without this a second user signing in on the same browser could
  // read the previous user's cached resolution before the server refetch lands.
  const userId = useAuthStore((state) => state.user?.id);

  const needsRouteSync = Boolean(
    isAuthenticated && routeCompanyId && routeCompanyId !== activeCompany?.id,
  );
  const needsFallback = Boolean(
    isAuthenticated && !routeCompanyId && !activeCompany,
  );

  const routeCompany = useQuery({
    queryKey: ['active-company-context', userId, routeCompanyId],
    queryFn: async () => (await getCompany(routeCompanyId!)).data,
    enabled: needsRouteSync,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const fallbackCompany = useQuery({
    queryKey: ['active-company-fallback', userId],
    queryFn: async () => (await listCompanies({ limit: 1 })).data,
    enabled: needsFallback,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const company = routeCompany.data;
    if (!company || company.id !== routeCompanyId) {
      return;
    }
    if (company.id === activeCompany?.id) {
      return;
    }
    setActiveCompany(toAuthCompany(company));
  }, [routeCompany.data, routeCompanyId, activeCompany?.id, setActiveCompany]);

  useEffect(() => {
    if (!needsFallback) {
      return;
    }
    const company = fallbackCompany.data?.[0];
    if (!company) {
      return;
    }
    setActiveCompany(toAuthCompany(company));
  }, [fallbackCompany.data, needsFallback, setActiveCompany]);
}
