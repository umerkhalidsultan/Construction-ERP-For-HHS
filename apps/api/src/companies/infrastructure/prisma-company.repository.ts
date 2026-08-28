import { Injectable } from '@nestjs/common';
import {
  Company,
  CompanyBranding,
  CompanySettings,
  CompanyStatus,
  EntityStatus,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { persistWebsiteUrl } from '../../common/utils/website-url';
import { PERMISSIONS } from '../../permissions/permission.constants';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CompanyBrandingUpdateData,
  CompanyCreateData,
  CompanyDashboard,
  CompanyListCriteria,
  CompanySettingsUpdateData,
  CompanyUpdateData,
  ICompanyRepository,
  PaginatedCompanies,
} from '../domain/company.repository';

const DEFAULT_DESIGNATIONS = [
  'CEO',
  'Director',
  'Project Manager',
  'Site Engineer',
  'Quantity Surveyor',
  'Procurement Officer',
  'Store Keeper',
  'HR',
  'Accountant',
  'HSE Officer',
  'QAQC Engineer',
  'Supervisor',
  'Labor',
] as const;

const DEFAULT_SEQUENCES = [
  ['PR', 'PR-{YYYY}-'],
  ['PO', 'PO-{YYYY}-'],
  ['INV', 'INV-{YYYY}-'],
  ['PROJ', 'PROJ-{YYYY}-'],
  ['TENDER', 'TND-{YYYY}-'],
  ['EMP', 'EMP-{YYYY}-'],
] as const;

@Injectable()
export class PrismaCompanyRepository implements ICompanyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(data: CompanyCreateData, actorId: string): Promise<Company> {
    return this.prisma.$transaction(async (transaction) => {
      const companyCode = await this.nextCompanyCode(transaction);
      const company = await transaction.company.create({
        data: {
          companyCode,
          legalName: data.legalName.trim(),
          displayName: data.displayName.trim(),
          email: data.email?.trim().toLowerCase(),
          phone: data.phone?.trim(),
          website: persistWebsiteUrl(data.website) ?? undefined,
          industry: data.industry?.trim(),
          companyType: data.companyType,
          taxRegistrationNumber: this.normalizeIdentifier(
            data.taxRegistrationNumber,
          ),
          nationalTaxNumber: this.normalizeIdentifier(data.nationalTaxNumber),
          registrationNumber: this.normalizeIdentifier(data.registrationNumber),
          currency: data.currency.toUpperCase(),
          timezone: data.timezone,
          country: data.country.toUpperCase(),
          province: data.province?.trim(),
          city: data.city?.trim(),
          postalCode: data.postalCode?.trim(),
          address: data.address?.trim(),
          status: data.status,
          subscriptionStatus: data.subscriptionStatus,
          subscriptionPlan: data.subscriptionPlan?.trim(),
          employeeLimit: data.employeeLimit,
          projectLimit: data.projectLimit,
          storageLimit:
            data.storageLimit === undefined
              ? undefined
              : BigInt(data.storageLimit),
          createdBy: actorId,
          updatedBy: actorId,
          settings: {
            create: {
              currency: data.currency.toUpperCase(),
              createdBy: actorId,
              updatedBy: actorId,
            },
          },
          branding: {
            create: {
              createdBy: actorId,
              updatedBy: actorId,
            },
          },
        },
      });

      await transaction.designation.createMany({
        data: DEFAULT_DESIGNATIONS.map((name, index) => ({
          companyId: company.id,
          code: name.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
          name,
          rank: index + 1,
          isDefault: true,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });

      await transaction.documentSequence.createMany({
        data: DEFAULT_SEQUENCES.map(([documentType, prefixTemplate]) => ({
          companyId: company.id,
          documentType,
          prefixTemplate,
          createdBy: actorId,
          updatedBy: actorId,
        })),
      });

      const permissions = await transaction.permission.findMany({
        where: {
          code: { in: Object.values(PERMISSIONS) },
          deletedAt: null,
        },
        select: { id: true },
      });
      await transaction.role.create({
        data: {
          companyId: company.id,
          name: 'Company Admin',
          description: 'Full administration access within this company',
          isSystem: true,
          createdBy: actorId,
          updatedBy: actorId,
          permissions: {
            create: permissions.map((permission) => ({
              permissionId: permission.id,
              createdBy: actorId,
              updatedBy: actorId,
            })),
          },
        },
      });

      await this.audit.record(transaction, {
        companyId: company.id,
        action: 'Company.Create',
        entity: 'Company',
        entityId: company.id,
        newValue: company,
      });
      return company;
    });
  }

  async list(criteria: CompanyListCriteria): Promise<PaginatedCompanies> {
    const where: Prisma.CompanyWhereInput = {
      ...(criteria.tenantCompanyId
        ? { id: criteria.tenantCompanyId }
        : undefined),
      ...(criteria.includeDeleted ? undefined : { deletedAt: null }),
      status: criteria.status,
      subscriptionStatus: criteria.subscriptionStatus,
      ...(criteria.search
        ? {
            OR: [
              {
                companyCode: {
                  contains: criteria.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                legalName: {
                  contains: criteria.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                displayName: {
                  contains: criteria.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : undefined),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        orderBy: { [criteria.sortBy]: criteria.sortOrder },
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.company.count({ where }),
    ]);
    return {
      items,
      total,
      page: criteria.page,
      limit: criteria.limit,
    };
  }

  findById(companyId: string, includeDeleted = false): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: {
        id: companyId,
        ...(includeDeleted ? undefined : { deletedAt: null }),
      },
    });
  }

  async update(
    companyId: string,
    data: CompanyUpdateData,
    actorId: string,
  ): Promise<Company> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.company.findFirstOrThrow({
        where: { id: companyId, deletedAt: null },
      });
      const company = await transaction.company.update({
        where: { id: companyId },
        data: {
          ...data,
          email: data.email?.trim().toLowerCase(),
          website: persistWebsiteUrl(data.website),
          currency: data.currency?.toUpperCase(),
          country: data.country?.toUpperCase(),
          taxRegistrationNumber: this.normalizeIdentifier(
            data.taxRegistrationNumber,
          ),
          nationalTaxNumber: this.normalizeIdentifier(data.nationalTaxNumber),
          registrationNumber: this.normalizeIdentifier(data.registrationNumber),
          storageLimit:
            data.storageLimit === undefined
              ? undefined
              : BigInt(data.storageLimit),
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Company.Update',
        entity: 'Company',
        entityId: companyId,
        oldValue: previous,
        newValue: company,
      });
      return company;
    });
  }

  async softDelete(companyId: string, actorId: string): Promise<Company> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.company.findFirstOrThrow({
        where: { id: companyId, deletedAt: null },
      });
      const now = new Date();
      const company = await transaction.company.update({
        where: { id: companyId },
        data: {
          status: CompanyStatus.ARCHIVED,
          deletedAt: now,
          updatedBy: actorId,
        },
      });
      await Promise.all([
        transaction.companyMembership.updateMany({
          where: { companyId, deletedAt: null },
          data: {
            status: MembershipStatus.INACTIVE,
            updatedBy: actorId,
          },
        }),
        transaction.documentSequence.updateMany({
          where: { companyId, deletedAt: null },
          data: { status: EntityStatus.INACTIVE, updatedBy: actorId },
        }),
      ]);
      await this.audit.record(transaction, {
        companyId,
        action: 'Company.Delete',
        entity: 'Company',
        entityId: companyId,
        oldValue: previous,
        newValue: company,
      });
      return company;
    });
  }

  async restore(companyId: string, actorId: string): Promise<Company> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.company.findFirstOrThrow({
        where: { id: companyId, deletedAt: { not: null } },
      });
      const company = await transaction.company.update({
        where: { id: companyId },
        data: {
          status: CompanyStatus.INACTIVE,
          deletedAt: null,
          updatedBy: actorId,
        },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Company.Restore',
        entity: 'Company',
        entityId: companyId,
        oldValue: previous,
        newValue: company,
      });
      return company;
    });
  }

  getSettings(companyId: string): Promise<CompanySettings | null> {
    return this.prisma.companySettings.findFirst({
      where: { companyId, deletedAt: null },
    });
  }

  async updateSettings(
    companyId: string,
    data: CompanySettingsUpdateData,
    actorId: string,
  ): Promise<CompanySettings> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.companySettings.findFirstOrThrow({
        where: { companyId, deletedAt: null },
      });
      const settings = await transaction.companySettings.update({
        where: { companyId },
        data: {
          ...(data as Prisma.CompanySettingsUpdateInput),
          updatedBy: actorId,
        },
      });
      if (data.currency) {
        await transaction.company.update({
          where: { id: companyId },
          data: { currency: data.currency, updatedBy: actorId },
        });
      }
      await this.audit.record(transaction, {
        companyId,
        action: 'Company.Settings.Update',
        entity: 'CompanySettings',
        entityId: settings.id,
        oldValue: previous,
        newValue: settings,
      });
      return settings;
    });
  }

  getBranding(companyId: string): Promise<CompanyBranding | null> {
    return this.prisma.companyBranding.findFirst({
      where: { companyId, deletedAt: null },
    });
  }

  async updateBranding(
    companyId: string,
    data: CompanyBrandingUpdateData,
    actorId: string,
  ): Promise<CompanyBranding> {
    return this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.companyBranding.findFirstOrThrow({
        where: { companyId, deletedAt: null },
      });
      const branding = await transaction.companyBranding.update({
        where: { companyId },
        data: { ...data, updatedBy: actorId },
      });
      await this.audit.record(transaction, {
        companyId,
        action: 'Company.Branding.Update',
        entity: 'CompanyBranding',
        entityId: branding.id,
        oldValue: previous,
        newValue: branding,
      });
      return branding;
    });
  }

  async dashboard(companyId: string): Promise<CompanyDashboard | null> {
    const company = await this.findById(companyId);
    if (!company) {
      return null;
    }
    const [branchCount, departmentCount, employeeCount, projectCount, storage] =
      await this.prisma.$transaction([
        this.prisma.branch.count({ where: { companyId, deletedAt: null } }),
        this.prisma.department.count({
          where: { companyId, deletedAt: null },
        }),
        this.prisma.companyMembership.count({
          where: {
            companyId,
            status: MembershipStatus.ACTIVE,
            deletedAt: null,
          },
        }),
        this.prisma.project.count({
          where: { companyId, deletedAt: null },
        }),
        this.prisma.fileObject.aggregate({
          where: {
            companyId,
            status: 'AVAILABLE',
            deletedAt: null,
          },
          _sum: { sizeBytes: true },
        }),
      ]);
    return {
      company,
      branchCount,
      departmentCount,
      employeeCount,
      projectCount,
      projectModuleAvailable: true,
      storageUsage: (storage._sum.sizeBytes ?? 0n).toString(),
      subscriptionStatus: company.subscriptionStatus,
      license: {
        plan: company.subscriptionPlan,
        employeeLimit: company.employeeLimit,
        projectLimit: company.projectLimit,
        storageLimit: company.storageLimit?.toString() ?? null,
      },
    };
  }

  private async nextCompanyCode(
    transaction: Prisma.TransactionClient,
  ): Promise<string> {
    const [result] = await transaction.$queryRaw<
      Array<{ value: bigint }>
    >`SELECT nextval('company_code_seq')::bigint AS value`;
    return `CMP-${result.value.toString().padStart(6, '0')}`;
  }

  private normalizeIdentifier(value?: string): string | undefined {
    const normalized = value?.trim().toUpperCase();
    return normalized || undefined;
  }
}
