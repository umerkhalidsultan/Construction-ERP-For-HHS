import {
  Company,
  CompanyBranding,
  CompanySettings,
  CompanyStatus,
  CompanyType,
  SubscriptionStatus,
} from '@prisma/client';

export interface CompanyCreateData {
  legalName: string;
  displayName: string;
  email?: string;
  phone?: string;
  website?: string | null;
  industry?: string;
  companyType?: CompanyType;
  taxRegistrationNumber?: string;
  nationalTaxNumber?: string;
  registrationNumber?: string;
  currency: string;
  timezone: string;
  country: string;
  province?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  status?: CompanyStatus;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: string;
  employeeLimit?: number;
  projectLimit?: number;
  storageLimit?: number;
}

export type CompanyUpdateData = Partial<CompanyCreateData>;

export interface CompanyListCriteria {
  page: number;
  limit: number;
  search?: string;
  status?: CompanyStatus;
  subscriptionStatus?: SubscriptionStatus;
  includeDeleted: boolean;
  sortBy: 'displayName' | 'legalName' | 'companyCode' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  tenantCompanyId?: string;
}

export interface PaginatedCompanies {
  items: Company[];
  total: number;
  page: number;
  limit: number;
}

export interface CompanyDashboard {
  company: Company;
  branchCount: number;
  departmentCount: number;
  employeeCount: number;
  projectCount: number;
  projectModuleAvailable: boolean;
  storageUsage: string;
  subscriptionStatus: SubscriptionStatus;
  license: {
    plan: string | null;
    employeeLimit: number | null;
    projectLimit: number | null;
    storageLimit: string | null;
  };
}

export type CompanySettingsUpdateData = Partial<
  Omit<
    CompanySettings,
    | 'id'
    | 'companyId'
    | 'schemaVersion'
    | 'createdAt'
    | 'updatedAt'
    | 'createdBy'
    | 'updatedBy'
    | 'deletedAt'
  >
>;

export type CompanyBrandingUpdateData = Partial<
  Pick<
    CompanyBranding,
    'primaryColor' | 'secondaryColor' | 'accentColor' | 'theme'
  >
>;

export interface ICompanyRepository {
  create(data: CompanyCreateData, actorId: string): Promise<Company>;
  list(criteria: CompanyListCriteria): Promise<PaginatedCompanies>;
  findById(
    companyId: string,
    includeDeleted?: boolean,
  ): Promise<Company | null>;
  update(
    companyId: string,
    data: CompanyUpdateData,
    actorId: string,
  ): Promise<Company>;
  softDelete(companyId: string, actorId: string): Promise<Company>;
  restore(companyId: string, actorId: string): Promise<Company>;
  getSettings(companyId: string): Promise<CompanySettings | null>;
  updateSettings(
    companyId: string,
    data: CompanySettingsUpdateData,
    actorId: string,
  ): Promise<CompanySettings>;
  getBranding(companyId: string): Promise<CompanyBranding | null>;
  updateBranding(
    companyId: string,
    data: CompanyBrandingUpdateData,
    actorId: string,
  ): Promise<CompanyBranding>;
  dashboard(companyId: string): Promise<CompanyDashboard | null>;
}

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY');
