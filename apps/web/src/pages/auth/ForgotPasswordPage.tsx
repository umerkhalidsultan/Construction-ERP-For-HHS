import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-4 border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Reset password
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Password reset delivery is prepared in the auth module and will be
            activated with the email notification provider.
          </p>
        </div>
        <Alert tone="info">
          Submit your work email. When mail delivery is configured, a secure
          reset link will be sent.
        </Alert>
        <Input label="Work email" type="email" name="email" />
        <Button className="w-full" disabled>
          Request reset link
        </Button>
        <Link
          to="/login"
          className="block text-center text-sm font-medium text-primary-700"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
