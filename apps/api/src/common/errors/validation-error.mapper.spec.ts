import { ValidationError } from 'class-validator';
import { mapValidationErrors } from './validation-error.mapper';

describe('mapValidationErrors', () => {
  it('maps a required UUID select field to a professional message', () => {
    const error = {
      property: 'employmentTypeId',
      constraints: { isUuid: 'employmentTypeId must be a UUID' },
    } as ValidationError;

    expect(mapValidationErrors([error])).toEqual({
      employmentTypeId: 'Please select an employment type.',
    });
  });

  it('maps email constraints to a user-facing email message', () => {
    const error = {
      property: 'email',
      constraints: { isEmail: 'email must be an email' },
    } as ValidationError;

    expect(mapValidationErrors([error]).email).toBe(
      'Please enter a valid email address.',
    );
  });
});
