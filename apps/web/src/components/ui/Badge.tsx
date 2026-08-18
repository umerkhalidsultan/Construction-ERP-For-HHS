import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

const tones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): keyof typeof tones {
  switch (status) {
    case 'ACTIVE':
    case 'TRIAL':
      return 'green';
    case 'SUSPENDED':
    case 'PAST_DUE':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'red';
    case 'INACTIVE':
    case 'ARCHIVED':
      return 'amber';
    default:
      return 'slate';
  }
}
