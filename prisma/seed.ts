import {
  PrismaClient,
  ProjectLifecycleStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const permissionDefinitions = [
  ['Company.View', 'Company', 'View'],
  ['Company.Create', 'Company', 'Create'],
  ['Company.Update', 'Company', 'Update'],
  ['Company.Delete', 'Company', 'Delete'],
  ['Company.Settings', 'Company', 'Settings'],
  ['Department.Manage', 'Department', 'Manage'],
  ['Branch.Manage', 'Branch', 'Manage'],
  ['Designation.Manage', 'Designation', 'Manage'],
  ['CostCenter.Manage', 'CostCenter', 'Manage'],
  ['BusinessUnit.Manage', 'BusinessUnit', 'Manage'],
  ['Region.Manage', 'Region', 'Manage'],
  ['Team.Manage', 'Team', 'Manage'],
  ['ReportingHierarchy.Manage', 'ReportingHierarchy', 'Manage'],
  ['Project.View', 'Project', 'View'],
  ['Project.Create', 'Project', 'Create'],
  ['Project.Edit', 'Project', 'Edit'],
  ['Project.Delete', 'Project', 'Delete'],
  ['Project.Assign', 'Project', 'Assign'],
  ['Project.Settings', 'Project', 'Settings'],
  ['Project.Close', 'Project', 'Close'],
  ['Project.Approve', 'Project', 'Approve'],
  ['ProjectPlanning.View', 'ProjectPlanning', 'View'],
  ['ProjectPlanning.Create', 'ProjectPlanning', 'Create'],
  ['ProjectPlanning.Edit', 'ProjectPlanning', 'Edit'],
  ['ProjectPlanning.Delete', 'ProjectPlanning', 'Delete'],
  ['Schedule.Edit', 'Schedule', 'Edit'],
  ['Schedule.Recalculate', 'Schedule', 'Recalculate'],
  ['Gantt.View', 'Gantt', 'View'],
  ['Gantt.Edit', 'Gantt', 'Edit'],
  ['Baseline.View', 'Baseline', 'View'],
  ['Baseline.Create', 'Baseline', 'Create'],
  ['Baseline.Approve', 'Baseline', 'Approve'],
  ['Progress.Update', 'Progress', 'Update'],
  ['Progress.View', 'Progress', 'View'],
  ['Employee.View', 'Employee', 'View'],
  ['Employee.Create', 'Employee', 'Create'],
  ['Employee.Edit', 'Employee', 'Edit'],
  ['Employee.Delete', 'Employee', 'Delete'],
  ['Employee.Documents', 'Employee', 'Documents'],
  ['Quality.View', 'Quality', 'View quality records'],
  ['Quality.Create', 'Quality', 'Create quality records'],
  ['Quality.Edit', 'Quality', 'Edit quality records'],
  ['Quality.Delete', 'Quality', 'Archive quality records'],
  ['Quality.Inspect', 'Quality', 'Perform inspections'],
  ['Quality.Approve', 'Quality', 'Approve quality records'],
  ['Quality.Reject', 'Quality', 'Reject quality records'],
  ['Quality.Submit', 'Quality', 'Submit quality records'],
  ['Quality.NCR.Create', 'Quality', 'Create NCRs'],
  ['Quality.NCR.Edit', 'Quality', 'Edit NCRs'],
  ['Quality.NCR.Assign', 'Quality', 'Assign NCRs'],
  ['Quality.NCR.Close', 'Quality', 'Close NCRs'],
  ['Quality.Test.Create', 'Quality', 'Create tests'],
  ['Quality.Test.Approve', 'Quality', 'Approve or override tests'],
  ['Quality.MaterialApprove', 'Quality', 'Approve materials'],
  ['Quality.MethodStatementApprove', 'Quality', 'Approve method statements'],
  ['Quality.Defect.Create', 'Quality', 'Create defects'],
  ['Quality.Defect.Close', 'Quality', 'Close defects'],
  ['Quality.PunchList.Create', 'Quality', 'Create punch items'],
  ['Quality.PunchList.Close', 'Quality', 'Close punch items'],
  ['Quality.Report', 'Quality', 'View quality reports'],
  ['Quality.Export', 'Quality', 'Export quality records'],
  ['Quality.ExternalReview', 'Quality', 'External quality review'],
  ['Employee.AssignProject', 'Employee', 'AssignProject'],
  ['Employee.Transfer', 'Employee', 'Transfer'],
  ['Employee.Export', 'Employee', 'Export'],
  ['CRM.View', 'CRM', 'View'],
  ['CRM.Lead.View', 'CRM.Lead', 'View'],
  ['CRM.Lead.Create', 'CRM.Lead', 'Create'],
  ['CRM.Lead.Edit', 'CRM.Lead', 'Edit'],
  ['CRM.Lead.Delete', 'CRM.Lead', 'Delete'],
  ['CRM.Lead.Assign', 'CRM.Lead', 'Assign'],
  ['CRM.Lead.ChangeStatus', 'CRM.Lead', 'ChangeStatus'],
  ['CRM.Lead.Export', 'CRM.Lead', 'Export'],
  ['CRM.Company.View', 'CRM.Company', 'View'],
  ['CRM.Company.Create', 'CRM.Company', 'Create'],
  ['CRM.Company.Edit', 'CRM.Company', 'Edit'],
  ['CRM.Company.Delete', 'CRM.Company', 'Delete'],
  ['CRM.Company.Assign', 'CRM.Company', 'Assign'],
  ['CRM.Company.Merge', 'CRM.Company', 'Merge'],
  ['CRM.Contact.View', 'CRM.Contact', 'View'],
  ['CRM.Contact.Create', 'CRM.Contact', 'Create'],
  ['CRM.Contact.Edit', 'CRM.Contact', 'Edit'],
  ['CRM.Contact.Delete', 'CRM.Contact', 'Delete'],
  ['CRM.Contact.Assign', 'CRM.Contact', 'Assign'],
  ['CRM.Contact.Merge', 'CRM.Contact', 'Merge'],
  ['CRM.Opportunity.View', 'CRM.Opportunity', 'View'],
  ['CRM.Opportunity.Create', 'CRM.Opportunity', 'Create'],
  ['CRM.Opportunity.Edit', 'CRM.Opportunity', 'Edit'],
  ['CRM.Opportunity.Delete', 'CRM.Opportunity', 'Delete'],
  ['CRM.Opportunity.Assign', 'CRM.Opportunity', 'Assign'],
  ['CRM.Opportunity.ChangeStage', 'CRM.Opportunity', 'ChangeStage'],
  ['CRM.Opportunity.ConvertLead', 'CRM.Opportunity', 'ConvertLead'],
  ['CRM.Opportunity.MarkWon', 'CRM.Opportunity', 'MarkWon'],
  ['CRM.Opportunity.MarkLost', 'CRM.Opportunity', 'MarkLost'],
  ['CRM.Opportunity.Reopen', 'CRM.Opportunity', 'Reopen'],
  ['CRM.Opportunity.Export', 'CRM.Opportunity', 'Export'],
  ['CRM.Opportunity.ViewForecast', 'CRM.Opportunity', 'ViewForecast'],
  ['CRM.Activity.View', 'CRM.Activity', 'View'],
  ['CRM.Activity.Create', 'CRM.Activity', 'Create'],
  ['CRM.Activity.Edit', 'CRM.Activity', 'Edit'],
  ['CRM.Activity.Delete', 'CRM.Activity', 'Delete'],
  ['CRM.Activity.Assign', 'CRM.Activity', 'Assign'],
  ['CRM.Activity.Complete', 'CRM.Activity', 'Complete'],
  ['CRM.Activity.Cancel', 'CRM.Activity', 'Cancel'],
  ['CRM.Activity.Reschedule', 'CRM.Activity', 'Reschedule'],
  ['CRM.Activity.ViewTeam', 'CRM.Activity', 'ViewTeam'],
  ['CRM.Activity.Export', 'CRM.Activity', 'Export'],
  ['CRM.Activity.ViewCalendar', 'CRM.Activity', 'ViewCalendar'],
] as const;

const rolePermissions: Record<string, string[]> = {
  'Super Admin': permissionDefinitions.map(([code]) => code),
  'Company Admin': permissionDefinitions.map(([code]) => code),
  Director: permissionDefinitions
    .map(([code]) => code)
    .filter(
      (code) =>
        !['Company.Create', 'Company.Delete', 'Project.Delete'].includes(code),
    ),
  'Project Manager': [
    'Company.View',
    'Department.Manage',
    'Branch.Manage',
    'CostCenter.Manage',
    'Team.Manage',
    'Project.View',
    'Project.Create',
    'Project.Edit',
    'Project.Assign',
    'Project.Settings',
    'ProjectPlanning.View',
    'ProjectPlanning.Create',
    'ProjectPlanning.Edit',
    'ProjectPlanning.Delete',
    'Schedule.Edit',
    'Schedule.Recalculate',
    'Gantt.View',
    'Gantt.Edit',
    'Baseline.View',
    'Baseline.Create',
    'Baseline.Approve',
    'Progress.Update',
    'Progress.View',
    'Employee.View',
    'Employee.AssignProject',
    'Quality.View',
    'Quality.Create',
    'Quality.Edit',
    'Quality.Submit',
    'Quality.Approve',
    'Quality.NCR.Create',
    'Quality.NCR.Edit',
    'Quality.NCR.Assign',
    'Quality.Report',
  ],
  'Site Engineer': ['Company.View', 'Project.View', 'ProjectPlanning.View', 'Gantt.View', 'Baseline.View', 'Progress.View', 'Progress.Update', 'Quality.View', 'Quality.Create', 'Quality.Inspect', 'Quality.NCR.Create', 'Quality.Test.Create', 'Quality.Defect.Create', 'Quality.PunchList.Create'],
  'QA/QC Manager': permissionDefinitions
    .map(([code]) => code)
    .filter((code) => code.startsWith('Quality.') || ['Company.View', 'Project.View', 'ProjectPlanning.View'].includes(code)),
  'QA/QC Engineer': ['Company.View', 'Project.View', 'ProjectPlanning.View', 'Quality.View', 'Quality.Create', 'Quality.Edit', 'Quality.Inspect', 'Quality.Submit', 'Quality.NCR.Create', 'Quality.NCR.Edit', 'Quality.Test.Create', 'Quality.Defect.Create', 'Quality.PunchList.Create', 'Quality.Report'],
  'Procurement Officer': ['Company.View', 'Project.View'],
  'Store Keeper': ['Company.View'],
  HR: [
    'Company.View',
    'Department.Manage',
    'Designation.Manage',
    'Team.Manage',
    'ReportingHierarchy.Manage',
    'Employee.View',
    'Employee.Create',
    'Employee.Edit',
    'Employee.Delete',
    'Employee.Documents',
    'Employee.AssignProject',
    'Employee.Transfer',
    'Employee.Export',
  ],
  Accountant: ['Company.View', 'CostCenter.Manage', 'Project.View'],
  Employee: ['Company.View'],
  Viewer: ['Company.View', 'Project.View'],
  'Business Development Manager': [
    'Company.View', 'CRM.View', 'CRM.Lead.View', 'CRM.Lead.Create',
    'CRM.Lead.Edit', 'CRM.Lead.Delete', 'CRM.Lead.Assign',
    'CRM.Lead.ChangeStatus', 'CRM.Lead.Export',
    'CRM.Company.View', 'CRM.Company.Create', 'CRM.Company.Edit',
    'CRM.Company.Delete', 'CRM.Company.Assign', 'CRM.Company.Merge',
    'CRM.Contact.View', 'CRM.Contact.Create', 'CRM.Contact.Edit',
    'CRM.Contact.Delete', 'CRM.Contact.Assign', 'CRM.Contact.Merge',
    'CRM.Opportunity.View', 'CRM.Opportunity.Create', 'CRM.Opportunity.Edit',
    'CRM.Opportunity.Delete', 'CRM.Opportunity.Assign',
    'CRM.Opportunity.ChangeStage', 'CRM.Opportunity.ConvertLead',
    'CRM.Opportunity.MarkWon', 'CRM.Opportunity.MarkLost',
    'CRM.Opportunity.Reopen', 'CRM.Opportunity.Export',
    'CRM.Opportunity.ViewForecast',
    'CRM.Activity.View', 'CRM.Activity.Create', 'CRM.Activity.Edit',
    'CRM.Activity.Delete', 'CRM.Activity.Assign', 'CRM.Activity.Complete',
    'CRM.Activity.Cancel', 'CRM.Activity.Reschedule',
    'CRM.Activity.ViewTeam', 'CRM.Activity.Export',
    'CRM.Activity.ViewCalendar',
  ],
  'Business Development Executive': [
    'Company.View', 'CRM.View', 'CRM.Lead.View', 'CRM.Lead.Create',
    'CRM.Lead.Edit', 'CRM.Lead.ChangeStatus',
    'CRM.Company.View', 'CRM.Company.Create', 'CRM.Company.Edit',
    'CRM.Contact.View', 'CRM.Contact.Create', 'CRM.Contact.Edit',
    'CRM.Opportunity.View', 'CRM.Opportunity.Create', 'CRM.Opportunity.Edit',
    'CRM.Activity.View', 'CRM.Activity.Create', 'CRM.Activity.Edit',
    'CRM.Activity.Complete', 'CRM.Activity.Cancel',
    'CRM.Activity.Reschedule', 'CRM.Activity.ViewCalendar',
  ],
};

const systemLeadTypes = [
  ['RESIDENTIAL', 'Residential'], ['COMMERCIAL', 'Commercial'],
  ['INDUSTRIAL', 'Industrial'], ['RENOVATION', 'Renovation'],
  ['INFRASTRUCTURE', 'Infrastructure'], ['INTERIOR', 'Interior'],
  ['SOLAR', 'Solar'], ['MAINTENANCE', 'Maintenance'], ['OTHER', 'Other'],
] as const;

const systemLeadSources = [
  ['WEBSITE', 'Website'], ['WHATSAPP', 'WhatsApp'], ['PHONE_CALL', 'Phone Call'],
  ['EMAIL', 'Email'], ['REFERRAL', 'Referral'], ['EXISTING_CLIENT', 'Existing Client'],
  ['SOCIAL_MEDIA', 'Social Media'], ['ADVERTISEMENT', 'Advertisement'],
  ['PROPERTY_DEVELOPER', 'Property Developer'], ['CONSULTANT', 'Consultant'],
  ['ARCHITECT', 'Architect'], ['CONTRACTOR', 'Contractor'],
  ['TENDER_PORTAL', 'Tender Portal'], ['WALK_IN', 'Walk-in'], ['OTHER', 'Other'],
] as const;

const systemOpportunityStages: Array<{
  code: string;
  name: string;
  description: string;
  probability: number;
  sortOrder: number;
  isWon?: boolean;
  isLost?: boolean;
}> = [
  { code: 'QUALIFICATION', name: 'Qualification', description: 'Initial assessment of the opportunity and its fit', probability: 10, sortOrder: 10 },
  { code: 'SITE_VISIT', name: 'Site Visit', description: 'Physical site visit conducted to understand requirements', probability: 20, sortOrder: 20 },
  { code: 'REQUIREMENTS_DEFINED', name: 'Requirements Defined', description: 'Client requirements captured and documented', probability: 30, sortOrder: 30 },
  { code: 'ESTIMATION', name: 'Estimation', description: 'Cost estimation and pricing in progress', probability: 40, sortOrder: 40 },
  { code: 'PROPOSAL', name: 'Proposal', description: 'Technical and commercial proposal submitted', probability: 60, sortOrder: 50 },
  { code: 'NEGOTIATION', name: 'Negotiation', description: 'Terms and pricing under negotiation', probability: 75, sortOrder: 60 },
  { code: 'FINAL_REVIEW', name: 'Final Review', description: 'Final review and approval of the deal', probability: 90, sortOrder: 70 },
  { code: 'WON', name: 'Won', description: 'Opportunity won and converted to a contract', probability: 100, sortOrder: 80, isWon: true },
  { code: 'LOST', name: 'Lost', description: 'Opportunity lost', probability: 0, sortOrder: 90, isLost: true },
];

const systemOpportunityTypes = [
  ['RESIDENTIAL_CONSTRUCTION', 'Residential Construction'],
  ['COMMERCIAL_CONSTRUCTION', 'Commercial Construction'],
  ['INDUSTRIAL_CONSTRUCTION', 'Industrial Construction'],
  ['INFRASTRUCTURE', 'Infrastructure'],
  ['RENOVATION', 'Renovation'],
  ['INTERIOR_FIT_OUT', 'Interior Fit-Out'],
  ['SOLAR', 'Solar'],
  ['MAINTENANCE', 'Maintenance'],
  ['CIVIL_WORKS', 'Civil Works'],
  ['MEP', 'MEP'],
  ['OTHER', 'Other'],
] as const;

const systemOpportunitySources = [
  ['EXISTING_LEAD', 'Existing Lead'], ['REFERRAL', 'Referral'],
  ['WEBSITE', 'Website'], ['WHATSAPP', 'WhatsApp'], ['PHONE', 'Phone'],
  ['EMAIL', 'Email'], ['TENDER_PORTAL', 'Tender Portal'],
  ['ARCHITECT', 'Architect'], ['CONSULTANT', 'Consultant'],
  ['DEVELOPER', 'Developer'], ['EXISTING_CLIENT', 'Existing Client'],
  ['DIRECT_CONTACT', 'Direct Contact'], ['OTHER', 'Other'],
] as const;

const systemOpportunityLostReasons = [
  ['PRICE', 'Price too high'], ['COMPETITOR', 'Lost to competitor'],
  ['CLIENT_CANCELLED', 'Client cancelled'], ['PROJECT_CANCELLED', 'Project cancelled'],
  ['SCOPE_CHANGED', 'Scope changed'], ['TIMING', 'Timing / project delayed'],
  ['NO_RESPONSE', 'No response from client'], ['BUDGET', 'Client budget constraints'],
  ['OTHER', 'Other'],
] as const;

const systemCrmCompanyTypes = [
  ['CLIENT', 'Client'], ['POTENTIAL_CLIENT', 'Potential Client'],
  ['DEVELOPER', 'Developer'], ['PROPERTY_OWNER', 'Property Owner'],
  ['ARCHITECT_FIRM', 'Architect Firm'], ['ENGINEERING_CONSULTANT', 'Engineering Consultant'],
  ['PROJECT_MANAGEMENT_CONSULTANT', 'Project Management Consultant'],
  ['CONTRACTOR', 'Contractor'], ['SUBCONTRACTOR', 'Subcontractor'],
  ['SUPPLIER', 'Supplier'], ['MANUFACTURER', 'Manufacturer'],
  ['GOVERNMENT_ORGANIZATION', 'Government Organization'],
  ['REAL_ESTATE_COMPANY', 'Real Estate Company'], ['INVESTOR', 'Investor'],
  ['OTHER', 'Other'],
] as const;

const systemCrmContactTypes = [
  ['DECISION_MAKER', 'Decision Maker'], ['OWNER', 'Owner'], ['DIRECTOR', 'Director'],
  ['CEO', 'CEO'], ['CFO', 'CFO'], ['PROJECT_MANAGER', 'Project Manager'],
  ['ARCHITECT', 'Architect'], ['ENGINEER', 'Engineer'], ['CONSULTANT', 'Consultant'],
  ['PROCUREMENT_OFFICER', 'Procurement Officer'], ['QUANTITY_SURVEYOR', 'Quantity Surveyor'],
  ['SITE_MANAGER', 'Site Manager'], ['ACCOUNTANT', 'Accountant'],
  ['SALES_CONTACT', 'Sales Contact'], ['TECHNICAL_CONTACT', 'Technical Contact'],
  ['OTHER', 'Other'],
] as const;

const systemEmploymentTypes = [
  ['PERMANENT', 'Permanent'],
  ['CONTRACT', 'Contract'],
  ['DAILY_WAGE', 'Daily Wage'],
  ['HOURLY', 'Hourly'],
  ['CONSULTANT', 'Consultant'],
  ['INTERN', 'Intern'],
  ['SUBCONTRACTOR', 'Subcontractor'],
  ['TEMPORARY', 'Temporary'],
] as const;

const systemWorkforceSkills = [
  ['CIVIL', 'Civil'],
  ['ELECTRICAL', 'Electrical'],
  ['MECHANICAL', 'Mechanical'],
  ['PLUMBING', 'Plumbing'],
  ['PLANNING', 'Planning'],
  ['QUANTITY_SURVEYING', 'Quantity Surveying'],
  ['PROCUREMENT', 'Procurement'],
  ['ACCOUNTING', 'Accounting'],
  ['SAFETY', 'Safety'],
  ['QUALITY', 'Quality'],
  ['ADMINISTRATION', 'Administration'],
] as const;

const systemProjectStatuses: Array<{
  code: string;
  name: string;
  lifecycle: ProjectLifecycleStatus;
  isTerminal: boolean;
  sortOrder: number;
}> = [
  { code: 'DRAFT', name: 'Draft', lifecycle: ProjectLifecycleStatus.DRAFT, isTerminal: false, sortOrder: 10 },
  { code: 'PLANNING', name: 'Planning', lifecycle: ProjectLifecycleStatus.PLANNING, isTerminal: false, sortOrder: 20 },
  { code: 'TENDER', name: 'Tender', lifecycle: ProjectLifecycleStatus.TENDER, isTerminal: false, sortOrder: 30 },
  { code: 'AWARDED', name: 'Awarded', lifecycle: ProjectLifecycleStatus.AWARDED, isTerminal: false, sortOrder: 40 },
  { code: 'MOBILIZATION', name: 'Mobilization', lifecycle: ProjectLifecycleStatus.MOBILIZATION, isTerminal: false, sortOrder: 50 },
  { code: 'IN_PROGRESS', name: 'In Progress', lifecycle: ProjectLifecycleStatus.IN_PROGRESS, isTerminal: false, sortOrder: 60 },
  { code: 'ON_HOLD', name: 'On Hold', lifecycle: ProjectLifecycleStatus.ON_HOLD, isTerminal: false, sortOrder: 70 },
  { code: 'DELAYED', name: 'Delayed', lifecycle: ProjectLifecycleStatus.DELAYED, isTerminal: false, sortOrder: 80 },
  { code: 'COMPLETED', name: 'Completed', lifecycle: ProjectLifecycleStatus.COMPLETED, isTerminal: false, sortOrder: 90 },
  { code: 'CLOSED', name: 'Closed', lifecycle: ProjectLifecycleStatus.CLOSED, isTerminal: true, sortOrder: 100 },
  { code: 'CANCELLED', name: 'Cancelled', lifecycle: ProjectLifecycleStatus.CANCELLED, isTerminal: true, sortOrder: 110 },
];

const systemProjectTypes: Array<{ code: string; name: string }> = [
  { code: 'RESIDENTIAL', name: 'Residential' },
  { code: 'COMMERCIAL', name: 'Commercial' },
  { code: 'INDUSTRIAL', name: 'Industrial' },
  { code: 'INFRASTRUCTURE', name: 'Infrastructure' },
  { code: 'HOSPITAL', name: 'Hospital' },
  { code: 'SCHOOL', name: 'School' },
  { code: 'APARTMENT', name: 'Apartment' },
  { code: 'VILLA', name: 'Villa' },
  { code: 'FACTORY', name: 'Factory' },
  { code: 'WAREHOUSE', name: 'Warehouse' },
  { code: 'SOLAR', name: 'Solar Project' },
  { code: 'ROAD', name: 'Road' },
  { code: 'BRIDGE', name: 'Bridge' },
];

async function seedPermissionsAndRoles(): Promise<void> {
  const permissions = new Map<string, string>();
  for (const [code, subject, action] of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { code },
      create: {
        code,
        subject,
        action,
        description: `${action} access for ${subject}`,
        isSystem: true,
      },
      update: {
        subject,
        action,
        description: `${action} access for ${subject}`,
        isSystem: true,
        deletedAt: null,
      },
    });
    permissions.set(code, permission.id);
  }

  for (const [name, codes] of Object.entries(rolePermissions)) {
    let role = await prisma.role.findFirst({
      where: { name, companyId: null },
    });
    role ??= await prisma.role.create({
      data: {
        name,
        description: `System role: ${name}`,
        isSystem: true,
      },
    });
    await prisma.role.update({
      where: { id: role.id },
      data: {
        description: `System role: ${name}`,
        isSystem: true,
        deletedAt: null,
      },
    });
    for (const code of codes) {
      const permissionId = permissions.get(code);
      if (!permissionId) {
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        create: { roleId: role.id, permissionId },
        update: { deletedAt: null },
      });
    }
  }
}

async function seedProjectCatalog(): Promise<void> {
  for (const status of systemProjectStatuses) {
    const existing = await prisma.projectStatusDefinition.findFirst({
      where: {
        companyId: null,
        code: status.code,
        isSystem: true,
      },
    });
    if (existing) {
      await prisma.projectStatusDefinition.update({
        where: { id: existing.id },
        data: {
          name: status.name,
          lifecycle: status.lifecycle,
          isTerminal: status.isTerminal,
          sortOrder: status.sortOrder,
          isSystem: true,
          deletedAt: null,
        },
      });
      continue;
    }
    await prisma.projectStatusDefinition.create({
      data: {
        companyId: null,
        code: status.code,
        name: status.name,
        lifecycle: status.lifecycle,
        isSystem: true,
        isTerminal: status.isTerminal,
        sortOrder: status.sortOrder,
      },
    });
  }

  for (const type of systemProjectTypes) {
    const existing = await prisma.projectTypeDefinition.findFirst({
      where: {
        companyId: null,
        code: type.code,
        isSystem: true,
      },
    });
    if (existing) {
      await prisma.projectTypeDefinition.update({
        where: { id: existing.id },
        data: {
          name: type.name,
          isSystem: true,
          deletedAt: null,
        },
      });
      continue;
    }
    await prisma.projectTypeDefinition.create({
      data: {
        companyId: null,
        code: type.code,
        name: type.name,
        isSystem: true,
      },
    });
  }
}

async function seedBootstrapAdministrator(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email && !password) {
    return;
  }
  if (!email || !password) {
    throw new Error(
      'BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be provided together',
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: {
      firstName: 'Platform',
      lastName: 'Administrator',
      email,
      password: passwordHash,
      status: UserStatus.ACTIVE,
      isPlatformAdmin: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      password: passwordHash,
      status: UserStatus.ACTIVE,
      isPlatformAdmin: true,
      deletedAt: null,
      emailVerifiedAt: new Date(),
    },
  });
}

async function seedWorkforceCatalog(): Promise<void> {
  for (const [code, name] of systemEmploymentTypes) {
    const existing = await prisma.employmentType.findFirst({ where: { companyId: null, code } });
    if (existing) {
      await prisma.employmentType.update({ where: { id: existing.id }, data: { name, isSystem: true, deletedAt: null } });
    } else {
      await prisma.employmentType.create({ data: { code, name, isSystem: true } });
    }
  }
  for (const [code, name] of systemWorkforceSkills) {
    const existing = await prisma.workforceSkill.findFirst({ where: { companyId: null, code } });
    if (existing) {
      await prisma.workforceSkill.update({ where: { id: existing.id }, data: { name, isSystem: true, deletedAt: null } });
    } else {
      await prisma.workforceSkill.create({ data: { code, name, isSystem: true } });
    }
  }
}

async function seedLeadCatalog(): Promise<void> {
  for (const [index, [code, name]] of systemLeadTypes.entries()) {
    const existing = await prisma.leadTypeDefinition.findFirst({ where: { companyId: null, code } });
    if (existing) {
      await prisma.leadTypeDefinition.update({ where: { id: existing.id }, data: { name, isSystem: true, sortOrder: (index + 1) * 10, deletedAt: null } });
    } else {
      await prisma.leadTypeDefinition.create({ data: { code, name, isSystem: true, sortOrder: (index + 1) * 10 } });
    }
  }
  for (const [index, [code, name]] of systemLeadSources.entries()) {
    const existing = await prisma.leadSourceDefinition.findFirst({ where: { companyId: null, code } });
    if (existing) {
      await prisma.leadSourceDefinition.update({ where: { id: existing.id }, data: { name, isSystem: true, sortOrder: (index + 1) * 10, deletedAt: null } });
    } else {
      await prisma.leadSourceDefinition.create({ data: { code, name, isSystem: true, sortOrder: (index + 1) * 10 } });
    }
  }
}

async function seedCrmPartyCatalog(): Promise<void> {
  for (const [index, [code, name]] of systemCrmCompanyTypes.entries()) {
    const existing = await prisma.crmCompanyTypeDefinition.findFirst({ where: { companyId: null, code } });
    if (existing) await prisma.crmCompanyTypeDefinition.update({ where: { id: existing.id }, data: { name, isSystem: true, sortOrder: (index + 1) * 10, deletedAt: null } });
    else await prisma.crmCompanyTypeDefinition.create({ data: { code, name, isSystem: true, sortOrder: (index + 1) * 10 } });
  }
  for (const [index, [code, name]] of systemCrmContactTypes.entries()) {
    const existing = await prisma.crmContactTypeDefinition.findFirst({ where: { companyId: null, code } });
    if (existing) await prisma.crmContactTypeDefinition.update({ where: { id: existing.id }, data: { name, isSystem: true, sortOrder: (index + 1) * 10, deletedAt: null } });
    else await prisma.crmContactTypeDefinition.create({ data: { code, name, isSystem: true, sortOrder: (index + 1) * 10 } });
  }
}

async function seedOpportunityCatalog(): Promise<void> {
  for (const stage of systemOpportunityStages) {
    const existing = await prisma.opportunityStageDefinition.findFirst({ where: { companyId: null, code: stage.code } });
    if (existing) {
      await prisma.opportunityStageDefinition.update({
        where: { id: existing.id },
        data: {
          name: stage.name,
          description: stage.description,
          probability: stage.probability,
          sortOrder: stage.sortOrder,
          isWon: stage.isWon ?? false,
          isLost: stage.isLost ?? false,
          isSystem: true,
          deletedAt: null,
        },
      });
    } else {
      await prisma.opportunityStageDefinition.create({
        data: {
          code: stage.code,
          name: stage.name,
          description: stage.description,
          probability: stage.probability,
          sortOrder: stage.sortOrder,
          isWon: stage.isWon ?? false,
          isLost: stage.isLost ?? false,
          isSystem: true,
        },
      });
    }
  }

  for (const [index, [code, name]] of systemOpportunityTypes.entries()) {
    const existing = await prisma.opportunityTypeDefinition.findFirst({ where: { companyId: null, code } });
    if (existing) await prisma.opportunityTypeDefinition.update({ where: { id: existing.id }, data: { name, isSystem: true, sortOrder: (index + 1) * 10, deletedAt: null } });
    else await prisma.opportunityTypeDefinition.create({ data: { code, name, isSystem: true, sortOrder: (index + 1) * 10 } });
  }

  for (const [index, [code, name]] of systemOpportunitySources.entries()) {
    const existing = await prisma.opportunitySourceDefinition.findFirst({ where: { companyId: null, code } });
    if (existing) await prisma.opportunitySourceDefinition.update({ where: { id: existing.id }, data: { name, isSystem: true, sortOrder: (index + 1) * 10, deletedAt: null } });
    else await prisma.opportunitySourceDefinition.create({ data: { code, name, isSystem: true, sortOrder: (index + 1) * 10 } });
  }

  for (const [index, [code, name]] of systemOpportunityLostReasons.entries()) {
    const existing = await prisma.opportunityLostReasonDefinition.findFirst({ where: { companyId: null, code } });
    if (existing) await prisma.opportunityLostReasonDefinition.update({ where: { id: existing.id }, data: { name, isSystem: true, sortOrder: (index + 1) * 10, deletedAt: null } });
    else await prisma.opportunityLostReasonDefinition.create({ data: { code, name, isSystem: true, sortOrder: (index + 1) * 10 } });
  }
}

async function main(): Promise<void> {
  await seedPermissionsAndRoles();
  await seedProjectCatalog();
  await seedWorkforceCatalog();
  await seedLeadCatalog();
  await seedCrmPartyCatalog();
  await seedOpportunityCatalog();
  await seedBootstrapAdministrator();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
