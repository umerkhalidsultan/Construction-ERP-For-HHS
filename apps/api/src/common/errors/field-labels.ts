const LABELS: Record<string, string> = {
  employmentTypeId: 'Employment Type',
  joiningDate: 'Joining Date',
  confirmationDate: 'Confirmation Date',
  departmentId: 'Department',
  designationId: 'Designation',
  branchId: 'Branch',
  managerEmployeeId: 'Manager',
  employeeCode: 'Employee Code',
  firstName: 'First Name',
  lastName: 'Last Name',
  middleName: 'Middle Name',
  personalEmail: 'Personal Email',
  companyEmail: 'Company Email',
  email: 'Email',
  phone: 'Phone',
  password: 'Password',
  website: 'Website',
  legalName: 'Legal Name',
  displayName: 'Display Name',
  projectName: 'Project Name',
  startDate: 'Start Date',
  endDate: 'End Date',
  plannedStartDate: 'Planned Start Date',
  plannedEndDate: 'Planned End Date',
  currency: 'Currency',
  country: 'Country',
  companyId: 'Company',
  projectId: 'Project',
  vendorId: 'Vendor',
  clientId: 'Client',
  amount: 'Amount',
  quantity: 'Quantity',
  invoiceNumber: 'Invoice Number',
  file: 'File',
  name: 'Lead Name',
  leadTypeId: 'Lead Type',
  leadSourceId: 'Lead Source',
  estimatedValue: 'Estimated Project Value',
  expectedClosingDate: 'Expected Closing Date',
  assignedToId: 'Assigned To',
  crmCompanyId: 'CRM Company',
  crmContactId: 'CRM Contact',
  registrationNumber: 'Registration Number',
  taxNumber: 'Tax / VAT / NTN Number',
};

export function fieldLabel(field: string): string {
  if (LABELS[field]) {
    return LABELS[field];
  }
  const withoutId = field.endsWith('Id') ? field.slice(0, -2) : field;
  return withoutId
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function friendlyRequiredSelect(field: string): string {
  if (field === 'employmentTypeId') {
    return 'Please select an employment type.';
  }
  return `Please select ${fieldLabel(field)}.`;
}

export function requiredFieldMessage(field: string): string {
  if (field.endsWith('Id')) {
    return friendlyRequiredSelect(field);
  }
  return `${fieldLabel(field)} is required.`;
}
