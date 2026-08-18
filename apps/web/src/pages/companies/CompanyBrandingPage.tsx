import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
  getCompanyBranding,
  updateCompanyBranding,
  uploadBrandAsset,
} from '../../services/companies.service';

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

const assetPurposes = [
  { label: 'Logo', value: 'COMPANY_LOGO' },
  { label: 'Favicon', value: 'FAVICON' },
  { label: 'Report header', value: 'REPORT_HEADER' },
  { label: 'Report footer', value: 'REPORT_FOOTER' },
  { label: 'Email logo', value: 'EMAIL_LOGO' },
  { label: 'Watermark', value: 'WATERMARK' },
];

export function CompanyBrandingPage() {
  const { companyId = '' } = useParams();
  const queryClient = useQueryClient();
  const [purpose, setPurpose] = useState('COMPANY_LOGO');
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
  });

  const brandingQuery = useQuery({
    queryKey: ['company-branding', companyId],
    queryFn: async () => (await getCompanyBranding(companyId)).data,
    enabled: Boolean(companyId),
  });

  useEffect(() => {
    if (brandingQuery.data) {
      form.reset({
        primaryColor: brandingQuery.data.primaryColor,
        secondaryColor: brandingQuery.data.secondaryColor,
        accentColor: brandingQuery.data.accentColor,
        theme: brandingQuery.data.theme,
      });
    }
  }, [brandingQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: BrandingFormValues) =>
      updateCompanyBranding(companyId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['company-branding', companyId],
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadBrandAsset(companyId, purpose, file),
    onSuccess: async () => {
      setUploadMessage('Brand asset uploaded successfully.');
      await queryClient.invalidateQueries({
        queryKey: ['company-branding', companyId],
      });
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] });
    },
    onError: (error) => {
      setUploadMessage(
        error instanceof ApiError
          ? error.message
          : 'Brand asset upload failed.',
      );
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company branding"
        description="Brand colors and image assets used across reports, emails, and the portal."
      />

      {saveMutation.isError ? (
        <Alert>
          {saveMutation.error instanceof ApiError
            ? saveMutation.error.message
            : 'Unable to save branding'}
        </Alert>
      ) : null}

      <form
        className="space-y-4 border border-slate-200 bg-white p-5"
        onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Primary color" {...form.register('primaryColor')} />
          <Input label="Secondary color" {...form.register('secondaryColor')} />
          <Input label="Accent color" {...form.register('accentColor')} />
          <Select
            label="Theme"
            options={[
              { label: 'Light', value: 'LIGHT' },
              { label: 'Dark', value: 'DARK' },
              { label: 'System', value: 'SYSTEM' },
            ]}
            {...form.register('theme')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending}>
            Save colors
          </Button>
        </div>
      </form>

      <section className="space-y-4 border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Brand asset upload
        </h2>
        <p className="text-sm text-slate-500">
          Images are validated, compressed, and stored under a tenant-prefixed
          Cloudflare R2 object key.
        </p>
        <Select
          label="Asset type"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          options={assetPurposes}
        />
        <Input
          label="Image file"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setUploadMessage(null);
              uploadMutation.mutate(file);
            }
          }}
        />
        {uploadMessage ? (
          <Alert
            tone={
              uploadMutation.isError
                ? 'error'
                : uploadMutation.isSuccess
                  ? 'success'
                  : 'info'
            }
          >
            {uploadMessage}
          </Alert>
        ) : null}
        {brandingQuery.data ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              ['Logo file', brandingQuery.data.logoFileId],
              ['Favicon file', brandingQuery.data.faviconFileId],
              ['Report header', brandingQuery.data.reportHeaderFileId],
              ['Report footer', brandingQuery.data.reportFooterFileId],
              ['Email logo', brandingQuery.data.emailLogoFileId],
              ['Watermark', brandingQuery.data.watermarkFileId],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-900">
                  {value ?? 'Not uploaded'}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>
    </div>
  );
}
