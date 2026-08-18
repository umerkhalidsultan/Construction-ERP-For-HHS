import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProjectLifecycleStatus } from '@prisma/client';
import { IDocumentNumberingService } from '../../companies/application/document-numbering.service.interface';
import { IProjectRepository } from '../domain/project.repository';
import { CreateProjectDto } from '../dto/create-project.dto';
import { ProjectQueryDto } from '../dto/project-query.dto';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const repository: jest.Mocked<IProjectRepository> = {
    create: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    updateStatus: jest.fn(),
    dashboard: jest.fn(),
    timeline: jest.fn(),
    listStatuses: jest.fn(),
    listTypes: jest.fn(),
    findSystemStatusByCode: jest.fn(),
    findStatusById: jest.fn(),
    findTypeById: jest.fn(),
    findActiveMembership: jest.fn(),
    projectCodeExists: jest.fn(),
    getCompanyCurrency: jest.fn(),
    listPhases: jest.fn(),
    createPhase: jest.fn(),
    updatePhase: jest.fn(),
    softDeletePhase: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    softDeleteTask: jest.fn(),
    listMilestones: jest.fn(),
    createMilestone: jest.fn(),
    updateMilestone: jest.fn(),
    softDeleteMilestone: jest.fn(),
    addMilestoneDependency: jest.fn(),
    removeMilestoneDependency: jest.fn(),
    listTeam: jest.fn(),
    assignTeam: jest.fn(),
    updateTeam: jest.fn(),
    unassignTeam: jest.fn(),
    listDocuments: jest.fn(),
    createDocument: jest.fn(),
    updateDocument: jest.fn(),
    softDeleteDocument: jest.fn(),
    listCalendar: jest.fn(),
    createCalendarEvent: jest.fn(),
    updateCalendarEvent: jest.fn(),
    softDeleteCalendarEvent: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    listTags: jest.fn(),
    createTag: jest.fn(),
    updateTag: jest.fn(),
    softDeleteTag: jest.fn(),
    assignTag: jest.fn(),
    unassignTag: jest.fn(),
    principalHasPermission: jest.fn(),
  };

  const numbering: jest.Mocked<IDocumentNumberingService> = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    allocate: jest.fn(),
  };

  const service = new ProjectsService(repository, numbering);

  const principal = {
    userId: 'user-1',
    email: 'user@example.com',
    companyId: 'company-1',
    membershipId: 'membership-1',
    isPlatformAdmin: false,
  };

  const validCreateDto: CreateProjectDto = {
    projectName: 'Test Tower',
    projectTypeId: 'type-1',
    projectManagerId: 'member-1',
    estimatedBudget: 100000,
    projectStartDate: '2026-01-01',
    plannedCompletionDate: '2026-12-31',
    country: 'PK',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    beforeEach(() => {
      repository.findTypeById.mockResolvedValue({ id: 'type-1' } as never);
      repository.findSystemStatusByCode.mockResolvedValue({
        id: 'status-draft',
        lifecycle: ProjectLifecycleStatus.DRAFT,
      } as never);
      repository.findActiveMembership.mockResolvedValue({
        id: 'member-1',
      } as never);
      repository.getCompanyCurrency.mockResolvedValue('USD');
      numbering.allocate.mockResolvedValue({
        value: 'PROJ-2026-000001',
      } as never);
      repository.projectCodeExists.mockResolvedValue(false);
      repository.create.mockResolvedValue({ id: 'project-1' } as never);
    });

    it('rejects cross-company creation', async () => {
      await expect(
        service.create('company-2', validCreateDto, principal),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allocates a code and resolves the DRAFT status when none is supplied', async () => {
      const result = await service.create(
        'company-1',
        validCreateDto,
        principal,
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 'company-1',
          projectCode: 'PROJ-2026-000001',
          statusId: 'status-draft',
          lifecycleStatus: ProjectLifecycleStatus.DRAFT,
          currency: 'USD',
        }),
        principal.userId,
      );
      expect(result).toEqual({ id: 'project-1' });
    });

    it('rejects an invalid projectTypeId', async () => {
      repository.findTypeById.mockResolvedValue(null);
      await expect(
        service.create('company-1', validCreateDto, principal),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects an invalid explicit statusId', async () => {
      repository.findStatusById.mockResolvedValue(null);
      await expect(
        service.create(
          'company-1',
          { ...validCreateDto, statusId: 'bad-status' },
          principal,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a missing or inactive project manager membership', async () => {
      repository.findActiveMembership.mockResolvedValue(null);
      await expect(
        service.create('company-1', validCreateDto, principal),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects when the allocated project code already exists', async () => {
      repository.projectCodeExists.mockResolvedValue(true);
      await expect(
        service.create('company-1', validCreateDto, principal),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('list', () => {
    it('forbids includeDeleted for non-platform-admin principals', async () => {
      await expect(
        service.list(
          'company-1',
          { includeDeleted: true, page: 1, limit: 20 } as ProjectQueryDto,
          principal,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('passes the clientId filter through and paginates results', async () => {
      repository.list.mockResolvedValue({
        items: [{ id: 'project-1' }],
        total: 1,
        page: 1,
        limit: 20,
      } as never);

      const result = await service.list(
        'company-1',
        { clientId: 'client-1', page: 1, limit: 20 } as ProjectQueryDto,
        principal,
      );

      expect(repository.list).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'client-1' }),
      );
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('get', () => {
    it('throws NotFound when the project does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.get('company-1', 'project-1', principal),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects a partial date update that conflicts with the stored start date', async () => {
      repository.findById.mockResolvedValue({
        id: 'project-1',
        projectStartDate: new Date('2026-06-01'),
        plannedCompletionDate: new Date('2026-12-31'),
      } as never);

      await expect(
        service.update(
          'company-1',
          'project-1',
          { plannedCompletionDate: '2026-01-01' },
          principal,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('allows a partial date update that stays valid against the stored start date', async () => {
      repository.findById.mockResolvedValue({
        id: 'project-1',
        projectStartDate: new Date('2026-06-01'),
        plannedCompletionDate: new Date('2026-12-31'),
      } as never);
      repository.update.mockResolvedValue({ id: 'project-1' } as never);

      await service.update(
        'company-1',
        'project-1',
        { plannedCompletionDate: '2026-08-01' },
        principal,
      );

      expect(repository.update).toHaveBeenCalled();
    });
  });

  describe('delete / restore', () => {
    it('requires the project to exist before deleting', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.delete('company-1', 'project-1', principal),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('soft deletes an existing project', async () => {
      repository.findById.mockResolvedValue({ id: 'project-1' } as never);
      repository.softDelete.mockResolvedValue({ id: 'project-1' } as never);

      await service.delete('company-1', 'project-1', principal);

      expect(repository.softDelete).toHaveBeenCalledWith(
        'company-1',
        'project-1',
        principal.userId,
      );
    });
  });

  describe('assignTeam', () => {
    it('rejects assignment for a missing or inactive membership', async () => {
      repository.findById.mockResolvedValue({ id: 'project-1' } as never);
      repository.findActiveMembership.mockResolvedValue(null);

      await expect(
        service.assignTeam(
          'company-1',
          'project-1',
          {
            membershipId: 'member-2',
            role: 'SITE_ENGINEER',
          },
          principal,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('dashboard', () => {
    it('throws NotFound when dashboard data is unavailable', async () => {
      repository.dashboard.mockResolvedValue(null);

      await expect(
        service.dashboard('company-1', 'project-1', principal),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('rejects cross-company access', () => {
    expect(() => service.assertCompanyAccess('company-2', principal)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects non-positive estimatedBudget', () => {
    expect(() =>
      service.validateBudgetAndDates({
        estimatedBudget: 0,
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejects plannedCompletionDate before projectStartDate', () => {
    expect(() =>
      service.validateBudgetAndDates({
        projectStartDate: '2026-06-01',
        plannedCompletionDate: '2026-01-01',
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('requires statusId or lifecycleStatus on status update', async () => {
    repository.findById.mockResolvedValue({ id: 'project-1' } as never);

    await expect(
      service.updateStatus('company-1', 'project-1', {}, principal),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects an invalid statusId on status update', async () => {
    repository.findById.mockResolvedValue({ id: 'project-1' } as never);
    repository.findStatusById.mockResolvedValue(null);

    await expect(
      service.updateStatus(
        'company-1',
        'project-1',
        { statusId: 'bad-status' },
        principal,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('requires Project.Close for CLOSED lifecycle', async () => {
    repository.findById.mockResolvedValue({ id: 'project-1' } as never);
    repository.principalHasPermission.mockResolvedValue(false);

    await expect(
      service.updateStatus(
        'company-1',
        'project-1',
        {
          lifecycleStatus: ProjectLifecycleStatus.CLOSED,
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows CLOSED when Project.Close is granted', async () => {
    repository.findById.mockResolvedValue({ id: 'project-1' } as never);
    repository.principalHasPermission.mockResolvedValue(true);
    repository.updateStatus.mockResolvedValue({ id: 'project-1' } as never);

    await service.updateStatus(
      'company-1',
      'project-1',
      {
        lifecycleStatus: ProjectLifecycleStatus.CLOSED,
      },
      principal,
    );

    expect(repository.updateStatus).toHaveBeenCalled();
  });
});
