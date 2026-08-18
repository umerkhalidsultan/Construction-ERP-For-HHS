import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectTeamRole } from '@prisma/client';
import { IWorkforceRepository } from '../domain/workforce.repository';
import { WorkforceService } from './workforce.service';

describe('WorkforceService', () => {
  const repository = {
    findDetail: jest.fn(),
    validateReferences: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    transfer: jest.fn(),
    wouldCreateManagerCycle: jest.fn(),
    activeAllocation: jest.fn(),
    assignProject: jest.fn(),
  } as unknown as jest.Mocked<IWorkforceRepository>;
  const service = new WorkforceService(repository);
  const principal = {
    userId: '11111111-1111-4111-8111-111111111111',
    email: 'hr@example.com',
    companyId: '22222222-2222-4222-8222-222222222222',
    membershipId: '33333333-3333-4333-8333-333333333333',
    isPlatformAdmin: false,
  };
  const employeeId = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findDetail.mockResolvedValue({ id: employeeId });
    repository.validateReferences.mockResolvedValue([]);
    repository.wouldCreateManagerCycle.mockResolvedValue(false);
    repository.activeAllocation.mockResolvedValue(0);
  });

  it('rejects cross-company workforce access', () => {
    expect(() =>
      service.list(
        '55555555-5555-4555-8555-555555555555',
        { page: 1, limit: 25, includeDeleted: false },
        principal,
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects invalid and cross-company references when creating an employee', async () => {
    repository.validateReferences.mockResolvedValue(['departmentId']);
    await expect(
      service.create(
        principal.companyId,
        {
          employeeCode: 'EMP-001',
          firstName: 'Aisha',
          lastName: 'Khan',
          employmentTypeId: '66666666-6666-4666-8666-666666666666',
          departmentId: '77777777-7777-4777-8777-777777777777',
          joiningDate: '2026-08-01',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid employment chronology', async () => {
    await expect(
      service.create(
        principal.companyId,
        {
          employeeCode: 'EMP-001',
          firstName: 'Aisha',
          lastName: 'Khan',
          employmentTypeId: '66666666-6666-4666-8666-666666666666',
          joiningDate: '2026-08-10',
          confirmationDate: '2026-08-01',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires employment placement changes to use the transfer endpoint', async () => {
    await expect(
      service.update(
        principal.companyId,
        employeeId,
        {
          departmentId: '77777777-7777-4777-8777-777777777777',
          expectedUpdatedAt: '2026-08-18T00:00:00.000Z',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents self-management and reporting cycles', async () => {
    await expect(
      service.transfer(
        principal.companyId,
        employeeId,
        {
          managerEmployeeId: employeeId,
          effectiveDate: '2026-08-18',
          reason: 'Invalid',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.wouldCreateManagerCycle.mockResolvedValue(true);
    await expect(
      service.transfer(
        principal.companyId,
        employeeId,
        {
          managerEmployeeId: '88888888-8888-4888-8888-888888888888',
          effectiveDate: '2026-08-18',
          reason: 'Creates cycle',
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an explicit null manager to clear the reporting line', async () => {
    repository.transfer.mockResolvedValue({ id: employeeId });
    await service.transfer(
      principal.companyId,
      employeeId,
      {
        managerEmployeeId: null,
        effectiveDate: '2026-08-18',
        reason: 'Now reports to company root',
      },
      principal,
    );
    expect(repository.transfer.mock.calls[0]?.[2]).toMatchObject({
      managerEmployeeId: null,
    });
  });

  it('prevents project allocation above 100 percent', async () => {
    repository.activeAllocation.mockResolvedValue(70);
    await expect(
      service.assignProject(
        principal.companyId,
        employeeId,
        {
          projectId: '99999999-9999-4999-8999-999999999999',
          role: ProjectTeamRole.SITE_ENGINEER,
          assignedAt: '2026-08-18',
          allocationPct: 40,
        },
        principal,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a valid employee through the repository with parsed dates', async () => {
    repository.create.mockResolvedValue({ id: employeeId });
    const result = await service.create(
      principal.companyId,
      {
        employeeCode: 'EMP-001',
        firstName: 'Aisha',
        lastName: 'Khan',
        employmentTypeId: '66666666-6666-4666-8666-666666666666',
        joiningDate: '2026-08-01',
      },
      principal,
    );
    expect(repository.create.mock.calls[0]).toEqual([
      principal.companyId,
      expect.objectContaining({ joiningDate: new Date('2026-08-01') }),
      principal.userId,
    ]);
    expect(result).toEqual({ id: employeeId });
  });
});
