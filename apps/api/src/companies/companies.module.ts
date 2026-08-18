import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { CompaniesService } from './application/companies.service';
import { COMPANIES_SERVICE } from './application/companies.service.interface';
import { DocumentNumberingService } from './application/document-numbering.service';
import { DOCUMENT_NUMBERING_SERVICE } from './application/document-numbering.service.interface';
import { OrganizationService } from './application/organization.service';
import { ORGANIZATION_SERVICE } from './application/organization.service.interface';
import { COMPANY_REPOSITORY } from './domain/company.repository';
import { ORGANIZATION_REPOSITORY } from './domain/organization.repository';
import { PrismaCompanyRepository } from './infrastructure/prisma-company.repository';
import { PrismaOrganizationRepository } from './infrastructure/prisma-organization.repository';
import { BranchesController } from './presentation/branches.controller';
import { CompaniesController } from './presentation/companies.controller';
import { CostCentersController } from './presentation/cost-centers.controller';
import { DepartmentsController } from './presentation/departments.controller';
import { DesignationsController } from './presentation/designations.controller';
import { DocumentNumberingController } from './presentation/document-numbering.controller';
import { OrganizationController } from './presentation/organization.controller';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [
    CompaniesController,
    BranchesController,
    DepartmentsController,
    DesignationsController,
    CostCentersController,
    OrganizationController,
    DocumentNumberingController,
  ],
  providers: [
    CompaniesService,
    OrganizationService,
    DocumentNumberingService,
    PrismaCompanyRepository,
    PrismaOrganizationRepository,
    { provide: COMPANIES_SERVICE, useExisting: CompaniesService },
    { provide: ORGANIZATION_SERVICE, useExisting: OrganizationService },
    {
      provide: DOCUMENT_NUMBERING_SERVICE,
      useExisting: DocumentNumberingService,
    },
    { provide: COMPANY_REPOSITORY, useExisting: PrismaCompanyRepository },
    {
      provide: ORGANIZATION_REPOSITORY,
      useExisting: PrismaOrganizationRepository,
    },
  ],
  exports: [
    COMPANIES_SERVICE,
    ORGANIZATION_SERVICE,
    DOCUMENT_NUMBERING_SERVICE,
  ],
})
export class CompaniesModule {}
