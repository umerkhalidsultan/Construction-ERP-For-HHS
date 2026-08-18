import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { FormErrorSummary } from '../../components/feedback/FormErrorSummary';
import { ApiError, userErrorMessage } from '../../lib/api-client';
import { applyApiFieldErrors } from '../../lib/errors/apply-field-errors';
import {
  branchesApi,
  departmentsApi,
  designationsApi,
} from '../../services/companies.service';
import { workforceApi } from '../../services/workforce.service';

const schema = z.object({
  employeeCode: z.string().min(2, 'Employee Code is required.').max(50),
  firstName: z.string().min(1, 'First Name is required.').max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1, 'Last Name is required.').max(100),
  preferredName: z.string().max(100).optional(),
  gender: z.string(),
  dateOfBirth: z.string().optional(),
  nationalId: z.string().max(100).optional(),
  passportNumber: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  maritalStatus: z.string(),
  bloodGroup: z.string().max(10).optional(),
  phone: z.string().max(32).optional(),
  personalEmail: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  companyEmail: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  emergencyContactName: z.string().max(160).optional(),
  emergencyContactPhone: z.string().max(32).optional(),
  emergencyContactRelationship: z.string().max(100).optional(),
  status: z.string(),
  availability: z.string(),
  employmentTypeId: z.string().optional(),
  joiningDate: z.string().optional(),
  confirmationDate: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  managerEmployeeId: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const blank: Values = {
  employeeCode: '',
  firstName: '',
  middleName: '',
  lastName: '',
  preferredName: '',
  gender: 'UNDISCLOSED',
  dateOfBirth: '',
  nationalId: '',
  passportNumber: '',
  nationality: '',
  maritalStatus: 'UNDISCLOSED',
  bloodGroup: '',
  phone: '',
  personalEmail: '',
  companyEmail: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  status: 'ACTIVE',
  availability: 'AVAILABLE',
  employmentTypeId: '',
  joiningDate: new Date().toISOString().slice(0, 10),
  confirmationDate: '',
  branchId: '',
  departmentId: '',
  designationId: '',
  managerEmployeeId: '',
};

export function EmployeeFormPage() {
  const { companyId = '', employeeId } = useParams();
  const isEdit = Boolean(employeeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(
      schema.superRefine((values, ctx) => {
        if (!isEdit && !values.employmentTypeId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['employmentTypeId'],
            message: 'Please select an employment type.',
          });
        }
        if (!isEdit && !values.joiningDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['joiningDate'],
            message: 'Joining Date is required.',
          });
        }
      }),
    ),
    defaultValues: blank,
  });
  const employee = useQuery({
    queryKey: ['employee', companyId, employeeId],
    queryFn: async () =>
      (await workforceApi.getEmployee(companyId, employeeId!)).data,
    enabled: isEdit,
  });
  const employmentTypes = useQuery({
    queryKey: ['employment-types', companyId],
    queryFn: async () => (await workforceApi.employmentTypes(companyId)).data,
    enabled: Boolean(companyId),
  });
  const managers = useQuery({
    queryKey: ['employee-options', companyId],
    queryFn: async () =>
      (
        await workforceApi.listEmployees(companyId, {
          limit: 200,
          status: 'ACTIVE',
        })
      ).data,
    enabled: Boolean(companyId) && !isEdit,
  });
  const branches = useQuery({
    queryKey: ['branches', companyId],
    queryFn: async () =>
      (await branchesApi.list(companyId, { limit: 200 })).data,
    enabled: Boolean(companyId) && !isEdit,
  });
  const departments = useQuery({
    queryKey: ['departments', companyId],
    queryFn: async () =>
      (await departmentsApi.list(companyId, { limit: 200 })).data,
    enabled: Boolean(companyId) && !isEdit,
  });
  const designations = useQuery({
    queryKey: ['designations', companyId],
    queryFn: async () =>
      (await designationsApi.list(companyId, { limit: 200 })).data,
    enabled: Boolean(companyId) && !isEdit,
  });

  useEffect(() => {
    const row = employee.data;
    if (!row) return;
    form.reset({
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      middleName: row.middleName ?? '',
      lastName: row.lastName,
      preferredName: row.preferredName ?? '',
      gender: row.gender,
      dateOfBirth: row.dateOfBirth?.slice(0, 10) ?? '',
      nationalId: row.nationalId ?? '',
      passportNumber: row.passportNumber ?? '',
      nationality: row.nationality ?? '',
      maritalStatus: row.maritalStatus,
      bloodGroup: row.bloodGroup ?? '',
      phone: row.phone ?? '',
      personalEmail: row.personalEmail ?? '',
      companyEmail: row.companyEmail ?? '',
      emergencyContactName: row.emergencyContactName ?? '',
      emergencyContactPhone: row.emergencyContactPhone ?? '',
      emergencyContactRelationship: row.emergencyContactRelationship ?? '',
      status: row.status,
      availability: row.availability,
      employmentTypeId: '',
      joiningDate: '',
      confirmationDate: row.confirmationDate?.slice(0, 10) ?? '',
      branchId: '',
      departmentId: '',
      designationId: '',
      managerEmployeeId: '',
    });
  }, [employee.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const body = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value || undefined]),
      );
      if (isEdit) {
        const {
          employmentTypeId: _a,
          joiningDate: _b,
          branchId: _c,
          departmentId: _d,
          designationId: _e,
          managerEmployeeId: _f,
          ...personal
        } = body;
        return workforceApi.updateEmployee(companyId, employeeId!, {
          ...personal,
          expectedUpdatedAt: employee.data?.updatedAt,
        });
      }
      return workforceApi.createEmployee(companyId, body);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ['employees', companyId],
      });
      navigate(`/companies/${companyId}/employees/${response.data.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        applyApiFieldErrors(form.setError, error);
      }
    },
  });

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit employee' : 'Add employee'}
        description={
          isEdit
            ? 'Update personal and contact information. Use Transfer on the profile for organization changes.'
            : 'Create the workforce record independently from login access.'
        }
      />
      {mutation.error ? (
        <div className="mb-4">
          {mutation.error instanceof ApiError && mutation.error.errors?.length ? (
            <FormErrorSummary messages={mutation.error.errors} />
          ) : (
            <Alert>{userErrorMessage(mutation.error)}</Alert>
          )}
        </div>
      ) : null}
      <form
        className="space-y-6 rounded-md border border-slate-200 bg-white p-5"
        noValidate
        onSubmit={form.handleSubmit((value) => mutation.mutate(value))}
      >
        <Section title="Identity">
          <Input
            label="Employee code"
            error={form.formState.errors.employeeCode?.message}
            {...form.register('employeeCode')}
          />
          <Input
            label="First name"
            error={form.formState.errors.firstName?.message}
            {...form.register('firstName')}
          />
          <Input label="Middle name" {...form.register('middleName')} />
          <Input
            label="Last name"
            error={form.formState.errors.lastName?.message}
            {...form.register('lastName')}
          />
          <Input label="Preferred name" {...form.register('preferredName')} />
          <Select
            label="Gender"
            {...form.register('gender')}
            options={['UNDISCLOSED', 'MALE', 'FEMALE', 'OTHER'].map(
              (value) => ({ value, label: value }),
            )}
          />
          <Input
            label="Date of birth"
            type="date"
            {...form.register('dateOfBirth')}
          />
          <Input label="National ID" {...form.register('nationalId')} />
          <Input label="Passport number" {...form.register('passportNumber')} />
          <Input label="Nationality" {...form.register('nationality')} />
          <Select
            label="Marital status"
            {...form.register('maritalStatus')}
            options={[
              'UNDISCLOSED',
              'SINGLE',
              'MARRIED',
              'DIVORCED',
              'WIDOWED',
            ].map((value) => ({ value, label: value }))}
          />
          <Input label="Blood group" {...form.register('bloodGroup')} />
        </Section>
        <Section title="Contact">
          <Input label="Phone" {...form.register('phone')} />
          <Input
            label="Personal email"
            type="email"
            error={form.formState.errors.personalEmail?.message}
            {...form.register('personalEmail')}
          />
          <Input
            label="Company email"
            type="email"
            error={form.formState.errors.companyEmail?.message}
            {...form.register('companyEmail')}
          />
          <Input
            label="Emergency contact"
            {...form.register('emergencyContactName')}
          />
          <Input
            label="Emergency phone"
            {...form.register('emergencyContactPhone')}
          />
          <Input
            label="Relationship"
            {...form.register('emergencyContactRelationship')}
          />
        </Section>
        <Section title="Workforce status">
          <Select
            label="Status"
            {...form.register('status')}
            options={[
              'ACTIVE',
              'PROBATION',
              'ON_LEAVE',
              'SUSPENDED',
              'RESIGNED',
              'TERMINATED',
              'INACTIVE',
            ].map((value) => ({ value, label: value }))}
          />
          <Select
            label="Availability"
            {...form.register('availability')}
            options={[
              'AVAILABLE',
              'ASSIGNED',
              'ON_LEAVE',
              'TRAINING',
              'SUSPENDED',
              'INACTIVE',
            ].map((value) => ({ value, label: value }))}
          />
          <Input
            label="Confirmation date"
            type="date"
            {...form.register('confirmationDate')}
          />
        </Section>
        {!isEdit ? (
          <Section title="Initial employment">
            <Select
              label="Employment type"
              error={form.formState.errors.employmentTypeId?.message}
              {...form.register('employmentTypeId')}
              options={[
                { value: '', label: 'Select employment type' },
                ...(employmentTypes.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
            <Input
              label="Joining date"
              type="date"
              error={form.formState.errors.joiningDate?.message}
              {...form.register('joiningDate')}
            />
            <Select
              label="Branch"
              {...form.register('branchId')}
              options={[
                { value: '', label: 'No branch' },
                ...(branches.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
            <Select
              label="Department"
              {...form.register('departmentId')}
              options={[
                { value: '', label: 'No department' },
                ...(departments.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
            <Select
              label="Designation"
              {...form.register('designationId')}
              options={[
                { value: '', label: 'No designation' },
                ...(designations.data ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
            <Select
              label="Reports to"
              {...form.register('managerEmployeeId')}
              options={[
                { value: '', label: 'No manager' },
                ...(managers.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.firstName} ${item.lastName} (${item.employeeCode})`,
                })),
              ]}
            />
          </Section>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save employee'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
