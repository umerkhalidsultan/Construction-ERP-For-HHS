import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { CompanyQueryDto } from '../dto/company-query.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateBrandingDto } from '../dto/update-branding.dto';
import { UpdateCompanySettingsDto } from '../dto/update-company-settings.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

export interface ICompaniesService {
  create(
    dto: CreateCompanyDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  list(
    query: CompanyQueryDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  get(companyId: string, principal: AuthenticatedPrincipal): Promise<unknown>;
  update(
    companyId: string,
    dto: UpdateCompanyDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  delete(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  restore(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  getSettings(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateSettings(
    companyId: string,
    dto: UpdateCompanySettingsDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  getBranding(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  updateBranding(
    companyId: string,
    dto: UpdateBrandingDto,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
  dashboard(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<unknown>;
}

export const COMPANIES_SERVICE = Symbol('COMPANIES_SERVICE');
