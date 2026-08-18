import { ValidationError } from 'class-validator';
import {
  fieldLabel,
  friendlyRequiredSelect,
  requiredFieldMessage,
} from './field-labels';

export function mapValidationErrors(
  errors: ValidationError[],
  parent = '',
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.children?.length) {
      Object.assign(fields, mapValidationErrors(error.children, path));
    }
    const constraints = error.constraints ?? {};
    const constraint = Object.keys(constraints)[0];
    if (!constraint) {
      continue;
    }
    fields[path] = messageForConstraint(path, constraint);
  }
  return fields;
}

function messageForConstraint(field: string, constraint: string): string {
  switch (constraint) {
    case 'isNotEmpty':
    case 'isDefined':
    case 'arrayNotEmpty':
      return requiredFieldMessage(field);
    case 'isEmail':
      return 'Please enter a valid email address.';
    case 'isUuid':
    case 'isEnum':
      return field.endsWith('Id')
        ? friendlyRequiredSelect(field)
        : `Please select ${fieldLabel(field)}.`;
    case 'isUrl':
      return 'Enter a valid website URL (for example https://example.com).';
    case 'isDateString':
    case 'isDate':
      return 'Please enter a valid date.';
    case 'isNumber':
    case 'isInt':
    case 'isNumberString':
      return 'Please enter a valid number.';
    case 'min':
      return field.toLowerCase().includes('amount')
        ? 'Amount must be greater than 0.'
        : `${fieldLabel(field)} is below the allowed minimum.`;
    case 'max':
      return `${fieldLabel(field)} exceeds the allowed maximum.`;
    case 'minLength':
    case 'maxLength':
    case 'length':
      return `Please enter a valid ${fieldLabel(field).toLowerCase()}.`;
    case 'matches':
      if (field === 'password') {
        return 'Password must meet the required security requirements.';
      }
      if (field === 'phone') {
        return 'Please enter a valid phone number.';
      }
      return `Please enter a valid ${fieldLabel(field).toLowerCase()}.`;
    case 'isString':
      return requiredFieldMessage(field);
    case 'whitelistValidation':
      return 'One or more submitted fields are not allowed.';
    default:
      return field.endsWith('Id')
        ? friendlyRequiredSelect(field)
        : `${fieldLabel(field)} is invalid.`;
  }
}
