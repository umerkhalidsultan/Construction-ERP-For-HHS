import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'info' | 'success';
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'error' && 'border-red-200 bg-red-50 text-red-700',
        tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-800',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
      )}
    >
      {children}
    </div>
  );
}
