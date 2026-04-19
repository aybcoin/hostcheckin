import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ctaTokens } from '../../lib/design-tokens';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'destructive'
  | 'subtle'
  | 'danger'
  | 'dangerSoft';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  className,
  fullWidth = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const resolvedVariant =
    variant === 'danger'
      ? 'destructive'
      : variant === 'subtle'
        ? 'tertiary'
        : variant;

  return (
    <button
      type={type}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${sizeClasses[size]}
        ${ctaTokens[resolvedVariant]}
        ${fullWidth ? 'w-full' : ''}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
