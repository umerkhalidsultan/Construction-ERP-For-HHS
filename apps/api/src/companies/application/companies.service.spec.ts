import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { ICompanyRepository } from '../domain/company.repository';

describe('CompaniesService', () => {
  const repository: jest.Mocked<ICompanyRepository> = {
    create: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getBranding: jest.fn(),
    updateBranding: jest.fn(),
    dashboard: jest.fn(),
  };

  const service = new CompaniesService(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks non-platform users from creating companies', async () => {
    await expect(
      service.create(
        {
          legalName: 'HHS Construction',
          displayName: 'HHS',
          currency: 'USD',
          timezone: 'UTC',
          country: 'PK',
        },
        {
          userId: 'user-1',
          email: 'user@example.com',
          companyId: 'company-1',
          membershipId: 'membership-1',
          isPlatformAdmin: false,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects overlapping working and weekend days', async () => {
    await expect(
      service.updateSettings(
        'company-1',
        {
          workingDays: ['MONDAY'],
          weekendDays: ['MONDAY'],
        },
        {
          userId: 'user-1',
          email: 'user@example.com',
          companyId: 'company-1',
          membershipId: 'membership-1',
          isPlatformAdmin: false,
        },
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('scopes company list to the active tenant for non-admins', async () => {
    repository.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await service.list(
      {
        page: 1,
        limit: 20,
        includeDeleted: false,
        sortBy: 'displayName',
        sortOrder: 'asc',
      },
      {
        userId: 'user-1',
        email: 'user@example.com',
        companyId: 'company-1',
        membershipId: 'membership-1',
        isPlatformAdmin: false,
      },
    );

    expect(repository.list).toHaveBeenCalledWith(
      expect.objectContaining({ tenantCompanyId: 'company-1' }),
    );
  });

  it('forwards website on company profile updates', async () => {
    repository.update.mockResolvedValue({
      id: 'company-1',
      website: 'https://example.com',
    } as never);

    await service.update(
      'company-1',
      { website: 'https://example.com' },
      {
        userId: 'user-1',
        email: 'user@example.com',
        companyId: 'company-1',
        membershipId: 'membership-1',
        isPlatformAdmin: false,
      },
    );

    expect(repository.update).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ website: 'https://example.com' }),
      'user-1',
    );
  });
});
