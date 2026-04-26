import type { ReactNode } from 'react';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

interface DataBoundaryProps {
  loading: boolean;
  error: unknown | null;
  isEmpty?: boolean;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  emptyFallback?: ReactNode;
  onRetry?: () => void;
  errorTitle?: string;
  errorDescription?: string;
  children: ReactNode;
}

function DefaultLoadingFallback() {
  return <Skeleton variant="rect" className="h-24 w-full" />;
}

export function DataBoundary({
  loading,
  error,
  isEmpty = false,
  loadingFallback,
  errorFallback,
  emptyFallback,
  onRetry,
  errorTitle,
  errorDescription,
  children,
}: DataBoundaryProps) {
  if (loading) {
    return loadingFallback ?? <DefaultLoadingFallback />;
  }

  if (error) {
    return (
      errorFallback ?? (
        <ErrorState
          error={error}
          onRetry={onRetry}
          title={errorTitle}
          description={errorDescription}
        />
      )
    );
  }

  if (isEmpty && emptyFallback) {
    return emptyFallback;
  }

  return <>{children}</>;
}
