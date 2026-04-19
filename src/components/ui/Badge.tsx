import type { ReactNode } from 'react';

type BadgeVariant = 'neutral' | 'success' | 'active' | 'locked';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border border-slate-200 bg-slate-50 text-slate-600',
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border border-slate-300 bg-slate-50 text-slate-800',
  locked: 'border border-slate-200 bg-slate-100 text-slate-500',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${variantClasses[variant]} ${className || ''}`}
    >
      {children}
    </span>
  );
}
