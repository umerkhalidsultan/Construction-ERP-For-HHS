import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FormErrorSummary } from '../../components/feedback/FormErrorSummary';
import { useToast } from '../../components/feedback/Toast';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { ApiError, userErrorMessage } from '../../lib/api-client';
import { applyApiFieldErrors } from '../../lib/errors/apply-field-errors';
import { changePassword } from '../../services/auth.service';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password.'),
    newPassword: z
      .string()
      .min(12, 'New password must be at least 12 characters.')
      .regex(/[a-z]/, 'New password must include a lower case letter.')
      .regex(/[A-Z]/, 'New password must include an upper case letter.')
      .regex(/\d/, 'New password must include a number.')
      .regex(/[^A-Za-z0-9]/, 'New password must include a symbol.'),
    confirmPassword: z.string().min(1, 'Please repeat the new password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'The new passwords do not match.',
    path: ['confirmPassword'],
  });
type Values = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => changePassword(values),
    onSuccess: () => {
      form.reset();
      toast.success(
        'Password changed. Other active sessions have been signed out.',
      );
      navigate('/dashboard');
    },
    onError: (error) =>
      applyApiFieldErrors(form.setError, error instanceof ApiError ? error : {}),
  });
  const errors = Object.values(form.formState.errors)
    .map((x) => x?.message)
    .filter((x): x is string => Boolean(x));

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Change password"
        description="Update the password used to sign in to the ERP."
      />
      {mutation.isError ? (
        <div className="mb-4">
          <Alert>{userErrorMessage(mutation.error)}</Alert>
        </div>
      ) : null}
      <form
        noValidate
        className="space-y-5 rounded-lg border border-slate-200 bg-white p-5"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <FormErrorSummary messages={errors} />
        <Input
          label="Current password *"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.currentPassword?.message}
          {...form.register('currentPassword')}
        />
        <Input
          label="New password *"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <Input
          label="Confirm new password *"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
        <Alert tone="info">
          At least 12 characters, including upper case, lower case, a number and
          a symbol. Signing in elsewhere will require the new password.
        </Alert>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Change password'}
          </Button>
        </div>
      </form>
    </div>
  );
}
