import type { ReactNode } from 'react';
import { infoTokens, statusTokens, warningTokens } from '../../lib/design-tokens';
import { clsx } from '../../lib/clsx';

type BadgeVariant = 'neutral' | 'warning' | 'info' | 'success' | 'active' | 'locked';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: statusTokens.neutral,
  warning: warningTokens.badge,
  info: infoTokens.badge,
  success: statusTokens.success,
  active: 'border border-slate-300 bg-slate-50 text-slate-800',
  locked: 'border border-slate-200 bg-slate-100 text-slate-500',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
