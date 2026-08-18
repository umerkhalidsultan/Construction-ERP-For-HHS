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
import { ApiError } from '../../lib/api-client';
import {
  isHttpWebsiteUrl,
  normalizeWebsiteUrl,
  toWebsitePayload,
} from '../../lib/website-url';
import {
  createCompany,
  getCompany,
  updateCompany,
} from '../../services/companies.service';

const companySchema = z.object({
  legalName: z.string().min(2).max(255),
  displayName: z.string().min(2).max(160),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z
    .string()
    .max(2048)
    .transform((value) => normalizeWebsiteUrl(value))
    .refine(isHttpWebsiteUrl, {
      message: 'Enter a valid website URL (for example https://example.com)',
    }),
  industry: z.string().optional(),
  companyType: z.string().min(1),
  taxRegistrationNumber: z.string().optional(),
  nationalTaxNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  currency: z.string().length(3),
  timezone: z.string().min(1),
  country: z.string().length(2),
  province: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  status: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  subscriptionPlan: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompanyFormPage() {
  const { companyId } = useParams();
  const isEdit = Boolean(companyId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const companyQuery = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const response = await getCompany(companyId!);
      return response.data;
    },
    enabled: isEdit,
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      website: '',
      companyType: 'PRIVATE',
      currency: 'USD',
      timezone: 'UTC',
      country: 'PK',
      status: 'ACTIVE',
      subscriptionStatus: 'TRIAL',
    },
  });

  useEffect(() => {
    if (companyQuery.data) {
      form.reset({
        legalName: companyQuery.data.legalName,
        displayName: companyQuery.data.displayName,
        email: companyQuery.data.email ?? '',
        phone: companyQuery.data.phone ?? '',
        website: companyQuery.data.website ?? '',
        industry: companyQuery.data.industry ?? '',
        companyType: companyQuery.data.companyType,
        taxRegistrationNumber: companyQuery.data.taxRegistrationNumber ?? '',
        nationalTaxNumber: companyQuery.data.nationalTaxNumber ?? '',
        registrationNumber: companyQuery.data.registrationNumber ?? '',
        currency: companyQuery.data.currency,
        timezone: companyQuery.data.timezone,
        country: companyQuery.data.country,
        province: companyQuery.data.province ?? '',
        city: companyQuery.data.city ?? '',
        postalCode: companyQuery.data.postalCode ?? '',
        address: companyQuery.data.address ?? '',
        status: companyQuery.data.status,
        subscriptionStatus: companyQuery.data.subscriptionStatus,
        subscriptionPlan: companyQuery.data.subscriptionPlan ?? '',
      });
    }
  }, [companyQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      const { website, ...rest } = values;
      const body: Record<string, unknown> = Object.fromEntries(
        Object.entries(rest).map(([key, value]) => [
          key,
          value === '' ? undefined : value,
        ]),
      );
      body.website = toWebsitePayload(website);
      if (isEdit && companyId) {
        return updateCompany(companyId, body);
      }
      return createCompany(body);
    },
    onSuccess: async (response) => {
      const savedId = response.data.id;
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      await queryClient.invalidateQueries({ queryKey: ['company', savedId] });
      navigate(`/companies/${savedId}`);
    },
  });

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit company' : 'Create company'}
        description="Legal identity, subscription limits, and regional defaults for the tenant."
      />

      {mutation.isError ? (
        <div className="mb-4">
          <Alert>
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : 'Unable to save company'}
          </Alert>
        </div>
      ) : null}

      <form
        className="space-y-6 border border-slate-200 bg-white p-5"
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Legal name"
            error={form.formState.errors.legalName?.message}
            {...form.register('legalName')}
          />
          <Input
            label="Display name"
            error={form.formState.errors.displayName?.message}
            {...form.register('displayName')}
          />
          <Input label="Email" {...form.register('email')} />
          <Input label="Phone" {...form.register('phone')} />
          <Input
            label="Website"
            placeholder="https://example.com"
            error={form.formState.errors.website?.message}
            {...form.register('website')}
          />
          <Input label="Industry" {...form.register('industry')} />
          <Select
            label="Company type"
            options={[
              { label: 'Private', value: 'PRIVATE' },
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Partnership', value: 'PARTNERSHIP' },
              { label: 'Sole proprietorship', value: 'SOLE_PROPRIETORSHIP' },
              { label: 'Non-profit', value: 'NON_PROFIT' },
              { label: 'Government', value: 'GOVERNMENT' },
              { label: 'Other', value: 'OTHER' },
            ]}
            {...form.register('companyType')}
          />
          <Input label="Currency" {...form.register('currency')} />
          <Input label="Timezone" {...form.register('timezone')} />
          <Input label="Country (ISO-2)" {...form.register('country')} />
          <Input label="Province" {...form.register('province')} />
          <Input label="City" {...form.register('city')} />
          <Input label="Postal code" {...form.register('postalCode')} />
          <Input
            label="Tax registration number"
            {...form.register('taxRegistrationNumber')}
          />
          <Input
            label="National tax number"
            {...form.register('nationalTaxNumber')}
          />
          <Input
            label="Registration number"
            {...form.register('registrationNumber')}
          />
          <Input label="Subscription plan" {...form.register('subscriptionPlan')} />
          <Input label="Address" className="md:col-span-2" {...form.register('address')} />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save company'}
          </Button>
        </div>
      </form>
    </div>
  );
}
