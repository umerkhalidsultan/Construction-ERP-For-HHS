import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEmployeeDto, EmployeeQueryDto } from './workforce.dto';

describe('Workforce DTO validation', () => {
  it('accepts a valid employee foundation record', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      employeeCode: 'EMP-1001',
      firstName: 'Fatima',
      lastName: 'Ali',
      employmentTypeId: '11111111-1111-4111-8111-111111111111',
      joiningDate: '2026-08-18',
      companyEmail: 'fatima@example.com',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects malformed employee codes, emails, IDs, and dates', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {
      employeeCode: '!',
      firstName: '',
      lastName: 'Ali',
      employmentTypeId: 'not-a-uuid',
      joiningDate: 'not-a-date',
      companyEmail: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'employeeCode',
        'firstName',
        'employmentTypeId',
        'joiningDate',
        'companyEmail',
      ]),
    );
  });

  it('transforms pagination and boolean query parameters', async () => {
    const dto = plainToInstance(EmployeeQueryDto, {
      page: '2',
      limit: '50',
      includeDeleted: 'true',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ page: 2, limit: 50, includeDeleted: true });
  });
});
