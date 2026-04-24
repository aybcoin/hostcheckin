import { Component, type ErrorInfo, type ReactNode } from 'react';
import { XCircle } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, stateFillTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { toast } from '../../lib/toast';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface ErrorFallbackProps {
  error: Error | null;
}

export function ErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card
        variant="default"
        padding="lg"
        role="alert"
        className={clsx('w-full max-w-xl text-center', borderTokens.default)}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <span className={clsx('inline-flex h-12 w-12 items-center justify-center rounded-full', stateFillTokens.danger)}>
            <XCircle className={clsx('h-6 w-6', textTokens.danger)} aria-hidden="true" />
          </span>
        </div>
        <h1 className={clsx('text-lg font-semibold', textTokens.title)}>Une erreur est survenue</h1>
        <p className={clsx('mt-2 text-xs', textTokens.subtle)}>{error?.message || fr.errors.generic}</p>
        <div className="mt-5 flex justify-center">
          <Button variant="primary" onClick={() => window.location.reload()}>
            {fr.errors.reload}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    toast.error(fr.errors.generic);
    console.error('[ErrorBoundary] Unexpected error captured:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
