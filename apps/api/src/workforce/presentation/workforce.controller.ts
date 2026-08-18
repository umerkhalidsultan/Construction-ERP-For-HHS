import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedPrincipal } from '../../common/context/request-context.types';
import { CurrentPrincipal } from '../../common/decorators/current-principal.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../../permissions/permission.constants';
import type { IWorkforceService } from '../application/workforce.service.interface';
import { WORKFORCE_SERVICE } from '../application/workforce.service.interface';
import {
  AssignProjectDto,
  AssignSkillDto,
  CreateCatalogItemDto,
  CreateCertificationDto,
  CreateEmployeeDocumentDto,
  CreateEmployeeDto,
  CreateLicenseDto,
  EmployeeQueryDto,
  EndProjectAssignmentDto,
  TransferEmployeeDto,
  UpdateEmployeeDto,
  UpdateCertificationDto,
  UpdateEmployeeDocumentDto,
  UpdateLicenseDto,
} from '../dto/workforce.dto';

@ApiTags('Workforce & Identity')
@ApiBearerAuth()
@Controller('companies/:companyId/workforce')
export class WorkforceController {
  constructor(
    @Inject(WORKFORCE_SERVICE)
    private readonly workforce: IWorkforceService,
  ) {}

  @Get('employees')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'Search and filter the employee directory' })
  async list(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: EmployeeQueryDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    const result = (await this.workforce.list(companyId, query, principal)) as {
      items: unknown[];
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    return {
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.pages,
      },
    };
  }

  @Post('employees')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_CREATE)
  async create(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateEmployeeDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Employee created successfully',
      data: await this.workforce.create(companyId, dto, principal),
    };
  }

  @Get('organization-chart')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_VIEW)
  async organizationChart(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.workforce.organizationChart(companyId, principal),
    };
  }

  @Get('catalog/employment-types')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_VIEW)
  async employmentTypes(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.workforce.listEmploymentTypes(companyId, principal),
    };
  }

  @Post('catalog/employment-types')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async createEmploymentType(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCatalogItemDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Employment type created successfully',
      data: await this.workforce.createEmploymentType(
        companyId,
        dto,
        principal,
      ),
    };
  }

  @Get('catalog/skills')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_VIEW)
  async skills(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.workforce.listSkills(companyId, principal) };
  }

  @Post('catalog/skills')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async createSkill(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCatalogItemDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Skill created successfully',
      data: await this.workforce.createSkill(companyId, dto, principal),
    };
  }

  @Get('employees/:employeeId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_VIEW)
  async get(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return { data: await this.workforce.get(companyId, employeeId, principal) };
  }

  @Patch('employees/:employeeId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async update(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Employee updated successfully',
      data: await this.workforce.update(companyId, employeeId, dto, principal),
    };
  }

  @Delete('employees/:employeeId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DELETE)
  async delete(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Employee archived successfully',
      data: await this.workforce.delete(companyId, employeeId, principal),
    };
  }

  @Get('employees/:employeeId/dashboard')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_VIEW)
  async dashboard(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      data: await this.workforce.dashboard(companyId, employeeId, principal),
    };
  }

  @Post('employees/:employeeId/transfer')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_TRANSFER)
  async transfer(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: TransferEmployeeDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Employee transferred successfully',
      data: await this.workforce.transfer(
        companyId,
        employeeId,
        dto,
        principal,
      ),
    };
  }

  @Post('employees/:employeeId/project-assignments')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_ASSIGN_PROJECT)
  async assignProject(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: AssignProjectDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project assigned successfully',
      data: await this.workforce.assignProject(
        companyId,
        employeeId,
        dto,
        principal,
      ),
    };
  }

  @Delete('employees/:employeeId/project-assignments/:assignmentId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_ASSIGN_PROJECT)
  async endProjectAssignment(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: EndProjectAssignmentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Project assignment ended successfully',
      data: await this.workforce.endProjectAssignment(
        companyId,
        employeeId,
        assignmentId,
        dto.endDate,
        principal,
      ),
    };
  }

  @Post('employees/:employeeId/skills')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async assignSkill(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: AssignSkillDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Skill assigned successfully',
      data: await this.workforce.assignSkill(
        companyId,
        employeeId,
        dto,
        principal,
      ),
    };
  }

  @Delete('employees/:employeeId/skills/:skillId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async removeSkill(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Skill removed successfully',
      data: await this.workforce.removeSkill(
        companyId,
        employeeId,
        skillId,
        principal,
      ),
    };
  }

  @Post('employees/:employeeId/certifications')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async addCertification(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateCertificationDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Certification added successfully',
      data: await this.workforce.addCertification(
        companyId,
        employeeId,
        dto,
        principal,
      ),
    };
  }

  @Patch('employees/:employeeId/certifications/:certificationId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async updateCertification(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('certificationId', ParseUUIDPipe) certificationId: string,
    @Body() dto: UpdateCertificationDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Certification updated successfully',
      data: await this.workforce.updateCertification(
        companyId,
        employeeId,
        certificationId,
        dto,
        principal,
      ),
    };
  }

  @Delete('employees/:employeeId/certifications/:certificationId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async deleteCertification(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('certificationId', ParseUUIDPipe) certificationId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Certification removed successfully',
      data: await this.workforce.deleteCertification(
        companyId,
        employeeId,
        certificationId,
        principal,
      ),
    };
  }

  @Post('employees/:employeeId/licenses')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async addLicense(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateLicenseDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'License added successfully',
      data: await this.workforce.addLicense(
        companyId,
        employeeId,
        dto,
        principal,
      ),
    };
  }

  @Patch('employees/:employeeId/licenses/:licenseId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async updateLicense(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('licenseId', ParseUUIDPipe) licenseId: string,
    @Body() dto: UpdateLicenseDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'License updated successfully',
      data: await this.workforce.updateLicense(
        companyId,
        employeeId,
        licenseId,
        dto,
        principal,
      ),
    };
  }

  @Delete('employees/:employeeId/licenses/:licenseId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_EDIT)
  async deleteLicense(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('licenseId', ParseUUIDPipe) licenseId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'License removed successfully',
      data: await this.workforce.deleteLicense(
        companyId,
        employeeId,
        licenseId,
        principal,
      ),
    };
  }

  @Post('employees/:employeeId/documents')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS)
  async addDocument(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: CreateEmployeeDocumentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Document added successfully',
      data: await this.workforce.addDocument(
        companyId,
        employeeId,
        dto,
        principal,
      ),
    };
  }

  @Patch('employees/:employeeId/documents/:documentId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS)
  async updateDocument(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateEmployeeDocumentDto,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Document updated successfully',
      data: await this.workforce.updateDocument(
        companyId,
        employeeId,
        documentId,
        dto,
        principal,
      ),
    };
  }

  @Delete('employees/:employeeId/documents/:documentId')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_DOCUMENTS)
  async deleteDocument(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return {
      message: 'Document removed successfully',
      data: await this.workforce.deleteDocument(
        companyId,
        employeeId,
        documentId,
        principal,
      ),
    };
  }
}
