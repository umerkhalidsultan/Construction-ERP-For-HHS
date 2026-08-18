import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { ApiError } from '../../lib/api-client';
import {
  getCompanySettings,
  updateCompanySettings,
} from '../../services/companies.service';

const settingsSchema = z.object({
  workingHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  workingHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  financialYearStart: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
  currency: z.string().length(3),
  dateFormat: z.string().min(1),
  timeFormat: z.enum(['12h', '24h']),
  measurementSystem: z.enum(['METRIC', 'IMPERIAL']),
  distanceUnit: z.string().min(1),
  temperatureUnit: z.enum(['CELSIUS', 'FAHRENHEIT']),
  language: z.string().min(2),
  autoNumberingEnabled: z.enum(['true', 'false']),
  fiscalYearName: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function CompanySettingsPage() {
  const { companyId = '' } = useParams();
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const settingsQuery = useQuery({
    queryKey: ['company-settings', companyId],
    queryFn: async () => (await getCompanySettings(companyId)).data,
    enabled: Boolean(companyId),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      form.reset({
        workingHoursStart: settingsQuery.data.workingHoursStart,
        workingHoursEnd: settingsQuery.data.workingHoursEnd,
        financialYearStart: settingsQuery.data.financialYearStart,
        currency: settingsQuery.data.currency,
        dateFormat: settingsQuery.data.dateFormat,
        timeFormat: settingsQuery.data.timeFormat as '12h' | '24h',
        measurementSystem: settingsQuery.data.measurementSystem as
          | 'METRIC'
          | 'IMPERIAL',
        distanceUnit: settingsQuery.data.distanceUnit,
        temperatureUnit: settingsQuery.data.temperatureUnit as
          | 'CELSIUS'
          | 'FAHRENHEIT',
        language: settingsQuery.data.language,
        autoNumberingEnabled: settingsQuery.data.autoNumberingEnabled
          ? 'true'
          : 'false',
        fiscalYearName: settingsQuery.data.fiscalYearName ?? '',
      });
    }
  }, [settingsQuery.data, form]);

  const mutation = useMutation({
    mutationFn: async (values: SettingsFormValues) =>
      updateCompanySettings(companyId, {
        ...values,
        autoNumberingEnabled: values.autoNumberingEnabled === 'true',
        fiscalYearName: values.fiscalYearName || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['company-settings', companyId],
      });
    },
  });

  return (
    <div>
      <PageHeader
        title="Company settings"
        description="Operational defaults for working hours, fiscal calendar, units, and numbering."
      />

      {settingsQuery.isError ? (
        <Alert>Unable to load company settings.</Alert>
      ) : null}
      {mutation.isError ? (
        <div className="mb-4">
          <Alert>
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : 'Unable to save settings'}
          </Alert>
        </div>
      ) : null}
      {mutation.isSuccess ? (
        <div className="mb-4">
          <Alert tone="success">Settings saved successfully.</Alert>
        </div>
      ) : null}

      <form
        className="space-y-4 border border-slate-200 bg-white p-5"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Working hours start"
            {...form.register('workingHoursStart')}
          />
          <Input
            label="Working hours end"
            {...form.register('workingHoursEnd')}
          />
          <Input
            label="Financial year start (MM-DD)"
            {...form.register('financialYearStart')}
          />
          <Input label="Fiscal year name" {...form.register('fiscalYearName')} />
          <Input label="Currency" {...form.register('currency')} />
          <Input label="Date format" {...form.register('dateFormat')} />
          <Select
            label="Time format"
            options={[
              { label: '24-hour', value: '24h' },
              { label: '12-hour', value: '12h' },
            ]}
            {...form.register('timeFormat')}
          />
          <Select
            label="Measurement system"
            options={[
              { label: 'Metric', value: 'METRIC' },
              { label: 'Imperial', value: 'IMPERIAL' },
            ]}
            {...form.register('measurementSystem')}
          />
          <Select
            label="Distance unit"
            options={[
              { label: 'Meter', value: 'METER' },
              { label: 'Kilometer', value: 'KILOMETER' },
              { label: 'Foot', value: 'FOOT' },
              { label: 'Mile', value: 'MILE' },
            ]}
            {...form.register('distanceUnit')}
          />
          <Select
            label="Temperature unit"
            options={[
              { label: 'Celsius', value: 'CELSIUS' },
              { label: 'Fahrenheit', value: 'FAHRENHEIT' },
            ]}
            {...form.register('temperatureUnit')}
          />
          <Input label="Language" {...form.register('language')} />
          <Select
            label="Auto numbering"
            options={[
              { label: 'Enabled', value: 'true' },
              { label: 'Disabled', value: 'false' },
            ]}
            {...form.register('autoNumberingEnabled')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
