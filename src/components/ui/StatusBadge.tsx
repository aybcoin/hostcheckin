import {
  cloneElement,
  isValidElement,
  type ReactNode,
} from 'react';
import { clsx } from '../../lib/clsx';
import { statusTokens } from '../../lib/design-tokens';

export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
export type StatusBadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  children: ReactNode;
  variant: StatusBadgeVariant;
  size?: StatusBadgeSize;
  icon?: ReactNode;
  className?: string;
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  success: statusTokens.success,
  warning: statusTokens.warning,
  danger: statusTokens.danger,
  neutral: statusTokens.neutral,
  info: statusTokens.info,
};

const sizeClasses: Record<StatusBadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

const iconSizes: Record<StatusBadgeSize, number> = {
  sm: 12,
  md: 14,
};

function renderIcon(icon: ReactNode, size: number): ReactNode {
  if (isValidElement<{ className?: string; size?: number; 'aria-hidden'?: boolean }>(icon)) {
    return cloneElement(icon, {
      size,
      'aria-hidden': true,
      className: clsx('shrink-0', icon.props.className),
    });
  }

  return (
    <span aria-hidden="true" className="shrink-0">
      {icon}
    </span>
  );
}

export function StatusBadge({
  children,
  variant,
  size = 'sm',
  icon,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
    >
      {icon ? renderIcon(icon, iconSizes[size]) : null}
      <span>{children}</span>
    </span>
  );
}
