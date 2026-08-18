import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import type {
  CompanySettingsUpdateData,
  ICompanyRepository,
} from '../domain/company.repository';
import { COMPANY_REPOSITORY } from '../domain/company.repository';
import { CompanyQueryDto } from '../dto/company-query.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateBrandingDto } from '../dto/update-branding.dto';
import { UpdateCompanySettingsDto } from '../dto/update-company-settings.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { ICompaniesService } from './companies.service.interface';

@Injectable()
export class CompaniesService implements ICompaniesService {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly companies: ICompanyRepository,
  ) {}

  async create(dto: CreateCompanyDto, principal: AuthenticatedPrincipal) {
    if (!principal.isPlatformAdmin) {
      throw new ForbiddenException(
        'Only platform administrators can create companies',
      );
    }
    return this.companies.create(dto, principal.userId);
  }

  async list(query: CompanyQueryDto, principal: AuthenticatedPrincipal) {
    if (query.includeDeleted && !principal.isPlatformAdmin) {
      throw new ForbiddenException(
        'Only platform administrators can view archived companies',
      );
    }
    const result = await this.companies.list({
      ...query,
      tenantCompanyId: principal.isPlatformAdmin
        ? undefined
        : (principal.companyId ?? undefined),
    });
    return {
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async get(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    const company = await this.companies.findById(
      companyId,
      principal.isPlatformAdmin,
    );
    if (!company) {
      throw new NotFoundException('Company was not found');
    }
    return company;
  }

  async update(
    companyId: string,
    dto: UpdateCompanyDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.companies.update(companyId, dto, principal.userId);
  }

  async delete(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    return this.companies.softDelete(companyId, principal.userId);
  }

  async restore(companyId: string, principal: AuthenticatedPrincipal) {
    if (!principal.isPlatformAdmin) {
      throw new ForbiddenException(
        'Only platform administrators can restore companies',
      );
    }
    return this.companies.restore(companyId, principal.userId);
  }

  async getSettings(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    const settings = await this.companies.getSettings(companyId);
    if (!settings) {
      throw new NotFoundException('Company settings were not found');
    }
    return settings;
  }

  async updateSettings(
    companyId: string,
    dto: UpdateCompanySettingsDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    this.validateSettings(dto);
    return this.companies.updateSettings(
      companyId,
      dto as unknown as CompanySettingsUpdateData,
      principal.userId,
    );
  }

  async getBranding(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    const branding = await this.companies.getBranding(companyId);
    if (!branding) {
      throw new NotFoundException('Company branding was not found');
    }
    return branding;
  }

  async updateBranding(
    companyId: string,
    dto: UpdateBrandingDto,
    principal: AuthenticatedPrincipal,
  ) {
    this.assertCompanyAccess(companyId, principal);
    return this.companies.updateBranding(companyId, dto, principal.userId);
  }

  async dashboard(companyId: string, principal: AuthenticatedPrincipal) {
    this.assertCompanyAccess(companyId, principal);
    const dashboard = await this.companies.dashboard(companyId);
    if (!dashboard) {
      throw new NotFoundException('Company was not found');
    }
    return dashboard;
  }

  private assertCompanyAccess(
    companyId: string,
    principal: AuthenticatedPrincipal,
  ): void {
    if (!principal.isPlatformAdmin && principal.companyId !== companyId) {
      throw new ForbiddenException('Cross-company access is denied');
    }
  }

  private validateSettings(dto: UpdateCompanySettingsDto): void {
    if (dto.workingDays && dto.weekendDays) {
      const weekends = new Set(dto.weekendDays);
      if (dto.workingDays.some((day) => weekends.has(day))) {
        throw new UnprocessableEntityException(
          'Working days and weekend days cannot overlap',
        );
      }
    }
    if (
      dto.workingHoursStart &&
      dto.workingHoursEnd &&
      dto.workingHoursStart >= dto.workingHoursEnd
    ) {
      throw new UnprocessableEntityException(
        'Working-hours end must be later than the start',
      );
    }
  }
}
