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
  ['Employee.AssignProject', 'Employee', 'AssignProject'],
  ['Employee.Transfer', 'Employee', 'Transfer'],
  ['Employee.Export', 'Employee', 'Export'],
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
  ],
  'Site Engineer': ['Company.View', 'Project.View', 'ProjectPlanning.View', 'Gantt.View', 'Baseline.View', 'Progress.View', 'Progress.Update'],
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
};

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

async function main(): Promise<void> {
  await seedPermissionsAndRoles();
  await seedProjectCatalog();
  await seedWorkforceCatalog();
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
