import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCompanyDto } from './create-company.dto';
import { UpdateCompanyDto } from './update-company.dto';

const requiredCompanyFields = {
  legalName: 'HHS Construction',
  displayName: 'HHS',
  currency: 'USD',
  timezone: 'UTC',
  country: 'PK',
};

describe('Company website DTO validation', () => {
  it('accepts a full https URL on create', async () => {
    const dto = plainToInstance(CreateCompanyDto, {
      ...requiredCompanyFields,
      website: 'https://example.com',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.website).toBe('https://example.com');
  });

  it('normalizes a bare domain before validating create payloads', async () => {
    const dto = plainToInstance(CreateCompanyDto, {
      ...requiredCompanyFields,
      website: 'www.example.com',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.website).toBe('https://www.example.com');
  });

  it('normalizes a bare domain on PATCH so valid websites persist', async () => {
    const dto = plainToInstance(UpdateCompanyDto, {
      website: 'example.com/about',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.website).toBe('https://example.com/about');
  });

  it('treats an empty website as null instead of failing IsUrl', async () => {
    const dto = plainToInstance(UpdateCompanyDto, { website: '  ' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.website).toBeNull();
  });

  it('rejects non-http schemes', async () => {
    const dto = plainToInstance(UpdateCompanyDto, {
      website: 'javascript:alert(1)',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'website')).toBe(true);
  });
});
