import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { userErrorMessage } from '../../lib/api-client';
import { login } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must meet the required security requirements.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const response = await login(values.email, values.password);
      setAuth(
        response.data.user,
        response.data.accessToken,
        response.data.activeCompany,
        response.data.memberships,
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(userErrorMessage(err));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#e0f2fe,_#f8fafc_55%)] px-4">
      <div className="w-full max-w-md border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-700">
            HHS Construction ERP
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Sign in to continue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Secure access for company and organization administration.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {error ? <Alert>{error}</Alert> : null}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Enterprise session security</span>
            <Link
              to="/forgot-password"
              className="font-medium text-primary-700 hover:text-primary-800"
            >
              Forgot password
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
