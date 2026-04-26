import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { Card } from '../ui/Card';
import { DataBoundary } from '../ui/DataBoundary';
import { Skeleton } from '../ui/Skeleton';

interface DashboardWidgetCardProps {
  title: string;
  icon: LucideIcon;
  seeAllLabel: string;
  onSeeAll: () => void;
  loading: boolean;
  error: unknown | null;
  onRetry: () => void;
  errorDescription: string;
  isEmpty?: boolean;
  emptyFallback?: ReactNode;
  loadingFallback?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

function DefaultLoadingFallback() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton variant="text" className="h-8 w-20" />
      <Skeleton variant="text" className="h-4 w-full" />
      <Skeleton variant="text" className="h-4 w-4/5" />
    </div>
  );
}

export function DashboardWidgetCard({
  title,
  icon: Icon,
  seeAllLabel,
  onSeeAll,
  loading,
  error,
  onRetry,
  errorDescription,
  isEmpty = false,
  emptyFallback,
  loadingFallback,
  footer,
  children,
}: DashboardWidgetCardProps) {
  return (
    <Card variant="default" padding="md" className={clsx('flex h-full flex-col gap-4', borderTokens.default)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={clsx(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              surfaceTokens.muted,
              textTokens.muted,
            )}
          >
            <Icon size={16} aria-hidden="true" />
          </span>
          <h2 className={clsx('truncate text-sm font-semibold', textTokens.title)}>{title}</h2>
        </div>

        <button
          type="button"
          onClick={onSeeAll}
          aria-label={seeAllLabel}
          className={clsx(
            'inline-flex shrink-0 items-center gap-1 rounded-lg text-xs font-medium',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
            textTokens.muted,
          )}
        >
          <span>{seeAllLabel}</span>
          <ArrowRight size={12} aria-hidden="true" />
        </button>
      </header>

      <DataBoundary
        loading={loading}
        error={error}
        onRetry={onRetry}
        errorDescription={errorDescription}
        isEmpty={isEmpty}
        emptyFallback={emptyFallback}
        loadingFallback={loadingFallback ?? <DefaultLoadingFallback />}
      >
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-3">{children}</div>
          {footer}
        </div>
      </DataBoundary>
    </Card>
  );
}
