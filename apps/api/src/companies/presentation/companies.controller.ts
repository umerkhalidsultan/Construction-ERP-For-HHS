import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FilePurpose } from '@prisma/client';
import type { ICompaniesService } from '../application/companies.service.interface';
import { COMPANIES_SERVICE } from '../application/companies.service.interface';
import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { PERMISSIONS } from '../../permissions/permission.constants';
import type { IStorageService } from '../../storage/storage.interface';
import { STORAGE_SERVICE } from '../../storage/storage.interface';
import { CompanyQueryDto } from '../dto/company-query.dto';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateBrandingDto } from '../dto/update-branding.dto';
import { UpdateCompanySettingsDto } from '../dto/update-company-settings.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(
    @Inject(COMPANIES_SERVICE)
    private readonly companies: ICompaniesService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.COMPANY_CREATE)
  @ApiOperation({ summary: 'Create a company tenant and its defaults' })
  async create(
    @Body() dto: CreateCompanyDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Company created successfully',
      data: await this.companies.create(dto, principal),
    };
  }

  @Get()
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  @ApiOperation({ summary: 'List companies visible to the current principal' })
  list(
    @Query() query: CompanyQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.companies.list(query, principal);
  }

  @Get(':companyId/dashboard')
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  @ApiOperation({ summary: 'Get live company dashboard aggregates' })
  async dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.companies.dashboard(companyId, principal),
    };
  }

  @Get(':companyId/settings')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  getSettings(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.companies.getSettings(companyId, principal);
  }

  @Patch(':companyId/settings')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  async updateSettings(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Company settings updated successfully',
      data: await this.companies.updateSettings(companyId, dto, principal),
    };
  }

  @Get(':companyId/branding')
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  getBranding(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.companies.getBranding(companyId, principal);
  }

  @Patch(':companyId/branding')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  async updateBranding(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateBrandingDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Company branding updated successfully',
      data: await this.companies.updateBranding(companyId, dto, principal),
    };
  }

  @Post(':companyId/branding/assets/:purpose')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and attach a validated branding image' })
  async uploadBrandAsset(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('purpose', new ParseEnumPipe(FilePurpose)) purpose: FilePurpose,
    @UploadedFile() file: Express.Multer.File,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Brand asset uploaded successfully',
      data: await this.storage.uploadBrandAsset(
        companyId,
        purpose,
        file,
        principal,
      ),
    };
  }

  @Get(':companyId')
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.companies.get(companyId, principal);
  }

  @Patch(':companyId')
  @RequirePermissions(PERMISSIONS.COMPANY_UPDATE)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Company updated successfully',
      data: await this.companies.update(companyId, dto, principal),
    };
  }

  @Delete(':companyId')
  @RequirePermissions(PERMISSIONS.COMPANY_DELETE)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Company archived successfully',
      data: await this.companies.delete(companyId, principal),
    };
  }

  @Post(':companyId/restore')
  @RequirePermissions(PERMISSIONS.COMPANY_DELETE)
  async restore(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Company restored in inactive status',
      data: await this.companies.restore(companyId, principal),
    };
  }
}
